#!/usr/bin/env node
// ============================================================================
//  core/matrix.js  —  runs the whole suite on EVERY device in parallel.
// ============================================================================
//  This is what `npm run test:ci` calls. For the active platform it:
//    1. reads the device matrix from automation.config.js
//    2. spawns one `browserstack-node-sdk mocha` process per device (all at
//       once by default; BS_MATRIX_CONCURRENCY=1 falls back to one-at-a-time)
//    3. collects each device's summary-<id>.json
//    4. prints a per-device summary + a Failures → device → session map
//    5. publishes to TestRail (if configured)
//    6. exits non-zero if any device failed
//
//  All devices share ONE build name so they group under a single BrowserStack
//  build; the device is carried by the session name.
// ============================================================================

const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");
const { config } = require("./config");
const browserstack = require("./browserstack");
const { isTestRailConfigured, publishToTestRail } = require("./testrail");

const rootDir = path.join(__dirname, "..");
const resultsDir = path.join(rootDir, "test-results");

const safe = (v) => String(v).replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase();

// Device list: BS_MATRIX="Device@OS,Device@OS" overrides automation.config.js.
function parseMatrix() {
  const raw = process.env.BS_MATRIX;
  const list = raw
    ? raw.split(",").map((s) => s.trim()).filter(Boolean).map((e) => {
        const [device, osVersion] = e.split("@").map((x) => x.trim());
        return { device, osVersion };
      })
    : config.devices;
  return list.map((t) => ({ ...t, id: `${config.platform}-${safe(t.osVersion)}-${safe(t.device)}` }));
}

const mochaArgs = process.argv.slice(2);
if (mochaArgs[0] === "--") mochaArgs.shift();

function sharedBuildIdentifier() {
  const build = process.env.BITBUCKET_BUILD_NUMBER;
  if (build) return `#${build}`;
  const sha = process.env.BITBUCKET_COMMIT;
  if (sha) return sha.slice(0, 7);
  return `local-${Date.now()}`;
}

let SHARED_BUILD_NAME = "";
let SHARED_BUILD_IDENTIFIER = "";

// Prefix every line of interleaved parallel output with its device.
function pipePrefixed(source, dest, prefix) {
  let buffered = "";
  source.on("data", (chunk) => {
    buffered += chunk.toString();
    const lines = buffered.split("\n");
    buffered = lines.pop();
    for (const line of lines) dest.write(`${prefix}${line}\n`);
  });
  source.on("end", () => { if (buffered) dest.write(`${prefix}${buffered}\n`); });
}

function runDevice(target) {
  const junit = path.join(resultsDir, `junit-${target.id}.xml`);
  fs.rmSync(path.join(resultsDir, `summary-${target.id}.json`), { force: true });
  console.log(`[MATRIX] start ${target.device} / ${config.platformName} ${target.osVersion}`);

  return new Promise((resolve) => {
    const child = spawn("npx", ["browserstack-node-sdk", "mocha", "test.js", ...mochaArgs], {
      cwd: rootDir,
      env: {
        ...process.env,
        BROWSERSTACK: "true",
        PLATFORM: config.platform,
        BS_DEVICE: target.device,
        BS_OS_VERSION: target.osVersion,
        MOCHA_FILE: junit,
        SUMMARY_ID: target.id,
        // Identical for every device → one grouped build.
        BROWSERSTACK_BUILD_NAME: SHARED_BUILD_NAME,
        BROWSERSTACK_BUILD_IDENTIFIER: SHARED_BUILD_IDENTIFIER,
        BROWSERSTACK_PROJECT_NAME: browserstack.projectName(config),
        BS_PLATFORM_NAME: config.platform, // browserstack.yml platformName
      },
      stdio: ["ignore", "pipe", "pipe"],
    });
    const prefix = `[${target.device} ${target.osVersion}] `;
    pipePrefixed(child.stdout, process.stdout, prefix);
    pipePrefixed(child.stderr, process.stderr, prefix);
    child.on("error", (error) => { console.error(prefix + error.message); resolve(1); });
    child.on("close", (code) => resolve(code ?? 1));
  });
}

