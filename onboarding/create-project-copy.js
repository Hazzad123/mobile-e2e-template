"use strict";

const fs = require("fs");
const path = require("path");

const SOURCE_ROOT = path.resolve(__dirname, "..");
const MARKER_PATH = "template-state.json";
const MANIFEST_PATH = "onboarding/copy-manifest.json";
const SETUP_TEMPLATE_PATH = "onboarding/PROJECT-SETUP-TEMPLATE.md";
const GENERATED_SETUP_PATH = "app-map/PROJECT-SETUP.md";
const TEMPLATE_ID = "mobile-e2e-template";

class CopyError extends Error {
  constructor(message, exitCode = 1) {
    super(message);
    this.name = "CopyError";
    this.exitCode = exitCode;
  }
}

function usage() {
  return [
    "Create an isolated project copy of this source template.",
    "",
    "Usage:",
    "  node onboarding/create-project-copy.js \\",
    '    --name "Example App" \\',
    '    --destination "/absolute/path/example-app-automation" [--dry-run] [--json]',
    "",
    "The destination must not already exist. Git history, installed packages,",
    "filled .env files, app inputs, TestRail imports, and generated evidence are not copied.",
  ].join("\n");
}

function parseArguments(argv) {
  const options = {
    name: null,
    destination: null,
    dryRun: false,
    json: false,
    help: false,
  };
  const seen = new Set();

  for (let index = 0; index < argv.length; index++) {
    const argument = argv[index];

    if (argument === "--dry-run" || argument === "--json" || argument === "--help") {
      const key = argument.slice(2);
      if (seen.has(key)) {
        throw new CopyError(`Duplicate option: ${argument}`, 2);
      }
      seen.add(key);
      options[key === "dry-run" ? "dryRun" : key] = true;
      continue;
    }

    let key;
    let value;
    if (argument === "--name" || argument === "--destination") {
      key = argument.slice(2);
      if (index + 1 >= argv.length || argv[index + 1].startsWith("--")) {
        throw new CopyError(`Missing value for ${argument}`, 2);
      }
      value = argv[++index];
    } else if (argument.startsWith("--name=")) {
      key = "name";
      value = argument.slice("--name=".length);
    } else if (argument.startsWith("--destination=")) {
      key = "destination";
      value = argument.slice("--destination=".length);
    } else {
      throw new CopyError(`Unknown option: ${argument}`, 2);
    }

    if (seen.has(key)) {
      throw new CopyError(`Duplicate option: --${key}`, 2);
    }
    seen.add(key);
    options[key] = value;
  }

  if (options.help) return options;
  if (typeof options.name !== "string" || !options.name.trim()) {
    throw new CopyError("--name is required and must not be blank.", 2);
  }
  options.name = options.name.trim();
  if (options.name.length > 120 || /[\u0000-\u001f\u007f]/u.test(options.name)) {
    throw new CopyError("--name must be at most 120 characters with no control characters.", 2);
  }
  if (typeof options.destination !== "string" || !options.destination.trim()) {
    throw new CopyError("--destination is required.", 2);
  }
  if (/[\u0000-\u001f\u007f]/u.test(options.destination)) {
    throw new CopyError("--destination must not contain control characters.", 2);
  }
  if (!path.isAbsolute(options.destination)) {
    throw new CopyError("--destination must be an absolute path.", 2);
  }
  options.destination = path.normalize(options.destination);
  return options;
}

function lstatIfPresent(filePath) {
  try {
    return fs.lstatSync(filePath);
  } catch (error) {
    if (error.code === "ENOENT") return null;
    throw error;
  }
}

function isSameOrInside(parentPath, candidatePath) {
  const relative = path.relative(parentPath, candidatePath);
  return relative === "" || (
    relative !== ".."
    && !relative.startsWith(`..${path.sep}`)
    && !path.isAbsolute(relative)
  );
}

