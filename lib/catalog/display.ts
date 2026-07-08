import type { CatalogTitleSummary } from '@/lib/catalog/types'
import type { BookCardRecord } from '@/components/content/BookCard'

export function catalogTitleToBookCardRecord(title: CatalogTitleSummary): BookCardRecord {
  return {
    id: title.slug || title.id,
    title: title.title,
    authorName: title.authorDisplayName || title.authors.map((author) => author.name).filter(Boolean).join(', ') || 'J Merrill Publishing author',
    imprint: title.certifiedImprint || 'J Merrill Publishing',
    coverUrl: title.coverUrl,
    shortDescription: title.shortDescription || 'Catalog description pending.',
    formats: title.formats.length ? title.formats : ['Other'],
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
