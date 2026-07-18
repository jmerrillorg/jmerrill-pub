import { NextResponse } from 'next/server'

import { getPublisherOperatingCenterSession } from '@/lib/server/author-durable-auth'
import {
  clearPublisherEvidenceHold,
  initializePublisherEditorialReview,
  initializePublisherIntakeReview,
  logPublisherAuthorResponseAction,
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
  'place_asset_in_pipeline',
  'advance_stage',
  'begin_interior_layout',
  'begin_cover_design',
  'review_royalty_statement',
  'view_thread',
  'confirm_classification',
  'change_classification',
  'reconcile_response',
  'retry_failed_transition',
  'mark_non_decision_message',
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

  const body = (await req.json().catch(() => null)) as { action?: string; intakeId?: string; gateId?: string } | null
  const action = body?.action === 'initialize_publisher_intake_review' ? 'review_intake' : body?.action
  if (!body || !SUPPORTED_ACTIONS.includes(action as PublisherActionId)) {
    return NextResponse.json({ error: 'Unsupported publisher action.' }, { status: 400 })
  }
  const publisherAction = action as PublisherActionId

  try {
    let result: unknown
    switch (publisherAction) {
      case 'review_intake':
        if (!body.intakeId) return NextResponse.json({ error: 'Intake id is required.' }, { status: 400 })
        result = await initializePublisherIntakeReview({
          intakeId: body.intakeId,
          operatorEmail: session.user.email,
        })
        break
      case 'verify_manuscript':
        if (!body.intakeId) return NextResponse.json({ error: 'Intake id is required.' }, { status: 400 })
        result = await verifyPublisherManuscript({
          intakeId: body.intakeId,
          operatorEmail: session.user.email,
        })
        break
      case 'initialize_editorial_review':
        if (!body.intakeId) return NextResponse.json({ error: 'Intake id is required.' }, { status: 400 })
        result = await initializePublisherEditorialReview({
          intakeId: body.intakeId,
          operatorEmail: session.user.email,
        })
        break
      case 'place_evidence_hold':
        if (!body.intakeId) return NextResponse.json({ error: 'Intake id is required.' }, { status: 400 })
        result = await placePublisherEvidenceHold({
          intakeId: body.intakeId,
          operatorEmail: session.user.email,
        })
        break
      case 'remove_evidence_hold':
        if (!body.intakeId) return NextResponse.json({ error: 'Intake id is required.' }, { status: 400 })
        result = await clearPublisherEvidenceHold({
          intakeId: body.intakeId,
          operatorEmail: session.user.email,
        })
        break
      case 'view_thread':
      case 'confirm_classification':
      case 'change_classification':
      case 'reconcile_response':
      case 'retry_failed_transition':
      case 'mark_non_decision_message':
        if (!body.gateId) return NextResponse.json({ error: 'Approval gate id is required.' }, { status: 400 })
        result = await logPublisherAuthorResponseAction({
          gateId: body.gateId,
          operatorEmail: session.user.email,
          action: publisherAction,
        })
        break
      default:
        if (!body.intakeId) return NextResponse.json({ error: 'Intake id is required.' }, { status: 400 })
        result = await logPublisherOperationalAction({
          intakeId: body.intakeId,
          operatorEmail: session.user.email,
          action: publisherAction as Exclude<
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
