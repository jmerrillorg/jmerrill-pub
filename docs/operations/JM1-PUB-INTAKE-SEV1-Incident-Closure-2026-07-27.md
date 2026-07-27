# JM1-PUB-INTAKE-SEV1 Incident Closure

Status: CLOSED
Resolution: PRODUCTION RESTORED AND CERTIFIED
Closed on: 2026-07-27

## Incident

Public `/join` submission failed after client-side validation and Turnstile success. The public symptom was the generic submission failure message after a manuscript file was selected and required fields were completed.

## Settled Production State

- Restored production SHA: `5f4b9a974b3d2556b66eb3eba3478871207b56c2`
- Restored route: `/api/publishing/intake`
- Public `/join`: restored and production-certified
- Incident manuscript intake: `JMP-INT-202607-422JSZ`
- Author: Atta Boateng
- Manuscript: `4TBS.docx`

The incident intake must not be recreated or modified by this closure package.

## Certified Matrix

| Control | Result |
|---|---|
| Valid submission | 201 received |
| Invalid Turnstile | Controlled 400 |
| Unsupported file | Controlled field-level 400 |
| Duplicate same-idempotency submission | 409 duplicate |
| Dataverse intake creation | Exactly one row |
| Manuscript preservation | Preserved in governed SharePoint location |
| Publishing notification | Delivered during restoration proof |
| Author Portal protections | Fail closed |
| Logs | No secrets or manuscript content |

## Root Cause

The restored incident was caused by failure in the server-side intake completion path after the browser and Turnstile steps had succeeded. The production restoration repaired the Dataverse/SharePoint/notification response path and validated the complete live receipt behavior.

## Transferred Resilience Item

The remaining dead-letter item is reclassified from unresolved SEV-1 defect to post-restoration resilience enhancement:

`INT-PUB-005_DOWNSTREAM_RECOVERY_QUEUE`

A downstream workflow failure must never require an author to resubmit a manuscript that JM1 has already durably received.

## Evidence Location

Primary evidence remains in the governed incident and deployment records for PR #346 and production SHA `5f4b9a974b3d2556b66eb3eba3478871207b56c2`. This repository file records source-governed closure language only.

