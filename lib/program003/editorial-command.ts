export type EditorialStageType =
  | 'Editorial Review'
  | 'Developmental Editing'
  | 'Line Editing'
  | 'Copyediting'
  | 'Proofreading'
  | 'Production Handoff Readiness'

export type EditorialStageStatus =
  | 'Not Started'
  | 'Ready'
  | 'Scheduled'
  | 'In Progress'
  | 'Awaiting Internal Review'
  | 'Awaiting Author Review'
  | 'Awaiting Author Response'
  | 'Returned for Revision'
  | 'Approved'
  | 'Held'
  | 'Exception'
  | 'Complete'
  | 'Superseded'

export type EditorialGateDomain = 'Editorial' | 'Production' | 'Publication'

export type EditorialGateCode =
  | 'A1'
  | 'A2'
  | 'A3'
  | 'A4'
  | 'A5'
  | 'A6'
  | 'A7'
  | 'A8'
  | 'A9'

export type EditorialGateStatus =
  | 'Not Ready'
  | 'Ready for Author Review'
  | 'Awaiting Author Response'
  | 'Approved'
  | 'Returned for Revision'
  | 'Held'
  | 'Publisher Override'
  | 'Cancelled'

export type EditorialHealthStatus = 'Healthy' | 'Watch' | 'At Risk' | 'Blocked'

export type EditorialArtifactVisibility =
  | 'Author Facing'
  | 'Internal Only'
  | 'Publisher Only'
  | 'Shared Controlled'

export type EditorialArtifactStatus =
  | 'Draft'
  | 'Ready for Review'
  | 'Delivered'
  | 'Approved'
  | 'Returned'
  | 'Superseded'
  | 'Archived'

export type EditorialArtifactRecord = {
  id: string
  publishingAssetId: string
  titleId: string
  stageId: string
  gateId?: string
  artifactType: string
  visibility: EditorialArtifactVisibility
  status: EditorialArtifactStatus
  fileName: string
  repositoryPath: string
  currentApprovedArtifact: boolean
  deliveredOn?: string
  approvedOn?: string
}

export type EditorialSummaryRecord = {
  id: string
  publishingAssetId: string
  titleId: string
  stageId?: string
  gateId?: string
  summaryType: 'Author Safe Current' | 'Author Safe Historical' | 'Internal Operational' | 'Publisher Review'
  summaryStatus: 'Draft' | 'Ready' | 'Published to Workspace' | 'Superseded'
  headline: string
  body: string
  nextActionLabel?: string
  nextActionDueOn?: string
  publishedToWorkspaceOn?: string
}

export type EditorialApprovalGateRecord = {
  id: string
  publishingAssetId: string
  titleId: string
  stageId?: string
  gateCode: EditorialGateCode
  gateDomain: EditorialGateDomain
  gateStatus: EditorialGateStatus
  authorDecision?: 'Approve' | 'Request Revision' | 'Request Clarification' | 'Hold' | 'Decline' | 'Override Approved'
  authorResponseSummary?: string
  authorDecisionOn?: string
  nextStageAuthorized: boolean
  awaitingSince?: string
}

export type EditorialExceptionRecord = {
  id: string
  publishingAssetId: string
  titleId: string
  stageId?: string
  gateId?: string
  exceptionType: string
  severity: 'Low' | 'Moderate' | 'High' | 'Critical'
  status: 'Open' | 'Investigating' | 'Awaiting Publisher' | 'Awaiting Author' | 'Resolved' | 'Closed'
}

export type EditorialStageRecord = {
  id: string
  publishingAssetId: string
  titleId: string
  contactId: string
  stageType: EditorialStageType
  stageStatus: EditorialStageStatus
  stageSequence: number
  assignedEditor?: string
  governingStyleGuide?: string
  healthStatus: EditorialHealthStatus
  authorSafeSummary?: string
  startedOn?: string
  deliveredOn?: string
  completedOn?: string
}

export type EditorialPilotRecord = {
  publishingAssetId: string
  titleId: string
  contactId: string
  title: string
  authorName: string
  stages: EditorialStageRecord[]
  gates: EditorialApprovalGateRecord[]
  summaries: EditorialSummaryRecord[]
  artifacts: EditorialArtifactRecord[]
  exceptions: EditorialExceptionRecord[]
}

export type WorkspaceEditorialModule = {
  stageLabel: string
  healthStatus: EditorialHealthStatus
  stageSummary: string
  nextActionLabel: string
  nextActionDueOn?: string
  pendingApprovals: Array<{
    gateCode: EditorialGateCode
    label: string
    status: EditorialGateStatus
    domain: EditorialGateDomain
    summary?: string
  }>
  deliverables: Array<{
    fileName: string
    artifactType: string
    status: EditorialArtifactStatus
  }>
  timeline: Array<{
    label: string
    status: string
    date?: string
  }>
}

export type EditorialDashboardRollup = {
  totals: {
    activeAssets: number
    activeStages: number
    pendingApprovals: number
    openExceptions: number
  }
  stageCounts: Record<EditorialStageType, number>
  healthCounts: Record<EditorialHealthStatus, number>
  gateDomainCounts: Record<EditorialGateDomain, number>
  approvalBacklog: Array<{
    publishingAssetId: string
    title: string
    gateCode: EditorialGateCode
    status: EditorialGateStatus
  }>
}

