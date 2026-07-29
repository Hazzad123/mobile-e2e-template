# Template provenance and policy boundary

This template's current code and documentation were developed with AI
assistance, using a human-provided production mobile E2E suite as the
architectural reference.

The [manual-only workflow](MANUAL-WORKFLOW.md) means a team can adapt, extend,
review, maintain, and run the resulting tests without using an AI tool. It is
not a claim that the starter files themselves have human-only provenance.

Before adopting this template:

- if policy prohibits AI use only during project work, record approval to use
  this starter and then follow the manual-only route;
- if policy prohibits importing AI-authored code or documentation, do not copy
  this template unchanged. Have authorized engineers review and approve it, or
  independently reimplement the required pieces under the project's process;
- if policy or an SBOM scanner prohibits even AI-related dependency declarations,
  note that the supplied platform lock files record BrowserStack's optional
  transitive `@browserstack/ai-sdk-node` package. `npm ci --omit=optional`
  prevents installation but does not remove that metadata. Use a separately
  reviewed local-only manifest/lock or remove the optional integration and
  regenerate the lock.

Once adoption is approved, use the manual or Claude-guided copy step to create
a separate `project-copy`. Do not put project source, credentials, app binaries,
case exports, generated evidence, or app-specific edits in the folder marked
`source-template`.

Record the decision or approval reference in each completed section worksheet.
