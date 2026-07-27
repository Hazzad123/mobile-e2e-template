# Mobile E2E Test Template (Appium + Mocha → BrowserStack → TestRail)

A ready-to-clone template for **end-to-end (E2E) mobile app testing**. You point
it at your app, and it runs your tests on **real devices in the cloud**
(BrowserStack), reports pass/fail to **TestRail**, and is triggered from
**Bitbucket Pipelines** — no local setup needed just to run a regression.

> **New to this?** No problem. Terms are defined the first time they appear:
> - **E2E test** — a test that drives the real app like a user (tap, type, check).
> - **Appium** — the tool that controls a phone/app for tests.
> - **Mocha** — the test runner that organises tests and reports results.
> - **BrowserStack App Automate** — a cloud full of real phones you run tests on.
> - **TestRail** — a place to track test cases and their pass/fail history.
> - **Bitbucket Pipelines** — Bitbucket's CI: it runs jobs when you click a button.
> - **Selector** — how a test finds a button/field on screen (e.g. its id).

There are **two ways** to use this template and **both work end to end**:

| Path | Who it's for | Where to go |
|---|---|---|
| 🤖 **AI-guided** (recommended) | anyone — the AI does the heavy lifting | open the repo, say *"help me set up automated tests for my app"* → it follows [`CLAUDE.md`](CLAUDE.md) |
| 🧑 **Manual** | you'd rather follow steps yourself | this README, top to bottom |

Everything the AI does has a manual equivalent here, so you're never stuck.

---

## How it's organised

```
automation.config.js     ⭐ the ONE file you edit for your app (ids, devices, TestRail)
.env.example             copy to .env for local runs (secrets, your device UDID)
test.js                  Mocha entrypoint (don't edit)
bitbucket-pipelines.yml  the 3 pipelines
browserstack.yml         BrowserStack SDK config (auto-filled — don't edit)

core/                    🔒 the engine — you never edit this
platforms/ios/           iOS device list + page objects (you fill in selectors)
platforms/android/       Android device list + page objects
specs/                   your tests (one file per section; platform-agnostic)

app-under-test/          📥 drop your app source here (git-ignored)
testrail-import/         📥 drop a TestRail CSV export here (git-ignored)
app-map/APP-MAP.md       🗺️ the map of your app's screens + selectors
```

**The mental model:** a **spec** (in `specs/`) says *what* to test; a **page
object** (in `platforms/<platform>/pages/`) says *how* to do it on each platform.
One spec drives both iOS and Android.

---

## Prerequisites

- **Node.js 20+** (`node -v`). Only needed for local runs — the cloud pipeline
  provides its own.
- A **BrowserStack App Automate** account.
- *(Optional)* a **TestRail** account, if you want case-level reporting.
- *(Optional, for local runs)* Appium + a simulator/emulator. See below.

---

## One-time admin setup (do this once per repo)

### 1. Enable Pipelines
Bitbucket → **Repository settings → Pipelines → Settings → Enable**.

### 2. Add repository variables
Bitbucket → **Repository settings → Pipelines → Repository variables**. These are
the only secrets the pipeline needs (app ids live in `automation.config.js`, not
here):

| Variable | Example | Secured? | What it's for |
|---|---|---|---|
| `BROWSERSTACK_USERNAME` | `janedoe_ab12CD` | no | BrowserStack login |
| `BROWSERSTACK_ACCESS_KEY` | `xxxxxxxx` | **yes** | BrowserStack login |
| `TESTRAIL_BASE_URL` | `https://acme.testrail.io` | no | your TestRail site |
| `TESTRAIL_USERNAME` | `qa@acme.com` | no | TestRail login |
| `TESTRAIL_API_KEY` | `xxxxxxxx` | **yes** | TestRail login |
| `TESTRAIL_PROJECT_ID` | `12` | no | which TestRail project |
| `TESTRAIL_SUITE_ID` | `34` | no *(optional)* | which suite (multi-suite projects) |
| `TESTRAIL_CONFIG_IDS` | `55,56` | no *(optional)* | per-device runs, if auto-detect fails |

> 🔒 **Never commit credentials.** Only `.env.example` (blank) and the documented
> repository variables. `.env` and everything in `app-under-test/` /
> `testrail-import/` are git-ignored.

TestRail is **optional**: if the `TESTRAIL_*` variables aren't set, the pipeline
skips publishing (with a log note). Once they're set, a TestRail publish failure
**fails the pipeline** on purpose.

---

## Point the template at your app

Edit **`automation.config.js`** — it's fully commented. Fill in `appName`, the
iOS `bundleId` / Android `appPackage`, and the `devices` lists. Find everything
still to do with:

```bash
grep -rn "__" .
```

---

## Get your app onto BrowserStack (the `bs://` URL)

The pipeline never builds your app — you upload a pre-built binary and paste its
`bs://…` URL.

**Option A — command line:**
```bash
npm install
npm run upload -- --file ~/Downloads/YourApp.apk    # or .ipa
# prints:  bs://<long-id>
```

