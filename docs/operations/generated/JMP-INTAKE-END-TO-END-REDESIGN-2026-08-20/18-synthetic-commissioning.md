# Synthetic Commissioning

Status: not production-run.

Reason:

- Code has not been deployed from the clean worktree.
- A Turnstile-valid synthetic path or governed production test bypass is still required.
- The current affected prospect must not be used as synthetic test data.

Required commissioning must prove:

- durable intake before success response
- duplicate retry returns same intake
- notification failure does not hide intake
- Pages original is preserved
- manuscript-later creates a visible inquiry without Editorial Review start
- Publisher Operating Center shows every inquiry

Current local implementation coverage:

- `npm run type-check`: pass
- `npm run lint`: pass with pre-existing font warning
- `node --test scripts/jmp_intake_redesign_guard.test.mjs`: pass, 7 tests

Production commissioning is still required before `FRONT_DOOR_FULLY_COMMISSIONED`.
