# IS-004 Agreement Domain Reconciliation

Status: Reconciliation complete; implementation not started
Date: 2026-07-05
Authority: Jackie Smith Jr., PROGRAM-002 commissioning blocker resolution

## Purpose

This report reconciles the PROGRAM-002 agreement domain before IS-004 SignNow implementation. The prior blocker named `jm1pub_authoragreement` as missing in live Dataverse. Jackie clarified that J Merrill Publishing moved to a merged contract/agreement model and that `jm1pub_contract` may be the intended canonical agreement entity.

No schema was created. No SignNow agreement was sent. No workspace unlock, SharePoint move, Stripe action, Business Central action, royalty action, production action, or distribution action occurred.

## Live Dataverse Finding

`jm1pub_contract` exists in live Dataverse.

| Item | Finding |
| --- | --- |
| Logical name | `jm1pub_contract` |
| Entity set | `jm1pub_contracts` |
| Existing records | At least one OP-002 validation record exists |
| Author/contact support | `jm1_primarypartycontact`; legacy/custom `new_author` also exists |
| Title/project support | `jm1pub_title` lookup exists; `jm1pub_title` also links back to `jm1pub_contract` |
| Document support | `jm1pub_docurl` exists |
| Signed date support | `jm1pub_signeddate` exists |
| Status support | `jm1pub_status` exists |
| E-sign provider support | `jm1pub_esignprovider` exists |

Relevant current `jm1pub_contract` choice values:

| Field | Values |
| --- | --- |
| `jm1pub_contracttype` | `AuthorAgreement`, `ServiceAgreement`, `EstatePlanningEngagement`, `GrantAgreement`, `VendorContract`, `Other` |
| `jm1pub_status` | `Draft`, `PendingSignature`, `Active`, `Expired`, `Terminated` |
| `jm1pub_esignprovider` | `Adobe Sign`, `DocuSign`, `HelloSign`, `None` |

## Agreement Domain Decision

Use `jm1pub_contract` as the canonical agreement entity for PROGRAM-002.

`jm1pub_authoragreement` should be treated as an obsolete/planned architecture name for the current live environment unless Jackie later reopens the domain model. Do not create `jm1pub_authoragreement` for IS-004.

This preserves the merged agreement model:

1. Master Publishing Agreement
2. Package Schedule / Package Addendum
3. Invoice / Payment record

Supplemental items remain addenda, not separate contracts:

- Distribution Authorization
- Editorial Scope Addendum
- Copyright Registration Authorization
- Marketing & Publicity Consent

## Schema Gaps For IS-004

`jm1pub_contract` is suitable as the base entity, but it is not yet sufficient for SignNow production workflow.

Required minimal extensions:

| Gap | Recommendation |
| --- | --- |
| SignNow provider choice missing | Add `SignNow` to `jm1pub_esignprovider` |
| Provider agreement/envelope ID missing | Add non-secret text field for SignNow agreement/envelope ID |
| Provider invite ID missing | Add non-secret text field for SignNow invite ID if SignNow returns one |
| Agreement sent timestamp missing | Add sent timestamp field |
| Agreement signed timestamp partly covered | Use `jm1pub_signeddate` or add more specific signed timestamp only if needed |
| Agreement version missing | Add agreement version field |
| Opportunity linkage missing | Add lookup to `opportunity` or approved reference field |
| Selected package missing | Add selected package code/label fields or bind through Opportunity with clear source rule |
| Standard package price missing | Add standard package price field or bind through governed package catalog snapshot |
| Commissioning transaction price missing | Add commissioning/payment override amount field only for approved commissioning cases |
| Payment option path missing | Add a governed payment path/option field, including a commissioning-safe value |
| Exception states incomplete | Extend status model or add companion reason fields for send failed, declined, voided, manual review required |
| Webhook idempotency missing | Add safe provider event/idempotency tracking through `jm1_executionlog` or an approved event ledger |

## The Intentional Leader Readiness

Current commissioning title:

| Item | Value |
| --- | --- |
| Reference | `JMP-INT-202607-0W5PTQ` |
| Title | The Intentional Leader |
| Selected package | `JMP-PKG-PREMIER` |
| Standard package price | `$7,500` |
| Commissioning transaction | `$1.00` approved override |
| Opportunity agreement status | `SIGNNOW_PENDING` |
| Workspace state | Pre-contract setup in progress |

The Opportunity payment fields are currently blank for the selected payment option/installment/amount/total. IS-004 should not invent normal financing terms for this commissioning title. The safe rule is:

- Agreement displays the Premier standard package price of `$7,500`.
- Commissioning payment is recorded separately as an approved `$1.00` commissioning transaction.
- Payment path/status should be represented as a commissioning override/payment-confirmed path, not as ordinary author financing.

## Contact Author Flag

Live Contact `jm1pub_isauthor` currently reads false for the commissioning contact.

Recommended rule:

- Prospect before agreement execution.
- Author after agreement execution.

Do not flip `jm1pub_isauthor` before the agreement is signed unless Jackie explicitly approves a different business rule.

## Implementation Path For IS-004

1. Extend `jm1pub_contract`; do not create `jm1pub_authoragreement`.
2. Add SignNow provider choice and minimal provider tracking fields.
3. Add or confirm Opportunity/package/payment snapshot fields needed for agreement merge.
4. Add SignNow send route only after rotated credentials and Key Vault/app settings are present.
5. Add SignNow webhook receiver with signature verification and idempotency before automated state mutation.
6. Create/update one `jm1pub_contract` row for The Intentional Leader only after schema and credential prerequisites are complete.
7. Write `AGREEMENT_SENT`, `AGREEMENT_SIGNED`, and `WORKSPACE_FULL_UNLOCKED` to `jm1_executionlog` at the appropriate gates.
8. Unlock the Author Workspace only after Dataverse shows agreement signed/active and payment confirmed/approved override.

## Blockers

| Blocker | Owner / Decision |
| --- | --- |
| Add `SignNow` choice to `jm1pub_esignprovider` | IS-004 build |
| Confirm/add SignNow provider ID/invite/timestamp/version fields | IS-004 build |
| Confirm/add Opportunity linkage on `jm1pub_contract` | IS-004 build |
| Confirm commissioning payment-path field/value | Jackie approval if not already considered covered by the commissioning override |
| Rotate/store SignNow credentials in Key Vault-backed settings | Jackie/Cody secure setup |
| Confirm SignNow webhook signature mechanism | IS-004 build |

## Non-Activity Confirmation

This reconciliation did not create schema, send a SignNow agreement, generate an envelope, unlock the workspace, move SharePoint folders, touch Stripe again, touch Business Central, touch royalties, or start production/distribution.