function validateDestination(destination, canonicalSourceRoot) {
  const destinationStat = lstatIfPresent(destination);
  if (destinationStat) {
    throw new CopyError(`Destination already exists; nothing was changed: ${destination}`);
  }

  const parent = path.dirname(destination);
  const parentStat = lstatIfPresent(parent);
  if (!parentStat) {
    throw new CopyError(`Destination parent does not exist: ${parent}`, 2);
  }
  let canonicalParent;
  try {
    canonicalParent = fs.realpathSync(parent);
  } catch {
    throw new CopyError(`Destination parent cannot be resolved safely: ${parent}`, 2);
  }
  if (!fs.statSync(canonicalParent).isDirectory()) {
    throw new CopyError(`Destination parent is not a directory: ${parent}`, 2);
  }

  const canonicalCandidate = path.join(canonicalParent, path.basename(destination));
  if (isSameOrInside(canonicalSourceRoot, canonicalCandidate)) {
    throw new CopyError("The working copy cannot be created inside the source template.");
  }
  if (path.parse(destination).root === destination) {
    throw new CopyError("The filesystem root cannot be used as the destination.", 2);
  }

  return { parent, canonicalCandidate };
}

function readJsonRegularFile(absolutePath, label) {
  const stat = lstatIfPresent(absolutePath);
  if (!stat || !stat.isFile() || stat.isSymbolicLink()) {
    throw new CopyError(`${label} must be a regular file: ${absolutePath}`);
  }
  try {
    return JSON.parse(fs.readFileSync(absolutePath, "utf8"));
  } catch {
    throw new CopyError(`${label} is not valid JSON: ${absolutePath}`);
  }
}

function assertRegularPathWithoutSymlinks(root, relativePath, label) {
  let currentPath = root;
  const segments = relativePath.split("/");
  for (let index = 0; index < segments.length; index++) {
    currentPath = path.join(currentPath, segments[index]);
    const stat = lstatIfPresent(currentPath);
    if (!stat) {
      throw new CopyError(`${label} must be a regular file: ${currentPath}`);
    }
    if (stat.isSymbolicLink()) {
      throw new CopyError(`${label} must not pass through a symbolic link: ${relativePath}`);
    }
    if (index < segments.length - 1 && !stat.isDirectory()) {
      throw new CopyError(`${label} parent must be a directory: ${relativePath}`);
    }
    if (index === segments.length - 1 && !stat.isFile()) {
      throw new CopyError(`${label} must be a regular file: ${currentPath}`);
    }
  }
}

function validateSetupTemplate(template) {
  for (const requiredLine of [
    "- Workspace role:",
    "- Project name:",
    "- Working-copy folder:",
    "- Created:",
    "- Copy method:",
    "- App name:",
  ]) {
    if (!template.split("\n").includes(requiredLine)) {
      throw new CopyError(`Project setup template is missing required line: ${requiredLine}`);
    }
  }
}

function forbiddenManifestReason(relativePath) {
  const segments = relativePath.split("/");
  const basename = segments.at(-1);
  const forbiddenDirectories = new Set([
    ".git",
    ".hg",
    ".svn",
    ".idea",
    ".vscode",
    "node_modules",
    "app-binary",
    "app-meta",
    "test-status",
    "test-results",
    "screenshots",
    "logs",
    "log",
    "coverage",
    "allure-results",
    "allure-report",
  ]);
  const forbiddenFiles = new Set([
    ".DS_Store",
    ".npmrc",
    ".netrc",
    "google-services.json",
    "GoogleService-Info.plist",
  ]);
  const forbiddenExtensions = new Set([
    ".apk",
    ".aab",
    ".ipa",
    ".xcarchive",
    ".keystore",
    ".jks",
    ".key",
    ".pem",
    ".p12",
    ".mobileprovision",
    ".cer",
    ".crt",
    ".log",
    ".xml",
    ".csv",
    ".png",
    ".jpg",
    ".jpeg",
  ]);

  if (segments.some((segment) => forbiddenDirectories.has(segment))) {
    return "contains a forbidden generated, dependency, editor, or VCS directory";
  }
  if (forbiddenFiles.has(basename)) {
    return "is a credential, machine-local, or service configuration file";
  }
  if (basename === ".env" || (basename.startsWith(".env.") && basename !== ".env.template")) {
    return "is a filled or machine-local environment file";
  }
  if (
    segments[0] === "app-under-test"
    && relativePath !== "app-under-test/README.md"
  ) {
    return "contains app-under-test project material";
  }
  if (
    segments[0] === "testrail-import"
    && relativePath !== "testrail-import/README.md"
  ) {
    return "contains a TestRail import";
  }
  if (forbiddenExtensions.has(path.posix.extname(basename).toLowerCase())) {
    return "has a forbidden binary, credential, import, or evidence extension";
  }
  return null;
}

