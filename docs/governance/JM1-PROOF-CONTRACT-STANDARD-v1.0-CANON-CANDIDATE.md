# JM1 Proof Contract Standard v1.0

Classification: CANONICAL GOVERNANCE STANDARD
Ratification status: RATIFIED BY FOUNDER DECISION, 2026-09-01
Authority lane: 01_GOVERNANCE
Prepared: 2026-08-31
Founder ruling captured: Publishing Architecture Consolidation handoff, 2026-08-31
Ratification ruling captured: RATIFY_WITH_NARROW_CLARIFICATIONS, 2026-09-01
Implementation authority: NO, except proof-enabling implementation separately authorized under the active Publishing discretionary architecture freeze
Filename note: filename retains the original canon-candidate branch path for PR continuity; this header is the governing status.

## 1. Executive Read

This standard defines the JM1 Proof Contract discipline. A Transition Contract states what must be true before a governed action may execute. A Proof Contract states what must demonstrably become true before JM1 may claim that a capability works for a specific claim, scope, and environment.

The distinction matters because a flow can run, a test can pass, a deployment can succeed, an API can return 200, or a human can bridge a gap without proving that the capability is reliable as an enterprise capability. Proof requires evidence that the claimed business outcome occurred under the right authority, at the right time, in the right environment, with the right dependencies, and without prohibited manual bridging.

This document is now a canonical governance standard after founder ratification with narrow clarifications on 2026-09-01. Ratification of this standard does not ratify the Path B architecture amendment or the Capability Maturity Model extension proposal.

## 2. Architecture Impact

The Proof Contract Standard extends the existing Executable Canon Principle by adding a required proof layer after execution. It does not replace lifecycle, catalog, agreement, author communication, payment, or execution-log canon.

Every automated capability must have an approved Proof Contract before it can be claimed as proven. The contract must identify the exact capability claim being proven, not merely the component that executed. Autonomous proof requires `manual_intervention_count == 0` and evidence that no prohibited manual bridge was used to complete the responsibility included in the autonomous claim.

Proof contracts must evaluate at least five dimensions:

| Dimension | Required proof question |
|---|---|
| STATE | Did the governed state change from the required starting state to the intended state and only the intended state? |
| EVIDENCE | Were materially relevant artifacts, logs, checksums, readbacks, source-system references, and negative proof captured where applicable? |
| TIME | Did the outcome occur within required cadence, SLA, hold, or sequencing rules? |
| AUTHORITY | Was the action authorized by the controlling canon, source of truth, role, approval, or delegation at the correct A0-A5 authority level? |
| DEPENDENCY | Were required providers, ALM packages, identities, connections, and runtimes present and governed? |

Flow success, test success, artifact existence, deployment success, HTTP 200, absence of a logged exception, authenticated click, or human-assisted completion must not be treated as complete proof unless the approved Proof Contract explicitly defines the signal as materially relevant and sufficient for the stated claim.

## 3. Governance

### Required Proof Contract Schema

Each Proof Contract must contain, at minimum:

| Field | Requirement |
|---|---|
| `capability_id` | Stable capability identifier for the capability whose claim is being proven. |
| `capability_version` | Version of the capability being proven; when applicable, include release, commit SHA, package version, or deployment version in `evidence_refs` or `dependency_requirements`. |
| `claim` | Exact capability claim being proven. This must make it impossible to confuse "component executed" with "capability claim proven." |
| `scope` | Business, title, division, audience, data, environment, and boundary scope covered by the proof. |
| `environment` | Environment where the proof was run, such as development, sandbox, production-equivalent, or production. |
| `trigger` | Event, state, schedule, command, or operator action that starts the capability. |
| `preconditions` | Facts required before execution may begin, including starting state. |
| `expected_execution` | The governed path the capability must perform. |
| `expected_outcomes` | Business outcomes expected after execution. |
| `actual_outcomes` | Business outcomes actually observed after execution. Proof cannot be inferred merely because execution completed. |
| `required_evidence` | Evidence required to support the claim being proven. Evidence exists does not equal claim proven; evidence must be materially relevant and sufficient under the applicable Proof Contract. |
| `negative_proof` | Prohibited outcomes or material side-effect checks, where applicable. Examples include no unauthorized record mutation, no cross-author resource exposure, no duplicate financial action, no unintended communication, no unauthorized lifecycle transition, and no forbidden schema/workflow change. Use NOT_APPLICABLE with rationale when there is no meaningful negative-proof requirement. |
| `temporal_requirements` | Timing, cadence, hold, SLA, retry, and ordering requirements. |
| `authority_requirements` | Approvals, canon, delegation, role, and audience-boundary requirements. |
| `dependency_requirements` | External and internal dependencies that must be available and governed. |
| `alm_requirements` | Source, package, deployment, environment, identity, release, and rollback controls. |
| `rollback_recovery_requirements` | Rollback or recovery requirement, required rollback/recovery evidence, or explicit NOT_APPLICABLE rationale for intrinsically read-only or non-mutating capability claims. |
| `prohibited_manual_bridges` | Manual steps that invalidate an autonomous proof claim. |
| `manual_intervention_count` | Count of manual interventions required to complete the capability. |
| `exceptions_deviations` | Exceptions, deviations, or approved variances observed during proof. Undisclosed exceptions or deviations must not coexist with a clean success classification. |
| `failure_conditions` | Conditions that cause proof failure or block proof. |
| `proof_classification` | One of the classifications below. |
| `verified_at` | Timestamp of the proof evaluation. |
| `evidence_refs` | Stable references to the evidence used for the proof. |

### Proof Classification

