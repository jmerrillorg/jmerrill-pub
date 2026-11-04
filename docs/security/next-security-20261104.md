# Publishing Next.js security remediation — 2026-11-04

Packet: JM1-PUBLISHING-NEXT-SECURITY-20261104
Enterprise packet: JM1-OPS-P1-RECOVERY-20261104
Tracking: jmerrillorg/jmerrill-pub#1061; jmerrillorg/jm1-ops#398

## Scope and exposure

The inspected default branch was `b8ca8ce7167b14581ed6a81cde111fdc6867fcee`.
Its lock and manifest pinned Next.js and eslint-config-next 16.3.5.
Live `https://jmerrill.pub/api/health` on November 4 returned release
`20e9b1b2daf8aec35151623ffcb91f856b1beef8`. Deployment run
[38723792574](https://github.com/jmerrillorg/jmerrill-pub/actions/runs/38723792574)
built that release with Next.js 16.3.5. Kudu independently returned active package
`20261015105755.zip`; read-only extraction of its `node_modules/next/package.json`
also confirmed installed version 16.3.5 on November 4.

16.3.5 falls in the affected ranges for GHSA-2464-fhr4-w9xw and
GHSA-673q-mjm6-r5xr. Source includes remote image optimization and Edge
routes. No `use cache` directive was found in app/lib. Absence of a directive
is not a blanket exemption from framework security fixes.

The compatible target is **16.4.5**, including the seven additional November 3
fixes in the [official release](https://github.com/vercel/next.js/releases/tag/v16.4.5).
Next.js and eslint-config-next remain matched. The regenerated lock additionally
updates vulnerable compatible transitives: source-map-js 1.2.2, zod 4.6.7,
and postcss-selector-parser 6.1.5.

## Regression correction

The existing approved-tail fixture used real wall-clock time after its historical
authority window expired. Tests now use a fixed September fixture clock and
explicitly verify rejection at the expiration boundary with zero provider effects.
No payment authority, production expiry, business policy, or runtime code changed.

## Validation

Verified November 4, 2026, 20:29 UTC on Node 24.19.0 / npm 11.17.0:

- Clean `npm ci --ignore-scripts`, production build, typecheck and lint passed.
- All 17 deployment-guard command groups passed, including 400 tests.
- Installed-package readback matches the final lock. Production-only npm audit has zero findings.
- Local standalone artifact smoke passed: `/`, `/books`, `/author` return 200;
  `/pricing` redirects 308 to `/packages`; unauthenticated `/api/author/context`
  returns 401; an unapproved remote SVG image request returns 400. Public pages
  preserve DENY/nosniff headers. A synthetic local AUTH_SECRET was used.
- Initial no-configuration smoke returned 500 for the author API because AUTH_SECRET
  was absent; the configured synthetic smoke above passed. No live credentials were supplied.
- Authenticated author workflows and Azure staging/production acceptance remain deployment gates.

Build warnings about legacy middleware/Edge conventions and broad file tracing remain;
none failed the build. Packet-scoped detailed logs are retained under the enterprise
evidence namespace, outside source control.

Security audit after the compatible lock updates has no high or critical findings
and no Next.js runtime advisory. Eight moderate development-tool findings remain
through the typescript-eslint/minimatch chain. The offered automatic fix downgrades
Next lint configuration to 15.x; it is deliberately not applied. This is not a claim
of a zero-finding estate.

## Deployment gates and rollback

No merge, deploy, workflow enablement, credentials, permissions, author decisions,
or message replay is authorized by this change. The production workflow was
`disabled_manually` at readback and remains unchanged. An authorized operator must
approve the controlled deployment, preserve any pre-disabled classification,
run the existing deployment guards, and verify live release SHA and public/author
smoke results after cutover. Local smoke is not production acceptance.

Before cutover preserve the currently deployed artifact and release SHA. A code
rollback restores a vulnerable version and therefore requires explicit security
judgment; prefer correcting forward on the patched release. Never lift a freeze
or enable a previously disabled workflow solely because this PR is ready.
