# Validation

Last verified: 2026-08-27T10:36:00Z

| Check | Result |
| --- | --- |
| PR #659 merge | PASS / `3f9d8a20b88ff69741a9022015968bf912f43495` |
| Production `/api/health` | PASS / `status: ready`, release `0e3f10df62f16b412f23b758cc28f3cf27e8545d` |
| Stripe enrollment health dependency | PASS / `ready` |
| Direct local Stripe account readback | BLOCKED / `stripe_request_failed:401` |
| `npm ci` | PASS with Node 26 warning against repo Node `>=24 <25` |
| `npm run stripe-connect-reminder-cadence-guard` | PASS / 15 of 15 |
| Broader Stripe Connect governance suite | PASS / 40 of 40 |
| `npm run type-check` | PASS |
| `npm run build` | PASS |
| Checksums | PASS |

Build warnings preserved:

- Next custom-font warning in `app/layout.tsx`;
- edge runtime static-generation notice;
- Dataverse catalog configuration missing during static generation.

The broader suite initially exposed one stale assertion that expected the superseded
`Set Up Your J Merrill Publishing Royalty Payments` subject. The runtime already
uses the current direct-deposit setup subject, so the assertion was aligned to the
canonical author-facing service language and the suite then passed.
