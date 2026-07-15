---
Status: MIGRATION-PROPOSAL
Classification: Spec-only
Production Implementation Authorized: No
Last Verified: 2026-07-15
last_verified_date: 2026-07-15
---

# Agent Registry v2 Migration Proposal

## Purpose

Extend the Agent Registry to support lifecycle state, autonomy tier, autonomy ceiling, risk and data classification, commissioning evidence, failure handling, rollback behavior, exception routing, and Registrar validation.

## Migration Boundary

This proposal does not authorize production schema changes, agent activation, autonomy promotion, or production flows.

## Proposed Sequence

1. Inventory existing governed agent records and planning census entries.
2. Classify each as Active, Commissioned, Planned, Reference-only, or Retired.
3. Populate v2 fields only from governed evidence.
4. Hold A3 classification until required A3 evidence fields are complete.
5. Present migration preview for Jackie approval before any live registry mutation.

## Approval Required

Jackie must separately approve the schema, migration preview, and any live registry changes.

