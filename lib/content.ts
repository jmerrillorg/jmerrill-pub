import rawBooks from '@/data/books.json'
import { authorOverrides } from '@/data/authors'
import { authorNameToMasterName } from '@/data/author-name-to-master-name'
import { bookContributorOverrides } from '@/data/book-contributor-overrides'
import { bookPurchaseLinkOverrides, type BookPurchaseLinks } from '@/data/book-purchase-link-overrides'
import { bookRetailerEnrichmentOverrides } from '@/data/book-retailer-enrichment-overrides'
import { bookSeriesOverrides } from '@/data/book-series-overrides'
import { serviceCategories, comingSoonServices } from '@/data/service-categories'
import { titleAuthorOverrides } from '@/data/title-author-overrides'
import { packages } from '@/lib/tokens'

type RawBook = (typeof rawBooks)[number]

export type BookFormat = 'Paperback' | 'Hardcover' | 'eBook' | 'Audiobook'

export type PurchaseLinkKey = 'amazon' | 'publisher' | 'barnesAndNoble' | 'appleBooks'
export type RetailerMatchStatus = 'verified' | 'manual_review' | 'fallback_only'
export type AmazonLinkType = 'search_fallback' | 'verified_pdp'

export type PurchaseLink = {
  retailer: PurchaseLinkKey
  label: string
  href: string
}

export type BookContributor = {
  name: string
  slug: string | null
  hasProfile: boolean
}

export type BookRecord = {
  id: string
  slug: string
  title: string
  subtitle: string
  retailerTitle: string
  series: string
  seriesOrder: number | null
  authorName: string
  authorSlug: string | null
  contributors: BookContributor[]
  genre: string
  imprint: string
  year: number | null
  displayYear: string
  releaseDate: string
  releaseDateDisplay: string
  formats: BookFormat[]
  primaryFormat: BookFormat
  isbn: string
  asin: string
  publisherCoverUrl: string
  retailerCoverUrl: string
  coverUrl: string
  publisherDescription: string
  retailerDescription: string
  shortDescription: string
  longDescription: string
  publisherAuthorBio: string
  retailerAuthorBio: string
  authorBio: string
  authorPhoto: string
  purchaseLinks: BookPurchaseLinks
  availablePurchaseLinks: PurchaseLink[]
  retailerMatchStatus: RetailerMatchStatus | ''
  amazonLinkType: AmazonLinkType | ''
  retailerLastVerifiedAt: string
  excerpt: string
  quotes: Array<{ quote: string; attribution: string }>
  keywords: string[]
  categories: string[]
  isEmbedTag: string
}

export type AuthorRecord = {
  slug: string
  name: string
  hasCompleteName: boolean
  shortBio: string
  longBio: string
  photoUrl: string
  location: string
  specialties: string[]
  featuredQuote: string
  socialLinks: Array<{ label: string; href: string }>
  titleCount: number
  genres: string[]
  imprints: string[]
  books: BookRecord[]
}

export type ServiceCategoryRecord = (typeof serviceCategories)[number]
export type PublishingPackageRecord = (typeof packages)[number] & {
  slug: string
  summary: string
  audience: string
}

export const OFFICIAL_IMPRINTS = [
  'J Merrill Publishing',
  'JM Little',
  'JM Verse',
  'JM Signature',
  'JM Works',
] as const

export type OfficialImprint = (typeof OFFICIAL_IMPRINTS)[number]

const AUTHOR_NAME_ALIASES: Record<string, string> = {
  ...authorNameToMasterName,
  'Jackie Smith Jr.': 'Jackie Smith, Jr.',
}

const FORMAT_LABELS: Record<string, BookFormat> = {
  PB: 'Paperback',
  Paperback: 'Paperback',
  HC: 'Hardcover',
  Hardcover: 'Hardcover',
  EB: 'eBook',
  Ebook: 'eBook',
  eBook: 'eBook',
  Audio: 'Audiobook',
  Audiobook: 'Audiobook',
}

const PURCHASE_LINK_LABELS: Record<PurchaseLinkKey, string> = {
  amazon: 'Buy on Amazon',
  publisher: 'Buy Direct',
  barnesAndNoble: 'Barnes & Noble',
  appleBooks: 'Apple Books',
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function normalizeFormats(book: RawBook): BookFormat[] {
  const source = Array.isArray(book.formats) && book.formats.length
    ? book.formats
    : book.format
      ? [book.format]
      : ['Paperback']

  return Array.from(
    new Set(
      source
        .map((format) => FORMAT_LABELS[String(format).trim()] || 'Paperback')
        .filter(Boolean),
    ),
  ) as BookFormat[]
}

function cleanText(value: string | null | undefined) {
  return (value || '').trim()
}

function normalizeGenre(value: string | null | undefined) {
  return cleanText(value) || 'General Interest'
}

function normalizeYear(value: string | number | null | undefined) {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null
}

function normalizeIsoDate(value: string | null | undefined) {
  const trimmed = cleanText(value)
  return /^\d{4}-\d{2}-\d{2}$/.test(trimmed) ? trimmed : ''
}

function formatDateLabel(value: string) {
  if (!value) return ''

  const [year, month, day] = value.split('-').map(Number)
  if (!year || !month || !day) return ''

  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(year, month - 1, day)))
}

