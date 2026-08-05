# Slice 3 Design Package Overview

Status: DESIGN COMPLETE CANDIDATE
Created: 2026-08-05
Target Architecture: CANONICAL v1.0
Commercial Catalog: Slice 2 COMPLETE
PF Architecture: CANONICAL
Matrix v1.1: CANONICAL
Client-title automation: FROZEN
Client-title production: MANUAL

Implementation authority: NO
Schema mutation authority: NO
Runtime authority: NO
Automation activation authority: NO

## Purpose

Slice 3 design defines the product-form state machine, execution-log taxonomy, product-form orchestration, dependency graph, author-facing status projection, correction authority, J0-J8 binding, implementation checklist, and platform-wide transition matrix required before implementation can become mechanical.

This package answers design questions only. It does not write code, create Dataverse tables, change schema, activate automation, mutate client titles, change catalog authority, change pricing, change Matrix v1.1, modify Business Central, or alter the public website.

## Boundaries

Slice 3 design may define:

- permitted and forbidden product-form state transitions;
- required evidence and execution-log events;
- how PF-01 through PF-08 depend on Target Architecture v1.0, Slice 2, Matrix v1.1, Editorial Master, Format & Title Lock, ISBN assignment, release planning, distribution, correction authority, and author-facing status projection;
- what implementation must later satisfy.

Slice 3 design may not perform:

- Dataverse mutation;
- schema creation or modification;
- runtime implementation;
- Power Automate work;
- website work;
- Business Central work;
- client-title automation;
- client-title production movement.

## Dependencies

| Dependency | Current state | Slice 3 design use |
|---|---|---|
| Target Architecture v1.0 | CANONICAL | Governs entity spine, lifecycle boundaries, unresolved gaps, and non-authorization limits |
| Slice 2 commercial catalog | COMPLETE / PRODUCTION-VERIFIED | Governs commercial item authority, pricing, quoting, sellable status, PF-07 and PF-08 commercial posture |
| Matrix v1.1 | CANONICAL | Governs PF-01 through PF-08, package entitlement, product-form attributes, and pricing basis |
| `jm1pub_commercialcatalogitem` | DEPLOYED COMMERCIAL AUTHORITY | Read dependency for entitlement, quoting, pricing, public visibility, SOW, supersession, and sellable posture |
| `jm1pub_title` | CANONICAL TITLE ENTITY | Title-level authority, editorial state, author-facing status anchor |
| `jm1pub_edition` | TARGET EDITION ENTITY | Edition/PF instance authority; implementation still blocked pending relationship reconciliation |
| `jm1pub_publishingasset` | CURRENT OPERATIONAL ASSET LAYER | Transitional bridge until edition relationship authority is resolved |
| `jm1pub_editorialartifact` | CANONICAL ARTIFACT ENTITY | Editorial Master, FTL, correction and artifact evidence |
| `jm1_executionlog` | CANONICAL PROOF LAYER | Required for transition evidence, idempotency, actor, timestamp, correlation, rollback and replay |
| J0-J8 authority | CANONICAL WITH MATERIALIZATION GAP | Bind only to merged source mappings; do not invent expanded labels |

## Non-Goals

This package does not:

- authorize Slice 3 implementation;
- create a Dataverse state machine;
- create tables, fields, choices, keys, relationships, plugins, flows, agents, or jobs;
- alter catalog, pricing, package, PF, Matrix, or Business Central authority;
- activate client-title automation;
- advance any title;
- assign ISBNs;
- submit to distribution;
- send author-facing communication;
- create public-surface changes.

## Required Package Contents

| File | Purpose |
|---|---|
| `00-Slice-3-Overview.md` | Purpose, boundary, dependencies, non-goals |
| `01-PF-State-Machine.md` | Complete design of PF state semantics and transitions |
| `02-ExecutionLog-Taxonomy.md` | Event catalog, payloads, correlations, actors, evidence |
| `03-PF-Orchestration.md` | PF-01 through PF-08 orchestration diagrams and gates |
| `04-Dependency-Graph.md` | Editorial Master to release dependency graph |
| `05-Author-Experience.md` | Author-facing plain-language status projection |
| `06-Correction-Authorized.md` | `CORRECTION_AUTHORIZED` definition |
| `07-J0-J8-Binding.md` | Current J0-J8 binding and documented gaps |
| `08-Slice-3-Implementation-Checklist.md` | Future implementation requirements; no code |
| `09-JM1-Publishing-State-Transition-Matrix.csv` | Platform transition matrix source artifact |
| `evidence-index.json` | Package manifest and validation evidence |
| `checksums.sha256` | Package checksums |

## Required Return State

Slice 3 Design: COMPLETE

Implementation: NOT STARTED

Runtime mutations: 0

Schema mutations: 0

Dataverse mutations: 0

Business Central mutations: 0

Client-title automation: FROZEN

Client-title production: MANUAL

