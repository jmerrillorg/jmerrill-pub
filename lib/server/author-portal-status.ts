export type AuthorPortalWorkspaceState =
  | 'pre_contract_setup'
  | 'awaiting_governed_action'
  | 'editorial_review'
  | 'developmental_editing'
  | 'line_editing'
  | 'editorial_in_progress'
  | 'production_in_progress'
  | 'distribution_release_pending'
  | 'published_legacy'
  | 'archived'

export type EditorialDisplayState = {
  stageLabel: string
  stageStatus: string
  summary: string
  nextActionLabel?: string
}

export function normalizeWorkspaceText(value?: string) {
  return value?.trim().toLowerCase() || ''
}

export function buildEditorialDisplayState({
  workspaceState,
  stageLabel,
  stageStatus,
  summary,
  nextActionLabel,
}: {
  workspaceState: AuthorPortalWorkspaceState
  stageLabel?: string
  stageStatus?: string
  summary?: string
  nextActionLabel?: string
}): EditorialDisplayState {
  const normalizedStatus = normalizeWorkspaceText(stageStatus)
  const hasActiveStatus = normalizedStatus === 'in progress' || normalizedStatus === 'active'

  if (workspaceState === 'editorial_in_progress' && hasActiveStatus) {
    return {
      stageLabel: stageLabel?.trim() || 'Editorial Review',
      stageStatus: stageStatus?.trim() || 'In Progress',
      summary: summary?.trim() || 'Editorial work is currently underway.',
      nextActionLabel,
    }
  }

  if (workspaceState === 'developmental_editing') {
    return {
      stageLabel: stageLabel?.trim() || 'Developmental Editing',
      stageStatus: stageStatus?.trim() || 'Not Started',
      summary:
        summary?.trim() ||
        'Developmental planning is being prepared for Volume I of the approved quarterly series.',
      nextActionLabel:
        nextActionLabel?.trim() ||
        'No action is required from you at this time. We will update you when the developmental plan is ready for review.',
    }
  }

  if (workspaceState === 'line_editing') {
    const authorReview =
      normalizedStatus === 'author review' ||
      normalizeWorkspaceText(summary).includes('author review') ||
      normalizeWorkspaceText(summary).includes('sent by email') ||
      normalizeWorkspaceText(nextActionLabel).includes('review the line-edited manuscript')

    return {
      stageLabel: stageLabel?.trim() || 'Line Editing',
      stageStatus: authorReview ? 'Author Review' : stageStatus?.trim() || 'In Progress',
      summary:
        summary?.trim() ||
        'Your Volume I line editing review package for The Intentional Leader has been sent by email and is ready for your review.',
      nextActionLabel:
        nextActionLabel?.trim() ||
        'Please review the line-edited manuscript and reply to the publishing team with your approval, bounded corrections, a discussion request, or a pause request.',
    }
  }

  return {
    stageLabel: stageLabel?.trim() || 'Editorial Review',
    stageStatus: 'Not Started',
    summary: 'Editorial Review has not yet started.',
    nextActionLabel: 'Current status: Awaiting editorial scheduling.',
  }
}