**Option B — dashboard:** BrowserStack → **App Automate → Apps → Upload**, then
copy the `bs://…` id.

> BrowserStack keeps uploads ~30 days. If an old URL stops working, re-upload.

---

## Run a regression

Bitbucket → **Pipelines → Run pipeline** → branch → pick one:

| Pipeline | Runs |
|---|---|
| `regression` | iOS **and** Android in parallel |
| `regression-ios` | iOS only |
| `regression-android` | Android only |

Fill the run form:

| Field | Meaning |
|---|---|
| `BS_APP_URL_IOS` | `bs://…` for the iOS build. **Empty = skip iOS** (not a failure). |
| `BS_APP_URL_ANDROID` | `bs://…` for the Android build. Empty = skip Android. |
| `TEST_SECTIONS` | `all`, or a comma-separated subset e.g. `auth,checkout` |

**Tip:** for your first run, use one platform and `TEST_SECTIONS=auth` — it's a
few minutes and proves the plumbing before a full regression.

---

## Read the results (in this order)

1. **Bitbucket → the `Run summary + verdict` step.** This is the *only* step that
   turns the pipeline red/green. It prints per-platform, per-device pass/fail and
   a `Failures → device → session` list. **Trust this step, not the test steps** —
   the test steps always show green on purpose (they record their real result for
   the verdict step, so it always runs).
2. **BrowserStack** — each device is a session with a **video**, device/Appium/
   network logs, and a timeline annotated `▶ START / ✅ PASS / ❌ FAIL` with a
   `[mm:ss]` mark so you can jump straight to a failure in the video.
3. **TestRail** — a plan/run per your `automation.config.js` settings, with each
   `C###` case marked pass/fail.

---

## Local development (optional, against a simulator/emulator)

```bash
cp .env.example .env          # then edit: PLATFORM, APPIUM_UDID
npm install
npm install -g appium         # once
appium                        # in a separate terminal
npm test                      # full suite for PLATFORM in .env
TEST_SECTIONS=auth npm test   # just one section
npm run test:ios              # force iOS   (npm run test:android for Android)
```

Find your device UDID: iOS `xcrun simctl list`; Android `adb devices`.

---

## Add a new test area (a "section")

Three edits (the AI does this with you, or do it manually):

1. **Spec** — copy `specs/example.spec.js` to `specs/<name>.spec.js`. Put a
   TestRail `C###` id at the start of each `it()` title.
2. **Page objects** — copy `platforms/ios/pages/example.page.js` and
   `platforms/android/pages/example.page.js` to `<name>.page.js`, and fill in the
   selectors from your app map.
3. **Register** — add a line to `sections` in `automation.config.js`:
   ```js
   { key: "<name>", spec: "specs/<name>.spec.js" },
   ```

Then dry-run it: `TEST_SECTIONS=<name> npm test`.

---

## Finding selectors without app source

If you can't drop source into `app-under-test/`, map screens live:

- **Appium Inspector** (both platforms) — connect with the same capabilities as
  `.env`, navigate to a screen, and read the element tree.
- **Android:** `adb shell uiautomator dump /sdcard/s.xml && adb pull /sdcard/s.xml`
- **iOS:** Xcode → *Accessibility Inspector*.
- **Any failure** already saves a page-source XML in `screenshots/`.

Prefer selectors in this order: `~accessibilityId` → `#resourceId`/`#name` →
platform query (`android=`/`ios=`) → `//xpath` (last resort; note it's fragile
and ask the app team for an accessibility id).

---

## Troubleshooting

| Symptom | Cause & fix |
|---|---|
| **Pipeline is red but tests look fine** | Read the **verdict step**, not the test steps. It names the platform/device that actually failed. |
| **"no sessions" / a platform was skipped** | Its `BS_APP_URL_*` field was empty → that platform is skipped by design. Provide the `bs://` URL to run it. |
| **Can't find the run in TestRail** | Check `TESTRAIL_*` repository variables are set, and your `automation.config.js` `testrail.planNamePattern` / `projectId`. Unset TestRail = publishing skipped (see the log note). |
| **A single test failed** | Open the BrowserStack session from the verdict list, scrub the video to the `[mm:ss]` mark, and read the `screenshots/` artifact for that test. |
| **Testing only one area** | `TEST_SECTIONS=<section>` — the `auth` section always runs first so subsets work standalone. |
| **`Missing APPIUM_UDID`** (local) | Set `APPIUM_UDID` in `.env` (`xcrun simctl list` / `adb devices`). |
| **`… is still a placeholder`** | You haven't filled that value in `automation.config.js`. Run `grep -rn "__" .`. |
| **Both platforms queue instead of running together** | Your BrowserStack plan has <2 parallel slots. Set `BS_MATRIX_CONCURRENCY=1`, or run `regression-ios` / `regression-android` separately. |

---

## Security note

Only `.env.example` (blank) and the documented repository variables ever hold
credentials. Do not commit a real `.env`, app source, or TestRail export — they're
git-ignored for you. No personal data or customer identifiers belong in test code
or app maps.
