#!/usr/bin/env node
"use strict";

const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");

const root = path.resolve(__dirname, "..");
const validPlatforms = new Set(["core", "android", "ios", "both", "auto"]);
const args = process.argv.slice(2);
const json = args.includes("--json");
const checkServices = args.includes("--services");
const probeDevices = args.includes("--probe-devices");
const expectedAppiumVersion = "2.19.0";
const platformArg = args.find((arg) => arg.startsWith("--platform="));
const platformIndex = args.indexOf("--platform");
const requestedPlatform = platformArg
  ? platformArg.slice("--platform=".length)
  : platformIndex >= 0
    ? args[platformIndex + 1]
    : "auto";

if (!validPlatforms.has(requestedPlatform)) {
  console.error(
    "Usage: node onboarding/check-prerequisites.js "
    + "[--platform core|android|ios|both|auto] "
    + "[--probe-devices] [--services] [--json]",
  );
  process.exit(2);
}

const selectedPlatforms = requestedPlatform === "auto"
  ? (process.platform === "darwin" ? ["android", "ios"] : ["android"])
  : requestedPlatform === "both"
    ? ["android", "ios"]
    : requestedPlatform === "core"
      ? []
      : [requestedPlatform];

const results = [];

function add(area, name, status, detail, nextStep) {
  results.push({
    area,
    name,
    status,
    detail,
    ...(nextStep ? { nextStep } : {}),
  });
}

function run(command, commandArgs = [], timeout = 6_000) {
  const result = spawnSync(command, commandArgs, {
    cwd: root,
    encoding: "utf8",
    timeout,
    maxBuffer: 1024 * 1024,
    shell: process.platform === "win32",
  });

  return {
    available: !result.error || result.error.code !== "ENOENT",
    status: result.status,
    output: `${result.stdout || ""}\n${result.stderr || ""}`.trim(),
    error: result.error,
  };
}

