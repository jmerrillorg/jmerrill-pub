# INT-PUB-005 — Payment-Option Capture Schema (Milestone 6)

**Date:** 2026-06-21
**Status:** Schema added and verified live; writer built and tested; not yet run for the controlled record

## Background

Prior to this work, no Dataverse field existed for storing a selected payment option, installment count, per-payment amount, or selection source as structured data — only the package-selection *status* fields existed (`jm1_m6packageselectionstatus`, `jm1_m6paymentoptionpreparationstatus`, etc.). This was confirmed by direct `EntityDefinitions` inspection and reported as an explicit schema gap before any capture writer was built.

## Fields Added

Added directly to the `opportunity` entity via the Dataverse Web API `CreateAttribute` pattern (`POST EntityDefinitions(LogicalName='opportunity')/Attributes`), then published via `PublishXml`. All nine fields verified live and queryable against the real controlled Opportunity (read-only verification — no value was written during schema creation).

| Logical Name | Type | Constraints |
|---|---|---|
| `jm1_m6paymentoptionselectionstatus` | String | MaxLength 100 |
| `jm1_m6selectedpaymentoption` | String | MaxLength 100 |
| `jm1_m6selectedinstallmentcount` | Integer | 1–12 |
| `jm1_m6selectedpaymentamount` | Decimal | 0–100000, precision 2 |
| `jm1_m6selectedpaymenttotal` | Decimal | 0–100000, precision 2 |
| `jm1_m6paymentselectionsource` | String | MaxLength 100 |
| `jm1_m6paymentselectionreceivedon` | DateTime | DateAndTime, UserLocal |
| `jm1_m6paymentselectionthreadsubject` | String | MaxLength 200 |
| `jm1_m6paymentselectionevidencelog` | String | MaxLength 100 (stores the `jm1_executionlogs` GUID as text reference, not a Lookup relationship) |

No financial-transaction entity (`jm1fin_invoice`, `jm1fin_payment`, `jm1fin_transaction`, etc.) was touched or used — all fields live on the existing, already-governed Opportunity entity, consistent with every other Milestone 6 field.

## Writer

**`src/author/milestone6PaymentOptionCaptureWriter.js`** — dedicated, allowlisted, gated. Mirrors the established Milestone 6 writer pattern (`milestone6OpportunityWriter.js`):

- PATCHes only `opportunities`, only the nine fields above
- Per-field type validation (string/integer/number/ISO-date), not just presence — rejects an installment count outside 1–12, a negative amount, a non-numeric amount, an invalid date
- No create/POST capability for Opportunities exists in this module — duplicate-Opportunity creation is structurally impossible, not merely gated
- Requires a **dedicated** gate, `JM1_PAYMENT_OPTION_CAPTURE_ENABLED`, separate from `JM1_OPPORTUNITY_UPDATE_ENABLED` (the original package-selection gate) — new code writing to a distinct field set gets its own gate, per instruction
- Writes one safe `jm1_executionlogs` evidence record after success — no raw email body, raw Graph response, headers, tokens, or secrets ever appear in the evidence payload

**`src/functions/runMilestone6PaymentOptionCapture.js`** — thin HTTP wrapper, same security pattern as other Milestone 6 endpoints (runner key, exact-record match, explicit confirm flag). Takes a `classification` value from the mailbox reply check, looks up the governed payment-option detail via `getPaymentOptionDetails`, and builds the Opportunity payload server-side — the caller cannot supply arbitrary amounts.

## Gate

`JM1_PAYMENT_OPTION_CAPTURE_ENABLED` — default false/absent.

## Expected Values for the Current Controlled Record (Once the Live Mailbox Read Confirms the Classification)

| Field | Expected Value |
|---|---|
| `jm1_m6paymentoptionselectionstatus` | `PAYMENT_OPTION_SELECTED` |
| `jm1_m6selectedpaymentoption` | `EIGHT_PAYMENTS` |
| `jm1_m6selectedinstallmentcount` | `8` |
| `jm1_m6selectedpaymentamount` | `585.00` |
| `jm1_m6selectedpaymenttotal` | `4680.00` (8 × $585.00 — the 4% fee applies to multi-payment options) |
| `jm1_m6paymentselectionsource` | `PUBLISHING_MAILBOX_REPLY` |
| `jm1_m6paymentselectionthreadsubject` | `Next steps for Establishing Glory: The Library — Professional Publishing Package` |

These are *expected*, not yet system-confirmed — the live mailbox read has not been run as of this document. The screenshot evidence ("8 payments") is not treated as the system-confirmed result until the governed reader/classifier actually runs.

## Not Yet Done

- Live mailbox read (Track 1) — blocked only on confirming `JM1_PUBLISHING_MAIL_READ_ENABLED` gate open/close sequencing, now that Graph `Mail.Read` + Exchange Application Access Policy are confirmed in place
- Live payment-option capture write for the controlled record — depends on the above
