# IS-004 Agreement Domain Reconciliation

Status: Agreement domain extended; SignNow send blocked by missing secure provider configuration
Date: 2026-07-05
Authority: Jackie Smith Jr., PROGRAM-002 commissioning blocker resolution

## Purpose

This report reconciles the PROGRAM-002 agreement domain before IS-004 SignNow implementation. The prior blocker named `jm1pub_authoragreement` as missing in live Dataverse. Jackie clarified that J Merrill Publishing moved to a merged contract/agreement model and that `jm1pub_contract` may be the intended canonical agreement entity.

This pass began as reconciliation, then continued into the approved IS-004 agreement-domain implementation for the commissioning title. The canonical table remains `jm1pub_contract`; `jm1pub_authoragreement` was not created.

No SignNow agreement was sent. No SignNow envelope was generated. No workspace unlock, SharePoint workspace move, Business Central action, royalty action, production action, or distribution action occurred.

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
| `jm1pub_esignprovider` | `Adobe Sign`, `DocuSign`, `HelloSign`, `None`, `SignNow` |

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

Required minimal extensions and implementation status:

| Gap | Recommendation |
| --- | --- |
| SignNow provider choice missing | Completed: added `SignNow` to global `jm1_esignprovider` / `jm1pub_contract.jm1pub_esignprovider` |
| Provider agreement/envelope ID missing | Completed: added `jm1pub_provideragreementid` |
| Provider invite ID missing | Completed: added `jm1pub_providerinviteid` |
| Agreement sent timestamp missing | Completed: added `jm1pub_agreementsenton` |
| Agreement signed timestamp partly covered | Confirmed: use existing `jm1pub_signeddate` |
| Agreement version missing | Completed: added `jm1pub_templateversionreference` |
| Opportunity linkage missing | Completed: added `jm1pub_opportunity` lookup to `opportunity` |
| Selected package missing | Completed: added `jm1pub_selectedpackagecode`; Opportunity remains source for author-selected package |
| Standard package price missing | Completed: added `jm1pub_standardpackageprice` |
| Commissioning transaction price missing | Completed: added `jm1pub_commissioningtransactionamount` |
| Payment option path missing | Completed: added `jm1pub_paymentpath`; commissioning value used for this title |
| Exception states incomplete | Extend status model or add companion reason fields for send failed, declined, voided, manual review required |
| Webhook idempotency missing | Add safe provider event/idempotency tracking through `jm1_executionlog` or an approved event ledger |

## IS-004 Live Implementation Evidence

Live Dataverse updates completed on July 5, 2026:

| Area | Evidence |
| --- | --- |
| Canonical table | `jm1pub_contract` |
| Sign provider choice | `SignNow` added as value `835500004` |
| Provider tracking fields | `jm1pub_provideragreementid`, `jm1pub_providerinviteid`, `jm1pub_providerstatus` |
| Timestamp/version fields | `jm1pub_agreementsenton`, existing `jm1pub_signeddate`, `jm1pub_templateversionreference` |
| Package/payment snapshot fields | `jm1pub_selectedpackagecode`, `jm1pub_standardpackageprice`, `jm1pub_commissioningtransactionamount`, `jm1pub_paymentpath` |
| Opportunity linkage | `jm1pub_opportunity` lookup created |
| The Intentional Leader contract row | `fac2dd10-6a78-f111-ab0f-7c1e525b15c2` |
| Contract provider status | `READY_TO_SEND_BLOCKED_MISSING_SIGNNOW_CONFIG` |
| Generated agreement evidence | Stored in the canonical SharePoint inquiry workspace under `00_Admin/Agreement-Preparation` |
| Agreement generation log | `jm1_executionlog` row `7729a2f8-6978-f111-ab0f-000d3a14673b` with `AGREEMENT_GENERATED` |

Generated document evidence:

| Document | SHA-256 |
| --- | --- |
| `JMP-Publishing-Agreement-The-Intentional-Leader-JMP-INT-202607-0W5PTQ.docx` | `1002e42333ef17d429988cb5f725f7d76c26ecf208da5007daf44b7ecd6288c0` |
| `JMP-Premier-Package-Commissioning-Addendum-The-Intentional-Leader-JMP-INT-202607-0W5PTQ.docx` | `aa40010c8ef38ef60d337ffb9c0ab84e9c40347c958a21871645e5884a2bc6bb` |

