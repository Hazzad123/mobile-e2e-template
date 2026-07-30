# Manual-only workflow

This is the complete setup and test-authoring route for projects where generative
AI is unavailable or prohibited. A person can perform every step with a text
editor, the app, Appium tooling, and whichever approved test services the
project already uses. There is no test generator and no generated code step.

This describes how the template is used, not how its starter files were
authored. This starter was developed with AI assistance. If policy also
prohibits importing AI-authored scaffolding, stop and follow the review or
independent-reimplementation requirement in
[PROVENANCE.md](PROVENANCE.md) before copying it into the project.

## How to use this guide

No previous mobile-automation experience is assumed. The guide uses technical
names because they are the names shown by installers and error messages, and
defines them before asking you to act on them.

Work through the numbered sections in order and prove one platform first.
Android and iPhone/iPad setup are separate; you do not need both to create a
useful first test.

Commands in fenced blocks are entered in a terminal. Run one block at a time
from the folder named by the preceding text. A line beginning with `#` is a
comment, not a command. Each setup step below states the result that confirms it
worked. If your organisation manages software centrally, use its approved
installer or ask its support team rather than bypassing controls.

The command examples use the standard macOS/Linux shell. Local iPhone/iPad
automation requires macOS. Android can also run on Windows, but PowerShell uses
different copy, environment-variable, and search syntax; have the project
maintainer provide the approved Windows equivalents rather than pasting these
shell blocks unchanged.

## Terms used in the workflow

| Term | Meaning in this project |
|---|---|
| Node.js | Runs the JavaScript automation tools on your computer. |
| npm | Installs the exact JavaScript packages recorded by this repository. |
| WebdriverIO | The JavaScript test runner that starts each test session. |
| Appium | A local server that relays test actions to a mobile app. It is not an AI service and does not provide hosted devices. |
| Appium driver | The Android (`UiAutomator2`) or Apple (`XCUITest`) component that connects Appium to that platform. |
| Android SDK / Xcode | The official Android or Apple tools used to control devices and virtual devices. |
| Emulator / simulator | A virtual Android phone or Apple device running on your computer. |
| APK / IPA / `.app` | APK is an Android build. IPA is normally an iPhone/iPad device or hosted-device build. An iOS simulator normally needs a simulator-compatible `.app` bundle. |
| Selector | A stable identifier used by a test to find a button, field, or other screen element. |
| Appium Inspector | A desktop viewer used to inspect the element hierarchy that Appium can see and verify selectors. |
| `.env` | A local, Git-ignored settings file; it may contain device details or secrets. |
| TestRail | An optional external test-case management service. |
| BrowserStack | An optional paid external service that runs uploaded apps on hosted devices. |
| CI | A repository job that runs the suite automatically. |

## 0. Check the project's rules

Before copying source, test data, logs, or screenshots anywhere, record what the
project permits:

- May application source be copied into this local repository?
- May the app binary and screenshots be uploaded to BrowserStack?
- May case titles and results be sent to TestRail?
- Which test accounts and environments are approved?
- Are third-party packages with optional AI features prohibited, or is only use
  of those features prohibited?

The local Appium path does not call an AI service. BrowserStack self-healing is
also set to `false` in both supplied WDIO configurations.

There is a stricter dependency-policy edge to review: the pinned
`@wdio/browserstack-service` currently includes
`@browserstack/ai-sdk-node` as a transitive package even when self-healing is
disabled. The service is therefore declared as an optional dependency. If
policy prohibits installing or running AI-related vendor code, plan to omit
optional packages during the later dependency install. Run that install only
after creating and entering the project copy in Step 1. Keep
`BROWSERSTACK=false` in this mode. Local Appium runs, local evidence, and offline
publisher contract checks remain available; BrowserStack and Test Observability
do not. Alternatively, have the project's security owner approve or replace
that integration first.

The committed manifest and lock file still name the optional BrowserStack
service and its transitive packages. If policy prohibits even those dependency
declarations, create a reviewed local-only manifest/lock or remove the optional
integration and regenerate the lock for that project. Any hosted vendor
capability also requires the project's normal service approval.

## 1. Get your own copy of the template

Do not install dependencies, create `.env` files, add app material, or edit
tests inside a shared checkout of this starter. First get a clean copy for the
actual project.

Download this template as a Zip and unzip it to an unused folder of your own,
normally named after the app (for example `example-app-automation`). Open that
folder and do every remaining step there.

