import type { NormalizedPublishingIntake } from './schema'

type AuthorAcknowledgmentResult =
  | { status: 'sent' }
  | { status: 'skipped'; reason: 'relay_configuration_missing' }
  | { status: 'failed'; reason: string }

const RELAY_ROUTE = 'send-author-acknowledgment'

export async function sendJoinAuthorAcknowledgment(
  intake: NormalizedPublishingIntake,
): Promise<AuthorAcknowledgmentResult> {
  const config = getRelayConfig()
  if (!config.ok) return { status: 'skipped', reason: 'relay_configuration_missing' }

  try {
    const response = await fetch(`${config.value.relayUrl}/api/${RELAY_ROUTE}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'x-jm1-relay-key': config.value.relayKey,
      },
      body: JSON.stringify(buildAuthorAcknowledgmentPayload(intake)),
    })

    if (response.status === 200 || response.status === 202) return { status: 'sent' }

    const body = await safeResponseText(response)
    return {
      status: 'failed',
      reason: `relay_rejected:${response.status}:${summarizeRelayError(body)}`,
    }
  } catch (error) {
    return {
      status: 'failed',
      reason: `relay_exception:${error instanceof Error ? error.name : 'unknown'}`,
    }
  }
}

function buildAuthorAcknowledgmentPayload(intake: NormalizedPublishingIntake) {
  return {
    reference: intake.reference,
    to: intake.email,
    firstName: intake.firstName,
    projectTitle: intake.bookTitle,
    intakeChannel: intake.intakeChannel,
    manuscriptUrl: intake.manuscriptUrl || null,
  }
}

function getRelayConfig(): { ok: true; value: { relayUrl: string; relayKey: string } } | { ok: false } {
  const relayUrl = cleanUrl(
    process.env.JM1_JOIN_AUTHOR_ACK_RELAY_URL ||
      process.env.JM1_AUTHOR_ACK_RELAY_URL ||
      process.env.JM1_JOIN_INTERNAL_NOTIFICATION_RELAY_URL ||
      process.env.JM1_INTERNAL_NOTIFICATION_RELAY_URL,
  )
  const relayKey =
    process.env.JM1_JOIN_AUTHOR_ACK_RELAY_KEY ||
    process.env.JM1_AUTHOR_ACK_RELAY_KEY ||
    process.env.JM1_JOIN_INTERNAL_NOTIFICATION_RELAY_KEY ||
    process.env.JM1_INTERNAL_NOTIFICATION_RELAY_KEY

  if (!relayUrl || !relayKey) return { ok: false }
  return { ok: true, value: { relayUrl, relayKey } }
}

function cleanUrl(value?: string) {
  return value?.trim().replace(/\/+$/, '')
}

async function safeResponseText(response: Response) {
  try {
    return await response.text()
  } catch {
    return ''
  }
}

function summarizeRelayError(body: string) {
  if (!body) return 'empty_error_body'

  try {
    const parsed: unknown = JSON.parse(body)
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      'code' in parsed &&
      typeof parsed.code === 'string'
    ) {
      return parsed.code
    }
  } catch {
    // Fall through to the redacted fallback.
  }

  return 'unstructured_error_body'
}
