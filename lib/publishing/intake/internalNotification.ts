import type { NormalizedPublishingIntake } from './schema'

type InternalNotificationResult =
  | { status: 'sent' }
  | { status: 'skipped'; reason: 'relay_configuration_missing' }
  | { status: 'failed'; reason: string }

const RELAY_ROUTE = 'send-join-internal-notification'

export async function sendJoinInternalNotification(
  intake: NormalizedPublishingIntake,
  options: { recordId?: string } = {},
): Promise<InternalNotificationResult> {
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
      body: JSON.stringify(buildJoinInternalNotificationPayload(intake, options.recordId)),
    })

    if (response.status === 202) return { status: 'sent' }

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

function buildJoinInternalNotificationPayload(intake: NormalizedPublishingIntake, recordId?: string) {
  return {
    notificationType: 'JOIN_INTAKE_RECEIVED',
    reference: intake.reference,
    authorName: `${intake.firstName} ${intake.lastName}`.trim(),
    authorEmail: intake.email,
    phone: intake.phone,
    projectTitle: intake.bookTitle,
    manuscriptType: intake.workType,
    manuscriptStatus: intake.manuscriptStatus,
    intakeChannel: intake.intakeChannel,
    dataverseIntakeUrl: recordId ? buildDataverseRecordUrl('jm1_publishingintake', recordId) : undefined,
    stageStatus: 'Intake received; routing/workspace automation pending or in progress.',
    nextAction: 'Review the new /join intake and confirm Contact, Lead, workspace, and Stage 0 routing completed.',
    recipient: 'publishing@jmerrill.one',
  }
}

function getRelayConfig(): { ok: true; value: { relayUrl: string; relayKey: string } } | { ok: false } {
  const relayUrl = cleanUrl(
    process.env.JM1_JOIN_INTERNAL_NOTIFICATION_RELAY_URL ||
      process.env.JM1_INTERNAL_NOTIFICATION_RELAY_URL,
  )
  const relayKey =
    process.env.JM1_JOIN_INTERNAL_NOTIFICATION_RELAY_KEY ||
    process.env.JM1_INTERNAL_NOTIFICATION_RELAY_KEY

  if (!relayUrl || !relayKey) return { ok: false }
  return { ok: true, value: { relayUrl, relayKey } }
}

function buildDataverseRecordUrl(entityName: string, recordId: string) {
  const baseUrl = cleanUrl(
    process.env.DATAVERSE_ENVIRONMENT_URL ||
      process.env.DATAVERSE_RESOURCE_URL,
  )

  if (!baseUrl) return undefined

  return `${baseUrl}/main.aspx?pagetype=entityrecord&etn=${encodeURIComponent(entityName)}&id=${encodeURIComponent(recordId)}`
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
