# OR-2026-003 Validation Results

Date: 2026-08-06

## Search Validation

Repository search for `complimentary`, `author copies`, and `included copies` now immediately finds:

- `docs/governance/publishing/PUB-STD-Author-Copy-Policy.md`
- `docs/operations/JM1-Publishing-Enterprise-Operating-Manual-v1.0.md`
- website package references
- agreement/package generation references

## Conflict Validation

The targeted conflict search found no remaining active `hardcover: 4`, `"hardcover": 4`, `15, hardcover: 4`, or `default of 10` quantity references in active package/agreement policy paths.

The remaining `COMPLIMENTARY_COPIES_NOT_DEFINED_FOR_PACKAGE` string is a validation error for unrecognized or unsupported package codes, not a conflicting package quantity.

## Policy Alignment

Aligned policy values:

- Starter: 5 paperback / 0 hardcover / 1 eBook.
- Professional: 10 paperback / 2 hardcover / 1 eBook.
- Premier Publishing Package: 15 paperback / 5 hardcover / 1 eBook.
- JM Signature traditional publishing track: 15 paperback / 5 hardcover / 1 eBook where the traditional publishing agreement grants the author-copy benefit.

## Document Coverage

- Canonical governance document: PASS.
- Operating Manual reference: PASS.
- Public package matrix: PASS.
- Agreement field computation: PASS.
- Package addendum content: PASS.
- Tests updated for governed quantities: PASS.

## Test Validation

- `npm ci` at repository root under Node v24.11.0: PASS.
- `npm ci` in `azure-functions/diagnostic-ai-runner` under Node v24.11.0: PASS.
- `npm run type-check` at repository root under Node v24.11.0: PASS.
- `node --check azure-functions/diagnostic-ai-runner/src/agreement/authorCopyPolicy.js`: PASS.
- `node --check azure-functions/diagnostic-ai-runner/src/agreement/agreementFieldComputer.js`: PASS.
- `node --check azure-functions/diagnostic-ai-runner/src/agreement/packageSpecificAddendumContent.js`: PASS.
- `node --check azure-functions/diagnostic-ai-runner/src/agreement/governedAgreementPipelineRunner.js`: PASS.
- Full agreement/document-generation test group under Node v24.11.0: PASS, 191 / 191.

## Generated DOCX / PDF Validation

Generated validation artifacts are stored under `generated-validation-artifacts/`.

The validation generated DOCX and PDF outputs for every policy case and extracted the copy rows from the generated DOCX content:

- Starter: DOCX PASS / PDF PASS / extracted rows `Paperback 5`, `Hardcover 0`, `eBook (digital delivery) 1`.
- Professional: DOCX PASS / PDF PASS / extracted rows `Paperback 10`, `Hardcover 2`, `eBook (digital delivery) 1`.
- Premier Publishing Package: DOCX PASS / PDF PASS / extracted rows `Paperback 15`, `Hardcover 5`, `eBook (digital delivery) 1`.
- JM Signature traditional publishing track: DOCX PASS / PDF PASS / extracted rows `Paperback 15`, `Hardcover 5`, `eBook (digital delivery) 1`.

The JM Signature validation consumes the governed policy as a distinct traditional-track entitlement check; it does not relabel JM Signature as the Premier package.

## Boundaries Preserved

- Author communications sent: 0.
- Runtime activation: 0.
- Client-title automation thaw: 0.
- Dataverse schema changes: 0.
- Business Central changes: 0.
- Public website source: CHANGED.
- Public website deployment: NOT EXECUTED.
