import Image from 'next/image'
import Link from 'next/link'
import { BookCard } from '@/components/content/BookCard'
import { catalogTitleToBookCardRecord } from '@/lib/catalog/display'
import type { CatalogAuthorDetail, CatalogTitleSummary } from '@/lib/catalog/types'
import type { EnhancedAuthorExperience, FeaturedAuthorRuntimeState } from '@/data/author-experience'

type EnhancedAuthorProfileProps = {
  author: CatalogAuthorDetail
  experience: EnhancedAuthorExperience
  featuredTitle: CatalogTitleSummary
  featuredState: FeaturedAuthorRuntimeState
}

export function EnhancedAuthorProfile({
  author,
  experience,
  featuredTitle,
  featuredState,
}: EnhancedAuthorProfileProps) {
  const coverIsRemote = featuredTitle.coverUrl.startsWith('http')
  const badge =
    featuredState === 'ACTIVE'
      ? 'Featured Author · November 2026'
      : featuredState === 'PRE_NOVEMBER'
        ? 'Scheduled Featured Author · November 2026'
        : 'Enhanced Author Experience'
  const supportingTitles = author.titles.filter((title) => title.slug !== featuredTitle.slug && title.id !== featuredTitle.id)

  return (
    <div className="pt-[76px]">
      <section className="relative overflow-hidden bg-[#0F1C2E] px-6 py-20 sm:px-12">
        <div
          className="absolute inset-0"
          style={{ background: 'radial-gradient(ellipse 65% 75% at 18% 45%, rgba(30,144,255,0.16) 0%, transparent 68%)' }}
        />
        <div className="relative z-10 mx-auto max-w-[1280px]">
          <Link href="/authors" className="inline-flex items-center gap-2 text-[13px] text-white/35 transition-colors hover:text-blue-300">
            ← Back to Authors
          </Link>

          <div className="mt-10 grid gap-12 lg:grid-cols-[0.92fr_1.08fr] lg:items-center">
            <div className="grid gap-5 sm:grid-cols-[180px_1fr] lg:grid-cols-1">
              <div className="relative h-[280px] overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.04] sm:h-[260px] lg:h-[360px]">
                {author.photoUrl ? (
                  <Image src={author.photoUrl} alt={author.name} fill className="object-cover" sizes="(max-width: 1024px) 180px, 360px" unoptimized={author.photoUrl.startsWith('http')} />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-[88px] font-semibold text-blue-300">
                    {author.name.charAt(0)}
                  </div>
                )}
              </div>
              <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-5">
                <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-blue-300">{badge}</div>
                <div className="mt-3 text-[14px] font-light leading-[1.7] text-white/55">
                  {experience.positioning.join(' · ')}
                </div>
              </div>
            </div>

            <div>
              <div className="mb-4 flex items-center gap-3">
                <span className="block h-px w-8 bg-blue-400" />
                <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-blue-300">{experience.heroLabel}</span>
              </div>
              <h1
                className="max-w-[780px] text-white"
                style={{ fontFamily: "'Libre Baskerville', serif", fontSize: 'clamp(44px,6vw,76px)', fontWeight: 700, lineHeight: 1.02, letterSpacing: 0 }}
              >
                {author.name}
              </h1>
              <p className="mt-5 max-w-[720px] text-[18px] font-light leading-[1.85] text-white/55">
                {experience.heroDeck}
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                {experience.readerCallsToAction.map((action) => (
                  <Link
                    key={action.href}
                    href={action.href}
                    className={
                      action.kind === 'primary'
                        ? 'rounded-full bg-blue-500 px-7 py-3 text-[13px] font-semibold text-white transition-colors hover:bg-blue-600'
                        : 'rounded-full border border-white/15 px-7 py-3 text-[13px] text-white/65 transition-all hover:border-blue-400 hover:text-blue-300'
                    }
                  >
                    {action.label}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white px-6 py-20 sm:px-12">
        <div className="mx-auto grid max-w-[1280px] gap-12 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
          <div>
            <div className="mb-4 flex items-center gap-3">
              <span className="block h-px w-8 bg-blue-500" />
              <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-blue-500">Featured Book</span>
            </div>
            <h2
              className="text-charcoal"
              style={{ fontFamily: "'Libre Baskerville', serif", fontSize: 'clamp(32px,4.5vw,56px)', fontWeight: 700, lineHeight: 1.08, letterSpacing: 0 }}
            >
              {experience.featuredTitleDisplay}
            </h2>
            <p className="mt-5 max-w-[680px] text-[16px] font-light leading-[1.85] text-gray-500">
              {featuredTitle.shortDescription || 'A J Merrill Publishing catalog title by Kimberly Reeder.'}
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              {featuredTitle.formats.map((format) => (
                <span key={format} className="rounded-full border border-gray-200 bg-[#F7F8FA] px-3 py-1.5 text-[10px] uppercase tracking-[0.08em] text-gray-500">
                  {format}
                </span>
              ))}
            </div>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href={`/books/${featuredTitle.slug || featuredTitle.id}`} className="rounded-full bg-[#0F1C2E] px-7 py-3 text-[13px] font-semibold text-white transition-colors hover:bg-blue-600">
                View Book Page
              </Link>
              {featuredTitle.purchaseLinks.slice(0, 2).map((link) => (
                <a
                  key={`${link.retailer}-${link.href}`}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-full border border-gray-300 px-7 py-3 text-[13px] text-gray-600 transition-all hover:border-blue-500 hover:text-blue-500"
                >
                  {link.label || link.retailer}
                </a>
              ))}
            </div>
          </div>

          <Link href={`/books/${featuredTitle.slug || featuredTitle.id}`} className="relative mx-auto aspect-[3/4] w-full max-w-[360px] overflow-hidden rounded-[28px] border border-gray-200 bg-[#0B1320] shadow-[0_28px_80px_rgba(15,28,46,0.18)]">
            {featuredTitle.coverUrl ? (
              <Image
                src={featuredTitle.coverUrl}
                alt={featuredTitle.title}
                fill
                className="object-contain p-4"
                sizes="(max-width: 1024px) 80vw, 360px"
                unoptimized={coverIsRemote}
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center p-12">
                <Image src="/logo.jpg" alt="J Merrill Publishing logo" width={140} height={140} className="opacity-90" />
              </div>
            )}
          </Link>
        </div>
      </section>

      <section className="bg-[#F7F8FA] px-6 py-20 sm:px-12">
        <div className="mx-auto max-w-[1280px]">
          <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr]">
            <div>
              <div className="mb-4 flex items-center gap-3">
                <span className="block h-px w-8 bg-blue-500" />
                <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-blue-500">Author Presence</span>
              </div>
              <h2
                className="text-charcoal"
                style={{ fontFamily: "'Libre Baskerville', serif", fontSize: 'clamp(30px,4vw,50px)', fontWeight: 700, lineHeight: 1.08, letterSpacing: 0 }}
              >
                A dedicated home for the author and the work.
              </h2>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              {[
                { label: 'Catalog titles', value: String(author.titleCount) },
                { label: 'Formats', value: featuredTitle.formats.join(', ') || 'Catalog formats' },
                { label: 'Imprint', value: featuredTitle.certifiedImprint || 'J Merrill Publishing' },
              ].map((item) => (
                <div key={item.label} className="rounded-[20px] border border-gray-200 bg-white p-5">
                  <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-gray-400">{item.label}</div>
                  <div className="mt-3 text-[18px] font-semibold text-[#0F1C2E]">{item.value}</div>
                </div>
              ))}
            </div>
          </div>

          {supportingTitles.length > 0 ? (
            <div className="mt-12 grid grid-cols-2 gap-4 lg:grid-cols-4">
              {supportingTitles.map((book) => (
                <BookCard key={book.id} book={catalogTitleToBookCardRecord(book)} compact />
              ))}
            </div>
          ) : null}
        </div>
      </section>
    </div>
  )
}
