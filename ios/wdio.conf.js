// WebdriverIO owns the Appium session. On BrowserStack, the official service
// links that same App Automate session to Test Observability.
const { config: appConfig } = require("./lib/env");

const today = new Date().toISOString().slice(0, 10);
const buildName = process.env.BROWSERSTACK_BUILD_NAME
  || `${appConfig.platformLabel} ${appConfig.runLabel} ${today}`;
const buildIdentifier = process.env.BROWSERSTACK_BUILD_IDENTIFIER;

const browserStackCapability = {
  platformName: "iOS",
  "appium:automationName": "XCUITest",
  "appium:bundleId": appConfig.bundleId,
  "appium:noReset": appConfig.noReset,
  "bstack:options": {
    deviceName: appConfig.bsDevice,
    osVersion: appConfig.bsOsVersion,
    appiumVersion: appConfig.bsAppiumVersion,
    projectName: appConfig.projectName,
    buildName,
    sessionName: `${appConfig.bsDevice} / iOS ${appConfig.bsOsVersion} — ${appConfig.sessionLabel}`,
    video: true,
    deviceLogs: true,
    appiumLogs: true,
    networkLogs: true,
  },
};

const localCapability = {
  platformName: "iOS",
  "appium:automationName": "XCUITest",
  "appium:udid": appConfig.udid,
  "appium:bundleId": appConfig.bundleId,
  ...(appConfig.appPath ? { "appium:app": appConfig.appPath } : {}),
  "appium:noReset": appConfig.noReset,
  "appium:forceAppLaunch": true,
  "appium:processArguments": { args: ["-AutoFillPasswords", "NO"] },
};

exports.config = {
  runner: "local",
  specs: ["./test.js"],
  maxInstances: 1,
  capabilities: [appConfig.isBrowserStack ? browserStackCapability : localCapability],
  logLevel: process.env.WDIO_LOG_LEVEL || "error",
  connectionRetryTimeout: 300_000,
  connectionRetryCount: 2,
  framework: "mocha",
  mochaOpts: { ui: "bdd", timeout: 240_000 },
  reporters: [
    "spec",
    ["junit", {
      outputDir: "./test-results",
      outputFileFormat: (options) => `junit-${options.cid}.xml`,
    }],
  ],

  ...(appConfig.isBrowserStack
    ? {
        user: appConfig.bsUsername,
        key: appConfig.bsAccessKey,
        services: [
          ["browserstack", {
            app: appConfig.bsAppUrl,
            // Keep optional vendor self-healing off. Tests in this repository
            // use only the selectors and assertions written in sections/*.js.
            selfHeal: false,
            testObservability: true,
            testObservabilityOptions: {
              projectName: appConfig.projectName,
              buildName,
              buildTag: buildIdentifier,
            },
            buildIdentifier,
            percy: false,
          }],
        ],
      }
    : {
        hostname: new URL(appConfig.appiumServer).hostname,
        port: Number(new URL(appConfig.appiumServer).port || 4723),
        path: new URL(appConfig.appiumServer).pathname || "/",
        services: [],
      }),
};
