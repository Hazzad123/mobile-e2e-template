// ============================================================================
//  automation.config.js  —  THE ONE FILE YOU EDIT TO POINT THIS AT YOUR APP
// ============================================================================
//
//  Everything specific to YOUR app lives here and nowhere else. The engine in
//  core/ reads from this file — you should never need to edit anything in core/.
//
//  HOW TO USE THIS FILE
//  --------------------
//   1. Replace every __PLACEHOLDER__ with a value for your app. Each one has a
//      made-up example in the comment beside it so you can see the shape.
//   2. To see everything still left to fill in, search the repo for two
//      underscores at any time:      grep -rn "__" .
//   3. SECRETS DO NOT GO IN THIS FILE. Passwords, API keys and access keys live
//      in Bitbucket "Repository variables" (see README.md). This file is
//      committed to git — never put a real credential in it.
//
//  Everything here is a DEFAULT. Any value also set as an environment variable
//  (locally) or a Bitbucket repository variable (in CI) overrides it at runtime.
// ============================================================================

module.exports = {
  // ── 1. Your app's identity ────────────────────────────────────────────────
  appName: "__APP_NAME__", // e.g. "Acme Shopper" — used in build & TestRail names

  ios: {
    // Bundle identifier of the QA build you upload to BrowserStack.
    // Find it in Xcode (target → General → Bundle Identifier) or the .ipa's Info.plist.
    bundleId: "__IOS_BUNDLE_ID__", // e.g. "com.example.acme.qa"

    // Device matrix: every device listed here runs IN PARALLEL on BrowserStack.
    // Names & versions must match BrowserStack exactly (App Automate → Devices).
    devices: [
      { device: "__IOS_DEVICE__", osVersion: "__IOS_OS_VERSION__" }, // e.g. { device: "iPhone 15", osVersion: "17" }
      // Add more { device, osVersion } lines to widen coverage.
    ],
  },

  android: {
    // Application id / package name of the QA build.
    // Find it in app/build.gradle (applicationId) or via: aapt dump badging app.apk
    appPackage: "__ANDROID_PACKAGE__", // e.g. "com.example.acme.qa"

    // Optional launch activity. Leave null to let Appium auto-detect; set it only
    // if the app won't launch (aapt dump badging → "launchable-activity").
    appActivity: null, // e.g. "com.example.acme.MainActivity"

    devices: [
      { device: "__ANDROID_DEVICE__", osVersion: "__ANDROID_OS_VERSION__" }, // e.g. { device: "Google Pixel 8", osVersion: "14.0" }
      // Add more { device, osVersion } lines to widen coverage.
    ],
  },

  // ── 2. Throwaway test account (created fresh every run) ─────────────────────
  // The suite signs up a brand-new account each run, so there's no manual data
  // setup and parallel devices never collide. {platform} and {timestamp} are
  // substituted at runtime to keep every email unique.
  testAccount: {
    emailPattern: "e2e-{platform}-{timestamp}@__EMAIL_DOMAIN__", // e.g. "...@example.com"

    // A password that satisfies your app's sign-up rules. This is a throwaway
    // account, not a real credential — but if you'd rather not commit it, leave
    // the placeholder and set the TEST_ACCOUNT_PASSWORD repository variable.
    password: "__TEST_PASSWORD__", // e.g. "Test1234!"
  },

  // ── 3. BrowserStack naming (how runs appear in the dashboard) ──────────────
  // Available tokens: {app} {platform} {osVersion} {device} {runLabel} {date} {sections}
  browserstack: {
    projectNamePattern: "{app} {platform}", // e.g. "Acme Shopper iOS"
    buildNamePattern: "{platform} {runLabel} {date}", // groups a run's devices into ONE build
    sessionNamePattern: "{device} / {platform} {osVersion} — {sections}",
    appiumVersion: "2.0.1", // Appium version BrowserStack should use
  },

  // ── 4. TestRail (the pipeline creates plans & runs automatically) ──────────
  // projectId / suiteId may be set here OR as repository variables (the variable
  // wins). The rest describes how plans and runs are named and grouped.
  testrail: {
    projectId: "__TESTRAIL_PROJECT_ID__", // e.g. 12 — or set the TESTRAIL_PROJECT_ID repo variable
    suiteId: null, // e.g. 34 — leave null for a single-suite project

    // "periodic" = one reusable plan per period, reused across runs.
    // "per-run"  = a fresh dated plan on every run.
    planStructure: "periodic",
    planPeriod: "monthly", // for "periodic": when a new plan starts — "monthly" or "weekly"

    // Plan-name tokens: {app} {month} {year} {date} {platform} {runLabel} {build}
    planNamePattern: "{app} {month} {year}", // e.g. "Acme Shopper July 2026"

    // "per-device" = one run per device (needs TestRail Configurations set up).
    // "single"     = one run holding every device's results (no Configurations needed).
    runGrouping: "per-device",
    runNamePattern: "{platform} {osVersion} - {device}", // e.g. "iOS 17 - iPhone 15"

    // How TestRail case IDs are embedded in a test's title. Default matches the
    // common "C123 My test name" convention; the engine reads every match.
    caseIdPattern: "C(\\d+)",

    // Timezone used to decide which month/week a periodic plan belongs to.
    timezone: "__TIMEZONE__", // e.g. "Europe/London" or "America/New_York"
  },

  // ── 5. Resilience knobs (sensible defaults — tune only if needed) ──────────
  resilience: {
    retries: 1, // auto-retry a failing test once before recording the result
    maxConsecutiveFailures: 5, // circuit breaker: abort a device after this many failures in a row
    recoverAfterFailure: true, // try to return to a known screen between tests
  },

  // ── 6. Sections (your test plan, in run order) ─────────────────────────────
  // Each entry maps a TEST_SECTIONS key to a spec file in specs/. From the
  // pipeline: TEST_SECTIONS="example" runs one, "all" runs everything.
  // The entry marked alwaysRun runs FIRST every time, so any subset can assume a
  // launched, signed-in app. Add a line here whenever you add a spec.
  sections: [
    { key: "auth", spec: "specs/auth.spec.js", alwaysRun: true }, // launch + sign-in
    { key: "example", spec: "specs/example.spec.js" },
    // { key: "search",   spec: "specs/search.spec.js" },
    // { key: "checkout", spec: "specs/checkout.spec.js" },
  ],
};
