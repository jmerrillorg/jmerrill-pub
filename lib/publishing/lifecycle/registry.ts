export const JMP_PUBLISHING_LIFECYCLE_VERSION = 'JMP_PUBLISHING_LIFECYCLE_v1.0' as const

export const JMP_PUBLISHING_LIFECYCLE_METADATA = {
  lifecycleVersion: JMP_PUBLISHING_LIFECYCLE_VERSION,
  effectiveDate: '2026-08-21',
  approvalAuthority: 'Founder / Publisher policy authority',
  engineeringAuthority: 'Engineering implements and validates approved lifecycle semantics',
  compatibilityBehavior: 'Legacy runtime values must map through explicit adapters or fail closed.',
  inFlightTitleTreatment: 'No live title migration is authorized by Wave A.',
  supersessionPolicy: 'Future versions must declare supersedes and carry an intentional change acknowledgment.',
  changeAcknowledgment: 'JMP_PUBLISHING_LIFECYCLE_v1.0_WAVE_A_AUTHORIZED_2026-08-21',
} as const

export const WAITING_OWNERS = ['Prospect', 'Author', 'JMP', 'JMP/System', 'External'] as const

export const SYSTEM_ATTENTION_CODES = [
  'NONE',
  'AUTHOR_ACK_FAILED',
  'WORKSPACE_PROVISIONING_FAILED',
  'PAYMENT_EVENT_FAILED',
  'PROVIDER_BACKPRESSURE',
  'FOUNDRY_PROVIDER_BACKPRESSURE',
  'ARTIFACT_MISSING',
  'TRANSITION_CONFLICT',
  'RUNTIME_HOLD',
  'DELIVERY_CERTIFICATION_REQUIRED',
] as const

export type WaitingOwner = (typeof WAITING_OWNERS)[number]
export type SystemAttentionCode = (typeof SYSTEM_ATTENTION_CODES)[number]

export type LifecycleDimension = 'PROSPECT_COMMERCIAL' | 'TITLE' | 'AUTHOR_RELATIONSHIP'

export type StageCode =
  | 'INQUIRY_INTAKE'
  | 'CLASSIFICATION'
  | 'EDITORIAL_REVIEW_RECOMMENDATION'
  | 'COMMERCIAL_ACTIVATION'
  | 'AUTHOR_ONBOARDING'
  | 'EDITORIAL_PRODUCTION'
  | 'BOOK_PRODUCTION'
  | 'DISTRIBUTION_READINESS'
  | 'DISTRIBUTION_RELEASE'
  | 'POST_PUBLICATION'

export type SubstageCode =
  | 'INQUIRY'
  | 'INTAKE'
  | 'CLASSIFICATION_REVIEW'
  | 'PRE_CONTRACT_EDITORIAL_REVIEW'
  | 'PUBLISHING_RECOMMENDATION'
  | 'PACKAGE_ACCEPTANCE'
  | 'COMMERCIAL_ACTIVATION_EVENT'
  | 'JOINED_THE_FAMILY'
  | 'AUTHOR_ONBOARDING_TASKS'
  | 'DEVELOPMENTAL_EDITING'
  | 'DEVELOPMENTAL_AUTHOR_REVIEW'
  | 'LINE_EDITING'
  | 'LINE_AUTHOR_REVIEW'
  | 'COPYEDITING'
  | 'COPY_AUTHOR_REVIEW'
  | 'INTERIOR_LAYOUT'
  | 'PROOFREADING'
  | 'FINAL_AUTHOR_APPROVAL'
  | 'PRODUCTION_FINALIZATION'
  | 'COVER_CONCEPT'
  | 'METADATA_DRAFT'
  | 'FORMAT_DISTRIBUTION_READINESS'
  | 'DISTRIBUTOR_SUBMISSION'
  | 'LAUNCH_RELEASE'
  | 'POST_PUBLICATION_STEWARDSHIP'

export type ArtifactType =
  | 'ORIGINAL_AUTHOR_SUBMISSION'
  | 'EDITORIAL_WORKING_SOURCE'
  | 'EDITORIAL_REVIEW_SOURCE'
  | 'DEVELOPMENTAL_ARTIFACT'
  | 'APPROVED_DEVELOPMENTAL_ARTIFACT'
  | 'LINE_ARTIFACT'
  | 'APPROVED_LINE_ARTIFACT'
  | 'COPY_ARTIFACT'
  | 'APPROVED_COPY_ARTIFACT'
  | 'LAYOUT_ARTIFACT'
  | 'PROOF_ARTIFACT'
  | 'FINAL_INTERIOR'
  | 'DISTRIBUTION_ARTIFACT'
  | 'PUBLIC_CATALOG_PROJECTION'
  | 'COVER_CONCEPT_ARTIFACT'
  | 'METADATA_RECORD'

