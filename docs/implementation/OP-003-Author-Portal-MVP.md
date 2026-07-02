# OP-003 - Author Workspace MVP

**Status:** OPERATIONAL
**Operational scope:** Author Workspace MVP
**Primary route:** `/author/portal`  
**Date:** 2026-07-01  
**Authority:** PROGRAM-002 source docs; Decision 3 canon correction

---

## Purpose

OP-003 provides the first author-facing workspace display/action layer after author acceptance and before contract generation. This corrects the lifecycle dependency that the contract package needs author onboarding, financial setup, and royalty setup information before it can be generated.

The workspace is not a system of record.

Canonical lifecycle:

1. Author accepts.
2. Author Workspace is created.
3. Locked pre-contract modules are available: Author Onboarding, Financial Setup, Royalty Setup.
4. After all three are complete, the contract package is generated.
5. SignNow agreement and Stripe/payment options appear.
6. After contract signed/active plus payment confirmed, or publisher financial override, the full workspace unlocks.

---

## Source Requirements Implemented

- Author Workspace MVP.
- Relationship parent / title child language.
- Controlled display layer.
- Pre-contract setup progress.
- Author Onboarding action.
- Financial Setup action.
- Royalty Setup action.
- Locked-workspace messaging.
- Contact pathway to `publishing@jmerrill.one`.
- Pre-contract milestone tracker.
- Warm welcome transition.
- Humanized milestone communications.
- Private file/data boundary messaging.
- Future active workspace unlock boundary.

---

## Implementation

### Website

- Added `/author/portal` as the current Author Workspace route.
- Updated `/author` to link the Author Workspace card to `/author/portal`.
- Reused the existing `AuthorGate` access-code control.
- Split workspace access into a stricter `portal` gate scope so the shared author setup form code is no longer treated as sufficient for author/project-specific workspace access. This is the dedicated pre-contract workspace access scope for OP-003.
- Added `lib/publishing/author-portal-mvp.ts` for read-only MVP display data.
- Completed related author setup choice-mapping stabilization in the immediate OP-003 workflow neighborhood.

### Data Behavior

The MVP uses static read-only display data. This is intentional until a governed Dataverse read contract is approved.

The Author Workspace access model is documented in `OP-003-Author-Portal-Access-Model.md`. Author-specific workspace access must be backed by Dataverse Contact + title/project authorization before private project data is displayed. Until then, OP-003 remains pre-contract, generic/read-only, and the master access code is admin/private-preview only.

System ownership remains:

- Dataverse: operational publishing system of record.
- SharePoint: file/workspace layer.
- Stripe: approved payment collection layer when live connection is approved.
- Business Central: financial/accounting system of record.
- Author Workspace: display/action layer only.

### Security Requirements

- Pre-contract workspace access must remain separate from shared author setup form access.
- Address, financial setup, and royalty setup fields require field-level protection in Dataverse and downstream views before private data is surfaced.
- Authors must authenticate before locked modules render.
- No pre-contract sensitive data may appear in dashboards, reports, exports, or broad internal views.
- Where practical, workspace creation, view/edit, module completion, contract generation, and active workspace unlock events should write safe evidence to `jm1_executionlog`.

---

## Safety Boundaries

OP-003 does not:

- Modify `/join`.
- Modify OP-001 workspace creation behavior.
- Modify OP-002 contract/payment active-workspace unlock behavior.
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
- Display author/project-specific private data without author/project-specific authorization.
- Show dashboard, editorial, cover, layout, files, contracts, royalties, production, distribution, marketing, messages, timeline, or reports before active workspace unlock.

---

## Prospect Nurture Boundary

If an accepted author does not convert after the pre-contract workspace path:

- Relationship State becomes `Prospect / Inactive Pursuit`.
- Nurture cadence is bi-weekly, then monthly, then quarterly.
- Birthday touchpoints are allowed.
- Prospect nurture remains separate from active-author communications.
- Tone stays warm and relationship-oriented, not a sales drip.
- No live nurture communications are sent by OP-003.

---

## Marketing Signal / Handoff

The workspace points authors back to onboarding for author platform, launch inputs, positioning, and marketing foundation. Public marketing remains gated until the Marketing / Campaign Command Center is live and approved.

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

## Operational Certification

OP-003 was deployed and validated operational on 2026-07-01.

Deployment evidence:

- PR #140 deployed successfully after one stale Azure Static Web Apps staging environment was removed.
- Removed staging environment: `96`.
- PR #140 merged with merge commit `3da8612be2533414ddb16302957d4e42b8521476`.
- Main deployment completed successfully after merge.

Live validation:

- `/author` returned HTTP 200.
- `/author/portal` returned HTTP 200.
- `/author/portal` rendered the Author Workspace MVP surface, milestone tracker, and setup/readiness content.
- Invalid access-code validation returned HTTP 401.

Safety validation:

- No Dataverse writes were performed by OP-003 validation.
- No Stripe activity occurred.
- No Business Central posting occurred.
- No royalty activity occurred.
- No payment activity occurred.
- No external communication was sent.

---

## Next Work

OP-002 active workspace unlock is the next dependency to reconcile with the corrected lifecycle. OP-004 remains the next operational module after the workspace lifecycle correction is merged and validated. Future OP-003 iterations may add author-specific data only after the governed identity model, Dataverse read model, row-level authorization, workspace access fields, and workspace data contract are approved.
