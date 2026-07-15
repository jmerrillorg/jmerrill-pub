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
  const context =
    (await getAuthorPortalContextFromCookies()) ||
    (await getDurableAuthorSession().then((session) => {
      const email = session?.user?.email
      if (!email) return null
      return getAuthorPortalContextFromAuthorEmail(email)
    }))

  if (!context?.author.contactId) {
    return NextResponse.json({ error: 'Author workspace session not found.' }, { status: 401 })
  }

  const config = getDataverseServerConfig()
  if (!config) {
    return NextResponse.json({ error: 'Author marketing profile is not available right now.' }, { status: 503 })
  }

  const payload = sanitizePayload((await request.json().catch(() => null)) as MarketingProfilePayload | null)
  const contactId = context.author.contactId
  const current = await dataverseFirst(config, 'contacts', {
    $select:
      'contactid,jm1pub_authorbio,jm1pub_publicauthorbio,jm1pub_authorwebsite,jm1pub_authorfacebook,jm1pub_authorinstagram,jm1pub_authorxtwitter',
    $filter: `contactid eq ${contactId}`,
  })

  if (!current) {
    return NextResponse.json({ error: 'Author profile could not be resolved.' }, { status: 404 })
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

  await dataverseCreate(config, 'jm1_executionlogs', {
    jm1_name: `CAP011_MARKETING_PROFILE_SUBMITTED - ${context.author.name || context.author.email}`,
    jm1_actiontype: 'CAP011_MARKETING_PROFILE_SUBMITTED',
    jm1_actiondescription:
      changedFields.length > 0
        ? `Author marketing profile submitted through the Author Operating Center. Changed fields: ${changedFields.join(', ')}. Correlation: ${correlationId}.`
        : `Author marketing profile submitted through the Author Operating Center with no changed fields. Correlation: ${correlationId}.`,
    jm1_executionstatus: SUCCESS_STATUS,
    jm1_agentname: 'Author Operating Center',
    jm1_startedon: now,
    jm1_completedon: now,
    jm1_sourceentity: 'contact',
    jm1_sourcerecordid: contactId,
  })

  return NextResponse.json({
    success: true,
    changedFields,
    correlationId,
    message: 'Marketing profile saved for publishing team review.',
  })
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

function cleanText(value: unknown) {
  if (typeof value !== 'string') return ''
  return value.replace(/\s+/g, ' ').trim().slice(0, MAX_TEXT_LENGTH)
}

function setIfChanged(update: Record<string, string>, current: Record<string, unknown>, field: string, value: string) {
  if (value && value !== stringValue(current[field])) {
    update[field] = value
  }
}
