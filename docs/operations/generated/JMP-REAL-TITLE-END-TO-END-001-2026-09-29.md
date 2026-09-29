# JMP-REAL-TITLE-END-TO-END-001: Controlled title readback

Date: 2026-09-29 ET
Mode: controlled-title reconciliation and non-submitting distribution preflight
Production mutations: one ETag-guarded Dataverse title metadata update. Provider submissions and author communications: 0.

## Continue-03 production-source readback

Sean's September 11 approval of the exact combined layout/proof is accepted as the current manuscript-content approval. The ISBN-only v1.2 PDF change does not reopen that approval, and correcting the already-ratified subtitle and byline does not itself require a new author decision. A new author review is warranted only if a corrected export changes manuscript content or material layout beyond those authorized corrections.

Fresh Dataverse readback on September 29 confirms the title subtitle and display byline match founder authority. It also shows only two editorial-stage rows for this title: Developmental (`88189235-8f80-f111-ab0f-6045bdd69435`, status `Plan Delivered`) and historical Editorial Review (`624a5e5f-4d80-f111-ab0f-6045bdd69738`). The contradictory Developmental approval gate (`e996abe7-2f8e-f111-8077-000d3a14673b`) has `nextstageauthorized=false`. It is historical evidence, not authority to override Sean's later exact proof approval or to manufacture missing Line/Copy/Proof stage transitions. The title-level `CANONICAL_PUBLISHED_TITLE` label is likewise not publication proof. Stage projection remains unreconciled; no stage or workspace move was made.

The approved print proof identifies Vellum 4.1.4 as its creator. No Vellum source project or front-cover image/design source was found in the single current numbered title workspace; a search of the indexed Vellum projects found no Crowley/Before You Were Born source. The current v1.2 PDF was produced by `pypdf`, and its checksum still matches the prior certified readback. This does not authorize binary patching or a layout recreation that could silently change pagination. The governed production source and approved cover inputs must be recovered or established before corrected Paperback/eBook re-export and full-wrap QA can pass.

The inspected Crowley people-agreement folder contains agreements for three other titles, but no Before You Were Born agreement. That is not proof that rights are absent elsewhere; distribution-rights authority remains unproven until the exact executed title agreement/current governed record is bound. Provider submission remains denied. No author communication, provider effect, or additional Dataverse mutation occurred in this continuation.

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
| Print interior | `Before-You-Were-Born-Print-2026-09-15-v1.2.pdf`, 102 pages, SHA-256 `623a2605d48e19a03ef5e3dd5d82494897b26c3c5f3e7cec338126bfb53f0e56` | Same extracted page text as approved v1.1 except copyright-page ISBN block; founder authority says the identifier-only refresh does not reopen proof approval |
| Sample eBook | Apple export `Before-You-Were-Born-Apple-2026-09-15.epub`, SHA-256 `d3e924e5a31ec6257452172e2394201c9597b6382459d6b7acb739fa4a3df5df` | Bytes match manifest; not selected as canonical CoreSource source |
| Paperback asset | `24716f8b-f4b0-f111-aaac-00224820105b` | Staged / Draft on 2026-09-29 |
| eBook asset | `07f99887-f4b0-f111-aaac-6045bdd69678` | Staged / Draft on 2026-09-29 |
| Author-review gate | Developmental gate has an `Approve` decision dated 2026-08-28 but still says `Awaiting Author Response`; its source text asks for access and asks the publisher to approve | Historical gate is inconsistent and must not be used as proof of Sean's approval |
| Latest proof decision | Sean replied `Approved!` on 2026-09-11 at 12:22 UTC to the 11:53 UTC combined layout/proof request. The sent attachment `Before You Were Born - Print - Author Review v1.1.pdf` downloaded from the mailbox hashes to `de9e4d61cce325be3be65ef1392d39aa70e64cc5bd6874a60bc387c7f710127e`, matching the preserved workspace file. Governed inbound event `inbound_message_event_18fc26b0e1e252d1c1392505ebed6357` classifies the reply as author approval but leaves correlation for review. | Exact v1.1 delivery and reply binding proven; operational gate binding still absent |
| Subtitle | Founder identifier authority: `Discovering God's Plan for Your Life`; Dataverse title field now matches; print/eBook files still read `Discovering the Divine Blueprint for Your Life` | Founder decision already resolved; source artifact regeneration required |
| Author display | Founder authority: `Sean Arron Crowley`; Dataverse `jm1pub_authordisplayname` now matches; internal `jm1pub_authorname` remains `Sean Crowley` as the contact name; print/eBook files still read `Sean Arron Crowley, I` | Founder decision already resolved; source artifact regeneration required |
| Copyright-page AI sentence | Present in the current PDF | Explicitly approved public language by founder; not a defect |
| Provider effect | Prior CoreSource preflight was blocked; support ticket 5862952 | Current public-effect boundary requires fresh provider readback |

