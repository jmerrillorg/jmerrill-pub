# Source Remediation and Validation

Last verified: 2026-08-13

## Source Changes

| Area | Change |
| --- | --- |
| DOCX validation | `agreementDocxValidator` now requires ZIP signature, `word/document.xml`, `[Content_Types].xml`, package relationships, main-document content type, and Office document relationship. |
| Agreement fields | `computeAgreementFields` now derives `selectedEditionsFormats` from confirmed elected Product Forms. |
| Package Addendum fill | `fillPackageAddendum` now fills `Selected Editions / Formats` from `selectedEditionsFormats`. |
| Legacy send path | `sendAgreementPackage` is superseded as a signature-execution path and fails closed by default with `ATTACHMENT_EMAIL_SIGNATURE_PATH_SUPERSEDED`. |
| Author format selection | Author onboarding no longer defaults Starter to paperback/eBook; the author must choose formats before agreement continuation. |
| Structured format truth | Author onboarding now submits package slot limit, selected Product Forms, included selected Product Forms, add-on selected Product Forms, separate-authorization selected Product Forms, and selection blockers. |
| Author Workspace task | Opportunities with agreement-preparation status equivalent to `AWAITING_FORMAT_SELECTION` surface a dedicated `Choose Your Publishing Formats` task. |

## Validation Commands

Working directory:

`/Users/jmerrillone/Developer/codex-worktrees/jmerrill-pub-esign-remediation-20260813/azure-functions/diagnostic-ai-runner`

Commands:

```bash
npm ci
node --test test/agreementDocxValidator.test.js test/agreementFieldComputer.test.js test/agreementPreparationRunner.test.js test/agreementPackageSendRunner.test.js test/adobeSignClient.test.js test/agreementSigningPacketBuilder.test.js
npm run lint
```

Working directory:

`/Users/jmerrillone/Developer/codex-worktrees/jmerrill-pub-esign-remediation-20260813`

Commands:

```bash
npm ci
npm run type-check
npm run build
node --test scripts/quanishia_commercial_continuation_remediation_guard.test.mjs
```

## Results

| Check | Result |
| --- | --- |
| Dependency install | PASS, with Node 26 engine warning because package declares `>=22 <25` |
| Focused agreement/e-sign tests | 90 / 90 PASS |
| Function lint | PASS |
| Repository dependency install | PASS, with Node 26 engine warning because root package declares `>=24 <25` |
| Repository type-check | PASS |
| Repository production build | PASS, with existing font warning and missing Dataverse catalog static-generation warnings |
| Quanishia commercial continuation guard | 6 / 6 PASS |

## Mutation Summary

| Category | Count |
| --- | ---: |
| Author communications | 0 |
| SignNow transactions/envelopes | 0 |
| Agreement signatures | 0 |
| Payment links | 0 |
| Business Central changes | 0 |
| Production/distribution/royalty/marketing actions | 0 |
| Client-title automation changes | 0 |

Dataverse mutation performed:

- Opportunity `11cdec24-b596-f111-8076-7c1e525b15c2` reclassified away from the invalid `AGREEMENT_SENT_FOR_SIGNATURE` state.
- Execution log `0af76e3f-0297-f111-8076-000d3a14673b` created with action type `AGREEMENT_ATTACHMENT_SEND_SUPERSEDED`.
