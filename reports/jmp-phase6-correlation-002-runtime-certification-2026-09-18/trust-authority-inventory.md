# Trust Authority Inventory

| Candidate | Classification | Evidence | Disposition |
| --- | --- | --- | --- |
| Entra token for `func-jm1-publishing-inbound-uat` | AUTHORITATIVE | System-assigned managed identity app ID `2c9c1fc3-5733-4a64-b4e2-9a3cef50d470`; matching enabled JM1-Test application user | Selected caller authentication |
| `JMP Phase 6 Onboarding Runtime - JM1-Test` | AUTHORITATIVE | One direct role; 41 effective privileges; no administrative or unrelated-brand grants | Selected caller authorization |
| Durable engagement/author/title/lifecycle relationships | AUTHORITATIVE | Corrected plug-in source resolves and compares every supplied GUID server-side | Selected claim-integrity authority |
| Expected record version and idempotency key | AUTHORITATIVE | Existing command contract and regression suite | Selected stale-state/replay authority |
| Static `Actor` and `AuthorityContext` strings | SUPPORTING_ONLY | Caller-controlled request fields | Defense in depth only; never authentication |
| Phase 6 strong-name key | ASSEMBLY_OR_PACKAGE_SIGNING_ONLY | MSBuild `AssemblyOriginatorKeyFile` input | Required for deployment; prohibited for request signing |
| Portal/session/action token secrets | WRONG_PURPOSE | Existing secrets govern different trust contracts | Do not reuse |
| Shared `JMP JM1-INFRA-PAM-Automation` identity | SHARED_TOO_BROAD | System Administrator and cross-workload use | Preserve for existing workloads; do not use for runtime proof |

Selected model: `ENTRA_CALLER_TOKEN + SERVER_SIDE_CORRELATION`.
