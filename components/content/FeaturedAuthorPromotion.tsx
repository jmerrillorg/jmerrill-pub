import Image from 'next/image'
import Link from 'next/link'
import type { CatalogAuthorDetail, CatalogAuthorSummary, CatalogTitleSummary } from '@/lib/catalog/types'
import type { FeaturedAuthorExperience } from '@/data/author-experience'

type FeaturedAuthorPromotionProps = {
  featured: FeaturedAuthorExperience
  author: CatalogAuthorSummary | CatalogAuthorDetail
  title: CatalogTitleSummary
  compact?: boolean
}

export function FeaturedAuthorPromotion({
  featured,
  author,
  title,
  compact = false,
}: FeaturedAuthorPromotionProps) {
  const coverIsRemote = title.coverUrl.startsWith('http')

  return (
    <section className={compact ? 'bg-[#0F1C2E] px-6 py-14 sm:px-12' : 'bg-[#0F1C2E] px-6 py-20 sm:px-12'}>
      <div className="mx-auto grid max-w-[1280px] gap-10 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
        <div>
          <div className="mb-4 flex items-center gap-3">
            <span className="block h-px w-8 bg-blue-400" />
            <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-blue-300">
              Featured Author · November 2026
            </span>
          </div>
          <h2
            className="max-w-[720px] text-white"
            style={{
              fontFamily: "'Libre Baskerville', serif",
              fontSize: compact ? 'clamp(30px,4vw,48px)' : 'clamp(36px,5vw,64px)',
              fontWeight: 700,
              lineHeight: 1.06,
              letterSpacing: 0,
            }}
          >
            {author.name}
          </h2>
          <p className="mt-5 max-w-[640px] text-[16px] font-light leading-[1.85] text-white/55">
            This month, J Merrill Publishing is highlighting {author.name} and the featured title{' '}
            <em className="text-white/75">{featured.featuredTitleDisplay}</em>.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href={`/authors/${author.slug}`}
              className="rounded-full bg-blue-500 px-7 py-3 text-[13px] font-semibold text-white transition-colors hover:bg-blue-600"
            >
              Visit Author Page
            </Link>
            <Link
              href={`/books/${title.slug || title.id}`}
              className="rounded-full border border-white/15 px-7 py-3 text-[13px] text-white/65 transition-all hover:border-blue-400 hover:text-blue-300"
            >
              View Featured Book
            </Link>
          </div>
        </div>

        <Link
          href={`/books/${title.slug || title.id}`}
          className="grid gap-6 rounded-[28px] border border-white/10 bg-white/[0.04] p-5 transition-all hover:border-blue-400/45 md:grid-cols-[160px_1fr]"
        >
          <div className="relative aspect-[3/4] overflow-hidden rounded-[18px] border border-white/10 bg-[#08101d]">
            {title.coverUrl ? (
              <Image
                src={title.coverUrl}
                alt={title.title}
                fill
                className="object-contain p-2"
                sizes="160px"
                unoptimized={coverIsRemote}
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center p-8">
                <Image src="/logo.jpg" alt="J Merrill Publishing logo" width={96} height={96} className="opacity-90" />
              </div>
            )}
          </div>
          <div className="flex flex-col justify-center">
            <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-blue-300">Featured Title</div>
            <h3
              className="mt-3 text-white"
              style={{ fontFamily: "'Libre Baskerville', serif", fontSize: 'clamp(24px,3vw,36px)', fontWeight: 700, lineHeight: 1.12 }}
            >
              {featured.featuredTitleDisplay}
            </h3>
            <p className="mt-4 line-clamp-3 text-[14px] font-light leading-[1.8] text-white/48">
              {title.shortDescription || 'A J Merrill Publishing catalog title by Kimberly Reeder.'}
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              {title.formats.map((format) => (
                <span key={format} className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[10px] uppercase tracking-[0.08em] text-white/45">
                  {format}
                </span>
              ))}
            </div>
          </div>
        </Link>
      </div>
    </section>
  )
}
