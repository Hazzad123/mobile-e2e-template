// ============================================================================
//  platforms/android/pages/auth.page.js  —  Android locators for sign-in/launch.
// ============================================================================
//  Android sibling of platforms/ios/pages/auth.page.js. Same METHOD names, same
//  shared spec (specs/auth.spec.js) — only the selectors differ.
//
//  Android selector styles: ~accessibilityId (contentDescription),
//  #resource_id (package prefix added for you), android=new UiSelector()…
//  The examples below use accessibility ids; swap to #resource_id where that's
//  the stabler locator in your app.
// ============================================================================

module.exports = function createAuthPage(ctx, helpers, config) {
  const { waitFor$, waitForOptional$, expectVisible } = helpers;

  return {
    async ensureLaunched() {
      // TODO: an element always visible on the first screen.
      await expectVisible("~__LANDING_ELEMENT__");
    },

    async signUp(email, password) {
      const openSignUp = await waitFor$("~__SIGN_UP_BUTTON__");
      await openSignUp.click();

      const emailField = await waitFor$("#__EMAIL_FIELD_ID__"); // e.g. #email_input (resource id)
      await emailField.setValue(email);

      const passwordField = await waitFor$("#__PASSWORD_FIELD_ID__");
      await passwordField.setValue(password, { sensitive: true });

      const submit = await waitFor$("~__SUBMIT_BUTTON__");
      await submit.click();
    },

    async signIn(email, password) {
      const emailField = await waitFor$("#__EMAIL_FIELD_ID__");
      await emailField.setValue(email);
      const passwordField = await waitFor$("#__PASSWORD_FIELD_ID__");
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

    async assertSignedIn() {
      await expectVisible("~__HOME_ELEMENT__");
    },
  };
};
