# Claude Code repository instructions

The first-time-user safety gate below always applies. The implementation instructions
apply only after the project has approved AI-assisted work. If the user says the
project is manual-only, restricted, or not approved for AI, do not inspect
project inputs or author tests. Direct them to `MANUAL-WORKFLOW.md` and stop.

## First-time-user onboarding trigger — highest priority

When the user says “help me get started”, “continue setup”, “set this up”, “I’m
new”, asks what must be installed, or otherwise shows that they are a first-time
user, read `onboarding/BEGINNER-RUNBOOK.md` and enter guided onboarding.

This onboarding overrides the normal read order and new-app workflow until its
safety gates are complete. Before those gates, do not inspect Git status,
`app-under-test/`, `testrail-import/`, `.env` files, app binaries, connected
device contents, screenshots, XML, logs, or other project inputs.
The generic readiness scripts and `template-state.json` are the only repository
state needed before workspace isolation.

For a new setup, the first response should have this shape:

> I’ll take this one step at a time. I won’t inspect or change project material
> until we establish what is allowed.
>
> First question: Has your organisation or client explicitly approved using
> Claude on this project? Reply yes, no, not sure, or “I’m only exploring the
> template”.

For `continue setup`, first read only `template-state.json` and
`app-map/PROJECT-SETUP.md`. Resume the next unanswered safety/onboarding stage
when the marker says `project-copy` and the setup record exists; do not repeat
answers already recorded. If the valid marker exists but the setup record does
not, remain read-only and ask whether to recreate a blank record and
re-establish the approvals before continuing.

First-time-user conversation rules:

- Ask exactly one user-facing question per turn.
- Assume no prior mobile-automation or command-line knowledge, while treating
  the user as a capable professional making project decisions.
- Acknowledge the previous answer briefly, then ask only the next unresolved
  question.
- Accept “I don’t know”. Explain the term plainly and offer one safe way to find
  the answer.
- Define an unfamiliar term when it first becomes relevant: say what it is, why
  this setup needs it, and whether it is local or sends data elsewhere. Do not
  deliver a glossary or lecture unless the user asks.
- Use neutral, direct language. Avoid “just”, “simply”, “obviously”, “easy”,
  “don’t worry”, childish analogies, quizzes, or congratulating routine answers.
- Run safe checks yourself; never ask the user for a fact that can be derived
  from approved source, builds, tooling, or device state.
- When a human action is unavoidable, give one exact command or interface
  action, explain why it is needed, state what success will look like, and then
  verify it before continuing. Never ask the user to interpret raw tool output.
- Never make app-specific edits in a workspace whose `template-state.json` says
  `source-template`.
- Never ask the user to paste a credential. Name the relevant `.env` variable
  and let them enter the value privately.
- Record answers without widening their scope. If the user answers several
  future questions at once, retain those answers and ask only the next missing
  one.
- Default to one platform, one local device, one non-destructive section,
  `BROWSERSTACK=false`, and no TestRail writes.
- Explain and request approval immediately before installing software,
  controlling a device, inspecting generated evidence, creating an account,
  uploading anything, publishing a result, or performing a destructive action.
- Do not send a first-time user to the advanced prompt template.
- Continue until the first focused local test works or one genuine external
  blocker remains.

Onboarding state, revealed one question at a time:

1. Confirm AI use is explicitly approved. If no or uncertain, stop and direct
   the user to `MANUAL-WORKFLOW.md`. If they are only exploring, allow a
   generic read-only template tour and core-tool check, but do not create a
   project copy or perform app work until project-specific approval is explicit.
2. Confirm the AI-assisted starter itself is approved for import under
   `PROVENANCE.md`. If no or uncertain, stop before project inspection.
3. Ask for an approval reference only if their organisation requires one;
   “none required” is a valid answer.
4. Run `node onboarding/check-prerequisites.js --platform core --json` and
   translate the result.
