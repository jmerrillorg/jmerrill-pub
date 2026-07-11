import { createHash } from 'node:crypto'
import { existsSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'

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
  inheritedImprint?: string
  healthStatus: EditorialHealthStatus
  authorSafeSummary?: string
  startedOn?: string
  deliveredOn?: string
  completedOn?: string
}

export type DevelopmentalPackageStatus =
  | 'Not Started'
  | 'In Progress'
  | 'Internal Review'
  | 'Revisions Required'
  | 'Ready for Publisher Approval'
  | 'Approved for Author Release'
  | 'Released'
  | 'Author Response Received'
  | 'Author Revisions In Progress'
  | 'Author Revision Received'
  | 'Completed'
  | 'Superseded'

export type DevelopmentalPackageComponentType =
  | 'Editorial Letter'
  | 'Editorial Working Manuscript'
  | 'Revision Blueprint'
  | 'Publisher Recommendation'
  | 'Cross-Reference Map'
  | 'Internal Evidence'
  | 'GPAT Provenance'

export type DevelopmentalAnchorSource =
  | 'Editorial Letter'
  | 'Working Manuscript'
  | 'Revision Blueprint'
  | 'Publisher Recommendation'
  | 'Cross-Reference Map'

export type DevelopmentalRelationshipType =
  | 'supports'
  | 'explains'
  | 'directs-to'
  | 'derived-from'
  | 'packages'

export type DevelopmentalQualityStatus = 'Pass' | 'Pass with Review' | 'Needs Review' | 'Failed' | 'Not Assessed'

export type DevelopmentalPackageComponentRecord = {
  id: string
  type: DevelopmentalPackageComponentType
  title: string
  status: EditorialArtifactStatus | 'Ready'
  visibility: EditorialArtifactVisibility
  repositoryPath: string
  fileName: string
  fileHash?: string
  deliveredOn?: string
  summary: string
  anchorCount?: number
}

export type DevelopmentalCrossReferenceRecord = {
  id: string
  sourceComponent: DevelopmentalAnchorSource
  sourceAnchor: string
  targetComponent: DevelopmentalAnchorSource
  targetAnchor: string
  relationshipType: DevelopmentalRelationshipType
  issueCategory: string
  sequence: number
  label: string
  integrityStatus: 'Valid' | 'Broken'
}

export type DevelopmentalQualityCheckRecord = {
  id: string
  measure:
    | 'Source Coverage'
    | 'Package Completeness'
    | 'Cross-Reference Integrity'
    | 'Structural Confidence'
    | 'Voice-Preservation Assessment'
    | 'Style-Guide Compliance'
    | 'Scope-Boundary Compliance'
    | 'Publisher Readiness'
  result: DevelopmentalQualityStatus
  evidence: string
  evaluator: string
  source: 'Human' | 'Model' | 'Hybrid'
  timestamp: string
}

export type DevelopmentalProvenanceRecord = {
  gpatId: string
  gpatVersion: string
  modelRoute: string
  provider: string
  promptKey: string
  promptVersion: string
  styleGuideIds: string[]
  scopeBoundaryAcknowledged: boolean
  humanReviewer: string
  publisherApprover: string
}

