const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const root = path.resolve(__dirname, "..");
const requiredFiles = [
  "START-HERE.md",
  "README.md",
  "MANUAL-WORKFLOW.md",
  "AI-GUIDED-WORKFLOW.md",
  "CLAUDE.md",
  "PROVENANCE.md",
  "CONTRIBUTING.md",
  "manual/TEST-CASE-WORKSHEET.md",
  "manual/REVIEW-CHECKLIST.md",
  "ai/START-NEW-APP.md",
  "ai/ADD-SECTION.md",
  "ai/DEBUG-FAILURE.md",
  "ai/GET-STARTED.md",
  "ai/README.md",
  "onboarding/BEGINNER-RUNBOOK.md",
  "onboarding/PROJECT-SETUP-TEMPLATE.md",
  "onboarding/check-prerequisites.js",
  "onboarding/check-prerequisites.self-test.js",
  "onboarding/copy-manifest.json",
  "onboarding/create-project-copy.js",
  "onboarding/create-project-copy.self-test.js",
  "template-state.json",
  "app-map/APP-MAP.md",
  "app-map/worksheets/README.md",
];

function fail(message) {
  throw new Error(message);
}

function read(relativePath) {
  const absolutePath = path.join(root, relativePath);
  if (!fs.existsSync(absolutePath)) fail(`Missing required file: ${relativePath}`);
  return fs.readFileSync(absolutePath, "utf8");
}

function assertBefore(textValue, earlier, later, label) {
  const earlierIndex = textValue.indexOf(earlier);
  const laterIndex = textValue.indexOf(later);
  if (earlierIndex === -1 || laterIndex === -1 || earlierIndex >= laterIndex) {
    fail(`${label}: expected "${earlier}" before "${later}".`);
  }
}

function probeCaseId(platform, overrides = {}, fallback = "C__PLACEHOLDER__") {
  const platformEnv = platform === "android"
    ? {
      APP_PACKAGE: "com.example.mobile",
      APP_ACTIVITY: ".MainActivity",
    }
    : {
      BUNDLE_ID: "com.example.mobile",
    };
  const probe = spawnSync(
    process.execPath,
    [
      "-e",
      [
        "const { caseId } = require('./lib/env');",
        "process.stdout.write(caseId(",
        `'TESTRAIL_CASE_PROFILE', '${fallback}'));`,
      ].join(""),
    ],
    {
      cwd: path.join(root, platform),
      encoding: "utf8",
      env: {
        ...process.env,
        ...platformEnv,
        APPIUM_UDID: "offline-workflow-test-device",
        BROWSERSTACK: "false",
        ALLOW_UNMAPPED_TESTRAIL_CASES: "false",
        ...overrides,
      },
    },
  );
  return probe;
}

function collectMarkdown(directory, result = []) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const absolutePath = path.join(directory, entry.name);
    const relativePath = path.relative(root, absolutePath);
    if (
      entry.isDirectory()
      && [".git", "node_modules", "app-under-test", "testrail-import"].includes(entry.name)
    ) {
      continue;
    }
    if (entry.isDirectory()) collectMarkdown(absolutePath, result);
    else if (entry.isFile() && entry.name.endsWith(".md")) result.push(relativePath);
  }
  return result;
}

for (const relativePath of requiredFiles) read(relativePath);

const startHere = read("START-HERE.md");
if (!startHere.includes("(MANUAL-WORKFLOW.md)")) {
  fail("START-HERE.md does not link the manual path.");
}
if (!startHere.includes("(AI-GUIDED-WORKFLOW.md)")) {
  fail("START-HERE.md does not link the Claude-guided path.");
}
if (!startHere.includes("(PROVENANCE.md)")) {
  fail("START-HERE.md does not expose the starter provenance boundary.");
}
if (!startHere.toLowerCase().includes("help me get started")) {
  fail("START-HERE.md does not expose the beginner Claude trigger.");
}
if (
  !startHere.includes("source-template")
  || !startHere.includes("project-copy")
) {
  fail("START-HERE.md does not protect the source template with a working copy.");
}

