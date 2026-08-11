# Evidence Index

Last verified: 2026-08-11T08:45:19Z

| File | Purpose |
| --- | --- |
| `00-executive-summary.md` | Assessment summary and boundary |
| `01-iyorwuese-inbound-message-proof.md` | Outlook inbound proof |
| `02-author-title-correlation.md` | Author, title, stage, gate, and package correlation |
| `03-existing-runtime-capture-search.md` | Repository/evidence capture search |
| `04-expected-inbound-pipeline.md` | Expected path and observed status |
| `05-first-failure-analysis.md` | First failure and secondary drift |
| `06-manual-recovery-coverage-analysis.md` | Manual recovery coverage finding |
| `07-decision-classification.md` | Canonical decision classification |
| `08-acknowledgement-policy.md` | Acknowledgement authority finding |
| `09-reusable-defect-classification.md` | Defect family and defect list |
| `10-existing-engine-reuse-analysis.md` | Existing engine reuse path |
| `11-reconciliation-plan.md` | Future recovery plan, not executed |
| `12-process-fix-definition.md` | Required runtime contract |
| `13-side-effect-check.md` | Mutation and side-effect proof |
| `15-checksums.md` | SHA-256 checksums |

## External Evidence

- Outlook shared mailbox `publishing@jmerrill.one`, message received `2026-08-10T22:22:21Z`.
- Outlook outbound thread message sent/received in mailbox `2026-08-04T13:45:29Z`.

## Repository Evidence

- `azure-functions/diagnostic-ai-runner/src/mail/publishingMailboxReader.js`
- `azure-functions/diagnostic-ai-runner/src/orchestration/authorReviewResponseConsumer.js`
- `lib/server/author-decision-closeout-propagation.ts`
- `scripts/author_decision_closeout_propagation.test.mjs`
- `docs/operations/generated/2026-07-17-JM1-2026-Royalty-Author-Identity-Final-Register.csv`
- `docs/operations/generated/JMP-REAL-TITLE-PILOT-SELECTION-2026-08-09/03-pr431-exclusion-review.md`

