export const ISBN_ASSIGNMENT_POINT = 'PRODUCTION_METADATA_GATE' as const

export const AUTHOR_REVIEW_ISBN_REQUIREMENT = 'NOT_REQUIRED' as const
export const FINAL_DISTRIBUTION_ISBN_REQUIREMENT = 'REQUIRED' as const

export const ISBN_INVENTORY_STATUSES = [
  'AVAILABLE',
  'RESERVED_PENDING_APPROVAL',
  'ASSIGNED',
  'REGISTERED',
  'PUBLISHED',
  'VOIDED_WITH_REASON',
] as const

export type IsbnInventoryStatus = (typeof ISBN_INVENTORY_STATUSES)[number]

export const ISBN_ASSIGNMENT_APPROVAL_OPTIONS = [
  'APPROVE_ASSIGNMENT',
  'CORRECT_METADATA',
  'HOLD_FORMAT',
  'CANCEL_PRODUCT',
] as const

export type IsbnAssignmentApprovalOption = (typeof ISBN_ASSIGNMENT_APPROVAL_OPTIONS)[number]

export type PublicationFormat =
  | 'PAPERBACK'
  | 'HARDCOVER'
  | 'EPUB'
  | 'LARGE_PRINT_PAPERBACK'
  | 'LARGE_PRINT_HARDCOVER'
  | 'AUDIOBOOK'

export type IsbnInventoryRecord = {
  isbn: string
  bowkerPrefixOrBlock: string
  status: IsbnInventoryStatus
  titleId?: string
  edition?: string
  format?: PublicationFormat
  imprint?: string
  assignmentDate?: string
  assignedBy?: string
  bowkerRegistrationStatus?: 'NOT_STARTED' | 'PREPARED' | 'REGISTERED'
  distributorRegistrationStatus?: 'NOT_STARTED' | 'PREPARED' | 'INGRAM_ACCEPTED' | 'CORESOURCE_ACCEPTED'
  barcodeStatus?: 'NOT_REQUIRED' | 'NOT_STARTED' | 'GENERATED'
  notes?: string
}

export type ProductionMetadataGateInput = {
  canonicalTitle?: string
  subtitle?: string
  authorContributors?: string[]
  titleId?: string
  imprint?: string
  format?: PublicationFormat
  edition?: string
  rightsHolder?: string
  publicationStatus?: 'INTERNAL' | 'AUTHOR_REVIEW' | 'PROCEEDING_TO_PUBLICATION' | 'TEST' | 'SYNTHETIC' | 'ABANDONED'
  proposedPublicationDate?: string
  proposedIsbn?: string
  proposedIsbnPublisherOwned?: boolean
  duplicateCanonicalTitleRecords?: number
  existingAssignments?: IsbnInventoryRecord[]
  requestContext?: 'AUTHOR_REVIEW_PROOF' | 'FINAL_DISTRIBUTION_PROOF' | 'DISTRIBUTOR_METADATA' | 'TEST_RUN'
  isNewEdition?: boolean
}

export type ProductionMetadataGateDecision = {
  gate: 'ISBN_ASSIGNMENT_READY' | 'ISBN_ASSIGNMENT_BLOCKED' | 'ISBN_NOT_REQUIRED_FOR_AUTHOR_REVIEW'
  assignmentPoint: typeof ISBN_ASSIGNMENT_POINT
  humanApprovalRequired: boolean
  allowedApprovalOptions: readonly IsbnAssignmentApprovalOption[]
  blockers: string[]
  proposedIsbn?: string
  registrationTasks: string[]
}

const ISBN_REQUIRED_FORMATS = new Set<PublicationFormat>([
  'PAPERBACK',
  'HARDCOVER',
  'EPUB',
  'LARGE_PRINT_PAPERBACK',
  'LARGE_PRINT_HARDCOVER',
  'AUDIOBOOK',
])

const REUSABLE_TERMINAL_STATUSES = new Set<IsbnInventoryStatus>(['ASSIGNED', 'REGISTERED', 'PUBLISHED', 'VOIDED_WITH_REASON'])

export function requiresIsbnForFormat(format?: PublicationFormat) {
  return Boolean(format && ISBN_REQUIRED_FORMATS.has(format))
}

