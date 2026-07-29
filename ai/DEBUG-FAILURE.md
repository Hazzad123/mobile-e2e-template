# Claude prompt: debug a failing section

Replace the bracketed values, then paste this prompt into Claude Code.

```text
AI-assisted debugging is approved for this task and the named local artifacts.

Diagnose and fix this failing mobile E2E test:
- Policy/approval reference: [REFERENCE]
- Platform and section: [DETAILS]
- Command: [COMMAND]
- App build/device: [DETAILS]
- Approved logs/artifacts: [PATHS]
- Device control and reruns: [APPROVED / NOT APPROVED]
- BrowserStack reruns: [APPROVED / NOT APPROVED]
- TestRail writes: NOT APPROVED unless stated here: [DETAILS]

This prompt assumes you are working in your downloaded copy of the template
(a detached folder, not the shared repository), where app-specific work belongs.

Read CLAUDE.md and inspect the test, helper path, failed step, last selector,
PNG/XML, and relevant Appium/BrowserStack logs. Reproduce when approved.
Identify the root cause before editing.

Make the smallest evidence-backed fix. Do not hide the failure by deleting or
weakening an assertion, swallowing errors, adding a long sleep, or increasing a
timeout without evidence that timing is the cause. Run syntax/offline checks and
the focused section again when approved. Report cause, change, evidence, and
before/after results.
```
