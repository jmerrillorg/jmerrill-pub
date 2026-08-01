import assert from 'node:assert/strict'
import test from 'node:test'

const {
  approveIsbnAssignment,
  evaluateProductionMetadataGate,
  requiresIsbnForFormat,
} = await import('../lib/server/isbn-assignment-governance.ts')

const baseInput = {
  canonicalTitle: 'The Intentional Leader',
  authorContributors: ['Jackie Smith Jr.'],
  titleId: 'e797232b-da7a-f111-ab0f-00224820105b',
  imprint: 'J Merrill Publishing',
  format: 'PAPERBACK',
  edition: 'First Edition',
  rightsHolder: 'Jackie Smith Jr.',
  publicationStatus: 'PROCEEDING_TO_PUBLICATION',
  proposedPublicationDate: '2026-09-15',
  proposedIsbn: '978-1-961475-99-1',
  proposedIsbnPublisherOwned: true,
  duplicateCanonicalTitleRecords: 0,
  existingAssignments: [],
}

test('author-review proofs do not require ISBN assignment', () => {
  const decision = evaluateProductionMetadataGate({
    canonicalTitle: 'The Intentional Leader',
    requestContext: 'AUTHOR_REVIEW_PROOF',
  })

  assert.equal(decision.gate, 'ISBN_NOT_REQUIRED_FOR_AUTHOR_REVIEW')
  assert.equal(decision.assignmentPoint, 'PRODUCTION_METADATA_GATE')
  assert.equal(decision.humanApprovalRequired, false)
  assert.deepEqual(decision.blockers, [])
})

test('final distribution metadata gate becomes ready only with complete product metadata', () => {
  const decision = evaluateProductionMetadataGate(baseInput)

  assert.equal(decision.gate, 'ISBN_ASSIGNMENT_READY')
  assert.equal(decision.humanApprovalRequired, true)
  assert.deepEqual(decision.blockers, [])
  assert.equal(decision.registrationTasks.includes('BOWKER_METADATA_REGISTERED'), true)
  assert.equal(decision.registrationTasks.includes('FINAL_PROOF_CERTIFIED'), true)
})

test('approval locks ISBN to title, edition, format, and imprint', () => {
  const result = approveIsbnAssignment({
    ...baseInput,
    approvedBy: 'Publishing Operations',
    approvedOn: '2026-08-01T21:00:00-04:00',
  })

  assert.equal(result.ok, true)
  assert.equal(result.assignment.isbn, baseInput.proposedIsbn)
  assert.equal(result.assignment.titleId, baseInput.titleId)
  assert.equal(result.assignment.edition, baseInput.edition)
  assert.equal(result.assignment.format, baseInput.format)
  assert.equal(result.assignment.status, 'ASSIGNED')
  assert.equal(result.assignment.barcodeStatus, 'NOT_STARTED')
})

test('duplicate or reused ISBN assignments fail closed', () => {
  const decision = evaluateProductionMetadataGate({
    ...baseInput,
    titleId: 'different-title-id',
    existingAssignments: [
      {
        isbn: baseInput.proposedIsbn,
        bowkerPrefixOrBlock: '978-1-961475',
        status: 'ASSIGNED',
        titleId: baseInput.titleId,
        edition: baseInput.edition,
        format: baseInput.format,
        imprint: baseInput.imprint,
      },
    ],
  })

  assert.equal(decision.gate, 'ISBN_ASSIGNMENT_BLOCKED')
  assert.deepEqual(decision.blockers, ['ISBN_ALREADY_ASSIGNED_TO_DIFFERENT_PRODUCT'])
})

test('new editions cannot reuse a prior edition ISBN', () => {
  const decision = evaluateProductionMetadataGate({
    ...baseInput,
    edition: 'Second Edition',
    isNewEdition: true,
    existingAssignments: [
      {
        isbn: baseInput.proposedIsbn,
        bowkerPrefixOrBlock: '978-1-961475',
        status: 'ASSIGNED',
        titleId: baseInput.titleId,
        edition: 'First Edition',
        format: baseInput.format,
        imprint: baseInput.imprint,
      },
    ],
  })

  assert.equal(decision.gate, 'ISBN_ASSIGNMENT_BLOCKED')
  assert.deepEqual(decision.blockers, ['NEW_EDITION_REUSES_PRIOR_EDITION_ISBN'])
})

test('test, synthetic, duplicate, and abandoned products cannot consume ISBNs', () => {
  const decision = evaluateProductionMetadataGate({
    ...baseInput,
    publicationStatus: 'SYNTHETIC',
    duplicateCanonicalTitleRecords: 1,
  })

  assert.equal(decision.gate, 'ISBN_ASSIGNMENT_BLOCKED')
  assert.equal(decision.blockers.includes('SYNTHETIC_OR_TEST_TITLE'), true)
  assert.equal(decision.blockers.includes('DUPLICATE_CANONICAL_TITLE_RECORDS'), true)
})

test('one ISBN is required per distributed format', () => {
  assert.equal(requiresIsbnForFormat('PAPERBACK'), true)
  assert.equal(requiresIsbnForFormat('HARDCOVER'), true)
  assert.equal(requiresIsbnForFormat('EPUB'), true)
  assert.equal(requiresIsbnForFormat('LARGE_PRINT_PAPERBACK'), true)
  assert.equal(requiresIsbnForFormat('LARGE_PRINT_HARDCOVER'), true)
  assert.equal(requiresIsbnForFormat('AUDIOBOOK'), true)
})
