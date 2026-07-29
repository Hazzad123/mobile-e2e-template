// ─────────────────────────────────────────────────────────────────────────────
// AppiumDriver (Android) — thin adapter over the WebdriverIO runner's browser.
//
// WebdriverIO owns the session. @wdio/browserstack-service instruments that same
// session for Test Observability. The adapter keeps selectors and gestures small
// and consistent across section files.
//
// Selector syntax for $():
//   ~text       → accessibility id  (android:contentDescription)
//   #elementId  → resource id       (android:id, package prefix added automatically)
//   anything    → xpath
// ─────────────────────────────────────────────────────────────────────────────

const { config } = require("./env");
const AppiumElement = require("./element");
const TIMINGS = require("./timings");

// Matches WebdriverIO/WebDriver errors that mean "element isn't there" so we can
// re-expose them with the legacy `appiumStatus === 404` shape the callers (e.g.
// element.js stale-element retry, $() null-object fallback) still check.
function isNotFoundError(error) {
  const text = `${error?.name || ""} ${error?.message || ""}`.toLowerCase();
  return text.includes("no such element")
    || text.includes("stale element reference")
    || text.includes("element is not attached")
    || text.includes("nosuchelement")
    || text.includes("staleelementreference");
}

// WebdriverIO's findElement / getActiveElement do NOT throw when nothing is
// found — they RETURN a WebDriver error object ({ error, message, ... }) with no
// element key. Convert that into a 404-shaped throw so $()'s null-object fallback
// and element.js's stale-element retry behave exactly as they did on the old
// fetch client. A real hit has an "element-6066…" (or ELEMENT) key.
function elementOrThrow(result, method, path) {
  if (result && typeof result === "object" && result.error
      && !result["element-6066-11e4-a52e-4f735466cecf"] && !result.ELEMENT) {
    const error = new Error(`Appium ${method} ${path} failed: ${result.error}`);
    error.appiumStatus = 404;
    error.appiumPayload = { value: { error: result.error, message: result.message || "" } };
    throw error;
  }
  return result;
}

class AppiumDriver {
  constructor(browser) {
    this.browser = browser;
    this.sessionId = browser.sessionId;
  }

  static wrap(browser) {
    return new AppiumDriver(browser);
  }

