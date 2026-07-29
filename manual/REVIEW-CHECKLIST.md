# Manual test review checklist

Use this for every new or materially changed section.

## Traceability

- [ ] The selected authoring route and policy/approval reference are recorded.
- [ ] For the manual route, no AI tool accessed project inputs or authored
      project changes after this starter was adopted.
- [ ] For the Claude route, every input/artifact inspected was inside the
      recorded approval scope.
- [ ] The starter's provenance is approved where the project requires it.
- [ ] The behaviour was walked on the named app build.
- [ ] Every `C###` exists and matches the automated scope, or the worksheet
      explicitly records the local-only unmapped route.
- [ ] Every `LOCAL-*` label is descriptive, uses
      `ALLOW_UNMAPPED_TESTRAIL_CASES=true`, and is excluded from BrowserStack,
      CI, and TestRail publication.
- [ ] Split case parts use consistent `[n/total]` titles.
- [ ] The app map and test-case worksheet are current.

## Selectors and behaviour

- [ ] Every selector was proven on the supported platform.
- [ ] Accessibility/resource IDs are preferred over XPath.
- [ ] Each test asserts a visible or readable outcome.
- [ ] Actions and assertions have useful `step()` labels.
- [ ] Polling helpers are used instead of arbitrary long sleeps.
- [ ] Retry and recovery do not duplicate unsafe state changes.
- [ ] Destructive actions stop at Cancel unless explicitly approved.

## Data and security

- [ ] Credentials and unique data come from approved environment variables.
- [ ] No secret, source copy, binary, screenshot, XML, or customer data is staged.
- [ ] Logs and failure artifacts do not expose sensitive values.
- [ ] Any BrowserStack/TestRail use is approved for this project.
- [ ] BrowserStack self-healing remains disabled for a no-AI project.

## Verification

- [ ] No unresolved placeholder remains in active code.
- [ ] `node --check` passes.
- [ ] Offline TestRail and report self-tests pass.
- [ ] Mocha dry registration lists the intended titles and verified `C###` or
      reviewed `LOCAL-*` labels.
- [ ] The targeted local device run passes.
- [ ] A genuine assertion failure produces useful evidence and recovery.
