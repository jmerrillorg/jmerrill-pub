import { NextRequest, NextResponse } from 'next/server'
import { submitWebsiteForm } from '@/lib/server/form-integrations'
import { cleanString, missingFields, requiredFieldsResponse } from '@/lib/server/form-validation'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const required = ['authorName', 'email', 'titleList', 'royaltyContact', 'reportingPreference']
    const missing = missingFields(body, required)
    if (missing.length) return requiredFieldsResponse(missing)

    const payload = {
      authorName: cleanString(body.authorName),
      email: cleanString(body.email),
      phone: cleanString(body.phone),
      titleList: cleanString(body.titleList),
      royaltyContact: cleanString(body.royaltyContact),
      reportingPreference: cleanString(body.reportingPreference),
      royaltyDashboardInterest: cleanString(body.royaltyDashboardInterest),
      preferredReportFrequency: cleanString(body.preferredReportFrequency),
      paymentCadence: cleanString(body.paymentCadence),
      existingAgreementStatus: cleanString(body.existingAgreementStatus),
      royaltyNotes: cleanString(body.royaltyNotes),
      notes: cleanString(body.notes),
      source: 'author-royalty-setup-form',
      division: 'publishing',
      divisionNumber: '01',
      workflowStage: 'royalty-setup',
      sensitiveIntake: true,
    }

    const integration = await submitWebsiteForm({
      formType: 'author-royalty-setup',
      source: 'author-royalty-setup-form',
      subject: `Author royalty setup submitted: ${payload.authorName}`,
      dataverseFlowUrl: process.env.POWER_AUTOMATE_AUTHOR_ROYALTY_URL,
      payload,
      notificationPreview: `${payload.authorName} submitted royalty setup details for: ${payload.titleList}.`,
    })

    return NextResponse.json({ success: true, integration })
  } catch (error) {
    console.error('Author royalty setup form error:', error)
    return NextResponse.json(
      { error: 'Unable to submit royalty setup.' },
      { status: 500 },
    )
  }
}
