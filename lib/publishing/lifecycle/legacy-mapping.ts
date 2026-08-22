import type { LifecycleDimension, StageCode, SubstageCode } from './registry'

export type LegacyMappingType = 'EXACT' | 'CONTEXT_DEPENDENT' | 'DEPRECATED' | 'CONFLICT' | 'UNMAPPED'

export type LegacyLifecycleContext =
  | 'PROSPECT_INQUIRY'
  | 'ACTIVE_CONTRACTED_AUTHOR'
  | 'TITLE'
  | 'COMMERCIAL'
  | 'AUTHOR_RELATIONSHIP'

export type LegacyMappingRecord = {
  legacyAuthority: string
  legacyValue: string
  canonicalStage: StageCode | null
  canonicalSubstage: SubstageCode | null
  canonicalDimension: LifecycleDimension | null
  mappingType: LegacyMappingType
  confidence: 'high' | 'medium' | 'low'
  notes: string
}

export type LegacyMappingInput = {
  legacyAuthority: string
  legacyValue: string
  lifecycleContext?: LegacyLifecycleContext
  artifactType?: string
  packageState?: string
  titleRelationshipState?: string
}

export type LegacyMappingResult = LegacyMappingRecord & {
  resultCode: 'CANONICAL_MAPPING_EXACT' | 'CANONICAL_MAPPING_CONTEXTUAL' | 'CANONICAL_MAPPING_CONFLICT' | 'CANONICAL_MAPPING_INCOMPLETE'
}

export const LEGACY_LIFECYCLE_MAPPINGS: LegacyMappingRecord[] = [
  {
    legacyAuthority: 'Pipeline Register J0-J8',
    legacyValue: 'J0 Inquiry',
    canonicalStage: 'INQUIRY_INTAKE',
    canonicalSubstage: 'INQUIRY',
    canonicalDimension: 'PROSPECT_COMMERCIAL',
    mappingType: 'EXACT',
    confidence: 'high',
    notes: 'Enterprise inquiry maps to Stage 01 inquiry.',
  },
  {
    legacyAuthority: 'Pipeline Register J0-J8',
    legacyValue: 'J1 Manuscript Review',
    canonicalStage: 'CLASSIFICATION',
    canonicalSubstage: 'CLASSIFICATION_REVIEW',
    canonicalDimension: 'PROSPECT_COMMERCIAL',
    mappingType: 'CONTEXT_DEPENDENT',
    confidence: 'medium',
    notes: 'May include intake source review and classification; requires context for Editorial Review handoff.',
  },
  {
    legacyAuthority: 'Pipeline Register J0-J8',
    legacyValue: 'J2 Recommendation',
    canonicalStage: 'EDITORIAL_REVIEW_RECOMMENDATION',
    canonicalSubstage: 'PUBLISHING_RECOMMENDATION',
    canonicalDimension: 'PROSPECT_COMMERCIAL',
    mappingType: 'EXACT',
    confidence: 'high',
    notes: 'Prospect publishing recommendation path.',
  },
  {
    legacyAuthority: 'Pipeline Register J0-J8',
    legacyValue: 'J4 Onboarding',
    canonicalStage: 'AUTHOR_ONBOARDING',
    canonicalSubstage: 'AUTHOR_ONBOARDING_TASKS',
    canonicalDimension: 'AUTHOR_RELATIONSHIP',
    mappingType: 'CONTEXT_DEPENDENT',
    confidence: 'medium',
    notes: 'Only after Joined the Family prerequisites are satisfied.',
  },
  {
    legacyAuthority: 'Pipeline Register J0-J8',
    legacyValue: 'J6 Editorial',
    canonicalStage: 'EDITORIAL_PRODUCTION',
    canonicalSubstage: null,
    canonicalDimension: 'TITLE',
    mappingType: 'CONTEXT_DEPENDENT',
    confidence: 'high',
    notes: 'Must disambiguate Developmental, Line, and Copy substages.',
  },
  {
    legacyAuthority: 'Pipeline Register J0-J8',
    legacyValue: 'J7 Production',
    canonicalStage: 'BOOK_PRODUCTION',
    canonicalSubstage: null,
    canonicalDimension: 'TITLE',
    mappingType: 'CONTEXT_DEPENDENT',
    confidence: 'high',
    notes: 'Must disambiguate layout, proof, final approval, and finalization.',
  },
  {
    legacyAuthority: 'Pipeline Register J0-J8',
    legacyValue: 'J8 Ongoing Relationship',
    canonicalStage: 'POST_PUBLICATION',
    canonicalSubstage: 'POST_PUBLICATION_STEWARDSHIP',
    canonicalDimension: 'AUTHOR_RELATIONSHIP',
    mappingType: 'CONTEXT_DEPENDENT',
    confidence: 'medium',
    notes: 'May be author relationship or title stewardship depending on source row.',
  },
  {
    legacyAuthority: 'PackageStageCode',
    legacyValue: 'EDITORIAL_REVIEW',
    canonicalStage: 'EDITORIAL_REVIEW_RECOMMENDATION',
    canonicalSubstage: 'PRE_CONTRACT_EDITORIAL_REVIEW',
    canonicalDimension: 'PROSPECT_COMMERCIAL',
    mappingType: 'CONTEXT_DEPENDENT',
    confidence: 'high',
    notes: 'Only maps here when lifecycle context is prospect inquiry.',
  },
  {
    legacyAuthority: 'PackageStageCode',
    legacyValue: 'DEVELOPMENTAL_EDITING',
    canonicalStage: 'EDITORIAL_PRODUCTION',
    canonicalSubstage: 'DEVELOPMENTAL_EDITING',
    canonicalDimension: 'TITLE',
    mappingType: 'EXACT',
    confidence: 'high',
    notes: 'Title editorial production substage.',
  },
  {
    legacyAuthority: 'PackageStageCode',
    legacyValue: 'LINE_EDITING',
    canonicalStage: 'EDITORIAL_PRODUCTION',
    canonicalSubstage: 'LINE_EDITING',
    canonicalDimension: 'TITLE',
    mappingType: 'EXACT',
    confidence: 'high',
    notes: 'Title editorial production substage; runtime may be held without changing lifecycle stage.',
  },
  {
    legacyAuthority: 'PackageStageCode',
    legacyValue: 'COPYEDITING',
    canonicalStage: 'EDITORIAL_PRODUCTION',
    canonicalSubstage: 'COPYEDITING',
    canonicalDimension: 'TITLE',
    mappingType: 'EXACT',
    confidence: 'high',
    notes: 'Title editorial production substage.',
  },
  {
    legacyAuthority: 'PackageStageCode',
    legacyValue: 'PROOFREADING',
    canonicalStage: 'BOOK_PRODUCTION',
    canonicalSubstage: 'PROOFREADING',
    canonicalDimension: 'TITLE',
    mappingType: 'EXACT',
    confidence: 'high',
    notes: 'Book Production substage; requires Layout artifact before transition.',
  },
  {
    legacyAuthority: 'PackageStageCode',
    legacyValue: 'INTERIOR_LAYOUT',
    canonicalStage: 'BOOK_PRODUCTION',
    canonicalSubstage: 'INTERIOR_LAYOUT',
    canonicalDimension: 'TITLE',
    mappingType: 'EXACT',
    confidence: 'high',
    notes: 'Book Production layout/typesetting.',
  },
  {
    legacyAuthority: 'PackageStageCode',
    legacyValue: 'COVER_DESIGN',
    canonicalStage: 'DISTRIBUTION_READINESS',
    canonicalSubstage: 'COVER_CONCEPT',
    canonicalDimension: 'TITLE',
    mappingType: 'CONTEXT_DEPENDENT',
    confidence: 'medium',
    notes: 'Cover concept may be parallel preparatory work; full wrap has later dependencies.',
  },
  {
    legacyAuthority: 'PackageStageCode',
    legacyValue: 'PRODUCTION_PROOF',
    canonicalStage: 'BOOK_PRODUCTION',
    canonicalSubstage: 'FINAL_AUTHOR_APPROVAL',
    canonicalDimension: 'TITLE',
    mappingType: 'CONTEXT_DEPENDENT',
    confidence: 'medium',
    notes: 'Can represent proof/final approval package; exact artifact/gate context required.',
  },
  {
    legacyAuthority: 'Opportunity/Commercial',
    legacyValue: 'PACKAGE_ACCEPTED',
    canonicalStage: 'COMMERCIAL_ACTIVATION',
    canonicalSubstage: 'PACKAGE_ACCEPTANCE',
    canonicalDimension: 'PROSPECT_COMMERCIAL',
    mappingType: 'EXACT',
    confidence: 'high',
    notes: 'Package accepted is not Joined the Family.',
  },
]

