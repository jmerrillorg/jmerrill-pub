# CI/CD Reliability

Last verified: 2026-08-25T07:53:36Z

## Bounded Repairs

Two small deployment-workflow reliability corrections were made.

| Area | Prior behavior | Correction |
| --- | --- | --- |
| Route probes | Diagnostic runner deployment probed several routes but did not probe `run-full-wrap-executor`. | Added `run-full-wrap-executor` to the live route-probe loop. |
| Rollback SAS lifetime | Last-known-good rollback package SAS expired after six days. | Extended rollback package SAS to 3650 days because `WEBSITE_RUN_FROM_PACKAGE` reads the package URL after rollback. |

## Not Changed

- No Function App configuration changed.
- No deployment was executed from this branch.
- No Dataverse schema changed.
- No author-facing route changed.
- No business logic changed outside the stale Full Wrap test fixture.

## Validation

Diagnostic runner full test suite passed after dependency install.

