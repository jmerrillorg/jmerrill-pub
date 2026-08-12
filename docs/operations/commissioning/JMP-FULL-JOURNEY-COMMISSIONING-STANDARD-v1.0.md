# JMP Full-Journey Commissioning Standard v1.0

Status: CANONICAL-CANDIDATE in PR #473
Scope: J Merrill Publishing runtime and operating-center commissioning
Prepared: 2026-08-11

## Purpose

This standard prevents a Publishing capability from being called complete merely because code exists, tests pass, or a workflow can be manually invoked.

The commissioning principle is:

REAL OR PRODUCTION-FAITHFUL EVENT -> AUTOMATIC PROCESSING -> CORRECT HUMAN GATE -> CORRECT HUMAN ACTION -> AUTOMATIC RESUMPTION -> DURABLE EVIDENCE.

## State Definitions

| State | Meaning |
| --- | --- |
| IMPLEMENTED | Code, configuration, document logic, or operating-surface behavior exists. |
| TESTED | Isolated validation passes against synthetic, fixture, or dry-run evidence. |
| DEPLOYED | The production environment contains the implementation. |
| LIVE-PROVEN | A real event, or a production-faithful event where real-world risk is inappropriate, traversed the capability successfully. |
| COMMISSIONED | The complete governed segment has traversed success, failure/exception handling, human-gate behavior, resumption, idempotency, and evidence behavior as applicable. |

## Commissioning Rule

A pipeline segment is not fully commissioned until a real or production-faithful event traverses it end to end.

Do not retroactively mark all Publishing capabilities commissioned because Tranche validation passed. Tranche validation may establish IMPLEMENTED, TESTED, or DEPLOYED. It does not establish COMMISSIONED unless live/proven segment evidence exists.

## Human-Gate Requirement

If Jackie must act, Jackie must know.

Any state equivalent to WAITING_FOR_JACKIE, JACKIE_APPROVAL_REQUIRED, JACKIE_REVIEW_REQUIRED, PUBLISHER_DECISION_REQUIRED, or MANUAL_PUBLISHER_ACTION_REQUIRED must surface:

- what action is required;
- why Publisher authority is required;
- what artifact/evidence must be reviewed;
- bounded decision options;
- downstream consequence;
- a direct Publisher Operating Center deep link;
- notification state and last-notified evidence.

## Defect Response Policy

For a full-journey commissioning asset:

1. Stop the affected transition.
2. Identify the reusable root cause.
3. Fix the global path.
4. Validate the fix.
5. Resume the same title through the repaired path.

Do not manually force a title to the next stage, change data to make a dashboard look correct, skip stages because automation is inconvenient, replace automation with Jackie manual orchestration, or create title-specific code.

The title is the probe. The pipeline is what gets repaired.

## Evidence Requirements

Commissioning evidence must record:

- event source;
- production or production-faithful environment;
- input record IDs;
- generated artifacts;
- human gate and decision evidence;
- notification delivery where applicable;
- idempotency key and replay result;
- mutation counts and side-effect boundary;
- current open holds.

