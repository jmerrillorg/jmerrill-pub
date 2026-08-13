import { NextRequest, NextResponse } from 'next/server'
import {
  submitAuthorExperienceAnswers,
  validateAuthorExperienceAnswers,
} from '@/lib/publishing/author-experience-response'

export const dynamic = 'force-dynamic'

type ErrorCode =
  | 'validation_failed'
  | 'origin_not_allowed'
  | 'dataverse_configuration_missing'
  | 'dataverse_write_failed'
  | 'unexpected_exception'

export async function OPTIONS(req: NextRequest) {
  const origin = validateOrigin(req.headers.get('origin'))
  if (!origin.allowed) return response({ status: 'error', code: 'origin_not_allowed' }, 403)

  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders(origin.origin),
  })
}

export async function POST(req: NextRequest) {
  const origin = validateOrigin(req.headers.get('origin'))
  if (!origin.allowed) return response({ status: 'error', code: 'origin_not_allowed' }, 403)

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return response({ status: 'invalid', code: 'validation_failed', errors: ['Invalid request body.'] }, 400, origin.origin)
  }

  const validation = validateAuthorExperienceAnswers(body)
  if (!validation.ok) {
    return response({ status: 'invalid', code: 'validation_failed', errors: validation.errors }, 400, origin.origin)
  }

  try {
    const result = await submitAuthorExperienceAnswers(validation.answers)
    return response(
      {
        status: 'received',
        reference: result.responseIdentifier.slice(0, 12).toUpperCase(),
      },
      201,
      origin.origin,
    )
  } catch (error) {
    const code = classifyError(error)
    console.error('Author experience survey submission failed.', {
      code,
      reason: error instanceof Error ? error.message.split(':')[0] : 'unknown',
    })

    return response(
      {
        status: 'error',
        code,
        message: 'We could not receive your feedback right now.',
      },
      code === 'dataverse_configuration_missing' ? 503 : 502,
      origin.origin,
    )
  }
}

function validateOrigin(origin: string | null) {
  if (!origin) return { allowed: true, origin: undefined }

  const allowed = new Set(
    (
      process.env.AUTHOR_EXPERIENCE_ALLOWED_ORIGINS ||
      'https://jmerrill.pub,https://www.jmerrill.pub,https://app-jm1-pub-prod.azurewebsites.net,https://app-jm1-pub-prod-staging.azurewebsites.net'
    )
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean),
  )

  if (process.env.NODE_ENV !== 'production') {
    allowed.add('http://localhost:3000')
    allowed.add('http://127.0.0.1:3000')
  }

  return { allowed: allowed.has(origin), origin }
}

function response(body: Record<string, unknown>, status: number, origin?: string) {
  return NextResponse.json(body, {
    status,
    headers: corsHeaders(origin),
  })
}

function corsHeaders(origin?: string) {
  return {
    ...(origin ? { 'Access-Control-Allow-Origin': origin } : {}),
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    Vary: 'Origin',
  }
}

function classifyError(error: unknown): ErrorCode {
  const message = error instanceof Error ? error.message : ''
  if (message.includes('dataverse_configuration_missing')) return 'dataverse_configuration_missing'
  if (message.includes('dataverse_')) return 'dataverse_write_failed'
  return 'unexpected_exception'
}
