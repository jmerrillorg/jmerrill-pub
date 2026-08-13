# Stage 0 Autonomy and Operating Center Remediation

Last verified: 2026-08-13T01:00:00Z

## Changes

| Area | Remediation |
|---|---|
| Stage 0 happy path | Routine Stage 0 diagnostic handoffs do not become Jackie tasks merely because Stage 0 exists. |
| Missing source material | Displayed as `Source manuscript/material evidence is missing`, routed to author/source dependency. |
| Publisher exception gate | Preserved for legal, rights, ethics, hard-stop, brand, signature, secondary authorization, low-confidence/output-backed human review, and other publisher-reserved conditions. |
| Pipeline semantics | The first visual stage remains `Intake`; Inquiry is treated as the triggering event, not a swimlane. |
| Deep links | Requested links must resolve exactly one owning card. Unknown, ambiguous, or mismatched IDs fail visibly with no fallback title. |

## Identity Contract

Deep links resolve by the provided identifiers on one card:

- `titleId`
- `intakeId`
- `diagnosticId`
- `recordId`
- `title` only when it resolves exactly one card with all other provided identifiers

Multiple provided identifiers must all match the same card. The UI no longer uses an OR-match that can open the wrong title.

## Negative Proof

| Check | Result |
|---|---|
| Inquiry swimlane created | 0 |
| Silent deep-link fallback | 0 |
| Wrong-title fallback | 0 |
| Routine Stage 0 Jackie inflation | 0 |
| Missing-source Jackie gate | 0 |
