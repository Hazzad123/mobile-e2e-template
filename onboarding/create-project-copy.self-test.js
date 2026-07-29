"use strict";

const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");

const root = path.resolve(__dirname, "..");
const script = path.join(root, "onboarding", "create-project-copy.js");
const sourceMarkerPath = path.join(root, "template-state.json");

function run(args, cwd = root) {
  return spawnSync(process.execPath, [script, ...args], {
    cwd,
    encoding: "utf8",
    env: { ...process.env },
  });
}

function runWithUmask(args, mask) {
  const previousMask = process.umask(mask);
  try {
    return run(args);
  } finally {
    process.umask(previousMask);
  }
}

function parseJsonOutput(result, stream = "stdout") {
  const value = result[stream].trim();
  assert.ok(value, `Expected JSON on ${stream}; stderr was: ${result.stderr}`);
  return JSON.parse(value);
}

function gitStatus() {
  const result = spawnSync("git", ["status", "--porcelain"], {
    cwd: root,
    encoding: "utf8",
  });
  assert.strictEqual(result.status, 0, result.stderr);
  return result.stdout;
}

function collectFiles(directory, prefix = "", result = []) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name;
    const absolutePath = path.join(directory, entry.name);
    const stat = fs.lstatSync(absolutePath);
    assert.ok(!stat.isSymbolicLink(), `Unexpected symlink in copy: ${relativePath}`);
    if (stat.isDirectory()) {
      assert.strictEqual(
        stat.mode & 0o777,
        0o755,
        `Unexpected directory mode in copy: ${relativePath}`,
      );
      collectFiles(absolutePath, relativePath, result);
    } else {
      assert.ok(stat.isFile(), `Unexpected special file in copy: ${relativePath}`);
      result.push(relativePath);
    }
  }
  return result;
}

const currentMarkerText = fs.readFileSync(sourceMarkerPath, "utf8");
const currentMarker = JSON.parse(currentMarkerText);

