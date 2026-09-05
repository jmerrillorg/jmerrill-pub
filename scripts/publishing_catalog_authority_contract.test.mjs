import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const root = new URL('../', import.meta.url)
const authoritySource = await readFile(new URL('lib/server/dataverse/catalog.ts', root), 'utf8')
const portfolioSource = await readFile(new URL('lib/server/catalog-portfolio.ts', root), 'utf8')
const validation = JSON.parse(
  await readFile(
    new URL(
      'JMP-PUBLISHING-CATALOG-CANONICAL-RECONCILIATION-2026-09-05/evidence/dataverse/catalog-promotion-validation.json',
      root,
    ),
    'utf8',
  ),
)
const replay = JSON.parse(
  await readFile(
    new URL(
      'JMP-PUBLISHING-CATALOG-CANONICAL-RECONCILIATION-2026-09-05/evidence/dataverse/catalog-promotion-dry-run.json',
      root,
    ),
    'utf8',
  ),
)

const requiredFields = [
  'CanonicalWorkId',
  'CanonicalAuthorId',
  'Title',
  'AuthorDisplayName',
  'CurrentLifecycleState',
  'PublicationDate',
  'ReleaseDate',
  'ActiveState',
  'MarketingAuthorityState',
  'CurrentEditionId',
  'AvailableFormats',
  'PrimaryCoverAsset',
  'PurchaseCTA',
  'FeaturedAuthorEligibility',
  'MarketingHealthEligibility',
  'RetirementState',
  'RightsHoldState',
]

test('Publishing exposes the complete governed Marketing authority contract', () => {
  const implementation = authoritySource.slice(
    authoritySource.indexOf('export async function listPublishingMarketingAuthority'),
    authoritySource.indexOf('function buildAuthorSummaries'),
  )

  for (const field of requiredFields) assert.match(implementation, new RegExp(`\\b${field}:`))
  assert.match(implementation, /CANONICAL_PUBLISHING_WORK/)
  assert.match(authoritySource, /CATALOG_AUTHORITY_CORRELATION_ID = 'JMP-CATALOG-CANONICAL-20260905'/)
  assert.doesNotMatch(implementation, /jm1pub_(?:rawstatus|rawhouse|rawcontract|rawisdistributed)/)
})

test('operating classification prefers explicit canonical authority', () => {
  const canonicalBranch = portfolioSource.slice(
    portfolioSource.indexOf('if (canonicalWorkKey)'),
    portfolioSource.indexOf("normalizedStage.includes('archive')"),
  )

  assert.match(canonicalBranch, /ACTIVE_LAUNCH_LIFECYCLE/)
  assert.match(canonicalBranch, /RIGHTS_REVERTED/)
  assert.match(canonicalBranch, /marketingAuthorityState === 'UNRESOLVED'/)
})

test('promotion evidence proves the canonical population and idempotent replay', () => {
  assert.equal(validation.status, 'PASS')
  assert.deepEqual(validation.counts, { titles: 129, editions: 133, products: 300, reservedIsbns: 111 })
  assert.ok(Object.values(validation.checks).every(Boolean))
  assert.equal(replay.counts.creates, 0)
  assert.equal(replay.counts.updates, 0)
  assert.equal(replay.counts.deletes, 0)
  assert.equal(replay.counts.noOps, 692)
})
