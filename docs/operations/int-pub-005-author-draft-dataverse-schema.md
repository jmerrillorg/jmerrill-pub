# INT-PUB-005 Author Draft Dataverse Schema

## Purpose

This document defines the Dataverse schema required before internal author-response draft persistence can be enabled for INT-PUB-005.

PR #92 established the author draft field map. PR #93 documents the required live Dataverse columns and keeps them marked as required before live writes. This document does not authorize sending author email, creating a send event, creating an Opportunity, activating Flow D, running diagnostics, opening `JM1_AI_EXECUTION_ENABLED`, or enabling production automation.

## Target

| Target | Value |
|---|---|
| Table logical name | `jm1pub_editorialdiagnostic` |
| Entity set | `jm1pub_editorialdiagnostics` |
| Row identity | `jm1pub_editorialdiagnosticid` |

Author-response drafts remain attached to the existing Stage 0 Editorial Diagnostic record identified by `diagnosticId`. No new table is introduced.

## Required Schema Fields

These fields must exist before live author-draft writes are enabled.

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

## Manual Confirmation Or Creation Checklist

Before live author-draft writes are enabled:

1. Confirm the `jm1pub_editorialdiagnostic` table exists in the governed JM1 Publishing Dataverse solution.
2. Confirm the entity set remains `jm1pub_editorialdiagnostics`.
3. Confirm row identity remains `jm1pub_editorialdiagnosticid`.
4. Confirm each required logical name in this document exists on the table.
5. If any column is missing, create it using the display name, logical name, and expected type above.
6. If choice fields are used for template, send status, or approval status, confirm they support only the governed safe values needed for this phase.
7. Confirm `jm1_authorvisibilitymailbox` stores `publishing@jmerrill.one`.
8. Confirm the two future-send requirement columns are Yes/No fields and can store `true`.
9. Publish the table customizations.
10. Record the schema confirmation evidence in a later governed PR before live production writes are enabled.

## Non-Activation Boundary

Live writes are not enabled until these fields are confirmed. This schema confirmation does not send author email, create a send event, create an Opportunity, activate Flow D, run diagnostics, open `JM1_AI_EXECUTION_ENABLED`, or authorize production automation.

Future author-facing system email must copy or internally mirror to `publishing@jmerrill.one`, and the send event must be logged in Dataverse.
