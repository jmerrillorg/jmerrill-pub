# OP-011 - Royalty / Relationship / Author Success Command Center

**Status:** Complete / Operational  
**Program:** PROGRAM-002 Autonomous Publishing Production Pipeline  
**Route:** `/author/author-success`

## Purpose

OP-011 provides governed relationship and royalty-readiness visibility for author support, catalog health, annual review posture, future-title opportunity tracking, and author success follow-up.

## Operational Behavior

- Dataverse remains the operational source of truth.
- SharePoint remains the evidence layer.
- Author Workspace exposure remains limited to approved status information after author-specific authorization.
- Royalty and payment execution remain separately gated.
- OP-011 does not start BP-14/BP-15/J8 annual review or loyalty progression automation.

## Marketing Signal / Handoff

- Review tracking
- Long-tail optimization
- Catalog health
- Future-title opportunity
- Author relationship marketing opportunities

## Boundaries

- Does not calculate, generate, send, or pay royalties.
- Does not create author payments, Stripe payouts, invoices, tax records, or Business Central postings.
- Does not start BP-14/BP-15/J8 annual review or loyalty progression automation.
- Does not expose private financial, royalty, or support data without authorization.
- Does not use QBO for new billing, tax, package, payment, or royalty logic.

## Evidence

- Route: `/author/author-success`
- Data model: `lib/publishing/program-002-command-centers.ts`
- UI component: `app/author/_components/PublishingCommandCenterPage.tsx`
