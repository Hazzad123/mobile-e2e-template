# Advanced Claude prompt: adapt a new app

Beginners should not fill this in. Open Claude Code and type
`help me get started` instead.

This is an optional fast path for an experienced user who already knows every
scope and approval answer. Replace the bracketed values, then paste the prompt
into Claude Code from the repository root.

```text
AI-assisted work is approved for this project and for the inputs named below.

Adapt this mobile E2E template for [APP NAME].

Scope:
- Working-copy destination: [ABSOLUTE UNUSED PATH OUTSIDE THE TEMPLATE]
- Policy/approval reference: [REFERENCE]
- Platforms: [ANDROID / IOS / BOTH]
- Approved app source: [PATH OR "none"]
- Team uses TestRail: [YES / NO / UNKNOWN]
- Approved TestRail export: [PATH OR "none"]
- Approved local app build/device: [DETAILS OR "none"]
- Approved local logs/screenshots/XML/artifacts: [PATHS OR "none"]
- Local device control: [APPROVED / NOT APPROVED]
- BrowserStack upload/run: [APPROVED / NOT APPROVED]
- TestRail writes: [APPROVED / NOT APPROVED]
- Destructive app actions: NOT APPROVED unless listed here: [NONE/DETAILS]

Read CLAUDE.md and AI-GUIDED-WORKFLOW.md first. Work end to end rather than only
giving me instructions.

Before inspecting Git or any project input, read only `template-state.json`. If
it says `source-template`, run the safe working-copy command with the app name
and destination above in `--dry-run` mode, report the exclusions, and ask me to
approve creation. Then create it and continue only in the new folder where the
marker says `project-copy`. If the session cannot switch workspace roots, give
me the exact new path and tell me how to open it and type `continue setup`.
Before that handoff, save all non-secret scope and approval answers from this
prompt into the new `app-map/PROJECT-SETUP.md` so setup can resume without
repeating them. Never save credentials, device identifiers, raw project data,
or the source template's absolute path there. If the marker is missing/invalid,
or the destination exists, stop without editing or overwriting anything.

Discover the app identity, navigation, stable selectors, and state requirements
from approved evidence. If TestRail is used, match its cases from approved
evidence. If it is not used, configure and record the local-only `LOCAL-*`
route; never invent a `C###` value. Update app-map/APP-MAP.md and create a
completed worksheet at
app-map/worksheets/<platform>-<section>.md from
manual/TEST-CASE-WORKSHEET.md. Do not overwrite the blank template.

Implement the smallest useful working test first: one platform, one section,
one device. Write the section JavaScript, add it to `test.js` so it will run,
add a focused package script if useful, and run all safe
syntax/offline/dry-registration checks. If local device control is approved and
available, run that section.
Inspect only failure evidence listed as approved above, make evidence-backed
fixes, and rerun until it is reliable or a genuine blocker remains.

Do not invent selectors, credentials, expected results, app IDs, or `C###` case
IDs. A `LOCAL-*` label is allowed only with
`ALLOW_UNMAPPED_TESTRAIL_CASES=true` for local runs. Do not upload, publish,
push, or cross a destructive boundary unless the scope above explicitly
authorizes it.

At handoff, list evidence, files changed, exact checks/runs and results, and any
unresolved assumptions or approvals.
```
