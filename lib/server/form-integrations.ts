export type IntegrationStatus = 'sent' | 'skipped' | 'failed' | 'delegated'

export type FormIntegrationResult = {
  dataverse: {
    status: IntegrationStatus
    detail: string
  }
  notification: {
    status: IntegrationStatus
    detail: string
    to: string
  }
}

type SubmitWebsiteFormInput = {
  formType: string
  source: string
  subject: string
  dataverseFlowUrl?: string
  payload: Record<string, unknown>
  notificationPreview: string
}

const DEFAULT_NOTIFICATION_TO = 'publishing@jmerrill.one'

export function getNotificationRecipient() {
  return process.env.FORM_NOTIFICATION_TO || DEFAULT_NOTIFICATION_TO
}

export async function submitWebsiteForm(input: SubmitWebsiteFormInput): Promise<FormIntegrationResult> {
  const notificationTo = getNotificationRecipient()
  const submittedAt = new Date().toISOString()
  const enrichedPayload = {
    ...input.payload,
    formType: input.formType,
    source: input.source,
    submittedAt,
    notification: {
      to: notificationTo,
      subject: input.subject,
      preview: input.notificationPreview,
      required: true,
    },
    dataverse: {
      ready: true,
      source: input.source,
      submittedAt,
    },
  }

  const dataverse = await submitToDataverseFlow(input.dataverseFlowUrl, enrichedPayload)
  const notification = await sendFormNotification({
    to: notificationTo,
    subject: input.subject,
    preview: input.notificationPreview,
    payload: enrichedPayload,
    delegatedToFormFlow: dataverse.status === 'sent',
  })

  return { dataverse, notification }
}

async function submitToDataverseFlow(
  flowUrl: string | undefined,
  payload: Record<string, unknown>,
): Promise<FormIntegrationResult['dataverse']> {
  if (!flowUrl) {
    console.log('Form submission ready for Dataverse. No Power Automate URL configured.', JSON.stringify(payload, null, 2))
    return {
      status: 'skipped',
      detail: 'No Dataverse/Power Automate endpoint configured.',
    }
  }

  try {
    const response = await fetch(flowUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      const text = await response.text()
      console.error('Dataverse/Power Automate submission failed:', response.status, text)
      return {
        status: 'failed',
        detail: `Power Automate returned ${response.status}.`,
      }
    }

    return {
      status: 'sent',
      detail: 'Submitted to configured Power Automate/Dataverse endpoint.',
    }
  } catch (error) {
    console.error('Dataverse/Power Automate submission error:', error)
    return {
      status: 'failed',
      detail: 'Power Automate request failed.',
    }
  }
}

async function sendFormNotification({
  to,
  subject,
  preview,
  payload,
  delegatedToFormFlow,
}: {
  to: string
  subject: string
  preview: string
  payload: Record<string, unknown>
  delegatedToFormFlow: boolean
}): Promise<FormIntegrationResult['notification']> {
  const notificationFlowUrl = process.env.POWER_AUTOMATE_NOTIFICATION_URL
  if (notificationFlowUrl) {
    try {
      const response = await fetch(notificationFlowUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to,
          subject,
          preview,
          payload,
        }),
      })

      if (!response.ok) {
        const text = await response.text()
        console.error('Notification flow failed:', response.status, text)
        return {
          status: 'failed',
          detail: `Notification flow returned ${response.status}.`,
          to,
        }
      }

      return {
        status: 'sent',
        detail: 'Notification sent through POWER_AUTOMATE_NOTIFICATION_URL.',
        to,
      }
    } catch (error) {
      console.error('Notification flow error:', error)
      return {
        status: 'failed',
        detail: 'Notification flow request failed.',
        to,
      }
    }
  }

  const graphResult = await sendGraphNotification({ to, subject, preview, payload })
  if (graphResult.status !== 'skipped') return graphResult

  const resendResult = await sendResendNotification({ to, subject, preview, payload })
  if (resendResult.status !== 'skipped') return resendResult

  if (delegatedToFormFlow) {
    return {
      status: 'delegated',
      detail: 'Notification instruction included in the Dataverse/Power Automate form payload.',
      to,
    }
  }

  console.warn(`Form notification not sent. Configure POWER_AUTOMATE_NOTIFICATION_URL, Microsoft Graph, or Resend. Recipient: ${to}`)
  return {
    status: 'skipped',
    detail: 'No notification sender configured.',
    to,
  }
}

async function sendGraphNotification({
  to,
  subject,
  preview,
  payload,
}: {
  to: string
  subject: string
  preview: string
  payload: Record<string, unknown>
}): Promise<FormIntegrationResult['notification']> {
  const tenantId = process.env.MICROSOFT_TENANT_ID
  const clientId = process.env.MICROSOFT_CLIENT_ID
  const clientSecret = process.env.MICROSOFT_CLIENT_SECRET
  const fromUser = process.env.MICROSOFT_GRAPH_FROM_USER

  if (!tenantId || !clientId || !clientSecret || !fromUser) {
    return {
      status: 'skipped',
      detail: 'Microsoft Graph email settings are not configured.',
      to,
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
        to,
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
          subject,
          body: {
            contentType: 'Text',
            content: `${preview}\n\n${JSON.stringify(payload, null, 2)}`,
          },
          toRecipients: [
            {
              emailAddress: {
                address: to,
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
        to,
      }
    }

    return {
      status: 'sent',
      detail: 'Notification sent through Microsoft Graph.',
      to,
    }
  } catch (error) {
    console.error('Microsoft Graph notification error:', error)
    return {
      status: 'failed',
      detail: 'Microsoft Graph notification request failed.',
      to,
    }
  }
}

async function sendResendNotification({
  to,
  subject,
  preview,
  payload,
}: {
  to: string
  subject: string
  preview: string
  payload: Record<string, unknown>
}): Promise<FormIntegrationResult['notification']> {
  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.RESEND_FROM_EMAIL

  if (!apiKey || !from) {
    return {
      status: 'skipped',
      detail: 'Resend email settings are not configured.',
      to,
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
        to,
        subject,
        text: `${preview}\n\n${JSON.stringify(payload, null, 2)}`,
      }),
    })

    if (!response.ok) {
      console.error('Resend notification failed:', response.status, await response.text())
      return {
        status: 'failed',
        detail: `Resend returned ${response.status}.`,
        to,
      }
    }

    return {
      status: 'sent',
      detail: 'Notification sent through Resend.',
      to,
    }
  } catch (error) {
    console.error('Resend notification error:', error)
    return {
      status: 'failed',
      detail: 'Resend notification request failed.',
      to,
    }
  }
}
