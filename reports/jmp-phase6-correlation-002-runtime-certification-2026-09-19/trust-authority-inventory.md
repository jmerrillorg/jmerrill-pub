# Trust Authority Inventory

| Authority | Classification | Use |
| --- | --- | --- |
| Entra token for `func-jm1-publishing-inbound-uat` | AUTHORITATIVE | Authenticates the nonproduction caller |
| JM1-Test application user `c8b4a60b-1ab4-f111-aaac-70a8a59b112b` | AUTHORITATIVE | Maps the workload identity into Dataverse |
| `JMP Phase 6 Onboarding Runtime` role | AUTHORITATIVE | Grants the bounded Phase 6 runtime privileges |
| Custom API execute privilege `prvCreatejmpv2_OnboardingRecord` | AUTHORITATIVE | Prevents users without the Phase 6 grant from invoking the API |
| Server-side engagement/author/title/lifecycle correlation | AUTHORITATIVE | Prevents claim substitution and cross-work replay |
| Expected version and durable idempotency key | AUTHORITATIVE | Prevents stale-state writes and duplicate effects |
| `Actor` and `AuthorityContext` request fields | SUPPORTING ONLY | Defense-in-depth command checks, never authentication |
| Existing strong-name key | ASSEMBLY_OR_PACKAGE_SIGNING_ONLY | Signs the Dataverse plug-in assembly |
| Shared `JMP JM1-INFRA-PAM-Automation` user | SHARED_TOO_BROAD | Preserved for existing workloads; excluded from Phase 6 runtime |

Selected model: `ENTRA CALLER TOKEN + SERVER-SIDE CORRELATION`.
