# Mobile E2E regression template

This is a reusable starting point for automated checks of Android and
iPhone/iPad apps. A test can perform actions on a physical or virtual phone,
confirm what appears on screen, and report what passed or failed. You can have
Claude guide the setup and write the tests, or follow a fully manual process.

## Choose the authoring path

Brand new to mobile automation? Download this template as a Zip, unzip it to a
folder of your own, open Claude Code in that folder, and type:

> help me get started

Claude will check whether AI is allowed and the basic machine, then explain each
prerequisite, ask one plain-language question at a time, and build the first
test with you in that downloaded copy. If AI policy is uncertain, start before
adding restricted project inputs; Claude asks about approval before inspecting
them.

Both routes produce the same reviewable JavaScript sections and use the same
runtime. Choose per project before sharing any source, test data, or artifacts:

| Project policy | Start here | Who writes the tests |
|---|---|---|
| Generative AI is prohibited or unavailable, and this starter is approved | [Manual-only workflow](MANUAL-WORKFLOW.md) | A person maps, codes, registers, and validates every test |
| Claude is approved for the project | [Claude-guided workflow](AI-GUIDED-WORKFLOW.md) | Claude leads setup from zero, checks prerequisites, maps the app and writes the tests |

The manual route does not depend on an AI conversation. The Claude route
includes ready-to-paste prompts under `ai/` and standing instructions in
`CLAUDE.md`; the prompts are optional shortcuts for experienced users. Both
produce ordinary CommonJS files, so a suite started with Claude can be
maintained entirely by hand later.

## How the pieces fit together

You do not need to understand these tools before choosing a route. They are
introduced when they become relevant:

- WebdriverIO runs the written test steps and reports pass or fail.
- Appium is a local service that carries those actions to the app.
- Android's UiAutomator2 driver or Apple's XCUITest driver connects Appium to
  that platform.
- BrowserStack can run the same tests on hosted devices when external uploads
  are approved.
- TestRail can connect results to an existing team test-case catalogue. It is
  not required for the first local test.

This starter itself was developed with AI assistance. Read
[PROVENANCE.md](PROVENANCE.md) before using it where policy also restricts
AI-authored artifacts, dependency declarations, or software provenance.

Both workflows begin by downloading this template as a Zip and working in the
unzipped folder. Do not commit Git history, dependencies, secrets, app inputs,
imports, or generated evidence back into a shared checkout of the starter.

The two platform suites intentionally mirror one another. Mobile selectors,
gestures, capabilities, and recovery behaviour diverge in real apps; keeping the
platform trees explicit makes each suite straightforward to debug and lets
either one run or be copied independently.

## Technical reference: what is already wired

Guided users do not need to learn this architecture before typing
`help me get started`. Manual users encounter each part in order in
[MANUAL-WORKFLOW.md](MANUAL-WORKFLOW.md).

- WebdriverIO runner with Appium UiAutomator2 and XCUITest capabilities.
- Optional `@wdio/browserstack-service` integration with Test Observability
  enabled and selector self-healing disabled.
- BrowserStack device matrices with isolated sessions and configurable parallelism.
- Per-test BrowserStack annotations, session names, final pass/fail status, video
  timestamps, and direct session links.
- One retry, recovery between failures, a consecutive-failure circuit breaker,
  screenshots, page-source dumps, JSON/Markdown summaries, and JUnit XML.
- Mandatory TestRail publication after every CI matrix run.
- Monthly TestRail plan lookup/creation and one configured run per device.
- Bitbucket on-demand pipelines for both platforms or either platform alone.
- A final report step that always runs and owns the real pipeline verdict.
- BrowserStack upload and Firebase App Distribution download utilities.
- Offline TestRail, CI-report, and workflow-documentation self-tests.

## Repository layout

```text
android/                         complete Android WDIO suite
  wdio.conf.js                   local/BrowserStack capabilities and service
  test.js                        hooks, retries, recovery, reporting, section order
  lib/                           driver, element, helpers, timings, devices
  sections/                      app-specific tests and selectors
  scripts/                       matrix runner and TestRail publisher
ios/                             complete iOS sibling suite
ci/
  upload-to-browserstack.js      APK/IPA -> bs:// URL
  fetch-firebase-release.js      optional Firebase release download
  report.js                      combined output and final verdict
bitbucket-pipelines.yml          three on-demand regression pipelines
MANUAL-WORKFLOW.md               end-to-end human setup and test-authoring guide
AI-GUIDED-WORKFLOW.md            end-to-end Claude setup and authoring guide
CLAUDE.md                        evidence, coding, safety, and validation rules
PROVENANCE.md                    starter origin and stricter policy boundary
CONTRIBUTING.md                  repository rules and review checks
manual/                          test-case worksheet and human review checklist
ai/                              ready-to-paste Claude task prompts
onboarding/                      first-time runbook, readiness checker and setup record
app-map/                         screen/navigation/selector source of truth
  worksheets/                    completed per-section design and case mapping
app-under-test/                  ignored location for app source
testrail-import/                 ignored location for a TestRail CSV export
```

