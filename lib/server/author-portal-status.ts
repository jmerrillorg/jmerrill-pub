export type AuthorPortalWorkspaceState =
  | 'pre_contract_setup'
  | 'awaiting_governed_action'
  | 'editorial_review'
  | 'developmental_editing'
  | 'line_editing'
  | 'copyediting'
  | 'proofreading'
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

  if (workspaceState === 'copyediting') {
    const status = stageStatus?.trim() || 'In Progress'
    return buildStageDisplayState({
      stageLabel: 'Copyediting',
      stageStatus: status,
      summary,
      nextActionLabel,
      defaults: {
        inProgress: [
          'The publishing team is copyediting your approved manuscript.',
          'After internal quality review, your copyediting package will be sent to you for review.',
        ],
        internalQa: [
          'The publishing team is completing the internal quality review of your copyedited manuscript.',
          'Your copyediting package will be released after the quality review is complete.',
        ],
        authorReview: [
          'Your copyediting package is ready for your review.',
          'Review the package and submit your approval or requested corrections.',
        ],
        corrections: [
          'The publishing team is applying the approved copyediting corrections.',
          'We will confirm the corrected manuscript and prepare it for Proofreading.',
        ],
      },
    })
  }

  if (workspaceState === 'proofreading') {
    const status = stageStatus?.trim() || 'In Progress'
    return buildStageDisplayState({
      stageLabel: 'Proofreading',
      stageStatus: status,
      summary,
      nextActionLabel,
      defaults: {
        inProgress: [
          'The publishing team is proofreading your approved manuscript.',
          'After internal quality review, your proofreading package will be sent to you for review.',
        ],
        internalQa: [
          'The publishing team is completing the internal quality review of your proofread manuscript.',
          'Your proofreading package will be released after the quality review is complete.',
        ],
        authorReview: [
          'Your proofreading package is ready for your review.',
          'Review the package and submit your approval or requested corrections.',
        ],
        corrections: [
          'The publishing team is applying the approved proofreading corrections.',
          'We will confirm the corrected manuscript and prepare it for production.',
        ],
      },
    })
  }

  return {
    stageLabel: stageLabel?.trim() || 'Editorial Review',
    stageStatus: 'Not Started',
    summary: 'Editorial Review has not yet started.',
    nextActionLabel: 'Current status: Awaiting editorial scheduling.',
  }
}

function buildStageDisplayState({
  stageLabel,
  stageStatus,
  summary,
  nextActionLabel,
  defaults,
}: {
  stageLabel: string
  stageStatus: string
  summary?: string
  nextActionLabel?: string
  defaults: {
    inProgress: [string, string]
    internalQa: [string, string]
    authorReview: [string, string]
    corrections: [string, string]
  }
}): EditorialDisplayState {
  const normalizedStatus = normalizeWorkspaceText(stageStatus)
  const defaultPair =
    normalizedStatus.includes('author review')
      ? defaults.authorReview
      : normalizedStatus.includes('qa') || normalizedStatus.includes('quality')
        ? defaults.internalQa
        : normalizedStatus.includes('correction') || normalizedStatus.includes('revision')
          ? defaults.corrections
          : defaults.inProgress
  const publisherOwned =
    !normalizedStatus.includes('author review') &&
    !normalizedStatus.includes('correction') &&
    !normalizedStatus.includes('revision')
  const resolvedSummary = publisherOwned ? defaultPair[0] : summary?.trim() || defaultPair[0]
  const resolvedNextAction = publisherOwned ? defaultPair[1] : nextActionLabel?.trim() || defaultPair[1]

  return {
    stageLabel,
    stageStatus,
    summary: resolvedSummary,
    nextActionLabel:
      normalizeWorkspaceText(resolvedSummary) === normalizeWorkspaceText(resolvedNextAction)
        ? defaultPair[1]
        : resolvedNextAction,
  }
}
