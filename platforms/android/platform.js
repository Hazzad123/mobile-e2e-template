// ============================================================================
//  platforms/android/platform.js  —  the Android "adapter".
// ============================================================================
//  Android sibling of platforms/ios/platform.js. core/driver.js asks this
//  object for everything Android-specific.
//
//  Android selector cheatsheet (what you write in page objects):
//    ~Label          accessibility id (contentDescription)
//    #my_button      resource id — the package prefix (com.example:id/) is
//                    added for you from automation.config.js
//    android=new UiSelector().text("Sign In")   a UiAutomator2 query
//    //android…      raw XPath (last resort)
// ============================================================================

const TIMINGS = require("../../core/timings");

module.exports = {
  platformName: "Android",
  automationName: "UiAutomator2",
  textAttribute: "text", // visible text lives in "text" on Android

  sessionAppCapabilities(config) {
    return {
      "appium:appPackage": config.appPackage,
      ...(config.appActivity ? { "appium:appActivity": config.appActivity } : {}),
    };
  },

  localCapabilityExtras() {
    return { "appium:autoGrantPermissions": true };
  },

  browserstackCapabilityExtras() {
    return {};
  },

  selectorToLocator(selector, config) {
    if (selector.startsWith("~")) {
      return { strategy: "accessibility id", value: selector.slice(1) };
    }
    if (selector.startsWith("#")) {
      const id = selector.slice(1);
      // Bare id → prefix with the app package; a fully-qualified id passes through.
      const value = id.includes(":id/") ? id : `${config.appPackage}:id/${id}`;
      return { strategy: "id", value };
    }
    if (selector.startsWith("android=")) {
      return { strategy: "-android uiautomator", value: selector.slice("android=".length) };
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

  // Android has a hardware/system back button.
  async back(driver) {
    await driver.request("POST", "/back", {}).catch(() => {});
  },

  async hideKeyboard(driver) {
    await driver.request("POST", "/appium/device/hide_keyboard", {}).catch(() => {});
    await new Promise((r) => setTimeout(r, TIMINGS.PAUSE.AFTER_DISMISS));
  },
};
