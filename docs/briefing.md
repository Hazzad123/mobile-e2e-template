# Mobile E2E Template — Call Briefing

> A wired-up, production-ready starting point for automated Android and iOS regression tests. Download a Zip, adapt it to one app, run it locally — then optionally push to BrowserStack, TestRail, and CI.

**Stack:** WebdriverIO · Appium · BrowserStack · TestRail · Bitbucket Pipelines · Claude-guided onboarding

---

## The idea

Starting a mobile E2E suite from scratch takes weeks — Appium configuration, retry logic, BrowserStack integration, TestRail publishing, CI pipelines. This template has all of it already wired together. The only work is adapting it to one specific app.

The output is ordinary, reviewable JavaScript. A suite started with Claude can be maintained entirely by hand; a hand-written suite works identically in CI. There is no AI dependency once the tests are written.

**One-line version:** It's the plumbing you'd have to write on every project anyway — done once, reused by downloading a Zip.

---

## Tech stack

| Tool | What it does |
|---|---|
| **WebdriverIO** | Test runner. Executes steps, manages sessions, reports pass/fail. |
| **Appium** | Local automation server. Receives WebdriverIO commands and relays them to the app. |
| **UiAutomator2** | Android-specific Appium driver. Talks to the Android device or emulator. |
| **XCUITest** | iOS-specific Appium driver. Talks to the iOS simulator or device. macOS only. |
| **BrowserStack** | Hosted device cloud. Runs the same tests on real Android/iOS devices in the cloud. |
| **TestRail** | Test case catalogue. CI automatically publishes pass/fail results after each run. |
| **Bitbucket Pipelines** | Three on-demand pipelines — Android, iOS, or both. A report step owns the final verdict. |
| **Node.js / npm** | Runtime. Everything runs as JavaScript; no Java or other toolchain needed in the tests. |

---

## Two ways in — same output either way

### Claude-guided path

Download the Zip, open Claude Code in that folder, type one sentence:

```
help me get started
```

Claude asks one question at a time, checks prerequisites itself, reads the app's source or APK, derives selectors and identifiers, and writes the first test. No prior mobile automation knowledge required.

- One approval question first
- Claude installs missing tools (with approval before each)
- Source code asked early — platform derived from it
- Target chosen: local / BrowserStack / pipeline
- First test written and run by Claude

### Manual path

Follow `MANUAL-WORKFLOW.md` — a step-by-step guide covering tool installation, device setup, app mapping, writing sections, and validation. No AI involved at any point. Suitable for restricted projects.

- Check provenance via `PROVENANCE.md` first
- Install Appium and platform driver manually
- Map the app, complete a worksheet
- Hand-code sections in JavaScript
- Register in `test.js`, validate, run

> **Important:** Both routes produce identical `.js` section files using the same helpers, selectors, and registration pattern. A suite started with Claude is fully maintainable by hand, and vice versa.

---

## What Claude asks, in order

One question per turn. Claude never asks for something it can derive itself — selectors, package IDs, and device UDIDs are always found from approved evidence.

**1. Are you allowed to use AI on this project?**
The single gate. Yes → continue. No / unsure → directed to `MANUAL-WORKFLOW.md`. Just exploring → read-only template tour only. Nothing is inspected before this is answered.

**2. Machine check**
Claude runs the prerequisite checker and translates the result. Missing tools are explained and offered for installation one at a time, with approval before any change. Claude creates `app-map/PROJECT-SETUP.md` as the resume record — typing `continue setup` later picks up exactly where it left off.

**3. What app material do you have?**
Source code asked first — having it lets Claude derive the app's identity, selectors, and often the platform without further questions. Then APK/IPA, or app already installed on a device. Path approval required before reading anything.

**4. Platform — usually confirmed, not asked**
Android Studio/Gradle → Android. Xcode → iOS. React Native/Flutter → both. Claude confirms rather than asks when it can infer. Only asked openly when it can't tell. If both platforms, asks which to prove first.

**5. Where should this suite run?**
Three options: local only, BrowserStack, or pipeline. Records intent — the first test always runs locally regardless. The choice only determines what Claude offers once a local test is passing.

