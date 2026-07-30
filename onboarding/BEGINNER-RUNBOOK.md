# Claude first-time-user onboarding runbook

This runbook is for Claude, not homework for the user. It applies when someone
says things such as:

- “help me get started”;
- “set this up for me”;
- “I have never used this before”;
- “what do I need to install?”.

Do not assume prior knowledge of Node.js, Appium, selectors, BrowserStack,
TestRail, Android tooling, or iOS tooling. Treat the user as a capable
professional who is new to this toolchain, not as a child or a trainee being
tested.

## Conversation rules

1. Ask one question at a time.
   If the user supplies several answers at once, remember them and ask only the
   next unanswered question.
2. Use plain language first; introduce a technical name only when it helps.
   On first use, explain what it is, why this setup needs it, and whether it
   stays local or communicates with an external service.
3. Perform safe read-only checks yourself. Do not give the user a list of
   commands to run when Claude can run them.
4. Translate check output into “ready”, “missing”, and “what happens next”.
5. Never ask the user to find a package ID, activity, bundle ID, device UDID,
   selector, or `C###` ID. Find those from approved evidence.
6. It is fine for the user to answer “I don’t know”. Explain how to find out.
7. Do not present the advanced prompt template unless the user asks for it.
8. Do not install software, change the shell, upload anything, publish results,
   reset app data, or perform destructive actions without explaining the change
   and receiving approval.
9. Never print secret values. Refer only to variable names and whether they are
   present.
10. Keep going until the first focused test is working or one genuine external
    blocker remains.
11. Use neutral, adult language. Avoid “just”, “simply”, “obviously”, “easy”,
    “don’t worry”, childish analogies, quizzes, and praise for routine answers.
12. When a human action cannot be automated, give one exact command or menu
    action, say why it is needed, describe the visible success signal, and
    recheck it before moving on.

## Explain terms at the point of use

This is Claude's reference, not a glossary to recite to the user:

| Term | Plain explanation |
|---|---|
| Node.js | Runs the JavaScript automation tools on this computer. |
| npm | Installs the exact JavaScript packages recorded by the project. |
| Appium | A local automation server that relays test actions to a mobile app; Appium itself is not an AI or hosted-device service. |
| Appium driver | The platform-specific connection Appium uses for Android (`UiAutomator2`) or iPhone/iPad (`XCUITest`). |
| Android SDK / Xcode | The official Android or Apple development tools that provide device and simulator control. |
| Emulator / simulator | A virtual Android phone or Apple device running on the computer. |
| APK / IPA | An installable Android or iPhone/iPad app file. |
| Package, activity, bundle ID, UDID | Technical identifiers needed to launch the right app on the right device; Claude derives them from approved evidence. |
| Selector | A stable identifier the test uses to find a button, field, or other screen element. |
| `.env` | A local, Git-ignored settings file that can contain device details and secrets. |
| TestRail | An optional external system for managing manual test cases and receiving automated results. |
| BrowserStack | An optional paid external service that runs the app on hosted devices; using it uploads app/test data. |
| CI | An automated repository job that runs checks without someone starting them locally. |

Use only the explanation needed for the current step. Follow it with the action
or decision, not another block of terminology.

## Stage 1: establish whether Claude may help

The first response should be friendly and short:

> Absolutely — I’ll guide you one step at a time and do the technical checks
> for you. Before I look at any app code or project data: are you allowed to use
> AI on this project? You can answer “yes”, “no”, “not sure”, or “I’m only
> exploring the template”.

This one question stands in for what used to be three separate ones (approval,
AI-provenance, and an approval reference). Keep Stage 1 to this single question.

Do not inspect `app-under-test/`, `testrail-import/`, `.env` files, screenshots,
logs, app binaries, or connected-device contents before the answer permits it.

- **Yes:** record the answer and continue.
- **Only exploring:** explain that Claude can give a generic, read-only template
  tour and core-tool check, but cannot read project inputs or perform app work
  until AI approval is explicit.