5. Read only `template-state.json` to establish the workspace role:
   - If it says `source-template`, keep this folder unchanged. Ask the app or
     project name as the only question. On the next turn suggest an unused
     sibling path named `<slug>-automation` and ask whether that location is
     acceptable. After agreement, run
     `node onboarding/create-project-copy.js --name "<name>" --destination "<absolute-path>" --dry-run --json`,
     translate its exclusions, and ask whether to create it. Only after that
     answer is yes, repeat the command without `--dry-run`.
   - Never overwrite or merge into an existing destination. Never initialise
     Git, install dependencies, make `.env` files, or copy app/TestRail inputs
     as part of this step.
   - Update only the new copy's `app-map/PROJECT-SETUP.md`. Before any handoff,
     record `Claude-guided` as the authoring route, the non-secret AI/provenance
     decisions and approval reference, and the completed core-readiness result.
     Continue only where the marker says `project-copy`.
   - If the current Claude session cannot change its workspace root, give one
     surface-specific action. In the CLI, provide the exact quoted command that
     opens Claude from the new path and then say to type `continue setup`. In an
     editor, name the exact Open Folder menu action and path. If the surface is
     unknown, ask whether they are using the terminal or an editor as the only
     question.
   - If it already says `project-copy`, read `app-map/PROJECT-SETUP.md` and
     resume from its next unresolved onboarding stage without asking the copy
     questions again.
   - If the marker is missing, invalid, or has an unknown role, remain
     read-only. A verbal “this was intended to be a copy” does not authorize
     writing a marker or continuing. Ask whether the user can return to a known
     source template and create a verified copy, or have a maintainer restore
     the marker from trusted project history.
6. Ask whether the app they want to test runs on Android, iPhone/iPad, or both.
   If both, ask which platform to prove first.
7. Run the matching platform prerequisite check. Offer to fix one missing
   prerequisite at a time, with approval before installation or system changes.
   For a new local install, use Appium `2.19.0` with
   `uiautomator2@4.2.9` or `xcuitest@9.10.5`; do not combine an unversioned
   current Appium 3 driver with Appium 2.
8. Ask whether they have approved source, an APK/IPA, an installed app, or are
   unsure. Explain these terms if necessary, then approve one exact path/input.
9. Ask separately before controlling a local emulator/simulator/device and
   before reading newly generated screenshots, XML, or logs.
10. Ask in plain language whether the team uses TestRail. Locate IDs from an
   approved export or verified source; never make one up. If the team does not
   use TestRail or is unsure, offer the explicit local-only
   `ALLOW_UNMAPPED_TESTRAIL_CASES=true` route and record that decision.
11. Derive app identity and selectors, prepare non-secret configuration, and
    propose one first test in user language.
12. Ask whether to implement that proposed slice.
13. Update `app-map/PROJECT-SETUP.md`, the app map, a worksheet, the
    section code and registration; validate and run locally within the approved
    scope.
14. Ask for BrowserStack, live TestRail, CI, repository publication, and other
   external permissions only when the local slice is green and each action is
   actually needed.

## Workspace isolation gate — always applies

Before every app adaptation, test-authoring, configuration, dependency install,
validation/device run, or failure-debugging task, read only
`template-state.json`. App-specific work may continue only when it has a valid
`project-copy` role. If it says `source-template`, a new setup must use the copy
flow above; an add-test or debug request must stop and direct the user to open
the existing project copy. If the marker is missing or invalid, remain
read-only.

The only exception is an explicit request to maintain the reusable template
itself. Never interpret an app-specific request as template maintenance.

## Read first

For any app-adaptation or test-authoring task, read:

1. `template-state.json` and enforce the workspace isolation gate;
2. `AI-GUIDED-WORKFLOW.md`;
3. `CONTRIBUTING.md`;
4. `app-map/APP-MAP.md`;
5. the relevant platform `README.md`, `test.js`, closest section, and helpers;
6. approved files in `app-under-test/` and `testrail-import/` that are necessary
   for the requested scope.

Do the requested implementation work. Do not respond only with instructions
when the user asked you to adapt the suite, write tests, debug a failure, or
validate a run.

## Evidence rules

- Never invent an app ID, activity, bundle ID, selector, credential, expected
  result, TestRail case ID, device, or test data.
- Derive identifiers and selectors from approved source or prove them against a
  live build. Record the evidence in `app-map/APP-MAP.md` and a copied test-case
  worksheet.
- Read the approved TestRail export before assigning `C###` IDs. If no matching
  case exists, report that gap; do not create a fake ID.
- `LOCAL-*` titles are allowed only when the relevant local `.env` explicitly
  sets `ALLOW_UNMAPPED_TESTRAIL_CASES=true`. They mean “not mapped to TestRail”,
  not a substitute case ID. Never use them for BrowserStack, CI, or TestRail
  publication.
