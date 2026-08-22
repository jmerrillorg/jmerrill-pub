# Wave C Post-Rebase Validation

| Area | Command | Result | Notes |
| --- | --- | --- | --- |
| Wave A authority guard | npm run jmp-lifecycle-authority-guard | PASS | 22 tests |
| Wave B guard | npm run jmp-lifecycle-wave-b-operating-center-guard | PASS | 12 tests |
| Wave C guard | npm run jmp-lifecycle-wave-c-evidence-completion-guard | PASS | 9 tests |
| Type check | npm run type-check | PASS | tsc --noEmit --incremental false |
| Lint | npm run lint | PASS_WITH_EXISTING_WARNING | app/layout.tsx no-page-custom-font warning |
| Evidence checksums | sha256sum -c checksums.sha256 | PASS | Wave C package manifest verified |
| Lifecycle/commercial/editorial controls | node --test selected lifecycle controls | PASS | 88 tests |
| Known intake regression | node --test scripts/jmp_intake_redesign_guard.test.mjs scripts/publishing_intake_orchestration_autostart.test.mjs | KNOWN_PRE_EXISTING_REGRESSION | 21 tests: 19 pass, 2 fail; causedByWaveB=false; causedByWaveC=false |
