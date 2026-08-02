# Azure Functions Package-Access Hygiene

Package: AZURE-FUNCTIONS-PACKAGE-ACCESS-HYGIENE-2026-07-30
Authority: Jackie governed authorization
Execution mode: Narrow credential hygiene remediation
Execution date: 2026-07-30
Subscription: 9ee13245-2303-4010-8b6d-35f7cbcfdc0e
Tenant: 352d075e-8e17-4169-9f8e-22e6946ce66d
Operator account: jm1-admin@jmerrill.one

## Scope

This package covers only the prior Azure Functions remote-package deployment path and SAS-bearing package-access hygiene associated with:

- func-jm1-acs-email-relay
- func-jm1-diagnostic-ai-runner

Editorial email remediation remains closed and was not reopened. No production email content was changed and Atta's replacement message was not resent.

## Boundaries Preserved

- No SAS value, account key, connection string, token, publishing profile, or package URL with credentials is retained in this package.
- No Dataverse editorial state, author relationship, Stripe, Business Central, or author-facing workflow was changed.
- No storage account, container, unrelated package, or governed evidence was deleted.
- No .codex-tmp cleanup was performed.

