#!/usr/bin/env node

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const {
  deviceLabelFromId,
  formatPlatformBlock,
  stripSuitePrefix,
} = require("./report");

assert.strictEqual(
  deviceLabelFromId("android-16-0-google-pixel-10", "android"),
  "Google Pixel 10 / Android 16.0",
);
assert.strictEqual(
  deviceLabelFromId("ios-18-0-iphone-16", "ios"),
  "iPhone 16 / iOS 18.0",
);
assert.strictEqual(
  stripSuitePrefix("Example App E2E (Android) C123 User can launch"),
  "C123 User can launch",
);

for (const fixture of [
  "summary-android-16-0-google-pixel-10.json",
  "summary-ios-18-0-iphone-16.json",
]) {
  const parsed = JSON.parse(fs.readFileSync(path.join(__dirname, "fixtures", fixture), "utf8"));
  assert.ok(["PASSED", "FAILED"].includes(parsed.status));
  assert.strictEqual(parsed.results.length, parsed.total);
}

const block = formatPlatformBlock({
  platform: "android",
  skipped: false,
  ok: true,
  meta: null,
  devices: [{ label: "Example Device / Android 16.0", passed: 2, total: 2, failed: 0, skipped: 0 }],
  failureTitles: [],
});
assert.ok(block.includes("Android — PASS"));
assert.ok(block.includes("2/2 passed"));

console.log("CI report self-test passed");
