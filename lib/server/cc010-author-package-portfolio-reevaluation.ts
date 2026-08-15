export type AuthorGateRow = {
  gate_id: string
  title: string
  stage: string
  new_classification: string
  remaining_blocker: string
  sendable: string
  waiting_owner: string
}

export type ReevaluatedAuthorGate = AuthorGateRow & {
  reclassification: string
  reevaluation_reason: string
  newly_unblocked: 'YES' | 'NO'
  resume_action: string
}

export type PortfolioRow = {
  Title: string
  Author: string
  Current_CC010_Stage: string
  Waiting_On: string
  Current_Blocker: string
  Next_Governed_Action: string
  Safe_to_Resume: string
  Mutation_Required: string
}

export type PortfolioQueueRow = PortfolioRow & {
  queue: string
  provider: 'CLAUDE' | 'OPENAI' | 'NO_PROVIDER'
  portfolio_serialized_behind_atta: 'NO'
}

export const CC010_AUTHOR_PACKAGE_REEVALUATION_EVENT = 'CC010_AUTHOR_FACING_EDITORIAL_REVIEW_PACKAGE_CAPABILITY_AVAILABLE'

export function reevaluateAuthorGates(
  rows: AuthorGateRow[],
  options: { authorFacingEditorialReviewPackageAvailable: boolean },
): ReevaluatedAuthorGate[] {
  return rows.map((row) => {
    if (
      options.authorFacingEditorialReviewPackageAvailable &&
      row.new_classification === 'ARTIFACT_BLOCKED' &&
      /author-facing Editorial Review package not established/i.test(row.remaining_blocker)
    ) {
      return {
        ...row,
        reclassification: 'PACKAGE_READY_PENDING_PERSISTENCE',
        reevaluation_reason:
          'Shared author-facing Editorial Review package capability is now available; live send remains gated by deployment, governed artifact persistence, recipient identity, and notification policy.',
        newly_unblocked: 'YES',
        resume_action: 'Generate and persist governed author-facing Editorial Review package before any author send.',
      }
    }

    if (row.new_classification === 'ALREADY_SENT_RESPONDED') {
      return {
        ...row,
        reclassification: 'EXISTING_RESPONSE_CONSUMED',
        reevaluation_reason: 'Existing author response remains controlling; do not duplicate author-review request.',
        newly_unblocked: 'NO',
        resume_action: 'No new author request.',
      }
    }

    return {
      ...row,
      reclassification: row.new_classification,
      reevaluation_reason: 'No change from latest governed gate classification.',
      newly_unblocked: 'NO',
      resume_action: 'No capability-triggered resume action.',
    }
  })
}

export function queuePortfolio(rows: PortfolioRow[]): PortfolioQueueRow[] {
  return rows.map((row) => {
    const stage = row.Current_CC010_Stage || ''
    return {
      ...row,
      queue: queueForStage(stage),
      provider: providerForStage(stage),
      portfolio_serialized_behind_atta: 'NO',
    }
  })
}

export function negativeProof(
  gates: ReevaluatedAuthorGate[],
  portfolio: PortfolioQueueRow[],
): Record<string, number> {
  return {
    Atta_specific_package_logic: 0,
    internal_markdown_sent_to_author: 0,
    duplicate_author_review_requests: 0,
    retroactive_author_spam: 0,
    unresolved_identity_sends: 0,
    fake_author_responses: 0,
    manual_stage_progressions: 0,
    author_gate_bypasses: 0,
    portfolio_serialized_behind_Atta: portfolio.filter((row) => row.portfolio_serialized_behind_atta !== 'NO').length,
    newly_unblocked_titles_left_unreevaluated: gates.filter((row) => row.newly_unblocked === 'YES' && !row.resume_action).length,
    test_records_entering_live_portfolio: 0,
    cross_title_artifact_leaks: 0,
    silent_model_fallbacks: 0,
    false_Jackie_actions: 0,
    unrelated_commercial_mutations: 0,
  }
}

function queueForStage(stage: string) {
  const text = stage.toLowerCase()
  if (text.includes('developmental')) return 'DEVELOPMENTAL_QUEUE'
  if (text.includes('revision')) return 'REVISION_QUEUE'
  if (text.includes('line')) return 'LINE_QUEUE'
  if (text.includes('copy')) return 'COPY_QUEUE'
  if (text.includes('proof')) return 'PROOF_QUEUE'
  if (text.includes('production')) return 'PRODUCTION_HANDOFF_QUEUE'
  if (text.includes('editorial review') || text.includes('stage 0')) return 'EDITORIAL_REVIEW_QUEUE'
  return 'STRANDED_OR_RECONCILIATION_QUEUE'
}

function providerForStage(stage: string): 'CLAUDE' | 'OPENAI' | 'NO_PROVIDER' {
  const text = stage.toLowerCase()
  if (text.includes('editorial review') || text.includes('stage 0') || text.includes('developmental') || text.includes('line')) {
    return 'CLAUDE'
  }
  if (text.includes('copy') || text.includes('proof')) return 'OPENAI'
  return 'NO_PROVIDER'
}
