import snapshot from './public-backlist-presentation.json' with { type: 'json' }
import type { CatalogTitleSummary, CatalogAuthorSummary } from '../lib/catalog/types'

type TitlePresentation = {
  titleId: string
  slug: string
  isbns: string[]
  coverUrl?: string
  shortDescription?: string
  longDescription?: string
  editionFormats?: Record<string, string>
}
type AuthorPresentation = {
  name: string
  titleIds: string[]
  biography?: string
  photoUrl?: string
}
const content = snapshot as unknown as {
  titles: Record<string, TitlePresentation>
  authors: Record<string, AuthorPresentation>
}

export function getPublicBacklistContent(title: Pick<CatalogTitleSummary, 'id' | 'slug' | 'primaryIsbn' | 'isbnByFormat'>) {
  const exact = content.titles[title.id]
  // Canonical IDs survive deterministic public slug disambiguation.
  if (exact && title.id !== title.slug) return exact
  // Recovery cards require an exact edition join, never a title-text-only match.
  if (title.id !== title.slug) return undefined
  const isbns = [title.primaryIsbn, ...title.isbnByFormat.map(item => item.isbn)].filter(Boolean).map(isbn => isbn.replace(/[^0-9X]/g, ''))
  return Object.values(content.titles).find(entry => entry.slug === title.slug && entry.isbns.some(isbn => isbns.includes(isbn)))
}

export function applyPublicBacklistAuthor(author: CatalogAuthorSummary, titles: CatalogTitleSummary[]): CatalogAuthorSummary {
  const entry = content.authors[author.slug]
  if (!entry || entry.name !== author.name) return author
  const bound = titles.some(title => entry.titleIds.includes(getPublicBacklistContent(title)?.titleId || title.id) && title.authors.some(link => link.slug === author.slug && link.name === author.name))
  if (!bound) return author
  return { ...author, shortBio: entry.biography || author.shortBio, photoUrl: entry.photoUrl || author.photoUrl }
}
