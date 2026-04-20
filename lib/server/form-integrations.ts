export type IntegrationStatus = 'sent' | 'skipped' | 'failed' | 'delegated'

type EndpointType = 'route_specific_power_automate' | 'shared_notification' | 'none'
type IntegrationStrategy = 'route_specific_ingestion' | 'shared_notification_fallback'

export type Jm1PubInternalClassification =
  | 'Legacy'
  | 'Ministry'
  | 'Business'
  | 'Trade'
  | 'Children'
  | 'Poetry'
  | 'Academic'
  | 'Memoir'
  | 'Fiction'
  | 'Other'

export const JM1PUB_INTERNAL_CLASSIFICATION_CHOICES: Record<Jm1PubInternalClassification, number> = {
  Legacy: 100000000,
  Ministry: 100000001,
  Business: 100000002,
  Trade: 100000003,
  Children: 100000004,
  Poetry: 100000005,
  Academic: 100000006,
  Memoir: 100000007,
  Fiction: 100000008,
  Other: 100000009,
}

export type FormIntegrationResult = {
  strategy: IntegrationStrategy
  ingestion: {
    status: IntegrationStatus
    detail: string
    endpointType: EndpointType
    firstWriteAnchor: 'jm1pub_submission'
  }
  notification: {
    status: IntegrationStatus
    detail: string
    to: string
    endpointType: EndpointType
  }
  /**
   * Backward-compatible response alias for older callers/tests. The website does
   * not write directly to Dataverse; route-specific Power Automate flows do.
   */
  dataverse: {
    status: IntegrationStatus
    detail: string
  }
}

type SubmitWebsiteFormInput = {
  formType: string
  route: string
  source: string
  subject: string
  routeSpecificFlowUrl?: string
  payload: Record<string, unknown>
  notificationPreview: string
  internalClassification?: Jm1PubInternalClassification
}

type CanonicalFormEnvelope = {
  to: string
  subject: string
  preview: string
  formType: string
  submittedAt: string
  route: string
  source: string
  recipient: string
  canon: {
    firstWriteAnchor: 'jm1pub_submission'
    receivedStatus: 'Received'
    convertedStatus: 'Converted'
    runtimeSequence: string[]
    internalClassification?: {
      label: Jm1PubInternalClassification
      value: number
    }
  }
  notification: {
    to: string
    subject: string
    preview: string
    required: true
  }
  payload: Record<string, unknown>
}

const DEFAULT_NOTIFICATION_TO = 'publishing@jmerrill.one'
const CANON_RUNTIME_SEQUENCE = [
  'HTTP request received',
  'Create jm1pub_submission with status: Received',
  'Upsert downstream record(s)',
  'Update jm1pub_submission with lookup IDs and status: Converted',
  'Send email notification',
  'Return HTTP response to website',
]

export function getNotificationRecipient() {
  return process.env.FORM_NOTIFICATION_TO || DEFAULT_NOTIFICATION_TO
}

export function getInternalClassificationChoice(label: Jm1PubInternalClassification) {
  return {
    label,
    value: JM1PUB_INTERNAL_CLASSIFICATION_CHOICES[label],
  }
}

export async function submitWebsiteForm(input: SubmitWebsiteFormInput): Promise<FormIntegrationResult> {
  const notificationTo = getNotificationRecipient()
  const submittedAt = new Date().toISOString()
  const classification = input.internalClassification
    ? getInternalClassificationChoice(input.internalClassification)
    : undefined

  const envelope: CanonicalFormEnvelope = {
    to: notificationTo,
    subject: input.subject,
    preview: input.notificationPreview,
    formType: input.formType,
    submittedAt,
    route: input.route,
    source: input.source,
    recipient: notificationTo,
    canon: {
      firstWriteAnchor: 'jm1pub_submission',
      receivedStatus: 'Received',
      convertedStatus: 'Converted',
      runtimeSequence: CANON_RUNTIME_SEQUENCE,
      internalClassification: classification,
    },
    notification: {
      to: notificationTo,
      subject: input.subject,
      preview: input.notificationPreview,
      required: true,
    },
    payload: {
      ...input.payload,
      formType: input.formType,
      source: input.source,
      route: input.route,
      submittedAt,
      recipient: notificationTo,
      jm1pubSubmission: {
        firstWriteAnchor: 'jm1pub_submission',
        initialStatus: 'Received',
        convertedStatus: 'Converted',
      },
      internalClassification: classification,
    },
  }

  if (input.routeSpecificFlowUrl) {
    return submitToRouteSpecificPowerAutomate(input.routeSpecificFlowUrl, envelope)
  }

  return submitToSharedNotificationFallback(envelope)
}

