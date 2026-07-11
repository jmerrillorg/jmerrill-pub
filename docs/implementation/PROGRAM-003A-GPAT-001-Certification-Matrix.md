# PROGRAM-003A GPAT-001 Certification Matrix

**GPAT:** GPAT-001 — Stage 0 Editorial Diagnostic  
**Maturity:** Shadow Mode Active  
**Runtime status:** Proven  
**Editorial evaluation status:** Remediation in Progress  
**Last updated:** 2026-07-11

| # | Criterion | Status | Evidence | Owner | Remediation | Blocking | Last validated |
|---|---|---|---|---|---|---|---|
| 1 | Business trigger defined | Passed | Stage 0 diagnostic transaction defined in PROGRAM-003A records | Publishing | None | No | 2026-07-11 |
| 2 | Governed input source | Passed | Governed SharePoint manuscript evidence and Dataverse diagnostic record path proven | Publishing / Infra | None | No | 2026-07-10 |
| 3 | Input integrity validation | Passed | Manuscript artifact and SHA-256 recorded; first shadow request matched governed source | Publishing / Infra | None | No | 2026-07-10 |
| 4 | Registered prompt | Passed | Dataverse prompt registry active | Infra | None | No | 2026-07-10 |
| 5 | Active prompt version | Passed | `PUB-STAGE0-DIAGNOSTIC-V1` resolved from Dataverse | Infra | None | No | 2026-07-10 |
| 6 | Approved runtime identity | Passed | Managed identity and permanent Core writeback lane proven | Infra | None | No | 2026-07-10 |
| 7 | Least-privilege resource access | Passed | Controlled role set and Core writeback proven | Infra | None | No | 2026-07-10 |
| 8 | Approved model/deployment | Passed | `jm1-pub-diagnostic-primary` deployed and proven | Infra | None | No | 2026-07-10 |
| 9 | Model-routing policy | Partial | Centralized editorial model-routing registry added in source | Cody | Promote and deploy with runner slice | Yes | 2026-07-11 |
| 10 | Style-guide selection policy | Partial | Deterministic selector added in source using governed canon | Cody | Promote and deploy with runner slice | Yes | 2026-07-11 |
| 11 | Fail-closed behavior | Passed | Existing runtime blocks invalid prompt/provider conditions; new selector fails closed on conflicts | Cody | Extend proof in live rerun | No | 2026-07-11 |
| 12 | Production fallback disabled | Passed | First real shadow attempt used fallback-disabled execution | Infra | None | No | 2026-07-10 |
| 13 | AI request logging | Passed | `jm1_airequestlog` proven | Infra | None | No | 2026-07-10 |
| 14 | Execution logging | Passed | `jm1_executionlog` proven | Infra | None | No | 2026-07-10 |
| 15 | Dependency telemetry | Passed | Dependency telemetry proven in Application Insights | Infra | None | No | 2026-07-10 |
| 16 | Governed evidence storage | Partial | SharePoint source evidence proven; hierarchical intermediate artifacts implemented in source only | Cody / Publishing | Deploy and execute rerun | Yes | 2026-07-11 |
| 17 | Output schema | Passed | Existing diagnostic schema validator live; hierarchical structured findings schema added in source | Cody | Deploy and prove | No | 2026-07-11 |
| 18 | Source traceability | Partial | Segment manifest / findings ledger designed and implemented in source | Cody | Deploy and execute rerun | Yes | 2026-07-11 |
| 19 | Human review requirement | Passed | Mandatory human review preserved in controlled and shadow paths | Publishing | None | No | 2026-07-10 |
| 20 | Prohibited autonomous actions | Passed | No gate/stage/portal/author mutation in shadow path | Publishing / Infra | None | No | 2026-07-10 |
| 21 | Kill switch | Passed | Runtime execution gate present | Infra | None | No | 2026-07-10 |
| 22 | Retry and resumability | Partial | Batch retry ceiling and resumable plan implemented in source | Cody | Deploy and prove | Yes | 2026-07-11 |
| 23 | Idempotency | Partial | Per-batch deterministic IDs and stable segment IDs implemented in source | Cody | Deploy and prove | Yes | 2026-07-11 |
| 24 | Cost measurement | Partial | Cost estimation implemented in source; live measured cost pending rerun | Cody / Infra | Execute rerun | Yes | 2026-07-11 |
| 25 | Token measurement | Partial | Batch token estimation in source; live measured batch token evidence pending rerun | Cody / Infra | Execute rerun | Yes | 2026-07-11 |
| 26 | Latency measurement | Partial | Dependency telemetry proven; hierarchical runtime latency pending rerun | Infra | Execute rerun | Yes | 2026-07-11 |
| 27 | Error handling | Passed | Oversized-input failure recorded as governed evidence; hierarchical fail states implemented in source | Cody | None | No | 2026-07-11 |
| 28 | Privacy/security boundary | Passed | No prompt/manuscript text persisted to Dataverse | Infra | None | No | 2026-07-10 |
| 29 | Quality-evaluation standard | Partial | Comparison requirements defined; live comparison not yet executed | Publishing / Cody | Execute rerun and compare | Yes | 2026-07-11 |
| 30 | Re-certification cadence | Pending | Not yet recorded in live GPAT governance | Jackie / Publishing | Set cadence after rerun | No | 2026-07-11 |
| 31 | Model/version retirement handling | Partial | Routing registry stores model/version posture in source | Cody / Infra | Promote and formalize | No | 2026-07-11 |
| 32 | Prompt/style-guide supersession handling | Partial | Prompt and guide version capture implemented in source | Cody | Promote and prove | No | 2026-07-11 |
| 33 | Production owner | Passed | Publishing operational ownership established | Publishing | None | No | 2026-07-11 |
| 34 | Technical owner | Passed | JM1 runtime / infra lane established | Infra | None | No | 2026-07-11 |
| 35 | Business disposition authority | Passed | Jackie remains authority for maturity advancement | Jackie | None | No | 2026-07-11 |

## Current Blocking Criteria

The criteria currently blocking GPAT-001 from moving beyond Shadow Mode are:

- 9. Model-routing policy not yet deployed in the governed runner
- 10. Style-guide selection policy not yet deployed in the governed runner
- 16. Governed hierarchical evidence chain not yet executed live
- 18. Source traceability not yet proven in a real rerun
- 22. Retry and resumability not yet proven in a real rerun
- 23. Idempotency not yet proven in a real rerun
- 24. Cost measurement not yet captured from a live hierarchical rerun
- 25. Token measurement not yet captured from a live hierarchical rerun
- 26. Latency measurement not yet captured from a live hierarchical rerun
- 29. Quality-evaluation comparison not yet completed against publisher truth

## Current Maturity Recommendation

GPAT-001 remains truthfully classified as:

- **Shadow Mode Active**
- **Runtime Proven**
- **Editorial Evaluation Remediation in Progress**
