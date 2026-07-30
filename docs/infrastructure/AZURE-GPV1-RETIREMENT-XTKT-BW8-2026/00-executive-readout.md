# Azure GPv1 Storage Retirement Compliance

Tracking ID: XTKT-BW8
Subscription: 9ee13245-2303-4010-8b6d-35f7cbcfdc0e
Execution date: 2026-07-30
Execution owner: Cody
Governance authority: Jackie

## Decision

Microsoft's GPv1 retirement notice requires proactive remediation before 2026-10-13. JM1 selected controlled in-place upgrade for eligible non-Databricks GPv1 storage accounts so timing, validation, evidence, and workload contingency remain governed by JM1.

## Result

Storage accounts assessed: 10
GPv1 accounts identified: 2
Non-Databricks GPv1 accounts upgraded: 2
Databricks-managed accounts: 0
Legacy BlobStorage accounts: 0
Remaining GPv1 accounts: 0

Both affected accounts were upgraded in place to `StorageV2` with Hot access tier and existing `Standard_LRS` redundancy preserved. Resource IDs and service endpoints remained stable for blob, file, queue, and table services. Azure added GPv2-capable DFS and static website endpoints as expected after account-kind upgrade.

## Business Impact

Data loss: 0 observed
Unplanned outage: 0 observed
Redundancy changes: 0
Endpoint changes for existing services: 0
Secret values retained: 0

Dependent Function Apps remained responsive after upgrade:

- `jm1-ed-functions`: protected endpoint continued returning expected 401.
- `func-jm1-foundation-intake`: public endpoint continued returning 200.

## Final Certification

COMPLETE - AZURE GPV1 RETIREMENT COMPLIANCE

The subscription is compliant with the GPv1 retirement requirement based on final Azure storage inventory readback showing all storage accounts as `StorageV2`.
