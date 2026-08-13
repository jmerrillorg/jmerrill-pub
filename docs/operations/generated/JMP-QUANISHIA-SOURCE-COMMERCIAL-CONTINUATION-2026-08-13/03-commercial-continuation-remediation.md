# Commercial Continuation Remediation

Last verified: 2026-08-13T02:00:02Z

## Live Asset

- Intake reference: `JMP-INT-202608-3W6Q6L`
- Title: `'Til Death Do Us Part`
- Existing Opportunity: `11cdec24-b596-f111-8076-7c1e525b15c2`
- Prior continuation execution log: `c49a3e3e-b596-f111-8075-000d3a117063`

## Existing State

The existing Opportunity is coherent and linked. It must not be deleted, rebuilt, or duplicated.

The open defect was narrower: the Function/service-identity create-from-zero path was not proven because the first governed route attempt failed with Dataverse `0x80040265` before the direct probe created the intended Opportunity.

## Remediation

The reusable continuation path now:

- Returns the failing Dataverse step, for example `opportunity:create`.
- Returns a sanitized Dataverse error message without tokens, headers, or raw platform payloads.
- Accepts `OData-EntityId` as the created Opportunity identifier when Dataverse honors `Prefer: return=representation` differently and omits `opportunityid` from the response body.
- Preserves idempotent reuse of an existing single Opportunity candidate.

## Live Boundary

The continuation route still does not:

- send author email;
- create a payment link;
- create a checkout session;
- create an invoice;
- send an agreement;
- post to Business Central;
- activate Flow D;
- start production;
- assign ISBNs.

## Post-Deployment Proof

PR #485 merged at:

- Merge SHA: `aa62b91489677f4479403cc730917ae1a39f75ad`

Function route replay:

- Route: `run-package-selection-commercial-continuation`
- Correlation ID: `TIL-DEATH-COMMERCIAL-CONTINUATION-REPLAY-20260813`
- HTTP status: `200`
- Result: `PACKAGE_SELECTION_COMMERCIAL_CONTINUATION_COMPLETED`
- Opportunity ID: `11cdec24-b596-f111-8076-7c1e525b15c2`
- Selected package: `JMP-PKG-STARTER`
- Created Opportunity: `false`
- Execution log ID: `bce4d629-bc96-f111-8076-6045bdd69435`

Dataverse readback:

- Opportunity count for `JMP-INT-202608-3W6Q6L`: `1`
- `jm1_m6packageselectionstatus`: `PACKAGE_SELECTED`
- `jm1_m6authorselectedpackagecode`: `JMP-PKG-STARTER`
- `jm1_m6agreementpreparationstatus`: `AGREEMENT_PREPARATION_READY`
- `jm1_m6onboardingstatus`: `ONBOARDING_READY`
- `jm1_m6businesshandoffstatus`: `BUSINESS_HANDOFF_READY`

Live action readback:

- Duplicate Opportunities: `0`
- Author email sends: `0`
- Payment links: `0`
- Checkout sessions: `0`
- Invoices: `0`
- Agreement sends: `0`
- Business Central postings: `0`
- Production starts: `0`
- ISBN assignments: `0`

Create-from-zero note:

Existing live diagnostics without Opportunities were found, but they are real intake records, not a bounded certification fixture. No unrelated live Opportunity was created only to prove the create path. The reusable code defect is remediated by returning failing Dataverse step/message and by accepting `OData-EntityId`; create-from-zero production proof still requires either a governed certification fixture or explicit authority to mutate a named live record.
