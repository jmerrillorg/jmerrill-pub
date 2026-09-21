import type { HumanPipelineStageId } from './human-pipeline-read-model'

export const PUBLISHING_DEPENDENCY_CLASSES = [
  'HARD_PREREQUISITE',
  'SOFT_DEPENDENCY',
  'PARALLELIZABLE',
  'AUTHOR_DEPENDENCY',
  'PROVIDER_DEPENDENCY',
  'CADENCE_DEPENDENCY',
] as const

export type PublishingDependencyClass = (typeof PUBLISHING_DEPENDENCY_CLASSES)[number]

export type WorkstreamDependency = {
  capability: string
  dependency: string
  classification: PublishingDependencyClass
  rationale: string
}

export type StageDependencyPolicy = {
  stageId: HumanPipelineStageId
  hardPrerequisites: string[]
  softDependencies: string[]
  parallelizableWith: string[]
  authorDependencies: string[]
  providerDependencies: string[]
  cadenceDependencies: string[]
}

const stagePolicy = (
  stageId: HumanPipelineStageId,
  input: Partial<Omit<StageDependencyPolicy, 'stageId'>>,
): StageDependencyPolicy => ({
  stageId,
  hardPrerequisites: [],
  softDependencies: [],
  parallelizableWith: [],
  authorDependencies: [],
  providerDependencies: [],
  cadenceDependencies: [],
  ...input,
})

