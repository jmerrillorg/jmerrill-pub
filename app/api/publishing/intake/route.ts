import { NextRequest, NextResponse } from 'next/server'
import { enqueuePublishingIntakeDeadLetter } from '@/lib/publishing/intake/deadLetter'
import { sendJoinAuthorAcknowledgment } from '@/lib/publishing/intake/authorAcknowledgment'
import {
  markPublishingIntakeAcknowledgmentSent,
  markPublishingIntakeManuscriptReceived,
  markPublishingIntakeWorkspaceCreated,
  writePublishingIntakeWithRetry,
} from '@/lib/publishing/intake/dataverse'
import { getIdempotencyReplay, rememberIdempotencyKey } from '@/lib/publishing/intake/idempotency'
import { sendJoinInternalNotification } from '@/lib/publishing/intake/internalNotification'
import {
  ensureInquiryWorkspace,
  uploadManuscriptToInquiryWorkspace,
  validateManuscriptUploadCandidate,
  verifyShareableManuscriptLink,
  type ManuscriptUploadCandidate,
} from '@/lib/publishing/intake/manuscriptUpload'
import { checkIntakeRateLimit, getClientIp } from '@/lib/publishing/intake/rateLimit'
import { generateIntakeReference } from '@/lib/publishing/intake/reference'
import {
  createNormalizedPublishingIntake,
  validatePublishingIntakeBody,
  type IntakeValidationError,
} from '@/lib/publishing/intake/schema'
import { maskEmail, maskName } from '@/lib/publishing/intake/sanitize'
import { verifyTurnstileToken } from '@/lib/publishing/intake/turnstile'

export const dynamic = 'force-dynamic'

type IntakeResponseBody =
  | { status: 'received'; reference: string }
  | { status: 'invalid'; code: 'validation_failed'; errors: IntakeValidationError[] }
  | { status: 'duplicate' }
  | { status: 'rate_limited' }
  | IntakeErrorResponse

type IntakeErrorCode =
  | 'validation_failed'
  | 'turnstile_verification_failed'
  | 'dataverse_configuration_missing'
  | 'dataverse_token_failed'
  | 'dataverse_write_failed'
  | 'dead_letter_failed'
  | 'author_acknowledgment_failed'
  | 'author_acknowledgment_writeback_failed'
  | 'sharepoint_workspace_failed'
  | 'manuscript_upload_failed'
  | 'manuscript_writeback_failed'
  | 'unexpected_exception'

type IntakeErrorResponse = {
  status: 'error'
  message: 'We could not receive your submission right now.'
  code: IntakeErrorCode
  detail: string
  reference?: string
}

export async function OPTIONS(req: NextRequest) {
  const origin = req.headers.get('origin')
  const originResult = validateOrigin(origin)

  if (!originResult.allowed) {
    return json(
      buildErrorResponse('unexpected_exception', 'origin_not_allowed'),
      403,
    )
  }

  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders(originResult.origin),
  })
}

export async function POST(req: NextRequest) {
  try {
    return await handlePublishingIntakePost(req)
  } catch (error) {
    console.error('Publishing intake unexpected exception.', {
      reason: error instanceof Error ? error.name : 'unknown',
    })

    return json(
      buildErrorResponse('unexpected_exception', error instanceof Error ? error.name : 'unknown'),
      500,
    )
  }
}

type ParsedIntakeRequest = {
  body: Record<string, unknown>
  manuscriptFile: ManuscriptUploadCandidate | null
}