const GATE_LABELS: Record<EditorialGateCode, string> = {
  A1: 'Editorial Review / Recommendation Acceptance',
  A2: 'Developmental Editing Completion',
  A3: 'Line Editing Completion',
  A4: 'Copyediting Completion',
  A5: 'Proofreading Completion',
  A6: 'Cover Design Approval',
  A7: 'Interior Layout Approval',
  A8: 'Production Approval',
  A9: 'Distribution / Release Approval',
}

const STAGE_TYPES: EditorialStageType[] = [
  'Editorial Review',
  'Developmental Editing',
  'Line Editing',
  'Copyediting',
  'Proofreading',
  'Production Handoff Readiness',
]

const HEALTH_TYPES: EditorialHealthStatus[] = ['Healthy', 'Watch', 'At Risk', 'Blocked']
const GATE_DOMAINS: EditorialGateDomain[] = ['Editorial', 'Production', 'Publication']

export function getGateLabel(gateCode: EditorialGateCode) {
  return GATE_LABELS[gateCode]
}

export function buildWorkspaceEditorialModule(record: EditorialPilotRecord): WorkspaceEditorialModule {
  const currentStage = [...record.stages].sort((a, b) => b.stageSequence - a.stageSequence)[0]
  const currentSummary =
    record.summaries.find(
      (summary) =>
        summary.stageId === currentStage?.id &&
        summary.summaryType === 'Author Safe Current' &&
        summary.summaryStatus === 'Published to Workspace',
    ) ??
    record.summaries.find((summary) => summary.summaryType === 'Author Safe Current')

  const pendingApprovals = record.gates
    .filter((gate) => gate.gateStatus === 'Ready for Author Review' || gate.gateStatus === 'Awaiting Author Response')
    .sort((a, b) => a.gateCode.localeCompare(b.gateCode))
    .map((gate) => ({
      gateCode: gate.gateCode,
      label: getGateLabel(gate.gateCode),
      status: gate.gateStatus,
      domain: gate.gateDomain,
      summary: gate.authorResponseSummary,
    }))

  const deliverables = record.artifacts
    .filter((artifact) => artifact.visibility === 'Author Facing')
    .map((artifact) => ({
      fileName: artifact.fileName,
      artifactType: artifact.artifactType,
      status: artifact.status,
    }))

  const timeline = record.stages
    .slice()
    .sort((a, b) => a.stageSequence - b.stageSequence)
    .map((stage) => ({
      label: stage.stageType,
      status: stage.stageStatus,
      date: stage.completedOn || stage.deliveredOn || stage.startedOn,
    }))

  return {
    stageLabel: currentStage?.stageType || 'Editorial Review',
    healthStatus: currentStage?.healthStatus || 'Watch',
    stageSummary:
      currentSummary?.body ||
      currentStage?.authorSafeSummary ||
      'Your manuscript is moving through the editorial lane with guided review and governed approval gates.',
    nextActionLabel: currentSummary?.nextActionLabel || inferNextAction(pendingApprovals),
    nextActionDueOn: currentSummary?.nextActionDueOn,
    pendingApprovals,
    deliverables,
    timeline,
  }
}

export function buildEditorialDashboardRollup(records: EditorialPilotRecord[]): EditorialDashboardRollup {
  const activeStages = records.flatMap((record) => record.stages)
  const gates = records.flatMap((record) => record.gates)
  const exceptions = records.flatMap((record) => record.exceptions)

  const stageCounts = Object.fromEntries(STAGE_TYPES.map((stage) => [stage, 0])) as Record<EditorialStageType, number>
  const healthCounts = Object.fromEntries(HEALTH_TYPES.map((status) => [status, 0])) as Record<EditorialHealthStatus, number>
  const gateDomainCounts = Object.fromEntries(GATE_DOMAINS.map((domain) => [domain, 0])) as Record<EditorialGateDomain, number>

  for (const stage of activeStages) {
    stageCounts[stage.stageType] += 1
    healthCounts[stage.healthStatus] += 1
  }

  for (const gate of gates.filter((gate) => gate.gateStatus !== 'Approved' && gate.gateStatus !== 'Cancelled')) {
    gateDomainCounts[gate.gateDomain] += 1
  }

  const approvalBacklog = records.flatMap((record) =>
    record.gates
      .filter((gate) => gate.gateStatus === 'Ready for Author Review' || gate.gateStatus === 'Awaiting Author Response')
      .map((gate) => ({
        publishingAssetId: record.publishingAssetId,
        title: record.title,
        gateCode: gate.gateCode,
        status: gate.gateStatus,
      })),
  )

  return {
    totals: {
      activeAssets: records.length,
      activeStages: activeStages.length,
      pendingApprovals: approvalBacklog.length,
      openExceptions: exceptions.filter((exception) => exception.status !== 'Resolved' && exception.status !== 'Closed').length,
    },
    stageCounts,
    healthCounts,
    gateDomainCounts,
    approvalBacklog,
  }
}

function inferNextAction(
  pendingApprovals: Array<{
    gateCode: EditorialGateCode
    label: string
    status: EditorialGateStatus
    domain: EditorialGateDomain
    summary?: string
  }>,
) {
  if (pendingApprovals.length === 0) {
    return 'No author decision is required right now. We will let you know when the next review package is ready.'
  }

  const next = pendingApprovals[0]
  return `Review and respond to ${next.label}.`
}
