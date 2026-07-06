# OP-009 - Distribution Command Center

**Status:** Complete / Operational  
**Program:** PROGRAM-002 Autonomous Publishing Production Pipeline  
**Route:** `/author/distribution-command`

## Purpose

OP-009 provides governed distribution readiness tracking for channel scope, metadata, ISBN/category posture, distribution file candidates, retailer/library readiness, blockers, and publisher approval.

## Operational Behavior

- Dataverse remains the operational source of truth.
- SharePoint remains the evidence and file layer.
- OP-008 production readiness must pass before OP-009 readiness can be considered complete.
- The route is read-only and does not submit to external channels.

## Marketing Signal / Handoff

- Metadata posture
- Category and keyword strength
- Retailer readiness
- Library/bookstore posture
- Channel blockers affecting launch planning

## Boundaries

- Does not upload files to retailers, distributors, printers, or aggregators.
- Does not publish, submit, price, or announce a title.
- Does not create royalty setup or author payment activity.
- Does not use QBO or create Business Central postings.
- Does not expose private distribution files without author-specific authorization.

## Evidence

- Route: `/author/distribution-command`
- Data model: `lib/publishing/author-workspace-modules.ts`
- UI component: `app/author/_components/AuthorWorkspaceModulePage.tsx`