function resolveDisplayYear(year: number | null, releaseDate: string) {
  if (releaseDate) return releaseDate.slice(0, 4)
  return year ? String(year) : 'Catalog'
}

function normalizePurchaseLinks(purchaseLinks: BookPurchaseLinks) {
  return (Object.entries(purchaseLinks) as Array<[PurchaseLinkKey, string | undefined]>).reduce<BookPurchaseLinks>(
    (accumulator, [retailer, href]) => {
      const normalizedHref = cleanText(href)
      if (normalizedHref) {
        accumulator[retailer] = normalizedHref
      }
      return accumulator
    },
    {},
  )
}

function buildAvailablePurchaseLinks(purchaseLinks: BookPurchaseLinks) {
  const retailerOrder: PurchaseLinkKey[] = ['amazon', 'publisher', 'barnesAndNoble', 'appleBooks']
  return retailerOrder.reduce<PurchaseLink[]>((links, retailer) => {
    const href = purchaseLinks[retailer]
    if (href) {
      links.push({
        retailer,
        href,
        label: PURCHASE_LINK_LABELS[retailer],
      })
    }
    return links
  }, [])
}

function normalizeAuthorDisplayName(rawName: string) {
  const trimmed = cleanText(rawName)
  return AUTHOR_NAME_ALIASES[trimmed] || trimmed
}

function formatContributorNames(names: string[]) {
  if (names.length === 0) return 'J Merrill Publishing'
  if (names.length === 1) return names[0]
  if (names.length === 2) return `${names[0]} and ${names[1]}`
  return `${names.slice(0, -1).join(', ')}, and ${names[names.length - 1]}`
}

function compareBooksByReleaseDate(a: BookRecord, b: BookRecord) {
  const releaseA = a.releaseDate ? Date.parse(`${a.releaseDate}T00:00:00Z`) : a.year ? Date.UTC(a.year, 0, 1) : -1
  const releaseB = b.releaseDate ? Date.parse(`${b.releaseDate}T00:00:00Z`) : b.year ? Date.UTC(b.year, 0, 1) : -1
  if (releaseA !== releaseB) return releaseB - releaseA
  return a.title.localeCompare(b.title)
}

function getAuthorLastName(name: string) {
  const cleaned = name.replace(/,/g, '').trim()
  const parts = cleaned.split(/\s+/).filter(Boolean)
  const filtered = parts.filter((part) => !['jr', 'sr', 'ii', 'iii', 'iv'].includes(part.toLowerCase().replace(/\./g, '')))
  return (filtered[filtered.length - 1] || cleaned).toLowerCase()
}

function compareAuthorsByLastName(a: AuthorRecord, b: AuthorRecord) {
  const lastNameComparison = getAuthorLastName(a.name).localeCompare(getAuthorLastName(b.name))
  if (lastNameComparison !== 0) return lastNameComparison
  return a.name.localeCompare(b.name)
}

function normalizeImprint(rawImprint: string, genre: string): OfficialImprint {
  if (OFFICIAL_IMPRINTS.includes(rawImprint as OfficialImprint)) {
    return rawImprint as OfficialImprint
  }

  if (rawImprint === 'J Merrill Kids') return 'JM Little'
  if (genre === "Children's") return 'JM Little'
  if (genre === 'Poetry') return 'JM Verse'

  if (
    rawImprint === 'J Merrill Faith' ||
    rawImprint === 'J Merrill Voices' ||
    rawImprint === 'J Merrill Lit'
  ) {
    return 'JM Works'
  }

  return 'J Merrill Publishing'
}

function authorSlugFromName(name: string) {
  return slugify(name)
}

function sentenceFromTitle(title: string) {
  return title.endsWith('.') ? title : `${title}.`
}

function fallbackShortDescription(book: RawBook, genre: string) {
  return `${sentenceFromTitle(book.title)} A ${genre.toLowerCase()} title published through ${book.imprint}, part of the J Merrill Publishing flagship catalog.`
}

function fallbackLongDescription(book: RawBook, genre: string, formats: BookFormat[]) {
  return `${book.title} is part of the J Merrill Publishing catalog, positioned for readers seeking ${genre.toLowerCase()} work delivered with professional editorial, design, and distribution standards. This title is structured to support long-term discoverability on jmerrill.pub while also preparing for future Dataverse-driven catalog enrichment across formats including ${formats.join(', ')}.`
}

