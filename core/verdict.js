#!/usr/bin/env node
// ============================================================================
//  core/verdict.js  —  the final "Run summary + verdict" pipeline step.
// ============================================================================
//  This is the ONLY thing that turns the pipeline red or green. The test steps
//  never fail their own step — each writes test-status/<platform>.env containing
//  EXIT=<code|skipped>, so this step always runs even after failures.
//
//  It reads:
//    test-status/<platform>.env          EXIT=0 | EXIT=1 | EXIT=skipped
//    test-results/summary-<platform>-*.json   one per device
//  prints a combined summary, then exits non-zero if any platform that was
//  expected to run had a failure.
// ============================================================================

const fs = require("fs");
const path = require("path");

const PLATFORMS = ["android", "ios"];
const rootDir = path.join(__dirname, "..");

function readEnvFile(file) {
  if (!fs.existsSync(file)) return null;
  const out = {};
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const i = line.indexOf("=");
    if (i > 0) out[line.slice(0, i).trim()] = line.slice(i + 1).trim();
  }
  return out;
}

function readJson(file) {
  return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : null;
}

function collect(platform) {
  const status = readEnvFile(path.join(rootDir, "test-status", `${platform}.env`));
  if (!status) return null; // platform wasn't part of this pipeline
  if (status.EXIT === "skipped") return { platform, skipped: true };

  const resultsDir = path.join(rootDir, "test-results");
  const devices = [];
  const failures = new Set();
  if (fs.existsSync(resultsDir)) {
    for (const file of fs.readdirSync(resultsDir).sort()) {
      // summary-<platform>-<os>-<device>.json
      if (!file.startsWith(`summary-${platform}-`) || !file.endsWith(".json")) continue;
      const summary = readJson(path.join(resultsDir, file));
      if (!summary) continue;
      devices.push(summary);
      for (const r of summary.results || []) if (r.status === "fail") failures.add(r.title);
    }
  }
  return {
    platform,
    skipped: false,
    ok: status.EXIT === "0" && devices.length > 0,
    devices,
    failures: [...failures],
  };
}

function formatBlock(entry) {
  const name = entry.platform === "android" ? "Android" : "iOS";
  if (entry.skipped) return `${name}: skipped (no build URL provided)`;
  const lines = [`${name}: ${entry.ok ? "PASS ✅" : "FAIL ❌"}`];
  if (entry.devices.length === 0) lines.push("  • no summaries — the test step likely crashed before running");
  for (const d of entry.devices) {
    lines.push(`  • ${d.passed}/${d.total} passed${d.failed ? `, ${d.failed} failed` : ""}${d.skipped ? `, ${d.skipped} skipped` : ""}${d.abortReason ? ` — aborted: ${d.abortReason}` : ""}  ${d.sessionUrl || ""}`);
  }
  if (entry.failures.length) lines.push(`  Failed: ${entry.failures.slice(0, 10).join("; ")}${entry.failures.length > 10 ? ` (+${entry.failures.length - 10} more)` : ""}`);
  return lines.join("\n");
}

function main() {
  const entries = PLATFORMS.map(collect).filter(Boolean);
  if (entries.length === 0) {
    console.error("No test-status/*.env files found — did the test steps run?");
    process.exitCode = 1;
    return;
  }

  const ran = entries.filter((e) => !e.skipped);
  const allOk = ran.length > 0 && ran.every((e) => e.ok);
  const label = process.env.E2E_RUN_LABEL || "E2E";

  console.log("\n" + "═".repeat(60));
  console.log(`  ${label} — ${allOk ? "PASSED ✅" : "FAILED ❌"}`);
  console.log("═".repeat(60));
  for (const entry of entries) console.log(formatBlock(entry));
  console.log("═".repeat(60) + "\n");

  if (!allOk) {
    const failed = ran.filter((e) => !e.ok).map((e) => e.platform).join(", ") || "none ran";
    console.error(`Pipeline FAILED — platform(s) with failures: ${failed}`);
    process.exitCode = 1;
  }
}

main();
