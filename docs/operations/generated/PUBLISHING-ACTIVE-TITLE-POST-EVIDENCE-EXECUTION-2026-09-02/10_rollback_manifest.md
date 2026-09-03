# Rollback Manifest

Last Verified: 2026-09-02T21:33:48Z

## Production Writes

### The Long Watch

Entity:

`jm1pub_editorialstages`

Record:

`de969f33-06a0-f111-b8dc-6045bdd69435`

Fields repaired:

- `jm1pub_intakereference`
- `jm1pub_publishingintakereference`

Before:

- `jm1pub_intakereference`: null
- `jm1pub_publishingintakereference`: null

After:

- `jm1pub_intakereference`: `JMP-INT-202607-6R2MPZ`
- `jm1pub_publishingintakereference`: `JMP-INT-202607-6R2MPZ`

Audit log:

`883ca2f8-15a7-f111-b8de-000d3a14673b`

## Failed-Closed Runtime Record

The cadence release consumer recorded a new blocked send attempt:

`8a3ca2f8-15a7-f111-b8de-000d3a14673b`

Blocker:

`REQUIRED_ATTACHMENT_MISSING:reviewCoverNote`

## Rollback Assessment

No rollback is recommended. The intake-reference repair is deterministic and resolves a proven data gap. The send did not occur, and the remaining package-completeness issue is preserved as system/JMP attention.