function firstLine(value) {
  return String(value || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find(Boolean) || "";
}

function commandVersion(
  area,
  name,
  command,
  commandArgs,
  nextStep,
  missingStatus = "missing",
) {
  const result = run(command, commandArgs);
  if (!result.available) {
    add(area, name, missingStatus, "Not found.", nextStep);
    return null;
  }
  if (result.error?.code === "ETIMEDOUT") {
    add(area, name, "warning", "The version check timed out.", nextStep);
    return result;
  }
  if (result.status !== 0) {
    add(area, name, "warning", firstLine(result.output) || "The check returned an error.", nextStep);
    return result;
  }
  add(area, name, "pass", firstLine(result.output) || "Available.");
  return result;
}

function checkAppiumVersion() {
  const result = run("appium", ["--version"]);
  const nextStep = (
    `Install the template's pinned Appium ${expectedAppiumVersion} `
    + "using the organisation's approved Node tooling."
  );
  if (!result.available) {
    add("core", "Appium", "missing", "Not found.", nextStep);
    return null;
  }
  if (result.error?.code === "ETIMEDOUT") {
    add("core", "Appium", "warning", "The version check timed out.", nextStep);
    return result;
  }
  if (result.status !== 0) {
    add(
      "core",
      "Appium",
      "warning",
      firstLine(result.output) || "The check returned an error.",
      nextStep,
    );
    return result;
  }

  const version = firstLine(result.output).replace(/^v/, "");
  if (version === expectedAppiumVersion) {
    add("core", "Appium", "pass", `${version} detected.`);
  } else {
    add(
      "core",
      "Appium",
      "action",
      `${version || "An unknown version"} detected; this template pins ${expectedAppiumVersion}.`,
      "Confirm that the existing Appium/driver pair is approved and compatible, "
        + `or install Appium ${expectedAppiumVersion}.`,
    );
  }
  return result;
}

function countConnectedAndroidDevices(output) {
  return String(output || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => /\sdevice$/.test(line) && !line.startsWith("List of devices"))
    .length;
}

function countUnavailableAndroidDevices(output) {
  return String(output || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => /\s(unauthorized|offline)$/.test(line))
    .length;
}

function countBootedSimulators(output) {
  return (String(output || "").match(/\(Booted\)/g) || []).length;
}

function platformDependencyStatus(platform) {
  const wdioBinary = process.platform === "win32" ? "wdio.cmd" : "wdio";
  const binaryPath = path.join(root, platform, "node_modules", ".bin", wdioBinary);
  if (fs.existsSync(binaryPath)) {
    add(platform, "Test dependencies", "pass", `${platform}/node_modules is ready.`);
  } else {
    add(
      platform,
      "Test dependencies",
      "action",
      `${platform}/node_modules has not been installed yet.`,
      `Run npm ci inside ${platform}/ after the dependency policy is chosen.`,
    );
  }

  const envPath = path.join(root, platform, ".env");
  if (!fs.existsSync(envPath)) {
    add(
      platform,
      "Local configuration",
      "action",
      `${platform}/.env has not been created yet.`,
      `Copy ${platform}/.env.template only after identifying the correct values from approved project or device evidence.`,
    );
    return;
  }

  const requiredKeys = platform === "android"
    ? ["APP_PACKAGE", "APP_ACTIVITY", "APPIUM_UDID"]
    : ["BUNDLE_ID", "APPIUM_UDID"];
  const envValues = readEnvValues(envPath);
  const missingKeys = requiredKeys.filter((name) => (
    !isConfiguredValue(process.env[name] || envValues.get(name))
  ));
  if (missingKeys.length === 0) {
    add(
      platform,
      "Local configuration",
      "pass",
      `${platform}/.env contains the required local variable names; values were not printed.`,
    );
  } else {
    add(
      platform,
      "Local configuration",
      "action",
      `Unconfigured local variable names: ${missingKeys.join(", ")}.`,
      "Derive these values from approved project source, build metadata, or device evidence before configuring the file.",
    );
  }
}

function checkAppiumDriver(platform, driverName, packageName, expectedVersion) {
  const appium = run("appium", ["--version"]);
  if (!appium.available || appium.status !== 0) {
    add(
      platform,
      `${driverName} Appium driver`,
      "blocked",
      "Cannot check drivers until Appium is installed.",
    );
    return;
  }

  const appiumHome = process.env.APPIUM_HOME || path.join(os.homedir(), ".appium");
  const packagePath = path.join(appiumHome, "node_modules", packageName, "package.json");
  if (!fs.existsSync(packagePath)) {
    add(
      platform,
      `${driverName} Appium driver`,
      "action",
      "Not installed.",
      `Install the ${driverName} driver only after the change is approved for the project.`,
    );
    return;
  }

  try {
    const packageJson = JSON.parse(fs.readFileSync(packagePath, "utf8"));
    const versionMatches = packageJson.version === expectedVersion;
    add(
      platform,
      `${driverName} Appium driver`,
      versionMatches ? "pass" : "action",
      `Installed${packageJson.version ? ` (${packageJson.version})` : ""}.`,
      versionMatches
        ? undefined
        : `This template pins ${driverName} ${expectedVersion}; confirm compatibility or install that version after approval.`,
    );
  } catch {
    add(
      platform,
      `${driverName} Appium driver`,
      "warning",
      "Its local installation metadata could not be read.",
      "Diagnose the Appium driver installation before reinstalling or changing it.",
    );
  }
}

function readEnvValues(filePath) {
  if (!fs.existsSync(filePath)) return new Map();
  const values = new Map();
  for (const line of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const equalsIndex = trimmed.indexOf("=");
    if (equalsIndex > 0) {
      values.set(
        trimmed.slice(0, equalsIndex).trim(),
        trimmed.slice(equalsIndex + 1).trim(),
      );
    }
  }
  return values;
}

function isConfiguredValue(value) {
  return Boolean(value) && !String(value).includes("__");
}

function checkServiceKeys(platform) {
  const envValues = readEnvValues(path.join(root, platform, ".env"));
  const configuredValue = (name) => (
    isConfiguredValue(process.env[name])
      ? process.env[name]
      : envValues.get(name)
  );
  const isPresent = (name) => isConfiguredValue(configuredValue(name));
  const browserStackKeys = ["BROWSERSTACK_USERNAME", "BROWSERSTACK_ACCESS_KEY", "BS_APP_URL"];
  const testRailKeys = [
    "TESTRAIL_BASE_URL",
    "TESTRAIL_USERNAME",
    "TESTRAIL_API_KEY",
    "TESTRAIL_PROJECT_ID",
  ];

  const missingBrowserStack = browserStackKeys.filter((name) => !isPresent(name));
  add(
    "services",
    `${platform} BrowserStack variables`,
    missingBrowserStack.length === 0 ? "pass" : "action",
    missingBrowserStack.length === 0
      ? "Required variable names are present; values were not read or printed."
      : `Missing variable names: ${missingBrowserStack.join(", ")}.`,
    missingBrowserStack.length === 0
      ? undefined
      : "Configure these only if BrowserStack is approved for the project.",
  );

  const missingTestRail = testRailKeys.filter((name) => !isPresent(name));
  const localOnlyCases = configuredValue("ALLOW_UNMAPPED_TESTRAIL_CASES") === "true";
  add(
    "services",
    `${platform} TestRail variables`,
    missingTestRail.length === 0 ? "pass" : localOnlyCases ? "info" : "action",
    missingTestRail.length === 0
      ? "Required variable names are present; values were not read or printed."
      : localOnlyCases
        ? "Local-only unmapped case labels are enabled; TestRail values are not required locally."
      : `Missing variable names: ${missingTestRail.join(", ")}.`,
    missingTestRail.length === 0
      ? undefined
      : localOnlyCases
        ? "BrowserStack/CI remains unavailable until active tests use verified C### IDs and TestRail is configured."
      : "Configure these only if TestRail is used and approved.",
  );
}

add("core", "Operating system", "info", `${process.platform} ${process.arch}`);

const nodeMajor = Number(process.versions.node.split(".")[0]);
add(
  "core",
  "Node.js",
  nodeMajor >= 20 ? "pass" : "action",
  `${process.version} detected; this template requires Node.js 20 or later.`,
  nodeMajor >= 20 ? undefined : "Install an approved Node.js 20+ release.",
);

commandVersion(
  "core",
  "npm",
  "npm",
  ["--version"],
  "Install npm through the approved Node.js installation.",
);
commandVersion(
  "core",
  "Git",
  "git",
  ["--version"],
  "Install Git using the organisation's approved method.",
  "action",
);
commandVersion(
  "core",
  "ripgrep",
  "rg",
  ["--version"],
  "Optional but recommended for fast source and placeholder searches.",
  "warning",
);

const requiredRepoFiles = [
  "START-HERE.md",
  "CLAUDE.md",
  "android/package.json",
  "ios/package.json",
  "onboarding/BEGINNER-RUNBOOK.md",
  "onboarding/PROJECT-SETUP-TEMPLATE.md",
];
const missingRepoFiles = requiredRepoFiles.filter((relativePath) => (
  !fs.existsSync(path.join(root, relativePath))
));
add(
  "core",
  "Template structure",
  missingRepoFiles.length === 0 ? "pass" : "missing",
  missingRepoFiles.length === 0
    ? "The expected repository files are present."
    : `Missing: ${missingRepoFiles.join(", ")}.`,
);

if (selectedPlatforms.length > 0) {
  checkAppiumVersion();
}

if (selectedPlatforms.includes("android")) {
  commandVersion(
    "android",
    "Java",
    "java",
    ["-version"],
    "Install the JDK version approved for the Android project.",
  );
  const adb = commandVersion(
    "android",
    "Android Debug Bridge",
    "adb",
    ["version"],
    "Install Android SDK Platform Tools, normally through Android Studio.",
  );
  const sdkConfigured = Boolean(
    process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT || process.env.ANDROID_SDK,
  );
  add(
    "android",
    "Android SDK environment",
    sdkConfigured ? "pass" : "action",
    sdkConfigured ? "An Android SDK environment variable is configured." : "No SDK variable was found.",
    sdkConfigured ? undefined : "Locate the approved Android SDK, then configure the appropriate shell variable.",
  );

  if (adb?.status === 0 && probeDevices) {
    const devices = run("adb", ["devices"]);
    const connected = countConnectedAndroidDevices(devices.output);
    const unavailable = countUnavailableAndroidDevices(devices.output);
    if (connected > 0) {
      add("android", "Android device/emulator", "pass", `${connected} ready device(s) detected.`);
    } else if (unavailable > 0) {
      add(
        "android",
        "Android device/emulator",
        "action",
        `${unavailable} device(s) are offline or awaiting authorization.`,
        "Unlock/authorize the device or restart the emulator, then check again.",
      );
    } else {
      add(
        "android",
        "Android device/emulator",
        "action",
        "No ready Android device or emulator was detected.",
        "Start an approved emulator or connect an approved test device, then check again.",
      );
    }
  } else if (adb?.status === 0) {
    add(
      "android",
      "Android device/emulator",
      "info",
      "Not probed because device access has not been approved for this check.",
      "After approval, rerun with --probe-devices.",
    );
  }

  checkAppiumDriver(
    "android",
    "uiautomator2",
    "appium-uiautomator2-driver",
    "4.2.9",
  );
  platformDependencyStatus("android");
}

if (selectedPlatforms.includes("ios")) {
  if (process.platform !== "darwin") {
    add(
      "ios",
      "macOS",
      "blocked",
      "Local iOS automation requires macOS with Xcode.",
      "Use a suitable Mac or an approved cloud-device route.",
    );
  } else {
    commandVersion(
      "ios",
      "Xcode",
      "xcodebuild",
      ["-version"],
      "Install/select the approved Xcode version.",
    );
    const xcrun = commandVersion(
      "ios",
      "Xcode command-line tools",
      "xcrun",
      ["--version"],
      "Install or select Xcode command-line tools.",
    );
    if (xcrun?.status === 0 && probeDevices) {
      const simulators = run("xcrun", ["simctl", "list", "devices", "booted"]);
      const booted = countBootedSimulators(simulators.output);
      add(
        "ios",
        "Booted iOS simulator",
        booted > 0 ? "pass" : "action",
        booted > 0 ? `${booted} booted simulator(s) detected.` : "No booted simulator was detected.",
        booted > 0 ? undefined : "Choose and start an approved simulator, then check again.",
      );
    } else if (xcrun?.status === 0) {
      add(
        "ios",
        "Booted iOS simulator",
        "info",
        "Not probed because simulator access has not been approved for this check.",
        "After approval, rerun with --probe-devices.",
      );
    }
  }

  checkAppiumDriver(
    "ios",
    "xcuitest",
    "appium-xcuitest-driver",
    "9.10.5",
  );
  platformDependencyStatus("ios");
}

if (checkServices) {
  if (selectedPlatforms.length === 0) {
    add(
      "services",
      "Hosted-service check",
      "warning",
      "Choose Android, iOS, or both when checking hosted-service variables.",
    );
  } else {
    for (const platform of selectedPlatforms) checkServiceKeys(platform);
  }
}

const blockingStatuses = new Set(["missing", "blocked"]);
const actionStatuses = new Set(["action", "warning"]);
const summary = {
  platform: requestedPlatform,
  checkedPlatforms: selectedPlatforms,
  blocking: results.filter((item) => blockingStatuses.has(item.status)).length,
  actions: results.filter((item) => actionStatuses.has(item.status)).length,
  passed: results.filter((item) => item.status === "pass").length,
};

if (json) {
  console.log(JSON.stringify({ summary, results }, null, 2));
} else {
  const labels = {
    pass: "PASS",
    info: "INFO",
    action: "ACTION",
    warning: "WARNING",
    missing: "MISSING",
    blocked: "BLOCKED",
  };
  console.log("Mobile E2E readiness check");
  console.log(`Requested scope: ${requestedPlatform}`);
  console.log("");
  for (const item of results) {
    console.log(`[${labels[item.status]}] ${item.area} / ${item.name}: ${item.detail}`);
    if (item.nextStep) console.log(`         Next: ${item.nextStep}`);
  }
  console.log("");
  console.log(
    `Summary: ${summary.passed} passed, ${summary.actions} need attention, `
    + `${summary.blocking} blocking.`,
  );
  console.log(
    "No tests, uploads, TestRail writes, installations, or file changes were performed.",
  );
  console.log("No credential values or device identifiers were printed.");
}
