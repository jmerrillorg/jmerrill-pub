# JMP_PUBLISHING_LIFECYCLE_v1.0

Classification: canonical lifecycle authority
Effective date: 2026-08-21
Approval authority: Founder / Publisher policy authority
Implementation authority: Engineering implements and validates approved lifecycle semantics

This canon defines the single semantic lifecycle authority for J Merrill Publishing. It does not migrate live titles, mutate Dataverse schema, edit Power Automate, send author communications, change commercial state, or execute editorial/production work.

## Ten Stages

| Stage | Canonical code | Name |
|---:|---|---|
| 01 | INQUIRY_INTAKE | Inquiry & Intake |
| 02 | CLASSIFICATION | Classification |
| 03 | EDITORIAL_REVIEW_RECOMMENDATION | Editorial Review & Publishing Recommendation |
| 04 | COMMERCIAL_ACTIVATION | Package Acceptance & Commercial Activation |
| 05 | AUTHOR_ONBOARDING | Join the Family & Author Onboarding |
| 06 | EDITORIAL_PRODUCTION | Editorial Production |
| 07 | BOOK_PRODUCTION | Book Production |
| 08 | DISTRIBUTION_READINESS | Cover, Metadata & Distribution Readiness |
| 09 | DISTRIBUTION_RELEASE | Distribution, Launch & Release |
| 10 | POST_PUBLICATION | Post-Publication Title & Author Relationship |

Stage 06 contains Developmental Editing, Developmental Author Review, Line Editing, Line Author Review, Copyediting, and Copy Author Review. Stage 07 contains Interior Layout / Typesetting, Proofreading, Final Author Approval, and Production Finalization.

## Three Dimensions

Prospect / Commercial lifecycle: Inquiry -> Intake -> Classification -> Editorial Review -> Recommendation -> Package Accepted -> Commercial Activation.

Title lifecycle: Source Manuscript -> Editorial Production -> Book Production -> Distribution -> Release -> Post-Publication.

Author Relationship lifecycle: Prospect -> Joined the Family -> Active Author -> Returning Author -> Multi-Title Author -> Loyalty / Referral Relationship.

These dimensions are connected but separate. Package, payment, referral, loyalty, royalty payout readiness, title stage, and author relationship state must not collapse into one overloaded status.

## Universal Stage Anatomy

Every canonical stage/substage must define entry condition, source of truth, work to perform, governing artifact/data, quality gate, waiting owner, and exit contract. Where applicable, it also defines author gate requirements, commercial gate requirements, artifact expectations, allowed parallel work, terminal behavior, and next canonical stage.

## Editorial Review Collision

Generic `EDITORIAL_REVIEW` is not a universal canonical code.

Pre-contract Editorial Review belongs to Stage 03, `EDITORIAL_REVIEW_RECOMMENDATION`, and exists to assess a prospective manuscript and recommend a publishing path/package.

Active-author title editorial work belongs to Stage 06, `EDITORIAL_PRODUCTION`, with explicit Developmental, Line, and Copy substages.

Legacy runtime values may use `EDITORIAL_REVIEW` temporarily only through a context-aware adapter. Ambiguous legacy values must fail closed as `LIFECYCLE_MAPPING_CONFLICT`.

## Human Gates

A valid human gate can arrive through email, portal, phone/verbal, or another approved channel. The gate must identify decision maker, decision, channel, occurrence date, recorder, artifact id, artifact checksum/version, title/project, gate id, and next-stage authorization. Automation should record human decisions instead of making humans repeat them.

## Artifact Lineage

The lifecycle expects exact artifact identity:

ORIGINAL_AUTHOR_SUBMISSION -> EDITORIAL_WORKING_SOURCE -> EDITORIAL_REVIEW_SOURCE -> DEVELOPMENTAL_ARTIFACT -> APPROVED_DEVELOPMENTAL_ARTIFACT -> LINE_ARTIFACT -> APPROVED_LINE_ARTIFACT -> COPY_ARTIFACT -> APPROVED_COPY_ARTIFACT -> LAYOUT_ARTIFACT -> PROOF_ARTIFACT -> FINAL_INTERIOR -> DISTRIBUTION_ARTIFACT.

Transitions that require exact artifacts must not rely on "latest file" inference.

## Sequencing

When applicable, Developmental approval leads to Line, Line approval leads to Copy, Copy approval leads to Layout, Layout leads to Proof, Proof leads to Final Author Approval, and Final Author Approval leads to Production Finalization.

If a scoped package/title legitimately omits an optional substage, the omission is not an illegal skip. If a substage applies and is required, its predecessor gate/artifact must be present.

Proof before Layout is invalid. Copy directly to Proof without Layout is invalid.

## Parallelism

Parallelize preparation; serialize irreversible gates. Cover concept, metadata drafting, marketing preparation, and distribution preparation may occur as safe preparatory work before final production completion. Full wrap finalization requires final page count, spine, and production specifications.

## Waiting Owner and System Attention

Allowed Waiting On values are Prospect, Author, JMP, JMP/System, and External.

Waiting On and System Attention are separate. A technical condition such as AUTHOR_ACK_FAILED, PROVIDER_BACKPRESSURE, ARTIFACT_MISSING, or RUNTIME_HOLD must not rewrite the true workflow owner.

## Joined the Family

Publishing Agreement Executed plus Required Initial Payment Received equals JOINED_THE_FAMILY.

Package Accepted alone is not Joined the Family. Agreement Executed alone is not Joined the Family. Initial Payment Received alone is not Joined the Family.

Joined the Family is durable once legitimately emitted. A later missed payment does not mean the author never joined the family.

## Payment and Final Delivery

INITIAL_PAYMENT_RECEIVED, PAYMENT_PLAN_ACTIVE, PAYMENT_PAST_DUE, and PAYMENT_OBLIGATION_COMPLETE are commercial states/events, not title stages. Work may progress under an approved active payment plan according to normal readiness gates, while final delivery/release remains closed until contractual payment obligations are satisfied.

## Stage 10 Persistence

POST_PUBLICATION is persistent and nonterminal until a governed terminal event occurs. Royalty events, metadata updates, sales imports, and marketing opportunities remain inside Stage 10 stewardship and do not move the title back to Stage 09.

Potential terminal title states such as RETIRED, RIGHTS_REVERTED, CONTRACT_EXPIRED, and TERMINATED require source authority. This canon does not invent legal consequences.

## Change Control

Founder / Publisher policy authority approves lifecycle and business semantic changes. Engineering implements and validates approved semantics. Runtime PRs must not introduce new lifecycle stages or statuses without lifecycle-governance review and version/change acknowledgment.
