import { NextRequest, NextResponse } from 'next/server'
import { getImprintStrategyBySlug } from '@/data/imprints'
import { cleanString, missingFields, requiredFieldsResponse } from '@/lib/server/form-validation'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const required = ['firstName', 'email', 'imprintInterest']
    const missing = missingFields(body, required)
    if (missing.length) return requiredFieldsResponse(missing)

    const imprint = getImprintStrategyBySlug(cleanString(body.imprintInterest))
    if (!imprint) {
      return NextResponse.json({ error: 'A valid imprint interest is required.' }, { status: 400 })
    }

    const submittedAt = new Date().toISOString()
    const payload = {
      formType: 'reader-funnel-signup',
      submittedAt,
      route: '/readers',
      source: cleanString(body.source) || 'Book CTA',
      payload: {
        firstName: cleanString(body.firstName),
        email: cleanString(body.email),
        imprintInterest: imprint.slug,
        imprintLabel: imprint.label,
        audienceSummary: imprint.audienceSummary,
        ctaEmphasis: imprint.recommendedCtaEmphasis,
        contextBookId: cleanString(body.contextBookId),
        contextTitle: cleanString(body.contextTitle),
        division: 'publishing',
        divisionNumber: '01',
      },
    }

    const automationUrl =
      process.env.POWER_AUTOMATE_READER_SIGNUP_URL || process.env.POWER_AUTOMATE_NEWSLETTER_URL

    if (!automationUrl) {
      if (process.env.NODE_ENV === 'production') {
        return NextResponse.json(
          { error: 'Reader signup is not fully configured yet. Please try again soon.' },
          { status: 503 },
        )
      }

      console.log('DEV: Reader funnel signup', JSON.stringify(payload, null, 2))
      return NextResponse.json({ success: true, mode: 'development_stub' })
    }

    const response = await fetch(automationUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      console.error('Reader funnel automation error:', response.status, await response.text())
      return NextResponse.json(
        { error: 'Unable to save your reader signup right now. Please try again.' },
        { status: 502 },
      )
    }

    return NextResponse.json({ success: true, mode: 'forwarded' })
  } catch (error) {
    console.error('Reader funnel signup error:', error)
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 },
    )
  }
}
