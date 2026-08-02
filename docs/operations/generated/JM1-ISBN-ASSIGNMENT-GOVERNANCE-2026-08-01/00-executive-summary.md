# JM1 ISBN Assignment Governance

Generated: 2026-08-01

## Result

COMPLETE - JM1 ISBN ASSIGNMENT GOVERNANCE

Jackie established the enterprise publishing policy that ISBN assignment occurs at the Production Metadata Gate. Author-review proofs may proceed with ISBN pending or omitted. Final distribution-ready files require format-specific ISBN assignment before certification.

No ISBNs were assigned, reserved, consumed, registered, voided, or returned to available status by this implementation.

## Policy

| Control | Disposition |
| --- | --- |
| Assignment point | PRODUCTION_METADATA_GATE |
| Author-review ISBN requirement | NOT REQUIRED |
| Final distribution ISBN requirement | REQUIRED |
| Operating model | AUTOMATED ASSIGNMENT WITH HUMAN APPROVAL |
| Human approval gate | ISBN_ASSIGNMENT_READY |
| Assignment options | APPROVE_ASSIGNMENT, CORRECT_METADATA, HOLD_FORMAT, CANCEL_PRODUCT |
| The Intentional Leader author-review proof | UNBLOCKED - ISBN PENDING |

## Workflow

Editorial approval
-> format and edition decisions
-> Production Metadata Gate
-> ISBN assignment approval
-> copyright-page and barcode data
-> final interior/cover proof
-> distribution setup
-> publication

## Current Implementation

- Pure gate-evaluation module: `lib/server/isbn-assignment-governance.ts`
- Test suite: `scripts/isbn_assignment_governance.test.mjs`
- Evidence package: this folder

The implementation is deterministic and does not call Bowker, Dataverse, Ingram, CoreSource, or any live inventory source. It defines the required authority, decision gates, and fail-closed controls for the eventual inventory-backed assignment workflow.
