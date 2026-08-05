# Slice 3 Implementation Checklist

Status: DESIGN ONLY
Implementation authority: NO

Implementation may not start until executive approval explicitly authorizes Slice 3 implementation.

## Authority Preconditions

- Target Architecture v1.0 remains canonical.
- Slice 3 design package is approved.
- Open gaps are accepted, closed, or explicitly deferred.
- Client-title automation thaw is either denied or explicitly authorized.
- Slice 3 implementation scope is separately approved.

## Design Preconditions

- PF state machine accepted.
- Execution-log taxonomy accepted.
- PF orchestration accepted.
- Dependency graph accepted.
- Author experience projection accepted.
- `CORRECTION_AUTHORIZED` accepted.
- J0-J8 binding and gaps accepted.
- State transition matrix accepted.

## Technical Preconditions

- `jm1pub_edition` and `jm1pub_publishingasset` relationship authority is decided.
- Release-plan entity decision is made.
- Product-form attributes storage decision is made.
- Contractable-after-approved-scope vocabulary is mapped.
- Companion Editions model is approved.
- 21-day propagation exception policy is approved.
- Event idempotency key standard is approved.

## Runtime Requirements

Future implementation must:

- reject transitions not in the state transition matrix;
- require execution-log evidence for every material transition;
- preserve PF-07 schema-inert status;
- preserve PF-08 active/SOW-gated status;
- read Slice 2 catalog authority instead of duplicating it;
- block ISBN assignment before verified FTL;
- block submission before distribution ready;
- block live status before confirmed-live evidence;
- block correction paths without `CORRECTION_AUTHORIZED`;
- project author-safe labels only;
- hide internal PF states, Dataverse terms, and execution IDs from authors.

## Mutation Controls

Implementation must prove:

- dry-run path;
- fail-closed authorization;
- idempotent replay;
- no duplicate active PF instance where uniqueness is required;
- rollback authority path;
- manual exception path;
- evidence capture;
- checksums or source artifact fingerprints.

## Tests Required In Future Implementation

Future runtime tests must cover:

- each allowed transition;
- each forbidden transition;
- PF-07 inert enforcement;
- PF-08 SOW-gate enforcement;
- author-facing projection;
- correction authorization;
- FTL before ISBN;
- distribution ready before submission;
- submitted before live;
- idempotency replay;
- rollback;
- manual exception owner rules;
- client-title automation freeze.

## Out Of Scope Until Separately Authorized

- Dataverse implementation;
- Power Automate;
- table/field/choice creation;
- plugin creation;
- website changes;
- Business Central;
- title movement;
- author communication;
- distribution submission;
- client-title automation.