| Classification | Meaning |
|---|---|
| NOT_PROVEN | The claim was evaluated but the Proof Contract was not satisfied. |
| FAILED_PROOF | Execution was attempted but required outcomes, evidence, timing, authority, dependency, security, recovery, or ALM requirements failed. |
| PARTIAL_PROOF | Some required outcomes were achieved, but the approved Proof Contract was not fully satisfied. |
| BLOCKED_PROOF | Proof could not complete because a dependency, authority, data, ALM, environment, security, or source-of-truth condition prevented valid evaluation. |
| PROVEN | The capability claim satisfied the approved Proof Contract, including all applicable required dimensions. |
| SUCCESSFUL_PROOF | Equivalent to PROVEN when used by existing evidence packages. |
| AUTONOMOUS_SUCCESSFUL_PROOF | The capability claim satisfied the approved Proof Contract with `manual_intervention_count == 0`, no prohibited manual bridge, and production-equivalent authority, observability, dependency, and ALM controls. |

### Transition Contract vs. Proof Contract

| Contract | Governs | Example question |
|---|---|---|
| Transition Contract | Permission to execute or advance. | May this title move from Developmental Editing to Author Review? |
| Proof Contract | Evidence that the capability works. | Did the author-review capability complete the required state, evidence, time, authority, and dependency outcomes without invalid manual bridging? |

A transition may be valid without proving the underlying capability. A capability may execute without proving the claimed capability outcome. A Proof Contract must always evaluate the claim, not merely the execution status.

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

The following distinction is mandatory:

| Human involvement | Meaning | Effect on autonomous proof |
|---|---|---|
| Human authority | Intentional governed decision, approval, consent, or ruling required by the process. | Does not automatically invalidate autonomous proof of the surrounding machine responsibilities. |
| Manual intervention | Human operational action required because the capability could not independently perform a responsibility included in the autonomous claim. | Invalidates autonomous proof for that responsibility. |

### A0-A5 Authority Compatibility

Proof Contracts must be compatible with the existing A0-A5 authority taxonomy. This standard does not redefine that taxonomy. It requires proof that every action requiring authority was performed under the correct authority level for the action actually being proven.

AUTHENTICATION != A5 CONSENT.

Authentication establishes identity or session assurance. Authentication alone does not establish contractual consent, legal consent, pricing approval, rights approval, payment authorization, final artifact approval, or any other A5 authority.

The following signals must not automatically be interpreted as A5 consent:

- authenticated portal session;
- OTP verification;
- signed-in user;
- approval button;
- authenticated click.

The relevant Proof Contract must separately prove the authority, consent, or approval event required by the governed action.

### Security-Tier Proof

Elevated security-tier claims require objective pass/fail evidence appropriate to the claimed capability. For Tier 2 or equivalent sensitive capabilities, including royalties, contracts, payment records, payout information, and financial information, prose asserting security intent is insufficient proof.

The Proof Contract must require objectively testable evidence relevant to the security claim. This standard governs proof of controls; it does not select the control architecture unless another ratified canon requires it.

### False-Positive Protection

None of the following independently proves the underlying capability:

| Signal | Required interpretation |
|---|---|
| DEPLOYED | DEPLOYED != PROVEN |
| TEST_PASSED | TEST_PASSED != CAPABILITY_PROVEN |
| HTTP_200 | HTTP_200 != CAPABILITY_PROVEN |
| AUTOMATION_EXECUTED | AUTOMATION_EXECUTED != AUTONOMOUSLY_PROVEN |
| NO_LOGGED_EXCEPTION | NO_LOGGED_EXCEPTION != SUCCESS |
| AUTHENTICATED_CLICK | AUTHENTICATED_CLICK != A5_CONSENT |
| EVIDENCE_EXISTS | EVIDENCE_EXISTS != CLAIM_PROVEN |
| MANUAL_FALLBACK_SUCCEEDED | MANUAL_FALLBACK_SUCCEEDED != AUTONOMOUS_CAPABILITY_SUCCEEDED |

## 4. Risk

The primary risk addressed by this standard is overclaiming maturity. A capability that works only because Cody, Jackie, or another person manually bridges missing evidence is not autonomously proven for the responsibility that required rescue.

The current ALM evidence identifies a maturity ceiling for affected dependencies: 692 dependency edges and 38 unpackaged prerequisites were identified in the Tranche 1 dependency parity evidence. Where those dependencies affect a capability, JM1 may record functional proof if the Proof Contract is satisfied, but must not classify the capability as autonomously proven until the applicable dependency and ALM controls are governed.

Manual bridge risk must be recorded plainly. It is better to classify a result as functionally proven with an ALM maturity block than to treat a supported one-off success as autonomous enterprise proof.

## 5. Recommendation

Use this standard before granting broad autonomous capability claims. Use it first on one internal validation title lifecycle segment during the current Publishing discretionary architecture freeze.

The freeze should remain active until:

1. This standard is ratified or granted approved implementation authority. Status: satisfied for governance ratification on 2026-09-01.
2. At least one internal validation title completes a Proof-Contract-governed lifecycle segment successfully.
3. Evidence is captured and validated under the Proof Contract discipline.
4. Any discovered defects are remediated or formally dispositioned.
5. Jackie receives a decision packet on whether the freeze exit criteria have been met.

Do not self-lift the freeze.

## Implementation Notes

Permitted work during the freeze includes Proof Contract Standard implementation, defect remediation, proof-enabling architecture, missing dependency remediation, security/compliance remediation, ALM remediation, and evidence/governance corrections required to support proof.

Discretionary Publishing architecture work remains frozen unless it directly supports proof, remediation, security, compliance, ALM, or governed evidence correction.
