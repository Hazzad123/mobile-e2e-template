// ============================================================================
//  specs/auth.spec.js  —  the ALWAYS-FIRST section: launch + sign-in.
// ============================================================================
//  A SPEC describes WHAT to test in plain steps. It is platform-agnostic: it
//  calls pages.auth.* methods, and the engine has already loaded the iOS or
//  Android version of that page object. Because this section is marked
//  alwaysRun in automation.config.js, it runs before every subset — so any
//  other section can assume a launched, signed-in app.
//
//  TestRail case ids live in the test titles (the "C0001" bits). Replace them
//  with your real case ids so results publish to the right cases.
// ============================================================================

const TIMINGS = require("../core/timings");

module.exports = function registerAuth(ctx, { pages, deps }) {
  const { config, step } = deps;

  it("C0001 App launches to its first screen", async function () {
    this.timeout(Math.round(TIMINGS.TEST.ONE_MINUTE * config.timeoutMultiplier));
    await step("App is on its first screen", () => pages.auth.ensureLaunched());
  });

  it("C0002 New user can sign up and reach the home screen", async function () {
    this.timeout(Math.round(TIMINGS.TEST.TWO_MINUTES * config.timeoutMultiplier));
    await step("Sign up a throwaway account", () => pages.auth.signUp(ctx.testEmail, ctx.testPassword));
    await step("Land on the signed-in home screen", () => pages.auth.assertSignedIn());
  });
};
