// ============================================================================
//  specs/example.spec.js  —  a template section to copy.
// ============================================================================
//  To add a new test area:
//    1. copy this file (e.g. specs/search.spec.js)
//    2. copy the page objects (platforms/*/pages/search.page.js) and fill in
//       selectors from your app map
//    3. add a line to `sections` in automation.config.js:
//         { key: "search", spec: "specs/search.spec.js" }
//    4. run just it:  TEST_SECTIONS=search npm test
// ============================================================================

const TIMINGS = require("../core/timings");

module.exports = function registerExample(ctx, { pages, deps }) {
  const { config, step } = deps;

  it("C0003 Example: the feature screen loads", async function () {
    this.timeout(Math.round(TIMINGS.TEST.TWO_MINUTES * config.timeoutMultiplier));
    await step("Open the feature screen", () => pages.example.open());
    await step("Verify the screen loaded", () => pages.example.assertLoaded());
  });
};
