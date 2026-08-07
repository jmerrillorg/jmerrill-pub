# Tranche 1 Single-Operator + Commercial Foundation Planning

Classification: IMPLEMENTATION PLANNING / PROOF PREPARATION ONLY / NO RUNTIME AUTHORITY

Date: 2026-08-07
Canonical baseline: PR #436 merge `cb994d6b52ba45a3ef451e123625f16fb57c5675`.

## Decision

Tranche 1 is ready as a planning package for executive review. It defines the commercial front door, the Microsoft-first sales path, the payment-truth boundary, the fulfillment authorization gate, and the daily operator surface. It does not authorize configuration or implementation.

## Tranche Scope

Included: Single-Operator Daily Control, Lead and Opportunity Management, Quote / Offer / Package Selection, Agreement Generation and Version Control, Payment Status Projection, Fulfillment Authorization Boundary, Executive Exception Queue, Evidence / Audit Trail.

Excluded: Business Central production posting, royalty processing, title/PF runtime, author portal redesign, lifecycle marketing automation, post-publication automation, Financial/JMF work, Tranche 2.

## Required Acceptance Criteria

Commercial lifecycle: COMPLETE
Dynamics 365 Sales role: DEFINED
Dataverse role: DEFINED
Stripe role: DEFINED
Business Central handoff: DEFINED
Agreement integration: DEFINED
Quote/pricing integration: DEFINED
Fulfillment authorization gate: DEFINED
Single-operator daily surface: DEFINED

- One commercial lifecycle exists: PASS
- No duplicate commercial authority introduced: PASS
- Dynamics 365 Sales role defined: PASS
- Stripe remains payment transaction truth: PASS
- Business Central handoff identified: PASS
- Dataverse remains Publishing operational authority: PASS
- Agreement generation reused: PASS
- Commercial catalog reused: PASS
- One daily Jackie surface defined: PASS
- Fulfillment authorization explicit: PASS
- Operator burden measurably reduced: PASS
- Production systems changed: 0

## Counts

| Measure | Count |
| --- | --- |
| Implementation backlog items | 14 |
| READY_FOR_CONFIGURATION | 8 |
| READY_FOR_EXTENSION | 5 |
| CUSTOM_DESIGN_REQUIRED | 0 |
| BLOCKED | 0 |
| DEFERRED | 1 |


## Microsoft Dispositions

| Disposition | Count |
| --- | --- |
| USE_AS_IS | 1 |
| CONFIGURE | 8 |
| EXTEND | 3 |
| CUSTOM_REQUIRED | 0 |
| DEFERRED | 1 |
| UNKNOWN | 0 |


## Operator Burden

Current Jackie actions: 12
Target Jackie actions: 5
Net removed: 7
New burden introduced: 0

Jackie keeps qualification judgments, exceptions, special terms, relationship-sensitive decisions, and final approvals where required. Systems route, track, remind, generate, file, log, and project routine status.

## Boundary

Runtime implementation: 0
Dataverse mutations: 0
Dynamics mutations: 0
Business Central mutations: 0
Stripe mutations: 0
Workflow activations: 0
Website deployment: 0
Author communications: 0
Client-title automation: FROZEN
Client-title production: MANUAL
