# JM1 Proof Contract Standard v1.0

Classification: CANON-CANDIDATE
Ratification status: NOT CANON / NOT YET RATIFIED
Authority lane: 01_GOVERNANCE
Prepared: 2026-08-31
Founder ruling captured: Publishing Architecture Consolidation handoff, 2026-08-31
Implementation authority: NO, except proof-enabling implementation separately authorized under the active Publishing discretionary architecture freeze

## 1. Executive Read

This standard defines the JM1 Proof Contract discipline. A Transition Contract states what must be true before a governed action may execute. A Proof Contract states what must demonstrably become true before JM1 may claim that a capability works.

The distinction matters because a flow can run, a test can pass, a deployment can succeed, or a human can bridge a gap without proving that the capability is reliable as an enterprise capability. Proof requires evidence that the expected business outcome occurred under the right authority, at the right time, with the right dependencies, and without prohibited manual bridging.

This document is a canon-candidate governance standard. It does not ratify itself. It becomes controlling only after Jackie ratifies it or grants explicit implementation authority for the standard.

## 2. Architecture Impact

The Proof Contract Standard extends the existing Executable Canon Principle by adding a required proof layer after execution. It does not replace lifecycle, catalog, agreement, author communication, payment, or execution-log canon.

Every automated capability must have an approved Proof Contract before it can be claimed as proven. Autonomous proof requires `manual_intervention_count == 0` and evidence that no prohibited manual bridge was used to complete the path.

Proof contracts must evaluate at least five dimensions:

| Dimension | Required proof question |
|---|---|
| STATE | Did the governed state change to the intended state and only the intended state? |
| EVIDENCE | Were required artifacts, logs, checksums, readbacks, or source-system references captured? |
| TIME | Did the outcome occur within required cadence, SLA, hold, or sequencing rules? |
| AUTHORITY | Was the action authorized by the controlling canon, role, approval, or delegation? |
| DEPENDENCY | Were required providers, ALM packages, identities, connections, and runtimes present and governed? |

Flow success, test success, artifact existence, deployment success, or human-assisted completion must not be treated as complete proof unless the approved Proof Contract explicitly defines that signal as sufficient.

## 3. Governance

### Required Proof Contract Schema

Each Proof Contract must contain, at minimum:

| Field | Requirement |
|---|---|
| `capability_id` | Stable capability identifier. |
| `capability_version` | Version of the capability being proven. |
| `trigger` | Event, state, schedule, command, or operator action that starts the capability. |
| `preconditions` | Facts required before execution may begin. |
| `expected_execution` | The governed path the capability must perform. |
| `required_outcomes` | Business outcomes that must be true after execution. |
| `required_evidence` | Evidence required to support the proof. |
| `temporal_requirements` | Timing, cadence, hold, SLA, retry, and ordering requirements. |
| `authority_requirements` | Approvals, canon, delegation, role, and audience-boundary requirements. |
| `dependency_requirements` | External and internal dependencies that must be available and governed. |
| `alm_requirements` | Source, package, deployment, environment, identity, and rollback controls. |
| `prohibited_manual_bridges` | Manual steps that invalidate an autonomous proof claim. |
| `manual_intervention_count` | Count of manual interventions required to complete the capability. |
| `failure_conditions` | Conditions that cause proof failure or block proof. |
| `proof_classification` | One of the classifications below. |
| `verified_at` | Timestamp of the proof evaluation. |
| `evidence_refs` | Stable references to the evidence used for the proof. |

### Proof Classification

| Classification | Meaning |
|---|---|
| FAILED_PROOF | Execution was attempted but required outcomes, evidence, timing, authority, dependency, or ALM requirements failed. |
| PARTIAL_PROOF | Some required outcomes were achieved, but the approved Proof Contract was not fully satisfied. |
| BLOCKED_PROOF | Proof could not complete because a dependency, authority, data, ALM, or environment condition prevented valid evaluation. |
| SUCCESSFUL_PROOF | The capability satisfied the approved Proof Contract, including all required dimensions. |
| AUTONOMOUS_SUCCESSFUL_PROOF | The capability satisfied the approved Proof Contract with `manual_intervention_count == 0`, no prohibited manual bridge, and production-equivalent authority, observability, dependency, and ALM controls. |

### Transition Contract vs. Proof Contract

| Contract | Governs | Example question |
|---|---|---|
| Transition Contract | Permission to execute or advance. | May this title move from Developmental Editing to Author Review? |
| Proof Contract | Evidence that the capability works. | Did the author-review capability complete the required state, evidence, time, authority, and dependency outcomes without invalid manual bridging? |

### Autonomous Proof Rule

An autonomous proof claim requires:

- `manual_intervention_count == 0`;
- no prohibited manual bridge;
- idempotent replay evidence;
- governed execution log or equivalent operational evidence;
- production-equivalent dependency readiness;
- ALM maturity sufficient for the capability scope;
- exception behavior observed or contractually defined.

Human judgment may still be required by the business process. That does not invalidate the process. It only means the automated capability must prove that it stops at the human gate, not that it bypasses it.

## 4. Risk

The primary risk addressed by this standard is overclaiming maturity. A capability that works only because Cody, Jackie, or another person manually bridges missing evidence is not autonomously proven.

The current ALM evidence identifies a maturity ceiling for affected dependencies: 692 dependency edges and 38 unpackaged prerequisites were identified in the Tranche 1 dependency parity evidence. Where those dependencies affect a capability, JM1 may record functional proof if the Proof Contract is satisfied, but must not classify the capability as autonomously proven until the applicable dependency and ALM controls are governed.

Manual bridge risk must be recorded plainly. It is better to classify a result as functionally proven with an ALM maturity block than to treat a supported one-off success as autonomous enterprise proof.

## 5. Recommendation

Ratify this standard before granting broad autonomous capability claims. Use it first on one internal validation title lifecycle segment during the current Publishing discretionary architecture freeze.

The freeze should remain active until:

1. This standard is ratified or granted approved implementation authority.
2. At least one internal validation title completes a Proof-Contract-governed lifecycle segment successfully.
3. Evidence is captured and validated under the Proof Contract discipline.
4. Any discovered defects are remediated or formally dispositioned.
5. Jackie receives a decision packet on whether the freeze exit criteria have been met.

Do not self-lift the freeze.

## Implementation Notes

Permitted work during the freeze includes Proof Contract Standard implementation, defect remediation, proof-enabling architecture, missing dependency remediation, security/compliance remediation, ALM remediation, and evidence/governance corrections required to support proof.

Discretionary Publishing architecture work remains frozen unless it directly supports proof, remediation, security, compliance, ALM, or governed evidence correction.

