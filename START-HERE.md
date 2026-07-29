# Start here

This is a reusable starting point for automated checks of Android and
iPhone/iPad apps. A test can perform actions on a physical or virtual phone,
confirm what appears on screen, and report what passed or failed. You can have
Claude guide setup and write the tests, or use the fully manual process.

## First choose the permitted authoring path

- **No AI permitted:** follow
  [MANUAL-WORKFLOW.md](MANUAL-WORKFLOW.md). A person inspects the app, completes
  the worksheet, writes every JavaScript test, registers it, and runs the
  checks. First confirm the starter itself is allowed by
  [PROVENANCE.md](PROVENANCE.md), then use its safe copy command to make a
  separate project folder before editing anything.
- **Claude permitted for this project:** follow
  [AI-GUIDED-WORKFLOW.md](AI-GUIDED-WORKFLOW.md). Open Claude Code in the
  template folder only to start setup and type: **`help me get started`**.
  Claude checks policy and the basic machine, then creates a separate working
  copy before any app-specific work. It keeps the template unchanged, explains
  each requirement, asks one direct question at a time, and writes the first
  test with the user in the new folder.

No technical preparation is required before that sentence. If AI policy is
uncertain, do not add restricted project material yet; Claude's first question
will establish whether it may inspect anything.

## Technical/manual reference: shared destination

Whichever path is chosen, these are the shared outcomes. A manual user performs
them. Claude performs and explains them during guided onboarding, so guided
users do not need to edit this checklist themselves:

1. Create and enter a separate folder whose `template-state.json` says
   `project-copy`; never adapt the `source-template` folder.
2. Read [README.md](README.md) for the architecture and integrations.
3. Use approved source in the working copy's `app-under-test/`, or inspect the
   app on a device.
4. Complete [app-map/APP-MAP.md](app-map/APP-MAP.md).
5. Match TestRail cases when the team uses them, or explicitly record the
   local-only unmapped route, and save a completed worksheet under
   `app-map/worksheets/`.
6. Implement the platform sections through the chosen route and replace active
   `__PLACEHOLDER__` values.
7. Copy each platform's `.env.template` to `.env` and fill the local copy.
8. Run the offline checks, then one local section.
9. Complete [manual/REVIEW-CHECKLIST.md](manual/REVIEW-CHECKLIST.md).
10. If hosted integrations are approved and required, configure them and run a
   one-platform smoke pipeline. Strict local-only projects stop after local
   verification.

Find unfinished setup:

```bash
rg -n "__[A-Z0-9_]+__|TODO" android ios app-map -g '!.env.template'
```

For the manual route, the first files to work through in the new copy are:

- `app-map/APP-MAP.md`
- `manual/TEST-CASE-WORKSHEET.md` (copy it; keep the blank template)
- one relevant platform's `.env.template` (copy it to `.env`)
- one relevant platform section under `sections/`

The hosted device lists under `lib/devices.js` are not part of the first local
test. Change them only when BrowserStack is later approved and required.
