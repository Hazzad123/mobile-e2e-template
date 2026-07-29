# Advanced Claude prompt: adapt a new app

Beginners should not fill this in. Open Claude Code and type
`help me get started` instead.

This is an optional fast path for an experienced user who already knows every
scope and approval answer. Replace the bracketed values, then paste the prompt
into Claude Code from your downloaded copy of the template.

```text
AI-assisted work is approved for this project and for the inputs named below.

Adapt this mobile E2E template for [APP NAME].

Scope:
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

You are working in a downloaded copy of the template (a detached folder, not
the shared repository), which is where app-specific work belongs. Save all
non-secret scope and approval answers from this prompt into
`app-map/PROJECT-SETUP.md` so setup can resume without repeating them. Never
save credentials, device identifiers, or raw project data there.

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
