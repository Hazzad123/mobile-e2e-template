# Optional TestRail case export

Use this location only inside a separate folder whose root
`template-state.json` says `project-copy`. Never add a TestRail export to the
source template.

Place an approved CSV export of the existing TestRail cases here when available.
Include at least Case ID and Title; Preconditions and Steps make scope matching
safer. For example:

```text
testrail-import/cases.csv
```

This folder is ignored by Git except for this README. Git ignore is not a
security boundary, so do not place an unapproved export here.

## Manual route

Following [MANUAL-WORKFLOW.md](../MANUAL-WORKFLOW.md), a person reads the CSV,
copies `manual/TEST-CASE-WORKSHEET.md` to
`app-map/worksheets/<platform>-<section>.md`, and records:

- the exact `C###` ID and title;
- preconditions and data;
- which steps will be automated;
- the section key and platform;
- any deliberate manual-only step.

## Claude-guided route

Following [AI-GUIDED-WORKFLOW.md](../AI-GUIDED-WORKFLOW.md), Claude may read the
approved CSV, create the same completed worksheet under `app-map/worksheets/`,
and write tests with the matched IDs. A person reviews the mapping before
TestRail publication.

In both routes, never invent a case ID. If the team uses TestRail but the
approved case evidence is missing, leave the mapping unresolved until a person
verifies or creates the case through the team's normal process.

If the team does not use TestRail, no export belongs here. Record
`unmapped (local-only)` in the worksheet, use a descriptive `LOCAL-*` label,
and set `ALLOW_UNMAPPED_TESTRAIL_CASES=true` only in the private local `.env`.
That route cannot run through the supplied BrowserStack/CI matrix or publish to
TestRail.
