import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import { BookCard } from '@/components/content/BookCard'
import { CTASection } from '@/components/content/CTASection'
import { catalogAuthorDisplayName, catalogTitleToBookCardRecord } from '@/lib/catalog/display'
import type { CatalogTitleDetail } from '@/lib/catalog/types'
import { getPublicCatalogTitleBySlug } from '@/lib/server/dataverse/catalog'
import { getImprintStrategyByLabel } from '@/data/imprints'

type Props = { params: { id: string } }

export const dynamic = 'force-dynamic'

function ContributorByline({ book }: { book: CatalogTitleDetail }) {
  const contributors = book.authors.length
    ? book.authors
    : [{ name: catalogAuthorDisplayName(book), slug: '', contactId: '', role: 'Author', primary: true }]

  return (
    <>
      {contributors.map((contributor, index) => (
        <span key={`${book.id}-${contributor.name}-${index}`}>
          {index > 0 ? (index === contributors.length - 1 ? ' and ' : ', ') : null}
          {contributor.slug ? (
            <Link href={`/authors/${contributor.slug}`} className="transition-colors hover:text-blue-400">
              {contributor.name}
            </Link>
          ) : (
            contributor.name
          )}
        </span>
      ))}
    </>
  )
}

function CatalogUnavailable() {
  return (
    <div className="min-h-screen bg-[#070710] pt-[76px]">
      <div className="mx-auto max-w-[820px] px-6 py-24 text-center sm:px-12">
        <div className="mb-3 font-mono text-[10px] uppercase tracking-[0.14em] text-blue-400">Catalog temporarily unavailable</div>
        <h1 className="text-white" style={{ fontFamily: "'Libre Baskerville', serif", fontSize: 'clamp(32px,5vw,56px)', fontWeight: 700 }}>
          This title page is being refreshed.
        </h1>
        <p className="mx-auto mt-5 max-w-[620px] text-[15px] font-light leading-[1.8] text-white/45">
          Book details are served from J Merrill Publishing enterprise records. Please return to the catalog or contact us if you need help with a specific title.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href="/books" className="rounded-full bg-blue-500 px-7 py-3 text-[13px] font-semibold text-white transition-colors hover:bg-blue-600">
            Back to Catalog
          </Link>
          <Link href="/contact" className="rounded-full border border-white/15 px-7 py-3 text-[13px] text-white/60 transition-all hover:border-blue-500 hover:text-blue-400">
            Contact Us
          </Link>
        </div>
      </div>
    </div>
  )
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const result = await getPublicCatalogTitleBySlug(params.id)
  if (!result.ok) {
    return {
      title: 'Book Catalog Temporarily Unavailable',
      description: 'J Merrill Publishing book details are temporarily unavailable.',
    }
  }
  if (!result.data) return { title: 'Book Not Found' }

  const book = result.data
  return {
    title: `${book.title} by ${catalogAuthorDisplayName(book)}`,
    description: book.shortDescription || `Book details for ${book.title} from J Merrill Publishing.`,
  }
}

