# JM1 Capability Maturity Model Extension Proposal v2.1

Classification: CANONICAL CAPABILITY MATURITY MODEL EXTENSION
Ratification status: RATIFIED BY FOUNDER DECISION, 2026-09-01
Authority lane: 01_GOVERNANCE
Prepared: 2026-08-31
Relationship to existing model: Proposal only; does not silently modify, replace, or supersede Capability Maturity Model v2.0 or the earlier capability maturity registry.
Implementation authority: NO
Founder ruling captured: Publishing Architecture Consolidation handoff, 2026-08-31
Ratification ruling captured: RATIFY_WITH_NARROW_CLARIFICATIONS, 2026-09-01
Filename note: filename retains the original canon-candidate branch path for PR continuity; this header is the governing status.

## 1. Executive Read

This proposal extends the current JM1 maturity vocabulary with a clearer distinction between activated capability, proven capability, and autonomous proof. It exists because recent Publishing work showed that a capability can function under controlled conditions while still depending on manual bridges, incomplete ALM packaging, or unresolved dependency maturity.

The proposed ladder is:

1. DESIGNED
2. CONFIGURED
3. ACTIVATED
4. PROVEN
5. AUTONOMOUSLY_PROVEN

This extension is ratified as a classification framework only. It does not alter current maturity records, authorize implementation, or promote any existing capability without a separate evidence-backed maturity evaluation.

## 2. Architecture Impact

### Proposed Ladder

| State | Proposed definition |
|---|---|
| DESIGNED | The capability has approved purpose, boundaries, owners, and intended business path, but is not yet configured or running. |
| CONFIGURED | Required settings, schemas, packages, flows, identities, routes, or records have been prepared in the governed environment, but the capability is not yet activated for use. |
| ACTIVATED | The capability is available to execute under approved authority, but has not yet satisfied its approved Proof Contract. |
| PROVEN | The capability successfully executed its defined business path and satisfied the approved Proof Contract. |
| AUTONOMOUSLY_PROVEN | The capability satisfied the approved Proof Contract without prohibited manual bridging under required production-equivalent authority, observability, dependency, and ALM controls. |

### Functional Proof vs. Autonomous Proof

Some capabilities may become functionally proven while remaining blocked from autonomous proof. That distinction should be explicit:

`FUNCTIONALLY_PROVEN + ALM_MATURITY_BLOCK` does not equal `AUTONOMOUSLY_PROVEN`.

This lets JM1 continue valid proof work without pretending that dependency and ALM risk has disappeared.

## 3. Governance

This proposal must sit next to existing capability maturity authority as a candidate extension. It must not overwrite existing v2.0 records or the earlier numeric capability maturity registry.

Existing evidence shows two maturity lineages in the repository:

- The security baseline package records maturity using Designed, Entitled, Activated, Proven fields and cites PROGRAM-004 Amendment 1 Annex S and Maturity Model v2.0 record fields.
- The earlier JM1 Capability Maturity Registry uses Levels 0-3: Concept, Proof, Provisionally Certified, Enterprise Certified.

This extension does not reconcile those lineages by force. Existing maturity levels and prior classifications remain preserved unless separately mapped through governed evidence.

### Candidate Rule for PROVEN

`PROVEN` means the capability successfully executed the defined business path and satisfied the approved Proof Contract. A passing unit test, a successful deployment, a generated artifact, or a human-assisted completion is insufficient unless the Proof Contract explicitly says that evidence satisfies the proof.

### Candidate Rule for AUTONOMOUSLY_PROVEN

`AUTONOMOUSLY_PROVEN` means the capability satisfied the approved Proof Contract:

- with `manual_intervention_count == 0`;
- with no prohibited manual bridge;
- under production-equivalent authority;
- with observability sufficient to diagnose success/failure;
- with governed dependency readiness;
- with ALM controls sufficient for the dependency scope;
- with idempotency and replay evidence where applicable;
- with repeatability or reproducibility evidence where applicable;
- with negative proof that prohibited side effects did not occur where applicable;
- with rollback or recovery behavior proven or explicitly governed as not applicable.