async function handlePublishingIntakePost(req: NextRequest) {
  const origin = req.headers.get('origin')
  const originResult = validateOrigin(origin)

  if (!originResult.allowed) {
    return json(
      buildErrorResponse('unexpected_exception', 'origin_not_allowed'),
      403,
    )
  }

  let parsedRequest: ParsedIntakeRequest

  try {
    parsedRequest = await parseIntakeRequest(req)
  } catch {
    return json(
      {
        status: 'invalid',
        code: 'validation_failed',
        errors: [{ field: 'request', message: 'Invalid request body.' }],
      },
      400,
      originResult.origin,
    )
  }

  const body = parsedRequest.body
  const manuscriptFile = parsedRequest.manuscriptFile
  const token = extractTurnstileToken(body)
  const ip = getClientIp(req.headers)
  const turnstile = await verifyTurnstileToken(token, ip)

  if (!turnstile.ok) {
    console.warn('Publishing intake blocked by Turnstile.', {
      reason: turnstile.reason,
      ip: ip === 'unknown' ? 'unknown' : '[masked-ip]',
    })

    return json(
      buildErrorResponse('turnstile_verification_failed', sanitizeDiagnosticDetail(turnstile.reason || 'unknown')),
      400,
      originResult.origin,
    )
  }

  const rateLimit = checkIntakeRateLimit(ip)
  if (!rateLimit.allowed) {
    return json(
      { status: 'rate_limited' },
      429,
      originResult.origin,
      rateLimit.retryAfterSeconds ? { 'Retry-After': String(rateLimit.retryAfterSeconds) } : undefined,
    )
  }

  const validation = validatePublishingIntakeBody(body)
  if (!validation.ok) {
    return json(
      {
        status: 'invalid',
        code: 'validation_failed',
        errors: validation.errors,
      },
      400,
      originResult.origin,
    )
  }

  if (manuscriptFile) {
    const uploadValidation = validateManuscriptUploadCandidate(manuscriptFile)
    if (!uploadValidation.ok) {
      return json(
        {
          status: 'invalid',
          code: 'validation_failed',
          errors: [{ field: 'manuscriptFile', message: uploadValidation.message }],
        },
        400,
        originResult.origin,
      )
    }
  }

  const submittedManuscriptUrl = validation.data.manuscriptUrl
  if (submittedManuscriptUrl && !manuscriptFile) {
    const linkVerification = await verifyShareableManuscriptLink(submittedManuscriptUrl)
    if (linkVerification.status !== 'usable') {
      return json(
        {
          status: 'invalid',
          code: 'validation_failed',
          errors: [{ field: 'manuscriptUrl', message: manuscriptLinkError(linkVerification.reason) }],
        },
        400,
        originResult.origin,
      )
    }
  }

  const replay = getIdempotencyReplay(validation.data.idempotencyKey)
  if (replay) {
    return json({ status: 'duplicate' }, 409, originResult.origin)
  }

  const reference = generateIntakeReference()
  const intake = createNormalizedPublishingIntake(validation.data, reference)

  const dataverse = await writePublishingIntakeWithRetry(intake)
  if (dataverse.status === 'success' || dataverse.status === 'skipped') {
    rememberIdempotencyKey(intake.idempotencyKey, reference)

    let acknowledgmentIntake = intake

    if (dataverse.status === 'success') {
      const workspace = manuscriptFile
        ? await uploadManuscriptToInquiryWorkspace(intake, manuscriptFile)
        : await ensureInquiryWorkspace(intake)

      if (workspace.status === 'failed' || workspace.status === 'skipped') {
        console.error('Publishing intake SharePoint workspace step failed.', {
          reason: workspace.reason,
          reference,
          recordId: dataverse.recordId,
        })
      } else {
        const workspaceWriteback = await markPublishingIntakeWorkspaceCreated(dataverse.recordId, workspace)
        if (workspaceWriteback.status !== 'success') {
          console.warn('Publishing intake workspace writeback did not complete.', {
            status: workspaceWriteback.status,
            reason: workspaceWriteback.reason,
            reference,
          })
        }

        if (workspace.status === 'uploaded') {
          acknowledgmentIntake = { ...intake, manuscriptUrl: workspace.manuscriptUrl }
          const manuscriptWriteback = await markPublishingIntakeManuscriptReceived(dataverse.recordId, {
            manuscriptUrl: workspace.manuscriptUrl,
          })

          if (manuscriptWriteback.status !== 'success') {
            console.error('Publishing intake manuscript writeback failed after upload.', {
              status: manuscriptWriteback.status,
              reason: manuscriptWriteback.reason,
              reference,
            })
          }
        } else if (submittedManuscriptUrl) {
          const manuscriptWriteback = await markPublishingIntakeManuscriptReceived(dataverse.recordId, {
            manuscriptUrl: submittedManuscriptUrl,
          })

          if (manuscriptWriteback.status !== 'success') {
            console.error('Publishing intake manuscript link writeback failed.', {
              status: manuscriptWriteback.status,
              reason: manuscriptWriteback.reason,
              reference,
            })
          }
        }
      }
    }

    const notification = await sendJoinInternalNotification(
      acknowledgmentIntake,
      dataverse.status === 'success' ? { recordId: dataverse.recordId } : undefined,
    )
    if (notification.status !== 'sent') {
      console.warn('Publishing intake internal notification did not send.', {
        status: notification.status,
        reason: notification.reason,
        reference,
      })
    }

    const acknowledgment = await sendJoinAuthorAcknowledgment(acknowledgmentIntake)
    if (acknowledgment.status !== 'sent') {
      console.warn('Publishing intake direct author acknowledgment did not send; leaving Flow B fallback pending.', {
        status: acknowledgment.status,
        reason: acknowledgment.reason,
        reference,
      })
    }

    if (acknowledgment.status === 'sent' && dataverse.status === 'success') {
      const acknowledgmentWriteback = await markPublishingIntakeAcknowledgmentSent(dataverse.recordId)
      if (acknowledgmentWriteback.status !== 'success') {
        console.warn('Publishing intake author acknowledgment writeback did not complete; Flow B may still evaluate the row.', {
          status: acknowledgmentWriteback.status,
          reason: acknowledgmentWriteback.reason,
          reference,
        })
      }
    }

    return json({ status: 'received', reference }, 201, originResult.origin)
  }

  const deadLetter = await enqueuePublishingIntakeDeadLetter(intake, dataverse.reason)
  if (deadLetter.status === 'enqueued') {
    console.error('Publishing intake Dataverse write failed; payload dead-lettered.', {
      reason: dataverse.reason,
      reference,
      firstName: maskName(intake.firstName),
      email: maskEmail(intake.email),
    })
  }

  console.error('Publishing intake failed without Dataverse write or dead-letter.', {
    dataverseReason: dataverse.reason,
    deadLetterStatus: deadLetter.status,
    reference,
    firstName: maskName(intake.firstName),
    email: maskEmail(intake.email),
  })

  const diagnostics = buildFailureDiagnostics(dataverse.reason)
  return json(
    buildErrorResponse(diagnostics.code, diagnostics.detail, reference),
    diagnostics.httpStatus,
    originResult.origin,
  )
}

