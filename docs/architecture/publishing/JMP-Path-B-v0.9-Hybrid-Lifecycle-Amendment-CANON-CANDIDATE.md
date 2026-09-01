# JMP Path B v0.9 Hybrid Lifecycle Architecture Amendment

Classification: CANONICAL ARCHITECTURE AMENDMENT
Ratification status: RATIFIED BY FOUNDER DECISION, 2026-09-01
Authority lane: 02_ARCHITECTURE
Prepared: 2026-08-31
Founder ruling captured: Publishing Architecture Consolidation handoff, 2026-08-31
Ratification ruling captured: RATIFY_WITH_NARROW_CLARIFICATIONS, 2026-09-01
Implementation authority: NO
Schema mutation authority: NO
Runtime activation authority: NO
Filename note: filename retains the original canon-candidate branch path for PR continuity; this header is the governing status.

## 1. Executive Read

This amendment codifies the Path B hybrid lifecycle model as a canonical architecture amendment. It does not replace the current canonical Publishing lifecycle registry or authorize implementation by itself.

The model is simple: one canonical title macro-lifecycle governs enterprise title authority, while subordinate domain state machines may exist for editorial, cover, production, distribution, marketing, commercial, financial, and other domains. Those subordinate machines subscribe to, project from, or supply evidence into the canonical lifecycle. They do not compete with it or silently override it.

The current repository contains the ratified `JMP_PUBLISHING_LIFECYCLE_v1.0` as the effective lifecycle authority. This amendment uses the requested J0-J8 macro-lifecycle language as an architectural abstraction/mapping layer only. It does not replace, renumber, delete, merge, compress, or redefine the current canonical ten-stage lifecycle registry. If an exact J0-J8 mapping to the current registry is required, that mapping must be maintained as an explicit governed projection/mapping artifact. The canonical registry controls operational lifecycle identity unless and until separately amended through governance.

## 2. Architecture Impact

### Hybrid Lifecycle Model

| Layer | Role |
|---|---|
| Canonical title macro-lifecycle | Governs the enterprise title lifecycle and title-level advancement authority. |
| Subordinate domain state machines | Track domain-specific work such as editorial, cover, production, distribution, marketing, commercial, financial, or communications. |
| Lifecycle Projection Engine | Derives audience-specific and domain-specific views without changing the underlying authority. |
| Evidence Registry | Preserves evidence location, source, authority basis, version, verification, and current/historical status. |
| Publishing Orchestrator | Executes routine governed work, respects human gates, and raises exceptions instead of replacing judgment. |
| Event backbone | Carries state changes, evidence changes, command results, and reevaluation triggers. |

### Lifecycle Authority Clarification

The existing canonical JMP Publishing lifecycle registry remains the authoritative lifecycle-stage registry unless and until separately amended through governance.

Any J0-J8 terminology used by Path B is an architectural macro-lifecycle abstraction or mapping. It does not, by itself, replace, renumber, delete, merge, or redefine canonical lifecycle stages.

No exact J0-J8 to ten-stage mapping is created by this amendment. If needed, that mapping must be created and maintained as a governed projection/mapping artifact. The canonical registry controls operational lifecycle identity.

### Ten Principles

1. One canonical title lifecycle governs the enterprise.
2. Domain state machines may exist but never compete with the canonical lifecycle.
3. Dataverse is operational truth; SharePoint owns assets; Business Central owns ledger truth.
4. Every transition requires governed evidence.
5. Every automated capability requires a Proof Contract.
6. No capability is autonomous until it completes end-to-end without prohibited manual bridging.
7. Internal operational data does not cross an audience boundary without projection.
8. AI exercises judgment; deterministic systems establish deterministic truth.
9. Routine work executes automatically; humans receive consequential decisions and exceptions.
10. No implementation may be enterprise-proven beyond its dependency and ALM maturity ceiling.

### Event Backbone

The event backbone should carry stable, idempotent business events and execution events. Events should identify source system, source record, authority basis, affected title/author/opportunity/artifact where applicable, action, result, timestamp, and evidence reference.

Events do not become authority merely because they exist. Authority comes from the governing source for the division and capability.

