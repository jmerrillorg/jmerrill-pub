# Microsoft Advisory Record

Tracking ID: XTKT-BW8
Retirement: GPv1 Azure Storage accounts
Retirement date: 2026-10-13
JM1 preferred completion: 2026-09-15

## Advisory Summary

Microsoft is retiring General Purpose v1 storage accounts. The supported remediation for eligible accounts is generally an in-place upgrade from account kind `Storage` to `StorageV2`. Existing service endpoints and data remain in place; pricing posture can change, and the account-kind upgrade cannot be reversed.

## JM1 Interpretation

JM1 will not rely on automatic Microsoft migration. Affected non-Databricks accounts must be proactively inventoried, cost-reviewed, upgraded, validated, and preserved in governed evidence.

## Account Kinds Reviewed

- `Storage`: GPv1, affected by the immediate retirement notice.
- `BlobStorage`: legacy Blob Storage, separately reviewed because Microsoft recommends GPv2 modernization.
- `StorageV2`: already compliant for this retirement requirement.