if (currentMarker.workspaceRole === "project-copy") {
  const guardRoot = fs.mkdtempSync(path.join(os.tmpdir(), "mobile-e2e-copy-guard-"));
  try {
    const guardedDestination = path.join(guardRoot, "must-not-be-created");
    const guardedResult = run([
      "--name",
      "Nested copy",
      "--destination",
      guardedDestination,
      "--json",
    ]);
    assert.notStrictEqual(guardedResult.status, 0);
    const error = parseJsonOutput(guardedResult, "stderr");
    assert.match(error.error, /only runs from the untouched source template/);
    assert.strictEqual(fs.existsSync(guardedDestination), false);
    assert.strictEqual(
      fs.readFileSync(sourceMarkerPath, "utf8"),
      currentMarkerText,
    );
    console.log("Project-copy guard self-test passed");
  } finally {
    fs.rmSync(guardRoot, { recursive: true, force: true });
  }
} else {
  assert.strictEqual(
    currentMarker.workspaceRole,
    "source-template",
    "Self-test requires a recognised workspace role",
  );
  const initialStatus = gitStatus();
  const sourceMarkerBefore = fs.readFileSync(sourceMarkerPath, "utf8");
  const temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), "mobile-e2e-copy-test-"));

  try {
  const destination = path.join(temporaryRoot, "Example App automation");
  const baseArgs = [
    "--name",
    "Example App",
    "--destination",
    destination,
    "--json",
  ];

  const preview = run([...baseArgs, "--dry-run"]);
  assert.strictEqual(preview.status, 0, preview.stderr);
  const previewJson = parseJsonOutput(preview);
  assert.strictEqual(previewJson.action, "preview");
  assert.strictEqual(previewJson.workspaceRole, "project-copy");
  assert.strictEqual(fs.existsSync(destination), false, "Dry-run created the destination");

  const created = run(baseArgs);
  assert.strictEqual(created.status, 0, created.stderr);
  const createdJson = parseJsonOutput(created);
  assert.strictEqual(createdJson.action, "created");
  assert.strictEqual(createdJson.gitInitialised, false);

  for (const relativePath of [
    "CLAUDE.md",
    "android/.env.template",
    "ios/.env.template",
    "onboarding/create-project-copy.js",
    "app-map/PROJECT-SETUP.md",
    "template-state.json",
  ]) {
    assert.ok(fs.existsSync(path.join(destination, relativePath)), `Missing ${relativePath}`);
  }

  const marker = JSON.parse(
    fs.readFileSync(path.join(destination, "template-state.json"), "utf8"),
  );
  assert.strictEqual(marker.workspaceRole, "project-copy");
  assert.strictEqual(marker.projectName, "Example App");
  const setup = fs.readFileSync(
    path.join(destination, "app-map", "PROJECT-SETUP.md"),
    "utf8",
  );
  assert.match(setup, /- Workspace role: project-copy/);
  assert.match(setup, /- Project name: Example App/);
  assert.match(setup, /- Working-copy folder: `Example App automation`/);
  assert.match(setup, /- Git initialisation: not performed by copier/);
  assert.ok(
    !setup.includes(path.dirname(destination)),
    "Project setup record leaked an absolute local path",
  );

  const manifest = JSON.parse(
    fs.readFileSync(path.join(root, "onboarding", "copy-manifest.json"), "utf8"),
  );
  const expectedInventory = [
    ...manifest.files,
    "app-map/PROJECT-SETUP.md",
  ].sort();
  assert.strictEqual(fs.statSync(destination).mode & 0o777, 0o755);
  assert.deepStrictEqual(collectFiles(destination).sort(), expectedInventory);
  for (const relativePath of manifest.files) {
    if (relativePath === "template-state.json") continue;
    const sourcePath = path.join(root, ...relativePath.split("/"));
    const copiedPath = path.join(destination, ...relativePath.split("/"));
    assert.ok(
      fs.readFileSync(sourcePath).equals(fs.readFileSync(copiedPath)),
      `Copied bytes differ for ${relativePath}`,
    );
    const sourceExecutable = Boolean(fs.statSync(sourcePath).mode & 0o111);
    assert.strictEqual(
      fs.statSync(copiedPath).mode & 0o777,
      sourceExecutable ? 0o755 : 0o644,
      `Unexpected copied mode for ${relativePath}`,
    );
  }
  assert.strictEqual(
    fs.statSync(path.join(destination, "template-state.json")).mode & 0o777,
    0o644,
  );
  assert.strictEqual(
    fs.statSync(path.join(destination, "app-map", "PROJECT-SETUP.md")).mode & 0o777,
    0o644,
  );

  const restrictiveDestination = path.join(temporaryRoot, "Restrictive umask copy");
  const restrictiveCopy = runWithUmask([
    "--name",
    "Restrictive App",
    "--destination",
    restrictiveDestination,
    "--json",
  ], 0o077);
  assert.strictEqual(restrictiveCopy.status, 0, restrictiveCopy.stderr);
  assert.strictEqual(fs.statSync(restrictiveDestination).mode & 0o777, 0o755);
  assert.deepStrictEqual(
    collectFiles(restrictiveDestination).sort(),
    expectedInventory,
  );
  assert.strictEqual(
    fs.statSync(path.join(restrictiveDestination, "template-state.json")).mode & 0o777,
    0o644,
  );
  assert.strictEqual(
    fs.statSync(
      path.join(restrictiveDestination, "app-map", "PROJECT-SETUP.md"),
    ).mode & 0o777,
    0o644,
  );

  const copiedChecker = spawnSync(process.execPath, [
    path.join(destination, "onboarding", "check-prerequisites.js"),
    "--platform",
    "core",
    "--json",
  ], { cwd: destination, encoding: "utf8" });
  assert.strictEqual(copiedChecker.status, 0, copiedChecker.stderr);
  const copiedReadiness = JSON.parse(copiedChecker.stdout);
  assert.ok(
    copiedReadiness.results.some(
      (item) => item.name === "Workspace role"
        && item.detail === "This folder is marked project-copy.",
    ),
  );

  for (const relativePath of [
    ".git",
    ".DS_Store",
    "android/node_modules",
    "ios/node_modules",
    "android/.env",
    "ios/.env",
    "app-binary",
    "app-meta",
    "test-status",
  ]) {
    assert.strictEqual(
      fs.existsSync(path.join(destination, relativePath)),
      false,
      `Excluded path was copied: ${relativePath}`,
    );
  }
  assert.deepStrictEqual(
    fs.readdirSync(path.join(destination, "app-under-test")),
    ["README.md"],
  );
  assert.deepStrictEqual(
    fs.readdirSync(path.join(destination, "testrail-import")),
    ["README.md"],
  );

  for (const relativeScript of [
    "onboarding/check-prerequisites.self-test.js",
    "onboarding/create-project-copy.self-test.js",
    "ci/workflow.self-test.js",
  ]) {
    const copiedSelfTest = spawnSync(
      process.execPath,
      [path.join(destination, relativeScript)],
      { cwd: destination, encoding: "utf8" },
    );
    assert.strictEqual(
      copiedSelfTest.status,
      0,
      `${relativeScript} failed in the project copy:\n${copiedSelfTest.stderr}`,
    );
  }

  function makeSourceFixture(name) {
    const fixtureRoot = path.join(temporaryRoot, name);
    fs.cpSync(destination, fixtureRoot, {
      recursive: true,
      errorOnExist: true,
      force: false,
    });
    fs.writeFileSync(
      path.join(fixtureRoot, "template-state.json"),
      `${JSON.stringify({
        schemaVersion: 1,
        templateId: "mobile-e2e-template",
        workspaceRole: "source-template",
      }, null, 2)}\n`,
    );
    return fixtureRoot;
  }

  function runFixture(fixtureRoot, outputName) {
    return spawnSync(process.execPath, [
      path.join(fixtureRoot, "onboarding", "create-project-copy.js"),
      "--name",
      "Fixture App",
      "--destination",
      path.join(temporaryRoot, outputName),
      "--dry-run",
      "--json",
    ], { cwd: fixtureRoot, encoding: "utf8" });
  }

  const missingFixture = makeSourceFixture("missing-manifest-file-fixture");
  fs.unlinkSync(path.join(missingFixture, "CLAUDE.md"));
  const missingManifestFile = runFixture(missingFixture, "missing-file-output");
  assert.notStrictEqual(missingManifestFile.status, 0);
  assert.match(missingManifestFile.stderr, /Manifest entry must be a regular file: CLAUDE\.md/);
  assert.strictEqual(fs.existsSync(path.join(temporaryRoot, "missing-file-output")), false);

  const forbiddenFixture = makeSourceFixture("forbidden-manifest-fixture");
  const forbiddenSecret = "DO_NOT_COPY_FIXTURE_SECRET_64f4";
  fs.writeFileSync(path.join(forbiddenFixture, "android", ".env"), forbiddenSecret);
  const forbiddenManifestPath = path.join(
    forbiddenFixture,
    "onboarding",
    "copy-manifest.json",
  );
  const forbiddenManifest = JSON.parse(fs.readFileSync(forbiddenManifestPath, "utf8"));
  forbiddenManifest.files.push("android/.env");
  forbiddenManifest.files.sort();
  fs.writeFileSync(
    forbiddenManifestPath,
    `${JSON.stringify(forbiddenManifest, null, 2)}\n`,
  );
  const forbiddenEntry = runFixture(forbiddenFixture, "forbidden-output");
  assert.notStrictEqual(forbiddenEntry.status, 0);
  assert.match(forbiddenEntry.stderr, /Forbidden copy manifest entry/);
  assert.ok(!forbiddenEntry.stderr.includes(forbiddenSecret));
  assert.strictEqual(fs.existsSync(path.join(temporaryRoot, "forbidden-output")), false);

  const setupFixture = makeSourceFixture("invalid-setup-template-fixture");
  const setupTemplatePath = path.join(
    setupFixture,
    "onboarding",
    "PROJECT-SETUP-TEMPLATE.md",
  );
  fs.writeFileSync(
    setupTemplatePath,
    fs.readFileSync(setupTemplatePath, "utf8").replace(
      "- Workspace role:",
      "- Workspace role field removed",
    ),
  );
  const invalidSetupTemplate = runFixture(setupFixture, "invalid-setup-output");
  assert.notStrictEqual(invalidSetupTemplate.status, 0);
  assert.match(invalidSetupTemplate.stderr, /Project setup template is missing required line/);
  assert.strictEqual(fs.existsSync(path.join(temporaryRoot, "invalid-setup-output")), false);

  const parentSymlinkFixture = makeSourceFixture("parent-symlink-fixture");
  const externalLib = path.join(temporaryRoot, "external-android-lib");
  fs.renameSync(path.join(parentSymlinkFixture, "android", "lib"), externalLib);
  try {
    fs.symlinkSync(externalLib, path.join(parentSymlinkFixture, "android", "lib"), "dir");
    const symlinkedManifestParent = runFixture(
      parentSymlinkFixture,
      "parent-symlink-output",
    );
    assert.notStrictEqual(symlinkedManifestParent.status, 0);
    assert.match(symlinkedManifestParent.stderr, /must not pass through a symbolic link/);
    assert.strictEqual(
      fs.existsSync(path.join(temporaryRoot, "parent-symlink-output")),
      false,
    );
  } catch (error) {
    if (!["EPERM", "EACCES", "ENOSYS"].includes(error.code)) throw error;
  }

  const existingSentinel = path.join(destination, "do-not-overwrite.txt");
  fs.writeFileSync(existingSentinel, "preserve me\n");
  const existing = run(baseArgs);
  assert.notStrictEqual(existing.status, 0);
  assert.strictEqual(fs.readFileSync(existingSentinel, "utf8"), "preserve me\n");

  const existingFile = path.join(temporaryRoot, "existing-file");
  fs.writeFileSync(existingFile, "preserve me\n");
  const existingFileResult = run([
    "--name",
    "Existing file",
    "--destination",
    existingFile,
    "--json",
  ]);
  assert.notStrictEqual(existingFileResult.status, 0);
  assert.strictEqual(fs.readFileSync(existingFile, "utf8"), "preserve me\n");

  const insideSource = path.join(root, `.copy-self-test-${process.pid}`);
  const nested = run([
    "--name",
    "Unsafe",
    "--destination",
    insideSource,
    "--dry-run",
    "--json",
  ]);
  assert.notStrictEqual(nested.status, 0);
  assert.strictEqual(fs.existsSync(insideSource), false);

  const sourceSymlink = path.join(temporaryRoot, "source-template-link");
  try {
    fs.symlinkSync(root, sourceSymlink, "dir");
    const throughSymlink = path.join(sourceSymlink, `unsafe-copy-${process.pid}`);
    const symlinkedParent = run([
      "--name",
      "Unsafe symlink",
      "--destination",
      throughSymlink,
      "--dry-run",
      "--json",
    ]);
    assert.notStrictEqual(symlinkedParent.status, 0);
    assert.strictEqual(fs.existsSync(path.join(root, `unsafe-copy-${process.pid}`)), false);
  } catch (error) {
    if (!["EPERM", "EACCES", "ENOSYS"].includes(error.code)) throw error;
  }

  const relative = run([
    "--name",
    "Relative",
    "--destination",
    "relative-copy",
    "--json",
  ], temporaryRoot);
  assert.strictEqual(relative.status, 2);
  assert.strictEqual(fs.existsSync(path.join(temporaryRoot, "relative-copy")), false);

  const duplicate = run([
    "--name",
    "One",
    "--name",
    "Two",
    "--destination",
    path.join(temporaryRoot, "duplicate"),
    "--json",
  ]);
  assert.strictEqual(duplicate.status, 2);

  const missingParent = run([
    "--name",
    "Missing parent",
    "--destination",
    path.join(temporaryRoot, "does-not-exist", "copy"),
    "--json",
  ]);
  assert.strictEqual(missingParent.status, 2);
  assert.strictEqual(fs.existsSync(path.join(temporaryRoot, "does-not-exist")), false);

  const unknown = run(["--unknown", "--json"]);
  assert.strictEqual(unknown.status, 2);

  const controlCharacter = run([
    "--name",
    "Control",
    "--destination",
    `${path.join(temporaryRoot, "control")}\npath`,
    "--json",
  ]);
  assert.strictEqual(controlCharacter.status, 2);

  const copiedScript = path.join(destination, "onboarding", "create-project-copy.js");
  const copiedAttempt = spawnSync(process.execPath, [
    copiedScript,
    "--name",
    "Nested project",
    "--destination",
    path.join(temporaryRoot, "nested-project"),
    "--json",
  ], { cwd: destination, encoding: "utf8" });
  assert.notStrictEqual(copiedAttempt.status, 0);
  assert.strictEqual(fs.existsSync(path.join(temporaryRoot, "nested-project")), false);

  assert.strictEqual(fs.readFileSync(sourceMarkerPath, "utf8"), sourceMarkerBefore);
  assert.strictEqual(gitStatus(), initialStatus, "Source worktree changed during self-test");
    console.log("Project-copy self-test passed");
  } finally {
    fs.rmSync(temporaryRoot, { recursive: true, force: true });
  }
}
