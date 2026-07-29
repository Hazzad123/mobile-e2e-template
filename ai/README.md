# Claude onboarding and prompt library

## New users

Do not fill in a form. Open Claude Code in the source template folder and type:

> help me get started

Claude will ask one focused question at a time and perform the technical checks.
It will keep the source template unchanged and create a separate working copy
before app-specific setup. See [GET-STARTED.md](GET-STARTED.md) for a complete
example from the first message through a passing local test.

## Experienced users

The detailed prompts are optional shortcuts after AI-assisted work is approved
for the specific project inputs and actions:

1. `START-NEW-APP.md` — advanced new-app setup in one fully scoped prompt;
2. `ADD-SECTION.md` — design, code, register, and validate another feature;
3. `DEBUG-FAILURE.md` — investigate evidence and fix an existing failure.

Fill every bracketed field before pasting a prompt. `CLAUDE.md` supplies the
standing architecture, evidence, safety, coding, and validation rules.
New-app adaptation may begin in the source template only to create the named
working copy; add-section and debug prompts must run inside an existing folder
marked `project-copy`.

The prompts do not authorize uploads, TestRail writes, paid device runs,
repository publication, or destructive app actions unless their filled scope
explicitly says so.
