# Open Exceptions

| Exception ID | Description | Risk | Production Impact | Recommended Remediation | Blocking |
| --- | --- | --- | --- | --- | --- |
| GATE-W1-EX-001 | Positive production /join submission was not completed because Turnstile did not issue a token in automated browser validation. | A critical business path is not independently proven on App Service. | Authors may still be able to submit manually, but reference certification lacks positive evidence. | Use an approved human-assisted Turnstile validation or governed non-production Turnstile testing method that does not weaken production controls. | Yes |
| GATE-W1-EX-002 | App Service staging /api/author/gate rejected temporary synthetic registry and master-code settings with 401. | Native staging session issuance path remains unproven, although denial is fail-closed. | No production access was weakened; staging fixture certification incomplete. | Diagnose why staging runtime does not accept temporary preview-only access settings, or provision an approved staging fixture through the governed Key Vault-backed registry. | Yes |
| GATE-W1-EX-003 | Slot-swap and rollback proof is incomplete. | Enterprise reference pattern lacks repeatable rollback evidence. | DNS rollback values are preserved and SWA remains available, but swap rollback was not proven. | Complete a no-drift slot deployment and swap/rollback exercise or formally approve DNS rollback as the GATE-W1 rollback control. | Yes |
| GATE-W1-EX-004 | Dependency-specific monitoring is not fully implemented. | Incidents in Dataverse, Graph, ACS, storage, or diagnostic runner may be detected later than desired. | App Service metrics/logs are operational; dependency alerting remains immature. | Add dependency-specific synthetic availability and scheduled-query alerts. | No |
| GATE-W1-EX-005 | Local DNS/HTTP stacks may cache the former SWA target until TTL expiry. | Temporary operator confusion during propagation. | Public resolvers show App Service targets; canonical host health passed with App Service IP. | Recheck after TTL and retain the pre-cutover rollback snapshot. | No |

## Exception Decision

Because GATE-W1-EX-001, GATE-W1-EX-002, and GATE-W1-EX-003 are blocking for an enterprise reference pattern, the certification decision is NOT_CERTIFIED.