  // Low-level Appium call — all other methods go through here. Translates the
  // raw Appium REST endpoints the codebase used against the old fetch client
  // onto WebdriverIO protocol commands, and re-throws errors with the legacy
  // { appiumStatus, appiumPayload } shape so existing error handling still works.
  async request(method, path, body = {}, _opts = {}) {
    console.log(`[APPIUM] ${method} ${path}`);
    const b = this.browser;
    let m;
    try {
      // ── element finding ──────────────────────────────────────────────────
      if (path === "/element" && method === "POST") return elementOrThrow(await b.findElement(body.using, body.value), method, path);
      if (path === "/elements" && method === "POST") return await b.findElements(body.using, body.value);
      if (path === "/element/active" && method === "GET") return elementOrThrow(await b.getActiveElement(), method, path);

      // ── element-scoped actions (/element/{id}/…) ─────────────────────────
      if ((m = path.match(/^\/element\/([^/]+)\/click$/)) && method === "POST") return await b.elementClick(m[1]);
      if ((m = path.match(/^\/element\/([^/]+)\/clear$/)) && method === "POST") return await b.elementClear(m[1]);
      // W3C elementSendKeys takes (elementId, text) only — the legacy JSONWP
      // `value` char-array (body.value) is not a parameter and triggers a
      // "Wrong parameters applied for elementSendKeys" error if passed.
      if ((m = path.match(/^\/element\/([^/]+)\/value$/)) && method === "POST") return await b.elementSendKeys(m[1], body.text);
      if ((m = path.match(/^\/element\/([^/]+)\/displayed$/)) && method === "GET") return await b.isElementDisplayed(m[1]);
      if ((m = path.match(/^\/element\/([^/]+)\/rect$/)) && method === "GET") return await b.getElementRect(m[1]);
      if ((m = path.match(/^\/element\/([^/]+)\/attribute\/(.+)$/)) && method === "GET") return await b.getElementAttribute(m[1], m[2]);

      // ── session-level ────────────────────────────────────────────────────
      if (path === "/actions" && method === "POST") return await b.performActions(body.actions);
      if (path === "/execute/sync" && method === "POST") return await b.executeScript(body.script, body.args || []);
      if (path === "/screenshot" && method === "GET") return await b.takeScreenshot();
      if (path === "/source" && method === "GET") return await b.getPageSource();
      if (path === "/window/rect" && method === "GET") return await b.getWindowRect();
      if (path === "/back" && method === "POST") return await b.back();

      // ── Appium device/app (used by fallback chains + activity helpers) ────
      if (path === "/appium/device/hide_keyboard" && method === "POST") return await b.hideKeyboard();
      if (path === "/appium/device/current_activity" && method === "GET") return await b.getCurrentActivity();
      if (path === "/appium/device/current_package" && method === "GET") return await b.getCurrentPackage();
      if (path === "/appium/device/start_activity" && method === "POST") return await b.startActivity(body.appPackage, body.appActivity);
      if (path === "/appium/app/activate" && method === "POST") return await b.activateApp(body.appId);
      if (path === "/appium/app/terminate" && method === "POST") return await b.terminateApp(body.appId);
      if (path === "/appium/app/launch" && method === "POST") return await b.launchApp();
      if (path === "/appium/app/close" && method === "POST") return await b.closeApp();

      throw new Error(`AppiumDriver.request: unmapped path ${method} ${path}`);
    } catch (error) {
      // Preserve the legacy error contract the codebase inspects.
      if (error.appiumStatus) throw error; // already mapped (nested calls)
      const notFound = isNotFoundError(error);
      const unknownCommand = /unknown command|not implemented|not yet implemented|is not supported/i.test(error?.message || "");
      const wrapped = new Error(`Appium ${method} ${path} failed: ${error?.message || error}`);
      wrapped.appiumStatus = notFound ? 404 : (unknownCommand ? 404 : (error?.statusCode || 500));
      wrapped.appiumPayload = {
        value: {
          error: notFound ? "no such element" : (unknownCommand ? "unknown command" : (error?.name || "unknown error")),
          message: error?.message || String(error),
        },
      };
      if (!notFound) {
        console.error(`[APPIUM FAIL] ${method} ${path}`);
        console.error(error?.message || error);
      }
      throw wrapped;
    }
  }

  // End the Appium session — called in the after() hook so the session
  // doesn't linger if tests fail partway through
  async deleteSession() {
    console.log(`[APPIUM] deleteSession ${this.sessionId}`);
    await this.browser.deleteSession();
  }

  // Sends a browserstack_executor command (annotate, setSessionStatus,
  // setSessionName, ...) to the BrowserStack dashboard. Without these, App
  // Automate has no visibility into a session driven over raw Appium/W3C
  // calls. Best-effort: a reporting failure never fails a test.
  // See: https://www.browserstack.com/docs/app-automate/appium/set-test-status
  async browserstackExecutor(action, args = {}) {
    try {
      await this.request("POST", "/execute/sync", {
        script: `browserstack_executor: ${JSON.stringify({ action, arguments: args })}`,
        args: [],
      });
    } catch (error) {
      console.log(`[BROWSERSTACK] executor "${action}" failed: ${error.message}`);
    }
  }

  // Returns direct App Automate build/session URLs for failure summaries.
  async getSessionDetails() {
    try {
      const value = await this.request("POST", "/execute/sync", {
        script: `browserstack_executor: ${JSON.stringify({ action: "getSessionDetails" })}`,
        args: [],
      });
      return typeof value === "string" ? JSON.parse(value) : value;
    } catch (error) {
      console.log(`[BROWSERSTACK] getSessionDetails failed: ${error.message.split("\n")[0]}`);
      return null;
    }
  }

  async back() {
    await this.request("POST", "/back", {});
  }

  // Bring the app to the foreground (used after the session is already open)
  async activateApp(appId) {
    try {
      await this.request("POST", "/execute/sync", {
        script: "mobile: activateApp",
        args: [{ appId }],
      });
    } catch (error) {
      if (!this.isUnknownMobileCommand(error, "activateApp")) {
        throw error;
      }

      console.log("[APPIUM] mobile: activateApp unsupported; falling back to /appium/app/activate");
      try {
        await this.request("POST", "/appium/app/activate", { appId });
      } catch (fallbackError) {
        console.log("[APPIUM] /appium/app/activate failed; falling back to /appium/app/launch");
        try {
          await this.request("POST", "/appium/app/launch", {});
        } catch (launchError) {
          console.log("[APPIUM] /appium/app/launch failed; falling back to /appium/device/start_activity");
          await this.startActivity(appId, config.appActivity);
        }
      }
    }
  }