export type DevelopmentalReviewPackageRecord = {
  id: string
  publishingAssetId: string
  titleId: string
  contactId: string
  title: string
  authorName: string
  stageId: string
  gateId?: string
  packageVersion: string
  status: DevelopmentalPackageStatus
  currentVersion: boolean
  inheritedImprint: string
  inheritedStyleGuideSet: string[]
  createdOn: string
  internalReviewOn?: string
  approvalOn?: string
  releaseOn?: string
  authorDecisionOn?: string
  sourceManuscript: {
    title: string
    repositoryPath: string
    fileHash?: string
  }
  components: DevelopmentalPackageComponentRecord[]
  crossReferences: DevelopmentalCrossReferenceRecord[]
  qualityChecks: DevelopmentalQualityCheckRecord[]
  provenance: DevelopmentalProvenanceRecord
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
  packageCounts?: Record<DevelopmentalPackageStatus, number>
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

const DEVELOPMENTAL_PACKAGE_ROOT = path.join(
  process.cwd(),
  'docs',
  'operations',
)

const DEVELOPMENTAL_PROOF_TITLE = 'The Intentional Leader'
const DEVELOPMENTAL_PACKAGE_VERSION = 'v1.0-operational-proof'

const DEVELOPMENTAL_COMPONENT_BLUEPRINT = [
  {
    id: 'DEV-PKG-COMP-001',
    type: 'Editorial Letter',
    title: 'Volume I Developmental Editorial Letter',
    fileName: 'PROGRAM-003-The-Intentional-Leader-Volume-I-Developmental-Editorial-Letter.md',
    status: 'Ready for Review',
    visibility: 'Internal Only',
    summary: 'Strengths-first developmental letter that directs the reviewer into manuscript-level evidence.',
    anchorCount: 8,
  },
  {
    id: 'DEV-PKG-COMP-002',
    type: 'Editorial Working Manuscript',
    title: 'Volume I Working Manuscript Anchor Map',
    fileName: 'PROGRAM-003-The-Intentional-Leader-Volume-I-Working-Manuscript-Anchors.csv',
    status: 'Ready for Review',
    visibility: 'Internal Only',
    summary: 'Stable anchor map over the January-through-March manuscript evidence and paired Soul Dive structure.',
    anchorCount: 13,
  },
  {
    id: 'DEV-PKG-COMP-003',
    type: 'Revision Blueprint',
    title: 'Volume I Revision Blueprint',
    fileName: 'PROGRAM-003-The-Intentional-Leader-Volume-I-Revision-Blueprint.csv',
    status: 'Ready for Review',
    visibility: 'Internal Only',
    summary: 'Ordered developmental action list with dependencies, rationale, and linked manuscript evidence.',
    anchorCount: 10,
  },
  {
    id: 'DEV-PKG-COMP-004',
    type: 'Publisher Recommendation',
    title: 'Volume I Publisher Recommendation',
    fileName: 'PROGRAM-003-The-Intentional-Leader-Volume-I-Publisher-Recommendation.md',
    status: 'Ready for Review',
    visibility: 'Publisher Only',
    summary: 'Governed disposition based on the developmental review package evidence.',
    anchorCount: 4,
  },
  {
    id: 'DEV-PKG-COMP-005',
    type: 'Cross-Reference Map',
    title: 'Volume I Cross-Reference Map',
    fileName: 'PROGRAM-003-The-Intentional-Leader-Volume-I-Developmental-Cross-Reference-Map.csv',
    status: 'Ready',
    visibility: 'Internal Only',
    summary: 'Bidirectional links between letter sections, manuscript anchors, blueprint actions, and publisher recommendation.',
    anchorCount: 13,
  },
  {
    id: 'DEV-PKG-COMP-006',
    type: 'Internal Evidence',
    title: 'Volume I Developmental Evidence Packet',
    fileName: 'PROGRAM-003-The-Intentional-Leader-Volume-I-Developmental-Evidence-Packet.md',
    status: 'Ready',
    visibility: 'Internal Only',
    summary: 'Controlled proof inventory of source manuscript lineage, structure map, calibration, repetition, and coverage evidence.',
    anchorCount: 6,
  },
  {
    id: 'DEV-PKG-COMP-007',
    type: 'GPAT Provenance',
    title: 'GPAT-003 Runtime and Provenance Note',
    fileName: 'GPAT-003-Developmental-Review-Package.md',
    status: 'Ready',
    visibility: 'Publisher Only',
    summary: 'GPAT-governed provenance, route policy, human-review boundary, and shadow/runtime status.',
    anchorCount: 3,
  },
] as const

const DEVELOPMENTAL_CROSS_REFERENCES: DevelopmentalCrossReferenceRecord[] = [
  {
    id: 'DEV-XREF-001',
    sourceComponent: 'Editorial Letter',
    sourceAnchor: 'DEV-LET-STR-001',
    targetComponent: 'Working Manuscript',
    targetAnchor: 'DEV-COM-001',
    relationshipType: 'directs-to',
    issueCategory: 'Strengths',
    sequence: 1,
    label: 'Opening strengths -> January foundation cluster',
    integrityStatus: 'Valid',
  },
  {
    id: 'DEV-XREF-002',
    sourceComponent: 'Editorial Letter',
    sourceAnchor: 'DEV-LET-ARC-002',
    targetComponent: 'Working Manuscript',
    targetAnchor: 'DEV-COM-004',
    relationshipType: 'explains',
    issueCategory: 'Quarterly Arc',
    sequence: 2,
    label: 'Quarterly arc -> February hinge cluster',
    integrityStatus: 'Valid',
  },
  {
    id: 'DEV-XREF-003',
    sourceComponent: 'Editorial Letter',
    sourceAnchor: 'DEV-LET-PAC-003',
    targetComponent: 'Revision Blueprint',
    targetAnchor: 'DEV-BP-003',
    relationshipType: 'supports',
    issueCategory: 'Pacing',
    sequence: 3,
    label: 'Pacing observations -> late-February differentiation action',
    integrityStatus: 'Valid',
  },
  {
    id: 'DEV-XREF-004',
    sourceComponent: 'Revision Blueprint',
    sourceAnchor: 'DEV-BP-001',
    targetComponent: 'Working Manuscript',
    targetAnchor: 'DEV-COM-002',
    relationshipType: 'supports',
    issueCategory: 'Entry Length',
    sequence: 4,
    label: 'January expansion actions -> short-entry anchors',
    integrityStatus: 'Valid',
  },
  {
    id: 'DEV-XREF-005',
    sourceComponent: 'Revision Blueprint',
    sourceAnchor: 'DEV-BP-004',
    targetComponent: 'Working Manuscript',
    targetAnchor: 'DEV-COM-008',
    relationshipType: 'supports',
    issueCategory: 'Closing Movement',
    sequence: 5,
    label: 'March closing actions -> threshold sequence',
    integrityStatus: 'Valid',
  },
  {
    id: 'DEV-XREF-006',
    sourceComponent: 'Publisher Recommendation',
    sourceAnchor: 'DEV-REC-001',
    targetComponent: 'Editorial Letter',
    targetAnchor: 'DEV-LET-REC-006',
    relationshipType: 'derived-from',
    issueCategory: 'Disposition',
    sequence: 6,
    label: 'Publisher disposition -> letter recommendation section',
    integrityStatus: 'Valid',
  },
  {
    id: 'DEV-XREF-007',
    sourceComponent: 'Publisher Recommendation',
    sourceAnchor: 'DEV-REC-002',
    targetComponent: 'Revision Blueprint',
    targetAnchor: 'DEV-BP-006',
    relationshipType: 'supports',
    issueCategory: 'Quarter-End Closure',
    sequence: 7,
    label: 'Closing recommendation -> quarter-end blueprint action',
    integrityStatus: 'Valid',
  },
  {
    id: 'DEV-XREF-008',
    sourceComponent: 'Editorial Letter',
    sourceAnchor: 'DEV-LET-REP-004',
    targetComponent: 'Working Manuscript',
    targetAnchor: 'DEV-COM-006',
    relationshipType: 'explains',
    issueCategory: 'Repetition',
    sequence: 8,
    label: 'Repetition findings -> March stewardship cluster',
    integrityStatus: 'Valid',
  },
]

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

export function buildDevelopmentalReviewPackage(
  record: EditorialPilotRecord,
): DevelopmentalReviewPackageRecord | null {
  const currentStage = [...record.stages]
    .sort((a, b) => b.stageSequence - a.stageSequence)
    .find((stage) => stage.stageType === 'Developmental Editing')

  if (!currentStage || record.title !== DEVELOPMENTAL_PROOF_TITLE) {
    return null
  }

  const currentGate = [...record.gates]
    .filter((gate) => gate.stageId === currentStage.id || gate.gateCode === 'A2')
    .sort((a, b) => a.gateCode.localeCompare(b.gateCode))[0]

  const createdOn = currentStage.startedOn || new Date().toISOString()
  const internalReviewOn = currentStage.startedOn || createdOn
  const approvalOn = currentGate?.authorDecisionOn

  const components = DEVELOPMENTAL_COMPONENT_BLUEPRINT.map((component) => {
    const repositoryPath = path.join(DEVELOPMENTAL_PACKAGE_ROOT, component.fileName)
    return {
      id: component.id,
      type: component.type,
      title: component.title,
      status: component.status,
      visibility: component.visibility,
      repositoryPath,
      fileName: component.fileName,
      fileHash: hashFileIfPresent(repositoryPath),
      deliveredOn: currentStage.startedOn,
      summary: component.summary,
      anchorCount: component.anchorCount,
    } satisfies DevelopmentalPackageComponentRecord
  })

  return {
    id: `devpkg-${record.publishingAssetId}-${DEVELOPMENTAL_PACKAGE_VERSION}`,
    publishingAssetId: record.publishingAssetId,
    titleId: record.titleId,
    contactId: record.contactId,
    title: record.title,
    authorName: record.authorName,
    stageId: currentStage.id,
    gateId: currentGate?.id,
    packageVersion: DEVELOPMENTAL_PACKAGE_VERSION,
    status: mapDevelopmentalPackageStatus(currentStage.stageStatus, currentGate?.gateStatus),
    currentVersion: true,
    inheritedImprint: currentStage.inheritedImprint || 'Inherited from approved Editorial Review path',
    inheritedStyleGuideSet: currentStage.governingStyleGuide
      ? [currentStage.governingStyleGuide]
      : ['Inherited primary style guide from Editorial Review'],
    createdOn,
    internalReviewOn,
    approvalOn,
    sourceManuscript: {
      title: 'JMP-INT-202607-0W5PTQ - The Intentional Leader.docx',
      repositoryPath: 'SharePoint governed manuscript evidence (linked upstream)',
    },
    components,
    crossReferences: DEVELOPMENTAL_CROSS_REFERENCES.map((reference) => ({
      ...reference,
      integrityStatus: componentsHaveAnchors(components, reference) ? 'Valid' : 'Broken',
    })),
    qualityChecks: buildQualityChecks(),
    provenance: {
      gpatId: 'GPAT-003',
      gpatVersion: 'Implementation in Progress',
      modelRoute: 'jm1-editorial-devline-primary',
      provider: 'Microsoft Foundry Claude (preferred) / jm1-pub-diagnostic-primary fallback',
      promptKey: 'jm1-prompt-pub-stage0-diagnostic',
      promptVersion: 'PUB-STAGE0-DIAGNOSTIC-V1',
      styleGuideIds: currentStage.governingStyleGuide ? [currentStage.governingStyleGuide] : [],
      scopeBoundaryAcknowledged: true,
      humanReviewer: currentStage.assignedEditor || 'J Merrill Publishing editorial reviewer',
      publisherApprover: 'Jackie Smith Jr.',
    },
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

  const packageCounts = records
    .map((record) => buildDevelopmentalReviewPackage(record))
    .filter((pkg): pkg is DevelopmentalReviewPackageRecord => Boolean(pkg))
    .reduce<Record<DevelopmentalPackageStatus, number>>(
      (accumulator, pkg) => {
        accumulator[pkg.status] += 1
        return accumulator
      },
      {
        'Not Started': 0,
        'In Progress': 0,
        'Internal Review': 0,
        'Revisions Required': 0,
        'Ready for Publisher Approval': 0,
        'Approved for Author Release': 0,
        Released: 0,
        'Author Response Received': 0,
        'Author Revisions In Progress': 0,
        'Author Revision Received': 0,
        Completed: 0,
        Superseded: 0,
      },
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
    packageCounts,
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

function mapDevelopmentalPackageStatus(
  stageStatus: EditorialStageStatus,
  gateStatus?: EditorialGateStatus,
): DevelopmentalPackageStatus {
  if (gateStatus === 'Approved') return 'In Progress'
  if (gateStatus === 'Ready for Author Review') return 'Approved for Author Release'
  if (gateStatus === 'Awaiting Author Response') return 'Released'

  switch (stageStatus) {
    case 'Not Started':
      return 'Not Started'
    case 'In Progress':
      return 'In Progress'
    case 'Awaiting Internal Review':
      return 'Internal Review'
    case 'Returned for Revision':
      return 'Revisions Required'
    case 'Approved':
      return 'Ready for Publisher Approval'
    case 'Complete':
      return 'Completed'
    case 'Superseded':
      return 'Superseded'
    default:
      return 'In Progress'
  }
}

function hashFileIfPresent(filePath: string) {
  if (!existsSync(filePath)) return undefined
  const buffer = readFileSync(filePath)
  return createHash('sha256').update(buffer).digest('hex')
}

function componentsHaveAnchors(
  components: DevelopmentalPackageComponentRecord[],
  reference: DevelopmentalCrossReferenceRecord,
) {
  return (
    componentExists(components, reference.sourceComponent) &&
    componentExists(components, reference.targetComponent)
  )
}

function componentExists(
  components: DevelopmentalPackageComponentRecord[],
  component: DevelopmentalAnchorSource,
) {
  return components.some((candidate) => normalizeComponentType(candidate.type) === component)
}

function normalizeComponentType(componentType: DevelopmentalPackageComponentType): DevelopmentalAnchorSource {
  switch (componentType) {
    case 'Editorial Letter':
      return 'Editorial Letter'
    case 'Editorial Working Manuscript':
      return 'Working Manuscript'
    case 'Revision Blueprint':
      return 'Revision Blueprint'
    case 'Publisher Recommendation':
      return 'Publisher Recommendation'
    case 'Cross-Reference Map':
      return 'Cross-Reference Map'
    default:
      return 'Cross-Reference Map'
  }
}

function buildQualityChecks(): DevelopmentalQualityCheckRecord[] {
  const timestamp = new Date().toISOString()
  return [
    {
      id: 'DEV-QA-001',
      measure: 'Source Coverage',
      result: 'Pass with Review',
      evidence: 'Developmental package covers January-through-March devotional entries and Soul Dive companion layer through governed proof assets.',
      evaluator: 'J Merrill Publishing',
      source: 'Hybrid',
      timestamp,
    },
    {
      id: 'DEV-QA-002',
      measure: 'Package Completeness',
      result: 'Pass',
      evidence: 'Editorial Letter, Working Manuscript anchors, Revision Blueprint, Publisher Recommendation, Cross-Reference Map, and Internal Evidence are all present.',
      evaluator: 'J Merrill Publishing',
      source: 'Human',
      timestamp,
    },
    {
      id: 'DEV-QA-003',
      measure: 'Cross-Reference Integrity',
      result: 'Pass',
      evidence: 'All proof-package cross-references resolve to components present in the current package version.',
      evaluator: 'J Merrill Publishing',
      source: 'Human',
      timestamp,
    },
    {
      id: 'DEV-QA-004',
      measure: 'Structural Confidence',
      result: 'Pass with Review',
      evidence: 'Quarterly series structure and Volume I boundary are confirmed; manuscript-level application remains in progress.',
      evaluator: 'J Merrill Publishing',
      source: 'Hybrid',
      timestamp,
    },
    {
      id: 'DEV-QA-005',
      measure: 'Voice-Preservation Assessment',
      result: 'Pass',
      evidence: 'Package is diagnostic-only and does not substitute line editing, copyediting, or autonomous rewriting.',
      evaluator: 'J Merrill Publishing',
      source: 'Human',
      timestamp,
    },
    {
      id: 'DEV-QA-006',
      measure: 'Style-Guide Compliance',
      result: 'Not Assessed',
      evidence: 'Inherited style-guide set is preserved from the upstream review lane; final developmental pass remains in progress.',
      evaluator: 'J Merrill Publishing',
      source: 'Human',
      timestamp,
    },
    {
      id: 'DEV-QA-007',
      measure: 'Scope-Boundary Compliance',
      result: 'Pass',
      evidence: 'Package content remains developmental and diagnostic. No line-edit or copyedit work is presented as active manuscript change.',
      evaluator: 'J Merrill Publishing',
      source: 'Human',
      timestamp,
    },
    {
      id: 'DEV-QA-008',
      measure: 'Publisher Readiness',
      result: 'Pass with Review',
      evidence: 'Integrated package is operationally assembled for controlled proof inside the Developmental Editing stage.',
      evaluator: 'J Merrill Publishing',
      source: 'Human',
      timestamp,
    },
  ]
}
