# Test-case worksheet

Copy this file once per new section and complete it before coding.

Use short, testable statements. A **section key** is the lowercase name used to
select the section, such as `profile` or `saved-items`. A **known-state
landmark** is a visible element that proves the app is back at the required
starting screen. A **destructive boundary** records the point a test must not
cross without explicit approval, such as confirming deletion or purchase.

## Ownership

- Feature:
- Section key:
- Author:
- Reviewer:
- Authoring route: manual-only / Claude-guided
- Policy or approval reference:
- AI-approved input/artifact paths (Claude-guided only):
- Approved external actions:
- Starter provenance approved where required:
- Android / iOS / both:
- App build/version:
- Test environment:
- Date walked manually:

## Preconditions and data

- Starting screen/state:
- Account:
- Seeded or throwaway data:
- Permissions/first-run state:
- Cleanup required:
- Destructive boundary:

## Case mapping

| Order | TestRail ID or local status | Exact or proposed case title | Automated scope | Reason for any omitted manual step |
|---:|---|---|---|---|
| 1 | C___ / LOCAL-___ (local-only) |  |  |  |

Use an explicit reviewed label such as `LOCAL-PROFILE-HEADING (local-only)` only
with
`ALLOW_UNMAPPED_TESTRAIL_CASES=true` and `BROWSERSTACK=false`. It supports local
design and device runs, not BrowserStack, CI, or TestRail publication. Never put
a fabricated numeric ID in this table and never leave an unresolved placeholder
in an adapted section.

## Screen-by-screen steps

| Step | User action | Expected visible result | Android selector | iOS selector | Proven on build? |
|---:|---|---|---|---|---|
| 1 |  |  |  |  | no |

## Recovery

- Known-state landmark:
- Route back to that state:
- Is a retry safe?
- What data changes on the first attempt?
- What should happen after failure?

## Evidence

- App-map screens updated:
- Local inspector/page-source notes:
- Local run command:
- Expected artifact sensitivity:
- Reviewer result:

---

## Filled example — reference only

This fictional example shows the expected level of precision for a small
manually authored section. Do not copy its identifiers, account details, or
selectors into a real project. Delete the example from the working worksheet.

### Example ownership

- Feature: Profile heading
- Section key: `profile`
- Author: A. Engineer
- Reviewer: R. Reviewer
- Authoring route: manual-only
- Policy or approval reference: `SEC-1427` (fictional)
- AI-approved input/artifact paths (Claude-guided only): not applicable
- Approved external actions: local Android emulator and local Appium only; no
  uploads or service writes
- Starter provenance approved where required: yes, recorded in project setup
- Android / iOS / both: Android
- App build/version: Example Mobile 3.8.0, QA build 412
- Test environment: QA
- Date walked manually: 2026-07-29

### Example preconditions and data

- Starting screen/state: Home screen, signed in
- Account: approved shared QA account; credentials supplied through `.env`
- Seeded or throwaway data: existing non-customer QA profile
- Permissions/first-run state: notification prompt already resolved
- Cleanup required: none; the test reads data only
- Destructive boundary: do not open profile-edit controls or save changes

### Example case mapping

| Order | TestRail ID or local status | Exact or proposed case title | Automated scope | Reason for any omitted manual step |
|---:|---|---|---|---|
| 1 | LOCAL-PROFILE-HEADING (local-only) | User can open the profile screen | Open Profile and verify its heading is exactly `Profile`. | Editing the profile is a separate behaviour and outside this read-only section. |

### Example screen-by-screen steps

| Step | User action | Expected visible result | Android selector | iOS selector | Proven on build? |
|---:|---|---|---|---|---|
| 1 | Select the Profile tab from Home. | Profile screen finishes loading. | `#profile_tab` | not supported in this worksheet | yes — build 412 |
| 2 | Read the screen heading. | Heading text is exactly `Profile`. | `#profile_heading` | not supported in this worksheet | yes — build 412 |

### Example recovery

- Known-state landmark: Home heading, `~home-heading`
- Route back to that state: Android Back once; relaunch if Home is not visible
- Is a retry safe?: yes
- What data changes on the first attempt?: none
- What should happen after failure?: capture local evidence, return to Home, and
  repeat the same read-only journey

### Example evidence

- App-map screens updated: Home and Profile
- Local inspector/page-source notes: both Android selectors returned the
  intended element—and no other element—before and after leaving each screen
- Local run command: `(cd android && TEST_SECTIONS=profile npm test)`
- Expected artifact sensitivity: screenshot may contain the fictional QA
  display name; retain locally
- Reviewer result: approved as a local draft; hosted execution remains blocked
  until a real `C###` is assigned
