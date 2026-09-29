# JMP-REAL-TITLE-END-TO-END-001: Controlled title readback

Date: 2026-09-29 ET
Mode: read-only selection and production-gate reconciliation
Production mutations, provider submissions, and author communications: 0

## Controlled title selection

**Before You Were Born**, by Sean Crowley / Sean Arron Crowley, is the closest substantiated active production candidate. Its existing numbered workspace is under `09 - Copyediting`; it has copyedited and proofread manuscript files, a 102-page 6 x 9 print interior, five eBook exports, and registered Starter-package Paperback and eBook ISBN assets. The two ISBN-bearing Dataverse assets are still `Staged / Draft`.

The Long Watch has a Copyedit stage row marked Complete but no ISBN-bearing distribution asset in the live readback. The Intentional Leader has a Proofread stage row marked Complete but likewise has only a nonspecific `Other` asset, no ISBN-bearing distribution assets. Neither is demonstrably closer to a valid two-format provider submission. This comparison is not a declaration that their historical stage records are authoritative current lifecycle state.

## Current authority and conflicts

| Concern | Readback | Classification |
| --- | --- | --- |
| Title identity | Dataverse title `91c5e1ef-2980-f111-ab0f-7c1e525b15c2` | Proven title ID |
| Workspace | `01_Pipeline_A-Z/09 - Copyediting/Crowley, Sean - Before You Were Born` | Human workspace at Stage 09; Dataverse stage parity not proven |
| Dataverse title | `jm1_canonicalstatus=CANONICAL_PUBLISHED_TITLE`, `jm1pub_stage=Editorial`, `jm1pub_publicationstatus=Publisher intake review initialized` | Conflicting legacy fields; none proves a live publication |
| Starter format authority | Paperback `9781961475861`; eBook `9781961475878`; no hardcover or audio | Founder-ratified on 2026-09-15 |
| Print interior | `Before-You-Were-Born-Print-2026-09-15-v1.2.pdf`, 102 pages, SHA-256 `623a2605d48e19a03ef5e3dd5d82494897b26c3c5f3e7cec338126bfb53f0e56` | Bytes match prior governed manifest; exact author proof approval unproven |
| Sample eBook | Apple export `Before-You-Were-Born-Apple-2026-09-15.epub`, SHA-256 `d3e924e5a31ec6257452172e2394201c9597b6382459d6b7acb739fa4a3df5df` | Bytes match manifest; not selected as canonical CoreSource source |
| Paperback asset | `24716f8b-f4b0-f111-aaac-00224820105b` | Staged / Draft on 2026-09-29 |
| eBook asset | `07f99887-f4b0-f111-aaac-6045bdd69678` | Staged / Draft on 2026-09-29 |
| Author-review gate | Developmental gate has an `Approve` decision dated 2026-08-28 but still says `Awaiting Author Response` | Contradictory historical gate, not proof of final v1.2 approval |
| Subtitle | Founder identifier authority: `Discovering God's Plan for Your Life`; print/eBook files: `Discovering the Divine Blueprint for Your Life` | Founder title decision required |
| Author display | Dataverse: `Sean Crowley`; identifier authority: `Sean Arron Crowley`; print/eBook files: `Sean Arron Crowley, I` | Founder byline decision required |
| Copyright-page AI sentence | Present in the current PDF | Explicitly approved public language by founder; not a defect |
| Provider effect | Prior CoreSource preflight was blocked; support ticket 5862952 | Current public-effect boundary requires fresh provider readback |

`CURRENT_TITLE_STATE=FAIL` for advancement: stage, exact-version approval, subtitle, byline, and provider-ready package are not yet reconciled. No historical `CANONICAL_PUBLISHED_TITLE` label may be used as publication proof.

## Remaining 16-stage path

The stage order below is the human 16-stage view. Governed execution after Copyediting is Interior Layout (11), then Proofreading/Author Proof (10); the numeric display order is not permission to send a standalone pre-layout proofreading copy.