export const PUBLISHING_STAGE_DEPENDENCY_MODEL: Record<HumanPipelineStageId, StageDependencyPolicy> = {
  '01_INQUIRY': stagePolicy('01_INQUIRY', { authorDependencies: ['PROSPECT_INQUIRY'] }),
  '02_INTAKE': stagePolicy('02_INTAKE', { hardPrerequisites: ['GOVERNED_INQUIRY_IDENTITY'], authorDependencies: ['SOURCE_SUBMISSION_WHEN_REQUIRED'] }),
  '03_EDITORIAL_REVIEW': stagePolicy('03_EDITORIAL_REVIEW', { hardPrerequisites: ['EDITORIAL_REVIEW_SOURCE_AVAILABLE'], providerDependencies: ['CERTIFIED_MODEL_ROUTE'] }),
  '04_AUTHOR_DECISION': stagePolicy('04_AUTHOR_DECISION', { hardPrerequisites: ['EDITORIAL_RECOMMENDATION_DELIVERED'], authorDependencies: ['PACKAGE_DECISION'] }),
  '05_AGREEMENT_PAYMENT': stagePolicy('05_AGREEMENT_PAYMENT', { hardPrerequisites: ['PACKAGE_ELECTION'], authorDependencies: ['AGREEMENT_EXECUTION', 'PAYMENT_ELECTION_OR_PAYMENT'], providerDependencies: ['SIGNATURE_PROVIDER', 'PAYMENT_PROVIDER'] }),
  '06_ONBOARDING': stagePolicy('06_ONBOARDING', { hardPrerequisites: ['AGREEMENT_EXECUTED', 'PAYMENT_OR_PACKAGE_AUTHORITY_SATISFIED'], parallelizableWith: ['07_DEVELOPMENTAL_EDITING'], authorDependencies: ['PACKAGE_SPECIFIC_ONBOARDING_SUBMISSION'] }),
  '07_DEVELOPMENTAL_EDITING': stagePolicy('07_DEVELOPMENTAL_EDITING', { hardPrerequisites: ['AGREEMENT_EXECUTED', 'PAYMENT_OR_PACKAGE_AUTHORITY_SATISFIED', 'AUTHORITATIVE_MANUSCRIPT_AVAILABLE'], softDependencies: ['AUTHOR_ONBOARDING_COMPLETE'], parallelizableWith: ['06_ONBOARDING', '12_COVER_DESIGN'], providerDependencies: ['CERTIFIED_EDITORIAL_MODEL_ROUTE'] }),
  '08_LINE_EDITING': stagePolicy('08_LINE_EDITING', { hardPrerequisites: ['CURRENT_DEVELOPMENTAL_ARTIFACT_AUTHOR_APPROVED'], authorDependencies: ['DEVELOPMENTAL_DIRECTION_AND_EXACT_MANUSCRIPT_APPROVAL'], providerDependencies: ['CERTIFIED_EDITORIAL_MODEL_ROUTE'] }),
  '09_COPYEDITING': stagePolicy('09_COPYEDITING', { hardPrerequisites: ['CURRENT_LINE_ARTIFACT_AUTHOR_APPROVED'], authorDependencies: ['EXACT_LINE_MANUSCRIPT_APPROVAL'], providerDependencies: ['CERTIFIED_EDITORIAL_MODEL_ROUTE'] }),
  '10_PROOFREADING': stagePolicy('10_PROOFREADING', { hardPrerequisites: ['CURRENT_LAYOUT_PROOF_AVAILABLE'], authorDependencies: ['EXACT_PROOF_APPROVAL'], cadenceDependencies: ['AUTHOR_RELEASE_CADENCE'] }),
  '11_INTERIOR_LAYOUT': stagePolicy('11_INTERIOR_LAYOUT', { hardPrerequisites: ['CURRENT_COPYEDIT_ARTIFACT_AUTHOR_APPROVED'], parallelizableWith: ['12_COVER_DESIGN'], providerDependencies: ['TYPESETTING_CAPABILITY'] }),
  '12_COVER_DESIGN': stagePolicy('12_COVER_DESIGN', { hardPrerequisites: ['GOVERNED_COVER_BRIEF'], parallelizableWith: ['07_DEVELOPMENTAL_EDITING', '08_LINE_EDITING', '09_COPYEDITING', '11_INTERIOR_LAYOUT'], authorDependencies: ['EXACT_COVER_PROOF_APPROVAL_WHEN_REQUIRED'], providerDependencies: ['COVER_DESIGN_CAPABILITY'] }),
  '13_PRODUCTION': stagePolicy('13_PRODUCTION', { hardPrerequisites: ['FINAL_INTERIOR_APPROVED', 'FINAL_COVER_APPROVED', 'FORMAT_IDENTIFIERS_ASSIGNED'], providerDependencies: ['PRODUCTION_FILE_CAPABILITY'] }),
  '14_DISTRIBUTION': stagePolicy('14_DISTRIBUTION', { hardPrerequisites: ['CERTIFIED_DISTRIBUTION_ARTIFACTS', 'FORMAT_ENTITLEMENT', 'IDENTIFIER_PARITY'], providerDependencies: ['AUTHORIZED_DISTRIBUTION_CHANNEL'] }),
  '15_PUBLICATION': stagePolicy('15_PUBLICATION', { hardPrerequisites: ['DISTRIBUTION_SUBMISSION_ACCEPTED'], providerDependencies: ['PROVIDER_LIVE_READBACK'], cadenceDependencies: ['PUBLICATION_RELEASE_DATE'] }),
  '16_POST_PUBLICATION': stagePolicy('16_POST_PUBLICATION', { hardPrerequisites: ['PUBLICATION_PROVEN'], parallelizableWith: ['AUTHOR_COPY_FULFILLMENT', 'ROYALTY_STEWARDSHIP', 'CATALOG_HEALTH'], providerDependencies: ['FULFILLMENT_PROVIDER_WHEN_APPLICABLE'] }),
}

