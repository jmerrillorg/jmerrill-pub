# Author Title Correlation

Last verified: 2026-08-11T08:45:19Z

## Author Identity

| Field | Value |
| --- | --- |
| Correlation result | PASS |
| Author | Iyorwuese Hagher |
| Email | `hagher.hagher@ymail.com` |
| Contact ID | `c8c8747e-6675-f111-ab0f-6045bdd69678` |
| Evidence source | `docs/operations/generated/2026-07-17-JM1-2026-Royalty-Author-Identity-Final-Register.csv:34` |

The identity register confirms the same email address as the matched Core contact.

## Title / Package Correlation

| Field | Value |
| --- | --- |
| Title | `The General's Will and Last Testament` |
| Title identifier | `JMP-INT-202607-DL2T20` |
| Title ID | `2d21ab5b-4d80-f111-ab0f-7c1e525b15c2` |
| Stage ID | `c2799c31-8f80-f111-ab0f-00224820105b` |
| Gate ID | `576b9a51-688e-f111-8077-7c1e525b15c2` |
| Package ID | `2d21ab5b-4d80-f111-ab0f-7c1e525b15c2:c2799c31-8f80-f111-ab0f-00224820105b:current-author-package` |
| Action | `review-package` |

The outbound review message body carried the title, stage, gate, package, and review action identifiers. The inbound reply was in the same author-facing review thread and was received from the matched author email.

## Pilot / Manual Recovery Context

| Field | Value |
| --- | --- |
| PR #431 state | Manual operations priority remains unchanged |
| Pilot eligibility | PILOT EXCLUDED |
| Risk | RED |
| Reason | AUTHORITATIVE_DEV_EDIT_VALIDATION_REQUIRED |
| Evidence source | `docs/operations/generated/JMP-REAL-TITLE-PILOT-SELECTION-2026-08-09/03-pr431-exclusion-review.md:6` |

Pilot exclusion blocks automated title movement. It does not by itself prove that response capture should be omitted.