Lifecycle and event processing must support:

- idempotent event handling;
- duplicate-event tolerance;
- out-of-order-event detection;
- projection replay;
- projection rebuild;
- deterministic recomputation where feasible;
- eventual-consistency awareness;
- correlation and causation tracking where required.

Repeated processing of the same authoritative event must not produce duplicate lifecycle transitions or duplicate external side effects. Projection rebuilds must derive state from authoritative evidence and cannot manufacture new authority.

### Publishing Orchestrator

The Publishing Orchestrator should:

- evaluate canonical lifecycle and subordinate machine state;
- enforce transition contracts;
- execute safe deterministic work;
- invoke approved runtimes;
- respect human and external gates;
- create operator tasks when human work is required;
- record evidence;
- reevaluate after state changes, runtime recovery, and dependency recovery.

The orchestrator must not use a subordinate state machine to override canonical title lifecycle authority.

### Projection Conflict Authority

When two domain projections disagree, a projection disagrees with canonical lifecycle state, an event projection disagrees with authoritative Dataverse state, or multiple subscribers calculate incompatible domain states, the projection does not establish authority.

The controlling authority is:

- Dataverse canonical lifecycle state;
- the applicable Transition Contract;
- the applicable Authority Matrix decision authority.

Projection conflicts must produce exception evidence and reconciliation handling rather than silently advancing or rewriting authoritative state.

### Failed Transition Recovery

A failed transition, rejected transition, partially executed transition, timeout, downstream failure, projection failure, or recovery attempt must not create a competing state authority.

Instead it produces, as applicable:

- exception evidence;
- recovery state/evidence;
- incident or attention routing;
- rollback or compensating-action evidence.

The canonical lifecycle remains controlled by the governing transition rules. A failed action is not itself evidence that a transition occurred.

### Action-Level Authority Matrix

| Level | Label | Meaning |
|---|---|---|
| A0 | Observe | Read state and evidence only. |
| A1 | Prepare | Prepare draft artifacts or tasks without external action. |
| A2 | Internal Write | Write internal operational state or evidence under approved rules. |
| A3 | External Prepare | Prepare author/vendor/public-facing outputs without sending or publishing. |
| A4 | External Execute | Send, publish, submit, charge, or otherwise affect an external party under explicit authority. |
| A5 | Consequential Authority | Approvals, pricing, rights, contracts, payment obligation changes, or legally/financially consequential acts requiring Jackie or delegated authority. |

AUTHENTICATION != A5 CONSENT.

Authentication, authorization to view, authorization to perform an operational action, approval, acceptance, acknowledgment, final-proof approval, contractual consent, signature, and A5 consent are separate authority concepts. No UI action, authenticated session, event, API call, or automation may infer a higher authority level merely because the actor was authenticated. Authority must be established by the applicable Authority Matrix rule.

### Temporal/Cadence Engine

Cadence rules should be separate from lifecycle labels. A lifecycle state may be ready, but release timing, hold timing, author-response timing, SLA timing, retry timing, or cadence rhythm may still control when the next action occurs.

### Evidence Registry

An Evidence Registry entry must include at minimum:

| Field | Meaning |
|---|---|
| `evidence_location` | Stable pointer to the evidence artifact or record. |
| `evidence_source_system` | System where the evidence was found or generated. |
| `authoritative_source` | Governing source that determines authority for the evidence claim. |
| `authority_basis` | Why that source governs this decision or claim. |
| `evidence_version` | Version, checksum, provider id, record version, or equivalent. |
| `verified_at` | Timestamp of evidence verification. |
| `supersedes` | Prior evidence superseded by this entry, if applicable. |
| `current_or_historical` | Whether the evidence governs current state or preserves history only. |

Evidence may be collected from multiple systems, but governing authority must come only from the approved authoritative source for the governing division. The registry must not imply that all evidence pointers have equal authority.

## 3. Governance

This amendment is canonical architecture after founder ratification on 2026-09-01. It must not be used to override current canonical lifecycle documents, runtime policy, communication canon, agreement canon, catalog authority, or manual author-facing controls.