## 1. Map the app

After choosing the permitted route, in your downloaded copy of the template put
approved app source under `app-under-test/android` and/or
`app-under-test/ios`, or inspect a running app locally with Appium Inspector.
Fill in
[app-map/APP-MAP.md](app-map/APP-MAP.md) before writing a large regression.
Source is optional and must not be copied when policy forbids it. Both workflow
guides cover source-free inspection.

Prefer stable accessibility identifiers:

- `~identifier` — accessibility ID on both platforms.
- `#resource_id` — Android resource ID; the driver prefixes `APP_PACKAGE`.
- `android=...` — Android UiSelector.
- `//...` — XPath, including `XCUIElementType*` expressions on iOS.

## 2. Generalise the worked sections

The two sections are deliberately small:

- `account-setup.js` is registered first and demonstrates launch verification
  plus creation of a unique throwaway account.
- `example.js` demonstrates navigation, scrolling, a multi-part TestRail case,
  and stopping at Cancel before an irreversible action.

Do not run either starter section unchanged. Replace every active
`__PLACEHOLDER__` in the section you are adapting, prove its selectors and
expected results, and register only intended tests. A person can do this line
by line, or Claude can perform the implementation on an approved project.

When the team uses TestRail, keep its verified case IDs in the test title. One
case may span multiple `it` blocks:

```js
it("C123 [1/2] User opens settings", async function () { /* ... */ });
it("C123 [2/2] User cancels deletion", async function () { /* ... */ });
```

The publisher merges repeated case IDs; fail wins over pass, and pass wins over
blocked. A title may also contain multiple IDs (`C123/C456`) when one automated
check legitimately covers several existing cases.

For a first local test on a project without TestRail, set
`ALLOW_UNMAPPED_TESTRAIL_CASES=true` in that platform's private `.env`. The
runtime then gives unmapped tests deterministic `LOCAL-*` labels. This mode
cannot be used by BrowserStack, CI, or the TestRail publisher.

Add a section by copying `sections/example.js`, choosing a lowercase section
key, adding that key to `SECTION_KEYS`, and requiring it in the fixed order at
the bottom of `test.js`. Make the same intentional change in each supported
platform.

## 3. Run locally

Use the detailed guided or manual workflow for installation. In your downloaded copy, and only after adapting one non-destructive section:

```bash
node onboarding/check-prerequisites.js --platform android
# use --platform ios for iPhone/iPad

cd android                    # or: cd ios, from your copy's root
cp .env.template .env
# fill the verified minimum local values described by the chosen workflow
npm ci
npm run test:testrail         # offline publisher contract test
TEST_SECTIONS=your-section npx mocha --dry-run test.js
```

Do not run `account-setup`, `example`, or all sections while they still contain
placeholders. Once the focused dry registration passes, start Appium in another
terminal and run only the adapted section:

```bash
appium
# in the platform directory, in the first terminal:
TEST_SECTIONS=your-section npm test
```

For a strict local project that may not install BrowserStack's optional service
dependency, use `npm ci --omit=optional` and keep `BROWSERSTACK=false`. The
committed lock still records that optional dependency; see the manual workflow
if policy also prohibits dependency declarations.

Useful controls:

| Variable | Default | Purpose |
|---|---:|---|
| `TEST_SECTIONS` | `all` | Comma-separated section keys |
| `NO_RESET` | `true` | Preserve app state between sessions |
| `TIMEOUT_MULTIPLIER` | `1` local, `1.5` cloud | Scale polling timeouts |
| `RECOVER_AFTER_FAILURE` | `true` | Recover before the next test |
| `RESTART_APP_AFTER_FAILURE` | `true` | Terminate/activate during generic recovery |
| `RECOVERY_READY_SELECTOR` | empty | Optional landmark recovery must await |
| `MAX_CONSECUTIVE_FAILURES` | `3` | Stop cascading failures; `0` disables |
| `ALLOW_UNMAPPED_TESTRAIL_CASES` | `false` | Permit deterministic `LOCAL-*` labels for local runs only |

## 4. BrowserStack and TestRail

Upload a pre-built app:

```bash
export BROWSERSTACK_USERNAME=...
export BROWSERSTACK_ACCESS_KEY=...
node ci/upload-to-browserstack.js \
  --file /path/to/app.apk \
  --env-out /tmp/android-browserstack.env
```

