type RuntimeAuthMode = 'LEGACY_CLIENT_CREDENTIAL' | 'MANAGED_IDENTITY'
type RuntimeAuthority = 'DATAVERSE' | 'GRAPH_SHAREPOINT'

type RuntimeTokenDeps = {
  env?: NodeJS.ProcessEnv
  fetchImpl?: typeof fetch
  telemetry?: (event: RuntimeAuthTelemetry) => void
}

export type RuntimeAuthTelemetry = {
  authority: RuntimeAuthority
  mode: RuntimeAuthMode
  resourceHost: string
  provider: 'managed_identity' | 'legacy_client_credential'
  result: 'success' | 'failed'
  safeCode?: string
}

type LegacyCredentialConfig = {
  tenantId: string
  clientId: string
  clientSecret: string
}

type ManagedIdentityConfig =
  | {
      endpointKind: 'IDENTITY_ENDPOINT'
      endpoint: string
      header: string
      clientId?: string
    }
  | {
      endpointKind: 'MSI_ENDPOINT'
      endpoint: string
      secret: string
      clientId?: string
    }

export function getPublisherRuntimeAuthMode(env: NodeJS.ProcessEnv = process.env): RuntimeAuthMode {
  const mode = (env.PUBLISHER_RUNTIME_AUTH_MODE || 'LEGACY_CLIENT_CREDENTIAL').trim().toUpperCase()
  if (mode === 'MANAGED_IDENTITY') return 'MANAGED_IDENTITY'
  if (mode === 'LEGACY_CLIENT_CREDENTIAL' || mode === 'LEGACY' || mode === 'CLIENT_CREDENTIAL') {
    return 'LEGACY_CLIENT_CREDENTIAL'
  }
  throw Object.assign(new Error(`Unsupported publisher runtime auth mode: ${mode}`), {
    safeCode: 'PUBLISHER_RUNTIME_AUTH_MODE_INVALID',
  })
}

export async function getDataverseRuntimeAccessToken(resourceUrl: string, deps: RuntimeTokenDeps = {}) {
  return getPublisherRuntimeAccessToken({
    authority: 'DATAVERSE',
    resource: normalizeResource(resourceUrl),
    legacy: legacyDataverseConfig,
    deps,
  })
}

export async function getGraphSharePointRuntimeAccessToken(deps: RuntimeTokenDeps = {}) {
  return getPublisherRuntimeAccessToken({
    authority: 'GRAPH_SHAREPOINT',
    resource: 'https://graph.microsoft.com',
    legacy: legacyGraphSharePointConfig,
    deps,
  })
}

export function getPublisherRuntimeAuthReadback(env: NodeJS.ProcessEnv = process.env) {
  const mode = getPublisherRuntimeAuthMode(env)
  return {
    mode,
    dataverseLegacySecretRequired: mode === 'LEGACY_CLIENT_CREDENTIAL',
    graphSharePointLegacySecretRequired: mode === 'LEGACY_CLIENT_CREDENTIAL',
    managedIdentityEndpointPresent: Boolean(env.IDENTITY_ENDPOINT || env.MSI_ENDPOINT),
    managedIdentityHeaderPresent: Boolean(env.IDENTITY_HEADER || env.MSI_SECRET),
    managedIdentityClientIdPresent: Boolean(env.PUBLISHER_MANAGED_IDENTITY_CLIENT_ID),
    silentSecretFallback: false,
  }
}

async function getPublisherRuntimeAccessToken(input: {
  authority: RuntimeAuthority
  resource: string
  legacy: (env: NodeJS.ProcessEnv) => LegacyCredentialConfig
  deps: RuntimeTokenDeps
}) {
  const env = input.deps.env || process.env
  const fetchImpl = input.deps.fetchImpl || fetch
  const mode = getPublisherRuntimeAuthMode(env)
  const resourceHost = safeHost(input.resource)

  try {
    const token =
      mode === 'MANAGED_IDENTITY'
        ? await acquireManagedIdentityToken(input.resource, managedIdentityConfig(env), fetchImpl)
        : await acquireClientCredentialToken(input.resource, input.legacy(env), fetchImpl)

    emitTelemetry(input.deps.telemetry, {
      authority: input.authority,
      mode,
      resourceHost,
      provider: mode === 'MANAGED_IDENTITY' ? 'managed_identity' : 'legacy_client_credential',
      result: 'success',
    })
    return token
  } catch (error) {
    emitTelemetry(input.deps.telemetry, {
      authority: input.authority,
      mode,
      resourceHost,
      provider: mode === 'MANAGED_IDENTITY' ? 'managed_identity' : 'legacy_client_credential',
      result: 'failed',
      safeCode: safeCode(error),
    })
    throw error
  }
}

