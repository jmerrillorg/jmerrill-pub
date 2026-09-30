# JMP-REAL-TITLE-END-TO-END-001: Controlled title readback

Date: 2026-09-29 ET
Mode: controlled-title reconciliation and non-submitting distribution preflight
Production mutations: one ETag-guarded Dataverse title metadata update and founder-authorized Vellum source correction/re-export. Provider submissions and author communications: 0.

## Continue-06 native production and distribution gate readback

The recovered Vellum 4.1.4 project is in the active title's `11 - Interior Layout` folder under `/JM1-PUB/01_Pipeline_A-Z/09 - Copyediting/Crowley, Sean - Before You Were Born/`. Its archive/template predecessor remains a noncanonical recovery source. The provenance note beside the canonical project records the original archive-to-canonical byte match at SHA-256 `925d34a5cd2ca6213d5cb7024c53798673fcb941b4799e893db09c15f37338e0` and material correspondence, not byte-identical export lineage, to Sean's approved September 11 v1.1 proof. Before correction, an unchanged copy of those original source bytes was preserved at `/Volumes/UsersExternal/Developer/evidence/bywb-2026-09-29-source-preservation/Before You Were Born.original.vellum`. The corrected canonical project SHA-256 is `58b4f445829a3fb5a38bc776a74c7a70a9e846e45d19fdc863ba4b59c8c42c34` (modified 2026-09-29 20:43:54 ET). No project was edited in the archive/template location.

The canonical Vellum Title Info now uses subtitle `Discovering God's Plan for Your Life`, author byline `Sean Arron Crowley`, and eBook ISBN `978-1-961475-87-8`; its copyright page retains Paperback ISBN `978-1-961475-86-1`. The pending-LCCN placeholder was removed because LCCN is intentionally not pursued. A sentence asserting U.S. Copyright Office registration, absent from the author-approved proof and not supported by registration evidence, was also removed. The approved public AI sentence remains. The manuscript chapters were not edited.

| Native output | Canonical path below `11 - Interior Layout` | SHA-256 | Readback |
| --- | --- | --- | --- |
| Paperback interior PDF | `Before You Were Born/Print/Before-You-Were-Born-Print-2026-09-29.pdf` | `b84b89d86fcf1930ee251879512bad283e01c5a5d1fd6e60b2c96976b22e047b` | Vellum 4.1.4; created 2026-09-29 20:44:09 ET; PDF/X-1a:2003; 102 pages; 432 x 648 pt (6 x 9 in); unencrypted |
| Generic eBook EPUB | `Before You Were Born/Generic/Before-You-Were-Born-Generic-2026-09-29.epub` | `1e5737be7bb0efc3c2ad287db3e5671e50579ac335890fe9b8f399e4d2c7dc13` | Vellum export modified 2026-09-29 20:44:04 ET; EPUB 3.4; identifier `9781961475878` |

Page-by-page extracted-text comparison against the exact approved September 11 v1.1 PDF found 98 of 102 pages identical. The only four changed pages are page 3 (authorized subtitle/byline), page 4 (authorized Paperback/eBook identifiers and removal of pending placeholders/unproven registration claim), page 7 (table-of-contents author byline), and page 97 (`Also By` author byline). All chapter/body pages, chapter starts, pagination, and page count remain unchanged. Rendered samples of the title, copyright, chapter opening, and back matter were visually inspected without clipping. This proves approved manuscript-content parity; it does not replace final printer/provider cover QA.

EPUBCheck 5.4.0 on the final Generic EPUB: **0 fatal, 0 errors, 1 warning**. Warning `OPF-086c` concerns Vellum's deprecated `xsd` reserved prefix on the UUID identifier; validation exits successfully. OPF title/subtitle, byline, publisher, eBook ISBN, language, navigation, manifest, spine, and accessibility metadata read correctly. All 14 chapter/epilogue/reference XHTML texts match the September 11 Apple eBook after whitespace and display-case normalization. The Generic EPUB has no final cover reference: the content artifact is valid, but the provider-facing package is not complete until a governed front cover is bound. Accessibility metadata itself says image alt-text/WCAG status was not verified, so accessibility certification is not claimed.