**6. Device approval (two separate questions)**
Claude asks permission before starting or controlling an emulator/simulator/device — and again separately before reading any screenshots, XML, or logs. Claude checks device state itself; it never asks for a serial number or UDID.

**7. Does your team use TestRail?**
Yes → Claude reads an approved export, matches verified `C###` IDs only, never invents one. No/unsure → `ALLOW_UNMAPPED_TESTRAIL_CASES=true` is set in the local `.env` and tests get `LOCAL-*` labels. This mode is ignored by BrowserStack and CI.

**8. Proposed first test**
Claude describes a specific, non-destructive first user behaviour in plain English. The user approves what behaviour is being tested, not the JavaScript.
> *Example: "Launch the app and confirm the Welcome heading and Sign In button are visible. Nothing will be submitted or created."*

**9. Implement, run, and verify**
Claude writes the section file, registers it in `test.js`, runs syntax and offline checks, and runs the focused test on the approved device. Failures are diagnosed from approved screenshots and logs — Claude makes the smallest evidence-backed fix and reruns. External targets are only offered after a local pass, and only if they match the target chosen in step 5.

---

## What the repo looks like after onboarding

```
android/                    ← complete Android suite
  wdio.conf.js              local + BrowserStack capabilities
  test.js                   hooks, retries, recovery, section order
  lib/                      driver, element, helpers, timings
  sections/
    your-section.js         ← what Claude (or you) writes
    account-setup.js        placeholder example (replace)
  scripts/                  matrix runner + TestRail publisher
  .env.template             copy to .env, fill locally

ios/                        ← mirror of android/

app-map/
  APP-MAP.md                screen/journey/selector source of truth
  PROJECT-SETUP.md          approval decisions + readiness record
  worksheets/               one per test section

ci/                         upload, Firebase, CI verdict
bitbucket-pipelines.yml     three on-demand pipelines
CLAUDE.md                   standing rules for Claude
```

**Sections are the unit of work.** Each feature area gets one `sections/your-feature.js` file — selectors and TestRail case IDs at the top, test steps below. Registered in `test.js` by key. Run individually with `TEST_SECTIONS=your-feature npm test`.

```js
// sections/login.js — typical structure
const CASES = { smoke: 'C142' };   // verified TestRail IDs
const SELECTORS = {
  emailField: '~email-input',      // ~ = accessibility ID
  signInBtn:  '~sign-in-button',
  homeHeader: '~home-header',
};

it(`${CASES.smoke} Sign in with valid credentials`, async function () {
  await step('Enter email and password', async () => { ... });
  await step('Tap sign in',              async () => { ... });
  await step('Confirm home screen',      async () => { ... });
});
```

---

## Integrations

### BrowserStack
Upload an APK or IPA to BrowserStack, get back a `bs://` URL, pass that to the pipeline. The suite runs on real hosted devices — no local emulator needed. Devices are listed in `lib/devices.js`; the matrix runner starts one WebdriverIO process per device. Test Observability attaches per-test video, command logs, and failure evidence automatically. **Self-healing is explicitly disabled** — all selectors must be reviewed and proven against the real app.

### TestRail
Put a verified `C###` case ID in the test title — that's the entire integration mechanism. After a CI run the matrix runner automatically finds or creates a monthly plan (`Automated E2E — July 2026`), adds a run per device, and publishes pass/fail/blocked. Fail always wins over pass when multiple runs target the same case. **TestRail is not required for local development** — set `ALLOW_UNMAPPED_TESTRAIL_CASES=true` locally and use `LOCAL-*` labels instead.

### Bitbucket Pipelines
Three on-demand custom pipelines: `regression-android`, `regression-ios`, and `regression` (both). Each platform step always exits green — it writes a status file and continues. The final `report` step owns the real pass/fail verdict. This ensures the combined report always runs even if one platform fails. Two devices per platform = four BrowserStack parallel sessions.

---

## Most-used environment controls

