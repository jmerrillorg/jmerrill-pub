import { createHash } from 'node:crypto'

import { getDataverseRuntimeAccessToken, getPublisherRuntimeAuthMode } from './publisher-runtime-auth'

const EXECUTION_STATUS = {
  SUCCESS: 835500001,
  FAILED: 835500002,
} as const

const BAND_LEVEL = {
  BAND_1: 835500000,
} as const

type AuthorOnboardingDataverseResult =
  | {
      status: 'success'
      submissionId: string | null
      executionLogId: string | null
      detail: string
    }
  | {
      status: 'failed' | 'skipped'
      submissionId: null
      executionLogId: null
      detail: string
    }

type DataverseConfig = {
  apiBase: string
  resourceUrl: string
  tenantId: string
  clientId: string
  clientSecret: string
  authMode: 'LEGACY_CLIENT_CREDENTIAL' | 'MANAGED_IDENTITY'
}

const GENRE_OPTIONS: Record<string, number> = {
  fiction: 196650000,
  trade: 196650001,
  biography_memoir: 196650002,
  poetry: 196650003,
  childrens: 196650004,
  christian_faith: 196650006,
  inspirational: 196650006,
  business: 196650007,
  academic: 196650008,
  other: 196650010,
  devotional: 196650012,
}

const WORKFLOW_STAGE_AUTHOR_ONBOARDING = 196650008

export async function writeAuthorOnboardingDataverseFallback(
  payload: Record<string, any>,
  failureDetail: string,
): Promise<AuthorOnboardingDataverseResult> {
  const config = getDataverseConfig()
  if (!config) {
    return {
      status: 'skipped',
      submissionId: null,
      executionLogId: null,
      detail: 'Dataverse fallback skipped because website Dataverse settings are incomplete.',
    }
  }

  try {
    const token = await getDataverseToken(config)
    const submittedAt = new Date().toISOString()
    const submissionId = deterministicGuid(buildSubmissionIdentity(payload))
    const executionLogId = deterministicGuid(`execution:${submissionId}`)
    const submissionPayload = buildSubmissionPayload(payload, submittedAt)
    const submission = await upsertDataverseRecord(config, token, 'jm1pub_submissions', submissionId, submissionPayload)
    const executionLog = await upsertDataverseRecord(config, token, 'jm1_executionlogs', executionLogId, {
      jm1_name: `AUTHOR-ONBOARDING-${submissionId}`,
      jm1_actiondescription:
        'Author onboarding submitted through website Dataverse fallback after Power Automate onboarding ingestion failed. No payment, contract, royalty, production, distribution, or workspace movement action was performed.',
      jm1_actiontype: 'AUTHOR_ONBOARDING_SUBMITTED',
      jm1_agentname: 'jmerrill.pub',
      jm1_bandlevel: BAND_LEVEL.BAND_1,
      jm1_executionstatus: EXECUTION_STATUS.SUCCESS,
      jm1_startedon: submittedAt,
      jm1_completedon: new Date().toISOString(),
      jm1_sourceentity: 'jm1pub_submission',
      jm1_sourcerecordid: submissionId,
      jm1_errordetail: safeDetail(failureDetail),
    })

    return {
      status: 'success',
      submissionId: submission.id,
      executionLogId: executionLog.id,
      detail: submission.replay
        ? 'The existing governed author onboarding submission was returned without creating a duplicate.'
        : 'Author onboarding was written directly to Dataverse after route-specific Power Automate ingestion was unavailable.',
    }
  } catch (error) {
    return {
      status: 'failed',
      submissionId: null,
      executionLogId: null,
      detail: `Dataverse fallback failed: ${safeDetail(error instanceof Error ? error.message : String(error))}`,
    }
  }
}