const claudeGuide = read("CLAUDE.md");
if (!claudeGuide.includes("Do the requested implementation work.")) {
  fail("CLAUDE.md does not tell Claude to perform the implementation.");
}
if (!claudeGuide.includes("Never invent an app ID")) {
  fail("CLAUDE.md is missing its evidence rule.");
}
if (!claudeGuide.includes("First-time-user onboarding trigger")) {
  fail("CLAUDE.md is missing the first-time-user onboarding protocol.");
}
if (!claudeGuide.includes("exactly one user-facing question")) {
  fail("CLAUDE.md must limit beginner onboarding to one question per turn.");
}
for (const requiredPhrase of [
  "capable professional",
  "Define an unfamiliar term when it first becomes relevant",
  "ALLOW_UNMAPPED_TESTRAIL_CASES=true",
  "Never use them for BrowserStack, CI, or TestRail",
  "Appium `2.19.0`",
  "`uiautomator2@4.2.9`",
  "`xcuitest@9.10.5`",
]) {
  if (!claudeGuide.includes(requiredPhrase)) {
    fail(`CLAUDE.md is missing zero-knowledge guidance: ${requiredPhrase}`);
  }
}
for (const requiredPhrase of [
  "create-project-copy.js",
  "workspaceRole",
  "project-copy",
  "continue setup",
]) {
  if (!claudeGuide.includes(requiredPhrase)) {
    fail(`CLAUDE.md is missing the working-copy rule: ${requiredPhrase}`);
  }
}
if (!claudeGuide.includes("Workspace isolation gate — always applies")) {
  fail("CLAUDE.md is missing the global project-copy gate.");
}
assertBefore(
  claudeGuide,
  "Workspace isolation gate — always applies",
  "## Read first",
  "CLAUDE.md global isolation sequence",
);
assertBefore(
  claudeGuide,
  "create-project-copy.js",
  "Ask whether the app they want to test runs",
  "CLAUDE.md beginner sequence",
);

const beginnerRunbook = read("onboarding/BEGINNER-RUNBOOK.md");
for (const requiredPhrase of [
  "Explain terms at the point of use",
  "Appium is not installed yet",
  "ALLOW_UNMAPPED_TESTRAIL_CASES=true",
  "one blocker, one required human action",
]) {
  if (!beginnerRunbook.includes(requiredPhrase)) {
    fail(`The beginner runbook is missing professional onboarding guidance: ${requiredPhrase}`);
  }
}
assertBefore(
  beginnerRunbook,
  "## Stage 3: protect the template with a working copy",
  "## Stage 4: learn the platform in ordinary language",
  "Beginner runbook sequence",
);
assertBefore(
  beginnerRunbook,
  "create-project-copy.js",
  "Does the app you want to test run",
  "Beginner copy-before-platform sequence",
);

const guidedWorkflow = read("AI-GUIDED-WORKFLOW.md");
assertBefore(
  guidedWorkflow,
  "suggests an unused sibling folder",
  "asks whether Android, iPhone/iPad, or both",
  "Claude-guided workflow sequence",
);
if (
  !guidedWorkflow.includes("first working test")
  || !guidedWorkflow.includes("ALLOW_UNMAPPED_TESTRAIL_CASES=true")
) {
  fail("The Claude-guided workflow does not describe a complete local first-test route.");
}

const beginnerExample = read("ai/GET-STARTED.md");
assertBefore(
  beginnerExample,
  "Shall I create that working copy now?",
  "Does the app you want to test run",
  "Beginner conversation sequence",
);
for (const requiredPhrase of [
  "local service that lets a JavaScript test",
  "UiAutomator2",
  "I’m unsure",
  "LOCAL-LAUNCH-SMOKE",
  "The first test passed",
  "source template is",
]) {
  if (!beginnerExample.includes(requiredPhrase)) {
    fail(`The beginner conversation does not reach a concrete first pass: ${requiredPhrase}`);
  }
}
const claudeTurns = [
  ...beginnerExample.matchAll(
    /^> \*\*Claude:\*\*([\s\S]*?)(?=^> \*\*User:\*\*|(?![\s\S]))/gm,
  ),
].map((match) => match[1]);
if (
  claudeTurns.length < 15
  || claudeTurns.some((turn) => (turn.match(/\?/g) || []).length !== 1)
) {
  fail("Every Claude turn in the beginner example must ask exactly one user-facing question.");
}