export function mapLegacyLifecycleValue(input: LegacyMappingInput): LegacyMappingResult {
  const normalizedAuthority = normalize(input.legacyAuthority)
  const normalizedValue = normalize(input.legacyValue)

  if (normalizedValue === 'EDITORIAL_REVIEW') {
    if (input.lifecycleContext === 'PROSPECT_INQUIRY') {
      return result({
        legacyAuthority: input.legacyAuthority,
        legacyValue: input.legacyValue,
        canonicalStage: 'EDITORIAL_REVIEW_RECOMMENDATION',
        canonicalSubstage: 'PRE_CONTRACT_EDITORIAL_REVIEW',
        canonicalDimension: 'PROSPECT_COMMERCIAL',
        mappingType: 'CONTEXT_DEPENDENT',
        confidence: 'high',
        notes: 'Context resolves EDITORIAL_REVIEW as pre-contract prospect Editorial Review.',
      })
    }
    if (input.lifecycleContext === 'ACTIVE_CONTRACTED_AUTHOR') {
      return conflict(input, 'Generic EDITORIAL_REVIEW is not an active-author title production substage; Developmental, Line, or Copy context is required.')
    }
    return conflict(input, 'EDITORIAL_REVIEW requires prospect vs active-author context.')
  }

  const found = LEGACY_LIFECYCLE_MAPPINGS.find(
    (item) => normalize(item.legacyAuthority) === normalizedAuthority && normalize(item.legacyValue) === normalizedValue,
  )
  if (found) return result(found)

  return {
    legacyAuthority: input.legacyAuthority,
    legacyValue: input.legacyValue,
    canonicalStage: null,
    canonicalSubstage: null,
    canonicalDimension: null,
    mappingType: 'UNMAPPED',
    confidence: 'low',
    notes: 'No canonical mapping exists yet.',
    resultCode: 'CANONICAL_MAPPING_INCOMPLETE',
  }
}

function result(record: LegacyMappingRecord): LegacyMappingResult {
  return {
    ...record,
    resultCode: record.mappingType === 'EXACT' ? 'CANONICAL_MAPPING_EXACT' : 'CANONICAL_MAPPING_CONTEXTUAL',
  }
}

function conflict(input: LegacyMappingInput, notes: string): LegacyMappingResult {
  return {
    legacyAuthority: input.legacyAuthority,
    legacyValue: input.legacyValue,
    canonicalStage: null,
    canonicalSubstage: null,
    canonicalDimension: null,
    mappingType: 'CONFLICT',
    confidence: 'high',
    notes,
    resultCode: 'CANONICAL_MAPPING_CONFLICT',
  }
}

function normalize(value: string) {
  return value.trim().toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_+|_+$/g, '')
}
