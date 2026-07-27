import { createHmac } from 'crypto'
import type { NormalizedPublishingIntake } from './schema'

export type PublishingIntakeFailureClassification =
  | 'DATAVERSE_ENRICHMENT_FAILED'
  | 'SHAREPOINT_SECONDARY_SETUP_FAILED'
  | 'PUBLISHING_NOTIFICATION_FAILED'
  | 'EXECUTION_LOG_WRITE_FAILED'
  | 'STATUS_WRITEBACK_FAILED'
  | 'TRANSIENT_MICROSOFT_DEPENDENCY_FAILURE'
  | 'UNKNOWN_RECOVERABLE_FAILURE'

export type NonRecoverablePublishingIntakeFailure =
  | 'INVALID_TURNSTILE'
  | 'UNSUPPORTED_FILE'
  | 'MISSING_REQUIRED_FIELD'
  | 'INVALID_FILE_SIZE'
  | 'MALFORMED_REQUEST'
  | 'DUPLICATE_IDEMPOTENCY_KEY'

export type PublishingIntakeRecoveryOperation =
  | 'DATAVERSE_INTAKE_CREATE'
  | 'PUBLISHING_NOTIFICATION'
  | 'AUTHOR_ACKNOWLEDGMENT'
  | 'ACKNOWLEDGMENT_WRITEBACK'
  | 'PIPELINE_ORCHESTRATION'
  | 'MANUSCRIPT_WRITEBACK'
  | 'WORKSPACE_WRITEBACK'
  | 'EXECUTION_LOG_WRITE'

export type PublishingIntakeRecoveryMessage = {
  schema: 'JM1_PUBLISHING_INTAKE_DEAD_LETTER_V1'
  intakeReference: string
  dataverseRecordId?: string
  contactId?: string
  sharePointItemId?: string
  sharePointDriveItemId?: string
  workspaceFolderId?: string
  correlationId: string
  failedOperationType: PublishingIntakeRecoveryOperation
  failureClassification: PublishingIntakeFailureClassification
  retryCount: number
  maxRetryCount: number
  firstFailureAt: string
  latestFailureAt: string
  sourceDeploymentSha: string
  safeErrorCode: string
  environment: string
}

export type PublishingIntakeRecoveryInput = {
  intakeReference: string
  dataverseRecordId?: string
  contactId?: string
  sharePointItemId?: string
  sharePointDriveItemId?: string
  workspaceFolderId?: string
  correlationId?: string
  failedOperationType: PublishingIntakeRecoveryOperation
  failureClassification: PublishingIntakeFailureClassification
  retryCount?: number
  firstFailureAt?: string
  latestFailureAt?: string
  sourceDeploymentSha?: string
  safeErrorCode: string
  environment?: string
}

export type DeadLetterResult =
  | { status: 'enqueued'; message: PublishingIntakeRecoveryMessage }
  | { status: 'not_configured' }
  | { status: 'failed'; reason: string }

export const DEAD_LETTER_MAX_QUEUE_RETRIES = 5

export async function enqueuePublishingIntakeDeadLetter(
  payload: NormalizedPublishingIntake,
  reason: string,
): Promise<DeadLetterResult> {
  return enqueuePublishingIntakeRecovery({
    intakeReference: payload.reference,
    correlationId: payload.idempotencyKey,
    failedOperationType: 'DATAVERSE_INTAKE_CREATE',
    failureClassification: classifyRecoverableFailure(reason),
    workspaceFolderId: payload.workspaceFolderId,
    safeErrorCode: reason,
  })
}

export async function enqueuePublishingIntakeRecovery(
  input: PublishingIntakeRecoveryInput,
): Promise<DeadLetterResult> {
  const config = getQueueConfig()
  const message = buildPublishingIntakeRecoveryMessage(input)

  if (!config) {
    return { status: 'not_configured' }
  }

  try {
    const url = buildQueueMessagesUrl(config)
    const body = buildQueueMessageBody(message)
    const headers = buildQueueHeaders(config, body)
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body,
    })

    if (response.status === 201) {
      return { status: 'enqueued', message }
    }

    return {
      status: 'failed',
      reason: `dead_letter_enqueue_failed:${response.status}`,
    }
  } catch (error) {
    return {
      status: 'failed',
      reason: `dead_letter_enqueue_exception:${error instanceof Error ? error.name : 'unknown'}`,
    }
  }
}

export function buildPublishingIntakeRecoveryMessage(
  input: PublishingIntakeRecoveryInput,
  now = new Date(),
): PublishingIntakeRecoveryMessage {
  const latestFailureAt = input.latestFailureAt || now.toISOString()
  return {
    schema: 'JM1_PUBLISHING_INTAKE_DEAD_LETTER_V1',
    intakeReference: input.intakeReference,
    ...(input.dataverseRecordId ? { dataverseRecordId: input.dataverseRecordId } : {}),
    ...(input.contactId ? { contactId: input.contactId } : {}),
    ...(input.sharePointItemId ? { sharePointItemId: input.sharePointItemId } : {}),
    ...(input.sharePointDriveItemId ? { sharePointDriveItemId: input.sharePointDriveItemId } : {}),
    ...(input.workspaceFolderId ? { workspaceFolderId: input.workspaceFolderId } : {}),
    correlationId: input.correlationId || input.intakeReference,
    failedOperationType: input.failedOperationType,
    failureClassification: input.failureClassification,
    retryCount: input.retryCount ?? 0,
    maxRetryCount: DEAD_LETTER_MAX_QUEUE_RETRIES,
    firstFailureAt: input.firstFailureAt || latestFailureAt,
    latestFailureAt,
    sourceDeploymentSha: input.sourceDeploymentSha || currentDeploymentSha(),
    safeErrorCode: sanitizeSafeErrorCode(input.safeErrorCode),
    environment: input.environment || currentEnvironment(),
  }
}