Targeted cover recovery found no Before You Were Born cover source or approved front image in the canonical title workspace, inspected local production/archive filenames, or the available SharePoint search. A July mailbox thread about Sean Crowley's cover designs was inspected and explicitly concerns **Strategies for Success**, not this title; it is not reusable cover authority. `COVER_INPUT_STATUS=INSUFFICIENT_SOURCE`; no new concept or full-wrap file was fabricated. The exact missing input is an approved, high-resolution Before You Were Born front-cover asset or editable design source from which a 6 x 9 Paperback wrap can be governed and QA'd.

The inspected Crowley agreements contain other titles, not an executed Before You Were Born instrument. Adobe's e-sign archive presented a human MFA challenge, so execution and format/territory/distribution rights could not be independently established. No draft or other-title agreement is substituted. `EXECUTED_TITLE_AGREEMENT=NOT_FOUND` in accessible evidence; `DISTRIBUTION_RIGHTS_AUTHORITY=FAIL` pending exact title agreement or equivalent governing instrument. No provider submission is permitted.

Known retail metadata is title, subtitle, display byline, publisher, Starter package, Paperback/eBook formats, and their ISBNs. Retail price, on-sale date, BISAC, keywords, public description, audience, and distribution territories remain unproven; `RETAIL_METADATA=FAIL`, not a fabricated complete record. CoreSource ticket 5862952 and its public-effect boundary remain unresolved in the available readback; no live CoreSource session or submission was used. The physical workspace remains Stage 09 while the latest author-approved combined layout/proof supports interior production work. The conflicting Dataverse title/stage/gate fields remain unreconciled; no unsupported stage transition or workspace move was made. Accordingly `CURRENT_STAGE_RECONCILIATION=FAIL` and `CANONICAL_CURRENT_STAGE=UNRESOLVED` for governed lifecycle projection, despite the proved layout/proof completion.

Both authorized formats fail **distribution** preflight: Paperback lacks the full-wrap cover, final retail metadata, rights and provider authority; eBook has a valid selected Generic EPUB but lacks the final cover asset, metadata, rights and provider authority. No provider effect, author communication, or additional Dataverse mutation occurred in Continue-06.

## Continue-03 production-source readback

Sean's September 11 approval of the exact combined layout/proof is accepted as the current manuscript-content approval. The ISBN-only v1.2 PDF change does not reopen that approval, and correcting the already-ratified subtitle and byline does not itself require a new author decision. A new author review is warranted only if a corrected export changes manuscript content or material layout beyond those authorized corrections.

Fresh Dataverse readback on September 29 confirms the title subtitle and display byline match founder authority. It also shows only two editorial-stage rows for this title: Developmental (`88189235-8f80-f111-ab0f-6045bdd69435`, status `Plan Delivered`) and historical Editorial Review (`624a5e5f-4d80-f111-ab0f-6045bdd69738`). The contradictory Developmental approval gate (`e996abe7-2f8e-f111-8077-000d3a14673b`) has `nextstageauthorized=false`. It is historical evidence, not authority to override Sean's later exact proof approval or to manufacture missing Line/Copy/Proof stage transitions. The title-level `CANONICAL_PUBLISHED_TITLE` label is likewise not publication proof. Stage projection remains unreconciled; no stage or workspace move was made.

The approved print proof identifies Vellum 4.1.4 as its creator. This Continue-03 snapshot predates the source recovery and native exports documented above. The v1.2 PDF was produced by `pypdf` and remains preserved as historical evidence; the September 29 PDF and EPUB now come from the canonical Vellum project. A title-specific cover input is still missing.

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
| Subtitle | Founder identifier authority: `Discovering God's Plan for Your Life`; Dataverse field and September 29 Vellum exports now match; earlier exports retain their old value | Founder decision resolved; new output metadata corrected |
| Author display | Founder authority: `Sean Arron Crowley`; Dataverse `jm1pub_authordisplayname` and September 29 Vellum exports now match; internal `jm1pub_authorname` remains `Sean Crowley` as contact name; earlier exports retain their old value | Founder decision resolved; new output metadata corrected |
| Copyright-page AI sentence | Present in the current PDF | Explicitly approved public language by founder; not a defect |
| Provider effect | Prior CoreSource preflight was blocked; support ticket 5862952 | Current public-effect boundary requires fresh provider readback |

