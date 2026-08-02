# JM1 Pull Request Authority Reconciliation

Authority: Jackie executive repository authority reconciliation
Generated: 2026-08-02

## Executive Result

Initial open PR count: 16

Disposition applied:

- Merged current/canonical authority: #383, #363, #365, #356, #340, #314
- Closed superseded or duplicate authority: #341, #342, #349, #355, #359, #265, #266, #374
- Retained administrative exception: #358
- Folded conflicting completed hygiene evidence into this reconciliation branch: #366

## Current Authority

PROGRAM-006 canonical dispatch is on main through #382 and #383.

Author email canon, attachment enforcement, attachment checksum verification, ACS fail-closed behavior, portal bounded failure handling, duplicate-gate protection, and response-clock-after-delivery controls are on main after #381, #382, and #383.

Publishing Static Web Apps is retired under INFRA-012 and no longer an active runtime authority.

GATE-W3 remains a frozen administrative exception for app-jm1-productions-prod. PR #358 is retained as the single canonical exception lane; PR #359 was closed as duplicate/superseded.

## Remaining Open PR Policy

Routine implementation PR limit: 3.

Administrative exception PRs are tracked separately.

Evidence-only closeout PRs should merge or close within 24 hours.

Superseded PRs should close immediately after verification and a PR comment.

The stale PR guard reports drift and does not auto-close PRs.

## Production Impact

Production code deployment is required only for #383 because it changes live dispatch authority.

All other merged evidence/governance PRs are repository authority changes and do not authorize DNS, Azure resource, traffic, payment, or author-lifecycle changes.
