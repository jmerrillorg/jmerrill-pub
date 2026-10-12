# Publisher-funded route v1.1.0

Authority: current explicit Publisher instruction, 2026-10-12.
Status: policy and five-title selections persisted; execution integration NOT
commissioned. Source tests are not deployment or author-election proof.

Funding, imprint and editorial scope are independent. Publisher funding means
$0 author fees, not copyright ownership, altered royalties, unlimited spend,
publication permission or a skipped lifecycle gate. Future titles require an
explicit versioned Publisher selection. Existing author-funded prices remain.

The exact five fresh source/assessment bindings and accepted safeguards are
validated by `publisherFundedPolicy.js` against the retained Publisher acceptance.
Private policy and selection records are content-addressed. The original
internal-project policy is preserved but superseded by the funding selection;
its ownership wording must not be used to infer a copyright transfer.

## Stage authority supersession

`lib/publishing/lifecycle/stage-definitions.json` and the canonical stage
contracts govern execution. The historical simplified flow in the checksum-
locked editorial `references/knowledge.md` is not execution authority. In
particular, its "Stage 4: Production Routing" label is superseded:

- Stage 03: Editorial Review; Publisher recommendation is not author consent.
- Stage 04: Author Decision; exact-version accept/decline/hold through author mail.
- Stage 05: Agreement & Payment; actual required-party execution and funding gate.

The funded route must not execute editing, ISBN assignment, distribution or
publication from a Stage 04 decision. Existing Whole editorial authority and
its checksum lock remain intact; a fresh route must not rewrite that authority.

## Agreement and payment

Author election, offer hash, agreement execution and approved next-work budget
must all bind the same exact title. The internal payment projection is
`NOT_APPLICABLE_PUBLISHER_FUNDED`, author due $0, with policy/selection references.
It is not a payment, invoice settlement or cleared-funds claim. No author invoice
or payment request should be created merely to satisfy Stage 05.

Approved author-funded agreement clauses requiring first payment and annual
author fees need a properly versioned funded addendum before use in a funded
offer. Existing royalty and rights terms are reused only from the applicable
governed agreement; no automatic recoupment or ownership inference is permitted.
## Five-title cost ruling (2026-10-12)

The five exact selected fresh titles have a separately bound cost-treatment
authority. On voluntary withdrawal, Publisher absorbs ordinary documented
production costs. No automatic cost reimbursement debt or royalty recoupment
is created. Existing author warranties and manuscript/disclosure obligations
are preserved; failure to satisfy them does not automatically create a debt.
Different financial treatment requires approval of the exact clause and financial
consequence before issuing an offer containing it. This is not new spend authority.

The same versioned clause and policy/selection/cost-treatment hashes must bind
both Stage 04 offers and Stage 05 agreements. Supersede only contradictory
author-fee and automatic production-cost reimbursement requirements for that
Work, including relevant provisions of base sections 2.4, 4.2 and 10.2. Preserve
unrelated warranties, rights and royalty terms; never alter the base agreement
silently. Prior policy versions and approval evidence remain historical.

The cost ruling is limited to the five selected titles; future publisher-funded
selections do not inherit a new contingent-cost treatment without authority.

Existing relay routing and idempotency must be reused. Delivery, author decision,
execution and budget approval require their own evidence; a send request or
Publisher policy approval cannot satisfy those gates.

No new paid inference, provider commitment or final publication is authorized
by this policy. Stage 03's completed assessment budget is not next-work authority.

## Bounded Stage 04 sender and response consumer

The existing source-registration endpoint accepts `SUBMISSION_04_PREFLIGHT`,
`SUBMISSION_04_SEND`, `SUBMISSION_04_READBACK`, and `SUBMISSION_04_RECONCILE`.
Only the five selected title IDs are accepted. A private content-addressed
manifest binds the retained policy, selection, accepted assessments, offer hashes,
and unchanged registered base-agreement bytes. Broad commissioning workers remain
disabled. Set `JM1_NEW_SUBMISSION_STAGE04_MANIFEST` and its `_SHA256`, then the
five-ID `JM1_NEW_SUBMISSION_STAGE04_TITLE_IDS` allowlist. Enable only
`JM1_NEW_SUBMISSION_STAGE04_ENABLED` after release and authority preflight.

The sender persists an exact review package and uses the existing approved-author
relay, canonical author recipient and Publishing CC. Provider acceptance and an
exact provider message found in the author's mailbox are separate receipts.
The existing author-response timer resumes only previously initiated sends,
using bounded claim/backoff recovery; it never starts an unrequested offer.
Disable the Stage 04 flag to stop its sender and scheduled consumer without
deleting receipts or changing any other commissioning state.

Responses must come from the authorized author, authenticate successfully, and
reply to the exact delivered message. Quoted instructions, conditional language,
stale threads, changed observations and conflicting elections cannot authorize
advancement. Metadata and content hashes retain provenance without retaining
full response bodies. Stage 05 remains gated on actual agreement execution and
approved next-work budget; an author acceptance alone is not either proof.

Local and CI tests establish source behavior only. Record the reviewed release,
actual recipient delivery, authentication and scheduled recovery separately
before describing Stage 04 as operational.
