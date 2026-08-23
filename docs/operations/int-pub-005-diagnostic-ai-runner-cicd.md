# INT-PUB-005 Diagnostic AI Runner CI/CD

## Authority

`jmerrillorg/jmerrill-pub` `main` is the production source authority for
`func-jm1-diagnostic-ai-runner`. The protected GitHub environment is
`jmerrill-pub-production`; production deployment requires its configured
reviewer approval and is restricted to pushes from `main`.

The deployment workflow is
`.github/workflows/diagnostic-ai-runner.yml`. It is the only supported
production deployment path for this Function App.

## Deployment Unit

The workflow packages only `azure-functions/diagnostic-ai-runner` from the
commit being built. The ZIP root contains `host.json`, `package.json`,
`package-lock.json`, and `src/`; it does not contain a nested
`azure-functions/diagnostic-ai-runner` directory, repository files, tests, or
`node_modules`.

The package is created with `git archive` using the commit timestamp as the
archive timestamp. The resulting artifact is retained as an immutable GitHub
Actions artifact.

## Validation And Deployment

Pull requests targeting `main` run `npm ci`, the package's complete `npm test`
suite, and `npm run lint`, then build-check the deployment ZIP. A push to
`main` repeats that validation, waits for the protected
`jmerrill-pub-production` approval, then deploys the exact validated artifact
to `func-jm1-diagnostic-ai-runner`.

The deployment job uses `azure/login@v3` with GitHub OIDC and
`Azure/functions-action@v1`. It does not use a publish profile or client
secret. After deployment it writes the commit SHA to both
`JM1_RELEASE_SHA` and `JM1_PRODUCTION_RELEASE_SHA`, checks that both values
match the workflow SHA, reads back the Function App state, runtime, and
deployed function catalog, and retains the evidence artifacts.

Azure currently exposes no `/api/health` function for this app. The safe
post-deployment health check is therefore the Azure Function App state
(`Running`) plus function-catalog readback confirming
`run-stage0-diagnostic` is present. No business-triggering endpoint is called.

The workflow intentionally preserves the existing Linux Node 22 runtime and
Y1 Consumption hosting plan.

## Node Policy

**CURRENT PLATFORM EXCEPTION**

Linux Consumption + Node 22

**TARGET MODERNIZATION**

Flex Consumption + Node 24

The target modernization is outside this CI/CD change and must not be mixed
into it.

## GitHub Configuration

Configure the `jmerrill-pub-production` environment with:

- Required reviewer protection.
- Administrator bypass disabled.
- Deployment branch restriction to `main`.
- Variables, not secrets:
  - `AZURE_CLIENT_ID`
  - `AZURE_TENANT_ID`
  - `AZURE_SUBSCRIPTION_ID`

These values are identifiers. No client secret or publish profile is used.

## Azure Identity And RBAC

Create one dedicated Entra application/service principal for this workflow,
named `jmerrill-pub-diagnostic-ai-runner-github`. Add one federated identity
credential with:

- Issuer: `https://token.actions.githubusercontent.com`
- Subject: `repo:jmerrillorg/jmerrill-pub:environment:jmerrill-pub-production`
- Audience: `api://AzureADTokenExchange`

Assign only the built-in `Website Contributor` role at this Function App
scope:

`/subscriptions/9ee13245-2303-4010-8b6d-35f7cbcfdc0e/resourceGroups/rg-jm1-ai/providers/Microsoft.Web/sites/func-jm1-diagnostic-ai-runner`

Do not grant subscription or resource-group `Contributor`, `Owner`,
`User Access Administrator`, or role-assignment permissions. The identity and
role assignment are created once by an authorized Azure administrator; the
workflow cannot grant itself access.

## Rollback

Every production deployment retains an artifact named
`diagnostic-ai-runner-${GITHUB_SHA}`. To roll back, identify the last known
good successful workflow run, download its immutable ZIP artifact, and run the
same deployment workflow against that artifact through the protected
`jmerrill-pub-production` approval. The rollback must also restore that
artifact's commit SHA in both release settings and must pass the same host and
readback checks.

Do not change the hosting plan, Node version, or unrelated Azure resources as
part of rollback. Record the failed deployment, selected prior SHA, approval,
readback, and health result in the workflow evidence.