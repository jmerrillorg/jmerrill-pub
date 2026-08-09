# Search Classification

Last verified: 2026-08-09T21:23:19Z

## Active Source Sweep

Search roots:

- `lib`
- `app`
- `scripts`
- `components`
- `data`
- `docs/operations/publishing-successor-operations-hub`
- `docs/governance`
- `docs/operations/active`

Files scanned by focused terminology guard: 323

Active author-facing actor-language defects remaining: 0

Remaining focused-guard hits are intentional failing regression fixtures only:

| File | Classification |
| --- | --- |
| `scripts/author_communication_brand_guard.test.mjs` | CORRECT - intentional prohibited examples used by regression tests |
| `scripts/tranche4_author_marketing_experience.test.mjs` | CORRECT - intentional prohibited example used by leakage-guard regression test |

## Corrected Active Source Defects

| Source | Correction |
| --- | --- |
| `lib/server/author-communication-brand.ts` | Added reusable blocker for standalone "Publishing" actor terminology in governed author emails. |
| `scripts/tranche4_author_marketing_experience.mjs` | Added the same actor-terminology blocker to author-facing leakage validation. |
| `scripts/program008_ecr_preview.mjs` | Changed future preview rendering from "Publishing sends..." to "the Publishing Team sends..." |
| `lib/publishing/author-workspace-modules.ts` | Changed Author Success copy from standalone "Publishing is..." actor language to "The Publishing Team..." |
| `app/author/_components/AuthorPortalWorkspace.tsx` | Changed recovery copy and button label from "contact Publishing" to "contact the Publishing Team." |
| `lib/commercial/catalog.ts` | Changed permitted CTA from "Contact Publishing" to "Contact the Publishing Team." |
| `app/packages/page.tsx` | Changed fallback CTA from "Contact Publishing" to "Contact the Publishing Team." |
| `app/distribution/page.tsx` | Changed visible CTA from "Contact Publishing" to "Contact the Publishing Team." |

## Preserved Uses

The following categories were intentionally preserved:

- Corporate names: "J Merrill Publishing" and "J Merrill Publishing, Inc."
- Descriptive publishing-process language.
- Email addresses such as `publishing@jmerrill.one`.
- Internal/canonical terms such as "Publishing Track."
- Historical generated evidence that records prior author-facing packages or prior operational facts.

## Historical Evidence Handling

Generated historical evidence under `docs/operations/generated` may still show standalone actor wording from past generated packages or prior evidence records. Those files were not rewritten because they record prior state. Future generated output is governed by the corrected reusable source and guards.

