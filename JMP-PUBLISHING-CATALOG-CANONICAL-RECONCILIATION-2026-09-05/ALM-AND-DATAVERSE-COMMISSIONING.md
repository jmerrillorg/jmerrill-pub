# ALM And Dataverse Commissioning Record

## Environment And Scope

- Core environment: `https://jm1hq.crm.dynamics.com`
- Core organization: `9dafb403-b493-f011-a700-000d3a106f37`
- Correlation ID: `JMP-CATALOG-CANONICAL-20260905`
- Source SHA-256: `c48f2335c64e3952d2068d271a0e1f43fc28430960c839e2c4d5b54d4ab51316`
- Migration form: additive metadata plus stable, idempotent upsert
- Deletes: 0

## Architecture Decision

The existing Publishing chain remains authoritative: Contact -> `jm1pub_title` -> `jm1pub_edition` -> `jm1pub_publishingasset` -> `jm1pub_assetmarketplace`. The work extends that model rather than creating a Marketing-owned catalog or replacing the existing 120-row commercial catalog.

The additive schema introduces an ISBN allocation table, explicit work authority fields, edition identity fields, product source and distribution fields, and the Product-to-Edition relationship. The final metadata plan readback reports every planned component as present.

## Environment Drift

Dev and Test do not contain the existing Core edition-table baseline required to rehearse the exact extension. Recreating that unrelated baseline was outside this clean-room commission and could have changed architecture beyond the approved scope. The drift is therefore recorded as an ALM limitation; the additive extension was planned, applied, published, and independently read back in Core.

This limitation does not weaken the data proof: every write was precomputed, all operations were additive or updates to reconciled records, there were no deletes, and the post-promotion replay produced 692 no-ops.

## Promotion Result

The initial ledger contains 692 successful writes: 273 creates and 419 updates. Creates comprise 19 reconciled Contacts, 2 new Works, 133 Editions, 8 Products, and 111 reserved ISBN allocations. Updates preserve 127 existing Work IDs and 292 existing Product IDs. A subsequent additive lifecycle-detail update completed 129 successful Work updates.

Independent readback proves 129 Works, 133 Editions, 300 Products, and 111 reserved ISBN allocations. All identity, relationship, checksum, reserved-inventory, publisher-origin, catalog-state, marketing-authority, Shelley baseline, and recent-title checks pass.

## Restore And Replay

The pre-write plans and write ledgers provide the exact mutation inventory. No destructive restore is required because the commission deleted no records and preserved existing IDs. The supported recovery path is to correct source authority, regenerate the deterministic reconciliation, inspect the new pre-write plan, and replay the idempotent upsert. Direct manual state writes are outside this commissioning contract.
