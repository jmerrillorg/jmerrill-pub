# OP-005 - Editorial Command Center

**Status:** IMPLEMENTED / PENDING DEPLOYMENT VALIDATION  
**Program:** PROGRAM-002 Autonomous Publishing Production Pipeline  
**Date:** 2026-07-02  
**Module:** OP-005 Editorial Command Center

## Purpose

OP-005 provides a governed editorial orchestration layer for J Merrill Publishing. It invokes JM Editorial Doctrine and does not invent generic editing methodology.

The command center tracks editorial stage/progress, safe task posture, style-guide assignment/carry-forward, hard-stop holds, author approval/request-changes posture, and handoffs into layout and distribution readiness.

## Live Dataverse Confirmation

Metadata was confirmed in JM1-Core on 2026-07-02 using metadata-only Dataverse reads. No row writes or production data changes were performed.

| Purpose | Logical name | Entity set | Primary ID | Primary name |
|---|---|---|---|---|
| Editorial diagnostic | `jm1pub_editorialdiagnostic` | `jm1pub_editorialdiagnostics` | `jm1pub_editorialdiagnosticid` | `jm1pub_name` |
| Editorial stage tracker | `jm1pub_editorialstage` | `jm1pub_editorialstages` | `jm1pub_editorialstageid` | `jm1pub_name` |
| Title anchor | `jm1pub_title` | `jm1pub_titles` | `jm1pub_titleid` | `jm1pub_titlename` |
| Execution proof layer | `jm1_executionlog` | `jm1_executionlogs` | `jm1_executionlogid` | `jm1_name` |

Confirmed `jm1pub_editorialdiagnostic` field families include diagnostic scores, recommended imprint/editorial path/package, style-guide assignment/override, hard-stop/risk flags, rights/legal/ethics flags, JM Signature authorization fields, manuscript asset fields, human review fields, and author-draft fields.

Confirmed `jm1pub_editorialstage` fields include stage type/status, phase, assigned owner/editor, due date, blocker status/reason, style-sheet URL, editorial deliverable URL, final editorial approval, production handoff approval, voice/retention/hard-stop flags, and execution-log correlation reference.

Confirmed `jm1pub_title` anchor fields include title name, primary author, author, project, imprint, genre, lifecycle stage, ISBN references, stage/status, current manuscript, target publication date, and project manager.

## Approved Canon Handoff

OP-005 uses the approved editorial canon handoff:

- Stage 3 Editorial Review remains canon and unchanged.
- Stage 4 Developmental Editing is approved.
- Stage 5 Line Editing is approved.
- Stage 6 Copyediting is approved.
- Stage 7a Manuscript Proofread is approved.
- Stage 7b Production Proofread is approved.
- Hard-stop re-trigger applies to Stages 4 through 7b.
- Style guide assignment is determined at Stage 3 and carried forward unless Publisher override is logged.
- JM Signature guard persists at every editorial stage.

## Corrected Style Guide Matrix

The approved style guide roster contains exactly 14 guides:

1. CMoS
2. APA
3. MLA
4. AP
5. Harvard
6. Turabian
7. AMA
8. ACS
9. Bluebook
10. IEEE
11. CSE
12. GPO
13. MHRA
14. Oxford

SharePoint connector search did not locate `JM1-PUB-Editorial-Knowledge-v1.0` by exact title or broad editorial/style-guide queries on 2026-07-02. The repo-side OP-005 record and website model now reflect the corrected 14-guide roster. The SharePoint canon file remains a follow-up unless its exact path is provided or it appears in connector search.

## Internal Style Overlays

The three internal overlays remain tracked:

- Faith & Inspirational
- Urban / Street-Lit Voice Preservation
- Children's Book Standard

Current repo evidence references the overlay source as `faith-editorial-overlay.md` and describes it as governing internal faith/street-lit/children's editorial overlays. The exact SharePoint overlay file locations were not found during this pass and remain follow-up discovery items. Overlay names remain internal-only and are not author-facing.

## Orchestration Behavior

OP-005 represents:

1. Imprint confirmation.
2. Stage 3 Editorial Review.
3. Scoring-to-routing output.
4. Stage 4 Developmental Editing.
5. Stage 5 Line Editing.
6. Stage 6 Copyediting.
7. Stage 7a Manuscript Proofread.
8. OP-007 handoff.
9. Stage 7b Production Proofread re-entry.
10. Stage 8 handoff.

Stage 7a to OP-007 to Stage 7b is represented explicitly:

`Stage 7a Manuscript Proofread -> OP-007 Interior Layout Command Center -> Stage 7b Production Proofread -> Stage 8 handoff`

## Author Workspace Exposure

Author-facing workspace content may show only:

- current editorial stage
- next required author action
- review/approval request
- safe summary language

The author-facing workspace must not show:

- raw diagnostic scores
- internal notes
- hard-stop details
- raw manuscript text
- prompt body
- raw model output
- internal risk details

Every author approval or request-changes interaction must include a free-text response.

## Hard Stops

OP-005 treats these as hard stops:

- Missing imprint
- JM Signature without required Publisher authorization
- rights issue
- ethics issue
- sensitivity flag
- plagiarism/attribution concern
- legal/content-risk concern
- unconfirmed Dataverse table reference
- any attempt to use generic editing methodology instead of approved canon

Hard-stop re-trigger behavior applies at every approved editorial stage from Stage 4 through Stage 7b.

## Execution Logging

Every stage transition should write safe evidence to `jm1_executionlog` where practical.

Safe evidence may include:

- diagnostic ID
- intake reference
- title/project reference
- current stage
- next stage
- transition status
- safe blocker code
- style guide assignment status
- Publisher override flag
- timestamp
- correlation reference

Execution logs must not include manuscript text, prompt body, raw model output, secrets, tokens, headers, full provider responses, internal notes, or hard-stop detail intended only for human review.

## Website Implementation

Implemented files:

- `app/author/editorial/page.tsx`
- `lib/publishing/editorial-command-center.ts`
- `app/author/page.tsx`

The website surface is read-only. It does not create Dataverse records, mutate editorial stages, send communications, run diagnostics, rewrite manuscripts, start production, or trigger downstream automation.

## Boundaries

OP-005 does not:

- create new command centers outside PROGRAM-002
- change canon beyond the approved handoff
- touch Stripe
- touch Business Central postings
- generate royalties
- send author communications
- expose sensitive author data
- expose raw scores, internal notes, or hard-stop details
- start cover, layout, distribution, launch, payments, or author payments

## Validation

Validation to complete before deployment:

- `npm run type-check`
- `npm run lint`
- `npm run build`
- relevant route/content checks
- `git diff --check`
- secret scan

## SharePoint Status

This document should be synced to:

`Implementation HQ / Documents / JM1 Enterprise Architecture / 02_Implementation / OP`

PROGRAM-002 source documents should be updated after validation and synced through per-file conflict handling.
