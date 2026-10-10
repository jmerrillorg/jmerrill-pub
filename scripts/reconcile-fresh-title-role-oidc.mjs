import { dataverseGithubOidcToken } from './dataverse-github-oidc-token.mjs'

if (process.env.DATAVERSE_ACCESS_TOKEN) throw Error('PREEXISTING_TOKEN_NOT_PERMITTED')
if (process.env.PAC_APPLICATION_ID !== '97891ed1-6623-487c-b890-633bea440e22' ||
    process.env.PAC_TENANT_ID !== '352d075e-8e17-4169-9f8e-22e6946ce66d' ||
    process.env.DATAVERSE_ENVIRONMENT_URL !== 'https://jm1hq.crm.dynamics.com/' ||
    process.env.EXPECTED_ORGANIZATION_ID !== '9dafb403-b493-f011-a700-000d3a106f37') {
  throw Error('APPROVED_PRODUCTION_TOKEN_TARGET_MISMATCH')
}
try {
  process.env.DATAVERSE_ACCESS_TOKEN = await dataverseGithubOidcToken({
    environmentUrl: process.env.DATAVERSE_ENVIRONMENT_URL,
    applicationId: process.env.PAC_APPLICATION_ID,
    tenantId: process.env.PAC_TENANT_ID,
  })
  await import('./reconcile-fresh-title-role.mjs')
} finally {
  delete process.env.DATAVERSE_ACCESS_TOKEN
}
