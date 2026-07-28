# OR-2026-002A Cutover, Rollback, and UAT Plan

## Cutover Preconditions

- Jackie approves the secure-consumption architecture.
- Runtime identity and Key Vault access are validated without retrieving the secret into evidence.
- Canonical flow is selected.
- Secure boundary is deployed through a governed branch/PR.
- Power Automate action/run-history leakage controls are configured.
- UAT package is approved.

## UAT Matrix

| Scenario | Expected result |
|---|---|
| Scheduled sync invokes secure boundary | Success with correlation ID |
| Secret missing or disabled | Fail closed; no endpoint exposed |
| Precoa unavailable | Bounded retry; non-sensitive failure log |
| Duplicate event in feed | Idempotent update or skip |
| Removed future event | Governed cancellation/deletion marker, not uncontrolled deletion |
| Malformed calendar payload | Error counted; no raw payload in logs |
| Downstream Dataverse failure | Dead-letter/retry posture; no credential exposure |
| Power Automate export after remediation | No full feed URL in definition |

## Rollback

Rollback must not restore the endpoint into broadly visible configuration by default. If emergency rollback requires prior flow behavior, Jackie must explicitly approve the temporary risk exception and its time box.

## Production Cutover Boundary

No production behavior changed in OR-2026-002A. Production cutover is a later governed execution item.
