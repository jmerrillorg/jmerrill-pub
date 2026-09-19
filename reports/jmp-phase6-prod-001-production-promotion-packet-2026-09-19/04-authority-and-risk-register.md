# Authority and Risk Register

| Risk | Control | Stop condition |
| --- | --- | --- |
| Wrong production caller | Resolve runtime, Entra identity, Dataverse application user, and GUID independently | Any unresolved or shared identity |
| System Administrator dependency | Assign only the Phase 6 role and read effective privileges | Any administrative or unrelated role |
| Wrong-title/author/engagement replay | Exact server-side durable-ID correlation | Any substituted tuple accepted |
| Duplicate effect | Durable idempotency plus expected version | More than one record/effect |
| Early enablement | Keep environment switch false through import and binding | Command enabled before readback |
| Real-client canary | Nonexistent-ID no-mutation canary only | Any real title/author selected |
| Human-first breach | Eligibility only; no automatic Stage 07 transition | Any consequential advancement |
| Unsafe rollback | Disable command first; never uninstall as emergency rollback | Data-destructive rollback proposed |
| Artifact drift | Exact package SHA and canonical merge provenance | Hash or provenance mismatch |
| Scope expansion | No UAT certification route, communications, payments, royalties, or provider actions | Any unrelated effect requested |

`EXACT_HUMAN_ACTION_REQUIRED_TO_EXECUTE = issue explicit JMP-PHASE6-PROD-001 production-import authority after reviewing the completed preflight.`
