// ============================================================================
//  core/config.js  —  brings automation.config.js + .env to life.
// ============================================================================
//  This is ENGINE code — you should not need to edit it.
//
//  What it produces:
//    • config              one resolved settings object (app facts + env, merged)
//    • shouldRunSection()   the TEST_SECTIONS filter (which sections run)
//    • step()               the [STEP START/PASS/FAIL] logging wrapper
//    • render()             fills {tokens} in the naming patterns from the config
//
//  Rule of precedence: an environment variable (or Bitbucket repo variable)
//  ALWAYS wins over the same value in automation.config.js.
// ============================================================================

const fs = require("fs");
const path = require("path");

// ── 1. Load .env into process.env (values already in the shell win) ──────────
function loadEnv(filePath = path.join(__dirname, "..", ".env")) {
  if (!fs.existsSync(filePath)) return;
  for (const line of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    process.env[key] ||= value; // ||= means: only if not already set
  }
}
loadEnv();

const appConfig = require("../automation.config");

// ── 2. Which platform is this process running? ───────────────────────────────
// The shared engine runs ONE platform per process. Locally you set PLATFORM in
// .env; in CI the pipeline sets it per step; the matrix runner sets it per device.
const platform = (process.env.PLATFORM || "ios").toLowerCase();
if (!["ios", "android"].includes(platform)) {
  throw new Error(`PLATFORM must be "ios" or "android" (got "${platform}").`);
}

const isBrowserStack = process.env.BROWSERSTACK === "true";

// Resolve the identity + device list for THIS platform from automation.config.js.
const identity = platform === "ios"
  ? {
      platformName: "iOS",
      automationName: "XCUITest",
      appId: appConfig.ios.bundleId,
      bundleId: appConfig.ios.bundleId,
    }
  : {
      platformName: "Android",
      automationName: "UiAutomator2",
      appId: appConfig.android.appPackage,
      appPackage: appConfig.android.appPackage,
      appActivity: appConfig.android.appActivity || null,
    };

const devices = appConfig[platform].devices || [];

// ── 3. A unique throwaway account for this process/run ───────────────────────
// A random suffix on top of the timestamp: parallel matrix devices start in the
// same millisecond, and two runs sharing a signup email would corrupt each other.
const uniqueStamp = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

// ── 4. The resolved config object ────────────────────────────────────────────
const testSectionsRaw = process.env.TEST_SECTIONS || "all";
const runLabel = process.env.E2E_RUN_LABEL || "Manual";
const sessionLabel = testSectionsRaw === "all" ? "Full regression" : `Sections: ${testSectionsRaw}`;

const config = {
  platform,
  appName: appConfig.appName,
  isBrowserStack,

  // Appium connection: BrowserStack's cloud hub, or your local Appium server.
  appiumServer: isBrowserStack
    ? "https://hub-cloud.browserstack.com/wd/hub"
    : (process.env.APPIUM_SERVER || "http://127.0.0.1:4723"),

  // Platform identity (spread: bundleId for iOS, appPackage/appActivity for Android)
  ...identity,
  noReset: process.env.NO_RESET !== "false", // default true

  // Local device
  udid: process.env.APPIUM_UDID,
  appPath: process.env.APP_PATH,

  // BrowserStack (creds are read here so they can be validated; they come from
  // repo variables in CI, .env locally — never from automation.config.js).
  bsUsername: process.env.BROWSERSTACK_USERNAME,
  bsAccessKey: process.env.BROWSERSTACK_ACCESS_KEY,
  bsAppUrl: process.env.BS_APP_URL,
  bsDevice: process.env.BS_DEVICE || devices[0]?.device,
  bsOsVersion: process.env.BS_OS_VERSION || devices[0]?.osVersion,
  bsAppiumVersion: appConfig.browserstack.appiumVersion,

  // The full device matrix for this platform (used by core/matrix.js).
  devices,

  // Throwaway account for signup/login.
  testEmail: render(appConfig.testAccount.emailPattern, { platform, timestamp: uniqueStamp }),
  testPassword: process.env.TEST_ACCOUNT_PASSWORD || appConfig.testAccount.password,

  // Resilience (env overrides the config; BrowserStack gets a higher floor).
  retries: Number(process.env.RETRIES ?? appConfig.resilience.retries),
  maxConsecutiveFailures: (() => {
    const raw = Number(process.env.MAX_CONSECUTIVE_FAILURES ?? appConfig.resilience.maxConsecutiveFailures);
    return isBrowserStack ? Math.max(raw, 5) : raw; // real devices vary more — don't abort too eagerly
  })(),
  recoverAfterFailure: process.env.RECOVER_AFTER_FAILURE !== "false",
  timeoutMultiplier: Number(process.env.TIMEOUT_MULTIPLIER ?? (isBrowserStack ? 1.5 : 1.0)),

  // Naming
  runLabel,
  sessionLabel,
  testSectionsRaw,

  // Raw naming patterns + TestRail structural settings, resolved by the modules
  // that own them (core/browserstack.js, core/testrail.js).
  patterns: appConfig.browserstack,
  testrail: appConfig.testrail,
  sections: appConfig.sections || [],
};

