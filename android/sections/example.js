const TIMINGS = require("../lib/timings");

const CASES = {
  example: "C__TESTRAIL_CASE_ID_EXAMPLE__",
};

const SELECTORS = {
  navigation: "~__EXAMPLE_NAV_ACCESSIBILITY_ID__",
  content: "~__EXAMPLE_CONTENT_ACCESSIBILITY_ID__",
  sensitiveAction: "~__EXAMPLE_SENSITIVE_ACTION_ACCESSIBILITY_ID__",
  cancel: "~__EXAMPLE_CANCEL_ACCESSIBILITY_ID__",
};

// A worked pattern: one TestRail case split across ordered checks. TestRail
// merges repeated C### titles and failure wins over pass/skip.
module.exports = function registerExample(ctx, helpers, deps) {
  const { caseId, selector, shouldRunSection, step } = deps;
  const { scrollUntilVisible, waitFor$, waitForOptional$ } = helpers;

  if (!shouldRunSection("example")) return;

  const exampleCase = caseId("TESTRAIL_CASE_EXAMPLE", CASES.example);
  const navSelector = selector("EXAMPLE_NAV_SELECTOR", SELECTORS.navigation);
  const contentSelector = selector("EXAMPLE_CONTENT_SELECTOR", SELECTORS.content);

  async function ensureExampleScreen() {
    if (await waitForOptional$(contentSelector, TIMINGS.TIMEOUT.QUICK)) return;
    await (await waitFor$(navSelector)).click();
    await waitFor$(contentSelector, TIMINGS.TIMEOUT.SCREEN_LOAD);
  }

  it(`${exampleCase} [1/2] User can open the example screen`, async function () {
    await step("Open the example screen", ensureExampleScreen);
    await step("Verify its primary content", async () => {
      await waitFor$(contentSelector);
    });
  });

  it(`${exampleCase} [2/2] User can cancel a sensitive action`, async function () {
    await step("Return to the example screen", ensureExampleScreen);

    await step("Find and open the sensitive action", async () => {
      const action = await scrollUntilVisible(
        selector("EXAMPLE_SCROLL_TARGET_SELECTOR", SELECTORS.sensitiveAction),
      );
      await action.click();
    });

    // Deliberately cancel. Templates should never confirm deletion, purchase,
    // submission, or another irreversible action without explicit test scope.
    await step("Cancel without confirming", async () => {
      await (await waitFor$(selector("EXAMPLE_CANCEL_SELECTOR", SELECTORS.cancel))).click();
    });

    await step("Verify the example screen remains usable", async () => {
      await waitFor$(contentSelector);
    });
  });
};