async function acquireClientCredentialToken(
  resource: string,
  config: LegacyCredentialConfig,
  fetchImpl: typeof fetch,
) {
  if (!config.tenantId || !config.clientId || !config.clientSecret) {
    throw Object.assign(new Error('Legacy client credential settings are incomplete.'), {
      safeCode: 'LEGACY_CLIENT_CREDENTIAL_CONFIG_MISSING',
    })
  }

  const response = await fetchImpl(`https://login.microsoftonline.com/${config.tenantId}/oauth2/v2.0/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: config.clientId,
      client_secret: config.clientSecret,
      scope: `${resource}/.default`,
    }),
  })
  const token = await tokenFromResponse(response)
  if (!token) {
    throw Object.assign(new Error(`Legacy token acquisition failed: ${response.status}`), {
      safeCode: 'LEGACY_CLIENT_CREDENTIAL_TOKEN_FAILED',
      status: response.status,
    })
  }
  return token
}

async function acquireManagedIdentityToken(
  resource: string,
  config: ManagedIdentityConfig,
  fetchImpl: typeof fetch,
) {
  const url = new URL(config.endpoint)
  url.searchParams.set('resource', resource)

  const headers: Record<string, string> = {
    Accept: 'application/json',
  }

  if (config.endpointKind === 'IDENTITY_ENDPOINT') {
    url.searchParams.set('api-version', '2019-08-01')
    headers['X-IDENTITY-HEADER'] = config.header
    if (config.clientId) url.searchParams.set('client_id', config.clientId)
  } else {
    url.searchParams.set('api-version', '2017-09-01')
    headers.Secret = config.secret
    if (config.clientId) url.searchParams.set('clientid', config.clientId)
  }

  const response = await fetchImpl(url.toString(), {
    method: 'GET',
    headers,
  })
  const token = await tokenFromResponse(response)
  if (!token) {
    throw Object.assign(new Error(`Managed identity token acquisition failed: ${response.status}`), {
      safeCode: 'MANAGED_IDENTITY_TOKEN_FAILED',
      status: response.status,
    })
  }
  return token
}

async function tokenFromResponse(response: Response) {
  const json = (await response.json().catch(() => null)) as { access_token?: unknown } | null
  if (!response.ok || typeof json?.access_token !== 'string' || !json.access_token) return ''
  return json.access_token
}

function managedIdentityConfig(env: NodeJS.ProcessEnv): ManagedIdentityConfig {
  const appServiceEndpoint = clean(env.IDENTITY_ENDPOINT)
  const appServiceHeader = clean(env.IDENTITY_HEADER)
  const legacyEndpoint = clean(env.MSI_ENDPOINT)
  const legacySecret = clean(env.MSI_SECRET)
  const clientId = clean(env.PUBLISHER_MANAGED_IDENTITY_CLIENT_ID)

  if (appServiceEndpoint && appServiceHeader) {
    return {
      endpointKind: 'IDENTITY_ENDPOINT',
      endpoint: appServiceEndpoint,
      header: appServiceHeader,
      clientId: clientId || undefined,
    }
  }

  if (legacyEndpoint && legacySecret) {
    return {
      endpointKind: 'MSI_ENDPOINT',
      endpoint: legacyEndpoint,
      secret: legacySecret,
      clientId: clientId || undefined,
    }
  }

  throw Object.assign(new Error('Managed identity endpoint settings are not present.'), {
    safeCode: 'MANAGED_IDENTITY_ENDPOINT_MISSING',
  })
}

function legacyDataverseConfig(env: NodeJS.ProcessEnv): LegacyCredentialConfig {
  return {
    tenantId: clean(env.DATAVERSE_TENANT_ID),
    clientId: clean(env.DATAVERSE_CLIENT_ID),
    clientSecret: clean(env.DATAVERSE_CLIENT_SECRET),
  }
}

function legacyGraphSharePointConfig(env: NodeJS.ProcessEnv): LegacyCredentialConfig {
  return {
    tenantId: clean(env.GRAPH_TENANT_ID) || clean(env.SHAREPOINT_TENANT_ID) || clean(env.DATAVERSE_TENANT_ID),
    clientId: clean(env.GRAPH_CLIENT_ID) || clean(env.SHAREPOINT_CLIENT_ID) || clean(env.DATAVERSE_CLIENT_ID),
    clientSecret: clean(env.GRAPH_CLIENT_SECRET) || clean(env.SHAREPOINT_CLIENT_SECRET) || clean(env.DATAVERSE_CLIENT_SECRET),
  }
}

function normalizeResource(value: string) {
  const normalized = clean(value).replace(/\/+$/, '')
  if (!normalized) {
    throw Object.assign(new Error('Resource URL is required.'), {
      safeCode: 'AUTH_RESOURCE_MISSING',
    })
  }
  return normalized
}

function clean(value?: string) {
  return value?.trim() || ''
}

function safeHost(value: string) {
  try {
    return new URL(value).host
  } catch {
    return 'unknown'
  }
}

function safeCode(error: unknown) {
  return typeof error === 'object' && error && 'safeCode' in error ? String(error.safeCode || '') : 'AUTH_TOKEN_FAILED'
}

function emitTelemetry(telemetry: RuntimeTokenDeps['telemetry'], event: RuntimeAuthTelemetry) {
  if (telemetry) telemetry(event)
}
