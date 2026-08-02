# Architecture

## Canonical Service

`lib/server/publishing-dispatch-service.ts`

Exports:

- `PublishingDispatchService`
- `dispatchAuthorPackage()`

## Callers

Current callers migrated in this implementation:

- `lib/server/five-title-executive-recovery-dispatch.ts`
- `lib/server/publishing-orchestrator.ts`
- `app/api/publishing/dispatch/author-package/route.ts`

## Validation Gates

Before dispatch, the service evaluates:

- current package;
- recipient;
- manifest;
- QA;
- duplicate send;
- current gate;
- current package version.

## Evidence Events

New execution event labels used by the service:

- `PUBLISHING_DISPATCH_TRANSACTION_STARTED`
- `PUBLISHING_DISPATCH_AUTHOR_PACKAGE_DELIVERED`
- `PUBLISHING_DISPATCH_SURFACES_REFRESHED`

Legacy `FIVE_TITLE_EXECUTIVE_RECOVERY_DELIVERED` records are checked as supporting idempotency evidence to prevent duplicate sends during migration.
