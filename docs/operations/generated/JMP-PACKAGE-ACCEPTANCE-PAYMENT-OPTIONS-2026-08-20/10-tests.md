# Tests

Last verified: 2026-08-20

## Commands

```text
npm ci
npm test -- test/packageAcceptancePaymentOptions.test.js test/authorReviewResponseConsumer.test.js test/authorOfferEngine.test.js test/agreementPaymentLinkMapping.test.js
npm run lint
```

## Results

- Focused test suite: 101 / 101 PASS.
- Lint: PASS.
- Full Azure Functions suite: 1980 / 1983 PASS.

## Full-Suite Residual

The three full-suite failures are all in:

`test/agreementGeneratedPackageMirror.test.js`

Failing cases:

- `uploads all four documents under generated-agreements/{diagnosticId}/ and verifies each by hash`
- `the manifest's per-file hashes match the actual uploaded content`
- `liveActions confirms staging-only scope`

Classification:

`UNRELATED_EXISTING_AGREEMENT_MIRROR_SYNTHETIC_DOCX_FIXTURE_FAILURE`

Reason:

The failed tests exercise generated agreement package blob mirroring and synthetic DOCX validation. They do not exercise package acceptance, Author Offer Engine invocation, response preview rendering, pricing snapshots, Stripe offer-backed schedule mapping, or the inbound package-selection consumer changes in this PR.

## Coverage

Package acceptance:

- explicit package acceptance;
- sole Starter recommendation + yes;
- ambiguous yes with two options;
- vague interest;
- duplicate response.

Automatic payment response:

- new Starter;
- new Professional;
- returning Professional;
- referral credits shown first;
- 50% cap;
- selected referral recalculation;
- renderer consumes engine output;
- no automatic live send.

Monetary authority:

- renderer amount equals engine amount;
- odd-cent principal preserved;
- Stripe adapter consumes engine-backed schedule.

Snapshot:

- preview may change before lock;
- locked snapshot remains immutable;
- payment plan matches locked schedule;
- duplicate lock attempt is idempotent.

Referral:

- 20% loyalty + 40% available referral + 30% selected leaves 10% remaining.

## Environment Caveat

Validation ran with Node v26.0.0 while the package declares `>=22 <25`.
