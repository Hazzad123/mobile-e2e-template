# Claude-guided workflow

Use this route only when the project's policy explicitly permits generative AI
to access the material involved. Claude Code can learn how the approved app
behaves, document its screens and journeys, match existing TestRail cases when
the team uses them, write the JavaScript tests, add them to the runnable suite,
and check the result. A person still approves scope, data access, destructive
actions, and the final test behaviour.

The result is the same ordinary JavaScript suite produced by the
[manual-only workflow](MANUAL-WORKFLOW.md). Claude does not need to be present
when the finished tests run, and another maintainer can continue the suite by
hand later.

The starter’s AI-assisted origin and the boundary for projects with stricter
software-origin or dependency rules are recorded in
[PROVENANCE.md](PROVENANCE.md).

## First-time start: type one sentence

If your downloaded copy of the template is already open in Claude Code, say:

> help me get started

If it is not open yet, open your downloaded copy in Claude Code first, then type
the same sentence. No prior mobile-testing knowledge is required. Do not fill
in a technical form, find device identifiers, install Appium, or edit private
settings files first.

If project policy is uncertain, open Claude before placing restricted app
source, exports, binaries, screenshots, or logs in the repository. Claude's
first question establishes whether it may inspect project material at all. All
app-specific work then happens in your downloaded copy of the template.

## What Claude does during onboarding

Claude reads `onboarding/BEGINNER-RUNBOOK.md` automatically and then:

1. asks one plain-language question at a time;
2. confirms in one question that AI use is approved for this project;
3. runs the local readiness checker itself;
4. explains missing tools without assuming prior knowledge;
5. offers to install or configure one required tool at a time, asking before it
   changes the machine;
6. creates the setup record `app-map/PROJECT-SETUP.md` so setup can resume;
7. helps locate material the project permits Claude to read, asking for the
   app’s source code first, then an installable Android (`.apk`) or iOS (`.ipa`)
   file, or an app already installed on an approved device;
8. confirms the platform, deriving it from the source where possible;
9. asks where the suite should run first: only locally, on BrowserStack, or in a
   pipeline, and keeps external targets off until a local test passes;
10. derives the technical app, device, and screen-element identifiers instead
    of asking the user to know them;
11. asks in ordinary language whether the team uses TestRail;
12. proposes one small, safe first test;
13. writes the test, adds it to the runnable suite, runs it, and fixes any
    evidence-backed failure after approval.

The automatic checker is:

```bash
node onboarding/check-prerequisites.js --platform core
```

Claude runs the Android or iOS form after learning which platform matters. It
does not print credential values or install anything.

The user sees a short explanation and one focused decision—not the raw
checklist or a wall of commands. “I don’t know” is a complete answer: Claude
will explain the relevant term, recommend a safe next step, or verify the fact
itself.

When a technical term first becomes relevant, Claude explains:

1. what the tool or concept does;
2. why it is needed at that point;
3. what Claude is about to inspect or change;
4. what visible result will prove it is ready.

For example, Appium is introduced as the local service that lets the JavaScript
test control an app on a phone or virtual phone. Its Android or iOS driver is
introduced separately as the platform adapter Appium needs. An emulator or
simulator is described as a virtual phone on the local computer. The user is
not quizzed on those names.

Claude records the non-secret setup decisions in `app-map/PROJECT-SETUP.md`, so
typing `continue setup` later resumes onboarding without repeating answered
questions. That record excludes credentials, device identifiers, and raw project
data.

## Safety defaults

First-time onboarding starts with:

- work confined to your downloaded copy of the template;
- one platform and one local device;
- BrowserStack, the optional cloud-device service, off;
- no TestRail publishing;
- no account creation unless separately approved;
- no destructive app actions;
- no upload, shared build-system change, Git push, or pull request.

Claude asks for these permissions later, individually and only when needed.
BrowserStack will not automatically replace a failed screen-element identifier;
that selector self-healing feature remains disabled.

Approved source may eventually be referenced under `app-under-test/`, and an
approved TestRail export under `testrail-import/`. Those locations are ignored
by Git but are not security boundaries. Claude will help with them after the
relevant approval rather than expecting a new user to prepare them.

When the team does not use TestRail, Claude sets `ALLOW_UNMAPPED_TESTRAIL_CASES=true`
in the local `.env` and uses `LOCAL-*` labels; TestRail publishing stays off.
See `CLAUDE.md` for the full evidence and TestRail rules.

## Advanced shortcut

Experienced users who already know all scope and policy answers may use
[ai/START-NEW-APP.md](ai/START-NEW-APP.md). It is an optional fast path, not the
first-time guided experience.

Returning users may use:

