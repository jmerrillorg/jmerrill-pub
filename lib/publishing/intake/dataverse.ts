import type { NormalizedPublishingIntake } from './schema'
import {
  manuscriptTypeOptions,
  publishedBeforeOptions,
  productionWorkTypeOptions,
  publishingIntakeActivationBlockers,
  publishingIntakeDataverseMapping,
} from './dataverseMapping'

export const CONFIRMED_DATAVERSE_MAPPING_REQUIRED = publishingIntakeDataverseMapping

export type DataverseWriteResult =
  | { status: 'success'; recordId?: string; entityUrl?: string }
  | { status: 'skipped'; reason: 'non_production_mapping_pending' }
  | { status: 'failed'; reason: string; retryable: boolean }

export type DataverseUpdateResult =
  | { status: 'success' }
  | { status: 'skipped'; reason: 'non_production_mapping_pending' | 'missing_record_id' }
  | { status: 'failed'; reason: string; retryable: boolean }

export type DataverseReplayResult =
  | { status: 'found'; reference: string; recordId?: string }
  | { status: 'not_found' }
  | { status: 'skipped'; reason: 'non_production_mapping_pending' }
  | { status: 'failed'; reason: string; retryable: boolean }

const ACKNOWLEDGMENT_STATUS_SENT = 835500001
const WORKSPACE_STATUS_CREATED = 835513001

export async function writePublishingIntakeToDataverse(
  payload: NormalizedPublishingIntake,
): Promise<DataverseWriteResult> {
  const config = getDataverseConfig()

  if (!config.ok) {
    if (process.env.NODE_ENV !== 'production') {
      return { status: 'skipped', reason: 'non_production_mapping_pending' }
    }

    return {
      status: 'failed',
      reason: `dataverse_configuration_missing: ${config.missing.join(', ')}`,
      retryable: false,
    }
  }

  try {
    const accessToken = await getDataverseAccessToken(config.value)
    const response = await fetch(
      `${config.value.webApiBaseUrl}/${config.value.entitySet}`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'OData-MaxVersion': '4.0',
          'OData-Version': '4.0',
        },
        body: JSON.stringify(buildPublishingIntakeDataversePayload(payload)),
      },
    )

    if (response.status === 201 || response.status === 204) {
      const entityUrl = response.headers.get('OData-EntityId') || undefined
      return { status: 'success', entityUrl, recordId: extractDataverseRecordId(entityUrl) }
    }

    const errorBody = await safeResponseText(response)
    const dataverseError = summarizeDataverseError(errorBody)
    console.error('Publishing intake Dataverse create failed.', {
      status: response.status,
      errorCode: dataverseError.code,
      errorMessage: dataverseError.message,
      reference: payload.reference,
      entitySet: config.value.entitySet,
    })

    return {
      status: 'failed',
      reason: `dataverse_write_failed:${response.status}:${dataverseError.code}`,
      retryable: isRetryableStatus(response.status),
    }
  } catch (error) {
    const errorReason = summarizeWriteException(error)
    console.error('Publishing intake Dataverse write exception.', {
      reason: errorReason,
      reference: payload.reference,
      entitySet: config.ok ? config.value.entitySet : CONFIRMED_DATAVERSE_MAPPING_REQUIRED.table,
    })

    return {
      status: 'failed',
      reason: `dataverse_write_exception:${errorReason}`,
      retryable: true,
    }
  }
}

export async function writePublishingIntakeWithRetry(payload: NormalizedPublishingIntake) {
  let lastResult: DataverseWriteResult = { status: 'failed', reason: 'not_attempted', retryable: true }

  for (let attempt = 0; attempt < 3; attempt += 1) {
    lastResult = await writePublishingIntakeToDataverse(payload)
    if (lastResult.status === 'success' || lastResult.status === 'skipped' || !lastResult.retryable) {
      return lastResult
    }

    await wait(250 * (attempt + 1))
  }

  return lastResult
}

