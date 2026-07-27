# JM1-PAY-001: Author Payout & Royalty Governance Standard

Version: 1.0
Status: CANON-CANDIDATE
Owner: J Merrill Publishing, Inc.
Prepared: 2026-07-27

## Purpose and Scope

JM1-PAY-001 governs the full author royalty and payout lifecycle for J Merrill Publishing: Author Payout Enrollment, royalty calculation, statement preparation, approval, locked statement publication, payout authorization, delivery, reconciliation, corrections, retention, support, and former-author access.

This standard adopts Option 1: Author Payout Enrollment. Enrollment is not payment execution. Enrollment collects the information needed for future payment readiness; payment remains a separately approved financial action.

## System of Record Map

| Responsibility | Authority |
| --- | --- |
| Royalty calculations, balances, adjustments, and payables | Business Central |
| Operational and workflow status | Dataverse |
| Identity, tax, banking, verification, and payout readiness | Stripe |
| Final statements, corrected statements, and evidence | SharePoint |
| Author-facing experience | Author Operating Center |

Dataverse must not become a competing royalty ledger. Any displayed monetary value in Dataverse must be read-only, synchronized, and clearly sourced from Business Central.

## Author Payout Enrollment

Author-facing language:

> Author Payout Enrollment allows you to securely provide Stripe with the identity, tax, and banking information needed to receive future payments from J Merrill Publishing. Completing enrollment does not mean that a payment is currently due, approved, or scheduled.

Technical documentation may use: Author Payout Enrollment, powered by Stripe Connect.

Enrollment may include:

- resolving the canonical author Contact;
- reusing an existing connected account when present;
- creating a Standard connected account only when absent;
- creating a Stripe-hosted onboarding link;
- retrieving identity, tax, banking, verification, requirements, and payout-readiness status;
- writing non-sensitive operational status to Dataverse.

Enrollment must not include:

- charges;
- transfers;
- refunds;
- payouts;
- customer payment operations;
- platform commission behavior;
- automatic payment after enrollment;
- payment triggered by `details_submitted=true` or `payouts_enabled=true`.

## Enrollment Communications Canon

Author Payout Enrollment email must comply with JM1-COM-001. For publishing enrollment messages, the canonical author-facing sender is `publishing@email.jmerrill.one`, the mandatory Reply-To is `publishing@jmerrill.one`, and `publishing@jmerrill.one` must receive a governed archival copy through BCC or an approved non-author-visible mechanism. This control must be enforced by the outbound mail component and must not rely on mailbox forwarding, Exchange aliases, user mailbox rules, author knowledge, or manual operator intervention.

Account Links may exist transiently in the intended author-facing email at send time. They must not be retained in Dataverse, execution logs, evidence files, internal documents, support notes, or archival copies. Retrospective archive copies and durable evidence must replace Account Links with `[TRANSIENT ACCOUNT LINK REDACTED]`.

## Monthly Processing

Frequency: MONTHLY.

Sales reports, distributor statements, direct-sale activity, returns, corrections, and adjustments are processed into the applicable royalty period. Late-arriving activity is handled through the next open period unless a governed correction is required.

## Royalty Freeze Canon

Freeze date: 10th day of each month.

Covered period: preceding calendar month.

J Merrill Publishing royalty reporting for the preceding calendar month freezes on the 10th day of each month. At freeze, the royalty ledger, prior balance, adjustments, payable amount, threshold result, and final statement are locked for that reporting cycle. Transactions, distributor reports, returns, or corrections received after freeze are recorded in the next open royalty period unless legal, contractual, or material-accuracy requirements require a governed corrected statement. No locked statement may be overwritten or silently revised.

## Minimum Payout

Minimum payout: $10.00.

Below-threshold balances carry forward. Forfeiture is prohibited unless a separate legal and contractual decision explicitly authorizes it.

## Negative Balances

Negative balances offset future royalties. JM1 must not automatically invoice an author for a negative royalty balance, charge the author through Stripe, or debit a bank account. Exceptions require Jackie approval and legal or contractual review.

## Statement Lifecycle

Statement states:

