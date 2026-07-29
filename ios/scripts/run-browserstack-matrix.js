#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");
const {
  TestRailPublisher,
  buildRequiredCaseIds,
} = require("./testrail");
const { DEVICES } = require("../lib/devices");

const rootDir = path.join(__dirname, "..");
const resultsDir = path.join(rootDir, "test-results");

const DEFAULT_IOS_MATRIX = DEVICES
  .map(({ device, osVersion }) => `${device}@${osVersion}`)
  .join(",");

function parseMatrix(raw) {
  return raw
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const [device, osVersion] = entry.includes("@")
        ? entry.split("@").map((part) => part.trim())
        : [process.env.BS_DEVICE || DEVICES[0].device, entry.trim()];

      if (!device || !osVersion) {
        throw new Error(
          `Invalid BS_IOS_MATRIX entry "${entry}". Use "Device Name@OS Version".`,
        );
      }

      return { device, osVersion };
    })
    .map((target) => ({
      ...target,
      id: `ios-${safeName(target.osVersion)}-${safeName(target.device)}`,
    }));
}

function safeName(value) {
  return value.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase();
}

function buildMatrixRunName() {
  const date = new Date().toISOString().slice(0, 10);
  const build = process.env.BITBUCKET_BUILD_NUMBER || process.env.BUILD_NUMBER;
  return build ? `iOS E2E Regression ${date} #${build}` : `iOS E2E Regression ${date}`;
}

// A single, DEVICE-INDEPENDENT build name shared by every device in the run so
// every device's App Automate session groups under ONE Test Observability build.
// wdio.conf.js + @wdio/browserstack-service read BROWSERSTACK_BUILD_NAME/_IDENTIFIER
// (exported below); the device/OS is carried by the session name instead. Computed
// once in main() and exported to every subprocess so the value is identical.
function buildSharedBuildName() {
  const runLabel = process.env.E2E_RUN_LABEL || "On-demand";
  return `iOS ${runLabel} ${new Date().toISOString().slice(0, 10)}`;
}

// Distinguishes re-runs of the same-named build. Shared across devices in one
// run so they still group together. Prefer the pipeline build number, then a
// short commit sha, then a single timestamp fixed for this invocation.
function buildSharedBuildIdentifier() {
  const build = process.env.BITBUCKET_BUILD_NUMBER || process.env.BUILD_NUMBER;
  if (build) return `#${build}`;
  const sha = process.env.BITBUCKET_COMMIT;
  if (sha) return sha.slice(0, 7);
  return `local-${Date.now()}`;
}

// Assigned once in main(); read by runDevice so every subprocess gets the same
// build name/identifier.
let SHARED_BUILD_NAME = "";
let SHARED_BUILD_IDENTIFIER = "";

// Interleaved output from parallel devices is unreadable without a per-device
// prefix on every line.
function pipePrefixed(source, dest, prefix) {
  let buffered = "";
  source.on("data", (chunk) => {
    buffered += chunk.toString();
    const lines = buffered.split("\n");
    buffered = lines.pop();
    for (const line of lines) {
      dest.write(`${prefix}${line}\n`);
    }
  });
  source.on("end", () => {
    if (buffered) {
      dest.write(`${prefix}${buffered}\n`);
    }
  });
}

function runDevice(target) {
  fs.rmSync(path.join(resultsDir, `summary-${target.id}.json`), { force: true });
  fs.rmSync(path.join(resultsDir, `summary-${target.id}.md`), { force: true });

  console.log(`[MATRIX] Starting ${target.device} / iOS ${target.osVersion}`);

  return new Promise((resolve) => {
    // Run the suite through the WebdriverIO test-runner. The @wdio/browserstack-service
    // (configured in wdio.conf.js) owns the App Automate session and links it into
    // Test Observability so each test gets embedded video/screenshots.
    const child = spawn("npx", ["wdio", "run", "wdio.conf.js"], {
      cwd: rootDir,
      env: {
        ...process.env,
        BROWSERSTACK: "true",
        BS_DEVICE: target.device,
        BS_OS_VERSION: target.osVersion,
        SUMMARY_ID: target.id,
        // Same build name + identifier for every device → one grouped build.
        BROWSERSTACK_BUILD_NAME: SHARED_BUILD_NAME,
        BROWSERSTACK_BUILD_IDENTIFIER: SHARED_BUILD_IDENTIFIER,
      },
      stdio: ["ignore", "pipe", "pipe"],
    });

    const prefix = `[${target.device} ${target.osVersion}] `;
    pipePrefixed(child.stdout, process.stdout, prefix);
    pipePrefixed(child.stderr, process.stderr, prefix);
    child.on("error", (error) => {
      console.error(`${prefix}${error.message}`);
      resolve(1);
    });
    child.on("close", (code) => resolve(code ?? 1));
  });
}

// All devices run at once by default — each is an independent BrowserStack
// session. Set BS_MATRIX_CONCURRENCY=1 to fall back to one-at-a-time (e.g. if
// the BrowserStack plan runs out of parallel slots).
async function mapWithConcurrency(items, limit, worker) {
  const results = new Array(items.length);
  let nextIndex = 0;
  const runners = Array.from({ length: Math.max(1, Math.min(limit, items.length)) }, async () => {
    while (nextIndex < items.length) {
      const index = nextIndex++;
      results[index] = await worker(items[index]);
    }
  });
  await Promise.all(runners);
  return results;
}

