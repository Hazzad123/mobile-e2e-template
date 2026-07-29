#!/usr/bin/env node
// Prints a combined Android + iOS run summary to the pipeline log and sets the
// pipeline's final verdict: exits non-zero if any platform that was expected to
// run failed.
//
// The test steps in bitbucket-pipelines.yml never fail their own step (so this
// step always runs); each writes test-status/<platform>.env containing
// EXIT=<code|skipped>. This step is where a red pipeline comes from.
//
// Reads (all optional per platform, relative to repo root):
//   test-status/<platform>.env          EXIT=0 | EXIT=1 | EXIT=skipped
//   <platform>/test-results/summary-<device-id>.json
//   app-meta/<platform>.json            version metadata from fetch-firebase-release.js
//
// Env: E2E_RUN_LABEL, BITBUCKET_GIT_HTTP_ORIGIN, BITBUCKET_BUILD_NUMBER

const fs = require("fs");
const path = require("path");

const PLATFORMS = ["android", "ios"];
const MAX_FAILURE_TITLES = 10;

function readEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return null;
  const entries = {};
  for (const line of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const idx = line.indexOf("=");
    if (idx > 0) entries[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
  }
  return entries;
}

function readJsonIfExists(filePath) {
  return fs.existsSync(filePath) ? JSON.parse(fs.readFileSync(filePath, "utf8")) : null;
}

// summary filenames embed lib/devices.js ids, e.g. "android-16-0-google-pixel-10"
// or "ios-26-0-iphone-17": <platform>-<major>-<minor>-<device words>.
function deviceLabelFromId(id, platform) {
  const rest = id.replace(new RegExp(`^${platform}-`), "");
  const match = rest.match(/^(\d+)-(\d+)-(.+)$/);
  if (!match) return id;
  const os = `${match[1]}.${match[2]}`;
  const device = match[3].split("-")
    .map((word) => {
      if (word === "iphone") return "iPhone";
      if (word === "ipad") return "iPad";
      return word[0].toUpperCase() + word.slice(1);
    })
    .join(" ");
  const osName = platform === "android" ? "Android" : "iOS";
  return `${device} / ${osName} ${os}`;
}

function stripSuitePrefix(title) {
  return title.replace(/^.*?\sE2E\s\((Android|iOS)\)\s*/, "");
}

function collectPlatform(platform) {
  const status = readEnvFile(path.join("test-status", `${platform}.env`));
  if (!status) return null; // platform step never ran (not part of this pipeline)
  if (status.EXIT === "skipped") return { platform, skipped: true };

  const meta = readJsonIfExists(path.join("app-meta", `${platform}.json`));
  const resultsDir = path.join(platform, "test-results");
  const devices = [];
  const failureTitles = [];

  if (fs.existsSync(resultsDir)) {
    for (const file of fs.readdirSync(resultsDir).sort()) {
      const match = file.match(/^summary-(.+)\.json$/);
      if (!match) continue;
      const summary = readJsonIfExists(path.join(resultsDir, file));
      if (!summary) continue;
      devices.push({ label: deviceLabelFromId(match[1], platform), ...summary });
      for (const result of summary.results || []) {
        if (result.status === "fail") failureTitles.push(stripSuitePrefix(result.title));
      }
    }
  }

  return {
    platform,
    skipped: false,
    ok: status.EXIT === "0"
      && devices.length > 0
      && devices.every((device) => (
        device.status === "PASSED"
        && Number(device.failed || 0) === 0
        && !device.abortReason
      )),
    exit: status.EXIT,
    meta,
    devices,
    failureTitles: [...new Set(failureTitles)],
  };
}

function formatPlatformBlock(entry) {
  const name = entry.platform === "android" ? "Android" : "iOS";
  if (entry.skipped) return `${name} — skipped (no build URL provided)`;

  const version = entry.meta?.displayVersion
    ? `${entry.meta.displayVersion} (${entry.meta.buildVersion})`
    : entry.meta?.bsAppUrl || "pre-uploaded build";
  const lines = [`${name} — ${entry.ok ? "PASS" : "FAIL"} — app ${version}`];

  if (entry.devices.length === 0) {
    lines.push("  • no test summaries produced — the test step likely crashed before running");
  }
  for (const device of entry.devices) {
    const counts = `${device.passed}/${device.total} passed`
      + (device.failed ? `, ${device.failed} failed` : "")
      + (device.skipped ? `, ${device.skipped} skipped` : "");
    lines.push(`  • ${device.label} — ${counts}${device.abortReason ? ` — aborted: ${device.abortReason}` : ""}`);
  }
  if (entry.failureTitles.length > 0) {
    const shown = entry.failureTitles.slice(0, MAX_FAILURE_TITLES);
    const more = entry.failureTitles.length - shown.length;
    lines.push(`  Failed: ${shown.join("; ")}${more > 0 ? ` (+${more} more)` : ""}`);
  }
  return lines.join("\n");
}

async function main() {
  const entries = PLATFORMS.map(collectPlatform).filter(Boolean);

  if (entries.length === 0) {
    throw new Error("No test-status/*.env files found — did the test steps run?");
  }

  const ran = entries.filter((entry) => !entry.skipped);
  const allOk = ran.length > 0 && ran.every((entry) => entry.ok);
  const label = process.env.E2E_RUN_LABEL || "E2E";
  const buildNumber = process.env.BITBUCKET_BUILD_NUMBER;
  const pipelineUrl = process.env.BITBUCKET_GIT_HTTP_ORIGIN && buildNumber
    ? `${process.env.BITBUCKET_GIT_HTTP_ORIGIN}/pipelines/results/${buildNumber}`
    : null;
  const monthlyPlan = new Date().toLocaleDateString("en-GB", {
    month: "long", year: "numeric", timeZone: "Europe/London",
  });

  const appName = process.env.APP_DISPLAY_NAME || "Mobile App";
  const header = `${appName} ${label} — ${allOk ? "PASSED" : "FAILED"}${buildNumber ? ` (build #${buildNumber})` : ""}`;
  const footerParts = [];
  if (pipelineUrl) footerParts.push(`Pipeline: ${pipelineUrl}`);
  footerParts.push(`TestRail plan "${process.env.TESTRAIL_PLAN_PREFIX || "Mobile E2E"} ${monthlyPlan}"`);

  const text = [header, "", ...entries.map(formatPlatformBlock), "", footerParts.join("  |  ")].join("\n");

  console.log("────────────────────────────── RUN SUMMARY ──────────────────────────────");
  console.log(text);
  console.log("──────────────────────────────────────────────────────────────────────────");

  if (!allOk) {
    const failed = ran.filter((entry) => !entry.ok).map((entry) => entry.platform).join(", ");
    console.error(`Marking pipeline failed — platform(s) with failures: ${failed || "none ran"}`);
    process.exitCode = 1;
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}

module.exports = {
  collectPlatform,
  deviceLabelFromId,
  formatPlatformBlock,
  readEnvFile,
  readJsonIfExists,
  stripSuitePrefix,
};
