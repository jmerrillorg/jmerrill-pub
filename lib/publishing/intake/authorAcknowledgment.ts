import type { NormalizedPublishingIntake } from './schema'
import { PUBLISHING_EMAIL_CANON, ensurePublishingAuthorEmailCc } from '@/lib/server/publishing-email-canon'

type AcknowledgmentIntake = NormalizedPublishingIntake & {
  continuationUrl?: string
}

type AuthorAcknowledgmentResult =
  | { status: 'sent'; provider: string; providerMessageId?: string; recipient: string }
  | { status: 'skipped'; reason: 'relay_configuration_missing' }
  | { status: 'failed'; reason: string }

const RELAY_ROUTE = 'send-author-acknowledgment'

export async function sendJoinAuthorAcknowledgment(
  intake: AcknowledgmentIntake,
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

    if (response.status === 200 || response.status === 202) {
      const body = await safeJson(response)
      return {
        status: 'sent',
        provider: stringValue(body?.provider) || 'acs-email-relay',
        providerMessageId: stringValue(body?.providerMessageId || body?.operationId),
        recipient: stringValue(body?.recipient || body?.to) || intake.email,
      }
    }

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

function buildAuthorAcknowledgmentPayload(intake: AcknowledgmentIntake) {
  return {
    reference: intake.reference,
    to: intake.email,
    cc: ensurePublishingAuthorEmailCc({ to: [intake.email] }),
    replyTo: PUBLISHING_EMAIL_CANON.replyTo,
    firstName: intake.firstName,
    projectTitle: intake.bookTitle,
    intakeChannel: intake.intakeChannel,
    manuscriptUrl: intake.manuscriptUrl || null,
    manuscriptChoice: intake.manuscriptSubmissionChoice,
    manuscriptLifecycleState: intake.manuscriptLifecycleState,
    waitingOn: intake.waitingOn,
    continuationUrl: intake.continuationUrl || null,
    nextStep: authorFacingNextStep(intake),
  }
}

function authorFacingNextStep(intake: AcknowledgmentIntake) {
  if (intake.manuscriptSubmissionChoice === 'later') {
    return 'Your inquiry has been received. Please use the secure continuation link to add the manuscript when you are ready; Editorial Review cannot begin until a manuscript is connected.'
  }

  if (intake.manuscriptLifecycleState === 'NORMALIZATION_PENDING') {
    return 'Your inquiry and manuscript have been received. JMP is preparing the manuscript file for Editorial Review.'
  }

  return 'Your inquiry and manuscript have been received. JMP will review the project and keep you informed about the next step.'
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

async function safeJson(response: Response): Promise<Record<string, unknown> | null> {
  try {
    const parsed: unknown = await response.json()
    return typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)
      ? parsed as Record<string, unknown>
      : null
  } catch {
    return null
  }
}

function stringValue(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
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
