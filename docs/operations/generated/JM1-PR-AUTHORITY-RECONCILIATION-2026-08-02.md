# JM1 Pull Request Authority Reconciliation

Authority: Jackie executive repository authority reconciliation
Generated: 2026-08-02

## Executive Result

Initial open PR count: 16

Disposition applied:

- Merged current/canonical authority from the initial reconciliation queue: #383, #363, #365, #356, #340, #314, #384, #385
- Closed superseded or duplicate authority: #341, #342, #349, #355, #359, #265, #266, #374
- Retained administrative exception: #358
- Folded conflicting completed hygiene evidence into this reconciliation branch: #366

Count readback:

- Initial queue merged: 8
- Initial queue closed or superseded: 8
- Initial queue retained administrative exception: 1, PR #358
- Post-cutoff evidence PRs opened after reconciliation: #389, #390
- Post-cutoff PR #390: merged, production release 7c8ac31ce862d06a57d52820219a9e22f72cc491 verified on 2026-08-02
- Post-cutoff PR #389: evidence-only General's Will release-preflight blocker, to be merged or closed within the 24-hour evidence closeout policy

## Current Authority

PROGRAM-006 canonical dispatch is on main through #382, #383, and #390.

Author email canon, attachment enforcement, attachment checksum verification, ACS fail-closed behavior, portal bounded failure handling, duplicate-gate protection, operational delivery certification, and response-clock-after-delivery controls are on main after #381, #382, #383, and #390.

Publishing Static Web Apps is retired under INFRA-012 and no longer an active runtime authority.

GATE-W3 remains a frozen administrative exception for app-jm1-productions-prod. PR #358 is retained as the single canonical exception lane; PR #359 was closed as duplicate/superseded.

## Remaining Open PR Policy

Routine implementation PR limit: 3.

Administrative exception PRs are tracked separately.

Evidence-only closeout PRs should merge or close within 24 hours.

Superseded PRs should close immediately after verification and a PR comment.

The stale PR guard reports drift and does not auto-close PRs.

## Production Impact

Production code deployment was required for #383 and #390 because they changed live dispatch authority.

All other merged evidence/governance PRs are repository authority changes and do not authorize DNS, Azure resource, traffic, payment, or author-lifecycle changes.
