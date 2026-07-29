// ─────────────────────────────────────────────────────────────────────────────
// AppiumDriver (iOS) — manages the Appium/XCUITest session.
//
// Thin ADAPTER over a WebdriverIO `browser` (created and owned by the wdio
// runner, see wdio.conf.js). WebdriverIO is what @wdio/browserstack-service
// instruments for Test Observability, so the session must be driven through it.
// Every method still routes through request(), which translates the raw Appium
// REST paths this codebase uses onto WebdriverIO protocol commands — so all of
// element.js and the section/helper call sites stay unchanged.
//
// Selector syntax for $():
//   ~text       → accessibility id  (XCUITest: accessibilityIdentifier OR accessibilityLabel)
//   anything    → xpath             (use XCUIElementType* class names)
// ─────────────────────────────────────────────────────────────────────────────

const AppiumElement = require("./element");
const TIMINGS = require("./timings");

// Matches WebdriverIO/WebDriver "element isn't there" errors so we can re-expose
// them with the legacy appiumStatus === 404 shape the callers still check.
function isNotFoundError(error) {
  const text = `${error?.name || ""} ${error?.message || ""}`.toLowerCase();
  return text.includes("no such element")
    || text.includes("stale element reference")
    || text.includes("element is not attached")
    || text.includes("nosuchelement")
    || text.includes("staleelementreference");
}

