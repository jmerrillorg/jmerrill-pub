# OR-2026-003 Validation Results

Date: 2026-08-06

Scope: Amendment 1 - Elected Product Form Entitlement Rule

## Search Validation

Repository search for `complimentary`, `author copies`, and `included copies` immediately finds:

- `docs/governance/publishing/PUB-STD-Author-Copy-Policy.md`
- `docs/operations/JM1-Publishing-Enterprise-Operating-Manual-v1.0.md`
- public package source references
- agreement/package generation references
- OR-2026-003 evidence

Targeted search found no active public package source row named `Complimentary paperbacks`, `Complimentary hardcovers`, or `Complimentary eBooks`.

Historical OR-2026-003 evidence from the original fixed-format remediation remains preserved and is superseded by Amendment 1 for future entitlement logic.

## Policy Alignment

Aligned controlling rule:

- entitlement follows approved/elected Product Forms;
- package allocation determines quantity;
- Product Form election determines which forms receive the quantity;
- unelected Product Forms receive no entitlement;
- later-added Product Forms receive entitlement only after approved add-on/election and publication or delivery;
- PF-07 generates no entitlement and fails closed;
- PF-08 generates one digital entitlement only when elected and scope-approved.

## Document Coverage

- Canonical governance document: PASS.
- Operating Manual reference: PASS.
- Public package matrix source: PASS.
- Agreement field computation: PASS.
- Package addendum content: PASS.
- Generated addendum language: PASS.
- Executed-agreement preservation boundary: PASS.
- Human Operating Layer alignment after PR #433: PASS. SOPs, Forms and Templates, Current Authority Index, Reference Library, and Role Playbooks reflect PUB-STD v1.1 and the elected Product Form entitlement rule.

## Test Validation

- `npm ci` at repository root under Node v26.0.0: PASS with engine warning; repository declares Node `>=24 <25`.
- `npm ci` in `azure-functions/diagnostic-ai-runner` under Node v26.0.0: PASS with engine warning; package declares Node `>=22 <25`.
- `npm run type-check`: PASS.
- Focused agreement policy/document tests: PASS, 70 / 70.
- Broader governed agreement/package test group: PASS, 206 / 206.


## Post-Rebase Validation After PR #433

Date/time: 2026-08-06T19:04:29Z.

- Rebased PR #434 branch onto `origin/main` after PR #433 merge: PASS.
- Human Operating Layer alignment: PASS.
- Node runtime used for rerun: v24.14.0.
- `npm ci`: NOT RERUN in this local task because the bundled Node runtime did not include `npm`; existing `node_modules` were present in both repository root and `azure-functions/diagnostic-ai-runner`.
- Type-check rerun via `./node_modules/.bin/tsc --noEmit --incremental false`: PASS.
- Focused agreement policy/document tests rerun: PASS, 70 / 70.
- Named broader governed agreement/package test group rerun: PASS, 113 / 113.
- Full `azure-functions/diagnostic-ai-runner` test suite rerun from package root: PASS, 1784 / 1784.
- Compatibility repair: simplified generated-addendum fixtures now provide elected Product Forms instead of relying on fixed-format defaults.

## Required Scenario Validation

| Scenario | Result |
| --- | --- |
| Starter - PF-01 + PF-03 | PASS: 5 paperback copies, 1 standard ebook entitlement |
| Starter - PF-01 + PF-05 | PASS: 5 paperback copies, 5 large-print copies |
| Starter - PF-05 + PF-03 | PASS: 5 large-print copies, 1 standard ebook entitlement |
| Professional - PF-01 + PF-02 + PF-04 | PASS: 10 paperback copies, 10 hardcover copies, 1 audio delivery |
| Professional - PF-01 + PF-05 + PF-03 | PASS: 10 paperback copies, 10 large-print copies, 1 standard ebook entitlement |
| Premier - PF-01 + PF-02 + PF-03 + PF-04 | PASS: 15 paperback copies, 15 hardcover copies, 1 standard ebook entitlement, 1 audio delivery |
| JM Signature - PF-01 + PF-05 + PF-03 | PASS: 15 paperback copies, 15 large-print copies, 1 standard ebook entitlement |
| PF-07 elected | PASS: fail closed, no entitlement |
| PF-08 elected with approved digital scope | PASS: 1 digital entitlement |
| PF-08 not scope-approved | PASS: no entitlement generated; scope boundary returned |
| Unelected hardcover | PASS: 0 hardcover entitlement |
| Later-added PF-05 | PASS: entitlement only after approved add-on/election |
| Duplicate PF election | PASS: one entitlement only |
| Empty PF election set | PASS: fail closed |
| Idempotent regeneration | PASS: identical entitlement result, no duplicates |

## Generated DOCX / PDF Validation

Generated validation artifacts are stored under:

`docs/evidence/OR-2026-003/generated-validation-artifacts/amendment-1-elected-product-forms/`

Generated DOCX and PDF outputs:

- `starter-pf01-pf03.docx` / `starter-pf01-pf03.pdf`
- `starter-pf01-pf05.docx` / `starter-pf01-pf05.pdf`
- `starter-pf05-pf03.docx` / `starter-pf05-pf03.pdf`
- `professional-pf01-pf02-pf04.docx` / `professional-pf01-pf02-pf04.pdf`
- `professional-pf01-pf05-pf03.docx` / `professional-pf01-pf05-pf03.pdf`
- `premier-pf01-pf02-pf03-pf04.docx` / `premier-pf01-pf02-pf03-pf04.pdf`
- `jm-signature-pf01-pf05-pf03.docx` / `jm-signature-pf01-pf05-pf03.pdf`
- `premier-pf08-scope-approved.docx` / `premier-pf08-scope-approved.pdf`

## Executed Agreement Impact Review

Read-only impact review: COMPLETE.

Executed agreements modified: 0.

Author communications: 0.

No active executed title requiring amendment was identified in repository evidence for this change. If a signed agreement is later found with conflicting copy terms, Jackie review is required before fulfillment is interpreted under the amended rule.

## Boundaries Preserved

- Author communications sent: 0.
- Runtime activation: 0.
- Client-title automation thaw: 0.
- Dataverse schema changes: 0.
- Business Central changes: 0.
- Public website source: CHANGED.
- Public website deployment: NOT EXECUTED.
- Executed agreements modified: 0.
- Agreement signatures requested: 0.
