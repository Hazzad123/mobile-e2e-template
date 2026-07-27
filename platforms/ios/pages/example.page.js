// ============================================================================
//  platforms/ios/pages/example.page.js  —  a template page object to copy.
// ============================================================================
//  Copy this file to make a new page (e.g. search.page.js), fill in the
//  selectors from your app map, then write a matching spec in specs/ and add a
//  line to `sections` in automation.config.js.
// ============================================================================

module.exports = function createExamplePage(ctx, helpers, config) {
  const { waitFor$, expectVisible } = helpers;

  return {
    // Navigate to the screen this section tests.
    async open() {
      const entry = await waitFor$("~__EXAMPLE_ENTRY__"); // TODO: the button/tab that opens the screen
      await entry.click();
    },

    // Confirm the screen actually loaded.
    async assertLoaded() {
      await expectVisible("~__EXAMPLE_SCREEN_TITLE__"); // TODO: a title/element unique to the screen
    },
  };
};