- **No/not sure:** do not inspect project inputs or author tests. Explain that
  the manual route exists and point to `MANUAL-WORKFLOW.md`.

This starter template was itself developed with AI assistance. `PROVENANCE.md`
records that for teams that want the detail, but it is no longer a separate
blocking question. If the user raises provenance or asks for an approval
reference, note their answer in the setup record and continue; do not turn it
into its own gate.

## Stage 2: check the basic machine automatically

This runbook assumes the user is already working in their own downloaded copy of
the template — a folder unzipped from the Zip, not the shared template
repository. `START-HERE.md` gives that as the first step.

Run:

```bash
node onboarding/check-prerequisites.js --platform core --json
```

If `node` itself is unavailable, use a basic shell command lookup and explain
that Node.js 20 or later is the first prerequisite.

Summarise the result in two or three short bullets. Do not paste the raw JSON.
If a core tool is missing, explain what it is, why it is needed, and the scope
of the proposed installation before asking:

> Would you like me to help install/configure that now?

Handle one missing tool at a time. Use the organisation’s approved installation
method and obtain approval before changing software outside the repository.
After each change, rerun the same check and say which item now reports
“ready”. Do not make the user decide whether installation output looks correct.

Once the core tools report ready, create the setup record so a later
`continue setup` can resume: copy `onboarding/PROJECT-SETUP-TEMPLATE.md` to
`app-map/PROJECT-SETUP.md` if it does not already exist, and record
`Claude-guided` as the authoring route, the non-secret approval decision, and
the core-readiness result. Do not store credentials, device identifiers, or
customer data in it.

## Stage 3: find out what app material exists

With the tools ready, ask one direct question, leading with source code:

> What do you currently have: the app’s source code, an installable app file
> (an APK for Android or an IPA for iPhone/iPad), the app already installed on a
> test phone, or are you not sure?

Source code means the files maintained by the app developers. Ask for it first,
because having it lets Claude derive the app’s identity, its selectors, and
usually the platform itself, which removes questions the user would otherwise
have to answer. An APK is an installable Android app file; an IPA is an
installable iPhone/iPad app file. Explain only the options relevant to the
answer. Ask permission for the exact local path before reading it, and help the
user locate approved material rather than expecting them to know the template
folder names.

Once approved, Claude should:

1. place or reference source under `app-under-test/` only if policy allows;
2. identify the app name, Android package/activity, or iOS bundle ID;
3. note the platform the source implies, to confirm at the next stage;
4. copy the relevant `.env.template` to `.env`;
5. fill only verified, non-secret values;
6. tell the user which secret/account values still need an approved source.

Do not print `.env` contents or credentials.

If the user has no source and only an installable file or an installed app,
Claude derives the same identifiers from that approved build instead, and the
platform follows from the file type (APK → Android, IPA → iPhone/iPad).

## Stage 4: confirm the platform

If Stage 3 gave Claude the source, infer the platform from it — an Android
Studio or Gradle project means Android, an Xcode project means iPhone/iPad, and
a React Native or Flutter project usually means both — and confirm rather than
ask:

> This looks like an Android project, so I’ll set up Android automation. Have I
> got that right?

Only ask openly when the platform cannot be derived:

> Does the app you want to test run on Android, iPhone/iPad, or both? If you’re
> not sure, tell me what kind of phone it runs on.

Run the relevant check:

```bash
node onboarding/check-prerequisites.js --platform android --json
node onboarding/check-prerequisites.js --platform ios --json
node onboarding/check-prerequisites.js --platform both --json
```

These default checks do not contact a device or simulator.

Explain each missing item in the order it blocks progress:

1. platform SDK/toolchain;
2. Appium;
3. Appium platform driver;
4. emulator/simulator or connected device;
5. platform npm dependencies;
6. local `.env` configuration.

