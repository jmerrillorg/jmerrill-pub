import { createHmac } from 'crypto'
import type { NormalizedPublishingIntake } from './schema'

export type DeadLetterResult =
  | { status: 'enqueued' }
  | { status: 'not_configured' }
  | { status: 'failed'; reason: string }

export async function enqueuePublishingIntakeDeadLetter(
  payload: NormalizedPublishingIntake,
  reason: string,
): Promise<DeadLetterResult> {
  const config = getQueueConfig()

  if (!config) {
    return { status: 'not_configured' }
  }

  try {
    const url = buildQueueMessagesUrl(config)
    const body = buildQueueMessageBody(payload, reason)
    const headers = buildQueueHeaders(config, body)
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body,
    })

    if (response.status === 201) {
      return { status: 'enqueued' }
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

function buildQueueMessageBody(payload: NormalizedPublishingIntake, reason: string) {
  const { turnstileToken: _turnstileToken, ...recoverablePayload } = payload
  const message = {
    reason,
    reference: payload.reference,
    failedAt: new Date().toISOString(),
    payload: recoverablePayload,
  }

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