The JM1 Proof Contract Standard v1.0 is controlling governance for capability-proof claims. A capability may be designed, configured, or activated without being proven. It may be functionally proven without being autonomously proven when dependency or ALM controls remain below the required maturity ceiling.

Transition Contract means what must be true before a governed transition may occur. Proof Contract means what objective evidence must exist before a capability may be claimed to work at the stated scope, environment, or maturity level. Manual intervention must be represented according to the Proof Contract Standard and may not be hidden inside a successful classification.

Projection boundaries are mandatory. Author-facing, public-facing, operator-facing, legal-facing, and technical-facing views may show different language and fields, but each must derive from governed source records and must not leak internal execution data across the audience boundary.

Architectural support does not constitute operational authorization. Tier 2 or equivalent sensitive capabilities involving royalties, contracts, payment records, payout information, financial information, or sensitive author/account data remain blocked from operational activation until their own required security controls and objective Proof Contracts pass. Neither Path B ratification nor architecture maturity waives those gates.

## 4. Risk

The primary architectural risk is creating multiple lifecycle authorities that appear to agree until they diverge under pressure. A cover state machine, editorial state machine, marketing state machine, or commercial state machine may know domain truth, but it must not silently become title lifecycle truth.

The secondary risk is evidence flattening. SharePoint artifacts, Outlook messages, execution logs, Dataverse records, and generated evidence packages can all be useful. They are not equally authoritative for every decision. This amendment therefore requires `authoritative_source` and `authority_basis` in the Evidence Registry.

Current ALM constraints also limit proof claims. The Tranche 1 dependency parity evidence identified 692 dependency edges and 38 unpackaged prerequisites. No affected implementation may be claimed as autonomously proven until its dependency and ALM scope is governed.

Additional risks addressed by this amendment include event ordering, projection replay, conflicting projections, failed-transition recovery, manual intervention hidden as success, authority escalation, state/event drift, and eventual consistency. These risks must be handled as evidence, exception, reconciliation, or proof-contract matters rather than as alternate lifecycle authority.

## 5. Recommendation

Use this amendment with the ratified Proof Contract Standard on a bounded internal validation title lifecycle segment.

The recommended next path is:

1. Select one internal validation lifecycle segment.
2. Bind the segment to transition and proof contracts.
3. Capture evidence in the Evidence Registry format.
4. Demonstrate projection boundaries and no prohibited manual bridge.
5. Present Jackie a freeze-exit decision packet.

## Validation Notes

This amendment preserves these current source boundaries:

- Dataverse: operational truth for title, author, opportunity, agreement, lifecycle, execution, and read-model state.
- SharePoint/OneDrive: governed source assets and author/project artifacts.
- Business Central: ledger truth.
- Stripe: payment event and transaction truth where applicable.
- Outlook/Microsoft 365: primary JM1 business communications evidence authority.
- Repository/evidence packages: governance, implementation evidence, and source-controlled runtime evidence.

## Canonical Invariants

| Invariant | Status |
|---|---|
| CANONICAL_LIFECYCLE_AUTHORITY | Existing governed JMP lifecycle registry / Dataverse. |
| DOMAIN_STATE_MACHINES | Subscribers and projections with domain-specific authority only. |
| LIFECYCLE_PROJECTION_ENGINE | Projection and coordination infrastructure, not lifecycle authority. |
| EVENT_BACKBONE | Evidence and orchestration transport, not transition authority. |
| TRANSITION_AUTHORITY | Transition Contract + Authority Matrix + canonical state. |
| CAPABILITY_PROOF_AUTHORITY | JM1 Proof Contract Standard v1.0. |
| AUTHENTICATION_AUTHORITY | Identity/session verification only. |
| A5_AUTHORITY | Explicitly governed consent/signature authority. |
| SHAREPOINT | Durable document/media authority within its governed scope. |
| DATAVERSE | Business/lifecycle record authority within its governed scope. |

Path B ratification does not authorize runtime implementation, schema changes, workflow changes, deployment, author-facing behavior, Stripe, SharePoint mutation, Business Central mutation, website behavior, or production infrastructure changes. The Publishing discretionary architecture freeze and client-title automation freeze remain active.
