# OP-006 - Cover Design Command Center

**Status:** Complete / Operational  
**Program:** PROGRAM-002 Autonomous Publishing Production Pipeline  
**Route:** `/author/cover`

## Purpose

OP-006 provides a governed cover design readiness surface for title production. It tracks cover brief, market fit, BP-09 cover validation, author review posture, final cover packet readiness, and publisher approval.

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
