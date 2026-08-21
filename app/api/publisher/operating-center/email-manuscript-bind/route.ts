import { NextResponse } from 'next/server'

import { getPublisherOperatingCenterSession } from '@/lib/server/author-durable-auth'
import { bindEmailManuscriptToIntake } from '@/lib/server/publishing-intake-manuscript-binding'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  const session = await getPublisherOperatingCenterSession()
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Publisher session not found.' }, { status: 401 })
  }

  const body = (await req.json().catch(() => null)) as {
    intakeId?: string
    messageId?: string
    attachmentId?: string
    mailbox?: string
  } | null

  if (!body?.intakeId || !body.messageId || !body.attachmentId) {
    return NextResponse.json(
      { error: 'intakeId, messageId, and attachmentId are required.' },
      { status: 400, headers: { 'Cache-Control': 'no-store' } },
    )
  }

  try {
    const result = await bindEmailManuscriptToIntake({
      intakeId: body.intakeId,
      messageId: body.messageId,
      attachmentId: body.attachmentId,
      mailbox: body.mailbox,
      operatorEmail: session.user.email,
    })
    return NextResponse.json({ status: 'completed', result }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Email manuscript binding failed.' },
      { status: 400, headers: { 'Cache-Control': 'no-store' } },
    )
  }
}
