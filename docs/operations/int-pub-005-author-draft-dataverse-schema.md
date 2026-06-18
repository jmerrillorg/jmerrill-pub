# INT-PUB-005 Author Draft Dataverse Schema

## Purpose

This document defines the Dataverse schema required before internal author-response draft persistence can be enabled for INT-PUB-005.

PR #92 established the author draft field map. PR #93 documents the live Dataverse columns created and published on `jm1pub_editorialdiagnostic` on 2026-06-18 and added to the `JM1_Publishing` solution. This document does not authorize sending author email, creating a send event, creating an Opportunity, activating Flow D, running diagnostics, opening `JM1_AI_EXECUTION_ENABLED`, or enabling production automation.

## Target

| Target | Value |
|---|---|
| Table logical name | `jm1pub_editorialdiagnostic` |
| Entity set | `jm1pub_editorialdiagnostics` |
| Row identity | `jm1pub_editorialdiagnosticid` |

Author-response drafts remain attached to the existing Stage 0 Editorial Diagnostic record identified by `diagnosticId`. No new table is introduced.

## Confirmed Schema Fields

These fields are confirmed created and published on the target table.

| Display name | Logical name | Expected type | Required value or rule |
|---|---|---|---|
| Author Draft Subject | `jm1_authordraftsubject` | Text | Safe draft subject only |
| Author Draft Body | `jm1_authordraftbody` | Multiline Text | Safe draft body only; not sent by this step |
| Author Draft Template | `jm1_authordrafttemplate` | Text or Choice | `INITIAL_DIAGNOSTIC_REVIEW_NEXT_STEP` |
| Author Draft Send Status | `jm1_authordraftsendstatus` | Choice or Text | `DRAFT_ONLY` |
| Author Draft Approval Status | `jm1_authordraftapprovalstatus` | Choice or Text | `PENDING_HUMAN_APPROVAL` |
| Author Visibility Mailbox | `jm1_authorvisibilitymailbox` | Text | `publishing@jmerrill.one` |
| Author Future Send Requires Internal Copy | `jm1_authorfuturesendrequiresinternalcopy` | Yes/No | `true` |
| Author Future Send Requires Dataverse Log | `jm1_authorfuturesendrequiresdataverselog` | Yes/No | `true` |
| Author Draft Prepared On | `jm1_authordraftpreparedon` | Date/Time | Internal draft preparation timestamp |
| Author Draft Prepared By | `jm1_authordraftpreparedby` | Text or Lookup/User reference | Internal preparer identifier |
| Author Draft Approved By | `jm1_authordraftapprovedby` | Text or Lookup/User reference | Empty until human approval occurs |
| Author Draft Approved On | `jm1_authordraftapprovedon` | Date/Time | Empty until human approval occurs |
| Author Draft Approval Notes | `jm1_authordraftapprovalnotes` | Multiline Text | Human approval, revision, rejection, or hold notes only |

Safe author email, author name, and project title should continue to use already-governed intake or diagnostic metadata fields where present. This schema does not create or imply an email send event.

## Required Safe Values

- `templateName=INITIAL_DIAGNOSTIC_REVIEW_NEXT_STEP`
- `sendStatus=DRAFT_ONLY`
- `approvalStatus=PENDING_HUMAN_APPROVAL`
- `internalVisibilityMailbox=publishing@jmerrill.one`
- `futureSendRequiresInternalCopy=true`
- `futureSendRequiresDataverseLog=true`

## Required Exclusions

Do not create, map, or document storage for:

- manuscript text
- extracted manuscript content
- prompt body
- raw model response
- send-now flag
- sent timestamp as evidence of a send
- email delivery status claiming sent
- mail provider message ID
- Opportunity creation fields
- Flow D trigger fields
- secrets
- tokens, keys, or headers
- arbitrary external file URLs beyond governed asset references

## Confirmation Record

- Confirmed table: `jm1pub_editorialdiagnostic`
- Confirmed entity set: `jm1pub_editorialdiagnostics`
- Confirmed row identity: `jm1pub_editorialdiagnosticid`
- Confirmed solution: `JM1_Publishing`
- Confirmation date: 2026-06-18
- Publish status: table customizations published after creation

The template, send status, approval status, and preparer fields were created as text fields for this phase. The future internal-copy and Dataverse send-log requirements were created as Yes/No fields. Draft body and approval notes were created as multiline text fields. Prepared/approved timestamps were created as Date/Time fields.

## Non-Activation Boundary

Live author-draft writes are enabled only for explicit internal `DRAFT_ONLY` persistence calls against the existing diagnostic row. This does not send author email, create a send event, create an Opportunity, activate Flow D, run diagnostics, open `JM1_AI_EXECUTION_ENABLED`, or authorize production automation.

Future author-facing system email must copy or internally mirror to `publishing@jmerrill.one`, and the send event must be logged in Dataverse.
