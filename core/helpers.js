// ============================================================================
//  core/helpers.js  —  the shared interaction toolkit given to every spec/page.
// ============================================================================
//  createHelpers(ctx, deps) returns the small set of robust primitives page
//  objects and specs use instead of raw driver.$ calls. Every timeout here is
//  a NOMINAL value; T() scales it by config.timeoutMultiplier so BrowserStack
//  gets extra headroom automatically.
//
//    waitFor$          poll until an element exists; throw on timeout (required)
//    waitForOptional$  poll until it exists; return null on timeout (optional)
//    firstExisting$    wait for whichever of several selectors appears first
//    expectVisible     assert an element is on-screen
//    assertNotVisible  assert an element is absent
//    scrollUntilVisible swipe up until it appears (or give up)
//    captureFailureArtifacts  screenshot + page source on failure (auto-called)
//    recoverAfterFailedTest   best-effort return to a sane state between tests
// ============================================================================

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const TIMINGS = require("./timings");
const browserstack = require("./browserstack");

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

module.exports = function createHelpers(ctx, { config, step }) {
  const T = (ms) => Math.round(ms * config.timeoutMultiplier);

  async function waitFor$(selector, timeout = TIMINGS.TIMEOUT.STANDARD) {
    const scaled = T(timeout);
    const end = Date.now() + scaled;
    console.log(`[WAIT FOR] ${selector} (${scaled}ms)`);
    while (Date.now() < end) {
      const el = await ctx.driver.$(selector);
      if (await el.isExisting()) return el;
      await sleep(TIMINGS.POLL.FAST);
    }
    throw new Error(`${selector} did not appear within ${scaled}ms`);
  }

  async function waitForOptional$(selector, timeout = TIMINGS.TIMEOUT.OPTIONAL) {
    const scaled = T(timeout);
    const end = Date.now() + scaled;
    while (Date.now() < end) {
      const el = await ctx.driver.$(selector);
      if (await el.isExisting()) return el;
      await sleep(TIMINGS.POLL.FAST);
    }
    return null;
  }

  async function firstExisting$(selectors, timeout = TIMINGS.TIMEOUT.STANDARD) {
    const scaled = T(timeout);
    const end = Date.now() + scaled;
    while (Date.now() < end) {
      const checks = await Promise.all(selectors.map(async (selector) => {
        const el = await ctx.driver.$(selector);
        return (await el.isExisting()) ? { selector, element: el } : null;
      }));
      const found = checks.find(Boolean);
      if (found) return found;
      await sleep(TIMINGS.POLL.FAST);
    }
    throw new Error(`None of [${selectors.join(", ")}] appeared within ${scaled}ms`);
  }

  async function expectVisible(selector, timeout = TIMINGS.TIMEOUT.STANDARD) {
    const end = Date.now() + T(timeout);
    while (Date.now() < end) {
      const el = await ctx.driver.$(selector);
      if (await el.isDisplayed()) return el;
      await sleep(TIMINGS.POLL.FAST);
    }
    assert.fail(`Expected ${selector} to be visible but it was not`);
  }

  async function assertNotVisible(selector, message, timeout = TIMINGS.TIMEOUT.QUICK) {
    const el = await waitForOptional$(selector, timeout);
    assert.ok(!el, message || `Expected ${selector} to be absent but it was present`);
  }

  async function scrollUntilVisible(selector, { maxSwipes = 6, timeout = TIMINGS.TIMEOUT.QUICK } = {}) {
    for (let attempt = 0; attempt <= maxSwipes; attempt++) {
      const el = await waitForOptional$(selector, timeout);
      if (el) return el;
      if (attempt < maxSwipes) await ctx.driver.scrollDown();
    }
    return null;
  }

  // Auto-called by the runner on every failure. Screenshot PNG + page-source XML
  // land in screenshots/ (git-ignored) and are linked from the run summary.
  async function captureFailureArtifacts(label) {
    try {
      const dir = path.join(__dirname, "..", "screenshots");
      fs.mkdirSync(dir, { recursive: true });
      const safe = String(label).replace(/[^a-z0-9]+/gi, "_").slice(0, 80);
      const stamp = Date.now();
      const png = await ctx.driver.request("GET", "/screenshot").catch(() => null);
      if (png) fs.writeFileSync(path.join(dir, `FAIL_${safe}_${stamp}.png`), Buffer.from(png, "base64"));
      const src = await ctx.driver.request("GET", "/source").catch(() => null);
      if (src) fs.writeFileSync(path.join(dir, `FAIL_${safe}_${stamp}.xml`), typeof src === "string" ? src : JSON.stringify(src));
      console.log(`[ARTIFACT] saved failure screenshot + source for "${label}"`);
    } catch (error) {
      console.log(`[ARTIFACT] capture failed: ${error.message}`);
    }
  }

  // Best-effort cleanup so the next test starts sane. Tries a couple of "back"
  // taps; if the session is unusable, rebuilds it (noReset keeps app state).
  // TODO: apps with deep navigation can add app-specific recovery in a page object.
  async function recoverAfterFailedTest() {
    if (!ctx.driver) return;
    try {
      for (let i = 0; i < 2; i++) {
        await ctx.driver.back();
        await sleep(TIMINGS.PAUSE.TRANSITION);
      }
      return;
    } catch (error) {
      console.log(`[RECOVERY] back failed (${error.message}); recreating session`);
    }
    await ctx.driver.deleteSession().catch(() => {});
    ctx.driver = await browserstack.createSession(config);
    ctx.sessionStartedAt = Date.now();
    if (config.isBrowserStack) {
      await browserstack.annotate(ctx.driver, "Session recreated by failure recovery — earlier [mm:ss] marks refer to the previous video", "warning");
    }
  }

  return {
    waitFor$,
    waitForOptional$,
    firstExisting$,
    expectVisible,
    assertNotVisible,
    scrollUntilVisible,
    captureFailureArtifacts,
    recoverAfterFailedTest,
  };
};
