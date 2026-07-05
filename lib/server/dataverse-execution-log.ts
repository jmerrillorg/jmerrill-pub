const EXECUTION_STATUS = {
  SUCCESS: 835500001,
  FAILED: 835500002,
} as const

const BAND_LEVEL = {
  BAND_1: 835500000,
} as const

type DataverseConfig = {
  apiBase: string
  resourceUrl: string
  tenantId: string
  clientId: string
  clientSecret: string
}

type ExecutionLogInput = {
  name: string
  actionType: string
  description: string
  status?: 'success' | 'failed'
  sourceEntity?: string
  sourceRecordId?: string
}

export async function updateCommissioningOpportunityPaymentStatus(input: {
  status: 'confirmed'
  source: string
  confirmedOn?: string
}) {
  const opportunityId = process.env.JM1_STRIPE_COMMISSIONING_OPPORTUNITY_ID
  if (!opportunityId) {
    return { updated: false, id: null, detail: 'Commissioning Opportunity ID is not configured.' }
  }

  const config = getDataverseConfig()
  if (!config) {
    return { updated: false, id: opportunityId, detail: 'Dataverse settings are incomplete.' }
  }

  const confirmedOn = input.confirmedOn || new Date().toISOString()
  const token = await getDataverseToken(config)
  const response = await fetch(`${config.apiBase}/opportunities(${opportunityId})`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify({
      jm1_m6firstpaymentstatus: input.status === 'confirmed' ? 'PAYMENT_CONFIRMED' : input.status,
      jm1_m6firstpaymentconfirmedon: confirmedOn,
      jm1_m6firstpaymentconfirmationsource: input.source,
    }),
  })

  if (!response.ok) {
    const body = await response.json().catch(() => ({}))
    throw new Error(body?.error?.code || `dataverse_opportunity_payment_status_failed:${response.status}`)
  }

  return { updated: true, id: opportunityId, detail: 'Opportunity first-payment status updated.' }
}

export async function writeSafeExecutionLog(input: ExecutionLogInput) {
  const config = getDataverseConfig()
  if (!config) {
    return { created: false, id: null, detail: 'Dataverse execution-log settings are incomplete.' }
  }

  const completedAt = new Date().toISOString()
  const token = await getDataverseToken(config)
  const response = await fetch(`${config.apiBase}/jm1_executionlogs`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Prefer: 'return=representation',
    },
    body: JSON.stringify(removeNullish({
      jm1_name: input.name.slice(0, 200),
      jm1_actiontype: input.actionType,
      jm1_actiondescription: safeDetail(input.description),
      jm1_agentname: 'jmerrill.pub',
      jm1_agentmodel: 'author-workspace-stripe-gate',
      jm1_bandlevel: BAND_LEVEL.BAND_1,
      jm1_executionstatus: input.status === 'failed' ? EXECUTION_STATUS.FAILED : EXECUTION_STATUS.SUCCESS,
      jm1_startedon: completedAt,
      jm1_completedon: completedAt,
      jm1_sourceentity: input.sourceEntity,
      jm1_sourcerecordid: input.sourceRecordId,
    })),
  })

  const body = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(body?.error?.code || `dataverse_execution_log_failed:${response.status}`)
  }

  return { created: true, id: body.jm1_executionlogid || null, detail: 'Execution log written.' }
}

function getDataverseConfig(): DataverseConfig | null {
  const apiBase =
    process.env.DATAVERSE_WEB_API_BASE_URL ||
    (process.env.DATAVERSE_ENVIRONMENT_URL
      ? `${process.env.DATAVERSE_ENVIRONMENT_URL.replace(/\/$/, '')}/api/data/v9.2`
      : '')
  const resourceUrl = process.env.DATAVERSE_RESOURCE_URL || process.env.DATAVERSE_ENVIRONMENT_URL || ''
  const tenantId = process.env.DATAVERSE_TENANT_ID || ''
  const clientId = process.env.DATAVERSE_CLIENT_ID || ''
  const clientSecret = process.env.DATAVERSE_CLIENT_SECRET || ''

  if (!apiBase || !resourceUrl || !tenantId || !clientId || !clientSecret) return null
  return {
    apiBase: apiBase.replace(/\/$/, ''),
    resourceUrl: resourceUrl.replace(/\/$/, ''),
    tenantId,
    clientId,
    clientSecret,
  }
}

async function getDataverseToken(config: DataverseConfig) {
  const response = await fetch(`https://login.microsoftonline.com/${config.tenantId}/oauth2/v2.0/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      scope: `${config.resourceUrl}/.default`,
      grant_type: 'client_credentials',
    }),
  })

  if (!response.ok) throw new Error(`dataverse_token_failed:${response.status}`)
  const body = await response.json()
  if (!body.access_token) throw new Error('dataverse_token_missing')
  return body.access_token as string
}

function removeNullish(input: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(input).filter(([, value]) => value !== null && value !== undefined && value !== ''),
  )
}

function safeDetail(value: string) {
  return value
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[email-redacted]')
    .replace(/https:\/\/[^\s"']+/g, '[url-redacted]')
    .replace(/(acct|cs|evt|plink|price|prod|pi)_[A-Za-z0-9_]+/g, '[stripe-id]')
    .slice(0, 1000)
}
