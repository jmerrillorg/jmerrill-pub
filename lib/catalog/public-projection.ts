import type {
  CatalogAuthorSummary,
  CatalogFormat,
  CatalogTitleSummary,
  PublicCatalogPageUrls,
  PublicCatalogProjectionSummary,
  PublicCatalogReadiness,
  PublicCatalogReadinessIssue,
} from './types'
import { getHagherBacklistContent, hagherAuthor } from '../../data/hagher-backlist-content'
import { getPublicBacklistContent } from '../../data/public-backlist-content'
import { bookRetailerEnrichmentOverrides } from '../../data/book-retailer-enrichment-overrides'

export const PUBLIC_CATALOG_AUTHORITY = {
  sourceOfTruth: 'Dataverse jm1pub_title + publishing assets + marketplace records',
  publicWebsite: 'https://jmerrill.pub',
  titlePath: '/books/',
  authorPath: '/authors/',
  retailerBoundary: 'Retailer/Amazon data is verification evidence only and never the JMP public catalog authority.',
  lifecycleLiveGate:
    'TITLE_LIVE_AND_VERIFIED requires a JMP-controlled title page plus required author page projection before Block 09 title management can treat the title as live.',
} as const

export type PublicCatalogLifecycleGateInput = {
  title: CatalogTitleSummary
  distributionConfirmedLive: boolean
  jmpTitlePageReachable: boolean
  jmpAuthorPagesReachable?: boolean
  retailerLiveEvidence?: boolean
}

export function publicCatalogPageUrls(
  title: Pick<CatalogTitleSummary, 'slug' | 'id' | 'authors'>,
  baseUrl = PUBLIC_CATALOG_AUTHORITY.publicWebsite,
): PublicCatalogPageUrls {
  const cleanBase = baseUrl.replace(/\/+$/, '')
  const titleSlug = title.slug || title.id
  return {
    titlePage: titleSlug ? `${cleanBase}${PUBLIC_CATALOG_AUTHORITY.titlePath}${encodeURIComponent(titleSlug)}` : '',
    authorPages: title.authors
      .map((author) => author.slug)
      .filter(Boolean)
      .map((slug) => `${cleanBase}${PUBLIC_CATALOG_AUTHORITY.authorPath}${encodeURIComponent(slug)}`),
  }
}

export function evaluatePublicCatalogReadiness(
  title: CatalogTitleSummary,
  duplicateTitleSlugs: Set<string> = new Set(),
  duplicateAuthorSlugs: Set<string> = new Set(),
): PublicCatalogReadiness {
  const issues: PublicCatalogReadinessIssue[] = []
  const warnings: PublicCatalogReadinessIssue[] = []
  if (!title.title) issues.push('MISSING_TITLE')
  if (!title.slug) issues.push('MISSING_TITLE_SLUG')
  if (!title.authorDisplayName) issues.push('MISSING_AUTHOR_ATTRIBUTION')
  if (title.authorDisplayName && !title.authors.length && requiresPublicAuthorPage(title.authorDisplayName)) {
    issues.push('MISSING_AUTHOR_PAGE')
  }
  if (!title.formats.length) warnings.push('MISSING_FORMAT')
  if (!title.isbnByFormat.length && !title.primaryIsbn) warnings.push('MISSING_ISBN')
  if (title.slug && duplicateTitleSlugs.has(normalizeKey(title.slug))) issues.push('DUPLICATE_TITLE_SLUG')
  for (const author of title.authors) {
    if (author.slug && duplicateAuthorSlugs.has(normalizeKey(author.slug))) {
      issues.push('DUPLICATE_AUTHOR_SLUG')
      break
    }
  }

  return {
    status: issues.length ? 'HOLD' : 'READY',
    issues: Array.from(new Set(issues)),
    warnings: Array.from(new Set(warnings)),
    pageUrls: publicCatalogPageUrls(title),
  }
}

// Campaign quality is independent of lifecycle eligibility and catalog visibility.
export function evaluateCampaignDestinationReadiness(title: CatalogTitleSummary) {
  const missing: PublicCatalogReadinessIssue[] = [...evaluatePublicCatalogReadiness(title).issues]
  if (!title.coverUrl || /placeholder|placehold\.co/i.test(title.coverUrl)) missing.push('MISSING_COVER')
  if (!title.shortDescription?.trim() || /^(description coming soon|coming soon|j merrill publishing author family)[.!]?$/i.test(title.shortDescription.trim()) || / is listed in the J Merrill Publishing public catalog\.$/i.test(title.shortDescription.trim())) missing.push('MISSING_DESCRIPTION')
  if (!title.primaryIsbn && !title.isbnByFormat.length) missing.push('MISSING_ISBN')
  if (title.isbnByFormat.some(item => item.format === 'Other')) missing.push('UNVERIFIED_EDITION_FORMAT')
  return { status: missing.length ? 'HOLD' as const : 'READY' as const, missing }
}