async function parseIntakeRequest(req: NextRequest): Promise<ParsedIntakeRequest> {
  const contentType = req.headers.get('content-type') || ''

  if (contentType.includes('multipart/form-data')) {
    const formData = await req.formData()
    const body: Record<string, unknown> = {}
    let manuscriptFile: ManuscriptUploadCandidate | null = null

    for (const [key, value] of formData.entries()) {
      if (key === 'manuscriptFile' && isFileLike(value) && value.size > 0) {
        manuscriptFile = {
          fileName: value.name,
          contentType: value.type,
          size: value.size,
          bytes: await value.arrayBuffer(),
        }
        continue
      }

      if (typeof value === 'string') {
        body[key] = coerceMultipartValue(key, value)
      }
    }

    return { body, manuscriptFile }
  }

  const body = await req.json()
  if (!isRecord(body)) throw new Error('invalid_json_body')
  return { body, manuscriptFile: null }
}

function coerceMultipartValue(key: string, value: string): unknown {
  if (key === 'wordCount') return Number.parseInt(value, 10)
  if (key === 'consent') return value === 'true'
  return value
}

function isFileLike(value: FormDataEntryValue): value is File {
  return typeof value === 'object' &&
    value !== null &&
    'arrayBuffer' in value &&
    'name' in value &&
    'size' in value
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function json(
  body: IntakeResponseBody,
  status: number,
  origin?: string | null,
  extraHeaders?: Record<string, string>,
) {
  return NextResponse.json(body, {
    status,
    headers: {
      ...corsHeaders(origin),
      ...extraHeaders,
    },
  })
}

function extractTurnstileToken(body: unknown) {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) return ''
  const value = (body as Record<string, unknown>).turnstileToken
  return typeof value === 'string' ? value : ''
}

