// ============================================================================
//  core/browserstack.js  —  everything BrowserStack-specific in one place.
// ============================================================================
//  • buildCapabilities()  the capability object for a session (local OR cloud)
//  • createSession()      loads the platform adapter, builds caps, opens a driver
//  • name helpers         render project/build/session names from your patterns
//  • annotate/status      wrap the driver's raw executor with readable helpers
//
//  Reporting model (our choice): the SESSION is opened here with raw caps, so we
//  fully control its name, status and video annotations. The BrowserStack SDK
//  (browserstack.yml) runs alongside and provides Test Observability; both group
//  under one build because the matrix runner exports the SAME build name to each.
// ============================================================================

const path = require("path");
const AppiumDriver = require("./driver");

function loadAdapter(config) {
  return require(path.join(__dirname, "..", "platforms", config.platform, "platform.js"));
}

function projectName(config) {
  return config.render(config.patterns.projectNamePattern);
}

// Device-INDEPENDENT so every matrix device groups into one build. The matrix
// runner sets BROWSERSTACK_BUILD_NAME once and exports it to every device.
function buildName(config) {
  return process.env.BROWSERSTACK_BUILD_NAME || config.render(config.patterns.buildNamePattern);
}

function sessionName(config) {
  return config.render(config.patterns.sessionNamePattern, {
    device: config.bsDevice,
    osVersion: config.bsOsVersion,
  });
}

function buildCapabilities(config, adapter) {
  if (config.isBrowserStack) {
    return {
      platformName: adapter.platformName,
      "appium:automationName": adapter.automationName,
      "appium:app": config.bsAppUrl,
      ...adapter.sessionAppCapabilities(config),
      "appium:noReset": config.noReset,
      "bstack:options": {
        userName: config.bsUsername,
        accessKey: config.bsAccessKey,
        deviceName: config.bsDevice,
        osVersion: config.bsOsVersion,
        appiumVersion: config.bsAppiumVersion,
        projectName: projectName(config),
        buildName: buildName(config),
        ...(process.env.BROWSERSTACK_BUILD_IDENTIFIER
          ? { buildIdentifier: process.env.BROWSERSTACK_BUILD_IDENTIFIER }
          : {}),
        sessionName: sessionName(config),
        // Capture everything useful (video is on by default; networkLogs is not).
        video: true,
        deviceLogs: true,
        appiumLogs: true,
        networkLogs: true,
      },
      ...adapter.browserstackCapabilityExtras(config),
    };
  }

  // Local simulator/emulator/device.
  return {
    platformName: adapter.platformName,
    "appium:automationName": adapter.automationName,
    "appium:udid": config.udid,
    ...(config.appPath ? { "appium:app": config.appPath } : {}),
    ...adapter.sessionAppCapabilities(config),
    "appium:noReset": config.noReset,
    ...adapter.localCapabilityExtras(config),
  };
}

async function createSession(config) {
  const adapter = loadAdapter(config);
  const caps = buildCapabilities(config, adapter);
  return AppiumDriver.create(config.appiumServer, caps, adapter, config);
}

async function annotate(driver, data, level = "info") {
  if (!driver || !driver.config.isBrowserStack) return;
  await driver.browserstackExecutor("annotate", { data, level });
}

async function setSessionName(driver, name) {
  if (!driver || !driver.config.isBrowserStack) return;
  await driver.browserstackExecutor("setSessionName", { name });
}

async function setSessionStatus(driver, status, reason) {
  if (!driver || !driver.config.isBrowserStack) return;
  await driver.browserstackExecutor("setSessionStatus", { status, reason });
}

// Resolve the public dashboard URLs for the live session (video + logs).
async function resolveSessionUrls(driver) {
  const details = await driver.getSessionDetails();
  if (details && details.browser_url) {
    return { sessionUrl: details.browser_url, buildUrl: details.browser_url.split("/sessions/")[0] };
  }
  return {};
}

module.exports = {
  buildCapabilities,
  createSession,
  projectName,
  buildName,
  sessionName,
  annotate,
  setSessionName,
  setSessionStatus,
  resolveSessionUrls,
};