export function buildPublicCatalogProjectionSummary(
  titles: CatalogTitleSummary[],
  authors: CatalogAuthorSummary[],
): PublicCatalogProjectionSummary {
  const duplicateTitleSlugs = findDuplicates(titles.map((title) => title.slug))
  const duplicateAuthorSlugs = findDuplicates(authors.map((author) => author.slug))
  const duplicateTitleSet = new Set(duplicateTitleSlugs.map(normalizeKey))
  const duplicateAuthorSet = new Set(duplicateAuthorSlugs.map(normalizeKey))
  const readiness = titles.map((title) => evaluatePublicCatalogReadiness(title, duplicateTitleSet, duplicateAuthorSet))

  return {
    totalTitles: titles.length,
    totalAuthors: authors.length,
    duplicateTitleSlugs,
    duplicateAuthorSlugs,
    titlesReadyForPublicVerification: readiness.filter((item) => item.status === 'READY').length,
    titlesOnHold: readiness.filter((item) => item.status === 'HOLD').length,
    titlesWithMetadataWarnings: readiness.filter((item) => item.warnings.length).length,
  }
}

// Default public catalog order: canonical release date (jm1pub_releasedate,
// exposed on CatalogTitleSummary.releaseDate) descending, newest first —
// never createdon/modifiedon or any other administrative timestamp. Titles
// with no release date on record sort after every dated title. Ties (same
// release date, or both undated) break by title A-Z, then id for full
// determinism.
export function projectPublicCatalogTitles(titles: CatalogTitleSummary[]): CatalogTitleSummary[] {
  const presented = titles.map((title) => {
    const content = getHagherBacklistContent(title.slug, title.id)
    if (!content) {
      const backlist = getPublicBacklistContent(title)
      const prior = bookRetailerEnrichmentOverrides[title.slug]
      // Reuse existing verified presentation copy; never elevate retailer dates,
      // formats, or search links into canonical edition/distribution authority.
      const shortDescription = backlist?.shortDescription || title.shortDescription || (prior?.retailerMatchStatus === 'verified' ? prior.retailerDescription : '') || ''
      const isbnByFormat = title.isbnByFormat.map(item => ({ ...item, format: (backlist?.editionFormats?.[item.isbn] || item.format) as CatalogFormat }))
      return { ...title, coverUrl: backlist?.coverUrl || title.coverUrl, shortDescription, isbnByFormat, formats: isbnByFormat.length ? Array.from(new Set(isbnByFormat.map(item => item.format))).filter(Boolean) : title.formats }
    }
    return {
      ...title, coverUrl: content.coverUrl, shortDescription: content.shortDescription,
      genre: content.genre, releaseDate: content.releaseDate,
      displayYear: content.releaseDate.slice(0, 4), certifiedImprint: 'JM Signature',
      formats: ['Paperback', 'Hardcover', 'eBook'] as CatalogTitleSummary['formats'],
      primaryIsbn: content.isbns.Paperback,
      isbnByFormat: Object.entries(content.isbns).map(([format, isbn]) => ({
        format: format as CatalogTitleSummary['formats'][number], isbn, assetId: '', assetStatus: 'Published metadata',
      })),
      authors: title.authors.map((author) => author.slug === hagherAuthor.slug
        ? { ...author, contactId: hagherAuthor.contactId } : author),
    }
  })
  return disambiguatePublicTitleSlugs(presented).sort((a, b) => {
    const dateCompare = compareReleaseDateDescending(a.releaseDate, b.releaseDate)
    if (dateCompare !== 0) return dateCompare
    const title = a.title.localeCompare(b.title)
    if (title !== 0) return title
    return a.id.localeCompare(b.id)
  })
}

function compareReleaseDateDescending(a: string, b: string): number {
  const aHas = Boolean(a)
  const bHas = Boolean(b)
  if (aHas && bHas) return b.localeCompare(a) // ISO YYYY-MM-DD strings sort correctly lexicographically
  if (aHas && !bHas) return -1 // dated titles before undated
  if (!aHas && bHas) return 1
  return 0 // both undated — fall through to title tiebreak
}

