// ============================================================================
//  platforms/ios/pages/auth.page.js  —  iOS locators + steps for sign-in/launch.
// ============================================================================
//  A PAGE OBJECT describes HOW to do things on ONE platform. The matching spec
//  (specs/auth.spec.js) describes WHAT to test and is shared across platforms —
//  it calls these methods without knowing they're iOS.
//
//  Everything marked __PLACEHOLDER__ is a selector you fill in from your app map
//  (docs/APP-MAP.md). iOS selector styles: ~accessibilityId, #name, //XCUIElement…
//  Find what's still unfilled any time with:  grep -rn "__" platforms/
// ============================================================================

module.exports = function createAuthPage(ctx, helpers, config) {
  const { waitFor$, waitForOptional$, expectVisible } = helpers;

  return {
    // Confirm the app launched to its first screen.
    async ensureLaunched() {
      // TODO: choose an element ALWAYS visible on the first screen
      // (a logo, a "Sign In" button, a landing title).
      await expectVisible("~__LANDING_ELEMENT__");
    },

    // Create a brand-new throwaway account. ctx.testEmail is unique per run.
    async signUp(email, password) {
      const openSignUp = await waitFor$("~__SIGN_UP_BUTTON__");
      await openSignUp.click();

      const emailField = await waitFor$("~__EMAIL_FIELD__");
      await emailField.setValue(email);

      const passwordField = await waitFor$("~__PASSWORD_FIELD__");
      await passwordField.setValue(password, { sensitive: true });

      const submit = await waitFor$("~__SUBMIT_BUTTON__");
      await submit.click();
    },

    async signIn(email, password) {
      const emailField = await waitFor$("~__EMAIL_FIELD__");
      await emailField.setValue(email);
      const passwordField = await waitFor$("~__PASSWORD_FIELD__");
      await passwordField.setValue(password, { sensitive: true });
      const submit = await waitFor$("~__SIGN_IN_BUTTON__");
      await submit.click();
    },

    async signOut() {
      const menu = await waitForOptional$("~__ACCOUNT_MENU__");
      if (menu) await menu.click();
      const signOut = await waitForOptional$("~__SIGN_OUT_BUTTON__");
      if (signOut) await signOut.click();
    },

    // Assert we reached the signed-in home screen.
    async assertSignedIn() {
      await expectVisible("~__HOME_ELEMENT__");
    },
  };
};
