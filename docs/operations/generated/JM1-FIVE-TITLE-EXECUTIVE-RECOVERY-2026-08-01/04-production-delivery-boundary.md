# Production Delivery Boundary

Generated: 2026-08-01

## Metadata-Only Credential Check

The shell environment was checked for the credential classes required to execute live Dataverse mutation and ACS relay delivery.

Output was limited to SET/MISSING metadata. No secret values were printed or retained.

| Credential class | Status |
| --- | --- |
| DATAVERSE_TENANT_ID | MISSING |
| DATAVERSE_CLIENT_ID | MISSING |
| DATAVERSE_CLIENT_SECRET | MISSING |
| DATAVERSE_URL | MISSING |
| JM1_AUTHOR_RESPONSE_SEND_RELAY_KEY | MISSING |
| JM1_RELAY_API_KEY | MISSING |
| AZURE_COMMUNICATION_CONNECTION_STRING | MISSING |

## Connector Review

Outlook and Gmail connectors were not used for package release because they do not satisfy the governed package delivery requirements for this workflow:

- canonical Publishing sender;
- mandatory Reply-To;
- archive copy;
- branded HTML and plain text;
- package attachment policy;
- Dataverse send evidence;
- cadence/gate update linkage.

## Effect

Live package sending, approval-gate creation, Dataverse mutation, SharePoint synchronization, and portal projection remain blocked from Cody's local shell by protected production access.

This is not a title-content blocker for The Long Watch, The General's Will and Last Testament, or Establishing Glory: The Library. Their invalid recipient/contract/legal blockers were cleared by Jackie.

## Production Readiness Readback

PR #378 was merged and promoted to production through the Publishing App Service CI/CD workflow.

Workflow run: 30724080697

Release SHA: 43522c4d527c731fe7bd2fbfcfba304ad57aae01

Production `/api/health` readback:

| Dependency class | Status |
| --- | --- |
| configuration | ready |
| dataverse | ready |
| graph | ready |
| acs | ready |
| artifact | ready |
| authorPortal | ready |
| stripeEnrollment | ready |

The production application has the necessary dependency classes configured. Cody's local shell does not have a governed way to retrieve those values and must not attempt to expose them.

## Exposed Route Boundary

The inspected production routes do not expose an unauthenticated package-dispatch API. Relevant routes require:

- authenticated Publisher Operating Center session for `app/api/publisher/operating-center/actions/route.ts`;
- protected worker key for `app/api/publishing/orchestration/approval-events/route.ts`.

No unauthenticated POST was attempted for title delivery. The remaining execution path is an authenticated publisher or protected worker operation, not further title eligibility discovery.