The generated agreement documents were prepared from live Dataverse/contact values:

- Author: Jackie Smith Jr
- Title: The Intentional Leader
- Package: Premier Publishing Package
- Standard package price: `$7,500`
- Commissioning transaction amount: `$1.00`

The generated agreement was not sent because no SignNow production settings are currently present in Azure app configuration and the reachable Key Vault does not contain SignNow secrets by name.

## The Intentional Leader Readiness

Current commissioning title:

| Item | Value |
| --- | --- |
| Reference | `JMP-INT-202607-0W5PTQ` |
| Title | The Intentional Leader |
| Selected package | `JMP-PKG-PREMIER` |
| Standard package price | `$7,500` |
| Commissioning transaction | `$1.00` approved override |
| Opportunity agreement status | `SIGNNOW_READY_BLOCKED_CONFIG` |
| Workspace state | Pre-contract setup in progress |

The Opportunity payment fields are currently blank for the selected payment option/installment/amount/total. IS-004 should not invent normal financing terms for this commissioning title. The safe rule is:

- Agreement displays the Premier standard package price of `$7,500`.
- Commissioning payment is recorded separately as an approved `$1.00` commissioning transaction.
- Payment path/status should be represented as a commissioning override/payment-confirmed path, not as ordinary author financing.

The Opportunity commissioning payment fields were updated for this title:

| Field | Value |
| --- | --- |
| `jm1_m6selectedpaymentoption` | `COMMISSIONING_OVERRIDE` |
| `jm1_m6selectedinstallmentcount` | `1` |
| `jm1_m6selectedpaymentamount` | `1.00` |
| `jm1_m6selectedpaymenttotal` | `1.00` |
| `jm1_m6paymentoptionpreparationstatus` | `COMMISSIONING_PAYMENT_CONFIRMED` |

## Contact Author Flag

Live Contact `jm1pub_isauthor` currently reads false for the commissioning contact.

Recommended rule:

- Prospect before agreement execution.
- Author after agreement execution.

Do not flip `jm1pub_isauthor` before the agreement is signed unless Jackie explicitly approves a different business rule.

## Implementation Path For IS-004

1. Extend `jm1pub_contract`; do not create `jm1pub_authoragreement`. Completed.
2. Add SignNow provider choice and minimal provider tracking fields. Completed.
3. Add or confirm Opportunity/package/payment snapshot fields needed for agreement merge. Completed for commissioning title.
4. Configure SignNow production credentials/settings securely. Blocked.
5. Add SignNow send route only after rotated credentials and Key Vault/app settings are present. Pending credentials.
6. Add SignNow webhook receiver with signature verification and idempotency before automated state mutation. Pending credentials/webhook secret.
7. Send the generated agreement package through SignNow and write `AGREEMENT_SENT`. Blocked; do not fake this event.
8. Write `AGREEMENT_SIGNED` and `WORKSPACE_FULL_UNLOCKED` only after SignNow signed confirmation and payment confirmation are both present.
9. Unlock the Author Workspace only after Dataverse shows agreement signed/active and payment confirmed/approved override.

## Blockers

| Blocker | Owner / Decision |
| --- | --- |
| Configure SignNow production credentials/settings | Missing from Azure app settings; `kv-jm1-core` is inaccessible from this workstation due private-link policy; `jm1-core-vault` has no SignNow secrets by name |
| Operate authenticated SignNow browser session | Current Computer Use tool exposure is read-only in this session; no click/copy action is available |
| Confirm SignNow webhook signature mechanism and secret | Pending SignNow credential/config access |
| Send SignNow envelope | Blocked until secure SignNow configuration is available |
| Capture `AGREEMENT_SENT` / envelope ID | Blocked until SignNow send succeeds |
| Capture `AGREEMENT_SIGNED` / unlock workspace | Blocked until signed confirmation exists |

## Non-Activity Confirmation

This pass did not create `jm1pub_authoragreement`, send a SignNow agreement, generate a SignNow envelope, unlock the workspace, move SharePoint folders, touch Business Central, touch royalties, or start production/distribution.

It did extend `jm1pub_contract`, update The Intentional Leader's commissioning payment-option evidence, generate agreement documents, create the canonical `jm1pub_contract` row, and write safe `AGREEMENT_GENERATED` evidence.
