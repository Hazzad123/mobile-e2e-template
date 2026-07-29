const fs = require("fs");
const path = require("path");
const { DEVICES } = require("./devices");
const TIMINGS = require("./timings");

function loadEnv(filePath = path.join(__dirname, "..", ".env")) {
  if (!fs.existsSync(filePath)) return;

  for (const line of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const equalsIndex = trimmed.indexOf("=");
    if (equalsIndex < 1) continue;
    const key = trimmed.slice(0, equalsIndex).trim();
    const value = trimmed.slice(equalsIndex + 1).trim();
    process.env[key] ||= value;
  }
}

loadEnv();

function isPlaceholder(value) {
  return typeof value === "string" && value.includes("__");
}

function optionalValue(value) {
  return value && !isPlaceholder(value) ? value : undefined;
}

function requireValue(name, value = process.env[name]) {
  if (!value || isPlaceholder(value)) {
    throw new Error(`Missing ${name}. Set it in android/.env (copy .env.template first).`);
  }
  return value;
}

function positiveNumber(name, value, fallback) {
  const parsed = Number(value ?? fallback);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`${name} must be a positive number.`);
  }
  return parsed;
}

const isBrowserStack = process.env.BROWSERSTACK === "true";
const allowUnmappedCaseIds = (
  !isBrowserStack
  && process.env.ALLOW_UNMAPPED_TESTRAIL_CASES === "true"
);
const appDisplayName = optionalValue(process.env.APP_DISPLAY_NAME) || "Mobile App";
const appPackage = requireValue("APP_PACKAGE");
const appActivity = requireValue("APP_ACTIVITY");

const config = {
  platform: "android",
  platformLabel: "Android",
  isBrowserStack,
  appDisplayName,
  suiteName: `${appDisplayName} E2E (Android)`,
  projectName: optionalValue(process.env.BROWSERSTACK_PROJECT_NAME) || `${appDisplayName} Android`,
  appiumServer: process.env.APPIUM_SERVER || "http://127.0.0.1:4723",
  timeoutMultiplier: positiveNumber(
    "TIMEOUT_MULTIPLIER",
    process.env.TIMEOUT_MULTIPLIER,
    isBrowserStack ? TIMINGS.MULTIPLIER.BROWSERSTACK : TIMINGS.MULTIPLIER.LOCAL,
  ),
  appId: appPackage,
  appPackage,
  appActivity,
  udid: optionalValue(process.env.APPIUM_UDID),
  noReset: process.env.NO_RESET !== "false",
  recoverAfterFailure: process.env.RECOVER_AFTER_FAILURE !== "false",
  restartAppAfterFailure: process.env.RESTART_APP_AFTER_FAILURE !== "false",
  maxConsecutiveFailures: Number(process.env.MAX_CONSECUTIVE_FAILURES ?? 3),
  bsAppUrl: optionalValue(process.env.BS_APP_URL),
  bsUsername: optionalValue(process.env.BROWSERSTACK_USERNAME),
  bsAccessKey: optionalValue(process.env.BROWSERSTACK_ACCESS_KEY),
  bsDevice: process.env.BS_DEVICE || DEVICES[0].device,
  bsOsVersion: process.env.BS_OS_VERSION || DEVICES[0].osVersion,
  bsAppiumVersion: process.env.BS_APPIUM_VERSION || "2.0.1",
  runLabel: process.env.E2E_RUN_LABEL || "On-demand",
  sectionsLabel: process.env.TEST_SECTIONS || "all",
};

config.sessionLabel = config.sectionsLabel === "all"
  ? "Full regression"
  : `Sections: ${config.sectionsLabel}`;

if (!Number.isInteger(config.maxConsecutiveFailures) || config.maxConsecutiveFailures < 0) {
  throw new Error("MAX_CONSECUTIVE_FAILURES must be a non-negative integer.");
}

if (isBrowserStack) {
  requireValue("BROWSERSTACK_USERNAME", config.bsUsername);
  requireValue("BROWSERSTACK_ACCESS_KEY", config.bsAccessKey);
  requireValue("BS_APP_URL", config.bsAppUrl);
} else {
  requireValue("APPIUM_UDID", config.udid);
}

const selectedSections = config.sectionsLabel
  .split(",")
  .map((section) => section.trim().toLowerCase())
  .filter(Boolean);

function shouldRunSection(section) {
  return selectedSections.includes("all")
    || selectedSections.includes(section)
    || selectedSections.some((selected) => section.startsWith(`${selected}-`));
}

function shouldRunAnySection(sections) {
  return sections.some((section) => shouldRunSection(section));
}

function validateSelectedSections(knownSections) {
  const unknown = selectedSections.filter((selected) => (
    selected !== "all"
    && !knownSections.some((known) => known === selected || known.startsWith(`${selected}-`))
  ));
  if (unknown.length > 0) {
    throw new Error(
      `Unknown TEST_SECTIONS value(s): ${unknown.join(", ")}. Available: all, ${knownSections.join(", ")}.`,
    );
  }
}

function selector(name, fallback) {
  return requireValue(name, process.env[name] || fallback);
}

function caseId(name, fallback) {
  const raw = process.env[name] || fallback;
  if (!raw || isPlaceholder(raw)) {
    if (allowUnmappedCaseIds) {
      const localLabel = name
        .replace(/^TESTRAIL_CASE_/, "")
        .replace(/[^A-Z0-9]+/gi, "-")
        .replace(/^-|-$/g, "")
        .toUpperCase();
      return `LOCAL-${localLabel}`;
    }
    requireValue(name, raw);
  }
  if (
    allowUnmappedCaseIds
    && /^LOCAL-[A-Z0-9]+(?:-[A-Z0-9]+)*$/i.test(raw)
  ) {
    return raw.toUpperCase();
  }
  const match = /^C?(\d+)$/i.exec(raw);
  if (!match) {
    if (/^LOCAL-/i.test(raw)) {
      throw new Error(
        `${name} uses a local-only label. Set ALLOW_UNMAPPED_TESTRAIL_CASES=true `
        + "for local runs; BrowserStack/CI requires a verified C### case ID.",
      );
    }
    throw new Error(`${name} must be a TestRail case ID such as C123 or 123.`);
  }
  return `C${match[1]}`;
}

// Appium and UiAutomator2 inherit these when available on a local machine.
if (process.env.ANDROID_SDK) {
  process.env.ANDROID_HOME ||= process.env.ANDROID_SDK;
  process.env.ANDROID_SDK_ROOT ||= process.env.ANDROID_SDK;
}

const stepState = { failedLabel: null };

async function step(label, action) {
  const startedAt = Date.now();
  console.log(`\n[STEP START] ${label}`);
  try {
    const result = await action();
    console.log(`[STEP PASS] ${label} (${Date.now() - startedAt}ms)`);
    return result;
  } catch (error) {
    console.error(`[STEP FAIL] ${label} (${Date.now() - startedAt}ms)`);
    console.error(`[STEP ERROR] ${error.message}`);
    stepState.failedLabel ??= label;
    throw error;
  }
}

module.exports = {
  caseId,
  config,
  isPlaceholder,
  loadEnv,
  optionalValue,
  requireValue,
  selector,
  shouldRunAnySection,
  shouldRunSection,
  step,
  stepState,
  validateSelectedSections,
};