export async function findPublishingIntakeByIdempotencyKey(idempotencyKey: string): Promise<DataverseReplayResult> {
  const config = getDataverseConfig()

  if (!config.ok) {
    if (process.env.NODE_ENV !== 'production') {
      return { status: 'skipped', reason: 'non_production_mapping_pending' }
    }

    return {
      status: 'failed',
      reason: `dataverse_configuration_missing: ${config.missing.join(', ')}`,
      retryable: false,
    }
  }

  try {
    const accessToken = await getDataverseAccessToken(config.value)
    const columns = CONFIRMED_DATAVERSE_MAPPING_REQUIRED.columns
    const filter = `${columns.idempotencyKey} eq '${escapeODataString(idempotencyKey)}'`
    const query = new URLSearchParams({
      $select: `jm1_publishingintakeid,${columns.reference}`,
      $filter: filter,
      $top: '1',
    })
    const response = await fetch(
      `${config.value.webApiBaseUrl}/${config.value.entitySet}?${query.toString()}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/json',
          'OData-MaxVersion': '4.0',
          'OData-Version': '4.0',
        },
      },
    )

    if (!response.ok) {
      const errorBody = await safeResponseText(response)
      const dataverseError = summarizeDataverseError(errorBody)
      return {
        status: 'failed',
        reason: `dataverse_replay_lookup_failed:${response.status}:${dataverseError.code}`,
        retryable: isRetryableStatus(response.status),
      }
    }

    const json = await response.json().catch(() => null)
    const first = isRecord(json) && Array.isArray(json.value) ? json.value[0] : undefined
    if (!isRecord(first)) return { status: 'not_found' }

    const referenceValue = first[columns.reference]
    const reference = typeof referenceValue === 'string' ? referenceValue : ''
    return reference
      ? {
          status: 'found',
          reference,
          recordId: typeof first.jm1_publishingintakeid === 'string' ? first.jm1_publishingintakeid : undefined,
        }
      : { status: 'not_found' }
  } catch (error) {
    return {
      status: 'failed',
      reason: `dataverse_replay_lookup_exception:${summarizeWriteException(error)}`,
      retryable: true,
    }
  }
}

export async function markPublishingIntakeAcknowledgmentSent(
  recordId: string | undefined,
  sentAt = new Date().toISOString(),
): Promise<DataverseUpdateResult> {
  if (!recordId) return { status: 'skipped', reason: 'missing_record_id' }

  const config = getDataverseConfig()

  if (!config.ok) {
    if (process.env.NODE_ENV !== 'production') {
      return { status: 'skipped', reason: 'non_production_mapping_pending' }
    }

    return {
      status: 'failed',
      reason: `dataverse_configuration_missing: ${config.missing.join(', ')}`,
      retryable: false,
    }
  }

  try {
    const accessToken = await getDataverseAccessToken(config.value)
    const response = await fetch(
      `${config.value.webApiBaseUrl}/${config.value.entitySet}(${recordId})`,
      {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'OData-MaxVersion': '4.0',
          'OData-Version': '4.0',
          'If-Match': '*',
        },
        body: JSON.stringify({
          jm1_acknowledgmentsent: true,
          jm1_acknowledgmentstatus: ACKNOWLEDGMENT_STATUS_SENT,
          jm1_acknowledgmentsenton: sentAt,
          jm1_acknowledgmentlastattempton: sentAt,
          jm1_acknowledgmentattemptcount: 1,
          jm1_acknowledgmenterror: null,
        }),
      },
    )

    if (response.status === 204) return { status: 'success' }

    const errorBody = await safeResponseText(response)
    const dataverseError = summarizeDataverseError(errorBody)
    console.error('Publishing intake acknowledgment writeback failed.', {
      status: response.status,
      errorCode: dataverseError.code,
      errorMessage: dataverseError.message,
      recordId,
      entitySet: config.value.entitySet,
    })

    return {
      status: 'failed',
      reason: `dataverse_ack_writeback_failed:${response.status}:${dataverseError.code}`,
      retryable: isRetryableStatus(response.status),
    }
  } catch (error) {
    const errorReason = summarizeWriteException(error)
    console.error('Publishing intake acknowledgment writeback exception.', {
      reason: errorReason,
      recordId,
      entitySet: config.value.entitySet,
    })

    return {
      status: 'failed',
      reason: `dataverse_ack_writeback_exception:${errorReason}`,
      retryable: true,
    }
  }
}

export async function markPublishingIntakeWorkspaceCreated(
  recordId: string | undefined,
  workspace: { workspaceUrl: string; workspaceFolderId: string },
): Promise<DataverseUpdateResult> {
  if (!recordId) return { status: 'skipped', reason: 'missing_record_id' }

  return updatePublishingIntakeRecord(recordId, {
    jm1_workspacestatus: WORKSPACE_STATUS_CREATED,
    jm1_sharepointworkspaceurl: workspace.workspaceUrl,
    jm1_sharepointworkspacefolderid: workspace.workspaceFolderId,
  }, 'workspace_writeback')
}

export async function markPublishingIntakeManuscriptReceived(
  recordId: string | undefined,
  manuscript: { manuscriptUrl: string },
): Promise<DataverseUpdateResult> {
  if (!recordId) return { status: 'skipped', reason: 'missing_record_id' }

  return updatePublishingIntakeRecord(recordId, {
    jm1_manuscriptreceived: true,
    jm1_manuscripturl: manuscript.manuscriptUrl,
  }, 'manuscript_writeback')
}

async function updatePublishingIntakeRecord(
  recordId: string,
  values: Record<string, string | number | boolean | null>,
  operation: string,
): Promise<DataverseUpdateResult> {
  const config = getDataverseConfig()

  if (!config.ok) {
    if (process.env.NODE_ENV !== 'production') {
      return { status: 'skipped', reason: 'non_production_mapping_pending' }
    }

    return {
      status: 'failed',
      reason: `dataverse_configuration_missing: ${config.missing.join(', ')}`,
      retryable: false,
    }
  }

  try {
    const accessToken = await getDataverseAccessToken(config.value)
    const response = await fetch(
      `${config.value.webApiBaseUrl}/${config.value.entitySet}(${recordId})`,
      {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'OData-MaxVersion': '4.0',
          'OData-Version': '4.0',
          'If-Match': '*',
        },
        body: JSON.stringify(values),
      },
    )

    if (response.status === 204) return { status: 'success' }

    const errorBody = await safeResponseText(response)
    const dataverseError = summarizeDataverseError(errorBody)
    console.error('Publishing intake Dataverse update failed.', {
      operation,
      status: response.status,
      errorCode: dataverseError.code,
      errorMessage: dataverseError.message,
      recordId,
      entitySet: config.value.entitySet,
    })

    return {
      status: 'failed',
      reason: `dataverse_${operation}_failed:${response.status}:${dataverseError.code}`,
      retryable: isRetryableStatus(response.status),
    }
  } catch (error) {
    const errorReason = summarizeWriteException(error)
    console.error('Publishing intake Dataverse update exception.', {
      operation,
      reason: errorReason,
      recordId,
      entitySet: config.value.entitySet,
    })

    return {
      status: 'failed',
      reason: `dataverse_${operation}_exception:${errorReason}`,
      retryable: true,
    }
  }
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

type DataverseConfig = {
  tenantId: string
  clientId: string
  clientSecret: string
  resourceUrl: string
  environmentUrl: string
  webApiBaseUrl: string
  entitySet: string
}

function getDataverseConfig(): { ok: true; value: DataverseConfig } | { ok: false; missing: string[] } {
  const resourceUrl = cleanUrl(process.env.DATAVERSE_RESOURCE_URL)
  const environmentUrl = cleanUrl(process.env.DATAVERSE_ENVIRONMENT_URL)
  const webApiBaseUrl = cleanUrl(
    process.env.DATAVERSE_WEB_API_BASE_URL ||
      (environmentUrl ? `${environmentUrl}/api/data/v9.2` : undefined),
  )

  const config = {
    tenantId: process.env.DATAVERSE_TENANT_ID,
    clientId: process.env.DATAVERSE_CLIENT_ID,
    clientSecret: process.env.DATAVERSE_CLIENT_SECRET,
    resourceUrl,
    environmentUrl,
    webApiBaseUrl,
    entitySet: process.env.DATAVERSE_PUBLISHING_INTAKE_ENTITY_SET || CONFIRMED_DATAVERSE_MAPPING_REQUIRED.table,
  }

  const missing = Object.entries(config)
    .filter(([, value]) => !value)
    .map(([key]) => key)

  if (missing.length) return { ok: false, missing }

  return { ok: true, value: config as DataverseConfig }
}

async function getDataverseAccessToken(config: DataverseConfig) {
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
  const token = isRecord(json) && typeof json.access_token === 'string' ? json.access_token : ''

  if (!response.ok || !token) {
    throw new Error(`dataverse_token_failed:${response.status}`)
  }

  return token
}

function buildPublishingIntakeDataversePayload(payload: NormalizedPublishingIntake) {
  const columns = CONFIRMED_DATAVERSE_MAPPING_REQUIRED.columns

  return omitUndefined({
    [columns.name]: buildPublishingIntakeName(payload),
    [columns.firstName]: payload.firstName,
    [columns.lastName]: payload.lastName,
    [columns.email]: payload.email,
    [columns.phone]: payload.phone,
    [columns.bookTitle]: payload.bookTitle,
    [columns.workType]: productionWorkTypeOptions[payload.workType],
    [columns.manuscriptType]: manuscriptTypeOptions[payload.workType],
    [columns.genre]: payload.genre,
    [columns.wordCount]: payload.wordCount,
    [columns.manuscriptStatus]: payload.manuscriptStatus,
    [columns.manuscriptUrl]: payload.manuscriptUrl,
    jm1_manuscriptreceived: payload.manuscriptReceived,
    jm1_workspacestatus: payload.workspaceUrl && payload.workspaceFolderId ? WORKSPACE_STATUS_CREATED : undefined,
    jm1_sharepointworkspaceurl: payload.workspaceUrl,
    jm1_sharepointworkspacefolderid: payload.workspaceFolderId,
    [columns.publishedBefore]: publishedBeforeOptions[payload.publishedBefore],
    [columns.bookDescription]: payload.bookDescription,
    [columns.referralSource]: payload.referralSource,
    [columns.additionalNotes]: buildCanonicalAdditionalNotes(payload),
    [columns.consent]: payload.consent,
    [columns.consentTerms]: payload.consent,
    [columns.reference]: payload.reference,
    [columns.intakeChannel]: payload.intakeChannel,
    [columns.idempotencyKey]: payload.idempotencyKey,
    [columns.consentTimestamp]: payload.consentTimestamp,
    [columns.wordCountSource]: payload.wordCountSource,
  })
}

function buildCanonicalAdditionalNotes(payload: NormalizedPublishingIntake) {
  const context = [
    payload.additionalNotes ? `Author notes: ${payload.additionalNotes}` : '',
    `Payload: ${payload.payloadVersion}`,
    `Manuscript choice: ${payload.manuscriptSubmissionChoice}`,
    `Prospect state: ${payload.prospectState}`,
    `Manuscript state: ${payload.manuscriptLifecycleState}`,
    `Waiting on: ${payload.waitingOn}`,
    `Preferred name: ${payload.preferredName || 'not provided'}`,
    `Publishing name: ${payload.publishingName || 'not provided'}`,
    `Pen name: ${payload.penName || 'not provided'}`,
    `Preferred communication: ${payload.preferredCommunication || 'not provided'}`,
    `Returning author: ${payload.returningAuthor || 'not provided'}`,
    `Address: ${payload.streetAddress}${payload.addressLine2 ? `, ${payload.addressLine2}` : ''}, ${payload.city}, ${payload.stateProvince} ${payload.postalCode}, ${payload.country}`,
    payload.billingSameAsMailing
      ? 'Billing address: same as mailing'
      : `Billing address: ${payload.billingStreetAddress || ''}${payload.billingAddressLine2 ? `, ${payload.billingAddressLine2}` : ''}, ${payload.billingCity || ''}, ${payload.billingStateProvince || ''} ${payload.billingPostalCode || ''}, ${payload.billingCountry || ''}`,
    payload.subtitle ? `Subtitle: ${payload.subtitle}` : '',
    payload.intendedAudience ? `Audience: ${payload.intendedAudience}` : '',
    payload.bookGoals ? `Goals: ${payload.bookGoals}` : '',
    payload.desiredTimeline ? `Timeline: ${payload.desiredTimeline}` : '',
    payload.priorPublishingHistory ? `Prior publishing: ${payload.priorPublishingHistory}` : '',
    payload.referred ? `Referral: ${payload.referrerName || 'yes'} ${payload.referrerEmail || ''} ${payload.referrerRelationship || ''}`.trim() : 'Referral: no',
    payload.heardAboutJmp ? `Heard about JMP: ${payload.heardAboutJmp}` : '',
    payload.whyJmp ? `Why JMP: ${payload.whyJmp}` : '',
    payload.publishingPartnerHope ? `Partner hope: ${payload.publishingPartnerHope}` : '',
    payload.authorPlatform ? `Author platform: ${payload.authorPlatform}` : '',
    payload.accessibilityNotes ? `Accessibility: ${payload.accessibilityNotes}` : '',
    payload.thirdPartyMaterialDisclosure ? `Third-party material: ${payload.thirdPartyMaterialDisclosure}` : '',
    payload.aiDisclosure ? `AI disclosure: ${payload.aiDisclosure}` : '',
    payload.sensitiveContentDisclosure ? `Sensitive content: ${payload.sensitiveContentDisclosure}` : '',
    `Marketing consent: ${payload.marketingConsent ? 'yes' : 'no'}`,
    payload.utmSource || payload.utmMedium || payload.utmCampaign
      ? `Attribution: source=${payload.utmSource || ''}; medium=${payload.utmMedium || ''}; campaign=${payload.utmCampaign || ''}; content=${payload.utmContent || ''}; landing=${payload.landingPage || ''}; referrer=${payload.referrerUrl || ''}; campaignId=${payload.campaignId || ''}`
      : '',
  ].filter(Boolean).join('\n')

  return context.slice(0, 950)
}

function buildPublishingIntakeName(payload: NormalizedPublishingIntake) {
  return `${payload.reference} — ${payload.bookTitle}`.slice(0, 100)
}

function omitUndefined(values: Record<string, string | number | boolean | undefined>) {
  return Object.fromEntries(Object.entries(values).filter(([, value]) => value !== undefined && value !== ''))
}

function cleanUrl(value?: string) {
  return value?.trim().replace(/\/+$/, '')
}

function escapeODataString(value: string) {
  return value.replace(/'/g, "''")
}

function extractDataverseRecordId(entityUrl?: string) {
  if (!entityUrl) return undefined
  return entityUrl.match(/\(([0-9a-f-]{36})\)$/i)?.[1]
}

function isRetryableStatus(status: number) {
  return status === 408 || status === 429 || status >= 500
}

async function safeResponseText(response: Response) {
  try {
    return await response.text()
  } catch {
    return ''
  }
}

function summarizeDataverseError(body: string): { code: string; message: string } {
  if (!body) return { code: 'empty_error_body', message: 'Dataverse returned an empty error body.' }

  try {
    const parsed: unknown = JSON.parse(body)
    if (isRecord(parsed) && isRecord(parsed.error) && typeof parsed.error.code === 'string') {
      return {
        code: parsed.error.code,
        message: sanitizeDataverseMessage(
          typeof parsed.error.message === 'string' ? parsed.error.message : 'Dataverse returned an error.',
        ),
      }
    }
  } catch {
    // Fall through to the redacted fallback.
  }

  return { code: 'unstructured_error_body', message: 'Dataverse returned an unstructured error body.' }
}

function summarizeWriteException(error: unknown) {
  if (!(error instanceof Error)) return 'unknown'
  if (error.message.startsWith('dataverse_token_failed:')) return error.message
  return error.name
}

function sanitizeDataverseMessage(message: string) {
  return message
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[redacted-email]')
    .replace(/\+?\d[\d\s().-]{7,}\d/g, '[redacted-phone]')
    .slice(0, 300)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
