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

Pending merge and production deployment of this head.
