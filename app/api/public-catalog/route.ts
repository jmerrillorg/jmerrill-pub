import { NextResponse } from 'next/server'
import { buildPublicCatalogProjectionSummary, evaluatePublicCatalogReadiness } from '@/lib/catalog/public-projection'
import { listPublicAuthors, listPublicCatalogTitles } from '@/lib/server/dataverse/catalog'

export const dynamic = 'force-dynamic'

export async function GET() {
  const [titlesResult, authorsResult] = await Promise.all([
    listPublicCatalogTitles(),
    listPublicAuthors(),
  ])

  if (!titlesResult.ok || !authorsResult.ok) {
    return NextResponse.json({
      ok: false,
      error: 'public_catalog_projection_unavailable',
      titleRead: titlesResult.ok ? 'ok' : titlesResult.error,
      authorRead: authorsResult.ok ? 'ok' : authorsResult.error,
      generatedAt: new Date().toISOString(),
    }, { status: 503, headers: { 'Cache-Control': 'no-store' } })
  }

  const summary = buildPublicCatalogProjectionSummary(titlesResult.data, authorsResult.data)
  const duplicateTitleSlugs = new Set(summary.duplicateTitleSlugs.map((slug) => slug.toLowerCase()))
  const duplicateAuthorSlugs = new Set(summary.duplicateAuthorSlugs.map((slug) => slug.toLowerCase()))

  return NextResponse.json({
    ok: true,
    generatedAt: new Date().toISOString(),
    authority: {
      source: 'Dataverse public catalog projection',
      retailerBoundary: 'Retailer and Amazon data are verification evidence only.',
    },
    summary,
    titles: titlesResult.data.map((title) => ({
      id: title.id,
      slug: title.slug,
      title: title.title,
      // Canonical jm1pub_releasedate -> CatalogTitleSummary.releaseDate,
      // already computed in lib/server/dataverse/catalog.ts and already the
      // field projectPublicCatalogTitles() sorts by (see
      // lib/catalog/public-projection.ts). This route was simply never
      // serializing it — no new date logic here, just exposing the existing
      // value. Empty string (no release date on record) is preserved as-is
      // rather than coerced to null, matching CatalogTitleSummary's own type.
      releaseDate: title.releaseDate,
      authorDisplayName: title.authorDisplayName,
      authors: title.authors.map((author) => ({
        slug: author.slug,
        name: author.name,
        role: author.role,
      })),
      certifiedImprint: title.certifiedImprint,
      genre: title.genre,
      displayYear: title.displayYear,
      formats: title.formats,
      isbnByFormat: title.isbnByFormat.map((item) => ({
        format: item.format,
        isbn: item.isbn,
      })),
      pageReadiness: evaluatePublicCatalogReadiness(title, duplicateTitleSlugs, duplicateAuthorSlugs),
    })),
    authors: authorsResult.data.map((author) => ({
      slug: author.slug,
      name: author.name,
      titleCount: author.titleCount,
      genres: author.genres,
      imprints: author.imprints,
    })),
  }, {
    headers: {
      'Cache-Control': 'no-store',
    },
  })
}
