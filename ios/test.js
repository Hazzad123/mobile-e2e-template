const env = require("./lib/env");
const AppiumDriver = require("./lib/driver");
const createHelpers = require("./lib/helpers");
const TIMINGS = require("./lib/timings");
const {
  buildRunSummary,
  formatConsoleSummary,
  writeRunSummary,
} = require("./lib/reporting");

const { config, step, stepState } = env;
const SECTION_KEYS = ["account-setup", "example"];
env.validateSelectedSections(SECTION_KEYS);
const ctx = {
  driver: null,
  testEmail: null,
  startedAt: new Date(),
  sessionStartedAt: null,
  sessionUrl: null,
  buildUrl: null,
  results: [],
  consecutiveFailures: 0,
  abortReason: null,
};

const helpers = createHelpers(ctx, { config, step, AppiumDriver });
const deps = env;

function upsertResult(entry) {
  const index = ctx.results.findIndex((result) => result.title === entry.title);
  if (index >= 0) ctx.results[index] = entry;
  else ctx.results.push(entry);
}

function shortTitle(title) {
  return title.startsWith(config.suiteName)
    ? title.slice(config.suiteName.length).trim()
    : title;
}

function videoTs() {
  const elapsedSeconds = Math.max(
    0,
    Math.floor((Date.now() - (ctx.sessionStartedAt || Date.now())) / 1000),
  );
  return `${String(Math.floor(elapsedSeconds / 60)).padStart(2, "0")}:${String(elapsedSeconds % 60).padStart(2, "0")}`;
}

