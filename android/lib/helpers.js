const fs = require("fs");
const path = require("path");
const TIMINGS = require("./timings");

module.exports = function createHelpers(ctx, { config, step, AppiumDriver }) {
  const scaled = (ms) => Math.round(ms * config.timeoutMultiplier);
  const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  async function createAppiumSession() {
    const { browser } = require("@wdio/globals");
    return AppiumDriver.wrap(browser);
  }

  async function waitFor$(selector, timeout = TIMINGS.TIMEOUT.STANDARD) {
    const deadline = Date.now() + scaled(timeout);
    let lastError;

    while (Date.now() < deadline) {
      try {
        const element = await ctx.driver.$(selector);
        if (await element.isExisting() && await element.isDisplayed()) return element;
      } catch (error) {
        lastError = error;
      }
      await pause(TIMINGS.POLL.STANDARD);
    }

    const suffix = lastError ? ` Last error: ${lastError.message}` : "";
    throw new Error(`${selector} did not become visible within ${scaled(timeout)}ms.${suffix}`);
  }

  async function waitForOptional$(selector, timeout = TIMINGS.TIMEOUT.OPTIONAL) {
    try {
      return await waitFor$(selector, timeout);
    } catch {
      return null;
    }
  }

  async function firstExisting$(selectors, timeout = TIMINGS.TIMEOUT.STANDARD) {
    const deadline = Date.now() + scaled(timeout);
    while (Date.now() < deadline) {
      for (const selector of selectors) {
        const element = await ctx.driver.$(selector);
        if (await element.isExisting() && await element.isDisplayed()) {
          return { selector, element };
        }
      }
      await pause(TIMINGS.POLL.STANDARD);
    }
    throw new Error(`None of these selectors became visible: ${selectors.join(", ")}`);
  }

  async function expectVisible(selector, timeout = TIMINGS.TIMEOUT.STANDARD) {
    return waitFor$(selector, timeout);
  }

  async function scrollUntilVisible(selector, {
    maxSwipes = 5,
    timeoutPerAttempt = TIMINGS.TIMEOUT.QUICK,
  } = {}) {
    for (let attempt = 0; attempt <= maxSwipes; attempt++) {
      const element = await waitForOptional$(selector, timeoutPerAttempt);
      if (element) return element;
      if (attempt < maxSwipes) await ctx.driver.scrollToId(selector);
    }
    throw new Error(`${selector} was not visible after ${maxSwipes} swipe(s).`);
  }

  function safeArtifactName(title) {
    return title
      .replace(/[^a-z0-9]+/gi, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 90);
  }

  async function captureFailureArtifacts(testTitle) {
    if (!ctx.driver) return {};
    const outputDir = path.join(__dirname, "..", "screenshots");
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const base = `FAIL_${safeArtifactName(testTitle)}_${stamp}`;
    const artifacts = {};
    fs.mkdirSync(outputDir, { recursive: true });

    try {
      const screenshot = await ctx.driver.request("GET", "/screenshot");
      const screenshotPath = path.join(outputDir, `${base}.png`);
      fs.writeFileSync(screenshotPath, screenshot, "base64");
      artifacts.screenshot = screenshotPath;
    } catch (error) {
      console.error(`[ARTIFACT] Screenshot failed: ${error.message}`);
    }

    try {
      const source = await ctx.driver.request("GET", "/source");
      const sourcePath = path.join(outputDir, `${base}.xml`);
      fs.writeFileSync(sourcePath, source);
      artifacts.source = sourcePath;
    } catch (error) {
      console.error(`[ARTIFACT] Page source failed: ${error.message}`);
    }

    return artifacts;
  }

  async function recoverAfterFailedTest(testTitle) {
    await step(`Recover after failure: ${testTitle}`, async () => {
      if (typeof ctx.recover === "function") {
        await ctx.recover();
        return;
      }
      if (config.restartAppAfterFailure) {
        await ctx.driver.terminateApp(config.appId);
      }
      await ctx.driver.activateApp(config.appId);
      await pause(TIMINGS.PAUSE.SCREEN_TRANSITION);
      if (process.env.RECOVERY_READY_SELECTOR && !process.env.RECOVERY_READY_SELECTOR.includes("__")) {
        await waitFor$(process.env.RECOVERY_READY_SELECTOR, TIMINGS.TIMEOUT.SCREEN_LOAD);
      }
    });
  }

  return {
    captureFailureArtifacts,
    createAppiumSession,
    expectVisible,
    firstExisting$,
    pause,
    recoverAfterFailedTest,
    scrollUntilVisible,
    waitFor$,
    waitForOptional$,
  };
};
