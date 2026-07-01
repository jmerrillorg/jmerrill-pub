# OP-003 - Author Portal MVP

**Status:** Implemented locally  
**Operational scope:** Author Portal MVP  
**Primary route:** `/author/portal`  
**Date:** 2026-07-01  
**Authority:** PROGRAM-002 source docs

---

## Purpose

OP-003 provides the first author-facing portal display/action layer for activated J Merrill Publishing projects. It follows the PROGRAM-002 rule that author portal creation is allowed only after agreement status is signed/completed and first payment status is paid/confirmed.

The portal is not a system of record.

---

## Source Requirements Implemented

- Author Portal MVP.
- Relationship parent / title child language.
- Controlled display layer.
- Status dashboard.
- Tasks.
- Approved documents and file pathway messaging.
- Payment confirmation display.
- Contact pathway to `publishing@jmerrill.one`.
- Visual milestone tracker.
- Warm welcome transition.
- Humanized milestone communications.
- File validation and version protection messaging.
- Metadata readiness.

---

## Implementation

### Website

- Added `/author/portal`.
- Updated `/author` to link the Author Portal card to `/author/portal`.
- Reused the existing `AuthorGate` access-code control.
- Added `lib/publishing/author-portal-mvp.ts` for read-only MVP display data.
- Completed related author setup choice-mapping stabilization in the immediate OP-003 workflow neighborhood.

### Data Behavior

The MVP uses static read-only display data. This is intentional until a governed Dataverse read contract is approved.

System ownership remains:

- Dataverse: operational publishing system of record.
- SharePoint: file/workspace layer.
- Stripe: approved payment collection layer when live connection is approved.
- Business Central: financial/accounting system of record.
- Author Portal: display/action layer only.

---

## Safety Boundaries

OP-003 does not:

- Modify `/join`.
- Modify OP-001 workspace creation behavior.
- Modify OP-002 contract/payment portal activation behavior.
- Create contracts.
- Create payment links.
- Send author email.
- Start production.
- Submit distribution.
- Launch/release titles.
- Create royalty actions.
- Write Dataverse records directly from the new dashboard.
- Process queues.
- Display live Business Central accounting summaries.
- Display live Stripe details.
- Display live royalty statements.

---

## Marketing Signal / Handoff

The portal points authors back to onboarding for author platform, launch inputs, positioning, and marketing foundation. Public marketing remains gated until the Marketing / Campaign Command Center is live and approved.

---

## Validation

Run from repository root:

```bash
npm run type-check
npm run lint
npm run build
git diff --check
```

---

## Next Work

Future OP-003 iterations may add author-specific data only after the governed identity model, Dataverse read model, row-level authorization, and portal data contract are approved.