async function main() {
  const matrix = parseMatrix(process.env.BS_IOS_MATRIX || DEFAULT_IOS_MATRIX);
  const concurrency = Number(process.env.BS_MATRIX_CONCURRENCY || matrix.length);
  if (!Number.isInteger(concurrency) || concurrency < 1) {
    throw new Error("BS_MATRIX_CONCURRENCY must be a positive integer.");
  }
  const publisher = new TestRailPublisher({
    matrix,
    runName: buildMatrixRunName(),
  });

  // Computed once so every device subprocess inherits the identical value and
  // the sessions group into a single App Automate + TestHub build.
  SHARED_BUILD_NAME = buildSharedBuildName();
  SHARED_BUILD_IDENTIFIER = buildSharedBuildIdentifier();

  fs.mkdirSync(resultsDir, { recursive: true });

  console.log(`[MATRIX] ${matrix.length} device(s), concurrency ${concurrency}`);
  console.log(`[MATRIX] Build: "${SHARED_BUILD_NAME} ${SHARED_BUILD_IDENTIFIER}" (all devices → one build)`);
  const exitCodes = await mapWithConcurrency(matrix, concurrency, runDevice);

  const summaries = [];
  const results = [];
  matrix.forEach((target, index) => {
    const summaryJsonPath = path.join(resultsDir, `summary-${target.id}.json`);
    const summary = fs.existsSync(summaryJsonPath)
      ? JSON.parse(fs.readFileSync(summaryJsonPath, "utf8"))
      : null;

    const failedBySummary = !summary
      || summary.status !== "PASSED"
      || summary.failed > 0
      || Boolean(summary.abortReason);

    summaries.push({ target, summary });
    results.push({
      ...target,
      exitCode: exitCodes[index],
      summaryStatus: summary?.status || "MISSING",
      total: summary?.total ?? 0,
      passed: summary?.passed ?? 0,
      failed: summary?.failed ?? 0,
      skipped: summary?.skipped ?? 0,
      // Real App Automate URLs, resolved from the live session in test.js and
      // written into the summary, so the log can link straight to the recording.
      sessionUrl: summary?.sessionUrl || null,
      buildUrl: summary?.buildUrl || null,
      failures: (summary?.results || []).filter((r) => r.status === "fail"),
      ok: (exitCodes[index] === 0) && !failedBySummary,
      testrailPublished: false,
    });
  });

  try {
    const caseIds = buildRequiredCaseIds(summaries.map((entry) => entry.summary));
    if (caseIds.length === 0) {
      throw new Error("No TestRail case IDs were found in the matrix summaries.");
    }

    await publisher.ensurePlanEntry(caseIds);
    for (const entry of summaries) {
      if (!entry.summary) {
        throw new Error(`No summary was produced for ${entry.target.device} / iOS ${entry.target.osVersion}.`);
      }
      await publisher.publishTarget(entry.summary, entry.target);
      const result = results.find((candidate) => candidate.id === entry.target.id);
      if (result) {
        result.testrailPublished = true;
      }
    }
  } catch (error) {
    console.error(`[TESTRAIL] ${error.message}`);
    results.forEach((result) => {
      result.ok = false;
    });
  }

  console.log("\n" + "=".repeat(72));
  console.log("BrowserStack iOS Matrix Summary");
  console.log("=".repeat(72));
  for (const result of results) {
    const mark = result.ok ? "PASS" : "FAIL";
    const testrail = result.testrailPublished ? "TestRail published" : "TestRail not published";
    console.log(
      `${mark} ${result.device} / iOS ${result.osVersion}: ` +
      `${result.passed}/${result.total} passed, ${result.failed} failed, ` +
      `${result.skipped} skipped, mocha exit ${result.exitCode}, ` +
      `summary ${result.summaryStatus}, ${testrail}`,
    );
  }

  // App Automate deep links — jump straight to each device's session/recording.
  console.log("\n" + "-".repeat(72));
  console.log("App Automate sessions (video, device/appium/network logs):");
  const buildUrl = results.find((r) => r.buildUrl)?.buildUrl;
  if (buildUrl) {
    console.log(`  Build: ${buildUrl}`);
  }
  for (const result of results) {
    console.log(`  ${result.device} / iOS ${result.osVersion}: ${result.sessionUrl || "(session URL unavailable)"}`);
  }

  // Failed test → device → session URL, so triage is one click.
  const failedResults = results.filter((r) => r.failures && r.failures.length > 0);
  if (failedResults.length > 0) {
    console.log("\n" + "-".repeat(72));
    console.log("Failures → device → session:");
    for (const result of failedResults) {
      for (const failure of result.failures) {
        const at = failure.videoTs ? ` (video ~${failure.videoTs})` : "";
        console.log(`  ❌ ${failure.title}`);
        console.log(`     ${result.device} / iOS ${result.osVersion}${at}`);
        console.log(`     ${result.sessionUrl || "(session URL unavailable)"}`);
      }
    }
  }
  console.log("=".repeat(72));

  if (results.some((result) => !result.ok)) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
