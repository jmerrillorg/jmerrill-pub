import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const root = new URL('../', import.meta.url)
const books = JSON.parse(await readFile(new URL('data/books.json', root), 'utf8'))
const authorPageSource = await readFile(new URL('app/authors/[slug]/page.tsx', root), 'utf8')
const bookPageSource = await readFile(new URL('app/books/[id]/page.tsx', root), 'utf8')
const authorsIndexSource = await readFile(new URL('app/authors/page.tsx', root), 'utf8')
const homeSource = await readFile(new URL('components/home/ModularHomePage.tsx', root), 'utf8')
const catalogSource = await readFile(new URL('lib/server/dataverse/catalog.ts', root), 'utf8')

const {
  enhancedAuthorExperiences,
  featuredAuthorExperiences,
  getCurrentFeaturedAuthorExperience,
  getEnhancedAuthorExperience,
  getFeaturedAuthorRuntimeState,
  authorExperienceContentRequired,
  resolveFeaturedAuthorTitle,
  enhancedAuthorAuthorityIsValid,
} = await import('../data/author-experience.ts')

const kimberlyAuthor = {
  contactId: '',
  slug: 'kimberly-reeder',
  name: 'Kimberly Reeder',
  shortBio: 'J Merrill Publishing author family.',
  photoUrl: '',
  titleCount: 1,
  genres: ['General Interest'],
  imprints: ['J Merrill Publishing'],
}

const girlDidYouKnow = {
  id: 'girl-did-you-know',
  slug: 'girl-did-you-know',
  title: 'Girl, Did You Know...?',
  subtitle: '',
  authorDisplayName: 'Kimberly Reeder',
  authors: [{ contactId: '', slug: 'kimberly-reeder', name: 'Kimberly Reeder', role: 'Author', primary: true }],
  certifiedImprint: 'J Merrill Publishing',
  genre: 'General Interest',
  publicationStatus: 'Published',
  releaseDate: '',
  displayYear: '2026',
  formats: ['Paperback', 'eBook'],
  primaryIsbn: '978-1-961475-74-8',
  isbnByFormat: [],
  coverUrl: '',
  shortDescription: '',
  purchaseLinks: [],
  marketplaceStatus: '',
}

test('Kimberly enhanced author experience is configured without creating a parallel route', () => {
  const experience = getEnhancedAuthorExperience('kimberly-reeder')
  assert.ok(experience)
  assert.equal(experience.model, 'ENHANCED_AUTHOR_PAGE')
  assert.equal(experience.featuredTitleSlug, 'girl-did-you-know')
  assert.equal(enhancedAuthorExperiences.length, 1)
  assert.match(authorPageSource, /getEnhancedAuthorExperience\(author\.slug\)/)
  assert.match(authorPageSource, /<EnhancedAuthorProfile/)
  assert.doesNotMatch(authorPageSource, /if \(slug === ['"]kimberly-reeder['"]\)/)
})

test('featured book route uses the canonical dynamic params and repository fallback model', () => {
  assert.match(bookPageSource, /type Props = \{ params: Promise<\{ id: string \}> \}/)
  assert.match(bookPageSource, /const \{ id \} = await params/)
  assert.doesNotMatch(bookPageSource, /params\.id/)
  assert.match(catalogSource, /resolveRepositoryPublicCatalogTitleBySlug\(slug\)/)
  assert.match(catalogSource, /export function resolveRepositoryPublicCatalogTitleBySlug/)
})

test('Featured Author November 2026 configuration references governed author and title authority', () => {
  const featured = featuredAuthorExperiences.find((item) => item.slug === 'kimberly-reeder')
  assert.ok(featured)
  assert.equal(featured.authorName, 'Kimberly Reeder')
  assert.equal(featured.featuredTitleSlug, 'girl-did-you-know')
  assert.equal(featured.effectiveFrom, '2026-11-01')
  assert.equal(featured.effectiveThrough, '2026-11-30')
  assert.equal(featured.status, 'SCHEDULED')

  const governedBook = books.find((book) => book.id === featured.featuredTitleSlug)
  assert.ok(governedBook)
  assert.equal(governedBook.author, 'Kimberly Reeder')
  assert.equal(governedBook.id, 'girl-did-you-know')
  assert.equal(enhancedAuthorAuthorityIsValid(getEnhancedAuthorExperience('kimberly-reeder'), [kimberlyAuthor], [girlDidYouKnow]), true)
})

test('Featured Author status is time bounded without changing the system clock', () => {
  const featured = featuredAuthorExperiences[0]
  assert.equal(getFeaturedAuthorRuntimeState(featured, '2026-10-31'), 'PRE_NOVEMBER')
  assert.equal(getFeaturedAuthorRuntimeState(featured, '2026-11-01'), 'ACTIVE')
  assert.equal(getFeaturedAuthorRuntimeState(featured, '2026-11-30'), 'ACTIVE')
  assert.equal(getFeaturedAuthorRuntimeState(featured, '2026-12-01'), 'POST_NOVEMBER')

  assert.equal(getCurrentFeaturedAuthorExperience('2026-10-31'), null)
  assert.equal(getCurrentFeaturedAuthorExperience('2026-11-15')?.slug, 'kimberly-reeder')
  assert.equal(getCurrentFeaturedAuthorExperience('2026-12-01'), null)
})

test('Featured Author surfaces are reusable and date-gated', () => {
  assert.match(homeSource, /getCurrentFeaturedAuthorExperience\(\)/)
  assert.match(homeSource, /<FeaturedAuthorPromotion/)
  assert.match(authorsIndexSource, /getCurrentFeaturedAuthorExperience\(\)/)
  assert.match(authorsIndexSource, /<FeaturedAuthorPromotion/)
})

test('missing optional enhanced content is governed instead of invented', () => {
  const required = authorExperienceContentRequired(getEnhancedAuthorExperience('kimberly-reeder'))
  assert.ok(required.includes('Approved Kimberly Reeder author photograph'))
  assert.ok(required.includes('Approved expanded Kimberly Reeder biography'))
  assert.ok(required.includes('Approved social, website, or contact destinations, if public'))
})

test('standard author pages remain outside the enhanced model', () => {
  assert.equal(getEnhancedAuthorExperience('dennis-brown'), null)
  assert.equal(getEnhancedAuthorExperience('daphanny-baker'), null)
})

test('featured title resolver requires a matching governed catalog title', () => {
  const experience = getEnhancedAuthorExperience('kimberly-reeder')
  assert.equal(resolveFeaturedAuthorTitle(experience, [girlDidYouKnow])?.slug, 'girl-did-you-know')
  assert.equal(resolveFeaturedAuthorTitle(experience, [{ ...girlDidYouKnow, slug: 'other-title', id: 'other-title' }]), null)
})
