# Author Decision Remediation

Last verified: 2026-08-10T02:46:15Z

Implementation: `lib/server/author-decision-closeout-propagation.ts`.

The remediation adds governed reply classification and correlation:

| Reply | Result |
| --- | --- |
| Approved | APPROVED |
| Approved with corrections | APPROVED_WITH_CORRECTIONS |
| I have questions | QUESTIONS |
| Ambiguous reply | REVIEW_REQUIRED / HOLD |

The engine requires a correlated review request using the strongest available identifiers: title, stage, gate, package, outbound message, reply message, and correlation ID. A reply for the wrong title, wrong gate, wrong package, or unmatched message fails closed.

Evidence persistence is represented as governed fact mutations only. It does not advance the title state.

