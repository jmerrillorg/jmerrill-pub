import assert from 'node:assert/strict'
import { existsSync, readFileSync, symlinkSync, unlinkSync } from 'node:fs'
import test, { after } from 'node:test'

const shims = [
  ['../lib/catalog/public-projection', 'public-projection.ts'],
  ['../lib/catalog/types', 'types.ts'],
  ['../lib/publishing/lifecycle/validation', 'validation.ts'],
  ['../lib/publishing/lifecycle/registry', 'registry.ts'],
]
const created = []
for (const [shimPath, target] of shims) {
  const shim = new URL(shimPath, import.meta.url)
  if (!existsSync(shim)) {
    symlinkSync(target, shim)
    created.push(shim)
  }
}
after(() => {
  for (const shim of created) unlinkSync(shim)
})

const projection = await import('../lib/catalog/public-projection.ts')
const validation = await import('../lib/publishing/lifecycle/validation.ts')

function title(overrides = {}) {
  return {
    id: overrides.id || 'title-1',
    slug: overrides.slug || 'public-title',
    title: overrides.title || 'Public Title',
    subtitle: overrides.subtitle || '',
    authorDisplayName: overrides.authorDisplayName ?? 'Public Author',
    authors: overrides.authors ?? [
      {
        contactId: 'contact-1',
        slug: 'public-author',
        name: 'Public Author',
        role: 'Author',
        primary: true,
      },
    ],
    certifiedImprint: 'J Merrill Publishing',
    genre: 'General Interest',
    publicationStatus: 'Published',
    releaseDate: '2026-08-27',
    displayYear: '2026',
    formats: overrides.formats ?? ['Paperback', 'eBook'],
    primaryIsbn: overrides.primaryIsbn ?? '9781961475000',
    isbnByFormat: overrides.isbnByFormat ?? [
      { format: 'Paperback', isbn: '9781961475000', assetId: 'asset-1', assetStatus: 'Live' },
    ],
    coverUrl: overrides.coverUrl ?? 'https://example.com/cover.jpg',
    shortDescription: overrides.shortDescription ?? 'Public catalog description.',
    purchaseLinks: overrides.purchaseLinks ?? [
      { retailer: 'Amazon', label: 'Amazon', href: 'https://example.com/listing', marketplaceStatus: 'Live' },
    ],
    marketplaceStatus: 'Live',
    ...overrides,
  }
}

test('public catalog projection uses Dataverse records as the website authority boundary', () => {
  assert.equal(projection.PUBLIC_CATALOG_AUTHORITY.sourceOfTruth, 'Dataverse jm1pub_title + publishing assets + marketplace records')
  assert.match(projection.PUBLIC_CATALOG_AUTHORITY.retailerBoundary, /verification evidence only/)
})

test('public page URLs follow canonical author and title routes', () => {
  assert.deepEqual(projection.publicCatalogPageUrls(title()), {
    titlePage: 'https://jmerrill.pub/books/public-title',
    authorPages: ['https://jmerrill.pub/authors/public-author'],
  })
})

test('complete public title is ready for page verification', () => {
  const result = projection.evaluatePublicCatalogReadiness(title())
  assert.equal(result.status, 'READY')
  assert.deepEqual(result.issues, [])
})

test('title cannot verify live without a JMP-controlled title page', () => {
  const result = projection.evaluateTitleLiveAndVerifiedPublicGate({
    title: title(),
    distributionConfirmedLive: true,
    retailerLiveEvidence: true,
    jmpTitlePageReachable: false,
    jmpAuthorPagesReachable: true,
  })
  assert.equal(result.ok, false)
  assert.equal(result.code, 'JMP_PUBLIC_TITLE_PAGE_MISSING')
})

test('retailer evidence alone cannot close TITLE_LIVE_AND_VERIFIED', () => {
  const result = projection.evaluateTitleLiveAndVerifiedPublicGate({
    title: title(),
    distributionConfirmedLive: false,
    retailerLiveEvidence: true,
    jmpTitlePageReachable: true,
    jmpAuthorPagesReachable: true,
  })
  assert.equal(result.ok, false)
  assert.equal(result.code, 'DISTRIBUTION_LIVE_EVIDENCE_MISSING')
})

