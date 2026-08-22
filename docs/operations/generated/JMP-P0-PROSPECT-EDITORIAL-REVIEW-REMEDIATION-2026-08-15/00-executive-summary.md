# P0 Prospect Editorial Review Lifecycle Remediation

Last verified: 2026-08-16T02:38:45Z

Evidence source: PR #513 merge, GitHub Actions run `31921889872`, production health readback, and live Dataverse read-only probe.

Status: IMPLEMENTED / MERGED / PRODUCTION HEALTH READBACK PASS / LIVE SEND HELD

This package records the P0 remediation for the defect class where a prospect/inquiry Editorial Review could be treated as an active contracted-author editorial-stage approval package.

Implemented controls:

- Prospect and active contracted-author lifecycle contexts are distinct.
- Lifecycle context is not inferred from contact, title, workspace, diagnostic, opportunity, or gate existence alone.
- Prospect Editorial Review resolves to package selection, not editorial-stage approval.
- Active contracted-author review dispatch remains available for active editorial stages.
- Canonical package catalog is used for Starter, Professional, and Premier recommendations.
- Starter recommendations fail closed to backup `NONE`.
- Author-facing prospect communication blocks active-author approval language.
- Attachment certification blocks single-line PDF overflow artifacts.

Validation:

- `npm run type-check`: PASS
- `node --test scripts/p0_prospect_editorial_review_lifecycle_guard.test.mjs`: 7 / 7 PASS
- `node --test scripts/author_facing_editorial_review_package.test.mjs`: 5 / 5 PASS
- `npm run program006-dispatch-guard`: 19 / 19 PASS
- `npm run author-communication-brand-guard`: 8 / 8 PASS
- `npm run author-response-runtime-remediation-guard`: 49 / 49 PASS

Known environment note:

- Tests ran under Node 26.0.0. The repository root declares Node `>=24 <25`; the Azure Functions package declares Node `>=22 <25`. Engine warnings were observed and preserved.

Production/live boundary:

- PR #513 merged to `origin/main` at `846920e343703f11410bc6cf3ce900f42fc4bc7f`.
- Production health at `https://jmerrill.pub/api/health` returned `status=ready` and `release=846920e343703f11410bc6cf3ce900f42fc4bc7f`.
- Atta corrective send: HELD. The production website policy is corrected, but the Azure diagnostic function send/resend route still persists stale `Awaiting Author Response` semantics and is not certified for the corrected prospect package-selection state.
- Prospect dispatch hold lift: NOT LIFTED. The hold can lift only after the actual production sender path is reconciled with the corrected prospect contract.
