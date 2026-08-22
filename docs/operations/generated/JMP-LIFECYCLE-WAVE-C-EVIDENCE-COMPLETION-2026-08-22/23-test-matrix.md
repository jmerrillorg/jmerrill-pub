# Test Matrix

| Test | Command | Result | Notes |
| --- | --- | --- | --- |
| Wave C guard | npm run jmp-lifecycle-wave-c-evidence-completion-guard | PASS | 9 deterministic tests |
| Wave B guard | npm run jmp-lifecycle-wave-b-operating-center-guard | PASS | 12 regression tests |
| Wave A authority | npm run jmp-lifecycle-authority-guard | PASS | 22 registry tests |
| Type check | npm run type-check | PASS | tsc --noEmit --incremental false |
| Lint | npm run lint | PASS_WITH_EXISTING_WARNING | app/layout.tsx custom font warning pre-exists |
| Publisher Today / P0 / author activation / closeout / Tranche 2 | node --test publisher_today_read_model, p0 prospect, author decision, tranche2, activation guards | PASS | 55 tests |
| Commercial Joined Family / title closeout / final gate / editorial package | node --test atta, title closeout, final approval, editorial package guards | PASS | 44 tests |
| Dispatch and communication | npm run program006-dispatch-guard && npm run author-communication-brand-guard | PASS | 27 tests |
| Known intake regression | node --test scripts/jmp_intake_redesign_guard.test.mjs scripts/publishing_intake_orchestration_autostart.test.mjs | KNOWN_PRE_EXISTING_REGRESSION | 21 tests: 19 pass, 2 unrelated failures, causedByWaveC=false |