const advancedStart = read("ai/START-NEW-APP.md");
if (!advancedStart.includes("optional fast path")) {
  fail("The detailed start prompt must be labelled as an advanced shortcut.");
}
if (
  !advancedStart.includes("Working-copy destination")
  || !advancedStart.includes("project-copy")
  || !advancedStart.includes("save all non-secret scope and approval answers")
) {
  fail("The advanced start prompt does not isolate and persist project-copy setup.");
}
for (const prompt of ["ai/ADD-SECTION.md", "ai/DEBUG-FAILURE.md"]) {
  if (!read(prompt).includes("verify it says `project-copy`")) {
    fail(`${prompt} does not refuse work in the source template.`);
  }
}

const marker = JSON.parse(read("template-state.json"));
if (
  marker.schemaVersion !== 1
  || marker.templateId !== "mobile-e2e-template"
  || !["source-template", "project-copy"].includes(marker.workspaceRole)
) {
  fail("The repository marker must identify a recognised workspace role.");
}
if (marker.workspaceRole === "project-copy") {
  const setup = read("app-map/PROJECT-SETUP.md");
  if (!setup.includes("- Workspace role: project-copy")) {
    fail("A project copy must contain its generated project setup record.");
  }
}
const copyManifest = JSON.parse(read("onboarding/copy-manifest.json"));
for (const requiredEntry of [
  "CLAUDE.md",
  "android/.env.template",
  "ios/.env.template",
  "onboarding/create-project-copy.js",
  "onboarding/create-project-copy.self-test.js",
  "template-state.json",
]) {
  if (!copyManifest.files?.includes(requiredEntry)) {
    fail(`The safe copy manifest is missing ${requiredEntry}.`);
  }
}

for (const platform of ["android", "ios"]) {
  const packageJson = JSON.parse(read(`${platform}/package.json`));
  const packageLock = JSON.parse(read(`${platform}/package-lock.json`));
  if (packageJson.optionalDependencies?.["@wdio/browserstack-service"] !== "9.32.1") {
    fail(`${platform}/package.json must keep BrowserStack as the pinned optional service.`);
  }
  if (packageJson.devDependencies?.["@wdio/browserstack-service"]) {
    fail(`${platform}/package.json must not require BrowserStack for local-only installs.`);
  }
  if (!/\bselfHeal:\s*false\b/.test(read(`${platform}/wdio.conf.js`))) {
    fail(`${platform}/wdio.conf.js must explicitly disable BrowserStack self-healing.`);
  }
  if (!read(`${platform}/wdio.conf.js`).includes("services: []")) {
    fail(`${platform}/wdio.conf.js must leave local Appium mode service-free.`);
  }
  for (const dependency of [
    "@wdio/browserstack-service",
    "@browserstack/ai-sdk-node",
  ]) {
    if (packageLock.packages?.[`node_modules/${dependency}`]?.optional !== true) {
      fail(`${platform}/package-lock.json must mark ${dependency} as optional.`);
    }
  }

  const unmappedLocal = probeCaseId(platform, {
    ALLOW_UNMAPPED_TESTRAIL_CASES: "true",
  });
  if (unmappedLocal.status !== 0 || unmappedLocal.stdout !== "LOCAL-PROFILE") {
    fail(
      `${platform} must allow deterministic local-only case labels when explicitly enabled: `
      + `${unmappedLocal.stderr || unmappedLocal.stdout}`,
    );
  }

  const explicitLocal = probeCaseId(
    platform,
    { ALLOW_UNMAPPED_TESTRAIL_CASES: "true" },
    "LOCAL-PROFILE-SCREEN",
  );
  if (explicitLocal.status !== 0 || explicitLocal.stdout !== "LOCAL-PROFILE-SCREEN") {
    fail(`${platform} must accept an explicit reviewed LOCAL-* label in local-only mode.`);
  }

  const unmappedByDefault = probeCaseId(platform);
  if (unmappedByDefault.status === 0) {
    fail(`${platform} must reject an unmapped TestRail case unless local-only mode is explicit.`);
  }

  const verifiedCase = probeCaseId(platform, {}, "123");
  if (verifiedCase.status !== 0 || verifiedCase.stdout !== "C123") {
    fail(`${platform} must preserve verified TestRail C### normalization.`);
  }

  const unmappedOnBrowserStack = probeCaseId(platform, {
    ALLOW_UNMAPPED_TESTRAIL_CASES: "true",
    BROWSERSTACK: "true",
    BROWSERSTACK_USERNAME: "offline-user",
    BROWSERSTACK_ACCESS_KEY: "offline-key",
    BS_APP_URL: "bs://offline-app",
  });
  if (unmappedOnBrowserStack.status === 0) {
    fail(`${platform} must reject local-only case labels in BrowserStack/CI mode.`);
  }

  const explicitLocalOnBrowserStack = probeCaseId(
    platform,
    {
      ALLOW_UNMAPPED_TESTRAIL_CASES: "true",
      BROWSERSTACK: "true",
      BROWSERSTACK_USERNAME: "offline-user",
      BROWSERSTACK_ACCESS_KEY: "offline-key",
      BS_APP_URL: "bs://offline-app",
    },
    "LOCAL-PROFILE-SCREEN",
  );
  if (explicitLocalOnBrowserStack.status === 0) {
    fail(`${platform} must reject explicit LOCAL-* labels in BrowserStack/CI mode.`);
  }
}

