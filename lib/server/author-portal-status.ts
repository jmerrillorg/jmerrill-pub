export type AuthorPortalWorkspaceState =
  | 'pre_contract_setup'
  | 'awaiting_governed_action'
  | 'editorial_review'
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

  return {
    stageLabel: stageLabel?.trim() || 'Editorial Review',
    stageStatus: 'Not Started',
    summary: 'Editorial Review has not yet started.',
    nextActionLabel: 'Current status: Awaiting editorial scheduling.',
  }
}
