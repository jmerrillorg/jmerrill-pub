# JM1 Capability Maturity Model Extension Proposal v2.1

Classification: CANON-CANDIDATE / EXTENSION PROPOSAL
Ratification status: NOT CANON / NOT YET RATIFIED
Authority lane: 01_GOVERNANCE
Prepared: 2026-08-31
Relationship to existing model: Proposal only; does not silently modify, replace, or supersede Capability Maturity Model v2.0 or the earlier capability maturity registry.
Implementation authority: NO

## 1. Executive Read

This proposal extends the current JM1 maturity vocabulary with a clearer distinction between activated capability, proven capability, and autonomous proof. It exists because recent Publishing work showed that a capability can function under controlled conditions while still depending on manual bridges, incomplete ALM packaging, or unresolved dependency maturity.

The proposed ladder is:

1. DESIGNED
2. CONFIGURED
3. ACTIVATED
4. PROVEN
5. AUTONOMOUSLY_PROVEN

This is candidate language only. It does not alter current maturity records unless Jackie separately ratifies the extension.

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

This proposal does not reconcile those lineages by force. It proposes a future extension that Jackie can ratify after review.

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
- with idempotency and replay evidence where applicable.

### Current ALM Ceiling

Current dependency parity evidence identifies:

- 692 dependency edges;
- 38 unpackaged prerequisites;
- applicable sandbox remediation incomplete for affected dependency scopes.

For affected capabilities, this is a maturity ceiling. They may receive `FUNCTIONALLY_PROVEN` where Proof Contracts are satisfied, but must not receive `AUTONOMOUSLY_PROVEN` until the relevant dependency and ALM controls are governed.

## 4. Risk

The primary risk is premature maturity promotion. If a capability depends on manual package repair, ungoverned runtime configuration, unsupported identity, or a human-triggered bridge, it may be useful but not autonomously proven.

The second risk is freezing all proof work until ALM is perfect. This proposal avoids that by preserving the useful distinction between functional proof and autonomous proof. Proof work may proceed while the maturity ceiling remains visible.

The third risk is silent supersession of existing canon. This document is deliberately labeled as a proposal and does not change existing records until ratified.

## 5. Recommendation

Adopt this proposal only after the Proof Contract Standard has been reviewed. If ratified, apply it prospectively to capabilities evaluated under Proof Contracts and migrate older maturity records only through a governed mapping pass.

Recommended next decisions:

1. Decide whether this proposal should become Capability Maturity Model v2.1.
2. Decide whether existing Level 0-3 capability records should be mapped to the new ladder.
3. Decide how to record `FUNCTIONALLY_PROVEN + ALM_MATURITY_BLOCK`.
4. Decide which roles may assign or approve `AUTONOMOUSLY_PROVEN`.

## Validation Notes

This proposal is consistent with the current proof discipline and the active Publishing discretionary architecture freeze. It supports proof work but prevents autonomous proof claims from exceeding dependency and ALM maturity.