// ── 5. render(): fill {tokens} in a naming pattern ───────────────────────────
// Tokens known everywhere: {app} {platform} {osVersion} {device} {runLabel}
// {date} {sections} {timestamp}. Pass extra/overriding tokens as the 2nd arg.
function render(pattern, tokens = {}) {
  const base = {
    app: appConfig.appName,
    platform: identity.platformName, // "iOS" / "Android" (email pattern overrides with lowercase)
    date: new Date().toISOString().slice(0, 10),
    runLabel: process.env.E2E_RUN_LABEL || "Manual",
    sections: testSectionsRaw === "all" ? "Full regression" : `Sections: ${testSectionsRaw}`,
    ...tokens,
  };
  return String(pattern).replace(/\{(\w+)\}/g, (_, key) => (base[key] ?? `{${key}}`));
}
config.render = render;

// ── 6. Section selection (the TEST_SECTIONS filter) ──────────────────────────
const selected = testSectionsRaw.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
const alwaysRunKeys = config.sections.filter((s) => s.alwaysRun).map((s) => s.key.toLowerCase());

// A section runs if it's marked alwaysRun (e.g. auth), or "all" was requested,
// or it was named explicitly. alwaysRun is what lets a subset run standalone.
function shouldRunSection(key) {
  const k = String(key).toLowerCase();
  return alwaysRunKeys.includes(k) || selected.includes("all") || selected.includes(k);
}
function shouldRunAnySection(keys) {
  return keys.some((key) => shouldRunSection(key));
}

// ── 7. step(): wrap every meaningful action for readable logs ────────────────
// Prints [STEP START/PASS/FAIL] and remembers the first failing step's label so
// the failure report can name exactly where a test broke.
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
    if (stepState.failedLabel === null) stepState.failedLabel = label;
    throw error;
  }
}

// ── 8. Fail fast on obvious misconfiguration (with a friendly message) ───────
if (String(identity.appId || "").includes("__")) {
  throw new Error(
    `Your ${platform} app id is still a placeholder ("${identity.appId}"). ` +
    `Set ${platform === "ios" ? "ios.bundleId" : "android.appPackage"} in automation.config.js.`,
  );
}
if (isBrowserStack) {
  for (const [name, value] of [["BROWSERSTACK_USERNAME", config.bsUsername], ["BROWSERSTACK_ACCESS_KEY", config.bsAccessKey], ["BS_APP_URL", config.bsAppUrl]]) {
    if (!value) throw new Error(`Missing ${name} — required when BROWSERSTACK=true.`);
  }
  if (!config.bsDevice || !config.bsOsVersion) {
    throw new Error(`No ${platform} device to run. Add one to automation.config.js ${platform}.devices, or set BS_DEVICE/BS_OS_VERSION.`);
  }
} else if (!config.udid) {
  throw new Error("Missing APPIUM_UDID — set it in .env for local runs (see .env.example).");
}

module.exports = { config, shouldRunSection, shouldRunAnySection, step, stepState, render };