function validateSource() {
  const canonicalSourceRoot = fs.realpathSync(SOURCE_ROOT);
  const marker = readJsonRegularFile(
    path.join(canonicalSourceRoot, MARKER_PATH),
    "Workspace marker",
  );

  if (
    marker.schemaVersion !== 1
    || marker.templateId !== TEMPLATE_ID
    || marker.workspaceRole !== "source-template"
  ) {
    throw new CopyError(
      "This command only runs from the untouched source template "
      + "(template-state.json must say source-template).",
    );
  }

  assertRegularPathWithoutSymlinks(canonicalSourceRoot, MANIFEST_PATH, "Copy manifest");
  const manifest = readJsonRegularFile(path.join(canonicalSourceRoot, MANIFEST_PATH), "Copy manifest");
  if (manifest.schemaVersion !== 1 || !Array.isArray(manifest.files)) {
    throw new CopyError("Copy manifest must use schemaVersion 1 and contain a files array.");
  }

  const sorted = [...manifest.files].sort();
  if (
    new Set(manifest.files).size !== manifest.files.length
    || sorted.some((entry, index) => entry !== manifest.files[index])
  ) {
    throw new CopyError("Copy manifest paths must be unique and sorted.");
  }
  if (!manifest.files.includes(MARKER_PATH) || !manifest.files.includes(MANIFEST_PATH)) {
    throw new CopyError("Copy manifest must include its marker and itself.");
  }

  const files = manifest.files.map((relativePath) => {
    const pathSegments = typeof relativePath === "string"
      ? relativePath.split("/")
      : [];
    if (
      typeof relativePath !== "string"
      || !relativePath
      || /[\u0000-\u001f\u007f]/u.test(relativePath)
      || relativePath.includes("\\")
      || path.posix.isAbsolute(relativePath)
      || pathSegments.some((segment) => !segment || segment === "." || segment === "..")
    ) {
      throw new CopyError(`Unsafe path in copy manifest: ${String(relativePath)}`);
    }
    const forbiddenReason = forbiddenManifestReason(relativePath);
    if (forbiddenReason) {
      throw new CopyError(`Forbidden copy manifest entry (${forbiddenReason}): ${relativePath}`);
    }

    const absolutePath = path.resolve(canonicalSourceRoot, ...relativePath.split("/"));
    if (!isSameOrInside(canonicalSourceRoot, absolutePath)) {
      throw new CopyError(`Copy manifest path leaves the source template: ${relativePath}`);
    }

    let currentPath = canonicalSourceRoot;
    let stat;
    for (let index = 0; index < pathSegments.length; index++) {
      currentPath = path.join(currentPath, pathSegments[index]);
      stat = lstatIfPresent(currentPath);
      if (!stat) {
        throw new CopyError(`Manifest entry must be a regular file: ${relativePath}`);
      }
      if (stat.isSymbolicLink()) {
        throw new CopyError(
          `Manifest entry must not pass through a symbolic link: ${relativePath}`,
        );
      }
      if (index < pathSegments.length - 1 && !stat.isDirectory()) {
        throw new CopyError(`Manifest parent must be a directory: ${relativePath}`);
      }
    }
    if (!stat.isFile()) {
      throw new CopyError(`Manifest entry must be a regular file: ${relativePath}`);
    }
    const canonicalFilePath = fs.realpathSync(absolutePath);
    if (!isSameOrInside(canonicalSourceRoot, canonicalFilePath)) {
      throw new CopyError(`Manifest entry resolves outside the source template: ${relativePath}`);
    }

    return {
      relativePath,
      absolutePath,
      bytes: stat.size,
      executable: Boolean(stat.mode & 0o111),
    };
  });

  const setupTemplate = files.find(
    (file) => file.relativePath === SETUP_TEMPLATE_PATH,
  );
  if (!setupTemplate) {
    throw new CopyError(`Copy manifest must include ${SETUP_TEMPLATE_PATH}.`);
  }
  validateSetupTemplate(fs.readFileSync(setupTemplate.absolutePath, "utf8"));

  return { canonicalSourceRoot, marker, files };
}

