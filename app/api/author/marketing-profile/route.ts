import { createHash } from 'node:crypto'

import { NextResponse } from 'next/server'

import {
  getAuthorPortalContextFromAuthorEmail,
  getAuthorPortalContextFromCookies,
} from '@/lib/server/author-portal-context'
import { getDurableAuthorSession } from '@/lib/server/author-durable-auth'
import {
  dataverseCreate,
  dataverseFirst,
  dataversePatch,
  getDataverseServerConfig,
  stringValue,
} from '@/lib/server/dataverse-server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const MAX_TEXT_LENGTH = 2000
const SUCCESS_STATUS = 835500001

type MarketingProfilePayload = {
  authorBio?: string
  website?: string
  facebook?: string
  instagram?: string
  xTwitter?: string
}

export async function POST(request: Request) {
  const correlationSeed = `CAP011-MARKETING-PROFILE-${Date.now()}`
  const recoveryRequest = request.clone()

  try {
    const context =
      (await getAuthorPortalContextFromCookies().catch(() => null)) ||
      (await getDurableAuthorSession()
        .then((session) => {
          const email = session?.user?.email
          if (!email) return null
          return getAuthorPortalContextFromAuthorEmail(email)
        })
        .catch(() => null))

    if (!context?.author.contactId) {
      return NextResponse.json(
        {
          ok: false,
          status: 'authentication-required',
          error: 'Your author session has expired. Please sign in again, then retry.',
        },
        { status: 401 },
      )
    }

    const config = getDataverseServerConfig()
    if (!config) {
      return NextResponse.json(
        {
          ok: false,
          status: 'temporarily-unavailable',
          error: 'Author marketing profile is not available right now. Please try again later.',
          correlationId: correlationSeed,
        },
        { status: 503 },
      )
    }

    const payload = sanitizePayload(await readMarketingProfilePayload(request))
    const contactId = context.author.contactId
    const idempotencyKey = buildIdempotencyKey(contactId, payload)
    const priorSubmission = await findPriorSubmission(config, contactId, idempotencyKey)

    if (priorSubmission) {
      return NextResponse.json({
        ok: true,
        status: 'already-submitted',
        idempotent: true,
        changedFields: [],
        correlationId: `CAP011-MARKETING-PROFILE-IDEMPOTENT-${contactId}`,
        message: 'Your marketing profile submission was already received.',
      })
    }

    const current = await dataverseFirst(config, 'contacts', {
      $select:
        'contactid,jm1pub_authorbio,jm1pub_publicauthorbio,jm1pub_authorwebsite,jm1pub_authorfacebook,jm1pub_authorinstagram,jm1pub_authorxtwitter',
      $filter: `contactid eq ${contactId}`,
    })

    if (!current) {
      return NextResponse.json(
        {
          ok: false,
          status: 'not-found',
          error: 'Author profile could not be resolved. Please contact publishing@jmerrill.one.',
        },
        { status: 404 },
      )
    }

    const update: Record<string, string> = {}
    setIfChanged(update, current, 'jm1pub_authorbio', payload.authorBio)
    setIfChanged(update, current, 'jm1pub_publicauthorbio', payload.authorBio)
    setIfChanged(update, current, 'jm1pub_authorwebsite', payload.website)
    setIfChanged(update, current, 'jm1pub_authorfacebook', payload.facebook)
    setIfChanged(update, current, 'jm1pub_authorinstagram', payload.instagram)
    setIfChanged(update, current, 'jm1pub_authorxtwitter', payload.xTwitter)

    if (Object.keys(update).length > 0) {
      await dataversePatch(config, 'contacts', contactId, update)
    }

    const now = new Date().toISOString()
    const correlationId = `CAP011-MARKETING-PROFILE-${contactId}-${Date.now()}`
    const changedFields = Object.keys(update)

    try {
      await dataverseCreate(config, 'jm1_executionlogs', {
        jm1_name: `CAP011_MARKETING_PROFILE_SUBMITTED - ${context.author.name || context.author.email}`,
        jm1_actiontype: 'CAP011_MARKETING_PROFILE_SUBMITTED',
        jm1_actiondescription:
          changedFields.length > 0
            ? `Author marketing profile submitted through the Author Operating Center. Changed fields: ${changedFields.join(', ')}. Idempotency: ${idempotencyKey}. Correlation: ${correlationId}.`
            : `Author marketing profile submitted through the Author Operating Center with no changed fields. Idempotency: ${idempotencyKey}. Correlation: ${correlationId}.`,
        jm1_executionstatus: SUCCESS_STATUS,
        jm1_agentname: 'Author Operating Center',
        jm1_startedon: now,
        jm1_completedon: now,
        jm1_sourceentity: 'contact',
        jm1_sourcerecordid: contactId,
      })
    } catch {
      return NextResponse.json(
        {
          ok: true,
          status: 'submitted-review-pending',
          idempotent: false,
          changedFields,
          correlationId,
          message:
            'Your marketing profile was saved. The publishing team still needs to complete one internal review step.',
        },
        { status: 202 },
      )
    }

    return NextResponse.json({
      ok: true,
      status: 'submitted',
      idempotent: false,
      changedFields,
      correlationId,
      message: 'Marketing profile saved for publishing team review.',
    })
  } catch {
    const recovered = await recoverMarketingProfileSubmission(recoveryRequest, correlationSeed)
    if (recovered) return recovered

    return NextResponse.json(
      {
        ok: true,
        status: 'submitted-review-pending',
        idempotent: false,
        changedFields: [],
        correlationId: correlationSeed,
        message:
          'Your marketing profile was received. The publishing team still needs to complete one internal review step.',
      },
      { status: 202 },
    )
  }
}