export type CommercialState =
  | 'PACKAGE_ACCEPTED'
  | 'AGREEMENT_EXECUTED'
  | 'INITIAL_PAYMENT_RECEIVED'
  | 'JOINED_THE_FAMILY'
  | 'PAYMENT_PLAN_ACTIVE'
  | 'PAYMENT_PAST_DUE'
  | 'PAYMENT_OBLIGATION_COMPLETE'
  | 'PAID_IN_FULL'
  | 'FINAL_DELIVERY_PAYMENT_READY'

export type RelationshipState =
  | 'PROSPECT'
  | 'JOINED_THE_FAMILY'
  | 'ACTIVE_AUTHOR'
  | 'RETURNING_AUTHOR'
  | 'MULTI_TITLE_AUTHOR'
  | 'LOYALTY_REFERRAL_RELATIONSHIP'

export type ExecutionStatus =
  | 'READY'
  | 'QUEUED'
  | 'PROCESSING'
  | 'WAITING_FOR_PROVIDER_CAPACITY'
  | 'RETRYING'
  | 'QA'
  | 'CERTIFIED'
  | 'FAILED'
  | 'CANCELED'
  | 'RUNTIME_HOLD'

export type StageApplicability = 'APPLICABLE_REQUIRED' | 'APPLICABLE_OPTIONAL' | 'NOT_APPLICABLE'

export type StageContract = {
  entryConditions: string[]
  exitConditions: string[]
  sourceOfTruth: string[]
  workDefinition: string
  sourceArtifactTypes: ArtifactType[]
  outputArtifactTypes: ArtifactType[]
  qualityGate: string
  authorGateRequired: boolean
  commercialGateRequired: boolean
  allowedWaitingOwners: WaitingOwner[]
  allowedTransitions: Array<{ stageCode: StageCode; substageCode?: SubstageCode }>
  disallowedTransitions: Array<{ stageCode: StageCode; substageCode?: SubstageCode; reason: string }>
  parallelWorkAllowed: string[]
  nextStage?: StageCode
  nextSubstage?: SubstageCode
  terminal: boolean
  persistent: boolean
  systemAttentionBehavior: string[]
}

export type LifecycleSubstage = {
  substageCode: SubstageCode
  substageName: string
  substageSequence: number
  contract: StageContract
}

export type LifecycleStage = {
  lifecycleVersion: typeof JMP_PUBLISHING_LIFECYCLE_VERSION
  stageCode: StageCode
  stageName: string
  stageSequence: number
  lifecycleDimensions: LifecycleDimension[]
  contract: StageContract
  substages: LifecycleSubstage[]
}

const commonAttention = ['Surface exact blocker without changing primary waiting owner.']

function contract(input: Partial<StageContract> & Pick<StageContract, 'entryConditions' | 'exitConditions' | 'sourceOfTruth' | 'workDefinition' | 'qualityGate'>): StageContract {
  return {
    sourceArtifactTypes: [],
    outputArtifactTypes: [],
    authorGateRequired: false,
    commercialGateRequired: false,
    allowedWaitingOwners: [...WAITING_OWNERS],
    allowedTransitions: [],
    disallowedTransitions: [],
    parallelWorkAllowed: [],
    terminal: false,
    persistent: false,
    systemAttentionBehavior: commonAttention,
    ...input,
  }
}