export function disambiguatePublicTitleSlugs(titles: CatalogTitleSummary[]): CatalogTitleSummary[] {
  const groups = new Map<string, CatalogTitleSummary[]>()

  for (const title of titles) {
    const key = normalizeKey(title.slug)
    if (!key) continue
    groups.set(key, [...(groups.get(key) || []), title])
  }

  const slugById = new Map<string, string>()
  const usedSlugs = new Set<string>()

  for (const group of Array.from(groups.values()).sort(compareSlugGroups)) {
    const ordered = [...group].sort(compareTitleIdentity)
    for (const [index, title] of ordered.entries()) {
      const baseSlug = title.slug
      const nextSlug = index === 0 ? reserveSlug(baseSlug, title.id, usedSlugs) : reserveDisambiguatedSlug(baseSlug, title.id, usedSlugs)
      slugById.set(title.id, nextSlug)
    }
  }

  return titles.map((title) => {
    const slug = slugById.get(title.id) || title.slug
    return slug === title.slug ? title : { ...title, slug }
  })
}

export function evaluateTitleLiveAndVerifiedPublicGate(input: PublicCatalogLifecycleGateInput): {
  ok: boolean
  code: 'TITLE_LIVE_AND_VERIFIED_PUBLIC_GATE_PASS' | 'JMP_PUBLIC_TITLE_PAGE_MISSING' | 'JMP_PUBLIC_AUTHOR_PAGE_MISSING' | 'DISTRIBUTION_LIVE_EVIDENCE_MISSING'
  reason: string
  pageUrls: PublicCatalogPageUrls
} {
  const pageUrls = publicCatalogPageUrls(input.title)
  if (!input.distributionConfirmedLive) {
    return {
      ok: false,
      code: 'DISTRIBUTION_LIVE_EVIDENCE_MISSING',
      reason: 'Retailer or distributor presence can support verification, but confirmed-live distribution evidence is required before public live closeout.',
      pageUrls,
    }
  }
  if (!input.jmpTitlePageReachable) {
    return {
      ok: false,
      code: 'JMP_PUBLIC_TITLE_PAGE_MISSING',
      reason: 'TITLE_LIVE_AND_VERIFIED cannot close without a JMP-controlled public title page.',
      pageUrls,
    }
  }
  if (input.title.authors.length > 0 && input.jmpAuthorPagesReachable === false) {
    return {
      ok: false,
      code: 'JMP_PUBLIC_AUTHOR_PAGE_MISSING',
      reason: 'TITLE_LIVE_AND_VERIFIED cannot close while a required public author page is missing.',
      pageUrls,
    }
  }
  return {
    ok: true,
    code: 'TITLE_LIVE_AND_VERIFIED_PUBLIC_GATE_PASS',
    reason: 'Distribution live evidence and JMP-controlled public title/author projection are present.',
    pageUrls,
  }
}

function findDuplicates(values: string[]) {
  const seen = new Set<string>()
  const duplicates = new Set<string>()
  for (const value of values) {
    const key = normalizeKey(value)
    if (!key) continue
    if (seen.has(key)) duplicates.add(value)
    seen.add(key)
  }
  return Array.from(duplicates).sort((a, b) => a.localeCompare(b))
}

function normalizeKey(value: string) {
  return value.trim().toLowerCase()
}

function requiresPublicAuthorPage(authorDisplayName: string) {
  const normalized = normalizeKey(authorDisplayName)
  return normalized !== 'anonymous' && normalized !== 'anonymous author'
}

function compareSlugGroups(a: CatalogTitleSummary[], b: CatalogTitleSummary[]) {
  return normalizeKey(a[0]?.slug || '').localeCompare(normalizeKey(b[0]?.slug || ''))
}

function compareTitleIdentity(a: CatalogTitleSummary, b: CatalogTitleSummary) {
  const byTitle = a.title.localeCompare(b.title)
  if (byTitle !== 0) return byTitle
  return a.id.localeCompare(b.id)
}

function reserveSlug(slug: string, id: string, usedSlugs: Set<string>) {
  if (!usedSlugs.has(normalizeKey(slug))) {
    usedSlugs.add(normalizeKey(slug))
    return slug
  }
  return reserveDisambiguatedSlug(slug, id, usedSlugs)
}

function reserveDisambiguatedSlug(slug: string, id: string, usedSlugs: Set<string>) {
  const cleanId = id.replace(/[^a-zA-Z0-9]/g, '').toLowerCase()
  const suffixes = [cleanId.slice(0, 8), cleanId.slice(0, 12), cleanId].filter(Boolean)

  for (const suffix of suffixes) {
    const candidate = `${slug}-${suffix}`
    const key = normalizeKey(candidate)
    if (!usedSlugs.has(key)) {
      usedSlugs.add(key)
      return candidate
    }
  }

  const fallback = `${slug}-${cleanId || normalizeKey(id)}`
  usedSlugs.add(normalizeKey(fallback))
  return fallback
}