The Dataverse display update changed only `jm1pub_authordisplayname` and `jm1pub_subtitle` on title `91c5e1ef-2980-f111-ab0f-7c1e525b15c2`, using the current ETag. The post-write readback matches founder authority; `jm1pub_stage` and publication status remain unchanged. `CURRENT_TITLE_STATE=FAIL` for automated advancement: the historical gate and stage projection remain inconsistent, and provider-ready files are incomplete. No historical `CANONICAL_PUBLISHED_TITLE` label may be used as publication proof.

The v1.1 approval supports the existing layout and text. V1.2 differs only on PDF page 4, where pending Paperback/Hardcover/eBook identifiers became the governed Paperback and eBook ISBNs. The later subtitle/byline correction is **not** part of that identifier-only refresh. Corrected print/eBook exports need versioned content/layout parity QA before publication; metadata-only corrections do not trigger another author approval.

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
| 10 Proofreading | Yes | Combined print layout/proof review approved for v1.1 / Author | Current layout proof, corrections, exact proof approval | Approval is proven for v1.1; v1.2 is identifier-only; corrected subtitle/byline exports remain pending |
| 11 Interior Layout | Yes | Print PDF and eBook files present / Production | Versioned, QA-passed layout proofs for entitled formats | Subtitle/byline drift and exact approved version unresolved |
| 12 Cover Design | Yes | Not ready / Production + author | QA-passed, delivered, exactly approved cover proof | Governed 6 x 9 full-wrap print cover absent |
| 13 Production | Yes | Blocked / Production | Final interior, final cover, identifiers, QA and approvals for Paperback and eBook | Cover, canonical eBook source, metadata and proof gates open |
| 14 Distribution | Yes | Draft assets / Provider runtime | Governed artifacts, provider validation, submission evidence | CoreSource/LSI authority and package preflight not passed |
| 15 Publication | Yes | Not proven / Provider + Publishing | Tuesday release, provider live readback and public-page verification | No submitted/live format proven |
| 16 Post-Publication | Yes | Not started / Publishing | Author notice and persistent royalty/catalog/distribution stewardship | Requires real publication readback first |

## Bounded next work

1. Use the already-ratified subtitle and byline. Regenerate the print/eBook outputs from their governed production source, preserving the old versions and proving content/layout parity and versioned QA. Do not patch a PDF or EPUB into the author-facing master by hand.
2. Bind the September 11 exact v1.1 proof approval into the title's governed review chain. Reconcile the August developmental gate as its actual clarification event rather than reusing its false `Approve` value. Resolve stage truth from completed business evidence before any workspace move.
3. Locate or create the governed full-wrap Paperback cover through the normal cover capability and approval gate. Do not fabricate a cover from the EPUB's internal images; they are a logo and a manuscript table screenshot.
4. Select or generate one CoreSource eBook upload artifact, run formal EPUB validation, and complete governed retail metadata for the two authorized formats only.
5. Re-read CoreSource-to-LSI public-effect authority and provider ticket 5862952. Submit only after all title, asset, approval, and provider gates pass. Set a valid Tuesday release using actual lead time, then verify live publication before author notice and stewardship handoff.

Source authority: live Dataverse Web API readback and ETag-guarded metadata update on 2026-09-29; governed inbound queue readback and Publishing mailbox conversation/attachment; current title workspace byte and page-text checks; `JMP-PUBLISHING-V2-BYWB-STARTER-IDENTIFIER-BINDING-2026-09-15.md`; `JMP-BYWB-DIST-001-PROVIDER-PREFLIGHT-2026-09-15.md`; `lib/publishing/lifecycle/human-pipeline-read-model.ts`; `lib/publishing/lifecycle/editorial-system-contract.ts`; founder copyright-page canon supplied in this thread.