test('author page is required when public author identity exposes a profile', () => {
  const result = projection.evaluateTitleLiveAndVerifiedPublicGate({
    title: title(),
    distributionConfirmedLive: true,
    jmpTitlePageReachable: true,
    jmpAuthorPagesReachable: false,
  })
  assert.equal(result.ok, false)
  assert.equal(result.code, 'JMP_PUBLIC_AUTHOR_PAGE_MISSING')
})

test('anonymous or hidden public attribution can avoid author page requirement', () => {
  const result = projection.evaluateTitleLiveAndVerifiedPublicGate({
    title: title({ authorDisplayName: 'Anonymous', authors: [] }),
    distributionConfirmedLive: true,
    jmpTitlePageReachable: true,
    jmpAuthorPagesReachable: false,
  })
  assert.equal(result.ok, true)
})

test('anonymous public attribution is ready without a public author page', () => {
  const result = projection.evaluatePublicCatalogReadiness(title({
    authorDisplayName: 'Anonymous',
    authors: [],
  }))
  assert.equal(result.status, 'READY')
  assert.deepEqual(result.issues, [])
})

test('missing slug, format, ISBN, and author attribution are held for repair', () => {
  const result = projection.evaluatePublicCatalogReadiness(title({
    slug: '',
    authorDisplayName: '',
    authors: [],
    formats: [],
    primaryIsbn: '',
    isbnByFormat: [],
  }))
  assert.equal(result.status, 'HOLD')
  assert.deepEqual(result.issues, [
    'MISSING_TITLE_SLUG',
    'MISSING_AUTHOR_ATTRIBUTION',
  ])
  assert.deepEqual(result.warnings, ['MISSING_FORMAT', 'MISSING_ISBN'])
})

test('missing ISBN is metadata repair evidence but does not block public page verification', () => {
  const result = projection.evaluatePublicCatalogReadiness(title({
    primaryIsbn: '',
    isbnByFormat: [],
  }))
  assert.equal(result.status, 'READY')
  assert.deepEqual(result.issues, [])
  assert.deepEqual(result.warnings, ['MISSING_ISBN'])
})

test('duplicate title and author slugs are surfaced as public projection holds', () => {
  const result = projection.evaluatePublicCatalogReadiness(
    title({ slug: 'duplicate-title', authors: [{ contactId: 'a', slug: 'duplicate-author', name: 'A', role: 'Author', primary: true }] }),
    new Set(['duplicate-title']),
    new Set(['duplicate-author']),
  )
  assert.equal(result.status, 'HOLD')
  assert.ok(result.issues.includes('DUPLICATE_TITLE_SLUG'))
  assert.ok(result.issues.includes('DUPLICATE_AUTHOR_SLUG'))
})

test('public title projection disambiguates duplicate slugs with stable title identity', () => {
  const titles = projection.projectPublicCatalogTitles([
    title({ id: 'fec27b7a-cc7a-f111-ab0f-6045bdd69435', slug: 'warrior-s-breed', title: "Warrior's Breed" }),
    title({ id: '935f72d0-c27a-f111-ab0f-6045bdd69738', slug: 'warrior-s-breed', title: "Warrior's Breed" }),
  ])
  assert.deepEqual(
    titles.map((item) => [item.id, item.slug]),
    [
      ['935f72d0-c27a-f111-ab0f-6045bdd69738', 'warrior-s-breed'],
      ['fec27b7a-cc7a-f111-ab0f-6045bdd69435', 'warrior-s-breed-fec27b7a'],
    ],
  )
})

