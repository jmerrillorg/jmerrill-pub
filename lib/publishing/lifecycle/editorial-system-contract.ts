import type { HumanPipelineStageId } from './human-pipeline-read-model'

export type StageArtifactRole =
  | 'ORIGINAL_AUTHOR_SUBMISSION'
  | 'EDITORIAL_WORKING_SOURCE'
  | 'EDITORIAL_REVIEW_SOURCE'
  | 'EDITORIAL_RECOMMENDATION'
  | 'PACKAGE_ELECTION'
  | 'EXECUTED_AGREEMENT'
  | 'PAYMENT_EVIDENCE'
  | 'ONBOARDING_SUBMISSION'
  | 'DEVELOPMENTAL_EDITORIAL_REVIEW'
  | 'DEVELOPMENTALLY_EDITED_MANUSCRIPT'
  | 'LINE_EDITED_MANUSCRIPT'
  | 'LINE_EDITORIAL_NOTES'
  | 'COPYEDITED_MANUSCRIPT'
  | 'COPYEDITING_QUERY_LOG'
  | 'LAYOUT_PROOF'
  | 'AUTHOR_PROOF'
  | 'COVER_PROOF'
  | 'FINAL_INTERIOR'
  | 'FINAL_COVER'
  | 'DISTRIBUTION_ARTIFACT'
  | 'DISTRIBUTION_SUBMISSION_EVIDENCE'
  | 'PUBLIC_CATALOG_PROJECTION'
  | 'POST_PUBLICATION_EVIDENCE'

export type AuthorDecisionType =
  | 'NONE'
  | 'PROSPECT_PACKAGE_DECISION'
  | 'COMMERCIAL_ELECTION'
  | 'DEVELOPMENTAL_DIRECTION_AND_EXACT_MANUSCRIPT'
  | 'EXACT_MANUSCRIPT'
  | 'EXACT_PROOF'
  | 'EXACT_COVER_PROOF'
  | 'EXACT_FINAL_PRODUCTION_PACKAGE'

export type EditorialStageContract = {
  stageId: HumanPipelineStageId
  stageName: string
  sourceArtifactRoles: StageArtifactRole[]
  executionCapability: string
  capabilityInvocationRequired: boolean
  outputArtifactRoles: StageArtifactRole[]
  qaRequirements: string[]
  sharePointPersistenceRequirements: StageArtifactRole[]
  authorVisibleArtifacts: StageArtifactRole[]
  authorDecisionRequired: boolean
  authorDecisionType: AuthorDecisionType
  approvalRequiredRoles: StageArtifactRole[]
  completionContract: string[]
  nextTransition: HumanPipelineStageId | 'PERSISTENT_STEWARDSHIP' | 'TERMINAL_BY_GOVERNED_EVENT'
}

export type GovernedArtifactEvidence = {
  artifactId: string
  role: StageArtifactRole
  titleId: string
  authorId: string
  version: string
  checksum: string
  qaState: 'PASS' | 'FAIL' | 'UNKNOWN'
  repositoryPath?: string
  repositoryDriveId?: string
  repositoryItemId?: string
  deliveredToAuthor?: boolean
  current?: boolean
  format?: 'PAPERBACK' | 'HARDCOVER' | 'EBOOK' | 'AUDIOBOOK'
  identifier?: string
  distributionAuthority?: 'PASS' | 'FAIL' | 'UNPROVEN'
}

export type ExactVersionApprovalEvidence = {
  artifactId: string
  version: string
  checksum: string
  decision: 'APPROVED' | 'APPROVED_WITH_CORRECTIONS' | 'CHANGES_REQUESTED' | 'QUESTIONS' | 'PENDING'
  decisionAt?: string
  directionApproved?: boolean
}

export type StageCompletionEvidence = {
  titleId: string
  authorId: string
  stageId: HumanPipelineStageId
  sourceArtifacts: GovernedArtifactEvidence[]
  outputArtifacts: GovernedArtifactEvidence[]
  approvals: ExactVersionApprovalEvidence[]
  capabilityExecution?: {
    capabilityId: string
    executionId: string
    status: 'PASS' | 'FAIL' | 'PENDING'
  }
  completionSignals?: string[]
  entitledFormats?: Array<'PAPERBACK' | 'HARDCOVER' | 'EBOOK' | 'AUDIOBOOK'>
}

