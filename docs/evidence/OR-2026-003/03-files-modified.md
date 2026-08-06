# OR-2026-003 Files Modified

Date: 2026-08-06

## Governance Source

- `docs/governance/publishing/PUB-STD-Author-Copy-Policy.md`: created canonical complimentary author-copy policy.

## Operating Documentation

- `docs/operations/JM1-Publishing-Enterprise-Operating-Manual-v1.0.md`: added reference to the governed author-copy policy in the Publishing Package Addendum section.

## Website / Package Surface

- `lib/commercial/catalog.ts`: added package complimentary-copy quantities to the commercial package projection.
- `lib/tokens.ts`: exposed complimentary-copy quantities through the package presentation projection.
- `app/packages/page.tsx`: rendered paperback, hardcover, and eBook complimentary-copy benefits from package data.

## Agreement / Package Generation References

- `azure-functions/diagnostic-ai-runner/src/agreement/authorCopyPolicy.js`: created agreement-side copy policy constants that reference the governed policy document.
- `azure-functions/diagnostic-ai-runner/src/agreement/agreementFieldComputer.js`: resolved complimentary-copy fields from the governed policy helper and enabled Starter copy values.
- `azure-functions/diagnostic-ai-runner/src/agreement/packageSpecificAddendumContent.js`: resolved package addendum copy values from the governed policy helper and added Starter package content.
- `azure-functions/diagnostic-ai-runner/src/agreement/governedAgreementPipelineRunner.js`: removed misleading universal “default of 10” wording from the merge-field label.

## Regression Tests

- `azure-functions/diagnostic-ai-runner/test/agreementFieldComputer.test.js`: updated Starter and Premier assertions.
- `azure-functions/diagnostic-ai-runner/test/authorCopyPolicy.test.js`: added direct policy assertions for Starter, Professional, Premier, and JM Signature.
- `azure-functions/diagnostic-ai-runner/test/packageSpecificAddendumContent.test.js`: added Starter assertion and updated Premier hardcover quantity.
- `azure-functions/diagnostic-ai-runner/test/simplifiedAgreementPacketRunner.test.js`: updated Premier assertion and validated Starter no-audiobook generation.

## Validation Artifacts

- `docs/evidence/OR-2026-003/generated-validation-artifacts/document-generation-validation.json`: recorded generated DOCX/PDF validation for Starter, Professional, Premier, and JM Signature.
- `docs/evidence/OR-2026-003/generated-validation-artifacts/*.docx`: generated validation DOCX artifacts.
- `docs/evidence/OR-2026-003/generated-validation-artifacts/*.pdf`: generated validation PDF artifacts.
