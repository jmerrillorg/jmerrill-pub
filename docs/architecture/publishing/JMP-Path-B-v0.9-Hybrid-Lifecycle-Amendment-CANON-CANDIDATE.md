# JMP Path B v0.9 Hybrid Lifecycle Architecture Amendment

Classification: CANON-CANDIDATE
Ratification status: NOT CANON / NOT YET RATIFIED
Authority lane: 02_ARCHITECTURE
Prepared: 2026-08-31
Founder ruling captured: Publishing Architecture Consolidation handoff, 2026-08-31
Implementation authority: NO
Schema mutation authority: NO
Runtime activation authority: NO

## 1. Executive Read

This amendment codifies the Path B hybrid lifecycle model as a canon-candidate architecture amendment. It does not replace the current canonical Publishing lifecycle authority or authorize implementation by itself.

The model is simple: one canonical title macro-lifecycle governs enterprise title authority, while subordinate domain state machines may exist for editorial, cover, production, distribution, marketing, commercial, financial, and other domains. Those subordinate machines subscribe to, project from, or supply evidence into the canonical lifecycle. They do not compete with it or silently override it.

The current repository contains the ratified `JMP_PUBLISHING_LIFECYCLE_v1.0` as the effective lifecycle authority. This amendment uses the requested J0-J8 macro-lifecycle framing as the consolidation model, while preserving that any final mapping to current stage labels must follow governed ratification and may not erase the current effective lifecycle.

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

### Action-Level Authority Matrix

| Level | Label | Meaning |
|---|---|---|
| A0 | Observe | Read state and evidence only. |
| A1 | Prepare | Prepare draft artifacts or tasks without external action. |
| A2 | Internal Write | Write internal operational state or evidence under approved rules. |
| A3 | External Prepare | Prepare author/vendor/public-facing outputs without sending or publishing. |
| A4 | External Execute | Send, publish, submit, charge, or otherwise affect an external party under explicit authority. |
| A5 | Consequential Authority | Approvals, pricing, rights, contracts, payment obligation changes, or legally/financially consequential acts requiring Jackie or delegated authority. |

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

This amendment is a canon-candidate. It must not be used to override current canonical lifecycle documents, runtime policy, communication canon, agreement canon, catalog authority, or manual author-facing controls until ratified.

The Proof Contract Standard is a dependency for claiming any automated capability as proven. A capability may be designed, configured, or activated without being proven. It may be functionally proven without being autonomously proven when dependency or ALM controls remain below the required maturity ceiling.

Projection boundaries are mandatory. Author-facing, public-facing, operator-facing, legal-facing, and technical-facing views may show different language and fields, but each must derive from governed source records and must not leak internal execution data across the audience boundary.

## 4. Risk

The primary architectural risk is creating multiple lifecycle authorities that appear to agree until they diverge under pressure. A cover state machine, editorial state machine, marketing state machine, or commercial state machine may know domain truth, but it must not silently become title lifecycle truth.

The secondary risk is evidence flattening. SharePoint artifacts, Outlook messages, execution logs, Dataverse records, and generated evidence packages can all be useful. They are not equally authoritative for every decision. This amendment therefore requires `authoritative_source` and `authority_basis` in the Evidence Registry.

Current ALM constraints also limit proof claims. The Tranche 1 dependency parity evidence identified 692 dependency edges and 38 unpackaged prerequisites. No affected implementation may be claimed as autonomously proven until its dependency and ALM scope is governed.

## 5. Recommendation

Ratify this amendment only after the Proof Contract Standard is accepted or granted implementation authority. Then apply it first to a bounded internal validation title lifecycle segment.

The recommended ratification path is:

1. Ratify or grant implementation authority to the Proof Contract Standard.
2. Select one internal validation lifecycle segment.
3. Bind the segment to transition and proof contracts.
4. Capture evidence in the Evidence Registry format.
5. Demonstrate projection boundaries and no prohibited manual bridge.
6. Present Jackie a freeze-exit decision packet.

## Validation Notes

This amendment preserves these current source boundaries:

- Dataverse: operational truth for title, author, opportunity, agreement, lifecycle, execution, and read-model state.
- SharePoint/OneDrive: governed source assets and author/project artifacts.
- Business Central: ledger truth.
- Stripe: payment event and transaction truth where applicable.
- Outlook/Microsoft 365: primary JM1 business communications evidence authority.
- Repository/evidence packages: governance, implementation evidence, and source-controlled runtime evidence.