The returned `bs://...` URL is the build input. The test pipeline never builds
the app.

`npm run test:ci` starts one WDIO process per entry in `lib/devices.js`. The
official BrowserStack service owns each session; this is important because Test
Observability can then attach test boundaries, per-test video, command logs, and
automatic failure evidence to the real App Automate session.

BrowserStack selector self-healing is explicitly disabled in both platform
configurations. See the dependency-policy note in
[MANUAL-WORKFLOW.md](MANUAL-WORKFLOW.md) if project rules prohibit installing
its AI-related transitive package or even recording it in a lock file.

TestRail is mandatory in the matrix runner. It:

1. extracts all `C###` IDs from summaries;
2. finds or creates `<TESTRAIL_PLAN_PREFIX> <Month> <Year>`;
3. creates a plan entry with one configured run per matrix device;
4. publishes pass/fail/blocked with at least one second elapsed;
5. fails the matrix when publication fails.

Run the safe offline contract test at any time:

```bash
cd android && npm run test:testrail
cd ../ios && npm run test:testrail
node ../ci/report.self-test.js
node ../ci/workflow.self-test.js
node ../onboarding/check-prerequisites.self-test.js
```

The live smoke publisher is guarded because it writes to TestRail:

```bash
TESTRAIL_SMOKE_CASE_ID=C123 npm run test:testrail:smoke -- --publish
```

## 5. Bitbucket setup

Enable Pipelines and add repository variables:

| Variable | Required | Secured |
|---|---|---|
| `APP_DISPLAY_NAME` | yes | no |
| `ANDROID_APP_PACKAGE` | Android | no |
| `ANDROID_APP_ACTIVITY` | Android | no |
| `IOS_BUNDLE_ID` | iOS | no |
| `BROWSERSTACK_USERNAME` | yes | no |
| `BROWSERSTACK_ACCESS_KEY` | yes | yes |
| `E2E_EMAIL_PREFIX` | account setup | no |
| `E2E_EMAIL_DOMAIN` | account setup | no |
| `E2E_TEST_PASSWORD` | account setup | yes |
| `TESTRAIL_BASE_URL` | yes | no |
| `TESTRAIL_USERNAME` | yes | no |
| `TESTRAIL_API_KEY` | yes | yes |
| `TESTRAIL_PROJECT_ID` | yes | no |
| `TESTRAIL_SUITE_ID` | multi-suite projects | no |
| `TESTRAIL_PLAN_PREFIX` | recommended | no |
| `TESTRAIL_CONFIG_IDS` | only if auto-matching fails | no |

In TestRail, create Android and iOS configuration groups. Config names must
contain the device name and platform major version, for example
`Google Pixel 10 - Android 16 (BrowserStack)`. As an escape hatch,
`TESTRAIL_CONFIG_IDS` accepts IDs in matrix order.

Run `custom: regression-android` or `regression-ios` first with a single section.
Then use `custom: regression` and provide one or both `bs://` URLs. An empty URL
skips that platform.

The platform steps deliberately finish green after writing
`test-status/<platform>.env`; this guarantees the combined report still runs.
The report step is the authoritative pipeline result.

Two devices on both platforms can consume four BrowserStack parallel sessions.
Set `BS_MATRIX_CONCURRENCY=1`, reduce `lib/devices.js`, or make the platform
steps sequential if the plan has fewer slots.

## Optional Firebase download

`ci/fetch-firebase-release.js` can download the latest or a specified Firebase
App Distribution release with a service account holding the App Distribution
Viewer role. It is parked—not called by the supplied pipelines—until the
required Firebase variables and security approval exist. See the script header
for its exact inputs and outputs.

## Operational watch-outs

- Choose and record the permitted authoring route before project material is
  inspected. Do not invoke Claude on a manual-only project.
- Work in your downloaded copy of the template, not a shared checkout of the
  starter.
- Throwaway signup runs accumulate server-side accounts. Agree a cleanup policy.
- BrowserStack uploaded app URLs expire; re-upload an old binary when needed.
- Device names and OS versions change over time. Reconfirm `lib/devices.js`.
- Keep destructive tests at their Cancel boundary unless deletion is explicitly
  the behaviour under test and the data is isolated.
- `NO_RESET=true` can cause account setup to skip when the app is already signed
  in. Use a clean device or `NO_RESET=false` when signup itself must run.
- Never commit `.env`, service-account JSON, API keys, app binaries, screenshots,
  or copied application source.

For a visual walkthrough, open
[docs/learning-console.html](docs/learning-console.html) in a browser.
