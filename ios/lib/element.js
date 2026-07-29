// ─────────────────────────────────────────────────────────────────────────────
// AppiumElement (iOS) — wraps a located element and provides action methods.
//
// iOS attribute differences from Android:
//   Android @text   → iOS @label (accessibility label) or @value (field content)
//   Android @checked → iOS @value ("1" for checked, "0" for unchecked)
//   Android @enabled → iOS @enabled ("true"/"false" same)
// ─────────────────────────────────────────────────────────────────────────────

const TIMINGS = require("./timings");

class AppiumElement {
  constructor(driver, elementId, selector) {
    this.driver = driver;
    this.elementId = elementId;
    this.selector = selector;
  }

  async click() {
    console.log(`[ACTION] Click ${this.selector}`);
    try {
      await this.driver.request("POST", `/element/${this.elementId}/click`, {});
    } catch (error) {
      if (error.appiumStatus === 404 && this.selector) {
        console.log(`[ACTION] Stale element on click — re-finding ${this.selector}`);
        const fresh = await this.driver.$(this.selector);
        if (await fresh.isExisting()) {
          this.elementId = fresh.elementId;
          await this.driver.request("POST", `/element/${this.elementId}/click`, {});
          return;
        }
      }
      throw error;
    }
  }

  async isDisplayed() {
    return this.driver.request("GET", `/element/${this.elementId}/displayed`);
  }

  async isExisting() {
    return true;
  }

  async waitForDisplayed({ timeout = TIMINGS.TIMEOUT.STANDARD } = {}) {
    const end = Date.now() + timeout;
    console.log(`[WAIT] ${this.selector} displayed, timeout ${timeout}ms`);

    while (Date.now() < end) {
      if (await this.isDisplayed()) {
        console.log(`[WAIT PASS] ${this.selector} displayed`);
        return true;
      }

      await new Promise((resolve) => setTimeout(resolve, TIMINGS.POLL.STANDARD));
    }

    throw new Error(`Element ${this.elementId} was not displayed after ${timeout}ms`);
  }

  async clear() {
    console.log(`[ACTION] Clear ${this.selector}`);
    await this.driver.request("POST", `/element/${this.elementId}/clear`, {});
  }

  // Type text into a field. On iOS, we click first, clear, then send keys.
  async setValue(text, { sensitive = false } = {}) {
    console.log(`[ACTION] Type into ${this.selector}: ${sensitive ? "[hidden]" : text}`);

    await this.click();

    try {
      await this.clear();
    } catch (error) {
      console.log(`[INFO] Clear not supported for ${this.selector}; continuing`);
    }

    await this.driver.request("POST", `/element/${this.elementId}/value`, {
      text,
      value: [...text],
    });
  }

  // Keep the cross-platform helper API; standard iOS inputs use normal focus.
  async setValueAtOffsetFromLeft(text, _offsetX, { sensitive = false } = {}) {
    await this.setValue(text, { sensitive });
  }

  // Read a UI attribute by name.
  // iOS attributes:
  //   "label"   → accessibilityLabel (visible text for buttons/labels)
  //   "value"   → current text content / checked state (1/0)
  //   "enabled" → "true" / "false"
  //   "name"    → accessibilityIdentifier
  async getAttribute(name) {
    try {
      return await this.driver.request("GET", `/element/${this.elementId}/attribute/${name}`);
    } catch (error) {
      if (error.appiumStatus === 404 && this.selector) {
        console.log(`[ACTION] Stale element on getAttribute(${name}) — re-finding ${this.selector}`);
        const fresh = await this.driver.$(this.selector);
        if (await fresh.isExisting()) {
          this.elementId = fresh.elementId;
          return this.driver.request("GET", `/element/${this.elementId}/attribute/${name}`);
        }
      }
      throw error;
    }
  }

  async getRect() {
    return this.driver.request("GET", `/element/${this.elementId}/rect`);
  }

  // On iOS, there is no checkbox-square offset issue, so clickSquare delegates
  // to a normal click.
  async clickSquare() {
    console.log(`[ACTION] Click checkbox (iOS: normal click) ${this.selector}`);
    await this.click();
  }

  async clickAtOffsetFromLeft(offsetX) {
    console.log(`[ACTION] Click ${this.selector} at offset ${offsetX}px from left`);
    const rect = await this.driver.request("GET", `/element/${this.elementId}/rect`);
    const x = rect.x + offsetX;
    const y = rect.y + Math.round(rect.height / 2);
    console.log(`[ACTION] Tapping at (${x}, ${y}) — rect ${JSON.stringify(rect)}`);
    await this.driver.request("POST", "/actions", {
      actions: [{
        type: "pointer",
        id: "finger1",
        parameters: { pointerType: "touch" },
        actions: [
          { type: "pointerMove", duration: TIMINGS.ACTION.IMMEDIATE, x, y },
          { type: "pointerDown", button: 0 },
          { type: "pause", duration: TIMINGS.ACTION.KEYSTROKE_PAUSE },
          { type: "pointerUp", button: 0 },
        ],
      }],
    });
  }

  async clickAtFractionOfWidth(fraction) {
    const rect = await this.driver.request("GET", `/element/${this.elementId}/rect`);
    const x = rect.x + Math.round(rect.width * fraction);
    const y = rect.y + Math.round(rect.height / 2);
    console.log(`[ACTION] Click ${this.selector} at ${Math.round(fraction * 100)}% of width -> (${x}, ${y})`);
    await this.driver.request("POST", "/actions", {
      actions: [{
        type: "pointer",
        id: "finger1",
        parameters: { pointerType: "touch" },
        actions: [
          { type: "pointerMove", duration: TIMINGS.ACTION.IMMEDIATE, x, y },
          { type: "pointerDown", button: 0 },
          { type: "pause", duration: TIMINGS.ACTION.KEYSTROKE_PAUSE },
          { type: "pointerUp", button: 0 },
        ],
      }],
    });
  }
}

module.exports = AppiumElement;
