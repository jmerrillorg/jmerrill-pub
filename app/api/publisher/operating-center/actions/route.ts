import { NextResponse } from 'next/server'

import { getPublisherOperatingCenterSession } from '@/lib/server/author-durable-auth'
import {
  clearPublisherEvidenceHold,
  initializePublisherEditorialReview,
  initializePublisherIntakeReview,
  logPublisherOperationalAction,
  placePublisherEvidenceHold,
  verifyPublisherManuscript,
  type PublisherActionId,
} from '@/lib/server/publisher-operating-center'

export const runtime = 'nodejs'

const SUPPORTED_ACTIONS: PublisherActionId[] = [
  'review_intake',
  'verify_manuscript',
  'initialize_editorial_review',
  'initialize_developmental_editing',
  'request_missing_information',
  'return_for_correction',
  'place_evidence_hold',
  'remove_evidence_hold',
  'retry_failed_operation',
]

export async function POST(req: Request) {
  const session = await getPublisherOperatingCenterSession()
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Publisher session not found.' }, { status: 401 })
  }

  const body = (await req.json().catch(() => null)) as { action?: string; intakeId?: string } | null
  const action = body?.action === 'initialize_publisher_intake_review' ? 'review_intake' : body?.action
  if (!body?.intakeId || !SUPPORTED_ACTIONS.includes(action as PublisherActionId)) {
    return NextResponse.json({ error: 'Unsupported publisher action.' }, { status: 400 })
  }

  try {
    let result: unknown
    switch (action as PublisherActionId) {
      case 'review_intake':
        result = await initializePublisherIntakeReview({
          intakeId: body.intakeId,
          operatorEmail: session.user.email,
        })
        break
      case 'verify_manuscript':
        result = await verifyPublisherManuscript({
          intakeId: body.intakeId,
          operatorEmail: session.user.email,
        })
        break
      case 'initialize_editorial_review':
        result = await initializePublisherEditorialReview({
          intakeId: body.intakeId,
          operatorEmail: session.user.email,
        })
        break
      case 'place_evidence_hold':
        result = await placePublisherEvidenceHold({
          intakeId: body.intakeId,
          operatorEmail: session.user.email,
        })
        break
      case 'remove_evidence_hold':
        result = await clearPublisherEvidenceHold({
          intakeId: body.intakeId,
          operatorEmail: session.user.email,
        })
        break
      default:
        result = await logPublisherOperationalAction({
          intakeId: body.intakeId,
          operatorEmail: session.user.email,
          action: action as Exclude<
            PublisherActionId,
            | 'review_intake'
            | 'verify_manuscript'
            | 'initialize_editorial_review'
            | 'place_evidence_hold'
            | 'remove_evidence_hold'
            | 'view_only'
          >,
        })
    }

    return NextResponse.json({ status: 'completed', result }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Publisher action failed.',
      },
      { status: 400, headers: { 'Cache-Control': 'no-store' } },
    )
  }
}
