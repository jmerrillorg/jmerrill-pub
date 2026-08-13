# 'Til Death Do Us Part Commercial Continuation

Last verified: 2026-08-13T01:00:00Z

## Remediation

The historical `run-milestone6-opportunity-update` endpoint remains a one-record controlled endpoint. A new reusable, gated continuation path was added for package-selection commercial continuation:

- Function route: `run-package-selection-commercial-continuation`
- Gate: `JM1_PACKAGE_SELECTION_COMMERCIAL_CONTINUATION_ENABLED`
- Event: `PACKAGE_SELECTION_COMMERCIAL_CONTINUATION_COMPLETED`

## Eligibility Model

The continuation evaluates:

- valid diagnostic ID;
- valid intake reference;
- linked intake;
- linked Contact;
- linked Lead;
- durable `PACKAGE_SELECTED` execution log;
- governed package code;
- Stripe mapping exists;
- no duplicate Opportunity candidate;
- idempotent existing Opportunity reuse.

## Boundaries

| Action | Result |
|---|---|
| Manual Opportunity creation | 0 |
| Title-specific allowlist | Removed from new continuation path |
| Duplicate Opportunity creation | Fails closed |
| Author email | 0 |
| Payment link / checkout / invoice | 0 |
| Agreement send | 0 |
| Business Central posting | 0 |
| Production / ISBN / distribution | 0 |

Deployment and live replay are required before this segment can be marked `LIVE-PROVEN`.