export function hasConfirmedNotificationDelivery(result: FormIntegrationResult) {
  return result.notification.status === 'sent'
}

export function notificationNotConfiguredMessage() {
  return 'Submission received, but staff notification delivery is not fully configured. Please email publishing@jmerrill.one directly so the team can follow up.'
}

async function submitToRouteSpecificPowerAutomate(
  flowUrl: string,
  envelope: CanonicalFormEnvelope,
): Promise<FormIntegrationResult> {
  const result = await postJsonToPowerAutomate(flowUrl, envelope, 'Route-specific Power Automate ingestion')

  if (result.status === 'sent') {
    return makeIntegrationResult({
      strategy: 'route_specific_ingestion',
      ingestion: {
        status: 'sent',
        detail: 'Submitted to route-specific Power Automate ingestion endpoint. Endpoint owns jm1pub_submission creation, downstream upsert, notification, and HTTP response.',
        endpointType: 'route_specific_power_automate',
      },
      notification: {
        status: 'sent',
        detail: 'Notification delegated to and confirmed by the route-specific Power Automate endpoint.',
        endpointType: 'route_specific_power_automate',
        to: envelope.to,
      },
    })
  }

  return makeIntegrationResult({
    strategy: 'route_specific_ingestion',
    ingestion: {
      status: 'failed',
      detail: result.detail,
      endpointType: 'route_specific_power_automate',
    },
    notification: {
      status: 'failed',
      detail: 'Route-specific Power Automate endpoint did not confirm delivery.',
      endpointType: 'route_specific_power_automate',
      to: envelope.to,
    },
  })
}

async function submitToSharedNotificationFallback(envelope: CanonicalFormEnvelope): Promise<FormIntegrationResult> {
  const notification = await sendFormNotification(envelope)
  const ingestionStatus: IntegrationStatus = notification.status === 'sent' ? 'skipped' : 'failed'

  return makeIntegrationResult({
    strategy: 'shared_notification_fallback',
    ingestion: {
      status: ingestionStatus,
      detail:
        notification.status === 'sent'
          ? 'No route-specific Power Automate endpoint configured. Used shared notification fallback; jm1pub_submission was not created.'
          : 'No route-specific Power Automate endpoint configured and shared notification fallback did not confirm delivery.',
      endpointType: 'none',
    },
    notification,
  })
}

function makeIntegrationResult({
  strategy,
  ingestion,
  notification,
}: {
  strategy: IntegrationStrategy
  ingestion: Omit<FormIntegrationResult['ingestion'], 'firstWriteAnchor'>
  notification: FormIntegrationResult['notification']
}): FormIntegrationResult {
  return {
    strategy,
    ingestion: {
      ...ingestion,
      firstWriteAnchor: 'jm1pub_submission',
    },
    notification,
    dataverse: {
      status: ingestion.status,
      detail: ingestion.detail,
    },
  }
}

async function postJsonToPowerAutomate(
  flowUrl: string,
  body: Record<string, unknown>,
  label: string,
): Promise<{ status: IntegrationStatus; detail: string }> {
  try {
    const response = await fetch(flowUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const text = await response.text()
      console.error(`${label} failed:`, response.status, text)
      return {
        status: 'failed',
        detail: `${label} returned ${response.status}.`,
      }
    }

    return {
      status: 'sent',
      detail: `${label} accepted the submission.`,
    }
  } catch (error) {
    console.error(`${label} request error:`, error)
    return {
      status: 'failed',
      detail: `${label} request failed.`,
    }
  }
}

