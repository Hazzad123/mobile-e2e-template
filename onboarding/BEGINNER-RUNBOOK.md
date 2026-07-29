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
10. Never edit or configure a workspace whose `template-state.json` says
    `source-template`.
11. Keep going until the first focused test is working or one genuine external
    blocker remains.
12. Use neutral, adult language. Avoid “just”, “simply”, “obviously”, “easy”,
    “don’t worry”, childish analogies, quizzes, and praise for routine answers.
13. When a human action cannot be automated, give one exact command or menu
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
> for you. Before I look at any app code or project data: is using Claude
> approved for this project? You can answer “yes”, “no”, “not sure”, or “I’m
> only exploring the template”.

Do not inspect `app-under-test/`, `testrail-import/`, `.env` files, screenshots,
logs, app binaries, or connected-device contents before the answer permits it.

- **Yes:** record the answer and continue.
- **Only exploring:** explain that Claude can give a generic, read-only template
  tour and core-tool check, but cannot create a project copy or perform app work
  until project-specific AI approval is explicit.
- **No/not sure:** do not inspect project inputs or author tests. Explain that
  the manual route exists and point to `MANUAL-WORKFLOW.md`.

After a “yes”, ask the next question:

> This starter template was itself developed with AI assistance. Has your
> organisation or client approved importing it into this project? You can
> answer “yes”, “no”, or “not sure”.

If no or uncertain, explain `PROVENANCE.md` and stop before project inspection.
If yes, ask whether their organisation requires an approval ticket, link, name,
or date to be recorded. “No reference required” is a complete answer.

## Stage 2: check the basic machine automatically

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

## Stage 3: protect the template with a working copy

Read only `template-state.json`.

If its `workspaceRole` is `source-template`, do not inspect Git status, install
dependencies, create `.env` files, add app/TestRail material, or make
app-specific edits in this folder. The next turn should say:

> The basic tools are ready. Before we configure an app, I’ll make a separate
> working copy so this starter stays unchanged. What app or project name should
> I use?

After the user supplies a name, create a readable lower-case slug and suggest an
unused sibling folder, for example:

> I suggest `/approved/parent/example-app-automation`. This will sit beside the
> template, not inside it. Is that location okay?

Do not create anything yet. If the user wants another location, help them choose
one absolute path and ask only whether that path is acceptable.

After the location is agreed, run the safe preview:

```bash
node onboarding/create-project-copy.js \
  --name "Example App" \
  --destination "/absolute/path/example-app-automation" \
  --dry-run \
  --json
```

Translate the result:

> The preview is ready. It will copy only the reusable template files. It will
> leave behind Git history, installed packages, `.env` files and credentials,
> app source/binaries, TestRail imports, screenshots, logs and test results.
> The destination does not exist, so nothing will be overwritten. Shall I
> create that working copy now?

Only after “yes”, repeat the command without `--dry-run`. The command writes a
`project-copy` marker and a non-secret `app-map/PROJECT-SETUP.md` record. Update
that record in the destination with `Claude-guided` as the authoring route, the
AI/provenance decisions and non-secret approval reference already answered, and
the completed core-readiness result. Do not store the source template's
absolute path, credentials, device identifiers, or customer data.

Do not initialise Git, add a remote, install packages, or bring project inputs
across during copying. Those are separate later decisions. Never merge into or
overwrite an existing destination.

Continue every later stage only in a folder whose marker says `project-copy`.
If the current Claude session cannot change its workspace root, give exactly
one surface-specific next action. For the Claude Code CLI, provide the exact
quoted path:

> In a terminal, run
> `cd "/absolute/path/example-app-automation" && claude`. When Claude opens,
> type `continue setup`.

For an editor, name its exact **File → Open Folder…** action, give the path to
select, and say to type `continue setup` after Claude opens there. If Claude
cannot tell which surface the user has, ask “Are you using Claude in a terminal
or in an editor?” as the only question.

When the user types `continue setup`, read only `template-state.json` and
`app-map/PROJECT-SETUP.md` first. If the role is `project-copy`, resume at the
next unresolved stage and do not repeat the copy conversation. If the marker is
valid but the setup record is missing, remain read-only and ask whether to
recreate a blank record and re-establish the approvals before continuing.

If the marker already says `project-copy`, skip this stage and resume from the
setup record. If the marker is missing, malformed, or has another role, do not
guess that edits are safe. A user saying it was intended as a copy is not enough
to write a replacement marker. Remain read-only and ask whether they can return
to a known source template to create a verified copy, or ask a maintainer to
restore the marker from trusted project history.

## Stage 4: learn the platform in ordinary language

Ask:

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

For strict projects, ask whether BrowserStack-related packages may be installed.
Use `npm ci --omit=optional` when they may not. Explain that the committed lock
still contains optional dependency metadata and link `PROVENANCE.md` when that
matters.

## Stage 5: find out what app material exists

Ask one direct question:

> What do you currently have: the app’s source code, an APK/IPA file, the app
> already installed on a test phone, or are you not sure?

In this question, source code means the files maintained by the app developers;
an APK is an installable Android app file; an IPA is an installable
iPhone/iPad app file. Explain only the options relevant to the answer. Ask
permission for the exact local path before reading it. Help the user locate
approved material rather than expecting them to know the template folder names.

Once approved, Claude should:

1. place or reference source under `app-under-test/` only if policy allows;
2. identify the app name, Android package/activity, or iOS bundle ID;
3. copy the relevant `.env.template` to `.env`;
4. fill only verified, non-secret values;
5. tell the user which secret/account values still need an approved source.

Do not print `.env` contents or credentials.

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

Do not ask the user to choose a section architecture or selector syntax.
Claude should:

1. walk the smallest useful approved user journey;
2. update `app-map/APP-MAP.md`;
3. update the `app-map/PROJECT-SETUP.md` created with the working copy;
4. create a section worksheet under `app-map/worksheets/`;
5. show the user a short plain-English description of the proposed test;
6. ask whether Claude should implement that proposed first slice;
7. resolve any materially ambiguous expected result or TestRail mapping;
8. write the platform section;
9. register it and add a focused npm script when useful;
10. run static/offline checks and focused dry registration;
11. run the focused device test when device control is approved;
12. inspect approved evidence, make the smallest real fix, and rerun.

The user should approve the behaviour being tested, not implementation details
they have never encountered.

After each stage, report the concrete proof in ordinary language:

- core tools: each ready tool and what it will do;
- working copy: its exact path, its `project-copy` marker, and that the source
  template was not changed;
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