`AUTONOMOUSLY_PROVEN` requires an applicable Proof Contract PASS, but:

`PROOF_CONTRACT_PASS != AUTOMATIC_MATURITY_PROMOTION`.

Proof establishes evidence for a defined claim. Maturity classifies the demonstrated state of the capability. Promotion to `AUTONOMOUSLY_PROVEN` requires all maturity-level criteria in addition to the applicable Proof Contract result.

`manual_intervention_count == 0` is necessary for an autonomous-operation claim, but is not independently sufficient to classify a capability `AUTONOMOUSLY_PROVEN`. Zero manual intervention does not compensate for failed required outcomes, missing authority, missing security proof, missing negative proof, hidden fallback, non-repeatable execution, missing recovery evidence, or insufficient observability.

For event-driven behavior, autonomous maturity requires evidence of idempotency, replay safety, duplicate-event handling, deterministic rebuilding or recomputation where applicable, and prevention of duplicate external side effects. A single successful happy-path execution is insufficient by itself.

A failure, rejection, partial execution, recovery event, exception, or approved deviation must not be concealed by a final successful state. The maturity evaluation must preserve evidence of what happened and classify the capability according to the full proof basis, not only the end state.

### Authority Boundary

Maturity classification never grants operational authority.

`AUTHENTICATION != A5 CONSENT`.

`AUTONOMOUSLY_PROVEN != A5 AUTHORITY`.

A capability proven technically autonomous remains subject to the applicable A0-A5 authority requirement for the action being performed. Authentication, authorization to view, authorization to perform an operational action, approval, acceptance, acknowledgment, final-proof approval, contractual consent, signature, and A5 consent are separate authority concepts.

### Security Boundary

Maturity classification cannot bypass security classification.

`MATURITY_LEVEL != SECURITY_AUTHORIZATION`.

`AUTONOMOUSLY_PROVEN` does not authorize access to or operation of Security Tier 2 capabilities. This includes, where applicable, royalties, contracts, payment records, payout information, financial information, and other sensitive protected data. Those capabilities retain their independent security proof and activation gates.

### Lifecycle Boundary

Capability maturity is not lifecycle state.

`CAPABILITY_MATURITY != LIFECYCLE_STATE`.

Capability maturity cannot advance lifecycle state, override lifecycle state, substitute for a Transition Contract, create alternate lifecycle authority, or override the Authority Matrix. The canonical Publishing lifecycle remains governed separately under the ratified Path B architecture amendment and the existing lifecycle authority model.

### Scope and Authorization Boundary

The maturity model is classificatory, not a roadmap or authorization mechanism.

`MATURITY_TARGET != COMMITTED_SCOPE`.

`CANONICAL_MATURITY_MODEL != AUTHORIZATION_TO_IMPLEMENT`.

A maturity level or maturity target does not mean JM1 has committed to build, funded, scheduled, placed on the roadmap, authorized runtime implementation, authorized deployment, or authorized production activation for the capability.

### Currentness and Invalidation

Maturity evidence must remain current to support a current maturity claim. Use the following minimal evidence-currentness statuses:

| Status | Meaning |
|---|---|
| CURRENT | The evidence basis still applies to the capability, scope, environment, authority, dependencies, security posture, and runtime being claimed. |
| STALE | The evidence basis may no longer apply and must be reevaluated before supporting a current maturity claim. |
| INVALIDATED | The evidence basis no longer supports the claimed maturity level. |
| SUPERSEDED | A newer governed proof or maturity evaluation replaces the prior evidence basis. |

Reevaluation is required after material code changes, architecture changes, dependency changes, security changes, authority-policy changes, environment changes, regressions, failed production proof, newly discovered manual intervention, observability failures, or invalidated or superseded proof evidence. A stale or invalidated proof basis cannot support a current `AUTONOMOUSLY_PROVEN` claim.