export type StageCompletionEvaluation = {
  complete: boolean
  nextTransitionAuthorized: boolean
  blockers: string[]
  nextSystemAction: string
}

const qa = ['TITLE_AUTHOR_BINDING', 'ROLE_VERSION_CHECKSUM', 'CONTENT_OR_RENDER_QA', 'LINEAGE']
const persisted = (roles: StageArtifactRole[]) => roles

export const EDITORIAL_SYSTEM_STAGE_CONTRACTS: Record<HumanPipelineStageId, EditorialStageContract> = {
  '01_INQUIRY': stageContract('01_INQUIRY', 'Inquiry', [], 'PUBLISHING.INQUIRY_INTAKE', false, [], [], [], 'NONE', [], ['Governed inquiry identity and source are recorded.'], '02_INTAKE'),
  '02_INTAKE': stageContract('02_INTAKE', 'Intake', ['ORIGINAL_AUTHOR_SUBMISSION'], 'PUBLISHING.INTAKE_NORMALIZATION', true, ['EDITORIAL_WORKING_SOURCE'], qa, ['EDITORIAL_WORKING_SOURCE'], 'NONE', [], ['Idempotent intake reference and source provenance exist.'], '03_EDITORIAL_REVIEW'),
  '03_EDITORIAL_REVIEW': stageContract('03_EDITORIAL_REVIEW', 'Editorial Review', ['EDITORIAL_REVIEW_SOURCE'], 'PUBLISHING.EDITORIAL_REVIEW', true, ['EDITORIAL_RECOMMENDATION'], qa, ['EDITORIAL_RECOMMENDATION'], 'NONE', [], ['Recommendation is QA-passed, registered, and prospect-facing.'], '04_AUTHOR_DECISION'),
  '04_AUTHOR_DECISION': stageContract('04_AUTHOR_DECISION', 'Author Decision', ['EDITORIAL_RECOMMENDATION'], 'PUBLISHING.PACKAGE_DECISION_INGESTION', false, ['PACKAGE_ELECTION'], ['IDENTITY_AND_OFFER_BINDING'], ['PACKAGE_ELECTION'], 'PROSPECT_PACKAGE_DECISION', [], ['A governed accept, decline, or hold decision is bound to the recommendation.'], '05_AGREEMENT_PAYMENT'),
  '05_AGREEMENT_PAYMENT': stageContract('05_AGREEMENT_PAYMENT', 'Agreement & Payment', ['PACKAGE_ELECTION'], 'PUBLISHING.COMMERCIAL_ACTIVATION', true, ['EXECUTED_AGREEMENT', 'PAYMENT_EVIDENCE'], ['CONTRACT_IDENTITY', 'PAYMENT_PARITY', 'COMMERCIAL_IDEMPOTENCY'], ['EXECUTED_AGREEMENT', 'PAYMENT_EVIDENCE'], 'COMMERCIAL_ELECTION', [], ['Agreement and package-required payment gates are independently satisfied.'], '06_ONBOARDING'),
  '06_ONBOARDING': stageContract('06_ONBOARDING', 'Onboarding', ['EXECUTED_AGREEMENT', 'PAYMENT_EVIDENCE'], 'PUBLISHING.AUTHOR_ONBOARDING', true, ['ONBOARDING_SUBMISSION', 'EDITORIAL_WORKING_SOURCE'], qa, ['ONBOARDING_SUBMISSION', 'EDITORIAL_WORKING_SOURCE'], 'NONE', [], ['Starter/package-specific onboarding requirements and workspace readiness pass.'], '07_DEVELOPMENTAL_EDITING'),
  '07_DEVELOPMENTAL_EDITING': stageContract('07_DEVELOPMENTAL_EDITING', 'Developmental Editing', ['EDITORIAL_WORKING_SOURCE'], 'PUBLISHING.DEVELOPMENTAL_EDITING', true, ['DEVELOPMENTAL_EDITORIAL_REVIEW', 'DEVELOPMENTALLY_EDITED_MANUSCRIPT'], qa, ['DEVELOPMENTAL_EDITORIAL_REVIEW', 'DEVELOPMENTALLY_EDITED_MANUSCRIPT'], 'DEVELOPMENTAL_DIRECTION_AND_EXACT_MANUSCRIPT', ['DEVELOPMENTALLY_EDITED_MANUSCRIPT'], ['Both Developmental artifacts share title, author, version family, QA, lineage, registration, delivery, and physical workspace authority.', 'Direction approval is distinct from exact-version manuscript approval.'], '08_LINE_EDITING'),
  '08_LINE_EDITING': stageContract('08_LINE_EDITING', 'Line Editing', ['DEVELOPMENTALLY_EDITED_MANUSCRIPT'], 'PUBLISHING.LINE_EDITING', true, ['LINE_EDITED_MANUSCRIPT', 'LINE_EDITORIAL_NOTES'], qa, ['LINE_EDITED_MANUSCRIPT', 'LINE_EDITORIAL_NOTES'], 'EXACT_MANUSCRIPT', ['LINE_EDITED_MANUSCRIPT'], ['The actual line-edited manuscript and governed notes are delivered before exact-version approval.'], '09_COPYEDITING'),
  '09_COPYEDITING': stageContract('09_COPYEDITING', 'Copyediting', ['LINE_EDITED_MANUSCRIPT'], 'PUBLISHING.COPYEDITING', true, ['COPYEDITED_MANUSCRIPT', 'COPYEDITING_QUERY_LOG'], qa, ['COPYEDITED_MANUSCRIPT', 'COPYEDITING_QUERY_LOG'], 'EXACT_MANUSCRIPT', ['COPYEDITED_MANUSCRIPT'], ['The actual copyedited manuscript and required query artifact are delivered before exact-version approval.'], '11_INTERIOR_LAYOUT'),
  '10_PROOFREADING': stageContract('10_PROOFREADING', 'Proofreading', ['LAYOUT_PROOF'], 'PUBLISHING.PROOFREADING_AUTHOR_PROOF', true, ['AUTHOR_PROOF'], qa, ['AUTHOR_PROOF'], 'EXACT_PROOF', ['AUTHOR_PROOF'], ['Every correction and decision is bound to the current proof; substantive replacement requires re-review.'], '12_COVER_DESIGN'),
  '11_INTERIOR_LAYOUT': stageContract('11_INTERIOR_LAYOUT', 'Interior Layout', ['COPYEDITED_MANUSCRIPT'], 'PUBLISHING.INTERIOR_LAYOUT_TYPESETTING', true, ['LAYOUT_PROOF'], qa, ['LAYOUT_PROOF'], 'NONE', [], ['A versioned, checksummed PDF proof exists for every materially distinct governed interior format.', 'Canonical execution continues to Proofreading/Author Proof; human stage numbering does not reverse the dependency.'], '10_PROOFREADING'),
  '12_COVER_DESIGN': stageContract('12_COVER_DESIGN', 'Cover Design', ['EDITORIAL_RECOMMENDATION'], 'PUBLISHING.COVER_DESIGN', true, ['COVER_PROOF'], qa, ['COVER_PROOF'], 'EXACT_COVER_PROOF', ['COVER_PROOF'], ['Current cover proof is QA-passed, delivered, and exactly approved when the package requires author approval.'], '13_PRODUCTION'),
  '13_PRODUCTION': stageContract('13_PRODUCTION', 'Production', ['AUTHOR_PROOF', 'COVER_PROOF'], 'PUBLISHING.PRODUCTION_FINALIZATION', true, ['FINAL_INTERIOR', 'FINAL_COVER', 'DISTRIBUTION_ARTIFACT'], qa, ['FINAL_INTERIOR', 'FINAL_COVER', 'DISTRIBUTION_ARTIFACT'], 'EXACT_FINAL_PRODUCTION_PACKAGE', ['FINAL_INTERIOR', 'FINAL_COVER'], ['Each entitled format has identified final artifacts, identifier, QA, approval authority, and distribution authority.'], '14_DISTRIBUTION'),
  '14_DISTRIBUTION': stageContract('14_DISTRIBUTION', 'Distribution', ['DISTRIBUTION_ARTIFACT'], 'PUBLISHING.DISTRIBUTOR_SUBMISSION', true, ['DISTRIBUTION_SUBMISSION_EVIDENCE'], ['FORMAT_ENTITLEMENT', 'IDENTIFIER_PARITY', 'PROVIDER_VALIDATION'], ['DISTRIBUTION_ARTIFACT', 'DISTRIBUTION_SUBMISSION_EVIDENCE'], 'NONE', [], ['Every submitted file resolves to governed SharePoint and Dataverse authority; local-only files are prohibited.'], '15_PUBLICATION'),
  '15_PUBLICATION': stageContract('15_PUBLICATION', 'Publication', ['DISTRIBUTION_SUBMISSION_EVIDENCE'], 'PUBLISHING.PUBLICATION_RELEASE_READBACK', true, ['PUBLIC_CATALOG_PROJECTION'], ['PROVIDER_LIVE_READBACK', 'PUBLIC_PAGE_VERIFICATION'], ['PUBLIC_CATALOG_PROJECTION'], 'NONE', [], ['Provider live evidence and JMP-controlled title/author page verification are distinct and both complete.'], '16_POST_PUBLICATION'),
  '16_POST_PUBLICATION': stageContract('16_POST_PUBLICATION', 'Post-Publication', ['PUBLIC_CATALOG_PROJECTION'], 'PUBLISHING.POST_PUBLICATION_STEWARDSHIP', true, ['POST_PUBLICATION_EVIDENCE'], ['ROYALTY_RIGHTS_DISTRIBUTION_METADATA_HEALTH'], ['POST_PUBLICATION_EVIDENCE'], 'NONE', [], ['Persistent stewardship remains active until a separately governed terminal event.'], 'PERSISTENT_STEWARDSHIP'),
}

