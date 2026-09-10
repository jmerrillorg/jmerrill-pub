# Runtime Execution Evidence

Last Verified: 2026-09-02T04:47:24.358308Z

## Commands executed

| Command | Result |
| --- | --- |
| `node --test azure-functions/diagnostic-ai-runner/test/editorialCadenceReleaseConsumer.test.js` | PASS, 18 / 18 |
| `node --test scripts/publishing_orchestrator.test.mjs scripts/author_review_package_engine.test.mjs scripts/author_package_notification_engine.test.mjs scripts/program006_publishing_dispatch_service.test.mjs` | PASS, 54 / 54 |
| `npm run jm1-canon-consistency-guard --if-present` | PASS, 4 / 4 |
| `npm run type-check` | PASS |
| `npm run lint --if-present` in `azure-functions/diagnostic-ai-runner` | PASS, syntax check |

## Proof-relevant scenarios observed

The cadence consumer test confirms:

- Line Editing cadence uses canonical five-business-day baseline.
- Future scheduled package does not invoke mailbox repair or send path.
- Due cadence marks release boundary expired.
- Package identity is parsed from handoff summaries.
- Metadata refresh and repeated package handoff do not restart cadence.
- Due package with no canonical/mailbox delivery evidence sends once through mocked governed ACS relay.
- Missing contact/email fails closed and does not send.
- Missing required attachment fails closed.
- Internal-only manuscript artifacts are rejected.
- Already operationally certified gate prevents resend.
- Cadence-not-required package is reconciled as non-sendable.
- Mailbox delivery repairs missing internal send evidence and prevents duplicate send.
- Acknowledgment response is not treated as approval.
- Ambiguous mailbox evidence fails closed.
- Legacy package-id source is skipped instead of queried as an editorial stage.

## Captured mutation model

All Dataverse, relay, mailbox, and artifact-dependency effects were captured through mocked/in-memory test dependencies. The proof run did not perform production mutation.
