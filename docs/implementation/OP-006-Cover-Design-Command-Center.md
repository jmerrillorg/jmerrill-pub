# OP-006 - Cover Design Command Center

**Status:** Complete / Operational  
**Program:** PROGRAM-002 Autonomous Publishing Production Pipeline  
**Route:** `/author/cover`

## Purpose

OP-006 provides a governed cover design readiness surface for title production. It tracks cover brief, market fit, BP-09 cover validation, author review posture, final cover packet readiness, and publisher approval.

The `Complete / Operational` status above applies to the read-only command-center route, not to system-owned artwork generation or print-cover production. The separate cover producer remains uncommissioned until title-authority ingestion, durable execution/storage, concept and review-package QA, human approval, and deterministic final-format assembly are production-proven.

## Operational Behavior

- Dataverse remains the operational source of truth.
- SharePoint remains the evidence and file layer.
- The website route is read-only.
- Author Workspace exposure is limited to safe progress language after author-specific authorization.
- Cover validation must pass before production readiness, distribution readiness, or release readiness can advance.

## Marketing Signal / Handoff

- Genre expectation
- Category fit
- Author platform posture
- Visual promise
- Launch/campaign usability
- Media-kit and retail thumbnail readiness

## Boundaries

- Does not place design orders.
- Does not send vendor or author communications.
- Does not submit cover files to retailers, printers, or distributors.
- Does not bypass BP-09 or publisher approval.
- Does not trigger layout, distribution, launch, royalty, payment, Stripe, or Business Central activity.

## Evidence

- Route: `/author/cover`
- Data model: `lib/publishing/author-workspace-modules.ts`
- UI component: `app/author/_components/AuthorWorkspaceModulePage.tsx`
