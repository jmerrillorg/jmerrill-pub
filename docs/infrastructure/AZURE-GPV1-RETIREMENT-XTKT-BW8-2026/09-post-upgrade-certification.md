# Post-Upgrade Certification

## Subscription Re-Inventory

Final readback showed all 10 storage accounts in subscription `9ee13245-2303-4010-8b6d-35f7cbcfdc0e` as `StorageV2`.

Remaining GPv1 accounts: 0
Legacy BlobStorage accounts: 0
Databricks-managed GPv1 accounts: 0

## jm1coreservices8242

Final kind: `StorageV2`
Access tier: `Hot`
SKU/redundancy: `Standard_LRS`
Provisioning state: `Succeeded`
HTTPS only: true
Minimum TLS: `TLS1_2`
Public blob access: false
Existing endpoints preserved:

- Blob: `https://jm1coreservices8242.blob.core.windows.net/`
- File: `https://jm1coreservices8242.file.core.windows.net/`
- Queue: `https://jm1coreservices8242.queue.core.windows.net/`
- Table: `https://jm1coreservices8242.table.core.windows.net/`

Dependent app validation: `jm1-ed-functions` returned HTTP 401, matching its protected pre-upgrade posture.
Container inventory validation: PASS
Data loss observed: 0
Unplanned downtime observed: 0

## funcjm1foundationin8054

Final kind: `StorageV2`
Access tier: `Hot`
SKU/redundancy: `Standard_LRS`
Provisioning state: `Succeeded`
HTTPS only: true
Minimum TLS: `TLS1_2`
Public blob access: false
Existing endpoints preserved:

- Blob: `https://funcjm1foundationin8054.blob.core.windows.net/`
- File: `https://funcjm1foundationin8054.file.core.windows.net/`
- Queue: `https://funcjm1foundationin8054.queue.core.windows.net/`
- Table: `https://funcjm1foundationin8054.table.core.windows.net/`

Dependent app validation: `func-jm1-foundation-intake` returned HTTP 200.
Container inventory validation: PASS
Data loss observed: 0
Unplanned downtime observed: 0

## Certification Decision

COMPLETE - AZURE GPV1 RETIREMENT COMPLIANCE
