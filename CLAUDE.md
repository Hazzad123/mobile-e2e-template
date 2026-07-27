# AI Guide — how to set up this test suite for a new app

**You are an AI assistant helping a tester who may know nothing about Appium,
CI/CD, BrowserStack or TestRail.** Follow this flow. Go one step at a time,
verify each step worked before moving on, and explain every technical term in
one plain sentence the first time you use it. Every step here has a manual
fallback in `README.md`, so a human can do it without you.

This file works for any AI tool. Read `AGENTS.md`-style detail below, then drive.

---

## Ground rules

- **One step at a time.** Never batch. After each step, check it worked (run the
  command yourself if you can, or ask the tester what they saw).
- **The app map is the source of truth.** Selectors in page objects must agree
  with `app-map/APP-MAP.md`. When you discover a new selector, write it back
  there.
- **Keep secrets out of git.** Credentials go in `.env` (local) or Bitbucket
  repository variables (CI) — never in `automation.config.js` or any committed
  file.
- **Never invent selectors.** Read them from source or a live UI dump. If only a
  fragile XPath exists, say so and suggest the app team add an accessibility id.

---

## The flow

### 1. Greet and scope
Ask, one at a time:
- Which app is this? (name)
- Which platforms — iOS, Android, or both?
- Do they already have **BrowserStack** access (a cloud device farm) and
  **TestRail** access (a test-case manager)? If not, point them at the relevant
  README section and continue with whatever they have.

### 2. Fill in the app's identity
Open `automation.config.js`. Help them set `appName`, `ios.bundleId` /
`android.appPackage`, and the `devices` list. Explain: a *bundle id/package* is
the app's unique id; *devices* are the phones to test on. Everything left to fill
in can be found with `grep -rn "__" .`.

### 3. Get a build onto BrowserStack
They need a `bs://…` URL (BrowserStack's id for an uploaded app build).
- If they have a `.apk`/`.ipa`: `npm run upload -- --file <path>` prints the URL.
- Otherwise: upload via the App Automate dashboard (see README).
Save the URL(s) — they'll paste them when running the pipeline.

### 4. Read what they dropped in
Ask them to copy their app source into `app-under-test/ios` and/or
`app-under-test/android`, and (optionally) a TestRail CSV into `testrail-import/`.
Then read it:
- From source: extract the bundle id/package (confirm step 2), accessibility ids
  (`~`), resource ids (`#`, Android), and the navigation between screens.
- From the CSV: learn existing `C###` case ids and how cases group into sections.
- If there's no source: map screens live — run one section, or dump the UI
  hierarchy (README → "Finding selectors without source").

### 5. Build the app map
Create/refresh `app-map/APP-MAP.md` following its template: every screen, how you
reach it, its key elements with iOS + Android selectors, and any state/auth
prerequisites. **Show it to the tester to sanity-check before writing any code.**

### 6. Propose a test plan (sections)
From the app map + CSV, propose a set of sections (e.g. `auth`, `onboarding`,
`search`, `settings`, `checkout`) mapped to `TEST_SECTIONS` keys. `auth` is the
always-first section. **Confirm the plan with the tester before coding.**

### 7. Ask how they want TestRail organised
Only structural choices — write the answers into `automation.config.js`
`testrail`:
- plan naming (`planNamePattern`) and whether it's reused (`planStructure:
  "periodic"`) or fresh per run (`"per-run"`);
- one run per device (`runGrouping: "per-device"`, needs TestRail
  Configurations) or one merged run (`"single"`);
- which project/suite (`projectId`/`suiteId`, or repo variables).

### 8. Generate page objects + specs, one section at a time
For each section, starting with `auth`:
1. Fill in the per-platform page object(s) in `platforms/<platform>/pages/` using
   selectors straight from the app map. Explain each in plain language.
2. Write/adjust the shared spec in `specs/`. Put the TestRail `C###` id in each
   `it()` title.
3. Register it: add `{ key, spec }` to `sections` in `automation.config.js`.
4. Dry-run just that section locally or on one device, fix, then move on.

### 9. Set the Bitbucket repository variables
Walk them through Repo settings → Pipelines → Repository variables (list in
README). These are the only secrets the pipeline needs.

### 10. Dry run, read the verdict, then scale up
Run the pipeline with one `bs://` URL and `TEST_SECTIONS=auth` first. Help them
read the result: **Bitbucket verdict step → BrowserStack video → TestRail**.
Once green, run `TEST_SECTIONS=all`.

---

## How this repo is wired (facts you need)

**Two config files:** `automation.config.js` = your app's facts (committed);
`.env` = your machine + secrets (git-ignored). Env vars override the config.

**Shared core, per-platform pages.** `core/` is the engine — don't edit it.
Specs (`specs/*.spec.js`) say *what* to test and are platform-agnostic. Page
objects (`platforms/<platform>/pages/*.page.js`) say *how* — one per platform,
same method names. The runner loads the active platform's page objects and passes
them to specs as `pages`.

**A spec looks like:**
```js
module.exports = function register(ctx, { pages, helpers, deps }) {
  const { config, step } = deps;
  it("C123 Does the thing", async function () {
    this.timeout(Math.round(TIMINGS.TEST.TWO_MINUTES * config.timeoutMultiplier));
    await step("Do the thing", () => pages.myfeature.doThing());
  });
};
```

**A page object looks like:**
```js
module.exports = function createMyFeaturePage(ctx, helpers, config) {
  const { waitFor$, expectVisible } = helpers;
  return {
    async doThing() {
      const btn = await waitFor$("~doThingButton"); // from the app map
      await btn.click();
    },
  };
};
```

**Selector syntax** (`helpers.waitFor$`, `driver.$`):
`~accessibilityId` → `#resourceId` (Android) / `#name` (iOS) → `android=`/`ios=`
query → `//xpath` (last resort). `driver.$` returns a null-object on a miss
(never throws) — check `await el.isExisting()` for optional elements; use
`waitFor$` when required.

**Invariants (don't break these):**
1. Throwaway account per run — `ctx.testEmail` (from `testAccount.emailPattern`).
   Never rely on pre-seeded credentials.
2. The `auth` section is `alwaysRun: true` so any subset runs standalone.
3. Every `it()` title starts with its TestRail `C###` id.
4. Wrap meaningful actions in `step(...)` so logs and failure reports are readable.
5. Never hardcode millisecond waits — use `core/timings.js`, and scale
   `this.timeout()` by `config.timeoutMultiplier`.

**Adding a section = 3 edits:** a spec in `specs/`, a page object per platform in
`platforms/*/pages/`, and one line in `automation.config.js` `sections`.

**Commands:** `npm test` (local, platform from `.env`) ·
`TEST_SECTIONS=auth npm test` (subset) · `npm run test:ci` (cloud matrix) ·
`npm run upload -- --file <binary>` (get a bs:// URL).
