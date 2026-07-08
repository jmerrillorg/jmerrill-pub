import type { Metadata } from 'next'
import Link from 'next/link'
import { Suspense } from 'react'
import BooksClient from './BooksClient'
import { listPublicCatalogTitles } from '@/lib/server/dataverse/catalog'
import { CTASection } from '@/components/content/CTASection'

export const metadata: Metadata = {
  title: 'Books',
  description:
    'Browse books from the J Merrill Publishing family and explore the authors, imprints, and voices behind the work.',
}

export const dynamic = 'force-dynamic'

export default async function BooksPage() {
  const catalogResult = await listPublicCatalogTitles()
  const books = catalogResult.ok ? catalogResult.data : []
  const imprints = Array.from(new Set(books.map((book) => book.certifiedImprint).filter(Boolean))).sort()

  return (
    <div className="pt-[76px]">
      <section className="relative overflow-hidden border-b border-white/5 bg-[#070710] px-6 py-20 sm:px-12">
        <div
          className="absolute inset-0"
          style={{ background: 'radial-gradient(ellipse 50% 60% at 20% 50%, rgba(30,144,255,0.08) 0%, transparent 65%)' }}
        />
        <div
          className="pointer-events-none absolute -bottom-4 right-0 select-none"
          style={{
            fontFamily: "'Libre Baskerville', serif",
            fontSize: 'clamp(96px,14vw,200px)',
            fontWeight: 700,
            color: 'transparent',
            WebkitTextStroke: '1px rgba(255,255,255,0.025)',
            letterSpacing: '-0.05em',
            whiteSpace: 'nowrap',
          }}
        >
          Catalog
        </div>
        <div className="relative z-10 mx-auto max-w-[1280px]">
          <div className="mb-5 flex items-center gap-3">
            <span className="block h-px w-8 bg-blue-500" />
            <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-blue-400">Books From The JMP Family</span>
          </div>
          <h1
            className="mb-4 text-white"
            style={{ fontFamily: "'Libre Baskerville', serif", fontSize: 'clamp(40px,5vw,68px)', fontWeight: 700, lineHeight: 1.05, letterSpacing: '-0.02em' }}
          >
            Books from the
            <br />
            <em className="not-italic italic text-blue-500">J Merrill Publishing family.</em>
          </h1>
          <p className="max-w-[620px] text-[17px] font-light leading-[1.75] text-white/40">
            Every title in this catalog began with an author who had something to say. Explore the books, voices, stories, ministries, lessons, and legacy works that have found a publishing home with J Merrill Publishing.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            {[
              '125+ titles',
              imprints.length ? `${imprints.length} official imprints` : 'Official imprints',
              'Real authors and visible book pages',
            ].map((item) => (
              <div
                key={item}
                className="rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-[11px] uppercase tracking-[0.12em] text-white/55"
                style={{ fontFamily: "'DM Mono', monospace" }}
              >
                {item}
              </div>
            ))}
          </div>
        </div>
      </section>

      <Suspense
        fallback={
          <div className="bg-[#070710] py-20 text-center">
            <div className="text-[14px] font-light text-white/20">Loading catalog...</div>
          </div>
        }
      >
        <BooksClient books={books} imprints={imprints} unavailable={!catalogResult.ok} />
      </Suspense>

      <section className="border-t border-white/5 bg-[#0F1C2E] px-6 py-16 sm:px-12">
        <div className="mx-auto flex max-w-[1280px] flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-[680px]">
            <div className="mb-3 font-mono text-[10px] uppercase tracking-[0.12em] text-blue-400">
              What This Catalog Shows New Authors
            </div>
            <p className="text-[15px] font-light leading-[1.8] text-white/45">
              When you are choosing a publisher, look beyond promises. Look at the books, the authors, the range of voices, and the care given to the catalog. Your work should have a visible home, not disappear into a system.
            </p>
          </div>
          <div className="flex flex-wrap gap-4">
            <Link href="/authors" className="rounded-full bg-blue-500 px-8 py-3.5 text-[14px] font-semibold text-white transition-colors hover:bg-blue-600">
              Meet the Authors
            </Link>
            <Link href="/join" className="rounded-full border border-white/15 px-8 py-3.5 text-[14px] text-white/60 transition-all hover:border-blue-500 hover:text-blue-400">
              Tell Us About Your Book
            </Link>
          </div>
        </div>
      </section>

      <CTASection
        eyebrow="Final CTA"
        title={
          <>
            Could your book belong
            <br />
            in this family?
          </>
        }
        description="Tell us about your book, your message, and where you are in the journey. We will help you understand the publishing path that fits."
        primary={{ label: 'Tell Us About Your Book', href: '/join' }}
        secondary={{ label: 'Publish With Us', href: '/publishing' }}
      />
    </div>
  )
}
