# Phase 6 BAU operating standard

| Control | Authority |
| --- | --- |
| Business owner | Publishing |
| Engineering owner | `jmerrillorg/jmerrill-pub` |
| Production authority | JM1-Core |
| Certification environment | JM1-Test |
| Production solutions | `JMP_PublishingV2` `1.0.4.0`; `JMP_PublishingV2_Phase6_Portable` `1.2.0.1` |
| Runtime identity | `id-jm1-publishing-phase6-prod` |
| Dataverse role | `JMP Phase 6 Onboarding Runtime` (45/45) |
| Normal record processing | Publishing operations |
| Drift response | Bounded incident/remediation packet |
| Schema change | Managed solution governance with Test recertification |
| Identity change | Separate bounded security packet |
| Stage 07 transition | Human-authorized only |
| Phase 7 | Held until separately authorized |

## Routine checks

Use existing Azure Application Insights for continuous request, exception, authentication, command, and provider-path visibility. After any Phase 6 solution, identity, role, runtime, or lifecycle-authority change, read back managed versions, required schema, the enabled application user, the exact one-role assignment, all 45 privileges, caller binding, command enablement, runtime health, and the human-first guard. Re-run the canonical suite and JM1-Test negative certification before production promotion.

Business records in Stage 06 remain Publishing operations. Their existence does not reopen Phase 6 engineering. A stuck record becomes an engineering incident only when governed processing fails, authority drifts, or the runtime cannot preserve the contract.

## Incident boundaries

- Schema drift: fail closed and open a managed-solution remediation packet.
- Identity or role drift: do not broaden privileges; open a bounded security packet.
- Correlation, replay, or duplicate denial: preserve evidence and investigate the exact authority tuple.
- Stage 07 attempt without human authority: deny, preserve audit evidence, and halt the initiating path.
- Runtime failure: use Application Insights, the immutable package, and the predecessor rollback evidence.