| Variable | Default | What it does |
|---|---|---|
| `TEST_SECTIONS` | `all` | Comma-separated section keys. Run only `login,profile` instead of everything. |
| `ALLOW_UNMAPPED_TESTRAIL_CASES` | `false` | Set `true` locally to use `LOCAL-*` labels without a TestRail case ID. Ignored by BrowserStack/CI. |
| `BROWSERSTACK` | `false` | Switch from local Appium to BrowserStack session. Requires `BS_APP_URL` and credentials. |
| `NO_RESET` | `true` | Keep app state between sessions. Set `false` when account-setup tests must start clean. |
| `MAX_CONSECUTIVE_FAILURES` | `3` | Circuit breaker — stops after N back-to-back failures. `0` disables. |
| `TIMEOUT_MULTIPLIER` | `1` / `1.5` | Scales all polling timeouts. Auto 1.5× on BrowserStack. |
| `RECOVER_AFTER_FAILURE` | `true` | Run recovery before next test after a failure — keeps the suite from cascading. |

---

## Things worth saying out loud

- **The entry point is one sentence.** "Help me get started" is all a new user types. Claude does the rest — installs tools, reads the app, writes tests. No technical preparation needed before that sentence.
- **Claude never invents selectors or case IDs.** Every identifier comes from approved source code, a real APK/IPA, or an observed running app. This is a hard rule enforced in `CLAUDE.md` and checked by CI.
- **Local first, always.** Even if the project will eventually run on BrowserStack, the first test always proves locally on an emulator or simulator. You know it works before paying for cloud devices.
- **AI authorship is opt-in and documented.** Projects where AI is not permitted follow the manual path and never invoke Claude on project material. `PROVENANCE.md` records that the template itself was AI-assisted, for teams with strict software-origin policies.
- **The tests are ordinary JavaScript.** No AI runtime dependency. A suite written with Claude can be read, edited, and maintained by any developer — or handed entirely to a manual process.
- **TestRail publication is automatic in CI.** Write `C142` in the test title; after each pipeline run the results appear in a monthly TestRail plan, one run per device, with pass/fail/blocked. No manual posting.
- **BrowserStack self-healing is off.** Explicitly disabled. Selectors must be stable and reviewed — the suite won't silently patch a broken selector with an AI guess.
- **Android and iOS are kept separate.** Two mirrored suites, not one shared file. Platform behaviour diverges in real apps — keeping them separate makes each straightforward to debug and lets either run independently.
- **Destructive actions need explicit approval.** Claude will never confirm a deletion, purchase, or form submission unless separately approved and the test data is isolated. Same applies to BrowserStack uploads, TestRail writes, and CI changes.

---

## Likely questions

**What if we don't use TestRail?**
Set `ALLOW_UNMAPPED_TESTRAIL_CASES=true` in your local `.env`. Tests get `LOCAL-*` labels and run fine locally. The CI/BrowserStack path will need real case IDs if you ever enable it — but you can start without TestRail.

**Can it run on GitHub Actions?**
The supplied pipelines are Bitbucket-specific, but the underlying commands (`npm run test:ci`, `node ci/report.js`) are standard Node.js — they can run in any CI environment. The Bitbucket YAML is a starting point, not a lock-in.

**Does it work with React Native / Flutter?**
Yes — Appium controls the app at the UI level, not the source level. React Native and Flutter apps appear as native Android or iOS apps to the driver. Selectors come from accessibility IDs or XPath, not framework internals.

**What if the project can't use Claude at all?**
Follow `MANUAL-WORKFLOW.md` — a complete step-by-step guide with no AI dependency at any stage. Check `PROVENANCE.md` first if policy restricts AI-authored artifacts (the template itself was built with AI assistance).

**How do you add a new test area?**
Copy `sections/example.js`, choose a lowercase key (e.g. `profile`), add it to `SECTION_KEYS`, and `require()` it at the bottom of `test.js`. Do the same in both `android/` and `ios/`. Then run `TEST_SECTIONS=profile npm test`.

**How many BrowserStack sessions does it use?**
One per device entry in `lib/devices.js`. The default ships with two Android and two iOS devices = four parallel sessions for a full run. Reduce with `BS_MATRIX_CONCURRENCY=1` or by trimming the device list.
