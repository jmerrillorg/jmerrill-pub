# UI Implementation Summary

## New Daily View

ROUTE =
/publisher/pipeline

The Pipeline is a compact human-facing board optimized for Jackie to answer:

1. how many titles are active
2. where each title is
3. what is waiting on an author
4. what needs Jackie
5. what is blocked
6. what is progressing normally

## Controls

- horizontal 16-stage board
- sticky stage headers
- stage counts
- active title summary
- Show All Stages / Active Stages Only
- stage jump control
- waiting/attention filters
- compact title cards
- title detail panel
- reconciliation strip for unresolved placement
- Open in Operating Center link
- refresh action

## Preserved Operating Center

The existing Operating Center remains available at `/publisher/operating-center` and now links back to the Pipeline.

No diagnostic tables, remediation controls, execution controls, or queues were removed.

## Screenshots

Authenticated live screenshots were not captured in this package because the route is protected by the existing Publisher Operating Center sign-in boundary. The production build confirms the route compiles and is included in the app route manifest.