export function evaluateProductionMetadataGate(input: ProductionMetadataGateInput): ProductionMetadataGateDecision {
  const blockers: string[] = []

  if (input.requestContext === 'AUTHOR_REVIEW_PROOF') {
    return {
      gate: 'ISBN_NOT_REQUIRED_FOR_AUTHOR_REVIEW',
      assignmentPoint: ISBN_ASSIGNMENT_POINT,
      humanApprovalRequired: false,
      allowedApprovalOptions: ISBN_ASSIGNMENT_APPROVAL_OPTIONS,
      blockers: [],
      proposedIsbn: input.proposedIsbn,
      registrationTasks: [],
    }
  }

  if (!input.canonicalTitle) blockers.push('CANONICAL_TITLE_MISSING')
  if (!input.authorContributors?.length) blockers.push('AUTHOR_CONTRIBUTORS_MISSING')
  if (!input.titleId) blockers.push('TITLE_ID_MISSING')
  if (!input.imprint) blockers.push('IMPRINT_MISSING')
  if (!input.format) blockers.push('FORMAT_MISSING')
  if (!input.edition) blockers.push('EDITION_MISSING')
  if (!input.rightsHolder) blockers.push('RIGHTS_HOLDER_MISSING')
  if (!input.publicationStatus) blockers.push('PUBLICATION_STATUS_MISSING')
  if (!input.proposedPublicationDate) blockers.push('PROPOSED_PUBLICATION_DATE_MISSING')
  if (!input.proposedIsbn) blockers.push('PROPOSED_ISBN_MISSING')
  if (input.proposedIsbnPublisherOwned === false) blockers.push('PROPOSED_ISBN_NOT_PUBLISHER_OWNED')
  if ((input.duplicateCanonicalTitleRecords || 0) > 0) blockers.push('DUPLICATE_CANONICAL_TITLE_RECORDS')
  if (input.publicationStatus === 'TEST' || input.publicationStatus === 'SYNTHETIC') blockers.push('SYNTHETIC_OR_TEST_TITLE')
  if (input.publicationStatus === 'ABANDONED') blockers.push('ABANDONED_PRODUCT')
  if (input.format && !requiresIsbnForFormat(input.format)) blockers.push('FORMAT_DOES_NOT_REQUIRE_ISBN')

  const assignmentConflict = findAssignmentConflict(input)
  if (assignmentConflict) blockers.push(assignmentConflict)

  if (blockers.length > 0) {
    return {
      gate: 'ISBN_ASSIGNMENT_BLOCKED',
      assignmentPoint: ISBN_ASSIGNMENT_POINT,
      humanApprovalRequired: true,
      allowedApprovalOptions: ISBN_ASSIGNMENT_APPROVAL_OPTIONS,
      blockers,
      proposedIsbn: input.proposedIsbn,
      registrationTasks: [],
    }
  }

  return {
    gate: 'ISBN_ASSIGNMENT_READY',
    assignmentPoint: ISBN_ASSIGNMENT_POINT,
    humanApprovalRequired: true,
    allowedApprovalOptions: ISBN_ASSIGNMENT_APPROVAL_OPTIONS,
    blockers,
    proposedIsbn: input.proposedIsbn,
    registrationTasks: [
      'ISBN_ASSIGNED',
      'BOWKER_METADATA_REGISTERED',
      'COPYRIGHT_PAGE_UPDATED',
      'BARCODE_GENERATED_FOR_PRINT',
      'INGRAM_METADATA_ACCEPTED',
      'CORESOURCE_METADATA_ACCEPTED',
      'FINAL_PROOF_CERTIFIED',
    ],
  }
}

export function approveIsbnAssignment(input: ProductionMetadataGateInput & { approvedBy?: string; approvedOn?: string }) {
  const gate = evaluateProductionMetadataGate(input)
  if (gate.gate !== 'ISBN_ASSIGNMENT_READY') {
    return { ok: false as const, gate, assignment: null }
  }

  return {
    ok: true as const,
    gate,
    assignment: {
      isbn: input.proposedIsbn as string,
      titleId: input.titleId as string,
      edition: input.edition as string,
      format: input.format as PublicationFormat,
      imprint: input.imprint as string,
      status: 'ASSIGNED' as IsbnInventoryStatus,
      assignmentDate: input.approvedOn || new Date().toISOString(),
      assignedBy: input.approvedBy || 'Publishing Operations',
      bowkerRegistrationStatus: 'PREPARED' as const,
      distributorRegistrationStatus: 'PREPARED' as const,
      barcodeStatus: isPrintFormat(input.format) ? 'NOT_STARTED' as const : 'NOT_REQUIRED' as const,
      notes: 'ISBN locked to title, edition, format, and imprint after Production Metadata Gate approval.',
    },
  }
}

function findAssignmentConflict(input: ProductionMetadataGateInput) {
  const proposed = normalizeIsbn(input.proposedIsbn)
  if (!proposed) return null

  const existing = input.existingAssignments || []
  if (input.isNewEdition) {
    const priorEditionReuse = existing.find((record) =>
      record.titleId === input.titleId &&
      record.edition !== input.edition &&
      normalizeIsbn(record.isbn) === proposed &&
      REUSABLE_TERMINAL_STATUSES.has(record.status),
    )
    if (priorEditionReuse) return 'NEW_EDITION_REUSES_PRIOR_EDITION_ISBN'
  }

  const sameIsbn = existing.find((record) => normalizeIsbn(record.isbn) === proposed && REUSABLE_TERMINAL_STATUSES.has(record.status))
  if (sameIsbn) {
    const sameProduct =
      sameIsbn.titleId === input.titleId &&
      sameIsbn.edition === input.edition &&
      sameIsbn.format === input.format &&
      sameIsbn.imprint === input.imprint
    if (!sameProduct) return 'ISBN_ALREADY_ASSIGNED_TO_DIFFERENT_PRODUCT'
  }

  const sameProductDifferentIsbn = existing.find((record) =>
    record.titleId === input.titleId &&
    record.edition === input.edition &&
    record.format === input.format &&
    record.imprint === input.imprint &&
    normalizeIsbn(record.isbn) !== proposed &&
    REUSABLE_TERMINAL_STATUSES.has(record.status),
  )
  if (sameProductDifferentIsbn) return 'PRODUCT_ALREADY_HAS_DIFFERENT_ISBN'

  return null
}

function isPrintFormat(format?: PublicationFormat) {
  return format === 'PAPERBACK' || format === 'HARDCOVER' || format === 'LARGE_PRINT_PAPERBACK' || format === 'LARGE_PRINT_HARDCOVER'
}

function normalizeIsbn(value?: string) {
  return value?.replace(/[^0-9X]/gi, '').toUpperCase() || ''
}
