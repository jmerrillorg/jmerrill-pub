import { NextRequest, NextResponse } from 'next/server'
import { submitWebsiteForm } from '@/lib/server/form-integrations'
import { cleanString, missingFields, requiredFieldsResponse } from '@/lib/server/form-validation'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const required = ['authorName', 'email', 'phone', 'bookTitle', 'manuscriptStatus', 'publishingGoal']
    const missing = missingFields(body, required)
    if (missing.length) return requiredFieldsResponse(missing)

    const payload = {
      authorName: cleanString(body.authorName),
      legalName: cleanString(body.legalName),
      preferredName: cleanString(body.preferredName),
      email: cleanString(body.email),
      phone: cleanString(body.phone),
      mailingAddress: cleanString(body.mailingAddress),
      bookTitle: cleanString(body.bookTitle),
      subtitle: cleanString(body.subtitle),
      genre: cleanString(body.genre),
      manuscriptStatus: cleanString(body.manuscriptStatus),
      publishingGoal: cleanString(body.publishingGoal),
      packageInterest: cleanString(body.packageInterest),
      authorBio: cleanString(body.authorBio),
      audience: cleanString(body.audience),
      platformLinks: cleanString(body.platformLinks),
      manuscriptLink: cleanString(body.manuscriptLink),
      notes: cleanString(body.notes),
      source: 'author-onboarding-form',
      division: 'publishing',
      divisionNumber: '01',
      workflowStage: 'author-onboarding',
    }

    const integration = await submitWebsiteForm({
      formType: 'author-onboarding',
      source: 'author-onboarding-form',
      subject: `Author onboarding submitted: ${payload.authorName}`,
      dataverseFlowUrl: process.env.POWER_AUTOMATE_AUTHOR_ONBOARDING_URL,
      payload,
      notificationPreview: `${payload.authorName} submitted author onboarding for "${payload.bookTitle}".`,
    })

    return NextResponse.json({ success: true, integration })
  } catch (error) {
    console.error('Author onboarding form error:', error)
    return NextResponse.json(
      { error: 'Unable to submit author onboarding.' },
      { status: 500 },
    )
  }
}
