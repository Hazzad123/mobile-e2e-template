// ============================================================================
//  core/element.js  —  a thin wrapper around ONE element on screen.
// ============================================================================
//  driver.$(selector) returns one of these when it finds a match. Every method
//  talks to Appium over HTTP via the driver. The two clever bits:
//    • click() and getAttribute() retry ONCE on a 404 by re-finding the
//      selector — mobile UIs recycle element ids after a re-render, and this
//      quietly heals the most common "stale element" failure.
//    • setValue() clears the field first, and hides the text when sensitive.
// ============================================================================

const TIMINGS = require("./timings");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

class AppiumElement {
  constructor(driver, id, selector) {
    this.driver = driver;
    this.id = id;
    this.selector = selector;
  }

  // A real element always exists (driver.$ returns a null-object on a miss).
  async isExisting() {
    return true;
  }

  async _refindIdFor404(error) {
    if (error.appiumStatus !== 404 || !this.selector) return false;
    const fresh = await this.driver.$(this.selector);
    if (fresh && fresh.id) {
      this.id = fresh.id;
      return true;
    }
    return false;
  }

  async isDisplayed() {
    try {
      return Boolean(await this.driver.request("GET", `/element/${this.id}/displayed`, undefined, { quietNotFound: true }));
    } catch {
      return false;
    }
  }

  async getAttribute(name) {
    try {
      return await this.driver.request("GET", `/element/${this.id}/attribute/${name}`, undefined, { quietNotFound: true });
    } catch (error) {
      if (await this._refindIdFor404(error)) {
        return this.driver.request("GET", `/element/${this.id}/attribute/${name}`);
      }
      return null;
    }
  }

  // Visible text: "text" on Android, "label" on iOS. The active platform adapter
  // tells us which, so pages can just call getText() without caring.
  async getText() {
    const attr = this.driver.adapter.textAttribute;
    return this.getAttribute(attr);
  }

  async getRect() {
    return this.driver.request("GET", `/element/${this.id}/rect`);
  }

  async click() {
    try {
      await this.driver.request("POST", `/element/${this.id}/click`, {});
    } catch (error) {
      if (await this._refindIdFor404(error)) {
        await this.driver.request("POST", `/element/${this.id}/click`, {});
        return;
      }
      throw error;
    }
  }

  async clearValue() {
    await this.driver.request("POST", `/element/${this.id}/clear`, {});
  }

  async setValue(text, { sensitive = false } = {}) {
    await this.driver.request("POST", `/element/${this.id}/clear`, {}).catch(() => {});
    await this.driver.request("POST", `/element/${this.id}/value`, { text: String(text) });
    console.log(`[ACTION] setValue ${this.selector} = "${sensitive ? "***" : text}"`);
  }

  async waitForDisplayed(timeout = TIMINGS.TIMEOUT.STANDARD) {
    const end = Date.now() + timeout;
    while (Date.now() < end) {
      if (await this.isDisplayed()) return true;
      await sleep(TIMINGS.POLL.FAST);
    }
    throw new Error(`${this.selector} was not displayed within ${timeout}ms`);
  }
}

module.exports = AppiumElement;
