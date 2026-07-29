# iOS suite

This directory is a complete WDIO/Appium package. WebdriverIO creates the
XCUITest session; `lib/driver.js` wraps its browser API; the BrowserStack service
attaches Test Observability.

Choose the root [manual workflow](../MANUAL-WORKFLOW.md) or the approved
[Claude-guided workflow](../AI-GUIDED-WORKFLOW.md) before adapting this suite.
You work in your downloaded copy of the template, so the commands below run
directly here. New Claude users can open Claude Code in that folder and type
`help me get started`; Claude will check iOS tooling and guide setup.

From the project root, check readiness first:

```bash
node onboarding/check-prerequisites.js --platform ios
```

Then, from the `ios/` directory:

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

Prefer `~accessibilityIdentifier`. XPath uses `XCUIElementType*` class names.
Set `APP_PATH` for a local simulator build, or leave it empty when the configured
bundle is already installed.

Change BrowserStack coverage in `lib/devices.js`. CI can override it with:

```bash
BS_IOS_MATRIX="iPhone 17@26.0,iPhone 16@18.0"
BS_MATRIX_CONCURRENCY=1
```

See the root README for TestRail, BrowserStack, pipeline, and setup details.
