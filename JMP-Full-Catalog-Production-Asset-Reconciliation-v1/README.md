# JMP Full-Catalog Production Asset Reconciliation v1

**Status:** Operationally reconciled with explicit readiness exceptions  
**Authority date:** 2026-09-05  
**Catalog authority:** Ratified JMP Catalog Authority and Product Identity Standard v0.1

## Authority Chain

`Canonical Author -> Canonical Work -> Edition -> Format/Product -> Production Asset -> SharePoint Drive/Item -> Marketing`

SharePoint remains the byte authority. Dataverse stores canonical identity, stable SharePoint references, classification, readiness, and checksums. No file was moved, renamed, deleted, copied into Dataverse, or publicly posted.

## Commissioned Surface

- Publishing site: `Publishing Team`
- Library: `Documents`
- Historical anchor: `/08_Backlist`
- Additional governed production roots: `/10_Backlist-Consolidated`, `/07_Archive`, `/Archive/Active Projects`, `/02_Active-Pipeline`, `/01_Pre-Pipeline`
- Dataverse table: `jm1pub_productionasset`
- Stable key: `DriveId + ItemId`
- Registered file references: `17,096`
- Canonical works projected: `129`
- Selected primary marketing covers: `74`
- Primary SHA-256 values captured: `74`

## Readiness

| State | Works |
| --- | ---: |
| Ready | 74 |
| Partial | 16 |
| Missing | 11 |
| Ambiguous | 28 |

Partial, missing, and ambiguous are governed operating states, not inferred authority changes. The detailed 129-work ledger is in `evidence/reconciliation/work-asset-readiness.json`.

## Safety Result

- SharePoint writes: `0`
- File deletes/moves/renames: `0`
- Dataverse catalog replay: `0`
- Public posts: `0`
- Conditional replay duplicates: `0`
- Full registry replay: `17,096 NO_OP`
- Work readiness replay: `129 NO_OP`
- Primary hash replay: `74 NO_OP`

## Reproduction

The scripts are intentionally staged: inventory, classify, schema, promote, read back. Mutation scripts require `--execute`; inventory and commissioning readback are read-only. Tokens are acquired from the authenticated Azure CLI process and are never written to evidence.