async function sendFormNotification(
  envelope: CanonicalFormEnvelope,
): Promise<FormIntegrationResult['notification']> {
  const notificationFlowUrl = process.env.POWER_AUTOMATE_NOTIFICATION_URL
  if (notificationFlowUrl) {
    const result = await postJsonToPowerAutomate(notificationFlowUrl, envelope, 'Shared notification Power Automate flow')

    return {
      status: result.status,
      detail:
        result.status === 'sent'
          ? 'Notification sent through POWER_AUTOMATE_NOTIFICATION_URL.'
          : result.detail,
      endpointType: 'shared_notification',
      to: envelope.to,
    }
  }

  const graphResult = await sendGraphNotification(envelope)
  if (graphResult.status !== 'skipped') return graphResult

  const resendResult = await sendResendNotification(envelope)
  if (resendResult.status !== 'skipped') return resendResult

  console.warn(`Form notification not sent. Configure POWER_AUTOMATE_NOTIFICATION_URL, Microsoft Graph, or Resend. Recipient: ${envelope.to}`)
  return {
    status: 'skipped',
    detail: 'No notification sender configured.',
    endpointType: 'none',
    to: envelope.to,
  }
}

async function sendGraphNotification(
  envelope: CanonicalFormEnvelope,
): Promise<FormIntegrationResult['notification']> {
  const tenantId = process.env.MICROSOFT_TENANT_ID
  const clientId = process.env.MICROSOFT_CLIENT_ID
  const clientSecret = process.env.MICROSOFT_CLIENT_SECRET
  const fromUser = process.env.MICROSOFT_GRAPH_FROM_USER

  if (!tenantId || !clientId || !clientSecret || !fromUser) {
    return {
      status: 'skipped',
      detail: 'Microsoft Graph email settings are not configured.',
      endpointType: 'none',
      to: envelope.to,
    }
  }

  try {
    const tokenResponse = await fetch(`https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        scope: 'https://graph.microsoft.com/.default',
        grant_type: 'client_credentials',
      }),
    })

    if (!tokenResponse.ok) {
      console.error('Microsoft Graph token request failed:', tokenResponse.status, await tokenResponse.text())
      return {
        status: 'failed',
        detail: `Microsoft Graph token request returned ${tokenResponse.status}.`,
        endpointType: 'shared_notification',
        to: envelope.to,
      }
    }

    const token = await tokenResponse.json() as { access_token?: string }
    const mailResponse = await fetch(`https://graph.microsoft.com/v1.0/users/${fromUser}/sendMail`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: {
          subject: envelope.subject,
          body: {
            contentType: 'Text',
            content: `${envelope.preview}\n\n${JSON.stringify(envelope.payload, null, 2)}`,
          },
          toRecipients: [
            {
              emailAddress: {
                address: envelope.to,
              },
            },
          ],
        },
        saveToSentItems: true,
      }),
    })

    if (!mailResponse.ok) {
      console.error('Microsoft Graph sendMail failed:', mailResponse.status, await mailResponse.text())
      return {
        status: 'failed',
        detail: `Microsoft Graph sendMail returned ${mailResponse.status}.`,
        endpointType: 'shared_notification',
        to: envelope.to,
      }
    }

    return {
      status: 'sent',
      detail: 'Notification sent through Microsoft Graph.',
      endpointType: 'shared_notification',
      to: envelope.to,
    }
  } catch (error) {
    console.error('Microsoft Graph notification error:', error)
    return {
      status: 'failed',
      detail: 'Microsoft Graph notification request failed.',
      endpointType: 'shared_notification',
      to: envelope.to,
    }
  }
}

async function sendResendNotification(
  envelope: CanonicalFormEnvelope,
): Promise<FormIntegrationResult['notification']> {
  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.RESEND_FROM_EMAIL

  if (!apiKey || !from) {
    return {
      status: 'skipped',
      detail: 'Resend email settings are not configured.',
      endpointType: 'none',
      to: envelope.to,
    }
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: envelope.to,
        subject: envelope.subject,
        text: `${envelope.preview}\n\n${JSON.stringify(envelope.payload, null, 2)}`,
      }),
    })

    if (!response.ok) {
      console.error('Resend notification failed:', response.status, await response.text())
      return {
        status: 'failed',
        detail: `Resend returned ${response.status}.`,
        endpointType: 'shared_notification',
        to: envelope.to,
      }
    }

    return {
      status: 'sent',
      detail: 'Notification sent through Resend.',
      endpointType: 'shared_notification',
      to: envelope.to,
    }
  } catch (error) {
    console.error('Resend notification error:', error)
    return {
      status: 'failed',
      detail: 'Resend notification request failed.',
      endpointType: 'shared_notification',
      to: envelope.to,
    }
  }
}