function ensureDirectory(directoryPath) {
  fs.mkdirSync(directoryPath, { recursive: true, mode: 0o755 });
  fs.chmodSync(directoryPath, 0o755);
}

function normaliseMode(absolutePath, executable) {
  fs.chmodSync(absolutePath, executable ? 0o755 : 0o644);
}

function markdownInline(value) {
  return String(value).replaceAll("\\", "\\\\").replaceAll("`", "\\`");
}

function buildSetupRecord(stageRoot, options, createdAt) {
  const templatePath = path.join(stageRoot, SETUP_TEMPLATE_PATH);
  let setup = fs.readFileSync(templatePath, "utf8");
  validateSetupTemplate(setup);
  const replacements = new Map([
    ["- Workspace role:", "- Workspace role: project-copy"],
    ["- Project name:", `- Project name: ${markdownInline(options.name)}`],
    [
      "- Working-copy folder:",
      `- Working-copy folder: \`${markdownInline(path.basename(options.destination))}\``,
    ],
    ["- Created:", `- Created: ${createdAt}`],
    ["- Copy method:", "- Copy method: `onboarding/create-project-copy.js`"],
    ["- App name:", `- App name: ${markdownInline(options.name)}`],
  ]);

  for (const [emptyLine, completedLine] of replacements) {
    setup = setup.replace(`${emptyLine}\n`, `${completedLine}\n`);
  }

  const outputPath = path.join(stageRoot, GENERATED_SETUP_PATH);
  ensureDirectory(path.dirname(outputPath));
  fs.writeFileSync(outputPath, setup, { encoding: "utf8", flag: "wx", mode: 0o644 });
  normaliseMode(outputPath, false);
}

function walkFiles(directory, prefix = "", result = []) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name;
    const absolutePath = path.join(directory, entry.name);
    const stat = fs.lstatSync(absolutePath);
    if (stat.isSymbolicLink()) {
      throw new CopyError(`Generated copy unexpectedly contains a symbolic link: ${relativePath}`);
    }
    if (stat.isDirectory()) {
      walkFiles(absolutePath, relativePath, result);
    } else if (stat.isFile()) {
      result.push(relativePath);
    } else {
      throw new CopyError(`Generated copy contains a non-file entry: ${relativePath}`);
    }
  }
  return result;
}

function verifyStage(stageRoot, expectedFiles) {
  const actualFiles = walkFiles(stageRoot).sort();
  const expected = [...expectedFiles, GENERATED_SETUP_PATH].sort();
  if (
    actualFiles.length !== expected.length
    || actualFiles.some((entry, index) => entry !== expected[index])
  ) {
    throw new CopyError("Generated working-copy inventory did not match the safe manifest.");
  }

  const marker = readJsonRegularFile(path.join(stageRoot, MARKER_PATH), "Generated marker");
  if (
    marker.schemaVersion !== 1
    || marker.templateId !== TEMPLATE_ID
    || marker.workspaceRole !== "project-copy"
  ) {
    throw new CopyError("Generated working-copy marker is invalid.");
  }
}