### False-Positive Protection

None of the following, standing alone, prove `AUTONOMOUSLY_PROVEN`:

| Signal | Required interpretation |
|---|---|
| HTTP 200 | HTTP 200 != AUTONOMOUSLY_PROVEN |
| Successful deployment | DEPLOYED != AUTONOMOUSLY_PROVEN |
| No logged exception | NO_LOGGED_EXCEPTION != AUTONOMOUS_SUCCESS |
| Authentication success | AUTHENTICATION_SUCCESS != A5_CONSENT_OR_AUTONOMOUS_PROOF |
| User click | USER_CLICK != A5_CONSENT_OR_AUTONOMOUS_PROOF |
| Workflow completion flag | WORKFLOW_COMPLETION_FLAG != CAPABILITY_AUTONOMY_PROVEN |
| Record creation | RECORD_CREATED != CAPABILITY_AUTONOMY_PROVEN |
| Evidence-file existence | EVIDENCE_EXISTS != CLAIM_PROVEN |
| Single happy-path execution | SINGLE_HAPPY_PATH != AUTONOMOUSLY_PROVEN |
| Manual operator completion | MANUAL_COMPLETION != AUTONOMOUSLY_PROVEN |
| Manual fallback | MANUAL_FALLBACK != AUTONOMOUS_SUCCESS |
| Founder approval | FOUNDER_APPROVAL != CAPABILITY_AUTONOMY_PROVEN |
| Architecture ratification | ARCHITECTURE_RATIFIED != CAPABILITY_AUTONOMY_PROVEN |
| Test-suite PASS | TEST_SUITE_PASS != AUTONOMOUSLY_PROVEN |

These may be evidence components where relevant, but they are not independently sufficient proof.

### Current ALM Ceiling

Current dependency parity evidence identifies:

- 692 dependency edges;
- 38 unpackaged prerequisites;
- applicable sandbox remediation incomplete for affected dependency scopes.

For affected capabilities, this is a maturity ceiling. They may receive `FUNCTIONALLY_PROVEN` where Proof Contracts are satisfied, but must not receive `AUTONOMOUSLY_PROVEN` until the relevant dependency and ALM controls are governed.

## 4. Risk

The primary risk is premature maturity promotion. If a capability depends on manual package repair, ungoverned runtime configuration, unsupported identity, or a human-triggered bridge, it may be useful but not autonomously proven.

The second risk is freezing all proof work until ALM is perfect. This proposal avoids that by preserving the useful distinction between functional proof and autonomous proof. Proof work may proceed while the maturity ceiling remains visible.

The third risk is silent supersession of existing canon. This extension does not change existing records unless a separate governed mapping or maturity-evaluation pass explicitly does so.

## 5. Recommendation

Apply this extension prospectively to capabilities evaluated under Proof Contracts and migrate older maturity records only through a governed mapping pass.

Existing `PROVEN` capabilities remain `PROVEN` unless independently qualified under the new `AUTONOMOUSLY_PROVEN` standard.

`AUTOMATIC_PROVEN_PROMOTION = NO`.

No bulk reclassification is authorized by this ratification.

Recommended next decisions:

1. Decide whether existing Level 0-3 capability records should be mapped to the new ladder.
2. Decide how to record `FUNCTIONALLY_PROVEN + ALM_MATURITY_BLOCK`.
3. Decide which roles may assign or approve `AUTONOMOUSLY_PROVEN`.

## Validation Notes

This extension is consistent with the current proof discipline, the ratified Proof Contract Standard, the ratified Path B architecture amendment, the existing Publishing lifecycle authority, A0-A5 authority controls, security-tier governance, and the active Publishing discretionary architecture freeze. It supports proof work but prevents autonomous proof claims from exceeding dependency and ALM maturity.

Client-title automation freeze: ACTIVE.

Publishing discretionary architecture freeze: ACTIVE.

Runtime implementation authorized: NO.