Do not ask “Is UiAutomator2 installed?” or “What is your UDID?”. Check those
yourself and translate them:

- “The Android connection driver is ready.”
- “No Android emulator is running yet. Shall I help start one?”
- “The iPhone simulator tools are installed, but no simulator is open.”

A good missing-tool explanation sounds like:

> Appium is not installed yet. It is the local program this suite uses to send
> actions such as tap and type to the app on a test device. Installing the
> template's pinned Appium 2.19.0 adds that command-line program to this
> computer; it does not upload the app.
> Would you like me to install it using the approved Node.js setup?

After installation, rerun the platform check and report:

> Appium now reports ready. The next missing item is the Android connection
> driver, which lets Appium communicate with Android. Shall I install that
> driver?

For a new installation, use the template's compatible pinned pair:
`uiautomator2@4.2.9` for Android or `xcuitest@9.10.5` for iPhone/iPad. Run the
matching `appium driver doctor` check and report whether any required fix
remains. Do not install an unversioned current driver into Appium 2.

If the user has named both platforms, ask which one they want to prove first.
Do not attempt two first-time device setups in parallel.

After `npm ci` reports success, run `npm outdated` in the platform directory and
translate the result. Report each outdated package by name, current version, and
available version in plain language. Two caveats before offering to update
anything:

- **Appium and its platform driver are intentionally pinned.** `appium@2.19.0`,
  `uiautomator2@4.2.9`, and `xcuitest@9.10.5` are pinned because the current
  Appium 3 drivers are incompatible with Appium 2. Do not offer to update these
  without explaining the compatibility risk and getting explicit approval.
- **`@wdio/browserstack-service` is also pinned** as an optional dependency for
  the same reason. Do not update it in isolation.

For all other packages (WebdriverIO core, reporting tools, etc.), offer to
update one at a time with approval. Updating will change the lock file; note
that before proceeding.

If `npm outdated` reports nothing, say so briefly and continue.

For strict projects, ask whether BrowserStack-related packages may be installed.
Use `npm ci --omit=optional` when they may not. Explain that the committed lock
still contains optional dependency metadata and link `PROVENANCE.md` when that
matters.

## Stage 5: choose where the test should run

Ask one plain question:

> Where should this suite run? Pick one to start with:
> - only on a local device or emulator on this computer;
> - on BrowserStack, a paid service that runs the app on hosted devices;
> - in a pipeline, where an automated job runs it without anyone starting it.

Explain each option only as far as the answer needs. Whatever they choose, the
first test is still proved on a local device first; the choice only decides
which external stages Claude offers once that local test is green. Record the
answer in `app-map/PROJECT-SETUP.md`. Setting up BrowserStack or a pipeline
uploads app/test data or changes repository settings, so both stay off until
Stage 8 has produced a passing local test and the user approves each one.

## Stage 6: establish a device and prove app access

Guide the user through one local emulator/simulator or approved connected
device. At first use, explain that an emulator or simulator is a virtual phone
running on the computer, while a connected device is a physical test phone.
Ask permission immediately before controlling it; Claude should then check
connection state itself rather than asking the user for a serial or UDID.

Choose the least complicated approved route and explain the relevant branch:

- If a compatible virtual device exists but is stopped, name it, explain that
  starting it opens a virtual phone, ask permission, start it, and recheck.
- If no virtual device exists, recommend one compatible default based on the
  installed platform tools. State the expected system-image download and disk
  use before asking whether to create it.
- For a physical Android device, give the USB, developer-options, debugging,
  and trust actions one at a time. Recheck after each action.
- For a physical iPhone/iPad, explain the local trust and signing requirements
  before asking the user to perform one action at a time. Prefer a simulator
  for the first proof unless a physical device is required.
- If iOS was selected on a non-Mac, explain immediately that Apple's local
  iPhone/iPad simulator requires macOS and Xcode. Offer a separately approved
  hosted-device route only as an alternative; do not imply that it is local.