function stageContract(
  stageId: HumanPipelineStageId,
  stageName: string,
  sourceArtifactRoles: StageArtifactRole[],
  executionCapability: string,
  capabilityInvocationRequired: boolean,
  outputArtifactRoles: StageArtifactRole[],
  qaRequirements: string[],
  sharePointPersistenceRequirements: StageArtifactRole[],
  authorDecisionType: AuthorDecisionType,
  approvalRequiredRoles: StageArtifactRole[],
  completionContract: string[],
  nextTransition: EditorialStageContract['nextTransition'],
): EditorialStageContract {
  return {
    stageId,
    stageName,
    sourceArtifactRoles,
    executionCapability,
    capabilityInvocationRequired,
    outputArtifactRoles,
    qaRequirements,
    sharePointPersistenceRequirements: persisted(sharePointPersistenceRequirements),
    authorVisibleArtifacts: approvalRequiredRoles,
    authorDecisionRequired: authorDecisionType !== 'NONE',
    authorDecisionType,
    approvalRequiredRoles,
    completionContract,
    nextTransition,
  }
}

export function evaluateExactVersionApproval(
  artifact: GovernedArtifactEvidence,
  approval: ExactVersionApprovalEvidence | undefined,
) {
  if (!approval) return { ok: false, blocker: `EXACT_VERSION_APPROVAL_MISSING:${artifact.role}` }
  if (approval.decision !== 'APPROVED') return { ok: false, blocker: `FINAL_APPROVAL_MISSING:${artifact.role}` }
  if (approval.artifactId !== artifact.artifactId) return { ok: false, blocker: `APPROVAL_ARTIFACT_ID_MISMATCH:${artifact.role}` }
  if (approval.version !== artifact.version) return { ok: false, blocker: `APPROVAL_VERSION_MISMATCH:${artifact.role}` }
  if (approval.checksum.toLowerCase() !== artifact.checksum.toLowerCase()) {
    return { ok: false, blocker: `APPROVAL_CHECKSUM_MISMATCH:${artifact.role}` }
  }
  return { ok: true, blocker: '' }
}

