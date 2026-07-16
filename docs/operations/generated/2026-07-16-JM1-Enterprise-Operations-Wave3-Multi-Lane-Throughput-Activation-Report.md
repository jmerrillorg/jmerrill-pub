# JM1 Enterprise Operations - Multi-Lane Throughput Activation Report

Generated: 2026-07-16T10:03:34.790Z

Source: JM1-Core live read via governed Azure CLI Dataverse token

## Lane A - Commissioning Title

The Intentional Leader, Volume I is in Copyediting Author Review. Proofreading is not started and remains blocked until the A4 author response is received and recorded.

| Stage | Type | Status | Gate | Latest Evidence |
|---|---|---|---|---|
| Copyediting - The Intentional Leader, Volume I | Copyedit | Complete | Awaiting Author Response | CAP010_COPYEDITING_RELEASE_REFRESH_COMPLETED |
| Line Editing - The Intentional Leader, Volume I | Line | Complete | Approved | CAP010_LINE_EDITING_RELEASE_REFRESH_COMPLETED |
| Developmental Editing - The Intentional Leader, Volume I | Developmental | Complete | Approved | DEVELOPMENTAL_EXIT_COMPLETED |
| Editorial Review - The Intentional Leader | Review | Complete | Publisher Override |  |

## Lane B - Live Publishing Throughput

### Before You Were Born

| Stage | Type | Status | Gate | Latest Evidence |
|---|---|---|---|---|
| Developmental Editing - Before You Were Born | Developmental | Not Started |  | CAP001_INSTANCE_INITIALIZED |
| Editorial Review - Before You Were Born | Review | Complete |  | EDITORIAL_REVIEW_COMPLETED |

### The General's Will and Last Testament

| Stage | Type | Status | Gate | Latest Evidence |
|---|---|---|---|---|
| Developmental Editing - The General’s Will and Last Testament | Developmental | Not Started |  | CAP001_INSTANCE_INITIALIZED |
| Editorial Review - The General’s Will and Last Testament | Review | Complete |  | EDITORIAL_REVIEW_COMPLETED |

### The Long Watch

| Stage | Type | Status | Gate | Latest Evidence |
|---|---|---|---|---|
| Editorial Review - The Long Watch | Review | In Progress |  | LONGWATCH_EDITORIAL_REVIEW_INITIALIZED |

### Establishing Glory: The Library

| Stage | Type | Status | Gate | Latest Evidence |
|---|---|---|---|---|
| Editorial Review - Establishing Glory: The Library | Review | Complete |  | EDITORIAL_REVIEW_COMPLETED |

## Lane C - Publisher Operating Center

PR #285 corrected the Publisher Operating Center workload state so CAP-003 author package delivery/open events resolve to Copyediting - Author Review instead of Copyediting - Release Decision Ready.

## Lane D - Production and Distribution

Production and Distribution runway is initialized as the next focus. CAP-004 Proofreading is readiness-only until The Intentional Leader's A4 Copyediting author-review gate is complete.

## Bottleneck Analysis

- Current bottleneck: Copyediting author response for The Intentional Leader; Proofreading cannot start until A4 author response is recorded.
- Projected next bottleneck: Proofreading and Production runway. CAP-004/CAP-005 must be ready before author approval arrives.
- Recommended balancing action: Prepare CAP-004 source package, standards, correction model, QA, evidence, and metrics while CAP-001 work continues on the other live titles.

## Enterprise Throughput

- Tracked titles: 5
- Live editorial stage rows: 10
- CAP003 author-review opened events in read window: 1
- CAP001 initialized events in read window: 2
- Editorial review completed events in read window: 4

## Remaining Jackie Decisions

- Respond to or record the author Copyediting decision when received. No Proofreading authorization exists before that gate.