The Dataverse display update changed only `jm1pub_authordisplayname` and `jm1pub_subtitle` on title `91c5e1ef-2980-f111-ab0f-7c1e525b15c2`, using the current ETag. The post-write readback matches founder authority; `jm1pub_stage` and publication status remain unchanged. `CURRENT_TITLE_STATE=FAIL` for automated advancement: the historical gate and stage projection remain inconsistent, and provider-ready files are incomplete. No historical `CANONICAL_PUBLISHED_TITLE` label may be used as publication proof.

The v1.1 approval supports the existing layout and text. V1.2 differs only on PDF page 4, where pending Paperback/Hardcover/eBook identifiers became the governed Paperback and eBook ISBNs. The later subtitle/byline correction is **not** part of that identifier-only refresh. The corrected September 29 native exports and parity QA are documented above; metadata-only corrections do not trigger another author approval.

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
| 10 Proofreading | Yes | Combined print layout/proof review approved for v1.1 / Author | Current layout proof, corrections, exact proof approval | September 29 native outputs preserve approved manuscript text and pagination; formal gate binding remains unresolved |
| 11 Interior Layout | Yes | Native Vellum Paperback PDF and Generic EPUB generated / Production | Versioned, QA-passed layout proofs for entitled formats | Interior content/metadata corrected; lifecycle stage projection and final production package remain unresolved |
| 12 Cover Design | Yes | Not ready / Production + author | QA-passed, delivered, exactly approved cover proof | Governed 6 x 9 full-wrap print cover absent |
| 13 Production | Yes | Blocked / Production | Final interior, final cover, identifiers, QA and approvals for Paperback and eBook | Cover, canonical eBook source, metadata and proof gates open |
| 14 Distribution | Yes | Draft assets / Provider runtime | Governed artifacts, provider validation, submission evidence | CoreSource/LSI authority and package preflight not passed |
| 15 Publication | Yes | Not proven / Provider + Publishing | Tuesday release, provider live readback and public-page verification | No submitted/live format proven |
| 16 Post-Publication | Yes | Not started / Publishing | Author notice and persistent royalty/catalog/distribution stewardship | Requires real publication readback first |

## Bounded next work

1. Preserve the September 29 native Vellum outputs and their parity results as the current interior/eBook content candidates. Do not patch a PDF or EPUB into the author-facing master by hand.
2. Bind the September 11 exact v1.1 proof approval into the title's governed review chain. Reconcile the August developmental gate as its actual clarification event rather than reusing its false `Approve` value. Resolve stage truth from completed business evidence before any workspace move.
3. Locate or create the governed full-wrap Paperback cover through the normal cover capability and approval gate. Do not fabricate a cover from the EPUB's internal images; they are a logo and a manuscript table screenshot.
4. Use the validated Generic EPUB as the sole current CoreSource content candidate. Bind an approved front cover and complete the unproven retail metadata for the two authorized formats only; do not equate EPUBCheck success with a complete provider package.
5. Re-read CoreSource-to-LSI public-effect authority and provider ticket 5862952. Submit only after all title, asset, approval, and provider gates pass. Set a valid Tuesday release using actual lead time, then verify live publication before author notice and stewardship handoff.

Source authority: live Dataverse Web API readback and ETag-guarded metadata update on 2026-09-29; governed inbound queue readback and Publishing mailbox conversation/attachment; current title workspace byte and page-text checks; `JMP-PUBLISHING-V2-BYWB-STARTER-IDENTIFIER-BINDING-2026-09-15.md`; `JMP-BYWB-DIST-001-PROVIDER-PREFLIGHT-2026-09-15.md`; `lib/publishing/lifecycle/human-pipeline-read-model.ts`; `lib/publishing/lifecycle/editorial-system-contract.ts`; founder copyright-page canon supplied in this thread.