export default async function BookPage({ params }: Props) {
  const result = await getPublicCatalogTitleBySlug(params.id)
  if (!result.ok) return <CatalogUnavailable />
  if (!result.data) notFound()

  const book = result.data
  const bookCard = catalogTitleToBookCardRecord(book)
  const authorName = catalogAuthorDisplayName(book)
  const authorSlug = book.authors[0]?.slug || ''
  const coverIsRemote = Boolean(book.coverUrl?.startsWith('http'))
  const readerImprint = getImprintStrategyByLabel(book.certifiedImprint)
  const isbnDisplay =
    book.isbnByFormat.length > 1
      ? book.isbnByFormat.map((item) => `${item.format}: ${item.isbn}`).join(' · ')
      : book.primaryIsbn || book.isbnByFormat[0]?.isbn || 'Catalog record pending'
  const primaryFormat = book.formats[0] || 'Catalog format pending'

  return (
    <div className="min-h-screen bg-[#070710] pt-[76px]">
      <div className="border-b border-white/5 px-6 py-5 sm:px-12">
        <div className="mx-auto max-w-[1280px]">
          <Link href="/books" className="inline-flex items-center gap-2 text-[13px] text-white/30 transition-colors hover:text-blue-400">
            ← Back to Catalog
          </Link>
        </div>
      </div>

      <div className="mx-auto max-w-[1280px] px-6 py-16 sm:px-12">
        <div className="grid items-start gap-20 lg:grid-cols-[340px_1fr]">
          <aside className="lg:sticky lg:top-28">
            <div className="relative aspect-[3/4] overflow-hidden rounded-[28px] border border-white/8 bg-[#0F1C2E]">
              <div className="absolute inset-0 bg-[#08101d]" />
              {book.coverUrl ? (
                <div className="absolute inset-4 rounded-[18px] bg-white shadow-[0_20px_42px_rgba(0,0,0,0.3)]">
                  <Image
                    src={book.coverUrl}
                    alt={`${book.title} cover`}
                    fill
                    className="object-contain p-3"
                    sizes="(max-width: 1024px) 100vw, 340px"
                    unoptimized={coverIsRemote}
                  />
                </div>
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center">
                  <div className="relative h-28 w-28">
                    <Image
                      src="/logo.jpg"
                      alt="J Merrill Publishing logo"
                      fill
                      className="object-contain"
                      sizes="112px"
                      style={{ opacity: 0.94 }}
                    />
                  </div>
                  <div
                    className="mt-6 text-white"
                    style={{ fontFamily: "'Libre Baskerville', serif", fontSize: '22px', fontWeight: 700, lineHeight: 1.2 }}
                  >
                    {book.title}
                  </div>
                  <div className="mt-2 text-[14px] text-white/45">{authorName}</div>
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
            </div>

            <div className="mt-5 flex flex-col gap-2.5">
              {book.formats.map((format) => (
                <div key={format} className="flex items-center justify-between rounded-xl border border-white/6 bg-white/[0.03] px-4 py-3">
                  <div>
                    <div className="text-[13px] font-medium text-white">{format}</div>
                    <div className="text-[11px] font-light text-white/30">Catalog-ready format support</div>
                  </div>
                  <span className="font-mono text-[11px] text-blue-400">Live</span>
                </div>
              ))}
            </div>

            <div className="mt-5 flex flex-col gap-3">
              {book.purchaseLinks.length > 0 ? (
                book.purchaseLinks.map((link) => (
                  <a
                    key={`${link.retailer}-${link.href}`}
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`block rounded-full py-3.5 text-center text-[13px] font-semibold uppercase tracking-[0.04em] transition-colors ${
                      link.retailer.toLowerCase().includes('amazon')
                        ? 'bg-blue-500 text-white hover:bg-blue-600'
                        : 'border border-white/10 bg-white/5 text-white/70 hover:border-blue-500/40 hover:text-blue-300'
                    }`}
                  >
                    {link.label || link.retailer || 'View listing'}
                  </a>
                ))
              ) : (
                <Link
                  href="/contact"
                  className="block rounded-full border border-white/10 bg-white/5 py-3.5 text-center text-[13px] font-medium text-white/55 transition-all hover:border-blue-500/40 hover:text-blue-400"
                >
                  Ask about this title
                </Link>
              )}
              {authorSlug ? (
                <Link
                  href={`/authors/${authorSlug}`}
                  className="block rounded-full border border-white/10 py-3 text-center text-[13px] font-medium text-white/40 transition-all hover:border-blue-500/40 hover:text-blue-400"
                >
                  View author profile
                </Link>
              ) : (
                <div className="rounded-full border border-white/10 py-3 text-center text-[13px] font-medium text-white/25">
                  J Merrill Publishing author family
                </div>
              )}
              {readerImprint ? (
                <Link
                  href={{
                    pathname: '/readers',
                    query: { imprint: readerImprint.slug, book: book.slug || book.id, title: book.title },
                  }}
                  className="block rounded-full border border-white/10 py-3 text-center text-[13px] font-medium text-white/40 transition-all hover:border-blue-500/40 hover:text-blue-400"
                >
                  Get reader updates
                </Link>
              ) : null}
            </div>
          </aside>

          <main>
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/10 px-3 py-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
              <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-blue-400">{book.certifiedImprint || 'J Merrill Publishing'}</span>
            </div>

            <h1
              className="mt-6 text-white"
              style={{ fontFamily: "'Libre Baskerville', serif", fontSize: 'clamp(34px,4vw,58px)', fontWeight: 700, lineHeight: 1.08, letterSpacing: '-0.02em' }}
            >
              {book.title}
            </h1>

            {book.subtitle ? (
              <p className="mt-4 max-w-[760px] text-[18px] font-light leading-[1.7] text-white/40">{book.subtitle}</p>
            ) : null}

            <div className="mt-3 flex flex-wrap items-center gap-3 text-[16px] text-white/45">
              <span>by</span>
              <ContributorByline book={book} />
            </div>

            {book.series ? (
              <div className="mt-6 rounded-[22px] border border-blue-500/15 bg-blue-500/[0.05] px-5 py-4">
                <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-blue-400">Series context</div>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-[14px] text-white/65">
                  <span className="rounded-full border border-blue-500/20 bg-blue-500/10 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.08em] text-blue-300">
                    {book.series}
                  </span>
                  {book.seriesOrder ? <span className="text-white/35">Book {book.seriesOrder}</span> : null}
                </div>
              </div>
            ) : null}

            <p className="mt-8 max-w-[760px] text-[18px] font-light leading-[1.8] text-white/55">
              {book.shortDescription || 'Description pending.'}
            </p>

            <div className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {[
                { label: 'Genre', value: book.genre || 'General Interest' },
                { label: book.releaseDate ? 'Release date' : 'Catalog year', value: book.releaseDate || book.displayYear },
                { label: 'Primary format', value: primaryFormat },
                { label: book.isbnByFormat.length > 1 ? 'ISBNs' : 'ISBN', value: isbnDisplay },
              ].map((item) => (
                <div key={item.label} className="rounded-xl border border-white/6 bg-white/[0.03] px-4 py-4">
                  <div className="mb-1 font-mono text-[10px] uppercase tracking-[0.1em] text-white/20">{item.label}</div>
                  <div className="text-[13px] font-light text-white/65">{item.value}</div>
                </div>
              ))}
            </div>

            <div className="mt-12 grid gap-10 xl:grid-cols-[1.1fr_0.9fr]">
              <section>
                <div className="mb-4 flex items-center gap-3">
                  <span className="block h-px w-8 bg-blue-500" />
                  <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-blue-400">About the title</span>
                </div>
                <p className="text-[15px] font-light leading-[1.9] text-white/55">
                  {book.longDescription || book.shortDescription || 'Full title description pending.'}
                </p>

                {book.keywords.length > 0 ? (
                  <div className="mt-8">
                    <div className="mb-3 font-mono text-[10px] uppercase tracking-[0.12em] text-white/20">Keywords & categories</div>
                    <div className="flex flex-wrap gap-2">
                      {book.keywords.slice(0, 12).map((item) => (
                        <span key={item} className="rounded-full border border-white/8 bg-white/[0.03] px-3 py-1.5 text-[11px] text-white/35">
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : null}
              </section>

              <section className="rounded-[28px] border border-white/8 bg-white/[0.03] p-8">
                <div className="mb-4 font-mono text-[10px] uppercase tracking-[0.12em] text-blue-400">About the author</div>
                <div className="flex items-center gap-4">
                  <div className="relative h-16 w-16 overflow-hidden rounded-2xl border border-blue-500/20 bg-blue-500/10">
                    <div className="flex h-full w-full items-center justify-center text-[22px] font-semibold text-blue-400">
                      {authorName.charAt(0)}
                    </div>
                  </div>
                  <div>
                    <div className="text-white" style={{ fontFamily: "'Libre Baskerville', serif", fontSize: '24px', fontWeight: 700 }}>
                      {authorName}
                    </div>
                    <div className="text-[12px] text-white/30">J Merrill Publishing author family</div>
                  </div>
                </div>
                <p className="mt-5 text-[14px] font-light leading-[1.8] text-white/45">
                  Author profile details are maintained in the J Merrill Publishing author records and will appear as the public profile is completed.
                </p>
                {authorSlug ? (
                  <Link href={`/authors/${authorSlug}`} className="mt-6 inline-flex text-[13px] font-medium text-blue-400 transition-colors hover:text-blue-300">
                    Explore full author profile -&gt;
                  </Link>
                ) : null}
              </section>
            </div>
          </main>
        </div>

        {book.relatedTitles.length > 0 ? (
          <section className="mt-20 border-t border-white/5 pt-16">
            <div className="mb-8 flex items-center gap-3">
              <span className="block h-px w-8 bg-blue-500" />
              <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-blue-400">More from {book.certifiedImprint}</span>
            </div>
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              {book.relatedTitles.map((item) => (
                <BookCard key={item.id} book={catalogTitleToBookCardRecord(item)} compact />
              ))}
            </div>
          </section>
        ) : null}
      </div>

      <CTASection
        eyebrow="Build Your Own Title Page"
        title={
          <>
            Ready to publish into
            <br />
            this ecosystem?
          </>
        }
        description="J Merrill Publishing is built to give every author a stronger home for their books, their identity, and their long-term growth."
        primary={{ label: 'Join the Family', href: '/join' }}
        secondary={{ label: 'Explore publishing', href: '/publishing' }}
      />
    </div>
  )
}
