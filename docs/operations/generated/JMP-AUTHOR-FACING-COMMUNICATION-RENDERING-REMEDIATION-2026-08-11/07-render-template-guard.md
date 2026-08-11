# Render Template Guard

Last Verified: 2026-08-11

Guard components:

- Brand language guard: verifies JMP publishing brand and author-facing actor terminology.
- Leakage guard: blocks internal artifacts such as Dataverse, execution logs, workflow records, internal instructions, package manifests, response mechanisms, and evidence files.
- Render-template guard: requires canonical HTML, canonical renderer metadata, governed section structure, styled CTA button, and plain-text fallback.

Regression coverage:

- Missing HTML blocked
- Simple transactional HTML blocked
- Missing renderer metadata blocked
- Wrong renderer metadata blocked
- Implicit plain text blocked
- Unknown author-facing email type blocked
- Explicit plain-text exception allowed only for registered exception template

Evidence Source:

- `scripts/author_facing_html_render_enforcement.test.mjs`