function titleKeywords(title: string) {
  return title
    .split(/[^A-Za-z0-9]+/)
    .map((word) => word.trim().toLowerCase())
    .filter((word) => word.length > 2)
}

const overrideMap = new Map(authorOverrides.map((author) => [author.slug, author]))

export const bookCatalog: BookRecord[] = [...rawBooks]
  .map((book) => {
    const formats = normalizeFormats(book)
    const genre = normalizeGenre(book.genre)
    const imprint = normalizeImprint(book.imprint, genre)
    const retailerEnrichment = bookRetailerEnrichmentOverrides[book.id] || {}
    const seriesOverride = bookSeriesOverrides[book.id]
    const contributorOverride = bookContributorOverrides[book.id]
    const contributors = (contributorOverride?.contributors.length
      ? contributorOverride.contributors
      : [{ name: titleAuthorOverrides[book.id] || book.author }]).map((contributor) => {
      const normalizedName = normalizeAuthorDisplayName(contributor.name)
      const resolvedSlug =
        contributor.slug === null
          ? null
          : contributor.slug || authorSlugFromName(normalizedName)

      return {
        name: normalizedName,
        slug: resolvedSlug,
        hasProfile: Boolean(resolvedSlug),
      }
    })
    const authorName =
      contributorOverride?.displayName ||
      formatContributorNames(contributors.map((contributor) => contributor.name))
    const authorSlug = contributors.length === 1 && contributors[0].hasProfile ? contributors[0].slug : null
    const authorOverride = authorSlug ? overrideMap.get(authorSlug) : undefined
    const releaseDate = normalizeIsoDate(retailerEnrichment.releaseDate)
    const year = normalizeYear(book.year) ?? (releaseDate ? Number(releaseDate.slice(0, 4)) : null)
    const publisherCoverUrl = cleanText(book.coverUrl)
    const retailerCoverUrl = cleanText(retailerEnrichment.retailerCoverUrl)
    const coverUrl = publisherCoverUrl || retailerCoverUrl
    const publisherDescription = cleanText(book.description)
    const retailerDescription = cleanText(retailerEnrichment.retailerDescription)
    const resolvedDescription = publisherDescription || retailerDescription
    const shortDescription = resolvedDescription || fallbackShortDescription({ ...book, imprint }, genre)
    const longDescription = resolvedDescription || fallbackLongDescription({ ...book, imprint }, genre, formats)
    const purchaseLinks = normalizePurchaseLinks({
      publisher: cleanText(book.purchaseUrl),
      ...bookPurchaseLinkOverrides[book.id],
    })
    const availablePurchaseLinks = buildAvailablePurchaseLinks(purchaseLinks)
    const retailerMatchStatus: RetailerMatchStatus | '' = retailerEnrichment.retailerMatchStatus || ''
    const amazonLinkType: AmazonLinkType | '' = retailerEnrichment.amazonLinkType || ''
    const publisherAuthorBio = authorOverride?.shortBio || ''
    const retailerAuthorBio = cleanText(retailerEnrichment.retailerAuthorBio)
    const keywords = Array.from(
      new Set([
        ...titleKeywords(book.title),
        ...titleKeywords(retailerEnrichment.subtitle || ''),
        ...contributors.flatMap((contributor) => titleKeywords(contributor.name)),
        ...titleKeywords(genre),
        ...titleKeywords(imprint),
      ]),
    )

    return {
      id: book.id,
      slug: book.id,
      title: book.title,
      subtitle: cleanText(retailerEnrichment.subtitle),
      retailerTitle: cleanText(retailerEnrichment.retailerTitle),
      series: cleanText(seriesOverride?.series),
      seriesOrder: typeof seriesOverride?.seriesOrder === 'number' ? seriesOverride.seriesOrder : null,
      authorName,
      authorSlug,
      contributors,
      genre,
      imprint,
      year,
      displayYear: resolveDisplayYear(year, releaseDate),
      releaseDate,
      releaseDateDisplay: formatDateLabel(releaseDate),
      formats,
      primaryFormat: formats[0] || 'Paperback',
      isbn: cleanText(book.isbn),
      asin: cleanText(retailerEnrichment.asin),
      publisherCoverUrl,
      retailerCoverUrl,
      coverUrl,
      publisherDescription,
      retailerDescription,
      shortDescription,
      longDescription,
      publisherAuthorBio,
      retailerAuthorBio,
      authorBio:
        publisherAuthorBio ||
        retailerAuthorBio ||
        (contributors.length === 1
          ? `${authorName} is part of the J Merrill Publishing author family, contributing work to a premium, relationship-driven catalog built for long-term author growth.`
          : `${authorName} contribute to the J Merrill Publishing catalog through a collaborative title positioned for discoverability, authority, and long-term platform growth.`),
      authorPhoto: authorOverride?.photoUrl || '',
      purchaseLinks,
      availablePurchaseLinks,
      retailerMatchStatus,
      amazonLinkType,
      retailerLastVerifiedAt: normalizeIsoDate(retailerEnrichment.retailerLastVerifiedAt),
      excerpt: '',
      quotes: [],
      keywords,
      categories: [genre, imprint, ...formats],
      isEmbedTag: typeof book.isEmbedTag === 'string' ? book.isEmbedTag : '',
    }
  })
  .sort(compareBooksByReleaseDate)

