import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const catalogSource = readFileSync('lib/server/dataverse/catalog.ts', 'utf8')
const enrichmentSource = readFileSync('data/book-retailer-enrichment-overrides.ts', 'utf8')

function retailerCoverFor(slug) {
  const key = `'${slug}': {`
  const start = enrichmentSource.indexOf(key)
  if (start === -1) return ''
  const recordEnd = enrichmentSource.indexOf('\n  },', start + key.length)
  const block = enrichmentSource.slice(start, recordEnd === -1 ? undefined : recordEnd)
  const match = block.match(/retailerCoverUrl:\s*['"]([^'"]+)['"]/)
  return match?.[1] || ''
}

function projectedCoverUrl({ publisherCoverUrl = '', slug }) {
  const retailerCoverUrl = retailerCoverFor(slug).trim()
  return publisherCoverUrl.trim() || retailerCoverUrl || ''
}

const enrichedSlugs = [
  '365-days-of-transparency',
  '7-step-jumpstart-to-becoming-your-best-self',
  'a-blended-family',
  'department-of-the-air-force-mission-driven-leadership',
]

test('Dataverse catalog projection imports governed retailer enrichment source', () => {
  assert.match(
    catalogSource,
    /import\s+\{\s*bookRetailerEnrichmentOverrides\s*\}\s+from\s+['"]@\/data\/book-retailer-enrichment-overrides['"]/,
  )
})

test('Dataverse catalog projection uses canonical slug for retailer cover fallback', () => {
  assert.match(catalogSource, /const slug = stringField\(row, 'jm1pub_slug'\) \|\| slugify\(title\)/)
  assert.match(
    catalogSource,
    /bookRetailerEnrichmentOverrides\[slug\]\?\.retailerCoverUrl\?\.trim\(\) \|\| ''/,
  )
})

test('publisher-owned Dataverse cover wins over retailer cover', () => {
  assert.equal(
    projectedCoverUrl({
      publisherCoverUrl: 'https://assets.jmerrill.pub/covers/approved-cover.jpg',
      slug: '365-days-of-transparency',
    }),
    'https://assets.jmerrill.pub/covers/approved-cover.jpg',
  )
})

test('retailer cover is used when Dataverse cover is empty for representative titles', () => {
  for (const slug of enrichedSlugs) {
    const coverUrl = projectedCoverUrl({ slug })
    assert.match(coverUrl, /^https:\/\/images-us\.bookshop\.org\/ingram\//, slug)
  }
})

test('empty cover remains empty when neither Dataverse nor enrichment source has a cover', () => {
  assert.equal(projectedCoverUrl({ slug: '27-days-to-overcoming-depression' }), '')
  assert.equal(projectedCoverUrl({ slug: 'not-a-real-title-slug' }), '')
})

test('projection preserves existing final component fallback by returning empty string', () => {
  assert.match(catalogSource, /coverUrl: firstString\(assets, 'jm1pub_coverurl'\) \|\| retailerCoverUrl/)
  assert.doesNotMatch(catalogSource, /coverUrl:.*logo\.jpg/)
})