function buildSubmissionPayload(payload: Record<string, any>, submittedAt: string) {
  const genreValue = GENRE_OPTIONS[String(payload.genreKey || '').toLowerCase()] || GENRE_OPTIONS.other
  const authority = payload.governedAuthority || {}

  return removeNullish({
    jm1pub_submissionname: `${stringValue(payload.authorName)} - ${stringValue(payload.bookTitle)}`.slice(0, 200),
    jm1pub_firstname: stringValue(payload.firstName || payload.author?.firstName || payload.authorName),
    jm1pub_lastname: stringValue(payload.lastName || payload.author?.lastName || payload.legalName || payload.authorName),
    jm1pub_email: stringValue(payload.email || payload.author?.email),
    jm1pub_phone: stringValue(payload.phone || payload.author?.phone),
    jm1pub_booktitle: stringValue(payload.bookTitle || payload.book?.title),
    jm1pub_genre: genreValue,
    jm1pub_formsource: 'private-author-onboarding',
    jm1pub_formtype: 'author-onboarding',
    jm1pub_internalclassification: stringValue(payload.internalClassification?.label || 'Other'),
    jm1pub_legalname: stringValue(payload.legalName),
    jm1pub_mailingaddress: stringValue(payload.mailingAddress),
    jm1pub_onboardingcompletedat: submittedAt,
    jm1pub_primarygoal: stringValue(payload.publishingGoal),
    jm1pub_recipient: 'publishing@jmerrill.one',
    jm1pub_rightsholderconfirmed: payload.rightsHolderConfirmed === true,
    jm1pub_route: '/author/onboarding',
    jm1pub_shortdescription: stringValue(payload.shortDescription),
    jm1pub_source: 'private-author-onboarding',
    jm1pub_submittedat: submittedAt,
    jm1pub_targetaudience: stringValue(payload.targetAudience),
    jm1pub_timezone: stringValue(payload.timezone || payload.author?.timezone),
    jm1pub_wordcount: stringValue(payload.estimatedWords || payload.book?.estimatedWords),
    jm1pub_workflowstage: WORKFLOW_STAGE_AUTHOR_ONBOARDING,
    jm1pub_rawpayload: JSON.stringify(payload),
    ...(authority.contactId
      ? { 'jm1pub_LinkedContact@odata.bind': `/contacts(${authority.contactId})` }
      : {}),
  })
}

function buildSubmissionIdentity(payload: Record<string, any>) {
  const authority = payload.governedAuthority || {}
  return [
    authority.policyVersion || 'AUTHOR_ONBOARDING_CONTINUITY_V1',
    authority.contactId || payload.email || '',
    authority.titleId || payload.bookTitle || '',
    authority.engagementId || '',
  ].join(':').toLowerCase()
}

function deterministicGuid(value: string) {
  const hex = createHash('sha256').update(value, 'utf8').digest('hex').slice(0, 32).split('')
  hex[12] = '5'
  hex[16] = ((Number.parseInt(hex[16], 16) & 0x3) | 0x8).toString(16)
  return `${hex.slice(0, 8).join('')}-${hex.slice(8, 12).join('')}-${hex.slice(12, 16).join('')}-${hex.slice(16, 20).join('')}-${hex.slice(20, 32).join('')}`
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

async function upsertDataverseRecord(
  config: DataverseConfig,
  token: string,
  entitySet: string,
  id: string,
  payload: Record<string, unknown>,
) {
  const response = await fetch(`${config.apiBase}/${entitySet}(${id})`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'If-None-Match': '*',
      Prefer: 'return=representation',
    },
    body: JSON.stringify(payload),
  })

  if (response.status === 412) return { id, replay: true }
  const body = await response.json().catch(() => ({}))
  if (!response.ok) {
    const message = body?.error?.message || `dataverse_write_failed:${response.status}`
    throw new Error(message)
  }
  return {
    id: body.jm1pub_submissionid || body.jm1_executionlogid || id,
    replay: false,
  }
}

function stringValue(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
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
    .slice(0, 1000)
}
