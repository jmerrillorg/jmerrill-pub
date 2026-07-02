# OP-004 - Registration Command Center

**Status:** Operational candidate
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

OP-004 can be marked operational after:

- PR checks pass.
- Azure Static Web Apps production deployment succeeds.
- Live `/author` and `/author/registration` validation pass.
- Documentation is synchronized to SharePoint.

OP-005 Editorial Command Center begins only after OP-004 certification unless a true governance exception appears.
