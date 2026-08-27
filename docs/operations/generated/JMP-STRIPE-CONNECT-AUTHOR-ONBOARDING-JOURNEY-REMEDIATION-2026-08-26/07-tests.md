# Tests

Last Verified: 2026-08-26T23:31:00Z

| Command | Result |
| --- | --- |
| `node --test scripts/author_payout_enrollment_governance.test.mjs` | PASS, 22 / 22 |
| `npm run type-check` | PASS |
| `npm run build` | PASS |

`npm ci` completed using the repository lockfile. Local Node emitted the known engine warning because the workstation is on Node 26 while the repository declares Node 24.

Build warnings were pre-existing: Next font warning in `app/layout.tsx` and static generation warnings when Dataverse catalog configuration is absent in local build.
