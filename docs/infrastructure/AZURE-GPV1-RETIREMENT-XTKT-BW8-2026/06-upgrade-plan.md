# Upgrade Plan

## Wave 0 - Inventory And Assessment

Completed. The subscription contained 10 storage accounts. Two accounts were GPv1 `Storage` and neither showed a Databricks-managed ownership signal.

## Wave 1 - Low-Risk Function Runtime Storage

Accounts:

- `jm1coreservices8242`
- `funcjm1foundationin8054`

Rationale:

- Both accounts are `Standard_LRS`.
- Both are small-capacity Function runtime/package accounts.
- Both have no file shares.
- Both retain public network access and HTTPS-only/TLS 1.2 posture.
- Both dependent Function Apps were running before upgrade.
- No ZRS, redundancy, region, private endpoint, or Microsoft-support condition was identified.

## Selected Access Tier

Hot.

Reason: Function runtime/package storage should remain transaction-friendly. Cool tier was not selected because lower capacity pricing is not a safe optimization for runtime storage, and capacity is already minimal.

## Command Pattern

`az storage account update --resource-group <resource-group> --name <account> --set kind=StorageV2 --access-tier Hot --yes`

## Contingency

The account-kind upgrade cannot be reversed. Workload rollback is application-focused: inspect Function runtime/storage binding, validate app settings through governed secret-safe methods, restore prior dependent app configuration if needed, and escalate to Microsoft support if runtime storage access fails despite preserved endpoints and credentials.