describe(config.suiteName, function () {
  this.timeout(Math.round(TIMINGS.TEST.ONE_MINUTE * config.timeoutMultiplier));
  this.retries(1);

  before(async function () {
    this.timeout(Math.round(TIMINGS.TEST.TWO_MINUTES * config.timeoutMultiplier));
    try {
      ctx.driver = await step("Wrap the WebdriverIO Appium session", helpers.createAppiumSession);
      ctx.sessionStartedAt = Date.now();
      if (config.isBrowserStack) {
        const details = await ctx.driver.getSessionDetails();
        if (details?.browser_url) {
          ctx.sessionUrl = details.browser_url;
          ctx.buildUrl = details.browser_url.split("/sessions/")[0];
          console.log(`[BROWSERSTACK] Build: ${ctx.buildUrl}`);
          console.log(`[BROWSERSTACK] Session: ${ctx.sessionUrl}`);
        }
      }
    } catch (error) {
      ctx.abortReason = `Session setup failed: ${error.message}`;
      throw error;
    }
  });

  beforeEach(async function () {
    stepState.failedLabel = null;
    if (ctx.abortReason) {
      this.skip();
      return;
    }
    if (ctx.driver && config.isBrowserStack) {
      await ctx.driver.browserstackExecutor("annotate", {
        data: `▶ [${videoTs()}] START — ${shortTitle(this.currentTest.fullTitle())}`,
        level: "info",
      });
    }
  });

  afterEach(async function () {
    this.timeout(Math.round(TIMINGS.TEST.THREE_MINUTES * config.timeoutMultiplier));

    const test = this.currentTest;
    const title = test.fullTitle();
    const passed = test.state === "passed";
    const skipped = test.state === "pending";
    const currentRetry = typeof test.currentRetry === "function" ? test.currentRetry() : 0;
    const retryLimit = typeof test.retries === "function" ? test.retries() : 0;
    const willRetry = !passed && !skipped && currentRetry < retryLimit;
    const durationMs = test.duration || 0;

    if (skipped) {
      console.log(`\n⏭  SKIP  ${title}`);
      upsertResult({ title, status: "skip", durationMs });
      return;
    }

    if (passed) {
      console.log(`\n✅ PASS  ${title}`);
      upsertResult({ title, status: "pass", durationMs });
      ctx.consecutiveFailures = 0;
      if (config.isBrowserStack) {
        await ctx.driver.browserstackExecutor("annotate", {
          data: `✅ [${videoTs()}] PASS — ${shortTitle(title)} (${Math.round(durationMs / 1000)}s)`,
          level: "info",
        });
      }
      return;
    }

    if (willRetry) {
      console.log(`\n↻ RETRY ${title} (${currentRetry + 1}/${retryLimit})`);
      if (config.isBrowserStack) {
        await ctx.driver.browserstackExecutor("annotate", {
          data: `↻ [${videoTs()}] RETRY — ${shortTitle(title)}; recovering first`,
          level: "warning",
        });
      }
      if (config.recoverAfterFailure && ctx.driver) {
        try {
          await helpers.recoverAfterFailedTest(title);
        } catch (error) {
          ctx.abortReason = `Recovery failed before retrying "${title}": ${error.message}`;
          console.error(`[RECOVERY FAILED] ${ctx.abortReason}`);
        }
      }
      return;
    }

    const failedAt = videoTs();
    const errorMessage = test.err?.message || String(test.err || "Test failed");
    const failure = {
      title,
      status: "fail",
      durationMs,
      errorMessage,
      videoTs: failedAt,
      step: stepState.failedLabel,
      selector: ctx.driver?.lastSelector,
    };

    console.log(`\n❌ FAIL  ${title}`);
    console.log(`   Step: ${failure.step || "(unknown)"}`);
    console.log(`   Selector: ${failure.selector || "(n/a)"}`);
    console.log(`   Reason: ${errorMessage.replace(/\s+/g, " ").slice(0, 400)}`);
    if (ctx.sessionUrl) console.log(`   Session: ${ctx.sessionUrl} — video ~${failedAt}`);

    if (config.isBrowserStack) {
      await ctx.driver.browserstackExecutor("annotate", {
        data: `❌ [${failedAt}] FAIL — ${shortTitle(title)} — ${errorMessage.replace(/\s+/g, " ").slice(0, 300)}`,
        level: "error",
      });
    }

    failure.artifacts = await helpers.captureFailureArtifacts(title);
    upsertResult(failure);
    ctx.consecutiveFailures++;

    if (config.recoverAfterFailure && ctx.driver) {
      try {
        await helpers.recoverAfterFailedTest(title);
      } catch (error) {
        ctx.abortReason = `Recovery failed after "${title}": ${error.message}`;
        console.error(`[RECOVERY FAILED] ${ctx.abortReason}`);
      }
    }

    if (
      config.maxConsecutiveFailures > 0
      && ctx.consecutiveFailures >= config.maxConsecutiveFailures
    ) {
      ctx.abortReason = `Circuit breaker: ${ctx.consecutiveFailures} consecutive failures`;
      console.error(`[CIRCUIT BREAKER] ${ctx.abortReason}`);
    }
  });

  after(async function () {
    const summary = buildRunSummary({
      results: ctx.results,
      abortReason: ctx.abortReason,
      startedAt: ctx.startedAt,
      finishedAt: new Date(),
      sessionUrl: ctx.sessionUrl,
      buildUrl: ctx.buildUrl,
      config,
    });

    console.log(formatConsoleSummary(summary));
    const files = writeRunSummary(summary);
    console.log(`[SUMMARY] Markdown: ${files.markdownPath}`);
    console.log(`[SUMMARY] JSON: ${files.jsonPath}`);

    if (ctx.driver && config.isBrowserStack) {
      const failures = summary.results.filter((result) => result.status === "fail");
      await ctx.driver.browserstackExecutor("annotate", {
        data: `━━ RESULT: ${summary.passed}/${summary.total} passed, ${summary.failed} failed, ${summary.skipped} skipped ━━`,
        level: summary.status === "PASSED" ? "info" : "error",
      });
      for (const failure of failures.slice(0, 10)) {
        await ctx.driver.browserstackExecutor("annotate", {
          data: `❌ ${shortTitle(failure.title)} — video ~[${failure.videoTs || "??:??"}]`,
          level: "error",
        });
      }
      await ctx.driver.browserstackExecutor("setSessionName", {
        name: `${config.bsDevice} / ${config.platformLabel} ${config.bsOsVersion} — ${config.sessionLabel} — ${summary.passed}/${summary.total} passed${summary.failed ? `, ${summary.failed} failed` : ""}`,
      });
      await ctx.driver.browserstackExecutor("setSessionStatus", {
        status: summary.status === "PASSED" ? "passed" : "failed",
        reason: ctx.abortReason
          || (summary.failed
            ? `${summary.failed}/${summary.total} failed: ${failures.slice(0, 5).map((item) => shortTitle(item.title)).join("; ")}`
            : `${summary.passed}/${summary.total} passed, ${summary.skipped} skipped`),
      });
    }

    // WebdriverIO owns teardown so its BrowserStack service can finalise
    // Test Observability. Never delete the session from this hook.
    if (summary.status !== "PASSED") process.exitCode = 1;
  });

  require("./sections/account-setup")(ctx, helpers, deps);
  require("./sections/example")(ctx, helpers, deps);
});