export function classifyRecoverableFailure(reason: string): PublishingIntakeFailureClassification {
  if (reason.startsWith('dataverse_ack_writeback_')) return 'STATUS_WRITEBACK_FAILED'
  if (reason.startsWith('dataverse_write_')) return 'DATAVERSE_ENRICHMENT_FAILED'
  if (reason.includes('orchestration') || reason.includes('autostart') || reason.includes('diagnostic')) return 'DATAVERSE_ENRICHMENT_FAILED'
  if (reason.startsWith('sharepoint_') || reason.startsWith('manuscript_')) return 'SHAREPOINT_SECONDARY_SETUP_FAILED'
  if (reason.startsWith('relay_') || reason.includes('notification')) return 'PUBLISHING_NOTIFICATION_FAILED'
  if (reason.includes('execution_log')) return 'EXECUTION_LOG_WRITE_FAILED'
  if (reason.includes('timeout') || reason.includes('429') || reason.includes('503')) return 'TRANSIENT_MICROSOFT_DEPENDENCY_FAILURE'
  return 'UNKNOWN_RECOVERABLE_FAILURE'
}

export function sanitizeSafeErrorCode(reason: string) {
  return reason
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[redacted-email]')
    .replace(/\+?\d[\d\s().-]{7,}\d/g, '[redacted-phone]')
    .replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/gi, 'Bearer [redacted-token]')
    .replace(/secret[=:][^,;\s]+/gi, 'secret=[redacted-secret]')
    .replace(/https?:\/\/[^\s"']+/gi, '[redacted-url]')
    .replace(/[A-Za-z]:\\[^\s"']+/g, '[redacted-path]')
    .replace(/\/Users\/[^\s"']+/g, '[redacted-path]')
    .slice(0, 160)
}

type QueueConfig = {
  accountName: string
  accountKey?: string
  endpoint: string
  queueName: string
  sas?: string
}

function getQueueConfig(): QueueConfig | null {
  const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING?.trim()
  const queueName = process.env.INTAKE_DEADLETTER_QUEUE_NAME?.trim()
  if (!connectionString || !queueName) return null

  const parts = Object.fromEntries(
    connectionString
      .split(';')
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const index = part.indexOf('=')
        return index === -1 ? [part, ''] : [part.slice(0, index), part.slice(index + 1)]
      }),
  )

  const accountName = parts.AccountName
  const endpoint = parts.QueueEndpoint || (
    accountName ? `https://${accountName}.queue.core.windows.net` : ''
  )

  if (!accountName || !endpoint) return null

  return {
    accountName,
    accountKey: parts.AccountKey,
    endpoint: endpoint.replace(/\/+$/, ''),
    queueName,
    sas: parts.SharedAccessSignature,
  }
}

function buildQueueMessagesUrl(config: QueueConfig) {
  const base = `${config.endpoint}/${encodeURIComponent(config.queueName)}/messages`
  const search = new URLSearchParams({ timeout: '30' })
  if (config.sas) {
    const sas = config.sas.startsWith('?') ? config.sas.slice(1) : config.sas
    for (const [key, value] of new URLSearchParams(sas)) {
      search.set(key, value)
    }
  }

  return `${base}?${search.toString()}`
}

export function buildQueueMessageBody(message: PublishingIntakeRecoveryMessage) {
  return `<QueueMessage><MessageText>${Buffer.from(JSON.stringify(message), 'utf8').toString('base64')}</MessageText></QueueMessage>`
}

function buildQueueHeaders(config: QueueConfig, body: string) {
  const now = new Date().toUTCString()
  const headers: Record<string, string> = {
    'Content-Type': 'application/xml',
    'x-ms-date': now,
    'x-ms-version': '2021-12-02',
  }

  if (!config.sas) {
    if (!config.accountKey) {
      throw new Error('azure_queue_account_key_missing')
    }

    headers.Authorization = buildSharedKeyAuthorization(config, body, headers)
  }

  return headers
}

function buildSharedKeyAuthorization(
  config: QueueConfig,
  body: string,
  headers: Record<string, string>,
) {
  const contentLength = Buffer.byteLength(body, 'utf8')
  const canonicalizedHeaders = Object.entries(headers)
    .filter(([key]) => key.toLowerCase().startsWith('x-ms-'))
    .map(([key, value]) => `${key.toLowerCase()}:${value}`)
    .sort()
    .join('\n')
  const canonicalizedResource = `/${config.accountName}/${config.queueName}/messages\ntimeout:30`
  const stringToSign = [
    'POST',
    '',
    '',
    String(contentLength),
    '',
    'application/xml',
    '',
    '',
    '',
    '',
    '',
    '',
    canonicalizedHeaders,
    canonicalizedResource,
  ].join('\n')

  const signature = createHmac('sha256', Buffer.from(config.accountKey || '', 'base64'))
    .update(stringToSign, 'utf8')
    .digest('base64')

  return `SharedKey ${config.accountName}:${signature}`
}

function currentDeploymentSha() {
  return (
    process.env.JM1_RELEASE_SHA ||
    process.env.GITHUB_SHA ||
    'unknown'
  ).slice(0, 80)
}

function currentEnvironment() {
  return process.env.JM1_ENVIRONMENT || process.env.NODE_ENV || 'unknown'
}
