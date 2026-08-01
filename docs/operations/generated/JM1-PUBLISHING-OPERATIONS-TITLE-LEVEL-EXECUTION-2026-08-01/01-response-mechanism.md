# Shared Author Response Mechanism

Generated: 2026-08-01

## Scope

The package engine now provides one governed response mechanism that can be bound separately to each author-review package.

Allowed author decisions:

| Decision | Purpose |
| --- | --- |
| APPROVE_AS_PRESENTED | Author accepts the package with no requested changes |
| APPROVE_WITH_CORRECTIONS | Author accepts the package subject to submitted corrections |
| QUESTIONS_OR_CLARIFICATION_REQUESTED | Author asks for clarification before approval |

## Required Recorded Fields

| Field | Status |
| --- | --- |
| canonical Contact | Required |
| canonical title | Required |
| stage | Required |
| package ID | Required |
| package version | Required |
| manifest checksum | Required |
| response type | Required and policy-checked |
| author comments or attachment | Required for corrections or questions |
| submitted timestamp | Required |
| authenticated identity | Required |
| approval-gate relationship | Required |

## Fail-Closed Controls

| Control | Result |
| --- | --- |
| Anonymous approval | Blocked |
| Cross-author access | Blocked |
| Superseded package response | Blocked |
| Response for non-open package | Blocked |
| Wrong title/package relationship | Blocked |
| Wrong stage/package relationship | Blocked |
| Wrong gate/package relationship | Blocked |
| Wrong package version | Blocked |
| Wrong manifest checksum | Blocked |
| Unsupported response type | Blocked |
| Empty correction/question response | Blocked |
| Silence as approval | Not implemented and not authorized |

## Regression Coverage

Test file: scripts/author_review_package_engine.test.mjs

Added coverage:

| Test | Result |
| --- | --- |
| Canonical response options are used by every package policy | PASS |
| Authenticated same-author package response records required fields | PASS |
| Anonymous response is rejected | PASS |
| Cross-author response is rejected | PASS |
| Superseded package response is rejected | PASS |
| Manifest checksum mismatch is rejected | PASS |
| Empty correction/question detail is rejected | PASS |

Targeted command:

```text
node --test scripts/author_review_package_engine.test.mjs
```

Observed result: PASS, 23 tests.