export const authorCatalog: AuthorRecord[] = Array.from(
  bookCatalog.reduce((map, book) => {
    if (!book.authorSlug) return map

    const existing = map.get(book.authorSlug)
    if (existing) {
      existing.books.push(book)
    } else {
      map.set(book.authorSlug, { slug: book.authorSlug, name: book.authorName, books: [book] })
    }
    return map
  }, new Map<string, { slug: string; name: string; books: BookRecord[] }>()),
)
  .map(([, authorGroup]) => {
    const override = overrideMap.get(authorGroup.slug)
    const genres = Array.from(new Set(authorGroup.books.map((book) => book.genre))).filter(Boolean)
    const imprints = Array.from(new Set(authorGroup.books.map((book) => book.imprint)))

    return {
      slug: authorGroup.slug,
      name: override?.name || authorGroup.name,
      hasCompleteName: (override?.name || authorGroup.name).trim().includes(' '),
      shortBio:
        override?.shortBio ||
        `${authorGroup.name} is a J Merrill Publishing author with ${authorGroup.books.length} title${authorGroup.books.length === 1 ? '' : 's'} in the flagship catalog.`,
      longBio:
        override?.longBio ||
        `${authorGroup.name} is part of the J Merrill Publishing family, contributing work to a modern catalog designed for discoverability, professional curation, and long-term author growth. Their presence on jmerrill.pub supports a stronger direct publishing authority layer around author identity, catalog context, and reader connection.`,
      photoUrl: override?.photoUrl || '',
      location: override?.location || 'J Merrill Publishing author family',
      specialties: override?.specialties || genres.slice(0, 3),
      featuredQuote:
        override?.featuredQuote ||
        'Publishing should create a lasting home for the work, not just a one-time release.',
      socialLinks: override?.socialLinks || [],
      titleCount: authorGroup.books.length,
      genres,
      imprints,
      books: [...authorGroup.books].sort(compareBooksByReleaseDate),
    }
  })
  .sort(compareAuthorsByLastName)

export const serviceCatalog = serviceCategories
export const serviceInnovationPipeline = comingSoonServices

export const publishingPackages: PublishingPackageRecord[] = packages.map((pkg) => ({
  ...pkg,
  slug: slugify(pkg.tier),
  summary:
    pkg.tier === 'Starter'
      ? 'A polished entry point for authors who need professional execution without losing ownership.'
      : pkg.tier === 'Professional'
        ? 'The flagship growth tier for authors ready for stronger editorial depth, positioning, and launch support.'
        : 'A high-touch publishing experience for authors building a premium, legacy-driven release.',
  audience:
    pkg.tier === 'Starter'
      ? 'Best for first-time or focused-entry authors.'
      : pkg.tier === 'Professional'
        ? 'Best for authors building momentum and seeking a fuller publishing system.'
        : 'Best for authors pursuing a premium flagship release with elevated support.',
}))

export const imprintCatalog = OFFICIAL_IMPRINTS.filter((imprint) =>
  bookCatalog.some((book) => book.imprint === imprint),
)

export const publicAuthorCatalog = authorCatalog.filter((author) => author.hasCompleteName)

export function getBookById(id: string) {
  return bookCatalog.find((book) => book.id === id)
}

export function getAuthorBySlug(slug: string) {
  return authorCatalog.find((author) => author.slug === slug)
}

export function getBooksByAuthorSlug(slug: string) {
  return bookCatalog.filter((book) => book.authorSlug === slug)
}

export function getBooksByImprint(imprint: string) {
  return bookCatalog.filter((book) => book.imprint === imprint)
}

export function getBooksBySeries(series: string) {
  return bookCatalog
    .filter((book) => book.series === series)
    .sort((a, b) => {
      const seriesOrderA = a.seriesOrder ?? Number.MAX_SAFE_INTEGER
      const seriesOrderB = b.seriesOrder ?? Number.MAX_SAFE_INTEGER
      if (seriesOrderA !== seriesOrderB) return seriesOrderA - seriesOrderB
      return compareBooksByReleaseDate(a, b)
    })
}
