# What guided onboarding looks like

This example follows a capable professional who has not used mobile automation
before. Claude introduces each tool only when it becomes relevant, explains why
it is needed, performs checks itself, and reports a visible success signal
before moving on.

The user starts in the source template with one sentence:

> **User:** help me get started

Claude responds:

> **Claude:** I’ll guide you through this one step at a time. I won’t inspect or
> change project material until we establish what is allowed.
>
> Has your organisation or client explicitly approved using Claude on this
> project? Reply yes, no, not sure, or “I’m only exploring the template”.

> **User:** Yes.

> **Claude:** Thanks. This starter template was itself developed with AI
> assistance. Has your organisation or client approved importing it into this
> project? You can answer yes, no, or not sure.

> **User:** Yes.

> **Claude:** Understood. Does your organisation require an approval ticket,
> link, person’s name, or date to be recorded for that decision? “No reference
> required” is a complete answer.

> **User:** No reference required.

Claude runs the basic check itself. It does not ask the user to open another
terminal or paste command output:

> **Claude:** The setup programs can run. Node.js is available to run the setup
> and tests, npm is available to install the project’s JavaScript tools, and Git
> is available to track later project changes. I haven’t installed anything,
> inspected app data, or changed the template.
>
> Before configuring an app, I’ll make a separate working copy so this starter
> stays unchanged. What app or project name should I use?

> **User:** Example App.

> **Claude:** I suggest
> `/Users/alex/Projects/example-app-automation`. This folder will sit beside the
> template, not inside it. Is that location acceptable?

> **User:** Yes.

Claude previews the copy before writing anything:

> **Claude:** The preview passed. It will copy only the reusable test framework
> and guides. It will leave behind the template’s Git change history, installed
> tool folders, private local settings files (`.env`), credentials, app
> source/installers, TestRail exports, screenshots, logs, and test results. The
> destination does not exist, so nothing will be overwritten.
> Shall I create that working copy now?

> **User:** Yes.

Claude creates the copy and verifies that the new folder is marked as a project
copy. If the current session cannot safely switch its workspace, Claude gives
one action that matches the user’s interface:

> **Claude:** Your working copy is ready at
> `/Users/alex/Projects/example-app-automation`, and I verified that it is
> marked as the editable project copy. The original template is unchanged.
> Claude limits its work to the folder it was opened in, so reopening from the
> new path ensures every later change goes into your project copy.
>
> In a terminal, run
> `cd "/Users/alex/Projects/example-app-automation" && claude`. When Claude
> opens, will you type `continue setup`?

> **User:** continue setup

> **Claude:** I’ve confirmed this is the separate Example App working copy and
> resumed your saved setup. Does the app you want to test run on Android,
> iPhone/iPad, or both?

> **User:** Android.

Claude checks the Android tools without contacting a phone:

> **Claude:** The Android device tools are ready, but Appium is missing. Appium
> is the local service that lets a JavaScript test control an app on a phone or
> virtual phone. Installing Appium adds a command-line program to this machine;
> it does not inspect the app or contact a device. Shall I install the
> template's pinned Appium 2.19.0 using the Node.js package installer already
> available here?

> **User:** Yes.

Claude installs Appium, verifies its version, and reports the next missing
piece:

> **Claude:** Appium 2.19.0 is installed and its version check passed. Appium also
> needs an Android adapter called UiAutomator2; the adapter translates Appium’s
> general commands into Android actions. Installing it changes only Appium’s
> local tool directory and still does not contact a device. Shall I install the
> compatible UiAutomator2 4.2.9 driver and run its readiness check now?

> **User:** Yes.

> **Claude:** The UiAutomator2 driver is installed, and the readiness checker
> now reports that the core Android automation tools are ready. I still haven’t
> contacted a device. Do you already have an approved physical Android phone,
> want to use a virtual Android phone on this computer, or are you unsure?

> **User:** I’m unsure.

Claude explains the choice and recommends a safe starting point:

> **Claude:** A virtual phone, usually called an Android emulator, runs in a
> window on this computer and keeps the first test separate from a personal
> phone. I recommend using an existing emulator for the initial check. I can
> look for configured emulators; this may start Android’s local connection
> service, but it will not start or control a phone. Shall I check what is
> available?

> **User:** Yes.

> **Claude:** I found one configured emulator named `Pixel 8 API 35`. It is
> currently switched off. Starting it will open a virtual Android phone and
> allow the test tools to control only that virtual device. Shall I start and
> use it for this setup?

> **User:** Yes.

Claude starts the emulator and verifies the connection:

> **Claude:** The `Pixel 8 API 35` emulator is running, Android reports it as
> connected, and it is ready for an app. What app material do you currently
> have: the source-code folder, a file that can be installed on Android, the app
> already installed on a test device, or are you unsure?

> **User:** I downloaded an Android install file, but I don’t know its exact
> path.

> **Claude:** An Android install file normally ends in `.apk`. I can search only
> your Downloads folder for APK filenames and will not open other files. Shall I
> search that folder?

> **User:** Yes.

> **Claude:** I found one candidate:
> `/Users/alex/Downloads/example-app-debug.apk`. I have not opened or installed
> it. Shall I inspect this exact file for its technical app identity and install
> it on the approved emulator?

> **User:** Yes.

Claude verifies the app identity, installs it, and opens it:

> **Claude:** I verified the package as `com.example.app`, installed that exact
> APK on `Pixel 8 API 35`, and confirmed the app opens. To choose a reliable
> first check, I need to generate a screenshot and a screen-element list, which
> is the local technical description of the visible buttons and text. These
> files may contain app text and will remain inside the ignored local results
> folder. Shall I generate and inspect that evidence?

> **User:** Yes.

> **Claude:** The approved evidence shows a `Welcome` heading and a `Sign in`
> button on the first screen. TestRail is a team system for storing manual test
> cases and receiving automated results. Does your team use TestRail?

> **User:** No.

Claude keeps the first run local and does not invent external case references:

> **Claude:** Understood. TestRail publishing will remain off. For this local
> test I’ll enable the explicit local-only setting and use the descriptive
> `LOCAL-LAUNCH-SMOKE` label instead of inventing a `C` case number. The
> supplied cloud/TestRail matrix will remain disabled. I propose one
> non-destructive test: launch Example App and confirm that the `Welcome`
> heading and `Sign in` button are visible. It will not sign in, submit a form,
> create an account, or change app data. Shall I write, add, and run only that
> test on the approved emulator?

> **User:** Yes.

Claude writes the small Android section, adds it to the suite so it will run,
checks that the suite loads, starts Appium, and runs the focused test:

> **Claude:** The first test passed.
>
> - **Behaviour checked:** Example App launched and displayed the `Welcome`
>   heading and `Sign in` button.
> - **Device:** `Pixel 8 API 35` Android emulator.
> - **Focused command:** `npm run test:launch-smoke`.
> - **Safety:** no account or app data was created or changed; nothing was
>   uploaded; BrowserStack and TestRail stayed off.
> - **Workspace:** all project files are in
>   `/Users/alex/Projects/example-app-automation`; the source template is
>   unchanged.
>
> The next useful step is to agree the first real user journey. Would you like
> me to propose that next test?

This is an illustrative conversation, so tool versions, emulator names, app
identifiers, paths, and screen text will differ on a real project. Claude must
derive them from the user’s approved machine, app, and device rather than
copying the example values.
