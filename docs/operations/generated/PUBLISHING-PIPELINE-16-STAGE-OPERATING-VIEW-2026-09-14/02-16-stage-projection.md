# 16-Stage Projection

## Canonical Human Stages

01 - Inquiry
02 - Intake
03 - Editorial Review
04 - Author Decision
05 - Agreement & Payment
06 - Onboarding
07 - Developmental Editing
08 - Line Editing
09 - Copyediting
10 - Proofreading
11 - Interior Layout
12 - Cover Design
13 - Production
14 - Distribution
15 - Publication
16 - Post-Publication

00 - Template is infrastructure and is not a title stage.

## Projection Rule

The projection is implemented in:

lib/publishing/lifecycle/human-pipeline-read-model.ts

The projection uses the Operating Center title card's canonical lifecycle stage, substage, waiting truth, attention state, blocker, next action, package, imprint, and movement evidence.

## Reconciliation Rule

The pipeline does not silently guess when canonical lifecycle truth is ambiguous.

A title is placed in reconciliation when:

- canonical stage is DATA_GAP
- canonical mapping is incomplete
- canonical mapping is conflicting
- canonical authority requires reconciliation
- stage truth classification is RECONCILIATION_REQUIRED

## Title Reconciliation Counts

The counts are computed at runtime from the live authenticated Operating Center snapshot:

- totalTitles
- placedTitles
- reconciliationRequired
- needsJackie
- waitingOnAuthor
- waitingOnSystem
- blocked
- exceptions
