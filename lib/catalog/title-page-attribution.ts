import type { CatalogTitleDetail } from './types'

const DAMAGED_TITLE_ID = '33106fd3-c27a-f111-ab0f-6045bdd69435'

/** Reader-facing credit for this title page only. Do not expose a profile tied to a different identity. */
export function withTitlePageAttribution(book: CatalogTitleDetail): CatalogTitleDetail {
  if (book.id !== DAMAGED_TITLE_ID || book.slug !== 'damaged') return book

  return { ...book, authorDisplayName: 'Taye Knox', authors: [] }
}
