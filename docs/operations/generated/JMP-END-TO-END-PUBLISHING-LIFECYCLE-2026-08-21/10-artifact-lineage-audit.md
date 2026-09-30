# 10 - Artifact Lineage Audit

## Current Good Evidence

The editorial author gate policy requires approval to be bound to the exact deliverable artifact and checksum. Dispatch and package engines also use package/gate/title/stage ids and checksums for idempotency.

## Defects / Gaps

| Area | Finding | Risk |
|---|---|---|
| Line runtime | Live General's Will gate records hold due to mislabeled Developmental output risk | Wrong artifact can authorize wrong next stage |
| Package policies | Package Engine and Notification Engine disagree on artifact role names | Required material can be omitted or misclassified |
| Production | Production tasks are not linked to project/title in live schema | Layout/proof/final interior lineage cannot be fully projected |
| Distribution | Distribution artifacts are asset-level, not fully chained from final author approval | Release readiness can be inferred too early |

## Required Contract

Each irreversible transition must identify artifact id, artifact version, checksum, approving human/event, evidence source, and next-stage authorization.