// WebdriverIO's findElement / getActiveElement RETURN a WebDriver error object
// ({ error, message }) with no element key when nothing is found, rather than
// throwing. Convert that into a 404-shaped throw so $()'s null-object fallback
// and element.js's stale-element retry behave exactly as on the old fetch client.
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

  // Wrap the wdio runner's global browser. Kept for API compatibility; the
  // session is actually created by the runner (helpers.createAppiumSession
  // calls `new AppiumDriver(browser)` directly).
  static wrap(browser) {
    return new AppiumDriver(browser);
  }

  // Low-level Appium call — all other methods go through here. Translates the
  // raw Appium REST endpoints onto WebdriverIO protocol commands and re-throws
  // with the legacy { appiumStatus, appiumPayload } shape. `quietNotFound` is
  // accepted for signature compatibility; not-found errors are never noisily
  // logged here regardless.
  async request(method, path, body = {}, _opts = {}) {
    console.log(`[APPIUM] ${method} ${path}`);
    const b = this.browser;
    let m;
    try {
      if (path === "/element" && method === "POST") return elementOrThrow(await b.findElement(body.using, body.value), method, path);
      if (path === "/elements" && method === "POST") return await b.findElements(body.using, body.value);
      if (path === "/element/active" && method === "GET") return elementOrThrow(await b.getActiveElement(), method, path);

      if ((m = path.match(/^\/element\/([^/]+)\/click$/)) && method === "POST") return await b.elementClick(m[1]);
      if ((m = path.match(/^\/element\/([^/]+)\/clear$/)) && method === "POST") return await b.elementClear(m[1]);
      // W3C elementSendKeys takes (elementId, text) — passing the legacy JSONWP
      // `value` char-array errors with "Wrong parameters applied for elementSendKeys".
      if ((m = path.match(/^\/element\/([^/]+)\/value$/)) && method === "POST") return await b.elementSendKeys(m[1], body.text);
      if ((m = path.match(/^\/element\/([^/]+)\/displayed$/)) && method === "GET") return await b.isElementDisplayed(m[1]);
      if ((m = path.match(/^\/element\/([^/]+)\/rect$/)) && method === "GET") return await b.getElementRect(m[1]);
      if ((m = path.match(/^\/element\/([^/]+)\/attribute\/(.+)$/)) && method === "GET") return await b.getElementAttribute(m[1], m[2]);

      if (path === "/actions" && method === "POST") return await b.performActions(body.actions);
      if (path === "/execute/sync" && method === "POST") return await b.executeScript(body.script, body.args || []);
      if (path === "/screenshot" && method === "GET") return await b.takeScreenshot();
      if (path === "/source" && method === "GET") return await b.getPageSource();
      if (path === "/window/rect" && method === "GET") return await b.getWindowRect();
      if (path === "/back" && method === "POST") return await b.back();

      // iOS app control fallbacks — Appium uses bundleId; accept either key.
      if (path === "/appium/app/activate" && method === "POST") return await b.activateApp(body.appId || body.bundleId);
      if (path === "/appium/app/terminate" && method === "POST") return await b.terminateApp(body.appId || body.bundleId);

      throw new Error(`AppiumDriver.request: unmapped path ${method} ${path}`);
    } catch (error) {
      if (error.appiumStatus) throw error; // already mapped
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

  async deleteSession() {
    console.log(`[APPIUM] deleteSession ${this.sessionId}`);
    await this.browser.deleteSession();
  }

  // Reports pass/fail (and other markers) directly to the BrowserStack dashboard.
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

  // Returns the live session's public App Automate details (browser_url points
  // straight at the session dashboard + video).
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

  // iOS does not have a hardware back button. Use this only for navigation-bar
  // back button taps — most callers should instead tap the visible back element.
  async back() {
    try {
      await this.request("POST", "/back", {});
    } catch {
      console.log("[APPIUM] /back not supported on iOS XCUITest; ignoring");
    }
  }

  async activateApp(bundleId) {
    try {
      await this.request("POST", "/execute/sync", {
        script: "mobile: activateApp",
        args: [{ bundleId }],
      });
    } catch (error) {
      console.log(`[APPIUM] mobile: activateApp failed (${error.message}); trying /appium/app/activate`);
      try {
        await this.request("POST", "/appium/app/activate", { bundleId });
      } catch {
        console.log("[APPIUM] /appium/app/activate also failed; app may already be in foreground");
      }
    }
  }

  async terminateApp(bundleId) {
    try {
      await this.request("POST", "/execute/sync", {
        script: "mobile: terminateApp",
        args: [{ bundleId }],
      });
    } catch (error) {
      console.log(`[APPIUM] mobile: terminateApp failed (${error.message}); trying /appium/app/terminate`);
      try {
        await this.request("POST", "/appium/app/terminate", { bundleId });
      } catch {
        console.log("[APPIUM] /appium/app/terminate also failed");
      }
    }
  }

  // iOS scroll: swipe up to reveal content further down the screen.
  // Uses W3C pointer actions which work reliably across both local simulator
  // and BrowserStack cloud devices. The elementId parameter is ignored on iOS
  // (kept for API compatibility with the Android driver).
  async scrollToId(_elementId) {
    console.log(`[SCROLL] iOS swipe up (revealing content for: ${_elementId})`);
    const rect = await this.request("GET", "/window/rect");
    const x = Math.round(rect.width / 2);
    const yStart = Math.round(rect.height * 0.72);
    const yEnd = Math.round(rect.height * 0.28);
    await this.request("POST", "/actions", {
      actions: [{
        type: "pointer",
        id: "iosScroll",
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

  // Scroll up (swipe down) to go back towards the top of the screen.
  async scrollUp() {
    console.log("[SCROLL] iOS swipe down (towards top)");
    const rect = await this.request("GET", "/window/rect");
    const x = Math.round(rect.width / 2);
    const yStart = Math.round(rect.height * 0.28);
    const yEnd = Math.round(rect.height * 0.72);
    await this.request("POST", "/actions", {
      actions: [{
        type: "pointer",
        id: "iosScrollUp",
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
    await new Promise((r) => setTimeout(r, TIMINGS.PAUSE.UI_UPDATE));
  }

  // Dismiss the keyboard on iOS by tapping outside the text field area.
  async hideKeyboard() {
    console.log("[ACTION] Hide keyboard (iOS: tap outside)");
    try {
      await this.request("POST", "/execute/sync", {
        script: "mobile: hideKeyboard",
        args: [{ strategy: "tapOutside" }],
      });
    } catch (error) {
      console.log(`[APPIUM] mobile: hideKeyboard failed (${error.message}); tapping status-bar area`);
      try {
        await this.tapCoordinate(200, 40);
      } catch {
        console.log("[APPIUM] Status-bar tap also failed; continuing");
      }
    }
    await new Promise((r) => setTimeout(r, TIMINGS.PAUSE.AFTER_DISMISS));
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

  async $(selector) {
    console.log(`[FIND] ${selector}`);
    // Remembered so a failure report can name the selector that was in play.
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

      // Expected "not found" — one concise line, no stack-trace body.
      console.log(`[FIND MISS] ${selector}`);
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
    if (selector.startsWith("~")) {
      return {
        strategy: "accessibility id",
        value: selector.slice(1),
      };
    }

    // iOS uses XPath with XCUIElementType* class names.
    // No special prefix needed — just pass XPath directly.
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
