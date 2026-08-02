# PROGRAM-006 Governed Publishing Dispatch Service

Status: IMPLEMENTED FOR REVIEW
Date: 2026-08-02
Branch: codex/program-006-publishing-dispatch-service

## Objective

PROGRAM-006 establishes `PublishingDispatchService` as the canonical author-package dispatch coordinator for J Merrill Publishing.

The service primary operation is:

`dispatchAuthorPackage()`

Required inputs:

- `PackageID`
- `TitleID`
- `StageID`
- `RecipientContactID`
- `ExecutionMode`

Supported execution modes:

- `DRY_RUN`
- `PRODUCTION`
- `EXECUTIVE_RECOVERY`

## Implementation Summary

The implementation introduces a reusable server-side dispatch service and routes existing five-title executive recovery and Publisher OC proofreading notification paths through the service.

The service coordinates:

- package and recipient readback;
- manifest and author-safe artifact validation;
- duplicate-send prevention;
- approval-gate creation or reuse;
- branded ACS author communication;
- Dataverse gate and stage update;
- execution-log evidence;
- Publisher OC and Author OC projection evidence markers;
- response-clock start after confirmed delivery.

## Transaction Boundary

The service is the single application transaction coordinator for author-package dispatch.

Dataverse writes and ACS email delivery are not a single database transaction because ACS is an external provider. The service therefore uses strict pre-dispatch validation, natural-key idempotency, and post-send evidence writes to prevent duplicate packages, gates, and communications.

Natural key:

`Title + Stage + Package Version + Recipient`

## Current Boundary

This package records implementation and local validation readiness only. Production dispatch of additional live titles remains a governed operational action after review, merge, deployment, and environment validation.