- [ai/ADD-SECTION.md](ai/ADD-SECTION.md) to implement more coverage;
- [ai/DEBUG-FAILURE.md](ai/DEBUG-FAILURE.md) to diagnose and fix a failing test.

## After onboarding: the first working test

For a new app, Claude should do the following work rather than merely describe
it:

1. confirm it is working in your downloaded copy of the template, not the shared
   repository;
2. inspect only the approved app/TestRail inputs that exist;
3. identify how the app launches, how the chosen journey works, and the stable
   screen-element identifiers the test will use;
4. operate or inspect the approved app when source code alone does not prove
   what appears at runtime;
5. update the generated `app-map/PROJECT-SETUP.md`;
6. fill `app-map/APP-MAP.md`;
7. create a completed worksheet at
   `app-map/worksheets/<platform>-<section>.md` from
   `manual/TEST-CASE-WORKSHEET.md`;
8. propose one non-destructive user behaviour and, when TestRail is in use, its
   exact existing `C###` case mappings;
9. write the Android and/or iOS section code;
10. add the section to `test.js` so the suite knows to run it, and add a short
    command for that focused test when useful;
11. check the JavaScript, unresolved placeholders, offline reporting code, and
    confirm that the test suite can load without contacting a device;
12. run the targeted local device test when that control is approved;
13. use approved failure screenshots, screen-element descriptions, and logs to
    correct element identifiers or timing;
14. report what is verified, what is assumed, and what remains blocked.

The first milestone is one behaviour passing on one approved device for one
platform. Claude reports the behaviour checked, exact device, focused command,
pass/fail result, whether app data changed, and whether anything left the local
machine. After reporting, **Claude stops and waits**. It does not propose the
next test, queue further work, or ask "shall I continue?" — the user leads.

If asked to "write all the tests", "do the whole suite", or "keep going until
it's done", Claude declines and explains: each test is proposed, approved, run,
and verified before the next is discussed. Batching removes the checkpoints that
make the quality guarantee work.

## Human review gate

Before Claude writes another test, a person checks:

- the app map matches the approved build;
- every screen-element identifier has source or observed-app evidence;
- every `C###` points to the intended TestRail case;
- assertions prove user-visible behaviour;
- account/data creation is safe and recoverable;
- sensitive or destructive flows stop at the agreed boundary;
- no source, secret, binary, screenshot, XML, or customer data is staged.

Use [manual/REVIEW-CHECKLIST.md](manual/REVIEW-CHECKLIST.md). The checklist
applies equally to AI-written and hand-written tests.

If any screen-element identifier, case ID, or expected result lacks evidence,
tell Claude exactly what is missing or supply the approved input. Do not accept
a plausible guess.

## Let Claude validate and iterate

The validation checks are listed in `CLAUDE.md`. Claude should run them after
every change and report exact outcomes. When a device run fails, keep Claude on
the same small test. Allow it to inspect
the approved local failure screenshot, technical screen description, failed
step, last screen-element identifier, and Appium log; then have it make the
smallest evidence-backed fix and rerun. Do not let it hide a real failure by
removing the check, adding long fixed waits, or broadly ignoring errors.

## Approve hosted side effects separately

Local coding and validation do not authorize a hosted write. Explicitly approve
each of these before Claude performs it:

- upload an APK/IPA to BrowserStack;
- execute against paid BrowserStack devices;
- create a TestRail plan/run;
- publish a TestRail result;
- alter CI/repository settings;
- push a branch or open a pull request.

Once approved, ask Claude to run one BrowserStack device and section, verify
the BrowserStack dashboard evidence and final status, then use the guarded
TestRail publishing check before enabling the full cloud-device set.

## Continue or switch paths

To add the next feature, a returning user can say what behaviour they want to
cover and let Claude ask for any missing approval or evidence.
[ai/ADD-SECTION.md](ai/ADD-SECTION.md) remains an optional advanced shortcut.
Keep one worksheet per section so the rationale survives outside the Claude
conversation.

At any time, stop using Claude and continue with
[MANUAL-WORKFLOW.md](MANUAL-WORKFLOW.md). AI-written tests have no special
format or AI dependency when they run: they are reviewed JavaScript files using
the same project helpers, screen-element identifiers, naming rules, and
commands as hand-written tests.

## Expected Claude handoff

At the end of each task, Claude should provide:

- files changed and tests added to the runnable suite;
- evidence used for screen-element identifiers and, when TestRail is in use,
  `C###` case mappings;
- exact checks and device runs performed;
- results and relevant artifact paths;
- any action it intentionally did not take because approval was absent;
- unresolved placeholders, assumptions, or policy questions.
