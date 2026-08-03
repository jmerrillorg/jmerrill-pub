import assert from 'node:assert/strict'
import { test } from 'node:test'

import {
  JMP_VELLUM_TEMPLATE_CLASSIFICATION,
  validateVellumAssemblyPreflight,
} from '../lib/server/vellum-title-template-governance.ts'

const baseDecision = {
  titleId: 'e797232b-da7a-f111-ab0f-00224820105b',
  intakeReference: 'JMP-INT-202607-0W5PTQ',
  contractPackage: 'Professional Publishing Package',
  approvedFormats: ['PAPERBACK', 'EBOOK'],
  formatStatus: 'CONTRACTED',
  isbnByFormat: {},
  isbnAssignmentStatus: 'NOT_REQUIRED_FOR_AUTHOR_REVIEW',
  trimSize: '6 x 9 in',
  imprint: 'J Merrill Publishing',
  edition: 'First Edition',
}

test('vellum master is internal production source and not author-facing', () => {
  assert.equal(JMP_VELLUM_TEMPLATE_CLASSIFICATION.purpose, 'JMP INTERNAL TITLE-ASSEMBLY SOURCE')
  assert.equal(JMP_VELLUM_TEMPLATE_CLASSIFICATION.productionPlatform, 'VELLUM')
  assert.equal(JMP_VELLUM_TEMPLATE_CLASSIFICATION.authorFacing, false)
  assert.equal(JMP_VELLUM_TEMPLATE_CLASSIFICATION.distributionReady, false)
})

test('author-review preflight allows pending ISBN while blocking unused format labels', () => {
  const clean = validateVellumAssemblyPreflight({
    correctVellumMaster: true,
    titleMetadataComplete: true,
    manuscriptBound: true,
    titleFormatDecision: baseDecision,
    renderedIsbnFields: ['PAPERBACK', 'EBOOK'],
    selectedDisclaimerCount: 1,
    sampleContentRemaining: 0,
    placeholderContentRemaining: 0,
    unusedOptionalSectionsRemaining: 0,
    tocSourceHeadingsValid: true,
    frontMatterComplete: true,
    backMatterComplete: true,
    internalGuidanceExposed: 0,
  })
  assert.equal(clean.ok, true)

  const blocked = validateVellumAssemblyPreflight({
    ...cleanInput(),
    renderedIsbnFields: ['PAPERBACK', 'HARDCOVER'],
  })
  assert.equal(blocked.ok, false)
  assert.match(blocked.blockers.join('\n'), /UNUSED_FORMAT_METADATA_PRESENT:HARDCOVER/)
})

test('preflight fails closed when template placeholders or internal guidance remain', () => {
  const result = validateVellumAssemblyPreflight({
    ...cleanInput(),
    sampleContentRemaining: 1,
    placeholderContentRemaining: 1,
    internalGuidanceExposed: 1,
  })
  assert.equal(result.ok, false)
  assert.match(result.blockers.join('\n'), /SAMPLE_CONTENT_PRESENT/)
  assert.match(result.blockers.join('\n'), /UNRESOLVED_TEMPLATE_PLACEHOLDER/)
  assert.match(result.blockers.join('\n'), /INTERNAL_TEMPLATE_GUIDANCE_EXPOSED/)
})

function cleanInput() {
  return {
    correctVellumMaster: true,
    titleMetadataComplete: true,
    manuscriptBound: true,
    titleFormatDecision: baseDecision,
    renderedIsbnFields: ['PAPERBACK', 'EBOOK'],
    selectedDisclaimerCount: 1,
    sampleContentRemaining: 0,
    placeholderContentRemaining: 0,
    unusedOptionalSectionsRemaining: 0,
    tocSourceHeadingsValid: true,
    frontMatterComplete: true,
    backMatterComplete: true,
    internalGuidanceExposed: 0,
  }
}
