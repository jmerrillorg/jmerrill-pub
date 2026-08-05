# Security and Operations Model

## Role Model

| Role | Access |
|---|---|
| JM1 Publishing Catalog Administrator | Full create/read/update. |
| JM1 Publishing Operations | Read; limited update only if separately approved. |
| Quoting/Proposal service identity | Read active quotable items. |
| Website/API service identity | Read public items only. |
| Authors/external users | No direct table access. |
| Protected Slice 2 executor identity | Minimum privileges required to upsert, supersede, retire, and log. |

## Operational Rules

- Merged legacy items remain preserved.
- Retired records remain preserved.
- Destructive deletion is prohibited.
- Only one active item may exist for a canonical SKU.
- Superseded records must point to their replacement where one exists.
- PF-07 must remain schema-inert, non-public, non-sellable, non-quotable, and not contractable.
- PF-08 must remain active and SOW-gated.
- A required-price record must have either a structured unit price or an approved price expression.
- The executor must reconcile all 120 approved rulings exactly once before mutation.

## Delivery Sequence

1. Review and approve this schema package.
2. Provision in the governed development environment.
3. Export and validate the unmanaged development solution.
4. Deploy through the approved solution pipeline.
5. Read live metadata and capture the actual entity-set name.
6. Retarget or confirm the Slice 2 executor against the verified entity set.
7. Redeploy the application.
8. Run protected dry-run.
9. Require all 120 rulings to reconcile exactly once.
10. Execute once only after dry-run certification.
11. Perform independent Dataverse readback.
12. Run idempotent replay.

## Held Items

Executor field mapping is held until the table is provisioned and live metadata verifies the entity set and actual column logical names.

Production catalog mutation is prohibited until the protected dry-run passes.