export function evaluateStageCompletion(
  contract: EditorialStageContract,
  evidence: StageCompletionEvidence,
): StageCompletionEvaluation {
  const blockers: string[] = []
  if (evidence.stageId !== contract.stageId) blockers.push('STAGE_CONTRACT_MISMATCH')

  for (const role of contract.sourceArtifactRoles) {
    if (!matchingArtifacts(evidence.sourceArtifacts, role, evidence).length) blockers.push(`SOURCE_ARTIFACT_MISSING:${role}`)
  }
  for (const role of contract.outputArtifactRoles) {
    if (!matchingArtifacts(evidence.outputArtifacts, role, evidence).length) blockers.push(`OUTPUT_ARTIFACT_MISSING:${role}`)
  }

  if (contract.capabilityInvocationRequired) {
    const execution = evidence.capabilityExecution
    if (!execution || execution.capabilityId !== contract.executionCapability || execution.status !== 'PASS' || !execution.executionId) {
      blockers.push(`CERTIFIED_CAPABILITY_EXECUTION_MISSING:${contract.executionCapability}`)
    }
  }

  for (const role of contract.sharePointPersistenceRequirements) {
    for (const artifact of matchingArtifacts(evidence.outputArtifacts, role, evidence)) {
      if (!isGovernedSharePointArtifact(artifact)) blockers.push(`SHAREPOINT_PARITY_MISSING:${role}`)
      if (artifact.qaState !== 'PASS') blockers.push(`QA_NOT_PASSED:${role}`)
    }
  }

  for (const role of contract.authorVisibleArtifacts) {
    const artifact = matchingArtifacts(evidence.outputArtifacts, role, evidence)[0]
    if (artifact && artifact.deliveredToAuthor !== true) blockers.push(`AUTHOR_DELIVERY_MISSING:${role}`)
  }

  if (contract.authorDecisionType === 'DEVELOPMENTAL_DIRECTION_AND_EXACT_MANUSCRIPT') {
    if (!evidence.approvals.some((approval) => approval.directionApproved === true)) blockers.push('DEVELOPMENTAL_DIRECTION_APPROVAL_MISSING')
  }
  for (const role of contract.approvalRequiredRoles) {
    const artifact = matchingArtifacts(evidence.outputArtifacts, role, evidence)[0]
    if (!artifact) continue
    const approval = evidence.approvals.find((item) => item.artifactId === artifact.artifactId)
    const result = evaluateExactVersionApproval(artifact, approval)
    if (!result.ok) blockers.push(result.blocker)
  }

  if (contract.stageId === '13_PRODUCTION' || contract.stageId === '14_DISTRIBUTION') {
    for (const format of evidence.entitledFormats || []) {
      const artifacts = evidence.outputArtifacts.filter((artifact) => artifact.format === format)
      if (!artifacts.length) blockers.push(`ENTITLED_FORMAT_ARTIFACT_MISSING:${format}`)
      if (artifacts.some((artifact) => !artifact.identifier)) blockers.push(`FORMAT_IDENTIFIER_MISSING:${format}`)
      if (artifacts.some((artifact) => artifact.distributionAuthority !== 'PASS')) blockers.push(`DISTRIBUTION_AUTHORITY_MISSING:${format}`)
    }
  }

  const uniqueBlockers = [...new Set(blockers)]
  return {
    complete: uniqueBlockers.length === 0,
    nextTransitionAuthorized: uniqueBlockers.length === 0,
    blockers: uniqueBlockers,
    nextSystemAction: nextSystemAction(uniqueBlockers),
  }
}

