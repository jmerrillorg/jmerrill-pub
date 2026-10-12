# Publisher-funded route v1.0.0

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
Exit/reimbursement treatment is explicitly pending Publisher decision.

Existing relay routing and idempotency must be reused. Delivery, author decision,
execution and budget approval require their own evidence; a send request or
Publisher policy approval cannot satisfy those gates.

No new paid inference, provider commitment or final publication is authorized
by this policy. Stage 03's completed assessment budget is not next-work authority.
