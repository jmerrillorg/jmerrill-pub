import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import { BookCard } from '@/components/content/BookCard'
import { CTASection } from '@/components/content/CTASection'
import { getAuthorBySlug, getBookById, getBooksByAuthorSlug, getBooksByImprint, getBooksBySeries, bookCatalog } from '@/lib/content'

type Props = { params: { id: string } }

function ContributorByline({ id, contributors }: { id: string; contributors: Array<{ name: string; slug: string | null; hasProfile: boolean }> }) {
  return (
    <>
      {contributors.map((contributor, index) => (
        <span key={`${id}-${contributor.name}-${index}`}>
          {index > 0 ? (index === contributors.length - 1 ? ' and ' : ', ') : null}
          {contributor.hasProfile && contributor.slug ? (
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

export async function generateStaticParams() {
  return bookCatalog.map((book) => ({ id: book.id }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const book = getBookById(params.id)
  if (!book) return { title: 'Book Not Found' }

  return {
    title: `${book.title} by ${book.authorName}`,
    description: book.shortDescription,
  }
}

export default function BookPage({ params }: Props) {
  const book = getBookById(params.id)
  if (!book) notFound()
  const coverIsRemote = book.coverUrl.startsWith('http')

  const author = book.authorSlug ? getAuthorBySlug(book.authorSlug) : undefined
  const relatedBySeries = book.series ? getBooksBySeries(book.series).filter((item) => item.id !== book.id).slice(0, 4) : []
  const relatedByAuthor = book.authorSlug
    ? getBooksByAuthorSlug(book.authorSlug).filter((item) => item.id !== book.id).slice(0, 4)
    : []
  const relatedByImprint =
    relatedByAuthor.length > 0
      ? []
      : getBooksByImprint(book.imprint).filter((item) => item.id !== book.id).slice(0, 4)

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
                  <div className="mt-2 text-[14px] text-white/45">{book.authorName}</div>
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
              {book.availablePurchaseLinks.length > 0 ? (
                book.availablePurchaseLinks.map((link) => (
                  <a
                    key={link.retailer}
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`block rounded-full py-3.5 text-center text-[13px] font-semibold uppercase tracking-[0.04em] transition-colors ${
                      link.retailer === 'amazon'
                        ? 'bg-blue-500 text-white hover:bg-blue-600'
                        : 'border border-white/10 bg-white/5 text-white/70 hover:border-blue-500/40 hover:text-blue-300'
                    }`}
                  >
                    {link.label}
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
              {book.authorSlug ? (
                <Link
                  href={`/authors/${book.authorSlug}`}
                  className="block rounded-full border border-white/10 py-3 text-center text-[13px] font-medium text-white/40 transition-all hover:border-blue-500/40 hover:text-blue-400"
                >
                  View author profile
                </Link>
              ) : (
                <div className="rounded-full border border-white/10 py-3 text-center text-[13px] font-medium text-white/25">
                  Collaborative title
                </div>
              )}
            </div>
          </aside>

          <main>
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/10 px-3 py-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
              <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-blue-400">{book.imprint}</span>
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
              <ContributorByline id={book.id} contributors={book.contributors} />
            </div>

            {book.series ? (
              <div className="mt-6 rounded-[22px] border border-blue-500/15 bg-blue-500/[0.05] px-5 py-4">
                <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-blue-400">Series context</div>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-[14px] text-white/65">
                  <span className="rounded-full border border-blue-500/20 bg-blue-500/10 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.08em] text-blue-300">
                    {book.series}
                  </span>
                  {book.seriesOrder ? (
                    <span className="text-white/35">Book {book.seriesOrder}</span>
                  ) : null}
                </div>
                {relatedBySeries.length > 0 ? (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {relatedBySeries.map((item) => (
                      <Link
                        key={item.id}
                        href={`/books/${item.id}`}
                        className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-[12px] text-white/45 transition-all hover:border-blue-500/30 hover:text-blue-300"
                      >
                        {item.seriesOrder ? `${item.seriesOrder}. ` : ''}
                        {item.title}
                      </Link>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : null}

            <p className="mt-8 max-w-[760px] text-[18px] font-light leading-[1.8] text-white/55">{book.shortDescription}</p>

            <div className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {[
                { label: 'Genre', value: book.genre },
                { label: book.releaseDate ? 'Release date' : 'Catalog year', value: book.releaseDateDisplay || book.displayYear },
                { label: 'Primary format', value: book.primaryFormat },
                { label: 'ISBN', value: book.isbn || 'Catalog record pending' },
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
                <p className="text-[15px] font-light leading-[1.9] text-white/55">{book.longDescription}</p>

                {book.keywords.length > 0 && (
                  <div className="mt-8">
                    <div className="mb-3 font-mono text-[10px] uppercase tracking-[0.12em] text-white/20">Keywords & categories</div>
                    <div className="flex flex-wrap gap-2">
                      {book.categories.concat(book.keywords.slice(0, 8)).map((item) => (
                        <span key={item} className="rounded-full border border-white/8 bg-white/[0.03] px-3 py-1.5 text-[11px] text-white/35">
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </section>

              <section className="rounded-[28px] border border-white/8 bg-white/[0.03] p-8">
                <div className="mb-4 font-mono text-[10px] uppercase tracking-[0.12em] text-blue-400">
                  {book.authorSlug ? 'About the author' : 'About the contributors'}
                </div>
                <div className="flex items-center gap-4">
                  <div className="relative h-16 w-16 overflow-hidden rounded-2xl border border-blue-500/20 bg-blue-500/10">
                    {author?.photoUrl ? (
                      <Image src={author.photoUrl} alt={author.name} fill className="object-cover" sizes="64px" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-[22px] font-semibold text-blue-400">
                        {book.authorName.charAt(0)}
                      </div>
                    )}
                  </div>
                  <div>
                    <div
                      className="text-white"
                      style={{ fontFamily: "'Libre Baskerville', serif", fontSize: '24px', fontWeight: 700 }}
                    >
                      {book.authorName}
                    </div>
                    <div className="text-[12px] text-white/30">{author?.location || 'J Merrill Publishing author family'}</div>
                  </div>
                </div>
                <p className="mt-5 text-[14px] font-light leading-[1.8] text-white/45">
                  {author?.longBio || book.authorBio}
                </p>
                {book.retailerLastVerifiedAt ? (
                  <div className="mt-5 font-mono text-[10px] uppercase tracking-[0.1em] text-white/20">
                    Retailer metadata verified {book.retailerLastVerifiedAt}
                  </div>
                ) : null}
                {book.authorSlug ? (
                  <Link
                    href={`/authors/${book.authorSlug}`}
                    className="mt-6 inline-flex text-[13px] font-medium text-blue-400 transition-colors hover:text-blue-300"
                  >
                    Explore full author profile -&gt;
                  </Link>
                ) : null}
              </section>
            </div>
          </main>
        </div>

        {(relatedByAuthor.length > 0 || relatedByImprint.length > 0) && (
          <section className="mt-20 border-t border-white/5 pt-16">
            <div className="mb-8 flex items-center gap-3">
              <span className="block h-px w-8 bg-blue-500" />
              <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-blue-400">
                {relatedByAuthor.length > 0 ? `More from ${book.authorName}` : `More from ${book.imprint}`}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              {(relatedByAuthor.length > 0 ? relatedByAuthor : relatedByImprint).map((item) => (
                <BookCard key={item.id} book={item} compact />
              ))}
            </div>
          </section>
        )}
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
