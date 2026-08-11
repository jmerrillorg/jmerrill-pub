# Expected Inbound Pipeline

Last verified: 2026-08-11T08:45:19Z

| Layer | Expected behavior | Evidence state |
| --- | --- | --- |
| Mailbox receipt | Reply lands in `publishing@jmerrill.one` | PASS |
| Mailbox reader | Reads only the governed publishing mailbox Inbox | IMPLEMENTED |
| Gate discovery | Finds open author-review gates with no decision date | IMPLEMENTED |
| Subject/thread probe | Correlates reply to the open review gate | PARTIAL |
| Author identity | Confirms sender belongs to governed author contact | PASS |
| Title/package correlation | Binds reply to title, stage, gate, and package | PASS FROM THREAD / NOT PERSISTED |
| Decision classification | Preserves approval-with-corrections as canonical decision | FAIL / DRIFT |
| Author notes capture | Preserves substantive author notes | NOT FOUND |
| Gate decision persistence | Writes decision source/date/summary to the governed gate | NOT FOUND |
| Execution logging | Records inbound/correlated/classified/persisted/completed states | NOT FOUND |
| Acknowledgement policy | Determines whether a response acknowledgement is allowed or required | NOT YET GOVERNED |
| Title movement | Keeps PR #431/manual recovery state unchanged unless separately authorized | PASS |

## Evidence Source

- Mailbox reader scope: `azure-functions/diagnostic-ai-runner/src/mail/publishingMailboxReader.js:3-27`
- Mailbox reader filtering: `azure-functions/diagnostic-ai-runner/src/mail/publishingMailboxReader.js:145-213`
- Open gate discovery: `azure-functions/diagnostic-ai-runner/src/orchestration/authorReviewResponseConsumer.js:194-201`
- Runtime persistence path: `azure-functions/diagnostic-ai-runner/src/orchestration/authorReviewResponseConsumer.js:210-374`
- Canonical protected decision propagation: `lib/server/author-decision-closeout-propagation.ts:126-230`

