// Deterministic, dependency-free regression coverage for the 2026-08-19
// review-clock-reset defect (idempotency key truncated out of execution-log
// descriptions) and its fix. Uses Node's built-in test runner — no new test
// framework introduced, matching this repo's azure-functions/*/test
// convention (node:test + node:assert/strict), since lib/server/ has no
// existing test infrastructure of its own.
//
// This intentionally tests only the extracted PURE helpers
// (buildIdempotencySafeExecutionLogDescription, idempotencyKeySurvivesTruncation)
// — no live/mocked Dataverse calls. The full dispatchAuthorPackage /
// certifyOperationalDelivery / recordExternalDeliveryEvidence flow was
// verified live against real Dataverse (see
// docs/operations/generated/JMP-AUTHOR-SEND-GOVERNANCE-2026-08-18/) rather
// than through a new mock-Dataverse harness, which would be a larger
// redesign than this bounded fix warrants.

import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  buildIdempotencySafeExecutionLogDescription,
  idempotencyKeySurvivesTruncation,
} from '../publishing-dispatch-service.ts'

const REALISTIC_LONG_KEY =
  'author-package-notification:91c5e1ef-2980-f111-ab0f-7c1e525b15c2:DEVELOPMENTAL_EDITING_REVIEW:recipient:dfb397e7-3b7c-f111-ab0f-6045bdd69435:pkg-before-you-were-born-developmental-author-review-2026-08-04-corrected-v1:2026-08-04-corrected:d139bff87918ff2ef943690081062c1ac6a28a32c6adb5499986cb260e4bb107'

function longRestOfDescription(count: number): string[] {
  return Array.from({ length: count }, (_, i) =>
    `Sentence ${i} of boilerplate that pads the description well past any reasonable truncation point in order to reproduce the original defect deterministically.`,
  )
}

test('1. idempotency key appears before any truncatable detail (first sentence)', () => {
  const description = buildIdempotencySafeExecutionLogDescription(REALISTIC_LONG_KEY, ['Some detail.'])
  assert.ok(description.startsWith(`Idempotency ${REALISTIC_LONG_KEY}.`))
})

test('2. description truncation (1000 chars) cannot remove the lookup key, however long the rest of the description is', () => {
  for (const sentenceCount of [1, 5, 20, 50]) {
    const description = buildIdempotencySafeExecutionLogDescription(REALISTIC_LONG_KEY, longRestOfDescription(sentenceCount))
    assert.ok(
      idempotencyKeySurvivesTruncation(description, REALISTIC_LONG_KEY),
      `key should survive truncation with ${sentenceCount} padding sentences (description length ${description.length})`,
    )
  }
})

test('2b. reproduces the ORIGINAL defect shape (key appended at the end) to prove the test itself is meaningful', () => {
  // This is the pre-fix pattern: idempotency key interpolated after a long
  // natural-key/boilerplate tail, exactly as the three call sites did before
  // 2026-08-19. Confirms idempotencyKeySurvivesTruncation actually detects
  // the real failure mode, not just a strawman.
  const preFixStyleDescription = [
    ...longRestOfDescription(8),
    'Natural key Title + 91c5e1ef-2980-f111-ab0f-7c1e525b15c2 + Stage + 88189235-8f80-f111-ab0f-6045bdd69435 + Package Version + 2026-08-04-corrected + Recipient + dfb397e7-3b7c-f111-ab0f-6045bdd69435.',
    `Idempotency ${REALISTIC_LONG_KEY}.`,
  ].join(' ')
  assert.equal(
    idempotencyKeySurvivesTruncation(preFixStyleDescription, REALISTIC_LONG_KEY),
    false,
    "the pre-fix key-at-the-end pattern should fail to survive truncation — this is the actual bug that reset Sean's review clock",
  )
})

test('3. short descriptions are unaffected (no truncation needed, key still present)', () => {
  const description = buildIdempotencySafeExecutionLogDescription(REALISTIC_LONG_KEY, ['Short detail.'])
  assert.ok(idempotencyKeySurvivesTruncation(description, REALISTIC_LONG_KEY))
  assert.ok(description.length < 1000)
})

test("4. email and URL redaction (safeDetail's other behavior) does not corrupt the idempotency key", () => {
  const description = buildIdempotencySafeExecutionLogDescription(REALISTIC_LONG_KEY, [
    'Sent to author@example.com via https://func-jm1-acs-email-relay.azurewebsites.net/api/send-approved-author-response.',
  ])
  assert.ok(idempotencyKeySurvivesTruncation(description, REALISTIC_LONG_KEY))
})

test('5. stage-general: the helper takes no stage-specific parameter — same function serves Developmental/Line/Copy/Proof', () => {
  // buildIdempotencySafeExecutionLogDescription has no stageCode/stageType
  // argument at all; stage-specific content only ever appears inside
  // restOfDescription, supplied by the caller. This is a structural
  // (type-level) proof of stage-agnosticism, not a runtime assertion.
  assert.equal(buildIdempotencySafeExecutionLogDescription.length, 2)
})
