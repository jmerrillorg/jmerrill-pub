// Governance contract for J Merrill Publishing Vellum title assembly.
// The Vellum master is an internal production source; author outputs must be title-specific clones.

export const JMP_VELLUM_TEMPLATE_CLASSIFICATION = {
  templateName: 'JMP Vellum Master 2026',
  templateVersion: '1.0',
  purpose: 'JMP INTERNAL TITLE-ASSEMBLY SOURCE',
  authorFacing: false,
  distributionReady: false,
  productionPlatform: 'VELLUM',
  templateAuthority: true,
} as const

export const VELLUM_TEMPLATE_FAILURE_CODES = {
  unresolvedTemplatePlaceholder: 'UNRESOLVED_TEMPLATE_PLACEHOLDER',
  sampleContentPresent: 'SAMPLE_CONTENT_PRESENT',
  unusedFormatMetadataPresent: 'UNUSED_FORMAT_METADATA_PRESENT',
  multipleDisclaimersSelected: 'MULTIPLE_DISCLAIMERS_SELECTED',
  invalidIsbnFormatMapping: 'INVALID_ISBN_FORMAT_MAPPING',
  missingRequiredTitleMetadata: 'MISSING_REQUIRED_TITLE_METADATA',
  internalTemplateGuidanceExposed: 'INTERNAL_TEMPLATE_GUIDANCE_EXPOSED',
} as const

export type VellumPublicationFormat =
  | 'PAPERBACK'
  | 'HARDCOVER'
  | 'EBOOK'
  | 'AUDIOBOOK'
  | 'LARGE_PRINT'
  | 'ACCESSIBLE_EDITION'
  | 'OTHER'

export type TitleFormatDecision = {
  titleId: string
  intakeReference: string
  contractPackage: string
  approvedFormats: VellumPublicationFormat[]
  formatStatus: 'CONTRACTED' | 'APPROVED_INTERNAL' | 'PENDING_DECISION'
  isbnByFormat: Partial<Record<VellumPublicationFormat, string>>
  isbnAssignmentStatus: 'NOT_REQUIRED_FOR_AUTHOR_REVIEW' | 'PENDING' | 'ASSIGNED' | 'BLOCKED'
  trimSize: string
  imprint: string
  edition: string
  publicationDate?: string
  distributionChannel?: string
  largePrintStatus?: 'NOT_APPLICABLE' | 'APPROVED' | 'PENDING'
  accessibleEditionStatus?: 'NOT_APPLICABLE' | 'APPROVED' | 'PENDING'
}

export type VellumAssemblyPreflightInput = {
  correctVellumMaster: boolean
  titleMetadataComplete: boolean
  manuscriptBound: boolean
  titleFormatDecision: TitleFormatDecision
  renderedIsbnFields: VellumPublicationFormat[]
  selectedDisclaimerCount: number
  sampleContentRemaining: number
  placeholderContentRemaining: number
  unusedOptionalSectionsRemaining: number
  tocSourceHeadingsValid: boolean
  frontMatterComplete: boolean
  backMatterComplete: boolean
  internalGuidanceExposed: number
}

export type VellumAssemblyPreflightResult = {
  ok: boolean
  blockers: string[]
  classification: typeof JMP_VELLUM_TEMPLATE_CLASSIFICATION
}

export function validateVellumAssemblyPreflight(input: VellumAssemblyPreflightInput): VellumAssemblyPreflightResult {
  const blockers: string[] = []
  if (!input.correctVellumMaster) blockers.push('WRONG_VELLUM_MASTER')
  if (!input.titleMetadataComplete) blockers.push(VELLUM_TEMPLATE_FAILURE_CODES.missingRequiredTitleMetadata)
  if (!input.manuscriptBound) blockers.push('MISSING_REQUIRED_TITLE_METADATA:MANUSCRIPT')
  if (input.placeholderContentRemaining > 0) blockers.push(VELLUM_TEMPLATE_FAILURE_CODES.unresolvedTemplatePlaceholder)
  if (input.sampleContentRemaining > 0) blockers.push(VELLUM_TEMPLATE_FAILURE_CODES.sampleContentPresent)
  if (input.unusedOptionalSectionsRemaining > 0) blockers.push('UNUSED_OPTIONAL_SECTIONS_PRESENT')
  if (input.selectedDisclaimerCount !== 1) blockers.push(VELLUM_TEMPLATE_FAILURE_CODES.multipleDisclaimersSelected)
  if (!input.tocSourceHeadingsValid) blockers.push('TOC_SOURCE_HEADINGS_INVALID')
  if (!input.frontMatterComplete) blockers.push('FRONT_MATTER_INCOMPLETE')
  if (!input.backMatterComplete) blockers.push('BACK_MATTER_INCOMPLETE')
  if (input.internalGuidanceExposed > 0) blockers.push(VELLUM_TEMPLATE_FAILURE_CODES.internalTemplateGuidanceExposed)

  const approvedFormats = new Set(input.titleFormatDecision.approvedFormats)
  const unusedRenderedFormat = input.renderedIsbnFields.find((format) => !approvedFormats.has(format))
  if (unusedRenderedFormat) blockers.push(`${VELLUM_TEMPLATE_FAILURE_CODES.unusedFormatMetadataPresent}:${unusedRenderedFormat}`)

  const activeFormatWithoutValidMapping = input.titleFormatDecision.approvedFormats.find((format) => {
    const isbn = input.titleFormatDecision.isbnByFormat[format]
    return input.titleFormatDecision.isbnAssignmentStatus === 'ASSIGNED' && !isbn
  })
  if (activeFormatWithoutValidMapping) {
    blockers.push(`${VELLUM_TEMPLATE_FAILURE_CODES.invalidIsbnFormatMapping}:${activeFormatWithoutValidMapping}`)
  }

  return {
    ok: blockers.length === 0,
    blockers,
    classification: JMP_VELLUM_TEMPLATE_CLASSIFICATION,
  }
}
