# Author Payout Enrollment Governance Alignment Implementation Package

Prepared: 2026-07-27
Branch: `codex/author-payout-enrollment-governance-alignment`
Base: `5a8d22104d4eaf725c0df2bd096031ada9556373`
Status: IMPLEMENTATION-READY / REVIEW REQUIRED

## Architecture Decision Record

Decision: Adopt Author Payout Enrollment as the governed author-facing capability.

Technical wording may state: Author Payout Enrollment, powered by Stripe Connect.

Rejected for this wave:

- generic "Stripe Connect" as author-facing capability name;
- account creation that requests `card_payments`;
- account creation that requests `transfers`;
- enrollment-triggered charges, transfers, refunds, payouts, customer payments, or platform commissions;
- Dataverse as royalty ledger;
- author-facing rollout before Jackie approval.

Accepted architecture:

Author Operating Center -> server-side JM1 enrollment route -> Stripe-hosted identity, tax, address, and banking collection -> Stripe status readback -> Dataverse non-sensitive status -> Business Central royalty/payable authority -> separately approved payment delivery -> Business Central reconciliation.

## Source Alignment

`lib/server/stripe/author-workspace-stripe.ts` now builds Standard connected-account requests without capability requests. The account payload is enrollment-only and includes non-sensitive metadata stating that payment is not authorized.

Before:

```text
type=standard
country=US
business_type=individual
capabilities[card_payments][requested]=true
capabilities[transfers][requested]=true
metadata[jm1_source]=PROGRAM-002 commissioning
```

After:

```text
type=standard
country=US
business_type=individual
metadata[jm1_source]=Author Payout Enrollment
metadata[jm1_payment_authorized]=false
```

No replacement commerce or money-movement capability was added.

## Regression Protection

Automated coverage proves:

- `card_payments` is absent from new connected-account requests;
- `transfers` is absent from new connected-account requests;
- future reintroduction of either prohibited capability fails validation;
- existing account IDs are reused without calling `/v1/accounts`;
- duplicate account creation is prevented when an account ID is present;
- Account Link URLs are returned only to the authenticated route response and are not written to execution logs;
- enrollment source does not create or alter a royalty payable;
- enrollment completion does not trigger money movement;
- payment operations fail closed while `JM1_STRIPE_COMMISSIONING_PAYMENT_ENABLED=false`;
- enrollment calls only `/v1/accounts` and `/v1/account_links` in mocked tests.

## Business Central Implementation Package

Implementation status: SPECIFIED ONLY. No Business Central production configuration, posting, migration, or payment instruction occurred.

Required records or extensions:

| Record/field | Purpose |
| --- | --- |
| Canonical author/vendor relationship | Bind author identity to BC payee/vendor authority |
| Publishing relationship reference | Link BC financial activity to Dataverse publishing relationship |
| Royalty period | Monthly reporting period and status |
| Opening carryforward | Prior period balance entering the period |
| Gross royalty | Calculated royalties before adjustments |
| Adjustments | Approved additions/deductions with reason |
| Negative offset | Negative balance offset against future royalties |
| Payable amount | Final period amount eligible for threshold evaluation |
| Threshold result | Paid this cycle or carried forward under $10 rule |
| Closing carryforward | Balance moving to next period |
| Freeze timestamp | 10th-day lock timestamp |
| Statement version | Original or numbered correction version |
| Approval status | Internal review and financial approval state |
| Approving authority | Jackie or delegated financial approver |
| Payment authorization | Separate payment instruction approval |
| Stripe payment reference | Delivery reference only after separate authorization |
| Reconciliation state | Delivered, failed, reversed, reconciled, or exception |
| Correction linkage | Relationship from corrected statement to original |
| Idempotency key | Prevent duplicate payables or payments |

Monthly workflow:

Sales reports received -> imported -> reconciled -> royalty rates applied -> exceptions resolved -> preliminary ledger reviewed -> freeze on the 10th -> statement locked -> final statement published -> threshold evaluated -> carryforward or approval queue -> payment instruction held behind disabled gate -> eventual Stripe result reconciled.

Required controls:

- no posting into a closed royalty period without governed correction;
- no silent statement replacement;
- no payout instruction before approval;
- no duplicate payable or payout;
- no negative author debit through Stripe;
- every payment tied to locked statement and BC reference;
- late activity moves to next open period unless correction is approved.

Accounting review required:

- royalty payable accounts;
- opening-balance migration;
- distributor clearing;
- payment clearing;
- tax-year treatment;
- 1099 reporting;
- refunds and returns;
- historical QBO migration;
- split-year reconciliation.

## Dataverse Operational Model

Implementation status: SPECIFIED ONLY, except existing status-field evidence referenced by PROGRAM-004. No Dataverse schema change or live Contact mutation occurred in this wave.

Required operational data:

| Field/concept | Boundary |
| --- | --- |
| Contact | Canonical author identity |
| Publishing relationship | Operational author/title relationship |
| Title relationship | Author's governed title scope |
| Stripe connected-account ID | Non-sensitive identifier only |
| Stripe mode | Test or live mode label |
| Enrollment status | Not started, started, action required, completed, expired |
| Details submitted | Readback boolean |
| Payouts enabled | Readback boolean, not payment approval |
| Outstanding requirements | Summary only, no sensitive values |
| Last status check | Timestamp |
| Enrollment started/completed dates | Operational timestamps |
| Latest final-statement reference | SharePoint/BC reference only |
| Royalty-period reference | BC authority reference |
| Approval state | Operational mirror of financial approval |
| Payment workflow state | Status only, no independent payable |
| Business Central document/reference | Link to financial authority |
| Execution correlation ID | Safe traceability |
| Former-author historical access | Retained financial access state |

