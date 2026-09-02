# Tier 1 Security Proof Contract

Last verified: 2026-09-02T21:45:33Z

## Pass Conditions

| Requirement | Status |
| --- | --- |
| Authentication required for author context | PASS |
| Session creation uses governed author identity paths | PASS_BY_TEST |
| Session continuity source-backed | PASS_BY_TEST |
| Contact/profile resolution prefers durable External ID where present | PASS_BY_TEST |
| Resource/title ownership enforced server-side | PASS_BY_SOURCE_AND_TEST |
| Artifact ownership enforced server-side | PASS |
| Current artifact/version binding enforced | PASS |
| Superseded artifact denied | PASS |
| Cross-author denial | PASS_WITH_NARROW_LIVE_AUTH_GAP |
| Browser context tampering denial | PASS_WITH_NARROW_LIVE_AUTH_GAP |
| Replay resistance | PASS |
| Logout/session termination | PASS |
| Fail-closed ambiguity | PASS |
| Tier 2 unavailable | PASS_BY_GOVERNANCE |

## Classification

`TIER_1_SECURITY_PROVEN_WITH_NARROW_RUNTIME_GAPS`

The remaining gaps are authenticated-live proof gaps, not implementation authorization. V1 remains unauthorized until Jackie separately approves any build or activation.
