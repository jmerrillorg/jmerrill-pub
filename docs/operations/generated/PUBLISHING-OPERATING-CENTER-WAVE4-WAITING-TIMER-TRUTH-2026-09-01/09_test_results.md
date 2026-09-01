# Test Results

Last verified: 2026-09-01T13:40:00Z

| Check | Result |
|---|---|
| `node --test scripts/publisher_operating_center_wave4_waiting_timer_truth.test.mjs scripts/publisher_operating_center_wave3_stage_truth.test.mjs scripts/publisher_operating_center_wave2_projection_authority.test.mjs scripts/jmp_lifecycle_wave_b_operating_center.test.mjs scripts/publisher_today_read_model.test.mjs` | PASS - 48 / 48 |
| `npm run type-check` | PASS |
| `npm run lint` | PASS with existing `app/layout.tsx` custom-font warning |
| `npm run build` | PASS with existing `app/layout.tsx` custom-font warning and existing edge-runtime static-generation note |
| `npm run jm1-canon-consistency-guard` | PASS - 4 / 4 |
| `git diff --check` | PASS |
| `shasum -a 256 -c checksums.sha256` | PASS after checksum regeneration |
