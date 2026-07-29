"use strict";

const assert = require("assert");
const path = require("path");
const { spawnSync } = require("child_process");

const root = path.resolve(__dirname, "..");
const checker = path.join(__dirname, "check-prerequisites.js");
const sentinelSecret = "DO_NOT_PRINT_THIS_SECRET_7f3b";
const expectedWorkspaceRole = JSON.parse(
  require("fs").readFileSync(path.join(root, "template-state.json"), "utf8"),
).workspaceRole;

function run(args, extraEnv = {}) {
  return spawnSync(process.execPath, [checker, ...args], {
    cwd: root,
    encoding: "utf8",
    env: { ...process.env, ...extraEnv },
    maxBuffer: 1024 * 1024,
    timeout: 15_000,
  });
}

const statusBefore = spawnSync("git", ["status", "--porcelain"], {
  cwd: root,
  encoding: "utf8",
}).stdout;

const core = run(
  ["--platform", "core", "--json"],
  { BROWSERSTACK_ACCESS_KEY: sentinelSecret, TESTRAIL_API_KEY: sentinelSecret },
);
assert.strictEqual(core.status, 0, core.stderr || "Core prerequisite check failed");
assert.ok(!core.stdout.includes(sentinelSecret), "Checker leaked a sentinel secret");

const parsed = JSON.parse(core.stdout);
assert.strictEqual(parsed.summary.platform, "core");
assert.deepStrictEqual(parsed.summary.checkedPlatforms, []);
assert.ok(parsed.results.some((item) => item.name === "Node.js"));
assert.ok(parsed.results.some((item) => item.name === "Template structure"));
assert.ok(
  parsed.results.some(
    (item) => item.name === "Workspace role"
      && item.detail === `This folder is marked ${expectedWorkspaceRole}.`,
  ),
);

const invalid = run(["--platform", "windows-phone"]);
assert.strictEqual(invalid.status, 2, "Invalid platform should return exit code 2");

const statusAfter = spawnSync("git", ["status", "--porcelain"], {
  cwd: root,
  encoding: "utf8",
}).stdout;
assert.strictEqual(
  statusAfter,
  statusBefore,
  "Prerequisite checker changed the repository",
);

console.log("Beginner prerequisite checker self-test passed");
