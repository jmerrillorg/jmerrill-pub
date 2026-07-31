# Post-Retirement Validation

## Reference Scan

| Check | Result |
|---|---|
| WEBSITE_RUN_FROM_PACKAGE on func-jm1-acs-email-relay | ABSENT |
| WEBSITE_RUN_FROM_PACKAGE on func-jm1-diagnostic-ai-runner | ABSENT |
| SAS-bearing app settings | 0 |
| Package URL app settings | 0 |
| Slots referencing old package | 0 |
| Key Vault package/SAS hits | 0 |
| GitHub secret-name hits | 0 |
| Committed SAS-bearing package URLs | 0 |

## Runtime Validation

| Function App | Indexed Functions | Protected Route Probe | Result |
|---|---:|---|---|
| func-jm1-acs-email-relay | 5/5 | POST /api/send-approved-author-response without key returned 401 | PASS |
| func-jm1-diagnostic-ai-runner | 24/24 | POST /api/run-stage0-diagnostic without key returned 401 | PASS |

## Application Insights Window

Query window: approximately 45 minutes after retirement.

| Function App | Warnings | Errors | Exceptions | Package/mount errors | Storage auth errors |
|---|---:|---:|---:|---:|---:|
| func-jm1-acs-email-relay | 1 | 0 | 0 | 0 | 0 |
| func-jm1-diagnostic-ai-runner | 1 | 0 | 0 | 0 | 0 |

No package-mount recurrence, startup/indexing failure, or storage-auth failure was observed in the validation window.

## Operational Boundary

No duplicate email was sent. No editorial package or author communication was duplicated. Live protected routes were checked without credentials and failed closed.

## Repository Validation

| Command | Result |
|---|---|
| npm run functions-package-access-guard | PASS |
| npm test in azure-functions/acs-email-relay | PASS, 43/43 |
| npm test in azure-functions/diagnostic-ai-runner | PASS, 1757/1757 |
| node scripts/publishing_email_canon.test.mjs | PASS, 5/5 |
| node scripts/email_header_policy.test.mjs | PASS |
| git diff --check | PASS |
| changed-file secret scan | PASS, 0 hits |
| evidence checksum validation | PASS |