test('projection summary reconciles totals after canonical slug projection', () => {
  const titles = [
    title({ id: '1', slug: 'alpha', title: 'Alpha' }),
    title({ id: '2', slug: 'alpha', title: 'Alpha Duplicate' }),
    title({ id: '3', slug: '', title: 'Missing Slug' }),
  ]
  const summary = projection.buildPublicCatalogProjectionSummary(projection.projectPublicCatalogTitles(titles), [
    { contactId: 'a', slug: 'public-author', name: 'Public Author', shortBio: '', photoUrl: '', titleCount: 2, genres: [], imprints: [] },
    { contactId: 'b', slug: 'public-author', name: 'Public Author B', shortBio: '', photoUrl: '', titleCount: 1, genres: [], imprints: [] },
  ])
  assert.equal(summary.totalTitles, 3)
  assert.equal(summary.totalAuthors, 2)
  assert.deepEqual(summary.duplicateTitleSlugs, [])
  assert.deepEqual(summary.duplicateAuthorSlugs, ['public-author'])
  assert.equal(summary.titlesOnHold, 3)
  assert.equal(summary.titlesWithMetadataWarnings, 0)
})

test('projection ordering is deterministic by author then title', () => {
  const ordered = projection.projectPublicCatalogTitles([
    title({ id: 'b', title: 'Beta', authorDisplayName: 'Z Author' }),
    title({ id: 'a', title: 'Alpha', authorDisplayName: 'A Author' }),
  ])
  assert.deepEqual(ordered.map((item) => item.id), ['a', 'b'])
})

test('lifecycle transition to post-publication requires public catalog projection artifact', () => {
  const missing = validation.validateTransition({
    fromStage: 'DISTRIBUTION_RELEASE',
    fromSubstage: 'LAUNCH_RELEASE',
    toStage: 'POST_PUBLICATION',
    toSubstage: 'POST_PUBLICATION_STEWARDSHIP',
    artifacts: [],
  })
  assert.equal(missing.ok, false)
  assert.equal(missing.code, 'JMP_PUBLIC_TITLE_PAGE_MISSING')

  const present = validation.validateTransition({
    fromStage: 'DISTRIBUTION_RELEASE',
    fromSubstage: 'LAUNCH_RELEASE',
    toStage: 'POST_PUBLICATION',
    toSubstage: 'POST_PUBLICATION_STEWARDSHIP',
    artifacts: [
      {
        artifactId: 'public-catalog-projection-1',
        artifactType: 'PUBLIC_CATALOG_PROJECTION',
        checksum: 'sha-public',
        certificationState: 'CERTIFIED',
      },
    ],
  })
  assert.equal(present.ok, true)
})

test('public API exposes a sanitized projection route', () => {
  const route = readFileSync('app/api/public-catalog/route.ts', 'utf8')
  assert.match(route, /authority/)
  assert.match(route, /pageReadiness/)
  assert.doesNotMatch(route, /clientSecret|tenantId|DATAVERSE_CLIENT_SECRET|legalAuthorName/)
})

test('runtime pages do not import the legacy static books catalog', () => {
  const sourceGuard = readFileSync('scripts/check-catalog-runtime-source.mjs', 'utf8')
  assert.match(sourceGuard, /Do not add runtime imports of data\/books\.json/)
})

test('title and author pages emit JSON-LD from projected catalog data', () => {
  const titlePage = readFileSync('app/books/[id]/page.tsx', 'utf8')
  const authorPage = readFileSync('app/authors/[slug]/page.tsx', 'utf8')
  assert.match(titlePage, /application\/ld\+json/)
  assert.match(titlePage, /'@type': 'Book'/)
  assert.match(authorPage, /application\/ld\+json/)
  assert.match(authorPage, /'@type': 'Person'/)
})

test('title detail lookup reads the projected catalog before matching slugs', () => {
  const source = readFileSync('lib/server/dataverse/catalog.ts', 'utf8')
  assert.match(source, /projectPublicCatalogTitles\(titleRows\.map/)
  assert.doesNotMatch(source, /jm1pub_slug eq '\\$\\{safeSlug\\}'/)
})

test('sitemap is runtime-driven so public catalog URLs come from production Dataverse', () => {
  const sitemap = readFileSync('app/sitemap.ts', 'utf8')
  assert.match(sitemap, /export const dynamic = 'force-dynamic'/)
  assert.match(sitemap, /listPublicCatalogTitles\(\)/)
  assert.match(sitemap, /listPublicAuthors\(\)/)
})