  async startActivity(appPackage, appActivity) {
    try {
      await this.request("POST", "/appium/device/start_activity", {
        appPackage,
        appActivity,
      });
    } catch (error) {
      console.log("[APPIUM] /appium/device/start_activity failed; falling back to mobile: shell am start");
      await this.request("POST", "/execute/sync", {
        script: "mobile: shell",
        args: [{
          command: "am",
          args: ["start", "-n", `${appPackage}/${appActivity}`],
        }],
      });
    }
  }

  // Force-kill the app process rather than merely backgrounding it.
  async terminateApp(appId) {
    try {
      await this.request("POST", "/execute/sync", {
        script: "mobile: terminateApp",
        args: [{ appId }],
      });
    } catch (error) {
      // UiAutomator2's terminateApp polls for the process to disappear and can
      // report this transient "still running" error under BrowserStack device
      // contention even though force-stop was issued — fall through to the
      // same fallback chain used for unsupported commands rather than failing
      // the whole test on what is usually just a slow process exit.
      if (!this.isUnknownMobileCommand(error, "terminateApp") && !this.isStillRunningTimeout(error)) {
        throw error;
      }

      console.log(`[APPIUM] mobile: terminateApp failed (${error.message}); falling back to /appium/app/terminate`);
      try {
        await this.request("POST", "/appium/app/terminate", { appId });
      } catch (fallbackError) {
        console.log("[APPIUM] /appium/app/terminate failed; falling back to /appium/app/close");
        try {
          await this.request("POST", "/appium/app/close", {});
        } catch (closeError) {
          console.log("[APPIUM] /appium/app/close failed; falling back to mobile: shell am force-stop");
          await this.request("POST", "/execute/sync", {
            script: "mobile: shell",
            args: [{
              command: "am",
              args: ["force-stop", appId],
            }],
          });
        }
      }
    }
  }

  isUnknownMobileCommand(error, command) {
    return error.appiumStatus === 404
      && error.appiumPayload?.value?.error === "unknown command";
  }

  // Matches UiAutomator2's "'<appId>' is still running after <n>ms timeout"
  // error, thrown when its internal poll gives up waiting for the process to
  // exit after a terminate/force-stop request was already sent.
  isStillRunningTimeout(error) {
    const message = error.appiumPayload?.value?.message || error.message || "";
    return message.includes("still running after") && message.includes("timeout");
  }

  // Returns the package name of the app currently in the foreground
  async getCurrentPackage() {
    return this.request("GET", "/appium/device/current_package");
  }

  async getCurrentActivity() {
    return this.request("GET", "/appium/device/current_activity");
  }

  // Swipe up to reveal content. Window-relative coordinates work across device sizes.
  async scrollToId(description = "target") {
    console.log(`[SCROLL] Android swipe up (revealing: ${description})`);
    const rect = await this.request("GET", "/window/rect");
    const x = Math.round(rect.width / 2);
    const yStart = Math.round(rect.height * 0.72);
    const yEnd = Math.round(rect.height * 0.28);
    await this.request("POST", "/actions", {
      actions: [{
        type: "pointer",
        id: "androidScroll",
        parameters: { pointerType: "touch" },
        actions: [
          { type: "pointerMove", duration: TIMINGS.ACTION.IMMEDIATE, x, y: yStart },
          { type: "pointerDown", button: 0 },
          { type: "pause", duration: TIMINGS.ACTION.KEYSTROKE_PAUSE },
          { type: "pointerMove", duration: TIMINGS.ACTION.SWIPE, x, y: yEnd },
          { type: "pointerUp", button: 0 },
        ],
      }],
    });
    await new Promise((r) => setTimeout(r, TIMINGS.PAUSE.UI_SETTLE));
  }

  // Dismiss the on-screen keyboard if it is open.
  // Must be called before scrolling when text fields have been focused,
  // otherwise the keyboard covers the bottom of the form.
  async hideKeyboard() {
    console.log("[ACTION] Hide keyboard");
    try {
      await this.request("POST", "/appium/device/hide_keyboard", {});
    } catch (error) {
      const message = error.appiumPayload?.value?.message || error.message;

      if (message.includes("keyboard cannot be hidden")) {
        console.log("[APPIUM] hide_keyboard reported no hideable keyboard; continuing");
        return;
      }

      throw error;
    }
  }

