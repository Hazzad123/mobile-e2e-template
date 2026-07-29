// ─────────────────────────────────────────────────────────────────────────────
// AppiumElement — wraps a located element and provides action methods.
// Returned by AppiumDriver.$() after a successful element find.
// ─────────────────────────────────────────────────────────────────────────────

const TIMINGS = require("./timings");

class AppiumElement {
  constructor(driver, elementId, selector) {
    this.driver = driver;
    this.elementId = elementId;
    this.selector = selector;
  }

  // Tap the element. Retries once on 404 (stale Compose element ID) by
  // re-finding the element before the second attempt.
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

  // Returns true if the element is currently visible on screen
  async isDisplayed() {
    return this.driver.request("GET", `/element/${this.elementId}/displayed`);
  }

  // Always true for a real element — the null-object returned by $() on miss returns false
  async isExisting() {
    return true;
  }

  // Polls until the element is visible or the timeout expires
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

  // Clear the contents of a text input
  async clear() {
    console.log(`[ACTION] Clear ${this.selector}`);
    await this.driver.request("POST", `/element/${this.elementId}/clear`, {});
  }

  // Tap the element, clear any existing text, then type the given text.
  // Pass { sensitive: true } for passwords so the value is hidden in logs.
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

  // Same as setValue(), but focuses at a fixed x offset. This helps when another
  // view intercepts the centre of a wide input.
  async setValueAtOffsetFromLeft(text, offsetX, { sensitive = false } = {}) {
    console.log(`[ACTION] Type into ${this.selector} via offset tap: ${sensitive ? "[hidden]" : text}`);

    await this.clickAtOffsetFromLeft(offsetX);

    // Keyboard-driven layout changes can invalidate the cached element.
    let focused = await this.driver.waitForExisting(this.selector, TIMINGS.TIMEOUT.SHORT);

    // Fall back to the active element if normal lookup briefly cannot see it.
    if (!focused) {
      focused = await this.driver.activeElement(this.selector);
    }

    try {
      await focused.clear();
    } catch (error) {
      console.log(`[INFO] Clear not supported for ${this.selector}; continuing`);
    }

    await this.driver.request("POST", `/element/${focused.elementId}/value`, {
      text,
      value: [...text],
    });
  }

  // Read a UI attribute by name, e.g. "text", "checked", "enabled".
  // Retries once on 404 (stale Compose element ID) by re-finding first.
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

  // Click the square on the far-left of a checkbox-with-links label.
  async clickSquare() {
    console.log(`[ACTION] Click checkbox square ${this.selector}`);
    const rect = await this.driver.request("GET", `/element/${this.elementId}/rect`);
    // Target 30 px from the left edge and vertically centre the tap.
    const x = rect.x + 30;
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

  // Click at a fixed offset from the element's left edge.
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

  // Click at a proportional x position (0 = left edge, 1 = right edge). Useful
  // when only part of a compound text label is interactive.
  async clickAtFractionOfWidth(fraction) {
    const rect = await this.driver.request("GET", `/element/${this.elementId}/rect`);
    const x = rect.x + Math.round(rect.width * fraction);
    const y = rect.y + Math.round(rect.height / 2);
    console.log(`[ACTION] Click ${this.selector} at ${Math.round(fraction * 100)}% of width -> (${x}, ${y}) — rect ${JSON.stringify(rect)}`);
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
