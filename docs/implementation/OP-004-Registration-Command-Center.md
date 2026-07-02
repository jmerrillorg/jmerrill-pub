# OP-004 - Registration Command Center

**Status:** OPERATIONAL
**Operational scope:** Registration readiness command center
**Primary route:** `/author/registration`
**Date:** 2026-07-02
**Authority:** PROGRAM-002 Wave 2 Continuous Implementation Authorization

---

## Purpose

OP-004 provides a governed registration readiness command center for titles after the pre-contract Author Workspace path and before downstream editorial/production movement.

It tracks readiness for:

- ISBN management
- copyright registration workflow
- LCCN workflow
- BISAC/category management
- metadata readiness
- registration checklist
- registration status tracking

The command center is a display and coordination layer. It is not a system of record and does not trigger live registration actions.

---

## Implementation

### Website

- Added `/author/registration`.
- Added the Registration Command Center card to `/author`.
- Added `lib/publishing/registration-command-center.ts` for static, governed, read-only OP-004 display data.

### Readiness Model

The page displays:

- OP-004 summary state.
- Registration workflow tracker.
- Checklist cards for metadata, ISBN, copyright, LCCN, BISAC/category, and approval.
- Status tracking rows.
- Evidence/source ownership rows.
- Explicit safety boundaries.

### System Ownership

- Dataverse: registration status, title metadata readiness, approvals, blockers, and operational source of truth.
- SharePoint: evidence files, correspondence, certificate copies, and metadata packet.
- Website: read-only command-center surface.
- External agencies: no live submission is triggered by OP-004 website MVP.

---

## Safety Boundaries

OP-004 does not:

- assign ISBNs
- file copyright registrations
- submit LCCN requests
- submit metadata to retailers or distributors
- start editorial, production, distribution, launch, royalties, or author payments
- expose sensitive author or private project records
- write Dataverse records directly
- send author/customer communications
- touch Stripe, Business Central, royalties, or payments

---

## Marketing Signal / Handoff

Registration captures early metadata posture that later supports distribution and marketing:

- title/subtitle clarity
- author display name
- BISAC/category fit
- audience posture
- keyword and comparable-shelf readiness
- description posture

Public campaign activity remains gated until the Marketing / Campaign Command Center is live and approved.

---

## Validation

Run from repository root:

```bash
npm run type-check
npm run lint
npm run build
git diff --check
```

Additional operational checks:

- `/author` renders a Registration Command Center card.
- `/author/registration` renders OP-004 readiness content.
- ISBN, copyright, LCCN, BISAC/category, metadata readiness, checklist, and status tracking are visible.
- The page makes clear that no live registration, metadata submission, production, payment, or royalty action is triggered.
- Secret scan finds no credential values.

---

## Certification Notes

OP-004 was deployed and validated operational on 2026-07-02.

Deployment evidence:

- PR #146 merged with merge commit `b4757ebc3c3761938f8000bd9654ee113e4d5c6b`.
- Azure Static Web Apps production deployment completed successfully.

Live validation:

- `/author` returned HTTP 200 and displayed the Registration Command Center link.
- `/author/registration` returned HTTP 200.
- ISBN, copyright, LCCN, BISAC/category, metadata readiness, checklist, status tracking, and safety boundaries rendered.

Safety validation:

- No Dataverse writes occurred.
- No ISBN assignment occurred.
- No copyright filing occurred.
- No LCCN submission occurred.
- No metadata submission occurred.
- No Stripe, Business Central, royalty, author payment, or external communication activity occurred.

OP-005 Editorial Command Center is the next Wave 2 module. OP-005 must remain an orchestration layer and must not create generic editorial methodology.
