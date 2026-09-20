import { getDataverseRuntimeAccessToken, getPublisherRuntimeAuthMode } from './publisher-runtime-auth'

const EXECUTION_STATUS = {
  SUCCESS: 835500001,
  FAILED: 835500002,
} as const

const BAND_LEVEL = {
  BAND_1: 835500000,
} as const

const FIRST_PAYMENT_STATUS = {
  PAID_CONFIRMED: 835510002,
} as const

const FIRST_PAYMENT_CONFIRMATION_SOURCE = {
  STRIPE_LIVE_APPROVED: 835511002,
} as const

type DataverseConfig = {
  apiBase: string
  resourceUrl: string
  tenantId: string
  clientId: string
  clientSecret: string
  authMode: 'LEGACY_CLIENT_CREDENTIAL' | 'MANAGED_IDENTITY'
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
      jm1_m6firstpaymentstatus: FIRST_PAYMENT_STATUS.PAID_CONFIRMED,
      jm1_m6firstpaymentconfirmedon: confirmedOn,
      jm1_m6firstpaymentconfirmationsource: FIRST_PAYMENT_CONFIRMATION_SOURCE.STRIPE_LIVE_APPROVED,
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

export async function findSafeExecutionLogByName(name: string) {
  const config = getDataverseConfig()
  if (!config) return null
  const token = await getDataverseToken(config)
  const escaped = name.replace(/'/g, "''").slice(0, 200)
  const query = new URLSearchParams({
    '$select': 'jm1_executionlogid,jm1_name,jm1_actiontype,jm1_sourcerecordid,createdon',
    '$filter': `jm1_name eq '${escaped}'`,
    '$orderby': 'createdon desc',
    '$top': '1',
  })
  const response = await fetch(`${config.apiBase}/jm1_executionlogs?${query}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
    cache: 'no-store',
  })
  const body = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(body?.error?.code || `dataverse_execution_log_lookup_failed:${response.status}`)
  return Array.isArray(body.value) ? body.value[0] || null : null
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
  const authMode = getPublisherRuntimeAuthMode()

  if (!apiBase || !resourceUrl) return null
  if (authMode === 'LEGACY_CLIENT_CREDENTIAL' && (!tenantId || !clientId || !clientSecret)) return null
  return {
    apiBase: apiBase.replace(/\/$/, ''),
    resourceUrl: resourceUrl.replace(/\/$/, ''),
    tenantId,
    clientId,
    clientSecret,
    authMode,
  }
}

async function getDataverseToken(config: DataverseConfig) {
  return getDataverseRuntimeAccessToken(config.resourceUrl)
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
