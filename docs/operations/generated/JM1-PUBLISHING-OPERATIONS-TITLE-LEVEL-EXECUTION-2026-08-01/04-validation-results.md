# Validation Results

Generated: 2026-08-01

## Source Validation

| Command | Result | Notes |
| --- | --- | --- |
| npm ci | PASS | Completed after installing workspace dependencies; shell Node reported v26.0.0 against repository Node >=24 <25 engine, producing an engine warning |
| node --test scripts/author_review_package_engine.test.mjs | PASS | 23 tests passed |
| npm run type-check | PASS | TypeScript completed with no errors |
| npm run workflow-engine-guard | PASS | Canonical workflow engine declaration guard passed |
| npm run author-communication-brand-guard | PASS | 3 tests passed |

## Warnings

| Warning | Classification |
| --- | --- |
| npm EBADENGINE because local shell Node is v26.0.0 and package expects >=24 <25 | Environment mismatch; does not invalidate package-engine logic test |
| MODULE_TYPELESS_PACKAGE_JSON warning while importing TypeScript in Node test | Existing test-runner style warning |
| npm audit reported vulnerabilities | Pre-existing dependency-maintenance item; not remediated under title-package directive |

## Runtime and Release Effects

| Effect | Result |
| --- | --- |
| Author communications sent | 0 |
| Approval gates created | 0 |
| Manual stage advancement | 0 |
| Dataverse writes from this evidence package | 0 |
| SharePoint deletes | 0 |
| Duplicate package releases | 0 |
| Duplicate communications | 0 |
| Response clocks started before delivery | 0 |
| Secret values retained | 0 |

## Follow-Up Validation Required Before Any Release

Each title must pass the full author-safe release QA immediately before cadence dispatch:

| Control | Required result |
| --- | --- |
| Canonical title | PASS |
| Canonical author | PASS |
| Canonical intake code | PASS |
| Correct stage | PASS |
| Current governed artifact | PASS |
| Internal-only content removed | PASS |
| Required summary or proof | PASS |
| Review instructions | PASS |
| Response mechanism | PASS |
| Manifest | PASS |
| Seven-day policy | PASS |
| HTML communication | PASS |
| Plain-text fallback | PASS |
| Brand compliance | PASS |
| File integrity | PASS |
| Accessibility | PASS |
