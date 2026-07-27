// ============================================================================
//  core/driver.js  —  our lightweight Appium client (talks to the phone).
// ============================================================================
//  This is a hand-rolled W3C WebDriver client built on Node's built-in fetch —
//  no webdriverio, no Selenium. Every Appium call is one HTTP request you can
//  see in the logs, which makes failures easy to read.
//
//  It is PLATFORM-AGNOSTIC. Anything platform-specific (how a selector maps to
//  a locator, how you scroll or go back) is delegated to the "adapter" passed
//  in from platforms/<platform>/platform.js.
//
//  The most important behaviour: $() NEVER throws on a miss. It returns a safe
//  null-object whose isExisting()/isDisplayed() are false, so tests can check
//  "is this here?" without a try/catch. Acting on a miss (click/setValue) does
//  throw — a missing element you tried to use is a real failure.
// ============================================================================

const AppiumElement = require("./element");
const TIMINGS = require("./timings");

const W3C_ELEMENT_KEY = "element-6066-11e4-a52e-4f735466cecf";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

class AppiumDriver {
  constructor(serverUrl, sessionId, adapter, config) {
    this.serverUrl = serverUrl;
    this.sessionId = sessionId;
    this.adapter = adapter;
    this.config = config;
    this.lastSelector = null; // remembered so a failure report can name it
  }

  static async create(serverUrl, capabilities, adapter, config) {
    console.log(`[APPIUM] POST ${serverUrl}/session`);
    const response = await fetch(`${serverUrl}/session`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ capabilities: { alwaysMatch: capabilities, firstMatch: [{}] } }),
    });
    const body = await response.text();
    const payload = body ? JSON.parse(body) : {};
    if (!response.ok) {
      throw new Error(`Appium session failed (${response.status}): ${payload.value?.message || body}`);
    }
    // BrowserStack returns sessionId at the top level; local Appium 2 nests it.
    const sessionId = payload.sessionId || payload.value?.sessionId;
    console.log(`[APPIUM] Session created: ${sessionId}`);
    return new AppiumDriver(serverUrl, sessionId, adapter, config);
  }

  async request(method, path, body, { quietNotFound = false } = {}) {
    console.log(`[APPIUM] ${method} ${path}`);
    const response = await fetch(`${this.serverUrl}/session/${this.sessionId}${path}`, {
      method,
      headers: { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const text = await response.text();
    const payload = text ? JSON.parse(text) : {};
    if (!response.ok) {
      const expectedMiss = quietNotFound && response.status === 404;
      if (!expectedMiss) {
        console.error(`[APPIUM FAIL] ${method} ${path} (${response.status})`);
        console.error(text);
      }
      const error = new Error(`Appium ${method} ${path} failed (${response.status}): ${text}`);
      error.appiumStatus = response.status;
      throw error;
    }
    return payload.value;
  }

  async deleteSession() {
    console.log(`[APPIUM] DELETE /session/${this.sessionId}`);
    await fetch(`${this.serverUrl}/session/${this.sessionId}`, { method: "DELETE" }).catch(() => {});
  }

  // BrowserStack-only: report status / annotate the video timeline. These are
  // special Appium "execute" calls; they no-op (with a log) if they fail.
  async browserstackExecutor(action, args = {}) {
    try {
      await this.request("POST", "/execute/sync", {
        script: `browserstack_executor: ${JSON.stringify({ action, arguments: args })}`,
        args: [],
      });
    } catch (error) {
      console.log(`[BROWSERSTACK] executor "${action}" failed: ${error.message.split("\n")[0]}`);
    }
  }

  async getSessionDetails() {
    try {
      const value = await this.request("POST", "/execute/sync", {
        script: `browserstack_executor: ${JSON.stringify({ action: "getSessionDetails" })}`,
        args: [],
      });
      return typeof value === "string" ? JSON.parse(value) : value;
    } catch {
      return null;
    }
  }

  // ── Finding elements ───────────────────────────────────────────────────────
  async $(selector) {
    console.log(`[FIND] ${selector}`);
    this.lastSelector = selector;
    const { strategy, value } = this.adapter.selectorToLocator(selector, this.config);
    try {
      const element = await this.request("POST", "/element", { using: strategy, value }, { quietNotFound: true });
      const id = element[W3C_ELEMENT_KEY] || element.ELEMENT;
      console.log(`[FIND PASS] ${selector} -> ${id}`);
      return new AppiumElement(this, id, selector);
    } catch (error) {
      if (error.appiumStatus !== 404) throw error;
      console.log(`[FIND MISS] ${selector}`);
      return this._nullElement(error);
    }
  }

  async $$(selector) {
    console.log(`[FIND ALL] ${selector}`);
    this.lastSelector = selector;
    const { strategy, value } = this.adapter.selectorToLocator(selector, this.config);
    const elements = await this.request("POST", "/elements", { using: strategy, value });
    return (elements || []).map((el) => new AppiumElement(this, el[W3C_ELEMENT_KEY] || el.ELEMENT, selector));
  }

  _nullElement(error) {
    return {
      id: undefined,
      isExisting: async () => false,
      isDisplayed: async () => false,
      getAttribute: async () => null,
      getText: async () => null,
      click: async () => { throw error; },
      setValue: async () => { throw error; },
      waitForDisplayed: async () => { throw error; },
    };
  }

  // ── Gestures / navigation (delegated to the platform adapter) ───────────────
  back() { return this.adapter.back(this); }
  hideKeyboard() { return this.adapter.hideKeyboard(this); }
  scrollDown() { return this.adapter.scrollDown(this); }
  scrollUp() { return this.adapter.scrollUp(this); }

  async windowRect() {
    return this.request("GET", "/window/rect");
  }

  async tapCoordinate(x, y) {
    await this.request("POST", "/actions", {
      actions: [{
        type: "pointer", id: "finger1", parameters: { pointerType: "touch" },
        actions: [
          { type: "pointerMove", duration: TIMINGS.ACTION.IMMEDIATE, x: Math.round(x), y: Math.round(y) },
          { type: "pointerDown", button: 0 },
          { type: "pause", duration: TIMINGS.ACTION.TAP_PRESS },
          { type: "pointerUp", button: 0 },
        ],
      }],
    });
  }
}

module.exports = AppiumDriver;