async function mapWithConcurrency(items, limit, worker) {
  const results = new Array(items.length);
  let next = 0;
  const runners = Array.from({ length: Math.max(1, Math.min(limit, items.length)) }, async () => {
    while (next < items.length) {
      const index = next++;
      results[index] = await worker(items[index]);
    }
  });
  await Promise.all(runners);
  return results;
}

async function main() {
  const matrix = parseMatrix();
  if (matrix.length === 0) {
    throw new Error(`No devices for ${config.platform}. Add some to automation.config.js under ${config.platform}.devices.`);
  }
  const concurrency = Number(process.env.BS_MATRIX_CONCURRENCY || matrix.length);
  SHARED_BUILD_NAME = browserstack.buildName(config);
  SHARED_BUILD_IDENTIFIER = sharedBuildIdentifier();
  fs.mkdirSync(resultsDir, { recursive: true });

  console.log(`[MATRIX] ${matrix.length} ${config.platform} device(s), concurrency ${concurrency}`);
  console.log(`[MATRIX] Build: "${SHARED_BUILD_NAME} ${SHARED_BUILD_IDENTIFIER}"`);
  const exitCodes = await mapWithConcurrency(matrix, concurrency, runDevice);

  const entries = matrix.map((target, i) => {
    const p = path.join(resultsDir, `summary-${target.id}.json`);
    const summary = fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, "utf8")) : null;
    return { target, summary, exitCode: exitCodes[i] };
  });

  console.log("\n" + "=".repeat(72));
  console.log(`${config.platformName} Matrix Summary`);
  console.log("=".repeat(72));
  let anyFail = false;
  for (const { target, summary, exitCode } of entries) {
    const ok = exitCode === 0 && summary && summary.status === "PASSED";
    if (!ok) anyFail = true;
    const counts = summary ? `${summary.passed}/${summary.total} passed, ${summary.failed} failed, ${summary.skipped} skipped` : "NO SUMMARY";
    console.log(`${ok ? "PASS" : "FAIL"} ${target.device} / ${config.platformName} ${target.osVersion}: ${counts} (mocha exit ${exitCode})`);
  }

  const buildUrl = entries.find((e) => e.summary?.buildUrl)?.summary.buildUrl;
  console.log("\n" + "-".repeat(72));
  console.log("App Automate sessions (video + logs):");
  if (buildUrl) console.log(`  Build: ${buildUrl}`);
  for (const { target, summary } of entries) {
    console.log(`  ${target.device} / ${config.platformName} ${target.osVersion}: ${summary?.sessionUrl || "(session url unavailable)"}`);
  }

  const withFailures = entries.filter((e) => (e.summary?.results || []).some((r) => r.status === "fail"));
  if (withFailures.length) {
    console.log("\n" + "-".repeat(72));
    console.log("Failures → device → session:");
    for (const { target, summary } of withFailures) {
      for (const f of summary.results.filter((r) => r.status === "fail")) {
        console.log(`  ❌ ${f.title}`);
        console.log(`     ${target.device} / ${config.platformName} ${target.osVersion}${f.videoTs ? ` (video ~${f.videoTs})` : ""}`);
        console.log(`     ${summary.sessionUrl || "(session url unavailable)"}`);
      }
    }
  }
  console.log("=".repeat(72));

  if (isTestRailConfigured(config)) {
    try {
      await publishToTestRail(config, entries.filter((e) => e.summary).map((e) => ({ target: e.target, summary: e.summary })));
    } catch (error) {
      console.error(`[TESTRAIL] ${error.message}`);
      anyFail = true; // a TestRail publish failure fails the run
    }
  } else {
    console.log("[TESTRAIL] Not configured (TESTRAIL_* unset) — skipping publish.");
  }

  if (anyFail) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