export const JMP_PUBLISHING_LIFECYCLE_REGISTRY: LifecycleStage[] = [
  {
    lifecycleVersion: JMP_PUBLISHING_LIFECYCLE_VERSION,
    stageCode: 'INQUIRY_INTAKE',
    stageName: 'Inquiry & Intake',
    stageSequence: 1,
    lifecycleDimensions: ['PROSPECT_COMMERCIAL'],
    contract: contract({
      entryConditions: ['Prospect submits inquiry or publishing intake evidence is received.'],
      exitConditions: ['Intake evidence is persisted with source/contact/manuscript status.'],
      sourceOfTruth: ['jm1_publishingintake', 'execution log', 'source submission artifact'],
      workDefinition: 'Capture inquiry, intake facts, consent, source manuscript presence, and referral/source context.',
      sourceArtifactTypes: ['ORIGINAL_AUTHOR_SUBMISSION'],
      outputArtifactTypes: ['EDITORIAL_WORKING_SOURCE'],
      qualityGate: 'Intake reference, source evidence, and owner are present.',
      nextStage: 'CLASSIFICATION',
      nextSubstage: 'CLASSIFICATION_REVIEW',
    }),
    substages: [
      {
        substageCode: 'INQUIRY',
        substageName: 'Inquiry',
        substageSequence: 1,
        contract: contract({
          entryConditions: ['Prospect initiates contact.'],
          exitConditions: ['Inquiry can be converted into intake or closed as not actionable.'],
          sourceOfTruth: ['website submission', 'mailbox', 'manual intake evidence'],
          workDefinition: 'Record prospect signal without assigning title-production state.',
          qualityGate: 'Contact path and inquiry source are identifiable.',
          nextStage: 'INQUIRY_INTAKE',
          nextSubstage: 'INTAKE',
        }),
      },
      {
        substageCode: 'INTAKE',
        substageName: 'Intake',
        substageSequence: 2,
        contract: contract({
          entryConditions: ['Inquiry is actionable or intake form was submitted directly.'],
          exitConditions: ['Intake record and manuscript/source status are known.'],
          sourceOfTruth: ['jm1_publishingintake'],
          workDefinition: 'Normalize intake facts and prepare classification handoff.',
          sourceArtifactTypes: ['ORIGINAL_AUTHOR_SUBMISSION'],
          outputArtifactTypes: ['EDITORIAL_WORKING_SOURCE'],
          qualityGate: 'Idempotent intake reference and source provenance exist.',
          nextStage: 'CLASSIFICATION',
          nextSubstage: 'CLASSIFICATION_REVIEW',
        }),
      },
    ],
  },
  {
    lifecycleVersion: JMP_PUBLISHING_LIFECYCLE_VERSION,
    stageCode: 'CLASSIFICATION',
    stageName: 'Classification',
    stageSequence: 2,
    lifecycleDimensions: ['PROSPECT_COMMERCIAL'],
    contract: contract({
      entryConditions: ['Intake evidence exists.'],
      exitConditions: ['Prospect/project classification and review route are determined.'],
      sourceOfTruth: ['jm1_publishingintake', 'jm1pub_editorialdiagnostic', 'execution log'],
      workDefinition: 'Classify intake, manuscript readiness, work type, risk, and whether Editorial Review is appropriate.',
      outputArtifactTypes: ['EDITORIAL_REVIEW_SOURCE'],
      qualityGate: 'Classification is source-informed or explicitly provisional.',
      nextStage: 'EDITORIAL_REVIEW_RECOMMENDATION',
      nextSubstage: 'PRE_CONTRACT_EDITORIAL_REVIEW',
    }),
    substages: [
      {
        substageCode: 'CLASSIFICATION_REVIEW',
        substageName: 'Classification Review',
        substageSequence: 1,
        contract: contract({
          entryConditions: ['Intake source exists.'],
          exitConditions: ['Canonical route is assigned or human review is requested.'],
          sourceOfTruth: ['diagnostic runner', 'publisher review evidence'],
          workDefinition: 'Resolve provisional vs source-informed classification.',
          qualityGate: 'Unknown or conflicting classification fails closed to human review.',
          nextStage: 'EDITORIAL_REVIEW_RECOMMENDATION',
          nextSubstage: 'PRE_CONTRACT_EDITORIAL_REVIEW',
        }),
      },
    ],
  },
  {
    lifecycleVersion: JMP_PUBLISHING_LIFECYCLE_VERSION,
    stageCode: 'EDITORIAL_REVIEW_RECOMMENDATION',
    stageName: 'Editorial Review & Publishing Recommendation',
    stageSequence: 3,
    lifecycleDimensions: ['PROSPECT_COMMERCIAL'],
    contract: contract({
      entryConditions: ['Classified prospect/project is eligible for pre-contract Editorial Review.'],
      exitConditions: ['Publishing recommendation/package path is prepared and released through prospect decision path.'],
      sourceOfTruth: ['jm1pub_editorialdiagnostic', 'author-facing Editorial Review package', 'execution log'],
      workDefinition: 'Assess prospective manuscript and recommend publishing path/package before contract activation.',
      sourceArtifactTypes: ['EDITORIAL_REVIEW_SOURCE'],
      outputArtifactTypes: ['METADATA_RECORD'],
      qualityGate: 'Recommendation is prospect-facing and cannot use active-author stage approval semantics.',
      allowedWaitingOwners: ['Prospect', 'JMP', 'JMP/System', 'External'],
      nextStage: 'COMMERCIAL_ACTIVATION',
      nextSubstage: 'PACKAGE_ACCEPTANCE',
    }),
    substages: [
      {
        substageCode: 'PRE_CONTRACT_EDITORIAL_REVIEW',
        substageName: 'Pre-Contract Editorial Review',
        substageSequence: 1,
        contract: contract({
          entryConditions: ['Classification indicates review/recommendation is appropriate.'],
          exitConditions: ['Recommendation findings exist.'],
          sourceOfTruth: ['diagnostic output', 'publisher review evidence'],
          workDefinition: 'Produce prospect review findings without author-stage approval language.',
          sourceArtifactTypes: ['EDITORIAL_REVIEW_SOURCE'],
          outputArtifactTypes: ['METADATA_RECORD'],
          qualityGate: 'Prospect context is explicit.',
          nextStage: 'EDITORIAL_REVIEW_RECOMMENDATION',
          nextSubstage: 'PUBLISHING_RECOMMENDATION',
        }),
      },
      {
        substageCode: 'PUBLISHING_RECOMMENDATION',
        substageName: 'Publishing Recommendation',
        substageSequence: 2,
        contract: contract({
          entryConditions: ['Pre-contract review findings exist.'],
          exitConditions: ['Prospect can accept or decline package path.'],
          sourceOfTruth: ['recommendation package', 'commercial catalog read dependency'],
          workDefinition: 'Present package/path recommendation as a prospect package-selection decision.',
          qualityGate: 'Notification sent is not equivalent to package accepted.',
          nextStage: 'COMMERCIAL_ACTIVATION',
          nextSubstage: 'PACKAGE_ACCEPTANCE',
        }),
      },
    ],
  },
  {
    lifecycleVersion: JMP_PUBLISHING_LIFECYCLE_VERSION,
    stageCode: 'COMMERCIAL_ACTIVATION',
    stageName: 'Package Acceptance & Commercial Activation',
    stageSequence: 4,
    lifecycleDimensions: ['PROSPECT_COMMERCIAL'],
    contract: contract({
      entryConditions: ['Prospect accepts a publishing package/path.'],
      exitConditions: ['Agreement/payment prerequisites are ready for relationship conversion.'],
      sourceOfTruth: ['opportunity', 'commercial catalog', 'agreement evidence', 'Stripe payment event'],
      workDefinition: 'Activate package, agreement, payment path, and commercial readiness without converting title stage.',
      commercialGateRequired: true,
      qualityGate: 'Package accepted is not Joined the Family until agreement and required initial payment are both present.',
      nextStage: 'AUTHOR_ONBOARDING',
      nextSubstage: 'JOINED_THE_FAMILY',
    }),
    substages: [
      {
        substageCode: 'PACKAGE_ACCEPTANCE',
        substageName: 'Package Acceptance',
        substageSequence: 1,
        contract: contract({
          entryConditions: ['Prospect chooses package/path.'],
          exitConditions: ['Commercial activation can proceed.'],
          sourceOfTruth: ['opportunity', 'package selection evidence'],
          workDefinition: 'Record accepted package as commercial state, not title production state.',
          qualityGate: 'Accepted package has catalog-backed SKU/terms path.',
          commercialGateRequired: true,
          nextStage: 'COMMERCIAL_ACTIVATION',
          nextSubstage: 'COMMERCIAL_ACTIVATION_EVENT',
        }),
      },
      {
        substageCode: 'COMMERCIAL_ACTIVATION_EVENT',
        substageName: 'Commercial Activation',
        substageSequence: 2,
        contract: contract({
          entryConditions: ['Package accepted.'],
          exitConditions: ['Agreement/payment events can be evaluated for Joined the Family.'],
          sourceOfTruth: ['agreement evidence', 'Stripe payment event', 'execution log'],
          workDefinition: 'Evaluate commercial prerequisites and preserve payment state separately from title stage.',
          qualityGate: 'Payment obligation state is separate from title lifecycle.',
          commercialGateRequired: true,
          nextStage: 'AUTHOR_ONBOARDING',
          nextSubstage: 'JOINED_THE_FAMILY',
        }),
      },
    ],
  },
  {
    lifecycleVersion: JMP_PUBLISHING_LIFECYCLE_VERSION,
    stageCode: 'AUTHOR_ONBOARDING',
    stageName: 'Join the Family & Author Onboarding',
    stageSequence: 5,
    lifecycleDimensions: ['AUTHOR_RELATIONSHIP'],
    contract: contract({
      entryConditions: ['Publishing agreement executed and required initial payment received.'],
      exitConditions: ['Author onboarding/workspace readiness is complete or explicitly held.'],
      sourceOfTruth: ['agreement evidence', 'Stripe initial payment event', 'author onboarding submission', 'workspace readiness evidence'],
      workDefinition: 'Convert prospect to durable author relationship and complete onboarding tasks.',
      commercialGateRequired: true,
      qualityGate: 'Joined the Family has exactly one definition and remains durable after emission.',
      nextStage: 'EDITORIAL_PRODUCTION',
    }),
    substages: [
      {
        substageCode: 'JOINED_THE_FAMILY',
        substageName: 'Joined the Family',
        substageSequence: 1,
        contract: contract({
          entryConditions: ['Agreement executed and required initial payment received.'],
          exitConditions: ['Author relationship conversion event is recorded.'],
          sourceOfTruth: ['agreement evidence', 'Stripe payment event'],
          workDefinition: 'Emit durable relationship conversion event.',
          qualityGate: 'Agreement only or initial payment only is insufficient.',
          commercialGateRequired: true,
          nextStage: 'AUTHOR_ONBOARDING',
          nextSubstage: 'AUTHOR_ONBOARDING_TASKS',
        }),
      },
      {
        substageCode: 'AUTHOR_ONBOARDING_TASKS',
        substageName: 'Author Onboarding Tasks',
        substageSequence: 2,
        contract: contract({
          entryConditions: ['Joined the Family emitted.'],
          exitConditions: ['Required author setup tasks are complete or explicitly held.'],
          sourceOfTruth: ['author onboarding record', 'workspace/auth/financial setup evidence'],
          workDefinition: 'Collect onboarding, workspace, and setup readiness without redefining author identity.',
          qualityGate: 'Workspace activation does not define whether someone is an author.',
          nextStage: 'EDITORIAL_PRODUCTION',
        }),
      },
    ],
  },
  {
    lifecycleVersion: JMP_PUBLISHING_LIFECYCLE_VERSION,
    stageCode: 'EDITORIAL_PRODUCTION',
    stageName: 'Editorial Production',
    stageSequence: 6,
    lifecycleDimensions: ['TITLE'],
    contract: contract({
      entryConditions: ['Title is commercially/operationally authorized for scoped editorial work.'],
      exitConditions: ['Applicable editorial substages are completed with required author gates.'],
      sourceOfTruth: ['jm1pub_editorialstage', 'jm1pub_editorialartifact', 'jm1pub_editorialapprovalgate', 'execution log'],
      workDefinition: 'Perform scoped Developmental, Line, and Copy editing with exact artifact lineage.',
      sourceArtifactTypes: ['EDITORIAL_WORKING_SOURCE', 'APPROVED_DEVELOPMENTAL_ARTIFACT', 'APPROVED_LINE_ARTIFACT'],
      outputArtifactTypes: ['DEVELOPMENTAL_ARTIFACT', 'LINE_ARTIFACT', 'COPY_ARTIFACT'],
      qualityGate: 'Applicable substages advance only from approved predecessor artifacts.',
      authorGateRequired: true,
      parallelWorkAllowed: ['cover concept', 'metadata drafting', 'marketing preparation'],
      nextStage: 'BOOK_PRODUCTION',
      nextSubstage: 'INTERIOR_LAYOUT',
    }),
    substages: [
      {
        substageCode: 'DEVELOPMENTAL_EDITING',
        substageName: 'Developmental Editing',
        substageSequence: 1,
        contract: contract({
          entryConditions: ['Developmental Editing applies to title scope.'],
          exitConditions: ['Developmental artifact is ready for author review.'],
          sourceOfTruth: ['editorial stage', 'editorial artifact'],
          workDefinition: 'Perform developmental edit from governed source.',
          sourceArtifactTypes: ['EDITORIAL_WORKING_SOURCE'],
          outputArtifactTypes: ['DEVELOPMENTAL_ARTIFACT'],
          qualityGate: 'Developmental output is artifact-backed and checksum-bearing.',
          nextStage: 'EDITORIAL_PRODUCTION',
          nextSubstage: 'DEVELOPMENTAL_AUTHOR_REVIEW',
        }),
      },
      {
        substageCode: 'DEVELOPMENTAL_AUTHOR_REVIEW',
        substageName: 'Developmental Author Review',
        substageSequence: 2,
        contract: contract({
          entryConditions: ['Developmental artifact exists.'],
          exitConditions: ['Approved developmental artifact authorizes next applicable stage.'],
          sourceOfTruth: ['editorial approval gate'],
          workDefinition: 'Capture author decision bound to Developmental artifact.',
          sourceArtifactTypes: ['DEVELOPMENTAL_ARTIFACT'],
          outputArtifactTypes: ['APPROVED_DEVELOPMENTAL_ARTIFACT'],
          qualityGate: 'Author gate is valid for exact artifact/checksum.',
          authorGateRequired: true,
          nextStage: 'EDITORIAL_PRODUCTION',
          nextSubstage: 'LINE_EDITING',
        }),
      },
      {
        substageCode: 'LINE_EDITING',
        substageName: 'Line Editing',
        substageSequence: 3,
        contract: contract({
          entryConditions: ['Line Editing applies and required predecessor artifact is approved or predecessor is not applicable.'],
          exitConditions: ['Line artifact is ready for author review.'],
          sourceOfTruth: ['editorial stage', 'editorial artifact'],
          workDefinition: 'Perform line edit without relabeling Developmental output.',
          sourceArtifactTypes: ['APPROVED_DEVELOPMENTAL_ARTIFACT', 'EDITORIAL_WORKING_SOURCE'],
          outputArtifactTypes: ['LINE_ARTIFACT'],
          qualityGate: 'Line artifact identity is distinct from Developmental artifact identity.',
          nextStage: 'EDITORIAL_PRODUCTION',
          nextSubstage: 'LINE_AUTHOR_REVIEW',
        }),
      },
      {
        substageCode: 'LINE_AUTHOR_REVIEW',
        substageName: 'Line Author Review',
        substageSequence: 4,
        contract: contract({
          entryConditions: ['Line artifact exists.'],
          exitConditions: ['Approved line artifact authorizes Copy when Copy applies.'],
          sourceOfTruth: ['editorial approval gate'],
          workDefinition: 'Capture author decision bound to Line artifact.',
          sourceArtifactTypes: ['LINE_ARTIFACT'],
          outputArtifactTypes: ['APPROVED_LINE_ARTIFACT'],
          qualityGate: 'Author gate is valid for exact artifact/checksum.',
          authorGateRequired: true,
          nextStage: 'EDITORIAL_PRODUCTION',
          nextSubstage: 'COPYEDITING',
        }),
      },
      {
        substageCode: 'COPYEDITING',
        substageName: 'Copyediting',
        substageSequence: 5,
        contract: contract({
          entryConditions: ['Copyediting applies and Line approval exists when Line applies.'],
          exitConditions: ['Copy artifact is ready for author review.'],
          sourceOfTruth: ['editorial stage', 'editorial artifact'],
          workDefinition: 'Perform copyedit from approved prior source.',
          sourceArtifactTypes: ['APPROVED_LINE_ARTIFACT', 'EDITORIAL_WORKING_SOURCE'],
          outputArtifactTypes: ['COPY_ARTIFACT'],
          qualityGate: 'Copy output is artifact-backed and checksum-bearing.',
          nextStage: 'EDITORIAL_PRODUCTION',
          nextSubstage: 'COPY_AUTHOR_REVIEW',
        }),
      },
      {
        substageCode: 'COPY_AUTHOR_REVIEW',
        substageName: 'Copy Author Review',
        substageSequence: 6,
        contract: contract({
          entryConditions: ['Copy artifact exists.'],
          exitConditions: ['Approved copy artifact authorizes layout.'],
          sourceOfTruth: ['editorial approval gate'],
          workDefinition: 'Capture author decision bound to Copy artifact.',
          sourceArtifactTypes: ['COPY_ARTIFACT'],
          outputArtifactTypes: ['APPROVED_COPY_ARTIFACT'],
          qualityGate: 'Author gate is valid for exact artifact/checksum.',
          authorGateRequired: true,
          nextStage: 'BOOK_PRODUCTION',
          nextSubstage: 'INTERIOR_LAYOUT',
        }),
      },
    ],
  },
  {
    lifecycleVersion: JMP_PUBLISHING_LIFECYCLE_VERSION,
    stageCode: 'BOOK_PRODUCTION',
    stageName: 'Book Production',
    stageSequence: 7,
    lifecycleDimensions: ['TITLE'],
    contract: contract({
      entryConditions: ['Approved editorial source is ready for production.'],
      exitConditions: ['Final interior/production package is approved and production-finalized.'],
      sourceOfTruth: ['production project', 'production task', 'editorial artifact', 'approval gate'],
      workDefinition: 'Typeset/layout, proofread, capture final author approval, and finalize production assets.',
      sourceArtifactTypes: ['APPROVED_COPY_ARTIFACT'],
      outputArtifactTypes: ['LAYOUT_ARTIFACT', 'PROOF_ARTIFACT', 'FINAL_INTERIOR'],
      qualityGate: 'Layout precedes Proof; Proof precedes Final Author Approval; Final Approval precedes Production Finalization.',
      authorGateRequired: true,
      parallelWorkAllowed: ['cover concept', 'metadata drafting', 'distribution preparation'],
      nextStage: 'DISTRIBUTION_READINESS',
      nextSubstage: 'COVER_CONCEPT',
    }),
    substages: [
      {
        substageCode: 'INTERIOR_LAYOUT',
        substageName: 'Interior Layout / Typesetting',
        substageSequence: 1,
        contract: contract({
          entryConditions: ['Approved copy/final editorial source is available.'],
          exitConditions: ['Layout artifact exists.'],
          sourceOfTruth: ['production project', 'layout artifact'],
          workDefinition: 'Create interior layout/typeset artifact.',
          sourceArtifactTypes: ['APPROVED_COPY_ARTIFACT'],
          outputArtifactTypes: ['LAYOUT_ARTIFACT'],
          qualityGate: 'Layout artifact is versioned/checksummed.',
          nextStage: 'BOOK_PRODUCTION',
          nextSubstage: 'PROOFREADING',
        }),
      },
      {
        substageCode: 'PROOFREADING',
        substageName: 'Proofreading',
        substageSequence: 2,
        contract: contract({
          entryConditions: ['Layout artifact exists.'],
          exitConditions: ['Proof artifact exists.'],
          sourceOfTruth: ['production task', 'proof artifact'],
          workDefinition: 'Proofread laid-out book.',
          sourceArtifactTypes: ['LAYOUT_ARTIFACT'],
          outputArtifactTypes: ['PROOF_ARTIFACT'],
          qualityGate: 'Proof cannot precede Layout.',
          nextStage: 'BOOK_PRODUCTION',
          nextSubstage: 'FINAL_AUTHOR_APPROVAL',
        }),
      },
      {
        substageCode: 'FINAL_AUTHOR_APPROVAL',
        substageName: 'Final Author Approval',
        substageSequence: 3,
        contract: contract({
          entryConditions: ['Proof artifact exists.'],
          exitConditions: ['Author final approval is bound to proof/final interior artifact.'],
          sourceOfTruth: ['approval gate', 'proof/final interior artifact'],
          workDefinition: 'Capture final author approval.',
          sourceArtifactTypes: ['PROOF_ARTIFACT'],
          outputArtifactTypes: ['FINAL_INTERIOR'],
          qualityGate: 'Final author approval required before production finalization.',
          authorGateRequired: true,
          nextStage: 'BOOK_PRODUCTION',
          nextSubstage: 'PRODUCTION_FINALIZATION',
        }),
      },
      {
        substageCode: 'PRODUCTION_FINALIZATION',
        substageName: 'Production Finalization',
        substageSequence: 4,
        contract: contract({
          entryConditions: ['Final author approval exists.'],
          exitConditions: ['Production-final assets are certified.'],
          sourceOfTruth: ['production artifact', 'execution log'],
          workDefinition: 'Finalize production files for distribution-readiness checks.',
          sourceArtifactTypes: ['FINAL_INTERIOR'],
          outputArtifactTypes: ['DISTRIBUTION_ARTIFACT'],
          qualityGate: 'Final delivery/release payment gate remains separate.',
          nextStage: 'DISTRIBUTION_READINESS',
          nextSubstage: 'FORMAT_DISTRIBUTION_READINESS',
        }),
      },
    ],
  },
  {
    lifecycleVersion: JMP_PUBLISHING_LIFECYCLE_VERSION,
    stageCode: 'DISTRIBUTION_READINESS',
    stageName: 'Cover, Metadata & Distribution Readiness',
    stageSequence: 8,
    lifecycleDimensions: ['TITLE'],
    contract: contract({
      entryConditions: ['Production-final assets or authorized preparatory work exist.'],
      exitConditions: ['Format-specific distribution readiness is certified.'],
      sourceOfTruth: ['publishing asset', 'metadata record', 'cover artifact', 'execution log'],
      workDefinition: 'Prepare cover, metadata, format readiness, and distribution artifacts.',
      sourceArtifactTypes: ['FINAL_INTERIOR', 'COVER_CONCEPT_ARTIFACT', 'METADATA_RECORD'],
      outputArtifactTypes: ['DISTRIBUTION_ARTIFACT'],
      qualityGate: 'Distribution readiness is format-specific and cannot bypass final approval.',
      parallelWorkAllowed: ['cover concept', 'metadata drafting', 'marketing preparation', 'distribution preparation'],
      nextStage: 'DISTRIBUTION_RELEASE',
      nextSubstage: 'DISTRIBUTOR_SUBMISSION',
    }),
    substages: [
      {
        substageCode: 'COVER_CONCEPT',
        substageName: 'Cover Concept',
        substageSequence: 1,
        contract: contract({
          entryConditions: ['Title direction exists.'],
          exitConditions: ['Cover concept/review artifact exists.'],
          sourceOfTruth: ['cover artifact', 'approval evidence'],
          workDefinition: 'Prepare cover concept as safe parallel work.',
          outputArtifactTypes: ['COVER_CONCEPT_ARTIFACT'],
          qualityGate: 'Full wrap finalization requires final page count/spine/specifications.',
          parallelWorkAllowed: ['metadata drafting'],
        }),
      },
      {
        substageCode: 'METADATA_DRAFT',
        substageName: 'Metadata Draft',
        substageSequence: 2,
        contract: contract({
          entryConditions: ['Title/product-form context exists.'],
          exitConditions: ['Metadata draft exists.'],
          sourceOfTruth: ['metadata record'],
          workDefinition: 'Prepare metadata draft before irreversible distribution submission.',
          outputArtifactTypes: ['METADATA_RECORD'],
          qualityGate: 'Metadata ready is distinct from distribution ready.',
          parallelWorkAllowed: ['cover concept'],
        }),
      },
      {
        substageCode: 'FORMAT_DISTRIBUTION_READINESS',
        substageName: 'Format-Specific Distribution Readiness',
        substageSequence: 3,
        contract: contract({
          entryConditions: ['Production-final artifact and format metadata exist.'],
          exitConditions: ['Each intended format is ready, pending, or not applicable.'],
          sourceOfTruth: ['publishing asset'],
          workDefinition: 'Certify distribution readiness per format.',
          sourceArtifactTypes: ['DISTRIBUTION_ARTIFACT'],
          outputArtifactTypes: ['DISTRIBUTION_ARTIFACT'],
          qualityGate: 'Paperback, hardcover, ebook, and audiobook readiness are not one binary flag.',
          nextStage: 'DISTRIBUTION_RELEASE',
          nextSubstage: 'DISTRIBUTOR_SUBMISSION',
        }),
      },
    ],
  },
  {
    lifecycleVersion: JMP_PUBLISHING_LIFECYCLE_VERSION,
    stageCode: 'DISTRIBUTION_RELEASE',
    stageName: 'Distribution, Launch & Release',
    stageSequence: 9,
    lifecycleDimensions: ['TITLE'],
    contract: contract({
      entryConditions: ['Distribution readiness is certified for intended format(s).'],
      exitConditions: ['Release/live evidence and JMP public title/author page projection are recorded before title enters post-publication stewardship.'],
      sourceOfTruth: ['distribution channel evidence', 'publishing asset', 'JMP public catalog projection', 'execution log'],
      workDefinition: 'Submit/release through governed distribution and launch readiness workflow.',
      sourceArtifactTypes: ['DISTRIBUTION_ARTIFACT'],
      outputArtifactTypes: ['DISTRIBUTION_ARTIFACT', 'PUBLIC_CATALOG_PROJECTION'],
      qualityGate: 'Distributor submission, confirmed-live readback, and JMP-controlled public page verification are distinct.',
      nextStage: 'POST_PUBLICATION',
      nextSubstage: 'POST_PUBLICATION_STEWARDSHIP',
    }),
    substages: [
      {
        substageCode: 'DISTRIBUTOR_SUBMISSION',
        substageName: 'Distributor Submission',
        substageSequence: 1,
        contract: contract({
          entryConditions: ['Distribution artifact is certified.'],
          exitConditions: ['Submission evidence exists.'],
          sourceOfTruth: ['distributor submission evidence'],
          workDefinition: 'Submit distribution package.',
          sourceArtifactTypes: ['DISTRIBUTION_ARTIFACT'],
          qualityGate: 'Submission does not equal confirmed release.',
          nextStage: 'DISTRIBUTION_RELEASE',
          nextSubstage: 'LAUNCH_RELEASE',
        }),
      },
      {
        substageCode: 'LAUNCH_RELEASE',
        substageName: 'Launch / Release',
        substageSequence: 2,
        contract: contract({
          entryConditions: ['Submission/release plan exists.'],
          exitConditions: ['Release/live status is source-backed and the JMP title page plus required author page are verified.'],
          sourceOfTruth: ['confirmed-live readback', 'release evidence', 'JMP public catalog projection'],
          workDefinition: 'Confirm launch/release evidence and verify the JMP public title/author catalog pages.',
          outputArtifactTypes: ['PUBLIC_CATALOG_PROJECTION'],
          qualityGate: 'Release closure requires JMP public page verification; retailer pages are evidence only.',
          nextStage: 'POST_PUBLICATION',
          nextSubstage: 'POST_PUBLICATION_STEWARDSHIP',
        }),
      },
    ],
  },
  {
    lifecycleVersion: JMP_PUBLISHING_LIFECYCLE_VERSION,
    stageCode: 'POST_PUBLICATION',
    stageName: 'Post-Publication Title & Author Relationship',
    stageSequence: 10,
    lifecycleDimensions: ['TITLE', 'AUTHOR_RELATIONSHIP'],
    contract: contract({
      entryConditions: ['Title has released or entered governed post-publication stewardship.'],
      exitConditions: ['Only governed terminal title event can end post-publication state.'],
      sourceOfTruth: ['published catalog', 'royalty evidence', 'rights/contract evidence', 'execution log'],
      workDefinition: 'Persist title and author relationship stewardship after release.',
      qualityGate: 'Royalty, metadata, sales, and marketing events do not push title back to Stage 09.',
      allowedTransitions: [],
      terminal: false,
      persistent: true,
    }),
    substages: [
      {
        substageCode: 'POST_PUBLICATION_STEWARDSHIP',
        substageName: 'Post-Publication Stewardship',
        substageSequence: 1,
        contract: contract({
          entryConditions: ['Stage 10 entered.'],
          exitConditions: ['Governed terminal event, if any, is recorded.'],
          sourceOfTruth: ['royalty evidence', 'distribution health', 'metadata health', 'rights evidence'],
          workDefinition: 'Manage royalties, rights, distribution health, metadata health, title health, marketing opportunities, and author relationship.',
          qualityGate: 'Stage 10 is persistent/nonterminal absent terminal event.',
          terminal: false,
          persistent: true,
        }),
      },
    ],
  },
]

export function flattenSubstages() {
  return JMP_PUBLISHING_LIFECYCLE_REGISTRY.flatMap((stage) =>
    stage.substages.map((substage) => ({ stage, substage })),
  )
}
