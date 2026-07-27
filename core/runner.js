// ============================================================================
//  core/runner.js  —  the Mocha suite: hooks, resilience, reporting.
// ============================================================================
//  run() defines ONE describe() block for the active platform and wires in:
//    • before()      open the Appium session (local or BrowserStack)
//    • beforeEach()  mark the video timeline; skip everything if aborted
//    • afterEach()   record pass/fail, auto-retry, capture artifacts, run the
//                    circuit breaker, and recover between tests
//    • after()       write summary-<device>.json + set the session's verdict
//  then loads this platform's page objects and registers the chosen sections.
//
//  ctx is the shared state object passed to every page object and spec.
// ============================================================================

const fs = require("fs");
const path = require("path");
const { config, shouldRunSection, shouldRunAnySection, step, stepState } = require("./config");
const browserstack = require("./browserstack");
const createHelpers = require("./helpers");
const { registerSections } = require("./section-registry");
const TIMINGS = require("./timings");

// Load every *.page.js for the active platform, keyed by filename:
//   platforms/ios/pages/auth.page.js  ->  pages.auth
function loadPages(ctx, helpers) {
  const dir = path.join(__dirname, "..", "platforms", config.platform, "pages");
  const pages = {};
  if (!fs.existsSync(dir)) return pages;
  for (const file of fs.readdirSync(dir)) {
    const match = file.match(/^(.+)\.page\.js$/);
    if (!match) continue;
    const factory = require(path.join(dir, file));
    pages[match[1]] = factory(ctx, helpers, config);
  }
  return pages;
}

