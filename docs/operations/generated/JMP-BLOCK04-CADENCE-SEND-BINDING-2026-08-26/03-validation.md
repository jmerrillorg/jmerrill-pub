# Validation

Last Verified: 2026-08-26T09:15:37Z

## Commands

| Command | Location | Result |
| --- | --- | --- |
| `npm ci` | repository root | PASS; Node 26 engine warning against declared Node 24; npm audit reported existing vulnerabilities |
| `npm run lint` | repository root | PASS; existing Next font warning only |
| `npm run type-check` | repository root | PASS |
| `npm run editorial-cadence-guard` | repository root | PASS, 16 / 16 |
| `npm run author-facing-html-render-enforcement-guard` | repository root | PASS, 27 / 27 |
| `npm run author-facing-email-cc-canon-guard` | repository root | PASS, 14 / 14 |
| `npm ci` | `azure-functions/diagnostic-ai-runner` | PASS; Node 26 engine warning against declared Node range; npm audit reported existing vulnerabilities |
| `npm run lint` | `azure-functions/diagnostic-ai-runner` | PASS |
| `node --test test/editorialCadenceReleaseConsumer.test.js` | `azure-functions/diagnostic-ai-runner` | PASS, 14 / 14 |
| `npm test` | `azure-functions/diagnostic-ai-runner` | PASS, 2,121 / 2,121 |

## Regression Coverage

The cadence consumer tests cover:

- canonical stage baseline recognition;
- prior cadence summary cannot misclassify explicit Editorial Review;
- future due boundary remains system-owned and unsent;
- expired due boundary recognition;
- package identity parsing;
- hold duration expiry;
- true due and unsent package sends once through governed ACS relay;
- missing contact/email fails closed;
- delivered operational gate prevents resend;
- publisher-facing cadence-not-required rows do not send;
- mailbox delivery correlation repairs missing internal send evidence;
- mailbox delivery plus non-decisional reply does not fabricate approval;
- ambiguous mailbox evidence prevents resend;
- future packages skip mailbox/send work;
- legacy package-id source ids are skipped.
