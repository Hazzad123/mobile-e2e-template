// ============================================================================
//  platforms/ios/platform.js  —  the iOS "adapter".
// ============================================================================
//  core/driver.js is platform-agnostic; it asks this object for anything
//  iOS-specific: which capabilities to use, how a selector string maps to an
//  Appium locator, and how to scroll / go back / hide the keyboard on iOS.
//  (The Android sibling lives at platforms/android/platform.js.)
//
//  iOS selector cheatsheet (what you write in page objects):
//    ~Label          accessibility id (accessibilityIdentifier OR label)
//    #name           the element's "name" attribute (a predicate string)
//    ios=**/XCUI...  an -ios class chain (starts with **)
//    ios=name == "x" an -ios predicate string
//    //XCUIElement…  raw XPath (last resort)
// ============================================================================

const TIMINGS = require("../../core/timings");

module.exports = {
  platformName: "iOS",
  automationName: "XCUITest",
  textAttribute: "label", // visible text lives in "label" on iOS

  // The app to launch. On BrowserStack the binary comes from "appium:app"; here
  // we still pass the bundleId so Appium can (re)launch the installed app.
  sessionAppCapabilities(config) {
    return { "appium:bundleId": config.bundleId };
  },

  // Extra capabilities only for LOCAL simulator/device runs.
  localCapabilityExtras() {
    return {
      "appium:forceAppLaunch": true,
      // Disable iOS AutoFill/Strong-Password prompts so setValue works on secure fields.
      "appium:processArguments": { args: ["-AutoFillPasswords", "NO"] },
    };
  },

  browserstackCapabilityExtras() {
    return {};
  },

  selectorToLocator(selector) {
    if (selector.startsWith("~")) {
      return { strategy: "accessibility id", value: selector.slice(1) };
    }
    if (selector.startsWith("#")) {
      return { strategy: "-ios predicate string", value: `name == "${selector.slice(1)}"` };
    }
    if (selector.startsWith("ios=")) {
      const expr = selector.slice(4);
      return expr.startsWith("**")
        ? { strategy: "-ios class chain", value: expr }
        : { strategy: "-ios predicate string", value: expr };
    }
    return { strategy: "xpath", value: selector };
  },

  async scrollDown(driver) {
    const s = await driver.windowRect();
    await driver.request("POST", "/actions", {
      actions: [{
        type: "pointer", id: "scroll", parameters: { pointerType: "touch" },
        actions: [
          { type: "pointerMove", duration: TIMINGS.ACTION.IMMEDIATE, x: Math.round(s.width / 2), y: Math.round(s.height * 0.7) },
          { type: "pointerDown", button: 0 },
          { type: "pause", duration: TIMINGS.ACTION.TAP_PRESS },
          { type: "pointerMove", duration: TIMINGS.ACTION.SWIPE, x: Math.round(s.width / 2), y: Math.round(s.height * 0.3) },
          { type: "pointerUp", button: 0 },
        ],
      }],
    });
    await new Promise((r) => setTimeout(r, TIMINGS.PAUSE.UI_SETTLE));
  },

  async scrollUp(driver) {
    const s = await driver.windowRect();
    await driver.request("POST", "/actions", {
      actions: [{
        type: "pointer", id: "scrollUp", parameters: { pointerType: "touch" },
        actions: [
          { type: "pointerMove", duration: TIMINGS.ACTION.IMMEDIATE, x: Math.round(s.width / 2), y: Math.round(s.height * 0.3) },
          { type: "pointerDown", button: 0 },
          { type: "pause", duration: TIMINGS.ACTION.TAP_PRESS },
          { type: "pointerMove", duration: TIMINGS.ACTION.SWIPE, x: Math.round(s.width / 2), y: Math.round(s.height * 0.7) },
          { type: "pointerUp", button: 0 },
        ],
      }],
    });
    await new Promise((r) => setTimeout(r, TIMINGS.PAUSE.UI_SETTLE));
  },

  // iOS has no hardware back button. This is a best-effort no-op; in a page
  // object, prefer tapping the visible back control instead.
  async back(driver) {
    await driver.request("POST", "/back", {}).catch(() => {
      console.log("[APPIUM] /back not supported on iOS; tap the visible back control instead");
    });
  },

  async hideKeyboard(driver) {
    await driver.request("POST", "/execute/sync", {
      script: "mobile: hideKeyboard",
      args: [{ strategy: "tapOutside" }],
    }).catch(async () => {
      await driver.tapCoordinate(200, 40).catch(() => {});
    });
    await new Promise((r) => setTimeout(r, TIMINGS.PAUSE.AFTER_DISMISS));
  },
};
