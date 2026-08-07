# Operator Burden Assessment

Source baseline: `08-OPERATOR-LOAD-ASSESSMENT.md` visible operator-load table, 18 traceable actions.

| Metric | Count |
| --- | --- |
| Current Jackie actions | 18 |
| Target Jackie actions | 7 |
| Actions removed | 11 |
| Actions automated/system-routed | 10 |
| Actions remaining appropriate | 7 |
| New burden introduced | 0 |


## Burden Disposition by Backlog Item

| Item | Work package | Burden disposition | Reason |
| --- | --- | --- | --- |
| S3-01 | Canon and schema manifest | BURDEN_NEUTRAL | Keep as documentation guard, but extend evidence references to the ruled capability register and Microsoft reuse gate. |
| S3-02 | Choice sets and transition registry | NET_BURDEN_REDUCTION | Keep transition vocabulary, but scope it to Dataverse configuration first and avoid custom transition registry work until Microsoft options are exhausted. |
| S3-03 | Execution-log contract | NET_BURDEN_REDUCTION | Keep because ruled system-of-record decisions depend on execution evidence, but integrate SharePoint/Power Platform evidence capture before custom log tooling expands. |
| S3-04 | Title and edition schema extensions | NET_BURDEN_REDUCTION | Keep title/edition authority, but revise fields against the capability register, commercial authorization, author status, marketing triggers, and financial projections. |
| S3-05 | Security roles | NET_BURDEN_REDUCTION | Keep as Microsoft-first configuration work using Dataverse role and field security rather than custom authorization code where possible. |
| S3-06 | Transition-validation service | NET_BURDEN_REDUCTION | Retain fail-closed logic, but implement only after Dataverse/Power Automate validation paths are assessed and only for rules Microsoft configuration cannot enforce. |
| S3-07 | Protected transition endpoints | BURDEN_NEUTRAL | Replace endpoint-first posture with Power Apps/Power Automate/Dataverse command surfaces unless a custom endpoint is proven necessary. |
| S3-08 | Author-status projection | NET_BURDEN_REDUCTION | Reconcile against Power Pages, Power Apps, Exchange, and existing web before assuming custom portal projection remains the correct surface. |
| S3-09 | Correction Authorized workflow | NET_BURDEN_REDUCTION | Use Microsoft approvals/Power Automate/Dataverse audit where sufficient; custom workflow only if approved exception behavior cannot be configured. |
| S3-10 | Release-plan model | NET_BURDEN_REDUCTION | Re-scope because the ruled authority is Dataverse title/edition authority; no shadow release-plan object should be introduced. |
| S3-11 | Distribution-job model | NET_BURDEN_REDUCTION | Remove standalone distribution-job authority from this tranche; retain distribution attempts and outcomes as jm1_executionlog events. |
| S3-12 | Internal-title migration rehearsal | BURDEN_NEUTRAL | Defer until commercial, financial, marketing, author, and daily-operator prerequisites are sequenced and approved. |
| S3-13 | Production certification | BURDEN_NEUTRAL | Defer until revised implementation sequence completes and Jackie separately authorizes certification scope. |


NET_BURDEN_INCREASE items: 0.

The revised plan should reduce remembering, checking, routing, filing, chasing, and reconciliation. It should not give Jackie another disconnected dashboard to monitor.
