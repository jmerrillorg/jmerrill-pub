# Response Clock Root Cause

Last verified: 2026-08-09T23:51:00Z

## Root Cause

Classification: STATE-PROJECTION GAP plus LEGACY DATA GAP

The August 3 author approval existed in the governed mailbox but did not propagate into the A7 gate fields. Separately, older already-approved gates retained jm1pub_awaitingsince values, which caused the protected closeout readiness rule to count stale clocks even after A7 was corrected.

## Title-Specific Repair

TITLE-SPECIFIC DATA REPAIR: COMPLETE

- A7 awaiting-since value cleared after correlation to the completed Interior Layout review cycle.
- Three older approved-gate awaiting-since values cleared as stale approved-gate clocks.
- A7 author decision and next-stage authorization basis recorded.

## Reusable Process Defect

REUSABLE PROCESS DEFECT: PRESENT

Durable fix still required: author approval ingestion must convert a correlated Approved reply into gate decision fields, clear the matching awaiting clock, prevent approved gates from retaining response clocks, and log the reconciliation without manual Dataverse patching.

Approval propagation process-fix test: FAIL

If another author replies Approved tomorrow, automatic reconciliation is not yet proven.

