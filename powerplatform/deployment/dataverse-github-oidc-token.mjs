export async function dataverseGithubOidcToken({ environmentUrl, applicationId, tenantId }) {
  const requestUrl = process.env.ACTIONS_ID_TOKEN_REQUEST_URL
  const requestToken = process.env.ACTIONS_ID_TOKEN_REQUEST_TOKEN
  if (!requestUrl || !requestToken) throw Error('GITHUB_OIDC_UNAVAILABLE')
  const url = new URL(requestUrl)
  url.searchParams.set('audience', 'api://AzureADTokenExchange')
  const assertionResponse = await fetch(url, { headers: { Authorization: `Bearer ${requestToken}` }, signal: AbortSignal.timeout(30000) })
  if (!assertionResponse.ok) throw Error(`GITHUB_OIDC_HTTP_${assertionResponse.status}`)
  const assertion = (await assertionResponse.json()).value
  if (!assertion) throw Error('GITHUB_OIDC_ASSERTION_ABSENT')
  const response = await fetch(`https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: applicationId, scope: `${environmentUrl.replace(/\/$/, '')}/.default`, grant_type: 'client_credentials', client_assertion_type: 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer', client_assertion: assertion }),
    signal: AbortSignal.timeout(30000),
  })
  if (!response.ok) throw Error(`ENTRA_TOKEN_HTTP_${response.status}`)
  const token = (await response.json()).access_token
  if (!token) throw Error('ENTRA_TOKEN_ABSENT')
  console.log(`::add-mask::${token}`)
  return token
}
