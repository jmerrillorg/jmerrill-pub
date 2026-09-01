# Test Results

Last Verified: 2026-09-01T11:51:03.858Z

- `node --test scripts/publisher_operating_center_wave2_projection_authority.test.mjs`: PASS 10 / 10
- `node --test scripts/publisher_operating_center_wave2_projection_authority.test.mjs scripts/jmp_lifecycle_wave_b_operating_center.test.mjs scripts/publisher_today_read_model.test.mjs`: PASS 23 / 23
- `npm run type-check`: PASS
- `npm run lint`: PASS with pre-existing `app/layout.tsx` custom-font warning
- `npm run jm1-canon-consistency-guard`: PASS 4 / 4
- `npm run build`: PASS
- `git diff --check`: PASS

Environment note: the local shell used Node v22.23.1 / npm 10.9.8 while the repository declares Node `>=24 <25` / npm `>=11 <12`; dependency install and all required checks still completed successfully.
