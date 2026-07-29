# Android suite

This directory is a complete WDIO/Appium package. WebdriverIO creates the
UiAutomator2 session; `lib/driver.js` wraps its browser API; the BrowserStack
service attaches Test Observability.

Choose the root [manual workflow](../MANUAL-WORKFLOW.md) or the approved
[Claude-guided workflow](../AI-GUIDED-WORKFLOW.md) before adapting this suite.
Run the commands below only in a folder whose root `template-state.json` says
`project-copy`. New Claude users can open the source template and type
`help me get started`; Claude will first create that separate working copy,
then check Android tooling and guide setup.

From the project-copy root, check readiness first:

```bash
node onboarding/check-prerequisites.js --platform android
```

Then, from the `android/` directory:

```bash
cp .env.template .env
# Fill only verified local values; the root workflow explains each one.
npm ci
npm run test:testrail
TEST_SECTIONS=your-adapted-section npx mocha --dry-run test.js
```

Do not run `account-setup`, `example`, or all tests while starter placeholders
remain. After one section has been mapped, hand-written or Claude-written, and
the dry registration passes, start `appium` in a separate terminal and run:

```bash
TEST_SECTIONS=your-adapted-section npm test
```

For a strict manual-only local install that must exclude BrowserStack's optional
vendor package, use `npm ci --omit=optional` and keep
`BROWSERSTACK=false`. See the root manual workflow for the policy distinction.

Selector forms:

- `~id` accessibility/content-description
- `#id` Android resource ID (package prefix is automatic)
- `android=...` UiSelector
- XPath

Change BrowserStack coverage in `lib/devices.js`. CI can override it with:

```bash
BS_ANDROID_MATRIX="Google Pixel 10@16.0,Google Pixel 9@15.0"
BS_MATRIX_CONCURRENCY=1
```

See the root README for TestRail, BrowserStack, pipeline, and setup details.