function matchingArtifacts(
  artifacts: GovernedArtifactEvidence[],
  role: StageArtifactRole,
  evidence: Pick<StageCompletionEvidence, 'titleId' | 'authorId'>,
) {
  return artifacts.filter((artifact) =>
    artifact.role === role && artifact.titleId === evidence.titleId && artifact.authorId === evidence.authorId && artifact.current !== false,
  )
}

function isGovernedSharePointArtifact(artifact: GovernedArtifactEvidence) {
  const path = artifact.repositoryPath || ''
  return Boolean(
    artifact.artifactId &&
    artifact.version &&
    /^[a-f0-9]{64}$/i.test(artifact.checksum) &&
    artifact.repositoryDriveId &&
    artifact.repositoryItemId &&
    /(?:^|\/)01_Pipeline_A-Z(?:\/|$)/i.test(path),
  )
}

function nextSystemAction(blockers: string[]) {
  if (!blockers.length) return 'EXECUTE_GOVERNED_NEXT_TRANSITION'
  if (blockers.some((item) => item.startsWith('OUTPUT_ARTIFACT_MISSING'))) return 'INVOKE_CERTIFIED_STAGE_CAPABILITY'
  if (blockers.some((item) => item.startsWith('SHAREPOINT_PARITY_MISSING'))) return 'PERSIST_AND_REGISTER_GOVERNED_ARTIFACT'
  if (blockers.some((item) => item.startsWith('AUTHOR_DELIVERY_MISSING'))) return 'DELIVER_GOVERNED_AUTHOR_REVIEW_PACKAGE'
  if (blockers.some((item) => item.includes('APPROVAL'))) return 'WAIT_FOR_EXACT_VERSION_AUTHOR_DECISION'
  return 'RESOLVE_STAGE_CONTRACT_BLOCKERS'
}