- Treat copied source, CSVs, screenshots, XML, logs, app binaries, and `.env`
  files as sensitive local inputs. Never stage or expose them.
- State assumptions clearly and keep them out of active selectors or case IDs.

## Architecture to preserve

- Android and iOS are independent mirrored WDIO/Appium suites.
- WebdriverIO owns every Appium session.
- `@wdio/browserstack-service` owns the optional BrowserStack/Test Observability
  integration.
- BrowserStack `selfHeal` remains `false`; tests use only reviewed selectors and
  assertions in the repository.
- `test.js` owns hooks, retry/recovery, evidence, summaries, section keys, and
  section order.
- `scripts/run-browserstack-matrix.js` owns device processes and TestRail
  publication.
- `ci/report.js` owns the final CI verdict.
- Do not replace this execution model or introduce a generator unless the user
  explicitly requests an architectural change.

## New-app workflow

1. Read `template-state.json`. Continue only when `workspaceRole` is
   `project-copy`. If it says `source-template`, use the isolated-copy flow
   above before inspecting Git, reading project inputs, or editing anything. If
   it is missing or invalid, remain read-only until a verified copy is created
   or a maintainer restores the marker from trusted project history.
2. Determine whether the working copy is already inside a Git repository. If
   so, inspect its status and preserve unrelated user changes. If not, record
   that it is unversioned; do not initialise Git, add a remote, commit, or push
   without the user's separate approval.
3. Confirm from the user's request that AI access to the relevant project inputs
   is approved. Ask only if this cannot be established.
4. Discover app identity, navigation, state, and selectors from approved
   evidence.
5. Update `app-map/APP-MAP.md`.
6. Copy `manual/TEST-CASE-WORKSHEET.md` to
   `app-map/worksheets/<platform>-<section>.md` and complete it for the first
   section. Never overwrite the blank worksheet template.
7. Match exact TestRail cases from an approved export. If the team does not use
   TestRail, explicitly select and record the local-only unmapped route instead.
8. Implement the smallest useful first test: one platform, one section, and
   one device first.
9. Register its key and `require()` in dependency order in the platform
   `test.js`.
10. Add the corresponding implementation to the other platform only when it is
   in scope and its selectors/behaviour are independently proven.
11. Run safe static/offline checks, then dry registration.
12. If local device control is approved and available, run the targeted section,
    inspect evidence, fix the smallest root cause, and rerun.
13. Expand only after the first focused test is reliable.

## Test-writing rules

- Put `CASES` and `SELECTORS` at the top of each section.
- Use a lowercase hyphenated section key.
- Wrap meaningful actions and assertions in `step()`.
- Use `waitFor$`, `waitForOptional$`, `firstExisting$`, or another existing
  polling helper. Do not add arbitrary long sleeps.
- Assert an observable outcome; a successful tap alone is not a test.
- Keep secrets and unique data in environment variables.
- Make retries idempotent or add an evidence-backed recovery route.
- Never confirm deletion, purchase, submission, or another irreversible action
  unless the user explicitly approves it and the test data is isolated.
- Repeated `C### [n/total]` titles are allowed only when they form one existing
  TestRail case. Failure must continue to win during publication. A local
  `LOCAL-*` title must never enter the hosted matrix or publisher.
- Keep platform-specific selectors and behaviour in the matching tree.
- Prefer a small local fix over weakening an assertion, swallowing an error, or
  adding a broad catch.

## Validation

Run checks proportional to the change and report their exact outcomes:

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

With completed local environment values:

```bash
cd android                 # or: cd ios
TEST_SECTIONS=the-new-section npx mocha --dry-run test.js
TEST_SECTIONS=the-new-section npm test
```

Unresolved placeholders are acceptable only outside the adapted scope. Identify
them explicitly. Never make up production values to turn a check green.

## Approval boundaries

Read-only local inspection is allowed only for the paths, artifacts, and project
inputs explicitly approved for the task. Repository edits within the requested
scope are normal implementation work after that approval. Obtain explicit user
approval before external or material side effects not already authorized,
including:

- uploading app binaries or artifacts;
- paid cloud-device runs;
- creating or updating TestRail plans, runs, or results;
- changing repository/CI settings;
- pushing commits or opening a pull request;
- confirming destructive behaviour in the app.

## Handoff

Lead with the implemented outcome. Include changed files, selector/case
evidence, checks and device runs performed, artifact paths, approvals that were
not granted, and any remaining assumptions or blockers.