| Stage | Applicable | Current status / owner | Required input and exit | Blocker and next action |
| --- | --- | --- | --- | --- |
| 01 Inquiry | Yes | Historical / Publishing | Inquiry identity and source recorded | Reconcile only if a transition needs missing source proof |
| 02 Intake | Yes | Historical / Publishing | Governed intake and manuscript provenance | Current intake-to-title binding unverified |
| 03 Editorial Review | Yes | Historical / Publishing | Recommendation QA and prospect delivery | Current recommendation binding unverified |
| 04 Author Decision | Yes | Historical / Author | Governed package election | Starter package ratified; original decision event not reverified |
| 05 Agreement & Payment | Yes | Historical / Commercial runtime | Executed agreement and required payment parity | Current contract/payment record not independently rebound in this pass |
| 06 Onboarding | Yes | Historical / Publishing | Starter onboarding and workspace readiness | Workspace exists; exact submission/parity unverified |
| 07 Developmental Editing | Yes | Historical / Editorial + author | Both artifacts, QA, delivery, exact-version author decision | Gate fields conflict; do not reuse them as later-stage approval |
| 08 Line Editing | Yes | Files present / Editorial + author | Line-edited manuscript and exact-version approval | Current approval binding unverified |
| 09 Copyediting | Yes | Current workspace / Editorial + author | Copyedited manuscript, query log, QA, exact-version approval | Files present; current approval and stage parity unverified |
| 10 Proofreading | Yes | Proof file present / Author | Current layout proof, corrections, exact proof approval | v1.2 exact-version author approval not proven |
| 11 Interior Layout | Yes | Print PDF and eBook files present / Production | Versioned, QA-passed layout proofs for entitled formats | Subtitle/byline drift and exact approved version unresolved |
| 12 Cover Design | Yes | Not ready / Production + author | QA-passed, delivered, exactly approved cover proof | Governed 6 x 9 full-wrap print cover absent |
| 13 Production | Yes | Blocked / Production | Final interior, final cover, identifiers, QA and approvals for Paperback and eBook | Cover, canonical eBook source, metadata and proof gates open |
| 14 Distribution | Yes | Draft assets / Provider runtime | Governed artifacts, provider validation, submission evidence | CoreSource/LSI authority and package preflight not passed |
| 15 Publication | Yes | Not proven / Provider + Publishing | Tuesday release, provider live readback and public-page verification | No submitted/live format proven |
| 16 Post-Publication | Yes | Not started / Publishing | Author notice and persistent royalty/catalog/distribution stewardship | Requires real publication readback first |

## Bounded next work

1. Resolve the subtitle and final author byline with founder title authority. Preserve existing files until that decision is recorded.
2. Reconcile exact v1.2 author-proof approval and the contradictory developmental gate. Do not infer approval from folder placement or file presence.
3. Locate or create the governed full-wrap Paperback cover through the normal cover capability and approval gate. Do not fabricate a cover from the EPUB's internal images; they are a logo and a manuscript table screenshot.
4. Select or generate one CoreSource eBook upload artifact, run formal EPUB validation, and complete governed retail metadata for the two authorized formats only.
5. Re-read CoreSource-to-LSI public-effect authority and provider ticket 5862952. Submit only after all title, asset, approval, and provider gates pass. Set a valid Tuesday release using actual lead time, then verify live publication before author notice and stewardship handoff.

Source authority: live read-only Dataverse Web API readbacks on 2026-09-29; current title workspace byte checks; `JMP-PUBLISHING-V2-BYWB-STARTER-IDENTIFIER-BINDING-2026-09-15.md`; `JMP-BYWB-DIST-001-PROVIDER-PREFLIGHT-2026-09-15.md`; `lib/publishing/lifecycle/human-pipeline-read-model.ts`; `lib/publishing/lifecycle/editorial-system-contract.ts`; founder copyright-page canon supplied in this thread.
