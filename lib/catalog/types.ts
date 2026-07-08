export type CatalogFormat = 'Paperback' | 'Hardcover' | 'eBook' | 'Audiobook' | 'Other'

export type CatalogAuthorLink = {
  contactId: string
  slug: string
  name: string
  role: string
  primary: boolean
}

export type CatalogPurchaseLink = {
  retailer: string
  label: string
  href: string
  marketplaceStatus: string
}

export type CatalogFormatIsbn = {
  format: CatalogFormat
  isbn: string
  assetId: string
  assetStatus: string
}

export type CatalogTitleSummary = {
  id: string
  slug: string
  title: string
  subtitle: string
  authorDisplayName: string
  authors: CatalogAuthorLink[]
  certifiedImprint: string
  genre: string
  publicationStatus: string
  releaseDate: string
  displayYear: string
  formats: CatalogFormat[]
  primaryIsbn: string
  isbnByFormat: CatalogFormatIsbn[]
  coverUrl: string
  shortDescription: string
  purchaseLinks: CatalogPurchaseLink[]
  marketplaceStatus: string
}

export type CatalogTitleDetail = CatalogTitleSummary & {
  longDescription: string
  series: string
  seriesOrder: number | null
  keywords: string[]
  marketplaceIdentifiers: Array<{
    marketplace: string
    identifier: string
    status: string
  }>
  relatedTitles: CatalogTitleSummary[]
}

export type CatalogAuthorSummary = {
  contactId: string
  slug: string
  name: string
  shortBio: string
  photoUrl: string
  titleCount: number
  genres: string[]
  imprints: string[]
}

export type CatalogAuthorDetail = CatalogAuthorSummary & {
  longBio: string
  location: string
  specialties: string[]
  titles: CatalogTitleSummary[]
}

export type CatalogStats = {
  totalTitles: number
  activeAuthors: number
  imprintCount: number
  lastUpdated: string
}

export type CatalogReadResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; missingConfig?: string[] }
