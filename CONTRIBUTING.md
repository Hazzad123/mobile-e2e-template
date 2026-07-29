# Automation maintainer guide

This repository supports two authoring routes:

- [MANUAL-WORKFLOW.md](MANUAL-WORKFLOW.md) for fully hand-written tests;
- [AI-GUIDED-WORKFLOW.md](AI-GUIDED-WORKFLOW.md) for approved Claude-assisted
  discovery and test writing.

Both produce ordinary JavaScript and use the same human review checklist.
Read [PROVENANCE.md](PROVENANCE.md) before adopting the starter in a restricted
project.

Before app adaptation, read `template-state.json`. App-specific source,
configuration, test authoring, dependency installation, and runs belong only
in a workspace marked `project-copy`; never perform them in the
`source-template`. Use the chosen workflow to make a safe separate copy first.

Preserve the execution model:

- WebdriverIO owns the Appium session.
- `@wdio/browserstack-service` owns the optional BrowserStack/Test Observability
  integration.
- `test.js` owns hooks, retries, recovery, summary generation, and session status.
- `scripts/run-browserstack-matrix.js` owns device processes and mandatory
  TestRail publishing.
- `ci/report.js` owns the final Bitbucket verdict.
- Android and iOS remain independent mirrored suites.

Before adding tests:

1. inspect approved app source or a live app locally;
2. update `app-map/APP-MAP.md`;
3. when the team uses TestRail, read the matching approved CSV in
   `testrail-import/`; otherwise record the explicit local-only mapping mode;
4. copy `manual/TEST-CASE-WORKSHEET.md` to
   `app-map/worksheets/<platform>-<section>.md` and complete the copy;
5. prefer accessibility IDs over XPath;
6. place selectors and verified `C###` IDs—or reviewed `LOCAL-*` labels for an
   explicitly local-only project—at the top of the platform section;
7. register sections in dependency order at the bottom of `test.js`.

Test rules:

- Wrap meaningful actions and assertions in `step()`.
- Use `waitFor$`; do not add arbitrary long sleeps.
- Make retries safe and tests independently recoverable where practical.
- Repeated `C###` titles intentionally merge into one TestRail result.
- `LOCAL-*` titles require `ALLOW_UNMAPPED_TESTRAIL_CASES=true` and may run
  locally only; BrowserStack, CI, and publication require verified `C###` IDs.
- Never confirm a destructive action unless explicitly required and isolated.
- Keep credentials and unique account domains in environment variables.
- Keep platform-specific behaviour in the matching platform tree.
- Keep BrowserStack self-healing disabled in projects that prohibit AI features.

Validation before handoff:

```bash
rg -n "__[A-Z0-9_]+__|TODO" android ios app-map -g '!.env.template'
find android ios ci onboarding -path '*/node_modules' -prune -o \
  -type f -name '*.js' -print0 | xargs -0 -n1 node --check
(cd android && npm run test:testrail)
(cd ios && npm run test:testrail)
node ci/report.self-test.js
node ci/workflow.self-test.js
node onboarding/check-prerequisites.self-test.js
node onboarding/create-project-copy.self-test.js
```

Unresolved placeholders are expected only while the repository is still being
adapted to a new app. Call them out clearly; never invent production selectors,
credentials, app IDs, or TestRail case IDs.
