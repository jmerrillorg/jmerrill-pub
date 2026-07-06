# OP-010 - Marketing Command Center

**Status:** Complete / Operational  
**Program:** PROGRAM-002 Autonomous Publishing Production Pipeline  
**Route:** `/author/marketing`

## Purpose

OP-010 provides governed Publishing Marketing readiness for positioning, launch kit, audience definition, review and award tracking, media/outreach readiness, campaign calendar, approvals, and future performance posture.

## Operational Behavior

- Publishing owns book launch strategy.
- Enterprise Marketing provides brand standards, shared tools, creative services, and analytics support.
- Dataverse remains the operational source of truth.
- SharePoint remains the asset and evidence layer.
- The route is read-only and does not activate public campaigns.

## Marketing Signal / Handoff

OP-010 is the canonical title-level marketing readiness surface. It captures:

- Reader promise
- Audience definition
- Comparable titles
- Category posture
- Launch kit readiness
- Review, award, media, bookstore, and library outreach posture

## Boundaries

- Does not send launch emails, public marketing emails, social posts, ads, or press pitches.
- Does not activate autonomous marketing agents publicly.
- Does not expose private campaign notes or author data without authorization.
- Does not trigger royalty, payment, Stripe, or Business Central activity.
- Does not make Enterprise Marketing the owner of Publishing campaign strategy.

## Evidence

- Route: `/author/marketing`
- Data model: `lib/publishing/author-workspace-modules.ts`
- UI component: `app/author/_components/AuthorWorkspaceModulePage.tsx`