function run() {
  const ctx = {
    driver: null,
    results: [],
    consecutiveFailures: 0,
    abortReason: null,
    testEmail: config.testEmail,
    testPassword: config.testPassword,
    startedAt: new Date(),
    sessionStartedAt: null,
    sessionUrl: null,
    buildUrl: null,
  };

  const helpers = createHelpers(ctx, { config, step });
  const pages = loadPages(ctx, helpers);
  const deps = { config, shouldRunSection, shouldRunAnySection, step };
  const api = { pages, helpers, deps };

  const suiteTitle = `${config.appName} (${config.platformName})`;
  const prefix = `${suiteTitle} `;
  const shortTitle = (title) => (title.startsWith(prefix) ? title.slice(prefix.length) : title);

  // Elapsed since the session began ≈ position in the BrowserStack video.
  const videoTs = () => {
    const total = Math.max(0, Math.floor((Date.now() - (ctx.sessionStartedAt || Date.now())) / 1000));
    return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
  };

  const upsert = (entry) => {
    const i = ctx.results.findIndex((r) => r.title === entry.title);
    if (i >= 0) ctx.results[i] = entry;
    else ctx.results.push(entry);
  };

  describe(suiteTitle, function () {
    this.timeout(Math.round(TIMINGS.TEST.ONE_MINUTE * config.timeoutMultiplier));
    this.retries(config.retries);

    before(async function () {
      this.timeout(TIMINGS.TEST.TWO_MINUTES);
      ctx.driver = await step("Create Appium session", () => browserstack.createSession(config));
      ctx.sessionStartedAt = Date.now();
      if (config.isBrowserStack) {
        const { sessionUrl, buildUrl } = await browserstack.resolveSessionUrls(ctx.driver);
        ctx.sessionUrl = sessionUrl || null;
        ctx.buildUrl = buildUrl || null;
        if (sessionUrl) {
          console.log(`\n[BROWSERSTACK] Build:   ${ctx.buildUrl}`);
          console.log(`[BROWSERSTACK] Session: ${ctx.sessionUrl}\n`);
        }
      }
    });

    beforeEach(async function () {
      stepState.failedLabel = null; // so the failure block names THIS test's step
      if (ctx.abortReason) {
        this.skip();
        return;
      }
      await browserstack.annotate(ctx.driver, `▶ [${videoTs()}] START — ${shortTitle(this.currentTest.fullTitle())}`);
    });

    afterEach(async function () {
      const title = this.currentTest.fullTitle();
      const passed = this.currentTest.state === "passed";
      const skipped = this.currentTest.state === "pending";
      const durationMs = this.currentTest.duration || 0;
      const retry = typeof this.currentTest.currentRetry === "function" ? this.currentTest.currentRetry() : 0;
      const retryLimit = typeof this.currentTest.retries === "function" ? this.currentTest.retries() : 0;
      const willRetry = !passed && !skipped && retry < retryLimit;

      if (skipped) {
        console.log(`\n⏭  SKIP  ${title}`);
        upsert({ title, status: "skip", durationMs });
        return;
      }

      if (passed) {
        console.log(`\n✅ PASS  ${title}`);
        upsert({ title, status: "pass", durationMs });
        ctx.consecutiveFailures = 0;
        await browserstack.annotate(ctx.driver, `✅ [${videoTs()}] PASS — ${shortTitle(title)} (${Math.round(durationMs / 1000)}s)`);
        return;
      }

      if (willRetry) {
        // A retryable failure isn't recorded — only the final attempt counts.
        console.log(`\n↻ RETRY ${title} (${retry + 1}/${retryLimit})`);
        await browserstack.annotate(ctx.driver, `↻ [${videoTs()}] RETRY — ${shortTitle(title)} (attempt ${retry + 1}/${retryLimit + 1})`, "warning");
        if (config.recoverAfterFailure) {
          await helpers.recoverAfterFailedTest().catch((e) => { ctx.abortReason = `Recovery failed: ${e.message}`; });
        }
        return;
      }

      // Final failure.
      const errorMessage = (this.currentTest.err?.message || "Test failed").replace(/\s+/g, " ").trim();
      const failedAt = videoTs();
      console.log(`\n❌ FAIL  ${title}`);
      console.log("┌──────────────────────────────────────────────────────────");
      console.log(`│ FAILURE  ${shortTitle(title)}`);
      console.log(`│ Step     ${stepState.failedLabel || "(unknown)"}`);
      console.log(`│ Selector ${ctx.driver?.lastSelector || "(n/a)"}`);
      console.log(`│ Reason   ${errorMessage.slice(0, 300)}`);
      if (config.isBrowserStack) console.log(`│ Session  ${ctx.sessionUrl || "(unresolved)"}  — video ~[${failedAt}]`);
      console.log("└──────────────────────────────────────────────────────────");

      upsert({ title, status: "fail", durationMs, errorMessage, videoTs: failedAt, step: stepState.failedLabel, selector: ctx.driver?.lastSelector });
      ctx.consecutiveFailures++;

      await browserstack.annotate(ctx.driver, `❌ [${failedAt}] FAIL — ${shortTitle(title)} — ${errorMessage.slice(0, 300)}`, "error");
      await helpers.captureFailureArtifacts(title);

      if (config.recoverAfterFailure) {
        await helpers.recoverAfterFailedTest().catch((e) => { ctx.abortReason = `Recovery failed after "${title}": ${e.message}`; });
      }

      if (config.maxConsecutiveFailures > 0 && ctx.consecutiveFailures >= config.maxConsecutiveFailures) {
        ctx.abortReason = `Circuit breaker: ${ctx.consecutiveFailures} consecutive failures`;
        console.error(`\n[CIRCUIT BREAKER] ${ctx.abortReason}`);
      }
    });

    after(async function () {
      const total = ctx.results.length;
      const passed = ctx.results.filter((r) => r.status === "pass").length;
      const failed = ctx.results.filter((r) => r.status === "fail").length;
      const skipped = ctx.results.filter((r) => r.status === "skip").length;

      console.log("\n" + "═".repeat(60));
      console.log(`  ${suiteTitle}  —  ${passed}/${total} passed, ${failed} failed, ${skipped} skipped`);
      if (ctx.abortReason) console.log(`  Aborted: ${ctx.abortReason}`);
      if (ctx.sessionUrl) console.log(`  Session: ${ctx.sessionUrl}`);
      console.log("═".repeat(60) + "\n");

      const summary = {
        status: failed > 0 || ctx.abortReason ? "FAILED" : "PASSED",
        platform: config.platform,
        appName: config.appName,
        total, passed, failed, skipped,
        abortReason: ctx.abortReason || null,
        commit: process.env.BITBUCKET_COMMIT || null,
        sessionUrl: ctx.sessionUrl || null,
        buildUrl: ctx.buildUrl || null,
        results: ctx.results,
      };

      try {
        const dir = path.join(__dirname, "..", "test-results");
        fs.mkdirSync(dir, { recursive: true });
        // SUMMARY_ID (set per device by the matrix runner) keeps parallel runs
        // from overwriting each other's summary file.
        const suffix = process.env.SUMMARY_ID ? `-${process.env.SUMMARY_ID}` : "";
        fs.writeFileSync(path.join(dir, `summary${suffix}.json`), JSON.stringify(summary, null, 2));
      } catch (error) {
        console.error(`[SUMMARY] write failed: ${error.message}`);
      }

      if (config.isBrowserStack && ctx.driver) {
        const failures = ctx.results.filter((r) => r.status === "fail");
        await browserstack.annotate(ctx.driver, `━━ RESULT: ${passed}/${total} passed, ${failed} failed, ${skipped} skipped ━━`, failed ? "error" : "info");
        for (const f of failures.slice(0, 10)) {
          await browserstack.annotate(ctx.driver, `❌ ${shortTitle(f.title)} — ~[${f.videoTs || "??:??"}] in the video`, "error");
        }
        await browserstack.setSessionName(ctx.driver, `${config.bsDevice} / ${config.platformName} ${config.bsOsVersion} — ${config.sessionLabel} — ${passed}/${total} passed${failed ? `, ${failed} failed` : ""}`);
        await browserstack.setSessionStatus(
          ctx.driver,
          summary.status === "PASSED" ? "passed" : "failed",
          ctx.abortReason || (failed ? `${failed}/${total} failed` : `${passed}/${total} passed`),
        );
      }

      if (ctx.driver) await ctx.driver.deleteSession().catch(() => {});
    });

    // Register the chosen sections (require() runs synchronously inside describe).
    registerSections(ctx, api);
  });
}

module.exports = { run };