const manualWorkflow = read("MANUAL-WORKFLOW.md");
if (!manualWorkflow.includes("npm ci --omit=optional")) {
  fail("The manual workflow must document the strict local-only install.");
}
for (const requiredPhrase of [
  "No previous mobile-automation experience is assumed",
  "npm install --global appium@2.19.0",
  "appium driver install uiautomator2@4.2.9",
  "appium driver install xcuitest@9.10.5",
  "appium driver doctor",
  "adb -s \"emulator-5554\" install -r",
  "xcrun simctl install",
  "Remote host",
  "ALLOW_UNMAPPED_TESTRAIL_CASES=true",
  "LOCAL-PROFILE-HEADING",
  "### Common hand-written actions",
]) {
  if (!manualWorkflow.includes(requiredPhrase)) {
    fail(`The manual workflow is missing a zero-prior-knowledge step: ${requiredPhrase}`);
  }
}
if (
  !manualWorkflow.includes("create-project-copy.js")
  || !manualWorkflow.includes("source-template")
  || !manualWorkflow.includes("project-copy")
) {
  fail("The manual workflow must create an isolated project copy before editing.");
}
assertBefore(
  manualWorkflow,
  "## 1. Create a separate project working copy",
  "npm ci",
  "Manual install sequence",
);

for (const platform of ["android", "ios"]) {
  const platformReadme = read(`${platform}/README.md`);
  if (
    platformReadme.includes("npm run test:account-setup")
    || !platformReadme.includes("Do not run `account-setup`, `example`, or all tests")
  ) {
    fail(`${platform}/README.md must not tell a fresh copy to run placeholder sections.`);
  }
  if (!read(`${platform}/.env.template`).includes("ALLOW_UNMAPPED_TESTRAIL_CASES=false")) {
    fail(`${platform}/.env.template is missing the explicit local TestRail mode.`);
  }
}

const prerequisiteChecker = read("onboarding/check-prerequisites.js");
if (/\bClaude (?:can|should)\b/.test(prerequisiteChecker)) {
  fail("The prerequisite checker must be route-neutral.");
}
assertBefore(
  manualWorkflow,
  "## 1. Create a separate project working copy",
  "app-map/worksheets/<platform>-<section>.md",
  "Manual worksheet sequence",
);

const markdownFiles = [
  ...new Set([
    ...collectMarkdown(root),
    "app-under-test/README.md",
    "testrail-import/README.md",
  ]),
];
let checkedLinks = 0;

for (const relativePath of markdownFiles) {
  const markdown = read(relativePath);
  const linkPattern = /(?<!!)\[[^\]]+\]\(([^)]+)\)/g;
  for (const match of markdown.matchAll(linkPattern)) {
    const rawTarget = match[1].trim();
    if (
      !rawTarget
      || rawTarget.startsWith("#")
      || /^[a-z][a-z0-9+.-]*:/i.test(rawTarget)
    ) {
      continue;
    }

    const targetWithoutTitle = rawTarget.split(/\s+["']/)[0];
    const targetPath = decodeURIComponent(targetWithoutTitle.split("#")[0]);
    const absoluteTarget = path.resolve(path.dirname(path.join(root, relativePath)), targetPath);
    if (!fs.existsSync(absoluteTarget)) {
      fail(`Broken Markdown link in ${relativePath}: ${rawTarget}`);
    }
    checkedLinks++;
  }
}

console.log(`Workflow documentation self-test passed (${checkedLinks} local links checked)`);
