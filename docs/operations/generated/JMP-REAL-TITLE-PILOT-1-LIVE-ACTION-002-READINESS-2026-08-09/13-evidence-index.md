# Evidence Index

Last verified: 2026-08-09T23:12:00Z

## Evidence Sources

| Evidence | Source |
| --- | --- |
| Current title state | `docs/operations/active/the-intentional-leader/CURRENT-STATE.md` |
| Current title state JSON | `docs/operations/active/the-intentional-leader/CURRENT-STATE.json` |
| Protected closeout allowlist | `lib/server/publishing-title-closeout-service.ts` |
| Protected closeout tests | `scripts/publishing_title_closeout_service.test.mjs` |
| Tranche 3 lifecycle authority | `scripts/tranche3_title_pf_runtime.mjs` |
| Pilot activation matrix | `docs/operations/generated/JMP-MARKETING-CANON-RECONCILIATION-PILOT-445-READINESS-2026-08-09/17-pilot-activation-matrix-update.md` |
| Observation closeout | `docs/operations/generated/JMP-REAL-TITLE-PILOT-1-OBSERVATION-CLOSEOUT-2026-08-09/` |
| Read-only Dataverse title/stage/gate/artifact readback | Web API readback performed 2026-08-09 |

## Validation

- `npm ci`: PASS with existing Node 26 warning against repository Node 24 declaration.
- `node --test scripts/publishing_title_closeout_service.test.mjs`: 17 / 17 PASS.
- Shadow closeout harness: TITLE_CLOSEOUT_ELIGIBLE against expected model.
- Live Dataverse prerequisite readback: FAIL-CLOSED / NOT READY.

