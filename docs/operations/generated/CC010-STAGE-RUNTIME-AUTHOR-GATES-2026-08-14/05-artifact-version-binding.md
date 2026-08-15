# Artifact Version Binding

Last verified: 2026-08-14

## Binding Rule

Author approval is valid for stage progression only when it is bound to the exact approved deliverable artifact.

The runtime evaluates:

- `jm1pub_editorialartifactid`;
- `jm1pub_sha256`;
- `_jm1pub_deliverableartifactid_value`;
- `jm1pub_nextstageauthorized`;
- `jm1pub_authordecisionon`.

## Regression Coverage

Tests prove that a full approval bound to a stale or missing artifact does not authorize the next stage.

Evidence source:

- `azure-functions/diagnostic-ai-runner/test/editorialAuthorGatePolicy.test.js`
- `azure-functions/diagnostic-ai-runner/test/editorialExecutionRuntime.test.js`
