# INT-PUB-005 Milestone 5 Author Response Communication Runbook

## Purpose

Milestone #5 means J Merrill Publishing can review and send an approved author response through a governed system path, with `publishing@jmerrill.one` visibility and Dataverse evidence, without triggering Opportunity, Flow D, onboarding, diagnostics, or production automation.

## Required Gates

- `JM1_AI_EXECUTION_ENABLED=false`
- `JM1_INTERNAL_NOTIFICATIONS_ENABLED=false` by default
- `JM1_AUTHOR_RESPONSE_SEND_ENABLED=false` by default

`JM1_AUTHOR_RESPONSE_SEND_ENABLED` may be set to `true` only during a separately authorized controlled author-send test or governed production send window. It must be returned to `false` immediately afterward.

## Internal Notification Process

1. Build an `AUTHOR_DRAFT_READY_FOR_REVIEW` internal notification.
2. Send only to `publishing@jmerrill.one`.
3. Do not include the author in To, CC, or BCC.
4. Include safe review fields only: author name, project title, intake reference, diagnostic ID, draft status, approval status, safe draft preview, and next action.
5. Include the statement: `No author email has been sent.`
6. Log the internal notification result to `jm1_executionlogs` when a safe Dataverse client is available.

## Author Send Approval Process

Supported decisions:

- `APPROVE_AUTHOR_SEND`
- `NEEDS_AUTHOR_RESPONSE_REVISION`
- `REJECT_AUTHOR_SEND`
- `HOLD_AUTHOR_SEND`

Only `APPROVE_AUTHOR_SEND` may proceed to the provider boundary. Approval requires reviewer ID and timestamp. Revision and rejection require reviewer notes. Approval alone does not send email.

The prepared record must include:

- approved send-preparation status
- author response subject and body
- approved intake author email
- `publishing@jmerrill.one` as internal visibility mailbox
- future internal copy/mirror requirement
- future Dataverse send-log requirement

## Author Send Process

The author-facing provider boundary is disabled by default. When enabled for a separately authorized send:

1. To must contain exactly the approved intake author email.
2. CC must include exactly `publishing@jmerrill.one`.
3. BCC is not allowed.
4. From must be an approved internal `@jmerrill.one` mailbox.
5. Reply-to must be an approved internal `@jmerrill.one` mailbox.
6. `@jmerrill.pub` must not be used as an active mailbox.
7. The provider must be explicit and governed.
8. Dataverse send logging must be prepared before the send is treated as complete.

## ACS Relay Routes

PR #102 adds concrete ACS Email relay routes for Milestone #5 controlled testing:

- `POST /api/send-internal-author-draft-review-notification`
- `POST /api/send-approved-author-response`

Both routes use `JM1_RELAY_API_KEY` with `x-jm1-relay-key` and send through ACS Email using `DoNotReply@email.jmerrill.one`.

The internal route sends only to `publishing@jmerrill.one`, with no author To/CC/BCC. The approved author-response route sends only to the approved author email and copies or internally mirrors `publishing@jmerrill.one`.

No live send is authorized by the route implementation itself. Controlled live use still requires explicit authorization, correct gate values, safe payload preparation, and Dataverse logging readiness.

## Dataverse Send Logging

Author-facing send events are logged to `jm1_executionlogs` with safe metadata only:

- event type: `AUTHOR_RESPONSE_SENT`
- diagnostic ID
- intake reference code
- author email
- internal visibility mailbox
- subject
- template name
- send status
- delivery status
- provider safe name
- provider message ID only if safe
- timestamp
- approved by
- approved on
- correlation ID if available

Do not log manuscript text, extracted manuscript content, prompt body, raw model output, secrets, tokens, keys, headers, full provider responses, Opportunity data, or Flow D trigger data.

## Visibility Verification

Milestone #5 communication is not complete unless `publishing@jmerrill.one` received or was internally mirrored on the author-facing communication and the send event was logged in Dataverse.

## Rollback And Disable Procedure

If any check fails:

1. Set `JM1_AUTHOR_RESPONSE_SEND_ENABLED=false`.
2. Confirm `JM1_AI_EXECUTION_ENABLED=false`.
3. Confirm `JM1_INTERNAL_NOTIFICATIONS_ENABLED=false` unless an authorized internal-only test is underway.
4. Do not retry automatically.
5. Record the safe failure reason.
6. Do not create Opportunity.
7. Do not activate Flow D.
8. Do not trigger onboarding, production, or follow-up automation.

## Boundaries

Milestone #5 does not create Opportunities, activate Flow D, trigger onboarding automation, trigger production automation, run diagnostics, process broad queues, or authorize production activation.

Live sends require explicit human authorization, governed provider configuration, recipient locking, internal visibility, and Dataverse logging.
