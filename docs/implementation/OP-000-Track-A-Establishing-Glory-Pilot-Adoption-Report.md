# OP-000 Track A Pilot Adoption Report - Establishing Glory: The Library

**Program:** PROGRAM-002 - Autonomous Publishing Production Pipeline
**Phase:** Phase II - OP-000 Pipeline Adoption, Recovery & Catalog Certification
**Track:** Track A - Active Pipeline Adoption
**Pilot title:** *Establishing Glory: The Library*
**Status:** Implementation candidate; ready for governed deployment and controlled adoption run
**Date:** 2026-07-05

## Objective

Adopt one active in-flight publishing title into PROGRAM-002 without restarting publishing, duplicating records, recreating history, or forcing the author through a new `/join` lifecycle.

This pilot proves the OP-000 adoption method:

1. Discover existing evidence.
2. Validate the current state.
3. Link existing records/assets.
4. Certify historical work truthfully.
5. Resume from the current lifecycle position.

## Pilot Record

| Field | Value |
|---|---|
| Title | *Establishing Glory: The Library* |
| Intake reference | `JMP-INT-202606-UFYG60` |
| Diagnostic ID | `64e387e0-7e6a-f111-a826-00224820105b` |
| Existing Opportunity | `2653fca9-eacd-4c44-b3ed-1764dd5d35aa` |
| Opportunity name | `Publishing Intake - Establishing Glory: The Library` |
| Manuscript filename | `240711 Establishing Glory.docx` |
| Manuscript word count | `48,232` |
| Manuscript SHA-256 | `b337a17a27c0c7108302ca7f671c26d788ce289fc3b9ffab6b12e09e23e87e31` |

## Adoption Decision

| Area | Decision |
|---|---|
| Relationship State | `Active Author` |
| Workspace Mode | `Active Author Workspace` |
| Current stage | `Production Pipeline / Commissioning Hold` |
| Package evidence | Professional package evidence retained from INT-PUB-005 commissioning records |
| Imprint | `JM Works` |
| Imprint lock | Locked; not a JM Signature candidate |
| Adoption scope | Track A only |

## Existing Evidence Used

| Evidence | Source |
|---|---|
| Real manuscript pilot success | `docs/operations/int-pub-005-real-manuscript-pilot-attempt-4.md` |
| Milestone 6 business/onboarding readiness | `docs/operations/int-pub-005-milestone-6-agreement-onboarding-readiness.md` |
| Milestone 7 production readiness | `docs/operations/int-pub-005-milestone-7-production-readiness.md` |
| Milestone 7C editorial command center | `docs/operations/int-pub-005-milestone-7c-editorial-command-center.md` |
| Milestone 8 distribution setup readiness | `docs/operations/int-pub-005-milestone-8-distribution-setup-readiness.md` |

## Create-Only-Missing Rule

The OP-000 Track A runner does not create or duplicate:

- Contact
- Lead
- Opportunity
- Contract
- Payment
- SharePoint workspace
- Production task
- Distribution task
- Royalty record
- Author/public communication

The pilot writes safe historical execution evidence only when the dedicated gate `JM1_OP000_ADOPTION_ENABLED` is open.

## Runner

| Item | Value |
|---|---|
| Function route | `run-op000-track-a-adoption` |
| Gate | `JM1_OP000_ADOPTION_ENABLED` |
| Required confirmation | `confirmOp000TrackAAdoption: true` |
| Record allowlist | Exact title + intake + diagnostic + Opportunity match |
| Write target | `jm1_executionlogs` |
| Write behavior | One historical evidence record per prepared OP-000 event |

## Live Action Boundary

The pilot is safe to deploy because the route fails closed unless:

1. The runner key is valid.
2. The request matches the exact Track A pilot identifiers.
3. The explicit confirmation flag is present.
4. `JM1_OP000_ADOPTION_ENABLED=true`.

No author-facing, payment, royalty, Business Central, Stripe, production, distribution, launch, or workspace movement action is reachable from this runner.

## Pilot Status

Track A is ready for governed deployment and one controlled adoption run. Track B, Track C, and catalog-wide adoption remain blocked until this pilot is certified.