export const PUBLISHING_WORKSTREAM_DEPENDENCIES: WorkstreamDependency[] = [
  { capability: 'DEVELOPMENTAL_EDITING', dependency: 'AGREEMENT_EXECUTED', classification: 'HARD_PREREQUISITE', rationale: 'Editorial production requires an executed publishing agreement.' },
  { capability: 'DEVELOPMENTAL_EDITING', dependency: 'PAYMENT_OR_PACKAGE_AUTHORITY_SATISFIED', classification: 'HARD_PREREQUISITE', rationale: 'The active package and its commercial entry gate must authorize editorial work.' },
  { capability: 'DEVELOPMENTAL_EDITING', dependency: 'AUTHORITATIVE_MANUSCRIPT_AVAILABLE', classification: 'HARD_PREREQUISITE', rationale: 'The executor must bind to exact governed manuscript bytes.' },
  { capability: 'DEVELOPMENTAL_EDITING', dependency: 'AUTHOR_ONBOARDING_COMPLETE', classification: 'PARALLELIZABLE', rationale: 'Onboarding and Developmental Editing proceed independently once commercial and manuscript entry gates pass.' },
  { capability: 'DEVELOPMENTAL_AUTHOR_REVIEW', dependency: 'DEVELOPMENTAL_PACKAGE_CERTIFIED_AND_DELIVERED', classification: 'AUTHOR_DEPENDENCY', rationale: 'The author decision begins only after both governed Developmental deliverables are available.' },
  { capability: 'LINE_EDITING', dependency: 'CURRENT_DEVELOPMENTAL_ARTIFACT_AUTHOR_APPROVED', classification: 'HARD_PREREQUISITE', rationale: 'Line Editing must use the exact current author-approved Developmental manuscript.' },
  { capability: 'COPYEDITING', dependency: 'CURRENT_LINE_ARTIFACT_AUTHOR_APPROVED', classification: 'HARD_PREREQUISITE', rationale: 'Copyediting must use the exact current author-approved Line manuscript.' },
  { capability: 'PROOFREADING_INTERIOR_LAYOUT', dependency: 'CURRENT_COPYEDIT_ARTIFACT_AUTHOR_APPROVED', classification: 'HARD_PREREQUISITE', rationale: 'The combined proof/layout workstream requires the exact approved Copyedit source.' },
  { capability: 'AUTHOR_DELIVERY', dependency: 'RELEASE_CADENCE_MATURED', classification: 'CADENCE_DEPENDENCY', rationale: 'Certified packages remain held until their governed release time.' },
  { capability: 'DISTRIBUTION', dependency: 'PROVIDER_ACCOUNT_AND_CHANNEL_READY', classification: 'PROVIDER_DEPENDENCY', rationale: 'Provider-specific submission cannot proceed until the governed provider route is ready.' },
  { capability: 'POST_PUBLICATION_FULFILLMENT', dependency: 'PRODUCTION_AND_DISTRIBUTION_COMPLETE', classification: 'SOFT_DEPENDENCY', rationale: 'Author-copy fulfillment is post-publication work and never regresses production stage.' },
]

export type DevelopmentalEntryFacts = {
  agreementExecuted: boolean
  paymentOrPackageAuthoritySatisfied: boolean
  authoritativeManuscriptAvailable: boolean
  onboardingComplete: boolean
}

export function evaluateDevelopmentalEntry(facts: DevelopmentalEntryFacts) {
  const blockers = [
    !facts.agreementExecuted && 'AGREEMENT_NOT_EXECUTED',
    !facts.paymentOrPackageAuthoritySatisfied && 'PAYMENT_OR_PACKAGE_AUTHORITY_NOT_SATISFIED',
    !facts.authoritativeManuscriptAvailable && 'AUTHORITATIVE_MANUSCRIPT_NOT_AVAILABLE',
  ].filter(Boolean) as string[]

  return {
    actionable: blockers.length === 0,
    blockers,
    onboardingBlocksDevelopmentalEditing: false,
    parallelWorkstreams: facts.onboardingComplete ? ['DEVELOPMENTAL_EDITING'] : ['AUTHOR_ONBOARDING', 'DEVELOPMENTAL_EDITING'],
  }
}

export function classifyPostPublicationRequest(input: {
  productionComplete: boolean
  distributionComplete: boolean
  requestType: 'AUTHOR_COPIES' | 'BULK_ORDER' | 'OTHER'
}) {
  const fulfillment = input.requestType === 'AUTHOR_COPIES' || input.requestType === 'BULK_ORDER'
  return {
    productionState: input.productionComplete && input.distributionComplete ? 'CLOSED' : 'ACTIVE',
    workstream: fulfillment ? 'POST_PUBLICATION_FULFILLMENT' : 'POST_PUBLICATION_STEWARDSHIP',
    regressPipeline: false,
  }
}
