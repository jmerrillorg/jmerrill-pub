import type { CatalogAuthorDetail, CatalogAuthorSummary, CatalogTitleSummary } from '@/lib/catalog/types'
import type { BookCardRecord } from '@/components/content/BookCard'
import type { AuthorCardRecord } from '@/components/content/AuthorCard'

export function catalogTitleToBookCardRecord(title: CatalogTitleSummary): BookCardRecord {
  return {
    id: title.slug || title.id,
    title: title.title,
    authorName: title.authorDisplayName || title.authors.map((author) => author.name).filter(Boolean).join(', ') || 'J Merrill Publishing author',
    imprint: title.certifiedImprint || 'J Merrill Publishing',
    coverUrl: title.coverUrl,
    shortDescription: title.shortDescription || 'Catalog description pending.',
    formats: title.formats.length ? title.formats : ['Other'],
    displayYear: title.displayYear,
    availablePurchaseLinks: title.purchaseLinks.map((link) => ({
      retailer: link.retailer,
      label: link.label || link.retailer || 'View listing',
      href: link.href,
    })),
  }
}

export function catalogAuthorDisplayName(title: CatalogTitleSummary) {
  return title.authorDisplayName || title.authors.map((author) => author.name).filter(Boolean).join(', ') || 'J Merrill Publishing author'
}

export function catalogAuthorToCardRecord(author: CatalogAuthorSummary | CatalogAuthorDetail): AuthorCardRecord {
  return {
    slug: author.slug,
    name: author.name,
    photoUrl: author.photoUrl,
    location: 'location' in author ? author.location : '',
    shortBio: author.shortBio || 'J Merrill Publishing author family.',
    titleCount: author.titleCount,
    specialties: 'specialties' in author && author.specialties.length ? author.specialties : author.genres,
  }
}
