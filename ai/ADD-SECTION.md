# Claude prompt: add a test section

Replace the bracketed values, then paste this prompt into Claude Code.

```text
AI-assisted work is approved for this task and its named inputs.

Add the [FEATURE] E2E section for [ANDROID / IOS / BOTH].

Approved evidence:
- Policy/approval reference: [REFERENCE]
- App source or app-map screens: [PATHS/SCREENS]
- TestRail use and evidence: [PATH OR CASE IDS TO VERIFY / "not used—local only"]
- Approved local logs/screenshots/XML/artifacts: [PATHS OR "none"]
- Local build/device control: [APPROVED WITH DETAILS / NOT APPROVED]
- BrowserStack execution: [APPROVED / NOT APPROVED]
- TestRail writes: [APPROVED / NOT APPROVED]
- Destructive actions: [NONE APPROVED / EXACT APPROVED ACTION]

This prompt assumes you are working in your downloaded copy of the template
(a detached folder, not the shared repository), where app-specific work belongs.

Read CLAUDE.md, AI-GUIDED-WORKFLOW.md, the app map, and the closest existing
section. Walk or inspect the approved build where needed. Complete a new
test-case worksheet at app-map/worksheets/<platform>-<section>.md, write the
test code yourself, register it in dependency order, and validate it.

Use only selectors and `C###` IDs supported by evidence. When TestRail is not
used, record the decision and use a reviewed `LOCAL-*` label only with
`ALLOW_UNMAPPED_TESTRAIL_CASES=true`; do not enable BrowserStack/CI. Every test
must assert an observable result, use named `step()` blocks and polling helpers,
be retry-safe, and stop at the approved destructive boundary.

Run static/offline/dry-registration checks and the focused local section when
approved. Inspect only the artifact paths approved above, fix evidence-backed
failures, and rerun. Do not perform an unapproved upload, TestRail write, push,
or destructive action.
```