function publishStage(stageRoot, destination) {
  if (lstatIfPresent(destination)) {
    throw new CopyError(`Destination appeared during the copy; it was not overwritten: ${destination}`);
  }
  try {
    fs.renameSync(stageRoot, destination);
  } catch (error) {
    if (["EEXIST", "ENOTEMPTY", "EISDIR", "ENOTDIR"].includes(error.code)) {
      throw new CopyError(`Destination appeared during the copy; it was not overwritten: ${destination}`);
    }
    throw error;
  }
}

function createCopy(options) {
  const { canonicalSourceRoot, marker, files } = validateSource();
  const { parent } = validateDestination(options.destination, canonicalSourceRoot);
  const totalBytes = files.reduce((sum, file) => sum + file.bytes, 0);
  const createdAt = new Date().toISOString();
  const result = {
    ok: true,
    action: options.dryRun ? "preview" : "created",
    projectName: options.name,
    destination: options.destination,
    workspaceRole: "project-copy",
    copiedFiles: files.length,
    generatedFiles: 1,
    sourceBytes: totalBytes,
    exclusions: [
      "Git history",
      "installed dependencies",
      "filled .env files and credentials",
      "app source and binaries",
      "TestRail imports",
      "screenshots, logs, and test results",
    ],
    gitInitialised: false,
  };

  if (options.dryRun) return result;

  let stageRoot;
  try {
    stageRoot = fs.mkdtempSync(
      path.join(parent, `.${path.basename(options.destination)}.copying-`),
    );
    fs.chmodSync(stageRoot, 0o755);

    for (const file of files) {
      const destinationPath = path.join(stageRoot, ...file.relativePath.split("/"));
      ensureDirectory(path.dirname(destinationPath));
      if (file.relativePath === MARKER_PATH) {
        const projectMarker = {
          ...marker,
          workspaceRole: "project-copy",
          projectName: options.name,
          createdAt,
        };
        fs.writeFileSync(
          destinationPath,
          `${JSON.stringify(projectMarker, null, 2)}\n`,
          { encoding: "utf8", flag: "wx", mode: 0o644 },
        );
        normaliseMode(destinationPath, false);
      } else {
        fs.copyFileSync(file.absolutePath, destinationPath, fs.constants.COPYFILE_EXCL);
        normaliseMode(destinationPath, file.executable);
      }
    }

    buildSetupRecord(stageRoot, options, createdAt);
    verifyStage(stageRoot, files.map((file) => file.relativePath));

    publishStage(stageRoot, options.destination);
    stageRoot = null;
    return result;
  } finally {
    if (stageRoot && lstatIfPresent(stageRoot)) {
      fs.rmSync(stageRoot, { recursive: true, force: true });
    }
  }
}

function printResult(result, json) {
  if (json) {
    process.stdout.write(`${JSON.stringify(result)}\n`);
    return;
  }

  if (result.action === "preview") {
    console.log("Working-copy preview is ready. No files were written.");
  } else {
    console.log("Working copy created.");
  }
  console.log(`Destination: ${result.destination}`);
  console.log(`Reusable template files: ${result.copiedFiles}`);
  console.log(`Excluded by design: ${result.exclusions.join("; ")}.`);
  console.log("Git was not initialised.");
  if (result.action === "created") {
    console.log(`Next: open "${result.destination}" in Claude Code and type "continue setup".`);
  }
}

function run(argv) {
  let options;
  try {
    options = parseArguments(argv);
    if (options.help) {
      console.log(usage());
      return 0;
    }
    const result = createCopy(options);
    printResult(result, options.json);
    return 0;
  } catch (error) {
    const copyError = error instanceof CopyError
      ? error
      : new CopyError(`Unable to create the working copy: ${error.message}`);
    const useJson = options?.json || argv.includes("--json");
    if (useJson) {
      process.stderr.write(`${JSON.stringify({
        ok: false,
        error: copyError.message,
      })}\n`);
    } else {
      console.error(`Error: ${copyError.message}`);
      if (copyError.exitCode === 2) console.error(`\n${usage()}`);
    }
    return copyError.exitCode;
  }
}

if (require.main === module) {
  process.exitCode = run(process.argv.slice(2));
}