1. Calculation In Progress
2. Internal Review
3. Exception Resolution
4. Approved
5. Locked
6. Published to Author

Authors must never see drafts, provisional balances, unresolved adjustments, internal notes, or unpublished statement versions.

## Corrections

Corrections must:

- preserve the original locked statement;
- create a numbered corrected statement where required;
- record the reason and approving authority;
- link original and corrected versions;
- preserve audit evidence;
- never silently overwrite locked history.

## Payout Approval

Payment requires:

1. reconciled period;
2. 10th-day freeze;
3. final locked statement;
4. $10 threshold evaluation;
5. Jackie or formally delegated financial approval;
6. separately governed payment instruction.

Enrollment completion must never equal payment authorization.

## Payout-Destination Changes

Payout-destination changes require Stripe-hosted reauthentication. JM1 personnel must not manually collect replacement bank details, full tax identifiers, or identity documents.

## Former-Author Access

Former authors retain access to:

- final statements;
- tax documents;
- payout history;
- applicable historical title and relationship records;
- support for unresolved financial matters.

Former authors lose active publishing, production, submission, and package-management functions after offboarding.

## Support Ownership

| Area | JM1 responsibility | Stripe responsibility |
| --- | --- | --- |
| Author enrollment invitation timing | Approve and initiate only after governance gates | None |
| Identity, tax, and bank collection | Direct author to Stripe-hosted flow; do not collect sensitive details | Host collection and verification flow |
| Account requirements | Explain operational status and next steps | Maintain requirements and verification status |
| Statement questions | Own final statement and royalty policy support | None |
| Payment timing | Govern approval, threshold, and payment instruction | Deliver separately authorized payment |
| Destination change | Require Stripe reauthentication | Host destination update flow |
| Sensitive data access | Do not store raw bank, token, or full tax data | Maintain Stripe-side sensitive data |

## Audit and Retention

Permanent records:

- contracts;
- final locked royalty statements;
- corrected statements;
- author/title relationship history;
- payment authorization records;
- payment reconciliation references.

Seven-year supporting records:

- distributor reports;
- direct-sales reports;
- royalty import evidence;
- calculation workbooks or reproducible calculation exports;
- approval evidence;
- payout delivery/reconciliation evidence;
- exception evidence.

Shorter governed retention:

- routine operational logs;
- security event logs;
- transient diagnostic evidence.

Immediate deletion or non-retention:

- Account Link URLs;
- raw cookies;
- access codes;
- tokens;
- secrets;
- complete banking details;
- identity documents;
- full tax-identification values.

## Pilot Sequence and Gates

Pilot order:

1. Rosetta Perry
2. Cynthia Sloan
3. Carolyn Booker-Pierce

Rosetta's existing connected account must be reused. Cynthia and Carolyn may use new Standard connected accounts only when no governed connected account exists. Carolyn's canonical pilot-title blocker is closed with six approved titles: Abortion!, Because the Lord Is My Shepherd, Girl, You're Not Crazy. You're Dealing with a Narcissist, Loving the Addict, More Than a Village, and You're Still Not Crazy.

The three-author pilot invitation delivery was approved for Rosetta Perry, Cynthia Sloan, and Carolyn Booker-Pierce. Broad rollout remains separately gated.

Future first-wave or broad author-facing enrollment-link delivery requires Jackie approval after review of:

- narrowed implementation;
- author-facing copy;
- privacy and support language;
- link expiration and recovery process;
- operator runbook;
- no payment implication in enrollment messaging.

Broad rollout is not authorized by this standard.

## Production Activation Gates

Production activation requires:

- governed secret path confirmed;
- `JM1_STRIPE_CONNECT_ENABLED` approved for the target audience;
- `JM1_STRIPE_COMMISSIONING_PAYMENT_ENABLED=false` preserved unless a separate payment authorization changes it;
- regression tests proving prohibited capabilities are absent;
- no Account Link URLs stored or logged;
- Dataverse status-only writeback validated;
- Business Central financial authority preserved;
- Jackie approval for first author-facing delivery;
- accounting/legal review for payout execution design;
- no charges, transfers, refunds, or payouts unless separately authorized.