The tools below need Node.js 20 or later. `npm` normally arrives with Node.js,
and Git records file history later if the project chooses to initialise it.
Check the core tools:

```bash
node --version
npm --version
git --version
```

The first line must report `v20` or a higher major version. The other two lines
must report a version rather than “command not found”. If a tool is missing,
install it through the organisation's approved software channel, then repeat
these checks. Do not use administrator workarounds that the organisation has
not approved.

On an unmanaged computer, use the official
[Node.js download](https://nodejs.org/en/download) and
[Git download](https://git-scm.com/downloads/) pages rather than a third-party
installer. Choose a supported Node.js LTS release whose major version is 20 or
higher. The visible success signal is still the three version commands above;
the rest of this guide does not depend on which approved installer supplied
them.

Once Node.js works, run the template's read-only readiness check from the folder
you unzipped:

```bash
node onboarding/check-prerequisites.js --platform core
```

It should report Node.js, npm, Git, and template structure as ready. `ripgrep`
is recommended for later searches but is not required.

Record the project setup so the decisions are documented. Copy
`onboarding/PROJECT-SETUP-TEMPLATE.md` to `app-map/PROJECT-SETUP.md` and fill it
by hand, recording `manual-only` as the authoring route and the project's
non-secret approval decisions. Do not store credentials, device identifiers, or
customer data there.

Creating a Git repository, adding a remote, and pushing it are separate project
decisions after the copy has been reviewed.

In your copy, copy the
[test-case worksheet](manual/TEST-CASE-WORKSHEET.md) to
`app-map/worksheets/<platform>-<section>.md` while designing a section, and use
the [review checklist](manual/REVIEW-CHECKLIST.md) before merging it.

## 2. Prepare the local tools inside the working copy

Node.js is already ready from Step 1. Decide which platform to prove first, then
run one read-only check from the working-copy root:

```bash
node onboarding/check-prerequisites.js --platform android
# or:
node onboarding/check-prerequisites.js --platform ios
```

The report separates ready items from items that need action. Work through one
missing item at a time in the order below.

### 2.1 Install and verify Appium

Appium is the local program that receives commands from WebdriverIO and passes
them to the app. It must remain running during a device test, but it is not
needed for documentation or offline contract checks.

This template pins Appium `2.19.0`, matching the Appium 2 execution model used
by the reference suite. Current unversioned driver releases target Appium 3, so
the compatible driver versions below are pinned as well. If
`appium --version` already prints `2.19.0`, keep that approved installation.
Otherwise, after receiving any required local-software approval:

```bash
npm install --global appium@2.19.0
appium --version
```

Success is exactly `2.19.0`. The
[Appium 2 installation reference](https://appium.io/docs/en/2.19/quickstart/install/)
explains the same global npm installation model. Do not use `sudo` or another
administrator workaround unless your organisation explicitly requires and
approves it.

A global install changes the `appium` command for every project run by this
user account. If another version is already installed for another project, do
not replace it without checking with that project's maintainer; use a separately
managed tool environment instead. The readiness checker reports a version
mismatch as an action, not permission to overwrite it.

Install only the connection driver for the first platform:

```bash
# Android only:
appium driver install uiautomator2@4.2.9
appium driver doctor uiautomator2

# iPhone/iPad only:
appium driver install xcuitest@9.10.5
appium driver doctor xcuitest

# Verify what is installed:
appium driver list --installed
```

Success is an installed-driver list containing `uiautomator2` for Android or
`xcuitest` for iPhone/iPad. The relevant doctor command must report no required
fixes before the first device session; optional recommendations can be reviewed
under the project's normal tooling policy. A driver is the platform-specific
component that allows Appium to communicate with that type of device.

Drivers are also shared through Appium's configured tool directory. If the list
already shows a different major version, do not uninstall it automatically:
confirm whether another project uses it, then have the maintainer approve a
separate Appium tool directory or the exact replacement.

### 2.2 Prepare the platform tools

For Android, install the organisation-approved
[Android Studio/SDK](https://developer.android.com/studio/install.html) and a
compatible Java Development Kit. Android Studio provides the SDK, `adb` device
command, and Device Manager used to create a virtual Android phone. Verify:

```bash
java -version
adb version
```

Both commands must print version information. If they do not, use Android
Studio's SDK Manager or the organisation's software support process to complete
the installation before continuing.

The SDK also needs to be visible to terminal programs. In Android Studio, open
**Settings → Languages & Frameworks → Android SDK** and copy the exact
**Android SDK Location** shown there. In the same terminal that will run the
tests, replace the fictional path below with that location:

```bash
export ANDROID_HOME="/Users/your-name/Library/Android/sdk"
export ANDROID_SDK_ROOT="$ANDROID_HOME"
export PATH="$ANDROID_HOME/platform-tools:$PATH"
```

On macOS, `/usr/libexec/java_home` prints the active JDK location. If
`JAVA_HOME` is not already managed by the organisation, copy that printed value
into:

```bash
export JAVA_HOME="/exact/path/printed/by/java_home"
```

On Linux, obtain the JDK home from the approved JDK package or system
administrator; `/usr/libexec/java_home` is a macOS command.

These `export` commands affect only the current terminal. Use the
organisation-approved shell-profile process if they must persist after the
terminal closes. Repeat `java -version`, `adb version`, and the Android
readiness check; success is version output plus
`Android SDK environment: ... configured`.

For iPhone/iPad, this local route requires macOS and an
organisation-approved [Xcode installation](https://developer.apple.com/documentation/xcode).
Xcode provides the simulator and the Apple device tools. Open Xcode once so it
can finish installing required components, then verify:

```bash
xcodebuild -version
xcrun simctl list devices
```

The first command must print an Xcode version. The second must list available
simulated devices. A physical iPhone/iPad needs additional signing, trust, and
Developer Mode approval; use a simulator for the first test unless the project
specifically requires hardware.

Appium Inspector is an optional desktop viewer that displays the screen elements
Appium can address. It is useful when proving selectors later, but it is not
required to run offline checks.

### 2.3 Install this repository's packages

`npm ci` installs the exact dependency versions recorded by the selected
platform package. Run it only in your copy:

For a standard approved install, run `npm ci` in each platform directory. For
the strict local-only dependency set, run `npm ci --omit=optional`. These
commands must be run from `android/` or `ios/` inside your downloaded copy of
the template.

```bash
cd android                 # use ios for iPhone/iPad
npm ci                     # or: npm ci --omit=optional
cd ..
```

Success is completion without an `npm ERR!` line. BrowserStack and TestRail
accounts are not required for this local setup.

Rerun the relevant readiness check from the working-copy root:

```bash
node onboarding/check-prerequisites.js --platform android
# or:
node onboarding/check-prerequisites.js --platform ios
```

At this stage the core tools, Appium, platform driver, platform tools, and npm
dependencies should report ready. A missing local `.env` file is expected until
Step 3, and this default check does not contact a device.

## 3. Prepare one virtual device, install the app, and configure it

Prove one emulator or simulator before trying a physical device or a hosted
service. This template runs a supplied app build; it does not compile the app.
Obtain the approved build and its environment—such as QA or staging—from the
development or release team.

Use source only when the project allows it. `app-under-test/` is ignored by Git,
but that is not a security boundary.

The suite needs the app's technical launch identity:

- Android uses a **package** (the app identifier) and an **activity** (the
  screen Android launches first).
- iPhone/iPad uses a **bundle ID** (the app identifier).
- A **UDID** is the identifier of the selected physical or virtual device.

These are configuration values, not credentials. Derive them from approved
source or a running build rather than guessing.

### 3.1 Android emulator and APK

1. Open Android Studio.
2. Open **Tools → Device Manager**. From the welcome screen this may be under
   **More Actions → Virtual Device Manager**.
3. Select **Create Virtual Device**, choose an approved phone profile, choose or
   download the Android system image required by the project, and finish the
   wizard. A system image can require several gigabytes of download and disk
   space, so confirm the approved Android version and available capacity before
   starting that download.
4. Use the triangular **Run** control beside that device and wait until its home
   screen is usable.
5. From the working-copy root, list connected devices:

```bash
adb devices
```

Success is one row below the heading whose state is `device`, for example:

```text
emulator-5554    device
```

The first value is the emulator UDID. `offline` means it has not finished
starting. `unauthorized` applies to physical devices and must be approved on
that device. If more than one ready device is listed, use the intended UDID
with `adb -s` in every later command.

Install the approved APK, replacing both example values:

```bash
adb -s "emulator-5554" install -r "/absolute/path/Example-QA.apk"
```

Success is the final line `Success`. An `INSTALL_FAILED_...` result means the
build, Android version, CPU architecture, signature, or existing installation
needs resolving; do not continue with a different build unless its use is
approved. Open the app from the emulator and leave its first intended screen
visible.

With approved Android source, find the package and launcher from the
working-copy root:

```bash
rg -n "applicationId|namespace" app-under-test/android
rg -n "android.intent.action.MAIN|android.intent.category.LAUNCHER" app-under-test/android
```

`rg` means ripgrep, a text-search command. If it is not installed, use the
editor's **Find in Files** action for the same terms. To confirm the running
build instead, keep the app in the foreground and run:

```bash
adb -s "emulator-5554" shell dumpsys activity activities | rg "mResumedActivity"
```

The foreground component normally resembles
`com.example.app/.MainActivity`. Record the value before `/` as
`APP_PACKAGE`, the value after `/` as `APP_ACTIVITY`, and the chosen emulator
identifier as `APPIUM_UDID`.

### 3.2 iOS simulator and `.app` bundle

Local iOS automation requires macOS and full Xcode. An IPA built for an iPhone
or hosted device normally cannot be installed in a simulator; request a
simulator-compatible `.app` build when necessary.

1. Open **Xcode → Settings → Platforms** and ensure the project-approved iOS
   simulator runtime is installed. Some Xcode versions call this area
   **Components**.
2. Open **Xcode → Open Developer Tool → Simulator**.
3. In Simulator, use **File → Open Simulator** to select an approved iOS runtime
   and device. Wait for its home screen.
4. From the working-copy root, identify the booted simulator:

```bash
xcrun simctl list devices booted
```

Success is one intended device marked `(Booted)`. The long hyphenated value on
that line is its UDID. If several are booted, close the others or use the
intended UDID explicitly in every command below.

For an approved pre-built `.app`, read its bundle ID and install it:

```bash
/usr/libexec/PlistBuddy -c "Print :CFBundleIdentifier" \
  "/absolute/path/Example-QA.app/Info.plist"

xcrun simctl install "11111111-2222-3333-4444-555555555555" \
  "/absolute/path/Example-QA.app"

xcrun simctl launch "11111111-2222-3333-4444-555555555555" \
  "com.example.app"
```

Replace the example paths, UDID, and bundle ID. The first command prints the
bundle ID. A successful install returns to the prompt without an error; a
successful launch prints the bundle ID and a process number, and the app opens
in Simulator. If the approved source is built through Xcode instead, select the
same simulator as the run destination and use the bundle ID verified in the
project:

```bash
rg -n "PRODUCT_BUNDLE_IDENTIFIER|CFBundleIdentifier" app-under-test/ios
```

Record the verified value as `BUNDLE_ID` and the selected simulator identifier
as `APPIUM_UDID`. A physical iPhone/iPad additionally needs Developer Mode,
trust, signing, provisioning, and a working WebDriverAgent configuration. That
is a separate project-specific setup and is not the recommended first run.

### 3.3 Create the minimum local `.env`

From the working-copy root, create the local settings file only for the chosen
platform:

```bash
cp android/.env.template android/.env
# or:
cp ios/.env.template ios/.env
```

Open that `.env` file in the editor and replace the required placeholders:

| Android setting | Required local value |
|---|---|
| `APP_PACKAGE` | Verified package, such as `com.example.app`. |
| `APP_ACTIVITY` | Verified launch activity, such as `.MainActivity`. |
| `APPIUM_UDID` | Exact first-column identifier from the approved `adb devices` row. |
| `APP_DISPLAY_NAME` | Recommended human-readable name used in reports. |

| iOS setting | Required local value |
|---|---|
| `BUNDLE_ID` | Verified bundle ID, such as `com.example.app`. |
| `APPIUM_UDID` | Exact booted simulator UDID. |
| `APP_PATH` | Optional absolute `.app` path. Leave its placeholder unchanged when the app is already installed. |
| `APP_DISPLAY_NAME` | Recommended human-readable name used in reports. |

Keep `APPIUM_SERVER=http://127.0.0.1:4723`,
`BROWSERSTACK=false`, and `ALLOW_UNMAPPED_TESTRAIL_CASES=false` for now. Step 5
explains the explicit local-only exception for a team without TestRail. Account
values are required only if the selected section creates or signs into an
account. Hosted-service values are not required for a local test and may remain
as placeholders. Enter values as plain text after `=`; do not add shell quotes,
because quotes become part of the value.

Never commit `.env` or paste its contents into a ticket or chat. Verify the
configuration and selected device from the working-copy root:

```bash
node onboarding/check-prerequisites.js --platform android --probe-devices
# or:
node onboarding/check-prerequisites.js --platform ios --probe-devices
```

This check contacts the local device tools; Android may start its local `adb`
background process. Success is one available device plus a ready local
configuration. The checker reports variable names but never their values.

## 4. Map screens and selectors manually

Start from a clean or known app state and walk each intended test exactly as a
user would. Complete [app-map/APP-MAP.md](app-map/APP-MAP.md) as you go:

1. Name the starting state and required account/data.
2. Write every navigation action in order.
3. Record one positive landmark that proves each screen loaded.
4. Record permission dialogs, first-run prompts, loading states, and recovery
   routes.
5. Record both Android and iOS selectors where both platforms are supported.

Appium Inspector is a separate desktop application. Install it through the
organisation's approved software route if it is not already available. Its
[official installation page](https://appium.github.io/appium-inspector/latest/quickstart/installation/)
links the desktop downloads for macOS, Windows, and Linux. It starts an Appium
session solely for inspection; it does not write the test.

Start the local Appium server from any folder in one terminal and leave it
running:

```bash
appium
```

Success is a message showing that Appium is listening at
`http://0.0.0.0:4723` or `http://127.0.0.1:4723`. Leave this terminal open.

In Appium Inspector, create a new local session with:

| Connection field | Value |
|---|---|
| Remote host | `127.0.0.1` |
| Remote port | `4723` |
| Remote path | `/` |
| SSL | off |

Use the Android capabilities below, replacing the package, activity, and UDID
with the values in `android/.env`:

```json
{
  "platformName": "Android",
  "appium:automationName": "UiAutomator2",
  "appium:udid": "emulator-5554",
  "appium:appPackage": "com.example.app",
  "appium:appActivity": ".MainActivity",
  "appium:noReset": true
}
```

Use these capabilities for an app already installed in the iOS simulator,
replacing the bundle ID and UDID with values from `ios/.env`:

```json
{
  "platformName": "iOS",
  "appium:automationName": "XCUITest",
  "appium:udid": "11111111-2222-3333-4444-555555555555",
  "appium:bundleId": "com.example.app",
  "appium:noReset": true
}
```

If the approved iOS app is not installed, add an `appium:app` capability whose
value is the absolute path to its simulator-compatible `.app` bundle. Do not
point a simulator session at a device-only IPA.

Select **Start Session**. Success means:

1. the app opens on the chosen virtual device;
2. Inspector shows a screenshot and element hierarchy;
3. selecting an element shows its attributes; and
4. Inspector's element search, using the proposed strategy and value, finds the
   intended element on the named build.

Navigate to each relevant screen, refresh the hierarchy, and record the proven
selector in the app map. Stop the Inspector session before running the
WebdriverIO test so the test can own the device session; the Appium server
terminal can remain running.

For Android, a local XML snapshot—text describing the current screen
elements—can also be collected without sending it to a hosted service:

```bash
adb -s "emulator-5554" shell uiautomator dump /sdcard/window.xml
adb -s "emulator-5554" pull /sdcard/window.xml /tmp/android-window.xml
```

For iOS, Xcode's Accessibility Inspector can provide an additional local view
of accessibility properties, but prove the final selector through Appium
Inspector or the focused test because that is the interface the suite uses.

Choose selectors in this order:

1. accessibility identifier/content description: `~identifier` — a stable
   label deliberately exposed by the app;
2. Android resource ID: `#resource_id` — an identifier assigned in the Android
   interface code;
3. Android UiSelector: `android=...` — an Android-specific element query;
4. XPath: `//...` — a path through the screen hierarchy, used only when no
   stable semantic selector exists. The supplied iOS driver
   supports accessibility IDs and XPath; it does not add predicate or class
   chain prefixes.

The template's short selector notation translates to Inspector searches as
follows:

| Section value | Inspector strategy | Inspector search value |
|---|---|---|
| `~profile-tab` | Accessibility ID | `profile-tab` |
| `#profile_tab` on Android | ID | `com.example.app:id/profile_tab` (use the real package) |
| `android=new UiSelector().text("Profile")` | Android UIAutomator | `new UiSelector().text("Profile")` |
| `//XCUIElementTypeStaticText[@name="Profile"]` | XPath | the complete XPath |

The `~`, `#`, and `android=` prefixes belong to this repository's section
files; omit those prefixes when entering the corresponding raw search value in
Inspector.

Do not infer selectors from visible wording alone. Prove each one against the
running build and record it in the app map before using it in a test. A selector
is proven when it consistently finds the intended element—and not another
element—on the named build and starting state. Repeat the search after leaving
and returning to the screen; a single accidental match is not sufficient.

## 5. Map the manual cases

TestRail is not needed to prove a test locally. Choose one of the two routes
below and record the decision in the worksheet.

### 5.1 The team uses TestRail

Export the relevant approved cases to `testrail-import/` and read them yourself.
For each proposed automated section, make a copy of the worksheet:

```bash
cp manual/TEST-CASE-WORKSHEET.md \
  app-map/worksheets/android-profile.md
```

Fill that copied worksheet with:

- exact `C###` case ID;
- title and preconditions;
- required test data;
- action/assertion sequence;
- section key and execution order;
- cleanup or Cancel boundary;
- supported platform(s).

Do not invent a case ID. When there is no matching case, create or approve the
manual TestRail case through the team's normal process before wiring
publication.

### 5.2 The team does not use TestRail yet

The suite has an explicit escape hatch for local design and device runs. In the
chosen platform's `.env`, set:

```dotenv
ALLOW_UNMAPPED_TESTRAIL_CASES=true
BROWSERSTACK=false
```

In the new section, give each unmapped case an explicit reviewed local label.
Use uppercase letters, numbers, and hyphens, beginning with `LOCAL-`, for
example:

```js
const CASES = {
  profileHeading: "LOCAL-PROFILE-HEADING",
};
```

Do not put in a made-up numeric ID or leave a placeholder. During a local run,
the explicit label is reported in the test title. In the worksheet, record the
same value as `LOCAL-PROFILE-HEADING (local-only)` and still document the exact
proposed behaviour, preconditions, steps, and expected result.

This mode is deliberately local-only. It cannot be used for BrowserStack matrix
runs, CI publication, or a live TestRail write. Setting `BROWSERSTACK=true`
disables the escape hatch, so the run stops until every selected test has a
real verified `C###`. When the team assigns one, replace the `LOCAL-*` label in
`CASES`, update the worksheet, and return
`ALLOW_UNMAPPED_TESTRAIL_CASES=false` before enabling hosted execution.

## 6. Hand-code a section

Tests are ordinary JavaScript files written and reviewed by hand. There is no
code-generation command. You do not need to rewrite the test framework, but you
do need to understand the small set of concepts used in a section:

| Concept | Purpose |
|---|---|
| Section | One feature-sized file, such as `profile.js`, containing related tests. |
| `CASES` | Real TestRail IDs, or explicit reviewed `LOCAL-*` labels in the local-only mode from Step 5.2. |
| `SELECTORS` | The verified element addresses recorded in the app map. |
| `module.exports` | Makes the section available to the platform's main `test.js`; keep the supplied function shape. |
| `shouldRunSection()` | Prevents this section from registering when another focused section was requested. |
| `it()` | Defines one independently reported behaviour and its title. |
| `async` / `await` | Waits for each device action to finish before the next action begins. |
| `step()` | Gives a meaningful label to an action or assertion in logs and failure evidence. |
| `waitFor$()` | Polls for a verified selector instead of guessing how long the screen needs. |
| `assert` | Compares the observed app result with the expected result and fails the test when they differ. |

Start with one short, read-only behaviour. From the working-copy root, copy the
nearest platform example:

```bash
cp android/sections/example.js android/sections/profile.js
# or:
cp ios/sections/example.js ios/sections/profile.js
```

Then edit only the new file:

1. Keep its filename and section key lowercase and hyphenated when several words
   are needed, such as `saved-items`.
2. Remove the copied example behaviour that does not belong to this feature.
3. Replace the `CASES` values with verified `C###` IDs, or explicit reviewed
   `LOCAL-*` labels only under Step 5.2's local-only setting.
4. Replace every selector with one proven during inspection.
5. Change the section key passed to `shouldRunSection()`.
6. Write each user action and assertion explicitly.

This Android example opens Profile and checks its heading. The selector names
and expected text are illustrative; replace them with evidence from the real
app:

```js
const assert = require("assert");
const TIMINGS = require("../lib/timings");

const CASES = {
  profileHeading: "LOCAL-PROFILE-HEADING",
};
const SELECTORS = {
  profileTab: "~profile-tab",
  profileHeading: "~profile-heading",
};
const EXPECTED_HEADING = "Profile";
const TEXT_ATTRIBUTE = "text";

module.exports = function registerProfile(ctx, helpers, deps) {
  const { caseId, selector, shouldRunSection, step } = deps;
  const { waitFor$ } = helpers;
  if (!shouldRunSection("profile")) return;

  const profileCase = caseId(
    "TESTRAIL_CASE_PROFILE_HEADING",
    CASES.profileHeading,
  );
  const profileTab = selector("PROFILE_TAB_SELECTOR", SELECTORS.profileTab);
  const profileHeading = selector(
    "PROFILE_HEADING_SELECTOR",
    SELECTORS.profileHeading,
  );

  it(`${profileCase} User can open the profile screen`, async function () {
    await step("Open profile", async () => {
      await (await waitFor$(profileTab)).click();
    });

    await step("Verify the Profile heading", async () => {
      const heading = await (
        await waitFor$(profileHeading, TIMINGS.TIMEOUT.SCREEN_LOAD)
      )
        .getAttribute(TEXT_ATTRIBUTE);
      assert.strictEqual(
        heading,
        EXPECTED_HEADING,
        `Expected heading "${EXPECTED_HEADING}", received "${heading}"`,
      );
    });
  });
};
```

### Common hand-written actions

These are the small building blocks used inside an `it()` test. Replace every
selector and value with reviewed project evidence; do not copy the fictional
names into a real section.

```js
// Wait for a button, then tap it.
await (await waitFor$(SELECTORS.continueButton)).click();

// Replace the contents of a field. Mark secrets so their value is hidden in logs.
await (await waitFor$(SELECTORS.password)).setValue(password, {
  sensitive: true,
});

// Read visible content and compare it exactly.
const message = await (await waitFor$(SELECTORS.message)).getAttribute("text");
assert.strictEqual(message, "Saved");

// Dismiss a dialog only when it appears.
const dialog = await waitForOptional$(
  SELECTORS.permissionDialog,
  TIMINGS.TIMEOUT.QUICK,
);
if (dialog) await dialog.click();

// Swipe until a reviewed target becomes visible, then tap it.
const target = await scrollUntilVisible(SELECTORS.settings);
await target.click();

// Use the device's Back action, then prove the expected screen returned.
await ctx.driver.back();
await waitFor$(SELECTORS.homeHeading);
```

Add every helper used by the section to the destructuring line, for example:

```js
const {
  scrollUntilVisible,
  waitFor$,
  waitForOptional$,
} = helpers;
```

An action alone is not a complete test. After a tap, type, scroll, or Back
action, wait for and assert the visible result named in the worksheet.

In the iOS section, use `const TEXT_ATTRIBUTE = "label"` for static text or
`"value"` when the inspected element exposes its content there. Prove the
attribute against the live element rather than copying the Android value.
The first argument to `selector()` is an optional environment-variable override;
the second is the reviewed selector committed in the section. Normally edit the
second value and leave the override name stable.

Keep these rules:

- Wrap meaningful user actions and assertions in `step()`.
- Use `waitFor$` or `waitForOptional$`; do not add fixed long sleeps.
- Assert an observable outcome, not only that a tap succeeded.
- Keep credentials and unique data in environment variables.
- Make a retry safe; restore a known state where practical.
- Stop deletion, purchase, submission, and similar flows at Cancel unless the
  destructive action is explicitly approved and isolated.
- Use repeated `C### [1/2]` titles only when multiple tests genuinely form one
  existing TestRail case.

## 7. Register the section by hand

In the matching platform's `test.js`:

1. add the new key to `SECTION_KEYS`;
2. add a `require()` at the bottom of the `describe` block;
3. keep registration in dependency order.

Example:

```js
const SECTION_KEYS = ["account-setup", "profile", "example"];
```

```js
require("./sections/account-setup")(ctx, helpers, deps);
require("./sections/profile")(ctx, helpers, deps);
require("./sections/example")(ctx, helpers, deps);
```

Optionally add a convenience script to the matching `package.json`:

```json
"test:profile": "TEST_SECTIONS=profile wdio run wdio.conf.js"
```

Make the equivalent intentional edit in the other platform only when that
platform supports the behaviour. Do not blindly copy selectors between them.
Continue to run only the new section until every other registered starter
section has also been adapted or intentionally removed. `npm test` selects all
registered sections and will correctly reject unresolved starter values.

## 8. Validate without a device

From the working-copy root, find unfinished values in the app map, worksheet,
and section being reviewed. Replace the example paths with the selected
platform and section:

```bash
rg -n "__[A-Z0-9_]+__|TODO" \
  android/sections/profile.js \
  app-map/APP-MAP.md \
  app-map/worksheets/android-profile.md
```

This must print nothing for the adapted app map, worksheet, and section in both
the mapped and local-only routes. An explicit `LOCAL-*` case label is not a
placeholder. No selector, app identity, action, case label, or expected-result
placeholder may remain. Unselected starter sections and an unsupported platform
may still contain placeholders until they are deliberately adapted.

Check repository JavaScript while excluding installed packages:

```bash
find android ios ci onboarding -path '*/node_modules' -prune -o \
  -type f -name '*.js' -print0 | xargs -0 -n1 node --check
```

Run the offline publisher and report contract checks:

```bash
(cd android && npm run test:testrail)
(cd ios && npm run test:testrail)
node ci/report.self-test.js
node ci/workflow.self-test.js
node onboarding/check-prerequisites.self-test.js
```

Once all values required during module loading are filled, confirm Mocha can
register the intended tests without opening a device session:

```bash
(cd android && TEST_SECTIONS=profile npx --no-install mocha --dry-run test.js)
# or:
(cd ios && TEST_SECTIONS=profile npx --no-install mocha --dry-run test.js)
```

Read the listed title. It must begin with the verified `C###`, or with
`LOCAL-PROFILE-HEADING` when Step 5.2 is active. A passing dry run proves
registration and syntax, not the app behaviour.

When setting a selector override inline in zsh, quote values that begin with
`~`, for example `PROFILE_TAB_SELECTOR='~profile-tab'`; otherwise the shell
interprets the selector as a home-directory expression.

## 9. Prove one section locally

Confirm the virtual device and approved app prepared in Step 3 are still
available. Stop any open Appium Inspector session, then start Appium in a
separate terminal and leave it running:

```bash
appium
```

From another terminal, enter the working-copy root and run only the new section:

```bash
(cd android && TEST_SECTIONS=profile npm test)
# or:
(cd ios && TEST_SECTIONS=profile npm test)
```

Watch the device. Success is an exit without `npm ERR!`, a `PASS` for the
intended title, and a final summary with no failed test. A title beginning
`LOCAL-` confirms only a local draft; it is not a publishable TestRail mapping.
Confirm each step matches the worksheet, the assertion fails for the right
reason when the UI is wrong, retry is safe, and no test crosses an unapproved
destructive boundary.

Review the PNG/XML failure artifacts locally and remove sensitive test data
before sharing them.

If the focused test fails:

1. record the failed `step()` label, last selector, and error;
2. inspect the approved local screenshot and XML around that selector;
3. reproduce the same focused journey from a known state;
4. make the smallest change supported by the evidence;
5. rerun syntax/dry registration, then the focused section.

Do not turn a real failure green by deleting or weakening an assertion,
swallowing an error, or adding a long sleep. Increase a timeout only when the
evidence shows that timing is the cause.

## 10. Add approved hosted services

Only after the local section is stable:

1. replace every `LOCAL-...` mapping with a verified `C###`, set
   `ALLOW_UNMAPPED_TESTRAIL_CASES=false`, and repeat the focused local run;
2. install the optional service with `npm ci --include=optional`;
3. upload an approved APK/IPA to BrowserStack;
4. run one device and one section;
5. inspect session naming, video, annotations, and final status;
6. run the guarded TestRail smoke publisher against an approved disposable case;
7. confirm the correct `C###` result;
8. then enable the matrix and CI pipeline.

Hosted execution is optional for hand-authoring. The root
[README.md](README.md) contains the BrowserStack, TestRail, and Bitbucket
configuration. The local-only unmapped-case setting is never an alternative to
real TestRail IDs for BrowserStack or CI.

## Definition of done

A manually authored section is ready as a **local draft** only when:

- the app map and worksheet agree with the current build;
- every selector was proven on a real screen;
- every case has either a verified TestRail ID or the same reviewed
  `LOCAL-* (local-only)` label in its code and worksheet;
- the code contains an observable assertion;
- no active placeholder remains;
- syntax, offline contract tests, and dry registration pass;
- the targeted local run passes and an expected failure is diagnosable;
- secrets, source, binaries, screenshots, and customer data are untracked;
- a second person completes the manual review checklist.

It is ready for **BrowserStack, TestRail publication, or CI** only when every
selected test has a verified `C###`, no `LOCAL-...` title remains, the worksheet
records the mapping, and `ALLOW_UNMAPPED_TESTRAIL_CASES=false`.
