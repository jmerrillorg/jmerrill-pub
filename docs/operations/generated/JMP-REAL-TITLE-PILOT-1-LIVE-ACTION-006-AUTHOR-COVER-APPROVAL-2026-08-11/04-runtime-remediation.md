# Runtime Remediation

Last verified: 2026-08-11T20:50:39Z

During this run, the author response consumer was corrected to avoid a stale subject-probe rule.

Prior behavior:

- any Intentional Leader gate forced the mailbox subject probe to `Proofreading Review Package`;
- a Cover Design author response with subject `Cover Design Review - The Intentional Leader` could therefore be missed.

Corrected behavior:

- Cover Design gates probe for `Cover Design Review`;
- Proofreading gates probe for `Proofreading Review Package`;
- Copyediting, Line Editing, and Developmental gates use their stage-specific probes;
- the default open-gate query selects only fields that exist in the deployed `jm1pub_editorialapprovalgate` schema.

Validation added:

- Intentional Leader Cover Design approval uses the cover-review subject instead of the stale proofreading probe.
- Open-gate query only selects deployed approval-gate schema fields.

No schema changes were made.

