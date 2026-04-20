import { NextRequest, NextResponse } from 'next/server'
import { requireAuthorAccess } from '@/lib/server/author-access'
import { hasConfirmedNotificationDelivery, notificationNotConfiguredMessage, submitWebsiteForm } from '@/lib/server/form-integrations'
import { cleanString, missingFields, requiredFieldsResponse } from '@/lib/server/form-validation'

export async function POST(req: NextRequest) {
  try {
    const unauthorized = requireAuthorAccess(req)
    if (unauthorized) return unauthorized

    const body = await req.json()
    const required = ['authorName', 'email', 'legalPayeeName', 'activeAuthorStatus', 'taxClassification', 'paymentPreference', 'mailingAddress', 'taxDocumentStatus']
    const missing = missingFields(body, required)
    if (missing.length) return requiredFieldsResponse(missing)

    const payload = {
      authorName: cleanString(body.authorName),
      email: cleanString(body.email),
      phone: cleanString(body.phone),
      legalPayeeName: cleanString(body.legalPayeeName),
      businessName: cleanString(body.businessName),
      activeAuthorStatus: cleanString(body.activeAuthorStatus),
      taxClassification: cleanString(body.taxClassification),
      taxIdentifierType: cleanString(body.taxIdentifierType),
      paymentPreference: cleanString(body.paymentPreference),
      securePaymentLinkPreference: cleanString(body.securePaymentLinkPreference),
      paymentEmail: cleanString(body.paymentEmail),
      mailingAddress: cleanString(body.mailingAddress),
      taxDocumentStatus: cleanString(body.taxDocumentStatus),
      notes: cleanString(body.notes),
      source: 'author-financial-setup-form',
      division: 'publishing',
      divisionNumber: '01',
      workflowStage: 'financial-setup',
      sensitiveIntake: true,
    }

    const integration = await submitWebsiteForm({
      formType: 'author-financial-setup',
      route: '/author/financial-setup',
      source: 'author-financial-setup-form',
      subject: `Author financial setup submitted: ${payload.authorName}`,
      routeSpecificFlowUrl: process.env.POWER_AUTOMATE_AUTHOR_FINANCIAL_URL,
      payload,
      notificationPreview: `${payload.authorName} submitted financial setup details. Sensitive follow-up may be required.`,
      internalClassification: 'Other',
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

    return NextResponse.json({ success: true, integration })
  } catch (error) {
    console.error('Author financial setup form error:', error)
    return NextResponse.json(
      { error: 'Unable to submit financial setup.' },
      { status: 500 },
    )
  }
}
