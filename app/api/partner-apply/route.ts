import { NextRequest, NextResponse } from 'next/server'
import { hasConfirmedNotificationDelivery, notificationNotConfiguredMessage, submitWebsiteForm } from '@/lib/server/form-integrations'
import { cleanString, missingFields, requiredFieldsResponse } from '@/lib/server/form-validation'

function resolvePartnerFlowUrl() {
  return process.env.POWER_AUTOMATE_PARTNER_APPLY_URL || process.env.POWER_AUTOMATE_PARTNER_URL || ''
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    const required = ['firstName', 'lastName', 'email', 'tier', 'imprint', 'pipeline', 'vision']
    const missing = missingFields(body, required)
    if (missing.length) {
      return requiredFieldsResponse(missing)
    }

    const fullName = `${cleanString(body.firstName)} ${cleanString(body.lastName)}`.trim()
    const partnerFlowUrl = resolvePartnerFlowUrl()

    if (!partnerFlowUrl && process.env.NODE_ENV === 'production') {
      return NextResponse.json(
        { error: notificationNotConfiguredMessage() },
        { status: 503 },
      )
    }

    const payload = {
      firstName: cleanString(body.firstName),
      lastName: cleanString(body.lastName),
      applicantName: fullName,
      email: cleanString(body.email),
      phone: cleanString(body.phone),
      website: cleanString(body.website),
      tier: cleanString(body.tier),
      imprint: cleanString(body.imprint),
      existingTitles: cleanString(body.existingTitles),
      pipeline: cleanString(body.pipeline),
      vision: cleanString(body.vision),
      leadType: 'partner-program-application',
      source: 'website-partner-form',
      requiresReview: true,
      division: 'publishing',
      divisionNumber: '01',
      programTrack: 'partner',
      dataverseTableHint: 'jm1pub_partnerapp',
      duplicateDetectionKey: cleanString(body.email).toLowerCase(),
      applicantConfirmation: {
        to: cleanString(body.email),
        from: 'publishing@jmerrill.one',
        subject: 'We received your Publishing Partner application',
        preview: 'Thank you for applying to the J Merrill Publishing Partner Program.',
        body:
          'Thank you for applying to the Publishing Partner Program. We received your application and our team will review it within 3–5 business days. We appreciate the opportunity to learn more about your publishing vision.',
      },
    }

    const integration = await submitWebsiteForm({
      formType: 'publishing-partner-application',
      route: '/publishing-partner/apply',
      source: 'website-partner-form',
      subject: `New Publishing Partner Application — ${fullName}`,
      routeSpecificFlowUrl: partnerFlowUrl,
      payload,
      notificationPreview: `${fullName} submitted a Publishing Partner Program application for ${payload.tier}.`,
      internalClassification: 'Business',
    })

    if (!hasConfirmedNotificationDelivery(integration)) {
      return NextResponse.json(
        {
          error: notificationNotConfiguredMessage(),
          integration,
        },
        { status: 502 },
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Application received. We review applications within 3–5 business days.',
      integration,
    })
  } catch (err) {
    console.error('Partner apply error:', err)
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 },
    )
  }
}