  async tapCoordinate(x, y) {
    return this.tapCoordinateRepeated(x, y, 1);
  }

  async tapCoordinateRepeated(x, y, times, { pressMs = TIMINGS.ACTION.TAP_PRESS, pauseMs = TIMINGS.ACTION.TAP_PRESS } = {}) {
    console.log(`[ACTION] Fast tap (${x}, ${y}) × ${times}`);
    const actions = [
      { type: "pointerMove", duration: TIMINGS.ACTION.IMMEDIATE, x, y },
    ];

    for (let tap = 0; tap < times; tap++) {
      actions.push(
        { type: "pointerDown", button: 0 },
        { type: "pause", duration: pressMs },
        { type: "pointerUp", button: 0 },
      );

      if (tap < times - 1 && pauseMs > 0) {
        actions.push({ type: "pause", duration: pauseMs });
      }
    }

    await this.request("POST", "/actions", {
      actions: [{
        type: "pointer",
        id: `fastTap${Date.now()}`,
        parameters: { pointerType: "touch" },
        actions,
      }],
    });
  }

  // Find a single element by selector.
  // Returns a null-object (isExisting → false) when the element isn't found,
  // so callers can do optional checks without try/catch.
  async $(selector) {
    console.log(`[FIND] ${selector}`);
    this.lastSelector = selector;

    const { strategy, value } = this.selectorToLocator(selector);

    try {
      const element = await this.request("POST", "/element", { using: strategy, value }, { quietNotFound: true });
      const id = element["element-6066-11e4-a52e-4f735466cecf"] || element.ELEMENT;
      console.log(`[FIND PASS] ${selector} -> ${id}`);
      return new AppiumElement(this, id, selector);
    } catch (error) {
      if (error.appiumStatus !== 404) {
        throw error;
      }

      console.log(`[FIND MISS] ${selector}`);
      // Null-object — lets callers check isExisting() without crashing.
      // getAttribute returns null so optional attribute checks work safely.
      return {
        isExisting: async () => false,
        isDisplayed: async () => false,
        click: async () => { throw error; },
        clickSquare: async () => { throw error; },
        waitForDisplayed: async () => { throw error; },
        getAttribute: async () => null,
      };
    }
  }

  // Poll until a selector resolves to a real element id, returning null on timeout.
  // This is useful immediately after keyboard-driven layout shifts.
  async waitForExisting(selector, timeout = TIMINGS.TIMEOUT.SHORT) {
    const end = Date.now() + timeout;

    while (Date.now() < end) {
      const element = await this.$(selector);

      if (element.elementId) {
        return element;
      }

      await new Promise((resolve) => setTimeout(resolve, TIMINGS.POLL.FAST));
    }

    return null;
  }

  // Return the currently focused element. Used after tapping an input when the
  // field is focused but a fresh selector lookup is briefly unavailable.
  async activeElement(selector = "active element") {
    const element = await this.request("GET", "/element/active");
    const id = element["element-6066-11e4-a52e-4f735466cecf"] || element.ELEMENT;

    if (!id) {
      throw new Error(`Active element lookup did not return an element id for ${selector}`);
    }

    console.log(`[FIND PASS] ${selector} active -> ${id}`);
    return new AppiumElement(this, id, selector);
  }

  selectorToLocator(selector) {
    if (selector.startsWith("android=")) {
      return {
        strategy: "-android uiautomator",
        value: selector.slice("android=".length),
      };
    }

    if (selector.startsWith("~")) {
      return {
        strategy: "accessibility id",
        value: selector.slice(1),
      };
    }

    if (selector.startsWith("#")) {
      return {
        strategy: "id",
        value: `${config.appPackage}:id/${selector.slice(1)}`,
      };
    }

    return {
      strategy: "xpath",
      value: selector,
    };
  }

  async $$(selector) {
    console.log(`[FIND ALL] ${selector}`);
    const { strategy, value } = this.selectorToLocator(selector);
    const elements = await this.request("POST", "/elements", { using: strategy, value });

    return elements.map((element) => {
      const id = element["element-6066-11e4-a52e-4f735466cecf"] || element.ELEMENT;
      return new AppiumElement(this, id, selector);
    });
  }
}

module.exports = AppiumDriver;
