# PROGRAM-005 Publishing Pipeline Reliability Recovery Evidence

Generated: 2026-07-30T15:50:19Z
Environment: JM1 production Dataverse readback plus repository validation from clean branch `codex/program-005-publishing-pipeline-reliability`.

## Root Cause

Historical pipeline failures occurred after author decisions were recorded because the approval-event consumer refused to emit or consume incomplete events when the gate lacked a complete event payload or attachment-aware notification evidence. The system wrote `EDITORIAL_APPROVAL_EVENT_BLOCKED` with `payload_missing_required_reference_or_complete_notification`, which correctly prevented unsafe stage movement but left Publisher Center showing Gate Updated / Stage Not Advanced.

The remaining current defects were read-model defects, not missing canonical records:

- Author Operating Center project projection keyed active projects by `titleId` or normalized title, but not by both aliases. Canonical title rows and fallback opportunity/intake rows for the same active title could render as duplicates.
- Publisher Operating Center derived processed status from downstream stage evidence but passed only transition-log evidence into failed-step derivation, allowing stale failed-step text after the downstream stage had advanced.

## Repairs

- `lib/server/author-portal-context.ts`: collapsed project rows across canonical title ID and normalized title-name aliases; preferred canonical title-backed rows.
- `lib/server/publisher-operating-center.ts`: propagated downstream-stage movement as transition evidence and restored governed recovery-action labels.
- `scripts/program005_publishing_pipeline_reliability.test.mjs`: added regression guard for the PROGRAM-005 reliability invariants.

## Live Readback Summary

- Decided author approval gates scanned: 5
- Current backlog candidates: 0
- The Intentional Leader canonical title records: 1
- The Long Watch canonical title records: 1
- The Intentional Leader editorial stages: 5
- The Intentional Leader editorial artifacts: 30
- SharePoint-synchronized artifact references: 27
- Checksum-bearing artifacts: 11
- The Intentional Leader production projects: 2
- The Intentional Leader production tasks found by title: 2

No stage was manually advanced and no approval event was fabricated during PROGRAM-005. Current replay requirement is satisfied by existing consumed/idempotent pipeline evidence; no incomplete governed event remained eligible for replay in the live backlog scan.

## Validation

- `npm run type-check`: PASS
- `npm run lint`: PASS with existing app/layout.tsx font warning
- `npm run build`: PASS with known Dataverse catalog static-generation warnings
- `npm run workflow-engine-guard`: PASS
- `npm run program005-pipeline-guard`: PASS
- `node scripts/approval_event_consumer.test.mjs`: PASS
- `node scripts/publisher_today_read_model.test.mjs`: PASS
- `node scripts/publishing_orchestrator.test.mjs`: PASS
- `npm test` in `azure-functions/diagnostic-ai-runner`: PASS 1751/1751
- `git diff --check`: PASS

## Dataverse Completion Event

- jm1_executionlog: `b59ce66c-2e8c-f111-ab10-7c1e525b15c2`
- Action type: `PROGRAM005_PUBLISHING_PIPELINE_RELIABILITY_COMPLETE`
- Manual stage changes: 0
- Fabricated approval events: 0

## Certification

PROGRAM-005 Publishing Pipeline Reliability is complete for the observed defect class. The pipeline is synchronized for the scanned decided approval gates, duplicate active project tiles are reconciled in the Author Operating Center projection, and Publisher Center processed responses no longer retain stale Gate Updated / Stage Not Advanced failed-step text when downstream movement exists.