After approval, run:

```bash
node onboarding/check-prerequisites.js --platform android --probe-devices --json
node onboarding/check-prerequisites.js --platform ios --probe-devices --json
```

Use only the relevant command. Device probing is separate because `adb` may
start its local daemon and `simctl` contacts CoreSimulator.

Before reading screenshots, XML, page source, or logs produced from the app,
ask one separate plain-language question defining those artifact paths.

Then verify:

1. the intended build is installed;
2. Appium can start or attach to a session;
3. the app launches;
4. one reliable screen landmark is visible.

If installation, device trust, iOS signing, permissions, or account access
needs a human action, explain exactly what the user should click or approve,
why it is needed, and what they should see when it succeeds, then recheck
automatically.

## Stage 7: ask about TestRail without assuming knowledge

Ask:

> Does your team keep its manual test cases in TestRail? It’s fine to say “I
> don’t know”.

- **Yes:** explain that TestRail is an external catalogue for the team's test
  cases. Help locate/export the approved cases, read them only after approval,
  and use only verified `C###` mappings.
- **No:** explain that the first test can still run locally. Set
  `ALLOW_UNMAPPED_TESTRAIL_CASES=true` only in the relevant local `.env`; the
  suite will give unmapped cases deterministic names such as `LOCAL-LAUNCH`.
  Record `local-only/unmapped` in the worksheet and project setup record.
- **Unknown:** use the same local-only setting while the team confirms its
  process, and record that the answer remains unresolved.

Do not invent a `C###` ID. The local-only setting never enables TestRail
publishing and is ignored by BrowserStack/CI mode. Before enabling hosted
devices or the matrix pipeline, replace every active local label with a
verified TestRail mapping, or have a maintainer deliberately replace the
publisher integration.

## Stage 8: Claude writes the first test

One test at a time. Propose it, get approval, implement it, run it, stop.
Do not queue up further tests or ask about the next section until the user
says to continue. If the user asks Claude to "write all the tests" or "do
everything at once", decline and explain: each test is proposed, approved,
run, and verified individually before the next is discussed. This is not a
limitation — it is the quality guarantee.

Do not ask the user to choose a section architecture or selector syntax.
Claude should:

1. walk the smallest useful approved user journey;
2. update `app-map/APP-MAP.md`;
3. update the `app-map/PROJECT-SETUP.md` created in Stage 2;
4. create a section worksheet under `app-map/worksheets/`;
5. show the user a short plain-English description of the proposed test;
6. ask whether Claude should implement that proposed first slice;
7. resolve any materially ambiguous expected result or TestRail mapping;
8. write the platform section;
9. register it and add a focused npm script when useful;
10. run static/offline checks and focused dry registration;
11. run the focused device test when device control is approved;
12. inspect approved evidence, make the smallest real fix, and rerun;
13. **stop**. Report the outcome (see Stage 9) and wait. Do not propose the
    next test, do not start writing anything else, do not ask "shall I continue
    with the next section?" — wait for the user to lead.

The user should approve the behaviour being tested, not implementation details
they have never encountered.

After each stage, report the concrete proof in ordinary language:

- core tools: each ready tool and what it will do;
- workspace: the exact folder being used and that it is the user’s own
  downloaded copy of the template;
- platform setup: the SDK/toolchain, Appium, platform driver, and project
  packages that now report ready;
- device: the exact approved device or virtual device visible to the tools;
- app access: the exact build launched and one visible landmark confirmed;
- first test: the behaviour checked, device used, pass/fail result, and whether
  it changed app data.

If a stage is blocked, report one blocker, one required human action, and the
success signal Claude will recheck.

## Stage 9: finish with a concise status

End with:

- what is ready;
- what Claude configured;
- the first test in plain English;
- what passed;
- what remains optional, such as BrowserStack or CI;
- the single recommended next step.

Avoid overwhelming the new user with every internal file unless they ask.
