# Prevention And Guardrails

## Repository Review

Search of the current `origin/main` worktree found no Infrastructure-as-Code default or workflow definition specifying legacy `kind: Storage`, `StorageV1`, or GPv1 storage-account creation.

## Compliance Query

Use this Azure Resource Graph query for recurring compliance review:

```kusto
Resources
| where type =~ 'microsoft.storage/storageaccounts'
| where kind in~ ('Storage', 'BlobStorage')
| project subscriptionId, resourceGroup, name, kind, location, sku = tostring(sku.name), tags
| order by subscriptionId, resourceGroup, name
```

Expected result for subscription `9ee13245-2303-4010-8b6d-35f7cbcfdc0e` after this execution: 0 rows.

## Policy Recommendation

Add an Azure Policy audit initiative that flags storage accounts whose `kind` is `Storage` or `BlobStorage`. Do not deploy a tenant-wide modify or deployIfNotExists policy without separate governance review.

## Governance Register Update

Storage account kind should remain part of the Azure governance register with this target:

- Allowed default: `StorageV2`
- Legacy review: `BlobStorage`
- Block or exception-review: `Storage`
- Databricks-managed exception: Microsoft-managed migration boundary
