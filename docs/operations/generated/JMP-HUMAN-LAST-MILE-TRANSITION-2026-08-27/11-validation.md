# Validation

Last Verified: 2026-08-27T11:06:33Z

## Passed

- `node --test scripts/author_review_package_engine.test.mjs`: 30 / 30 PASS
- `node scripts/author_package_notification_engine.test.mjs`: PASS
- `npm run type-check`: PASS
- `npm run lint`: PASS with existing Next font warning
- `npm run author-communication-brand-guard`: 10 / 10 PASS
- `node --test azure-functions/diagnostic-ai-runner/test/editorialCadenceReleaseConsumer.test.js azure-functions/diagnostic-ai-runner/test/editorialPackageHandoffConsumer.test.js azure-functions/diagnostic-ai-runner/test/authorReviewResponseConsumer.test.js`: 73 / 73 PASS
- `npm --prefix azure-functions/acs-email-relay test`: 90 / 90 PASS
- GitHub PR #663 Validate and package: PASS
- GitHub main Premium App Service deployment: PASS
- Diagnostic Runner manual health readback: PASS
- ACS Email Relay manual Function App readback: PASS

## Environment Notes

- Repository root `npm ci` completed with Node engine warning because local Node is v26.0.0 and repository declares Node 24.
- Diagnostic Runner `npm ci` completed with Node engine warning because local Node is v26.0.0 and the package declares `>=22 <25`.
- `npm run lint` reported the existing Next custom-font warning in `app/layout.tsx`.
- Diagnostic Runner dependency install reported audit findings; no dependency mutation or audit fix was authorized.
- GitHub ACS Email Relay deployment failed after tests/lint/audit because the GitHub OIDC principal lacked `Microsoft.Web/sites/read` for `func-jm1-acs-email-relay`. Manual deployment under local `jm1-admin` succeeded.

## Non-Behavioral Test Caveat

A bundled ad hoc multi-file test command failed when one test hit Node ESM extensionless import resolution without the local shim created by another test. The canonical repo script `author-communication-brand-guard` passed, and the focused behavior tests above passed.
