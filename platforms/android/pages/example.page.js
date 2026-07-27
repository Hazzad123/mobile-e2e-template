// ============================================================================
//  platforms/android/pages/example.page.js  —  a template page object to copy.
// ============================================================================
//  Android sibling of platforms/ios/pages/example.page.js.
// ============================================================================

module.exports = function createExamplePage(ctx, helpers, config) {
  const { waitFor$, expectVisible } = helpers;

  return {
    async open() {
      const entry = await waitFor$("~__EXAMPLE_ENTRY__"); // TODO
      await entry.click();
    },

    async assertLoaded() {
      await expectVisible("~__EXAMPLE_SCREEN_TITLE__"); // TODO
    },
  };
};
