# 10 - Regression Tests

Passed:

- `npm run jmp-lifecycle-wave-b-operating-center-guard`: 12 tests
- `npm run jmp-lifecycle-authority-guard`: 22 tests
- `node scripts/publisher_today_read_model.test.mjs`
- `npm run p0-prospect-editorial-review-lifecycle-guard`: 7 tests
- `node --test azure-functions/diagnostic-ai-runner/test/packageAcceptancePaymentOptions.test.js azure-functions/diagnostic-ai-runner/test/packageSelectionCommercialContinuation.test.js`: 31 tests
- `node --test scripts/atta_payment_event_recovery_guard.test.mjs scripts/atta_joined_family_reconciliation_guard.test.mjs`: 12 tests
- `node --test azure-functions/diagnostic-ai-runner/test/editorialExecutionRuntime.test.js azure-functions/diagnostic-ai-runner/test/editorialReviewRunControl.test.js`: 45 tests
- `npm run type-check`
- `npm run lint` with existing `app/layout.tsx` font warning

Known unrelated failures left untouched:

- `scripts/publishing_intake_orchestration_autostart.test.mjs` has two failures in untouched intake/manuscript upload files:
  - expected `sendJoinAuthorAcknowledgment(acceptedIntake)`
  - expected Markdown manuscript extension policy

Wave B did not repair these because this wave is not an intake runtime repair wave.