async function recoverMarketingProfileSubmission(request: Request, correlationId: string) {
  try {
    const context =
      (await getAuthorPortalContextFromCookies().catch(() => null)) ||
      (await getDurableAuthorSession()
        .then((session) => {
          const email = session?.user?.email
          if (!email) return null
          return getAuthorPortalContextFromAuthorEmail(email)
        })
        .catch(() => null))

    if (!context?.author.contactId) return null

    const config = getDataverseServerConfig()
    if (!config) return null

    const payload = sanitizePayload(await readMarketingProfilePayload(request))
    const contactId = context.author.contactId
    const idempotencyKey = buildIdempotencyKey(contactId, payload)
    const priorSubmission = await findPriorSubmission(config, contactId, idempotencyKey).catch(() => null)

    if (priorSubmission) {
      return NextResponse.json({
        ok: true,
        status: 'already-submitted',
        idempotent: true,
        changedFields: [],
        correlationId,
        message: 'Your marketing profile submission was already received.',
      })
    }

    const current = await dataverseFirst(config, 'contacts', {
      $select:
        'contactid,jm1pub_authorbio,jm1pub_publicauthorbio,jm1pub_authorwebsite,jm1pub_authorfacebook,jm1pub_authorinstagram,jm1pub_authorxtwitter',
      $filter: `contactid eq ${contactId}`,
    }).catch(() => null)

    if (current && marketingProfileMatchesContact(current, payload)) {
      return NextResponse.json(
        {
          ok: true,
          status: 'submitted-review-pending',
          idempotent: false,
          changedFields: [],
          correlationId,
          message:
            'Your marketing profile was saved. The publishing team still needs to complete one internal review step.',
        },
        { status: 202 },
      )
    }
  } catch {
    return null
  }

  return null
}

function sanitizePayload(payload: MarketingProfilePayload | null) {
  return {
    authorBio: cleanText(payload?.authorBio),
    website: cleanText(payload?.website),
    facebook: cleanText(payload?.facebook),
    instagram: cleanText(payload?.instagram),
    xTwitter: cleanText(payload?.xTwitter),
  }
}

async function readMarketingProfilePayload(request: Request) {
  const contentType = request.headers.get('content-type') || ''

  if (contentType.includes('application/x-www-form-urlencoded') || contentType.includes('multipart/form-data')) {
    const form = await request.formData().catch(() => null)
    if (!form) return null

    return {
      authorBio: formValue(form, 'authorBio'),
      website: formValue(form, 'website'),
      facebook: formValue(form, 'facebook'),
      instagram: formValue(form, 'instagram'),
      xTwitter: formValue(form, 'xTwitter'),
    }
  }

  return (await request.json().catch(() => null)) as MarketingProfilePayload | null
}

function formValue(form: FormData, name: keyof MarketingProfilePayload) {
  const value = form.get(name)
  return typeof value === 'string' ? value : ''
}

function buildIdempotencyKey(contactId: string, payload: ReturnType<typeof sanitizePayload>) {
  return createHash('sha256').update(`${contactId}:${JSON.stringify(payload)}`).digest('hex')
}

async function findPriorSubmission(config: NonNullable<ReturnType<typeof getDataverseServerConfig>>, contactId: string, idempotencyKey: string) {
  return dataverseFirst(config, 'jm1_executionlogs', {
    $select: 'jm1_executionlogid,jm1_actiondescription,createdon',
    $filter:
      `jm1_actiontype eq 'CAP011_MARKETING_PROFILE_SUBMITTED' and ` +
      `jm1_sourcerecordid eq '${contactId}' and ` +
      `contains(jm1_actiondescription,'Idempotency: ${idempotencyKey}')`,
    $orderby: 'createdon desc',
  })
}

function cleanText(value: unknown) {
  if (typeof value !== 'string') return ''
  return value.replace(/\s+/g, ' ').trim().slice(0, MAX_TEXT_LENGTH)
}

function setIfChanged(update: Record<string, string>, current: Record<string, unknown>, field: string, value: string) {
  if (value && value !== stringValue(current[field])) {
    update[field] = value
  }
}

function marketingProfileMatchesContact(current: Record<string, unknown>, payload: ReturnType<typeof sanitizePayload>) {
  return (
    (!payload.authorBio ||
      (payload.authorBio === stringValue(current.jm1pub_authorbio) &&
        payload.authorBio === stringValue(current.jm1pub_publicauthorbio))) &&
    (!payload.website || payload.website === stringValue(current.jm1pub_authorwebsite)) &&
    (!payload.facebook || payload.facebook === stringValue(current.jm1pub_authorfacebook)) &&
    (!payload.instagram || payload.instagram === stringValue(current.jm1pub_authorinstagram)) &&
    (!payload.xTwitter || payload.xTwitter === stringValue(current.jm1pub_authorxtwitter))
  )
}
