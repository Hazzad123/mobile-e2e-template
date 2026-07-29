#!/usr/bin/env node

const {
  TestRailPublisher,
  buildRequiredCaseIds,
} = require("./testrail");
const { DEVICES } = require("../lib/devices");

const DEFAULT_IOS_MATRIX = DEVICES
  .map(({ device, osVersion }) => `${device}@${osVersion}`)
  .join(",");

function safeName(value) {
  return value.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase();
}

function parseMatrix(raw) {
  return raw
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const [device, osVersion] = entry.includes("@")
        ? entry.split("@").map((part) => part.trim())
        : [DEVICES[0].device, entry.trim()];
      return {
        device,
        osVersion,
        id: `ios-${safeName(osVersion)}-${safeName(device)}`,
      };
    });
}

function parseSmokeCaseId() {
  const raw = process.env.TESTRAIL_SMOKE_CASE_ID || process.argv.find((arg) => /^C?\d+$/i.test(arg));
  const match = raw && /^C?(\d+)$/i.exec(raw.trim());
  if (!match) {
    throw new Error("Set TESTRAIL_SMOKE_CASE_ID, e.g. TESTRAIL_SMOKE_CASE_ID=C123.");
  }
  return Number(match[1]);
}

function parseSmokeStatus() {
  const status = (process.env.TESTRAIL_SMOKE_STATUS || "skip").toLowerCase();
  if (!["pass", "fail", "skip"].includes(status)) {
    throw new Error("TESTRAIL_SMOKE_STATUS must be one of: pass, fail, skip.");
  }
  return status;
}

function requirePublishConfirmation() {
  if (process.argv.includes("--publish") || process.env.TESTRAIL_SMOKE_PUBLISH === "true") {
    return;
  }

  throw new Error(
    "This smoke test writes to TestRail. Re-run with --publish once the env vars look right.",
  );
}

function buildSmokeSummary(caseId, status) {
  const failed = status === "fail" ? 1 : 0;
  const passed = status === "pass" ? 1 : 0;
  const skipped = status === "skip" ? 1 : 0;

  return {
    status: failed ? "FAILED" : (passed ? "PASSED" : "BLOCKED"),
    total: 1,
    passed,
    failed,
    skipped,
    buildUrl: "local TestRail smoke",
    commit: "local",
    results: [
      {
        title: `C${caseId} Local TestRail smoke validation`,
        status,
        durationMs: 1000,
        errorMessage: failed ? "Intentional local TestRail smoke failure." : undefined,
      },
    ],
  };
}

async function main() {
  requirePublishConfirmation();

  const caseId = parseSmokeCaseId();
  const status = parseSmokeStatus();
  const matrix = parseMatrix(process.env.BS_IOS_MATRIX || DEFAULT_IOS_MATRIX);
  const summary = buildSmokeSummary(caseId, status);
  const publisher = new TestRailPublisher({
    matrix,
    runName: `Local TestRail Smoke ${new Date().toISOString()}`,
  });
  const caseIds = buildRequiredCaseIds([summary]);

  console.log(`[TESTRAIL] Smoke will publish C${caseId} as ${status} to ${matrix.length} iOS runs.`);
  await publisher.ensurePlanEntry(caseIds);
  for (const target of matrix) {
    await publisher.publishTarget(summary, target);
  }
  console.log("[TESTRAIL] Smoke publish completed.");
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
