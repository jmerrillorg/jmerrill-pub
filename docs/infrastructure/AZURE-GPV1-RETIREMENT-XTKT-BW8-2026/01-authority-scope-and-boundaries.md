# Authority, Scope, And Boundaries

## Authority

Jackie authorized Cody to identify, assess, upgrade, validate, and preserve evidence for every non-Databricks Azure Storage account affected by Microsoft's GPv1 retirement notice in subscription `9ee13245-2303-4010-8b6d-35f7cbcfdc0e`.

Tracking ID: XTKT-BW8

## Included

- Full storage-account inventory for the named subscription.
- GPv1 and legacy BlobStorage classification.
- Databricks-managed boundary assessment.
- Dependency and cost posture assessment for affected accounts.
- In-place upgrade for eligible non-Databricks GPv1 accounts.
- Post-upgrade validation and evidence preservation.

## Not Authorized And Not Performed

- Databricks-managed account migration.
- Storage account deletion, recreation, rename, data copy, or endpoint replacement.
- Key rotation.
- SAS, key, connection-string, token, or data-content capture.
- Redundancy, region, firewall, private endpoint, public access, lifecycle deletion, or hierarchical namespace changes.
- Unrelated storage modernization.

## Execution Boundary

The upgrade is irreversible at the account-kind level. Rollback remains workload-focused: validate dependent applications, preserve configuration evidence, and use application contingency or alternate storage only if a dependent workload fails.