Execution events:

- `AUTHOR_PAYOUT_ENROLLMENT_STARTED`
- `AUTHOR_PAYOUT_ENROLLMENT_STATUS_CHECKED`
- `AUTHOR_PAYOUT_ENROLLMENT_COMPLETED`
- `AUTHOR_PAYOUT_ENROLLMENT_ACTION_REQUIRED`
- `STRIPE_CONNECTED_ACCOUNT_CREATED`
- `STRIPE_CONNECTED_ACCOUNT_REUSED`
- `STRIPE_ACCOUNT_LINK_CREATED`
- `STRIPE_ACCOUNT_LINK_EXPIRED`
- `STRIPE_ACCOUNT_LINK_NOT_DELIVERED`
- `ROYALTY_IMPORT_COMPLETED`
- `ROYALTY_RECONCILIATION_COMPLETED`
- `ROYALTY_PERIOD_FROZEN`
- `ROYALTY_STATEMENT_APPROVED`
- `ROYALTY_STATEMENT_LOCKED`
- `ROYALTY_STATEMENT_PUBLISHED`
- `ROYALTY_THRESHOLD_CARRYFORWARD`
- `ROYALTY_NEGATIVE_BALANCE_OFFSET`
- `ROYALTY_PAYOUT_APPROVED`
- `ROYALTY_PAYOUT_REJECTED`
- `ROYALTY_PAYOUT_SUBMITTED`
- `ROYALTY_PAYOUT_COMPLETED`
- `ROYALTY_PAYOUT_FAILED`
- `ROYALTY_PAYOUT_RECONCILED`
- `ROYALTY_CORRECTION_POSTED`
- `ROYALTY_CORRECTED_STATEMENT_ISSUED`
- `PAYOUT_DESTINATION_CHANGE_STARTED`
- `PAYOUT_DESTINATION_CHANGE_COMPLETED`
- `AUTHOR_FINANCIAL_ACCESS_RETAINED_AFTER_OFFBOARDING`

No event may contain an Account Link URL, access code, token, secret, bank detail, or full tax-identification value.

## Publishing Email Canon

Canonical publishing enrollment messages must use:

```text
From: publishing@email.jmerrill.one
Reply-To: publishing@jmerrill.one
Governed archival copy: publishing@jmerrill.one
```

The Reply-To header and archival copy are mandatory. They must be set by the outbound publishing mail component and must not rely on mailbox forwarding, Exchange aliases, user mailbox rules, author knowledge, or manual operator intervention.

Author-facing messages may include a transient Stripe Account Link only for the intended author delivery. Retrospective archive copies, Dataverse records, execution logs, evidence files, and internal documentation must redact the link as `[TRANSIENT ACCOUNT LINK REDACTED]`.

## Operator Runbook

1. Confirm the author is canonical in Dataverse and linked to the governed publishing relationship.
2. Confirm the author-facing enrollment copy has Jackie approval.
3. Confirm `JM1_STRIPE_CONNECT_ENABLED` is approved for the pilot scope.
4. Confirm `JM1_STRIPE_COMMISSIONING_PAYMENT_ENABLED=false`.
5. Reuse existing connected account ID when present.
6. Create a Standard account only when no governed account ID exists.
7. Generate a Stripe-hosted Account Link only for authenticated Author Operating Center use.
8. Do not copy Account Link URLs into Dataverse, evidence, logs, email, chat, or documents.
9. Send outbound enrollment support messages only through the governed publishing email component with canonical From, Reply-To, archival copy, and correlation ID.
10. Retrieve and record non-sensitive enrollment/readiness status.
11. Escalate requirements that need author action through approved support messaging.
12. Do not initiate payments from enrollment status.
13. Route payout execution to the future governed Business Central payment-instruction design.

## Pilot Readiness

| Author | Current status | Required next step |
| --- | --- | --- |
| Rosetta Perry | INVITED / EXISTING PILOT ACCOUNT REUSED / ACTION REQUIRED | Monitor non-sensitive Stripe status; regenerate link only through governed support workflow if needed |
| Cynthia Sloan | INVITED / STANDARD ACCOUNT CREATED / ACTION REQUIRED | Monitor non-sensitive Stripe status; regenerate link only through governed support workflow if needed |
| Carolyn Booker-Pierce | INVITED / STANDARD ACCOUNT CREATED / ACTION REQUIRED / SIX TITLES CANONICAL | Monitor non-sensitive Stripe status; regenerate link only through governed support workflow if needed |

## Carolyn Booker-Pierce Title Reconciliation

Six canonical pilot titles now control Carolyn's Author Payout Enrollment relationship:

1. Abortion!
2. Because the Lord Is My Shepherd
3. Girl, You're Not Crazy. You're Dealing with a Narcissist
4. Loving the Addict
5. More Than a Village
6. You're Still Not Crazy

Discrepancy cause:

Jackie's supplied ISBN-title-author register superseded stale historical inference and confirmed Because the Lord Is My Shepherd as Carolyn Booker-Pierce. Earlier references linking Carolyn to A Little Bit of Everything, A Truebies Guide Part 1, or A Truebies Guide Part 2 are superseded by the register.

Corrected canonical relationship count:

- Current pilot count: 6
- Carolyn Stripe proof blocker: closed

## Gates

Still required:

- Jackie approval before Rosetta author-facing link delivery;
- authorized read-only Stripe status readback for Rosetta's existing account;
- Cynthia internal proof after source review;
- Carolyn title reconciliation before account creation;
- accounting/legal review before payout execution design;
- production payment authorization before any money movement;
- Business Central production implementation/migration authorization;
- Dataverse deployment authorization for any schema/model changes;
- hosting confirmation before broader author rollout.
