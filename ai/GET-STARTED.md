# What guided onboarding looks like

This example follows a capable professional who has not used mobile automation
before. Claude introduces each tool only when it becomes relevant, explains why
it is needed, performs checks itself, and reports a visible success signal
before moving on.

The user has downloaded the template as a Zip, opened that folder, and starts
with one sentence:

> **User:** help me get started

Claude responds with a single approval question:

> **Claude:** I’ll guide you through this one step at a time. I won’t inspect or
> change project material until we establish what is allowed.
>
> Are you allowed to use AI on this project? Reply yes, no, not sure, or “I’m
> only exploring the template”.

> **User:** Yes.

Claude runs the basic check itself. It does not ask the user to open another
terminal or paste command output:

> **Claude:** The setup programs can run. Node.js is available to run the setup
> and tests, npm is available to install the project’s JavaScript tools, and Git
> is available to track later project changes. I haven’t installed anything,
> inspected app data, or changed anything.
>
> To choose a first test I need to know the app. What do you currently have: the
> app’s source code, an installable file (an APK for Android or an IPA for
> iPhone/iPad), the app already installed on a test phone, or are you not sure?

> **User:** I downloaded an Android install file, but I don’t know its exact
> path.

> **Claude:** An Android install file normally ends in `.apk`. I can search only
> your Downloads folder for APK filenames and will not open other files. Shall I
> search that folder?

> **User:** Yes.

> **Claude:** I found one candidate:
> `/Users/alex/Downloads/example-app-debug.apk`. I have not opened or installed
> it. Shall I inspect this exact file for its technical app identity? Because it
> is an APK, this will be an Android setup.

> **User:** Yes.

Claude reads the identity from the approved file and lets the platform follow
from it, rather than asking:

> **Claude:** I verified the package as `com.example.app`. An APK is an Android
> app, so I’ll set up Android automation.
>
> Where should this suite run to start with: only on a local device or emulator
> on this computer, on BrowserStack (a paid service that runs the app on hosted
> devices), or in a pipeline (an automated job that runs it without anyone
> starting it)? Whatever you choose, I’ll prove the first test on a local device
> first.

> **User:** Local only for now.

Claude records that choice and keeps external services off:

> **Claude:** Understood — local only. I’ll leave BrowserStack and any pipeline
> off unless you ask for them later. Checking the Android tools now without
> contacting a phone: the Android device tools are ready, but Appium is missing.
> Appium is the local service that lets a JavaScript test control an app on a
> phone or virtual phone. Installing Appium adds a command-line program to this
> machine; it does not inspect the app or contact a device. Shall I install the
> template’s pinned Appium 2.19.0 using the Node.js package installer already
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

Claude starts the emulator, then installs the app it already identified:

> **Claude:** The `Pixel 8 API 35` emulator is running, Android reports it as
> connected, and it is ready for an app. I already verified the package
> `com.example.app` from the APK you approved. Shall I install that exact APK on
> `Pixel 8 API 35` and open it?

> **User:** Yes.

Claude installs the build, opens it, and asks separately before reading any
generated evidence:

> **Claude:** I installed that exact APK on `Pixel 8 API 35` and confirmed the
> app opens. To choose a reliable first check, I need to generate a screenshot
> and a screen-element list, which is the local technical description of the
> visible buttons and text. These files may contain app text and will remain
> inside the ignored local results folder. Shall I generate and inspect that
> evidence?

> **User:** Yes.

> **Claude:** The approved evidence shows a `Welcome` heading and a `Sign in`
> button on the first screen. TestRail is a team system for storing manual test
> cases and receiving automated results. Does your team use TestRail?

> **User:** No.

Claude keeps the first run local and does not invent external case references:

> **Claude:** Understood. TestRail publishing will remain off. For this local
> test I’ll enable the explicit local-only setting and use the descriptive
> `LOCAL-LAUNCH-SMOKE` label instead of inventing a `C` case number. BrowserStack
> and any pipeline stay off, matching your local-only choice. I propose one
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
> - **Workspace:** all project files are in the downloaded copy of the template
>   you opened; nothing was uploaded and the changes are local.
>
> The next useful step is to agree the first real user journey. Would you like
> me to propose that next test?

This is an illustrative conversation, so tool versions, emulator names, app
identifiers, paths, and screen text will differ on a real project. Claude must
derive them from the user’s approved machine, app, and device rather than
copying the example values.
</content>
</invoke>
