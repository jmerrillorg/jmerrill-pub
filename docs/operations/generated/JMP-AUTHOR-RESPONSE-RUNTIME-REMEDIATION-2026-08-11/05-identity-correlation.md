# Identity Correlation

Last verified: 2026-08-11T11:18:00Z

The runtime validates sender email against governed gate/contact email evidence before any response capture or gate patch occurs.

| Scenario | Result |
| --- | --- |
| Exact governed sender | PASS |
| Unknown sender | HOLD / NO WRITE |
| Missing gate author identity | HOLD / NO WRITE |
| Mismatched sender | HOLD / NO WRITE |

No fuzzy author assignment is used.

