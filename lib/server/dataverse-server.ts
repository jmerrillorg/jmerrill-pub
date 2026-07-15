const DEFAULT_RESOURCE_URL = 'https://jm1hq.crm.dynamics.com'
const ODATA_ANNOTATION = 'OData.Community.Display.V1.FormattedValue'

export type DataverseServerConfig = {
  tenantId: string
  clientId: string
  clientSecret: string
  resourceUrl: string
  webApiBaseUrl: string
}

type DataverseRow = Record<string, unknown>

export function getDataverseServerConfig(): DataverseServerConfig | null {
  const resourceUrl = cleanUrl(process.env.DATAVERSE_RESOURCE_URL || DEFAULT_RESOURCE_URL)
  const baseUrl = cleanUrl(
    process.env.DATAVERSE_WEB_API_BASE_URL ||
      process.env.DATAVERSE_ENVIRONMENT_URL ||
      (resourceUrl ? `${resourceUrl}/api/data/v9.2` : undefined),
  )

  const config = {
    tenantId: process.env.DATAVERSE_TENANT_ID?.trim() || '',
    clientId: process.env.DATAVERSE_CLIENT_ID?.trim() || '',
    clientSecret: process.env.DATAVERSE_CLIENT_SECRET?.trim() || '',
    resourceUrl,
    webApiBaseUrl: baseUrl?.endsWith('/api/data/v9.2') ? baseUrl : `${baseUrl}/api/data/v9.2`,
  }

  if (!config.tenantId || !config.clientId || !config.clientSecret || !config.resourceUrl || !config.webApiBaseUrl) {
    return null
  }

  return config
}

export async function dataverseList(
  config: DataverseServerConfig,
  entitySet: string,
  params: Record<string, string | undefined>,
) {
  const token = await getDataverseAccessToken(config)
  const query = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value) query.set(key, value)
  })

  const response = await fetch(`${config.webApiBaseUrl}/${entitySet}?${query.toString()}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
      Prefer: `odata.include-annotations="${ODATA_ANNOTATION}"`,
      'OData-MaxVersion': '4.0',
      'OData-Version': '4.0',
    },
    cache: 'no-store',
  })

  if (!response.ok) {
    const text = await safeResponseText(response)
    throw new Error(`dataverse_query_failed:${entitySet}:${response.status}:${text.slice(0, 200)}`)
  }

  const json = (await response.json()) as { value?: DataverseRow[] }
  return Array.isArray(json.value) ? json.value : []
}

export async function dataverseFirst(
  config: DataverseServerConfig,
  entitySet: string,
  params: Record<string, string | undefined>,
) {
  const rows = await dataverseList(config, entitySet, { ...params, $top: params.$top || '1' })
  return rows[0] || null
}

export async function dataverseCreate(
  config: DataverseServerConfig,
  entitySet: string,
  payload: Record<string, unknown>,
) {
  const token = await getDataverseAccessToken(config)
  const response = await fetch(`${config.webApiBaseUrl}/${entitySet}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'OData-MaxVersion': '4.0',
      'OData-Version': '4.0',
    },
    body: JSON.stringify(payload),
    cache: 'no-store',
  })

  if (!response.ok) {
    const text = await safeResponseText(response)
    throw new Error(`dataverse_create_failed:${entitySet}:${response.status}:${text.slice(0, 200)}`)
  }

  return response.headers.get('OData-EntityId') || ''
}

export async function dataversePatch(
  config: DataverseServerConfig,
  entitySet: string,
  id: string,
  payload: Record<string, unknown>,
) {
  const token = await getDataverseAccessToken(config)
  const response = await fetch(`${config.webApiBaseUrl}/${entitySet}(${id})`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'OData-MaxVersion': '4.0',
      'OData-Version': '4.0',
    },
    body: JSON.stringify(payload),
    cache: 'no-store',
  })

  if (!response.ok) {
    const text = await safeResponseText(response)
    throw new Error(`dataverse_patch_failed:${entitySet}:${response.status}:${text.slice(0, 200)}`)
  }
}

export function dataverseFormatted(row: DataverseRow, logicalName: string, fallback = '') {
  return stringValue(row[`${logicalName}@${ODATA_ANNOTATION}`]) || fallback
}

export function dataverseLookupId(row: DataverseRow, field: string) {
  return stringValue(row[field])
}

export function stringValue(value: unknown) {
  return typeof value === 'string' ? value : ''
}

export function booleanValue(value: unknown) {
  return value === true
}

function cleanUrl(value?: string) {
  return value?.trim().replace(/\/+$/, '') || ''
}

async function getDataverseAccessToken(config: DataverseServerConfig) {
  const tokenUrl = `https://login.microsoftonline.com/${config.tenantId}/oauth2/v2.0/token`
  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: config.clientId,
    client_secret: config.clientSecret,
    scope: `${config.resourceUrl}/.default`,
  })

  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    },
    body,
  })

  const json = await response.json().catch(() => null)
  const token = json && typeof json === 'object' && 'access_token' in json ? String(json.access_token || '') : ''

  if (!response.ok || !token) {
    throw new Error(`dataverse_token_failed:${response.status}`)
  }

  return token
}

async function safeResponseText(response: Response) {
  try {
    return await response.text()
  } catch {
    return ''
  }
}
