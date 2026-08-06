# OR-2026-003 Files Modified

Date: 2026-08-06

## Governance Source

- `docs/governance/publishing/PUB-STD-Author-Copy-Policy.md`: amended to v1.1 and replaced fixed paperback/hardcover/eBook assumptions with the elected Product Form entitlement rule.

## Operating Documentation

- `docs/operations/JM1-Publishing-Enterprise-Operating-Manual-v1.0.md`: updated the Publishing Package Addendum section with the plain-language elected Product Form rule and executed-agreement preservation boundary.
- `docs/operations/publishing-successor-operations-hub/03-Standard-Operating-Procedures.md`: updated complimentary-copy and author-copy order SOPs to use package/track quantity plus elected Product Form delivery.
- `docs/operations/publishing-successor-operations-hub/04-Forms-and-Templates.md`: updated the addendum and complimentary-copy policy references to PUB-STD v1.1 and elected Product Form entitlements.
- `docs/operations/publishing-successor-operations-hub/Current-Authority-Index.md`: marked the Human Operating Layer as current after PR #433 and updated Author Copy Policy to PUB-STD v1.1.
- `docs/operations/publishing-successor-operations-hub/09-Reference-Library.md`: updated the author-copy policy reference to include elected Product Form entitlements.
- `docs/operations/publishing-successor-operations-hub/Role-Playbooks.md`: updated Financial and Royalty Support obligations to review author-copy obligations by elected Product Form.

## Website / Package Surface

- `lib/commercial/catalog.ts`: replaced fixed package copy quantities with per-elected-Product-Form entitlement policy data.
- `lib/tokens.ts`: exposed elected-Product-Form entitlement policy through package presentation tokens.
- `app/packages/page.tsx`: replaced fixed complimentary paperback/hardcover/eBook rows with print, digital, and audiobook entitlement language tied to elected Product Forms.

Public website source: CHANGED.

Public website deployment: NOT EXECUTED.

## Agreement / Package Generation References

- `azure-functions/diagnostic-ai-runner/src/agreement/authorCopyPolicy.js`: added package allocation authority, Product Form delivery-class mapping, elected-form entitlement computation, PF-07 fail-closed handling, PF-08 scope gating, duplicate-election idempotency, and later-added add-on approval checks.
- `azure-functions/diagnostic-ai-runner/src/agreement/agreementFieldComputer.js`: changed agreement field computation to require approved/elected Product Forms and return entitlement rows.
- `azure-functions/diagnostic-ai-runner/src/agreement/packageSpecificAddendumContent.js`: changed package content to compute entitlements from elected Product Forms.
- `azure-functions/diagnostic-ai-runner/src/agreement/simplifiedPackageAddendumGenerator.js`: changed generated addendum language and table output to enumerate only elected Product Forms and their entitlements.
- `azure-functions/diagnostic-ai-runner/src/agreement/simplifiedAgreementPacketRunner.js`: passed elected Product Forms through to addendum content and exposed entitlement rows in generated packet results.

## Regression Tests

- `azure-functions/diagnostic-ai-runner/test/authorCopyPolicy.test.js`: replaced fixed-format tests with the required elected Product Form scenario coverage.
- `azure-functions/diagnostic-ai-runner/test/agreementFieldComputer.test.js`: updated agreement computation tests to require elected Product Forms and verify entitlement rows.
- `azure-functions/diagnostic-ai-runner/test/packageSpecificAddendumContent.test.js`: updated package-content tests to consume elected Product Forms.
- `azure-functions/diagnostic-ai-runner/test/simplifiedAgreementPacketRunner.test.js`: updated generated-packet tests to verify elected-form entitlements.
- `azure-functions/diagnostic-ai-runner/test/agreementPreparationRunner.test.js`: updated legacy fixed-template fill expectations where the older table is still present.
- `azure-functions/diagnostic-ai-runner/test/simplifiedDocumentGenerators.test.js`: updated simplified generated-addendum fixtures to pass elected Product Forms under the v1.1 fail-closed rule.

## Validation Artifacts

- `docs/evidence/OR-2026-003/generated-validation-artifacts/amendment-1-elected-product-forms/document-generation-validation.json`: records generated DOCX/PDF validation for elected Product Form scenarios.
- `docs/evidence/OR-2026-003/generated-validation-artifacts/amendment-1-elected-product-forms/*.docx`: generated validation DOCX artifacts.
- `docs/evidence/OR-2026-003/generated-validation-artifacts/amendment-1-elected-product-forms/*.pdf`: generated validation PDF artifacts.
- `docs/evidence/OR-2026-003/amendment-1-executed-agreement-impact-report.md`: read-only executed-agreement impact review.
- `docs/evidence/OR-2026-003/amendment-1-validation-plan.md`: validation matrix for Amendment 1.