function manuscriptLinkError(reason: string) {
  if (reason === 'link_check_timeout') {
    return 'We could not confirm this manuscript link before the request timed out. Please upload the file or provide a reachable share link.'
  }

  return 'Provide a reachable manuscript link, or upload a .docx, .doc, or .pdf file.'
}

function buildErrorResponse(code: IntakeErrorCode, detail: string, reference?: string): IntakeErrorResponse {
  return {
    status: 'error',
    message: 'We could not receive your submission right now.',
    code,
    detail: sanitizeDiagnosticDetail(detail),
    ...(reference ? { reference } : {}),
  }
}

function buildFailureDiagnostics(reason: string): {
  code: IntakeErrorCode
  detail: string
  httpStatus: number
} {
  const detail = sanitizeDiagnosticDetail(reason)

  if (reason.startsWith('dataverse_configuration_missing:')) {
    return { code: 'dataverse_configuration_missing', detail, httpStatus: 500 }
  }

  if (reason.startsWith('dataverse_write_exception:dataverse_token_failed:')) {
    return { code: 'dataverse_token_failed', detail, httpStatus: 502 }
  }

  if (reason.startsWith('dataverse_write_failed:')) {
    const status = Number.parseInt(reason.split(':')[1] || '', 10)
    const httpStatus = status === 401 || status === 403 ? 502 : status >= 500 ? 503 : 502
    return { code: 'dataverse_write_failed', detail, httpStatus }
  }

  if (reason.startsWith('dataverse_write_exception:')) {
    return { code: 'dataverse_write_failed', detail, httpStatus: 503 }
  }

  return { code: 'dead_letter_failed', detail, httpStatus: 500 }
}

function sanitizeDiagnosticDetail(value: string) {
  return value
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[redacted-email]')
    .replace(/\+?\d[\d\s().-]{7,}\d/g, '[redacted-phone]')
    .replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/gi, 'Bearer [redacted-token]')
    .replace(/secret[=:][^,;\s]+/gi, 'secret=[redacted-secret]')
    .slice(0, 240)
}

function validateOrigin(origin: string | null): { allowed: true; origin: string | null } | { allowed: false } {
  if (!origin && process.env.NODE_ENV !== 'production') {
    return { allowed: true, origin: null }
  }

  if (!origin) return { allowed: false }

  const allowedOrigins = getAllowedOrigins()
  return allowedOrigins.has(origin)
    ? { allowed: true, origin }
    : { allowed: false }
}

function getAllowedOrigins() {
  const configured = process.env.INTAKE_ALLOWED_ORIGINS
    ?.split(',')
    .map((item) => item.trim())
    .filter(Boolean)

  const defaults = [
    'https://jmerrill.pub',
    'https://www.jmerrill.pub',
    ...(process.env.NODE_ENV !== 'production'
      ? ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002', 'http://127.0.0.1:3000']
      : []),
  ]

  return new Set(configured?.length ? configured : defaults)
}

function corsHeaders(origin?: string | null) {
  const headers: Record<string, string> = {
    'Vary': 'Origin',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  }

  if (origin) {
    headers['Access-Control-Allow-Origin'] = origin
  }

  return headers
}
