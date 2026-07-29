const TIMINGS = require("../lib/timings");

const CASES = {
  launch: "C__TESTRAIL_CASE_ID_LAUNCH__",
  signUp: "C__TESTRAIL_CASE_ID_SIGN_UP__",
};

const SELECTORS = {
  welcome: "~__WELCOME_ACCESSIBILITY_ID__",
  signUpEntry: "~__SIGN_UP_ENTRY_ACCESSIBILITY_ID__",
  email: "#__SIGN_UP_EMAIL_RESOURCE_ID__",
  password: "#__SIGN_UP_PASSWORD_RESOURCE_ID__",
  submit: "#__SIGN_UP_SUBMIT_RESOURCE_ID__",
  home: "~__HOME_READY_ACCESSIBILITY_ID__",
};

// Always register account setup first. Replace this section if the app uses SSO,
// seeded accounts, or no authentication.
module.exports = function registerAccountSetup(ctx, helpers, deps) {
  const { caseId, config, selector, shouldRunSection, step } = deps;
  const { firstExisting$, waitFor$, waitForOptional$ } = helpers;

  if (!shouldRunSection("account-setup")) return;

  const launchCase = caseId("TESTRAIL_CASE_LAUNCH", CASES.launch);
  const signUpCase = caseId("TESTRAIL_CASE_SIGN_UP", CASES.signUp);
  const welcomeSelector = selector("WELCOME_SELECTOR", SELECTORS.welcome);
  const homeSelector = selector("HOME_READY_SELECTOR", SELECTORS.home);
  const emailPrefix = deps.requireValue("E2E_EMAIL_PREFIX");
  const emailDomain = deps.requireValue("E2E_EMAIL_DOMAIN");
  ctx.testEmail ||= `${emailPrefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@${emailDomain}`;

  it(`${launchCase} App launches and shows a known screen`, async function () {
    await step("Activate the app", async () => {
      await ctx.driver.activateApp(config.appId);
    });

    await step("Verify a signed-out or signed-in landmark is visible", async () => {
      const found = await firstExisting$(
        [welcomeSelector, homeSelector],
        TIMINGS.TIMEOUT.SCREEN_LOAD,
      );
      console.log(`[INFO] Launch landmark: ${found.selector}`);
    });
  });

  it(`${signUpCase} User can create a throwaway account`, async function () {
    this.timeout(Math.round(TIMINGS.TEST.TWO_MINUTES * config.timeoutMultiplier));

    if (await waitForOptional$(homeSelector, TIMINGS.TIMEOUT.QUICK)) {
      console.log("[INFO] App is already signed in; skipping sign-up for this no-reset session.");
      this.skip();
      return;
    }

    const signUpEntry = selector("SIGN_UP_ENTRY_SELECTOR", SELECTORS.signUpEntry);
    const emailSelector = selector("SIGN_UP_EMAIL_SELECTOR", SELECTORS.email);
    const passwordSelector = selector("SIGN_UP_PASSWORD_SELECTOR", SELECTORS.password);
    const submitSelector = selector("SIGN_UP_SUBMIT_SELECTOR", SELECTORS.submit);
    const password = deps.requireValue("E2E_TEST_PASSWORD");

    await step("Open sign-up", async () => {
      await (await waitFor$(signUpEntry)).click();
    });

    await step(`Enter unique email ${ctx.testEmail}`, async () => {
      await (await waitFor$(emailSelector)).setValue(ctx.testEmail);
    });

    await step("Enter password", async () => {
      await (await waitFor$(passwordSelector)).setValue(password, { sensitive: true });
    });

    await step("Submit sign-up", async () => {
      await (await waitFor$(submitSelector)).click();
    });

    await step("Verify the signed-in home screen", async () => {
      await waitFor$(homeSelector, TIMINGS.TIMEOUT.SCREEN_LOAD);
    });
  });
};
