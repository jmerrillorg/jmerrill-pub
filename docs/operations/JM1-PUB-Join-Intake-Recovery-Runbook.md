# /join Intake Recovery Runbook

Status: Active source runbook

## Inspect

1. Open the failed queue item in the approved Azure queue view.
2. Confirm `schema` is `JM1_PUBLISHING_INTAKE_DEAD_LETTER_V1`.
3. Confirm the item contains an `intakeReference`, `failedOperationType`, `failureClassification`, and `correlationId`.
4. Search Dataverse Publishing Intake by `intakeReference`.
5. Confirm SharePoint artifact/workspace state when the queue item includes a SharePoint or workspace identifier.

Do not use queue items that contain secrets, raw author details, manuscript content, or public URLs. Escalate those as a data-handling exception.

## Classify

Retry automatically when the failure is transient or the downstream dependency is known to have recovered.

Suppress when the intake was already completed and the failed operation has verified successful evidence.

Move to operator exception when:

- retry count reaches `5`;
- the message schema is invalid;
- the canonical intake cannot be found;
- the requested replay would duplicate intake, Contact, manuscript, or author communication.

## Replay

Replay only the failed operation named by `failedOperationType`.

Approved replay examples:

- `PUBLISHING_NOTIFICATION`: send one internal publishing notification for the existing intake.
- `AUTHOR_ACKNOWLEDGMENT`: send one author acknowledgment only when the intake record proves no prior acknowledgment.
- `ACKNOWLEDGMENT_WRITEBACK`: update acknowledgment status only for the existing record.
- `MANUSCRIPT_WRITEBACK`: update manuscript receipt fields for the existing record.
- `EXECUTION_LOG_WRITE`: record the missing execution event.

Do not rerun the public `/join` submission.

## Verify

After replay:

1. confirm the Dataverse row still has one intake reference;
2. confirm no duplicate manuscript copy was created;
3. confirm no duplicate author-facing acknowledgment was sent;
4. confirm the failed operation has evidence of success or documented suppression;
5. complete the queue item or return it to exception state.

## Escalate

Escalate to Jackie when replay requires author communication, schema redesign, Contact changes, Business Central action, payment action, or a production dependency outage.

