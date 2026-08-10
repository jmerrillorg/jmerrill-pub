# Awaiting-State Remediation

Last verified: 2026-08-10T02:46:15Z

The propagation engine closes `jm1pub_awaitingsince` only when a governed decision correlates to the same review request.

Required behavior is now tested:

| Condition | Result |
| --- | --- |
| Matching decision for matching review request | Awaiting state closes |
| Reply for unrelated title | Awaiting state remains |
| Reply for unrelated package | Awaiting state remains |
| Missing matching gate | HOLD / REVIEW_REQUIRED |
| Ambiguous reply | HOLD / REVIEW_REQUIRED |

This prevents a generic author reply from clearing an unrelated response clock.

