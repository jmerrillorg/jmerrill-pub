import type { Metadata } from 'next'
import Link from 'next/link'
import { Suspense } from 'react'
import BooksClient from './BooksClient'
import { bookCatalog, imprintCatalog } from '@/lib/content'
import { CTASection } from '@/components/content/CTASection'

export const metadata: Metadata = {
  title: 'Books',
  description:
    'Browse the J Merrill Publishing catalog across books, formats, authors, and imprints from the flagship publishing brand of J Merrill One.',
}

export default function BooksPage() {
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
            <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-blue-400">Published Catalog</span>
          </div>
          <h1
            className="mb-4 text-white"
            style={{ fontFamily: "'Libre Baskerville', serif", fontSize: 'clamp(40px,5vw,68px)', fontWeight: 700, lineHeight: 1.05, letterSpacing: '-0.02em' }}
          >
            {bookCatalog.length}+ titles.
            <br />
            <em className="not-italic italic text-blue-500">{imprintCatalog.length} imprints. Direct authority.</em>
          </h1>
          <p className="max-w-[620px] text-[17px] font-light leading-[1.75] text-white/40">
            Every title lives here with its own domain authority, author relationship context, and future-ready content structure. This catalog is built to strengthen jmerrill.pub, not just hand traffic away.
          </p>
        </div>
      </section>

      <Suspense
        fallback={
          <div className="bg-[#070710] py-20 text-center">
            <div className="text-[14px] font-light text-white/20">Loading catalog...</div>
          </div>
        }
      >
        <BooksClient />
      </Suspense>

      <section className="border-t border-white/5 bg-[#0F1C2E] px-6 py-16 sm:px-12">
        <div className="mx-auto flex max-w-[1280px] flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-[680px]">
            <div className="mb-3 font-mono text-[10px] uppercase tracking-[0.12em] text-blue-400">
              Catalog as platform
            </div>
            <p className="text-[15px] font-light leading-[1.8] text-white/45">
              Every book page is structured to support richer descriptions, author context, keyword depth,
              excerpts, quotes, and future Dataverse-powered metadata. The catalog is now a real platform foundation.
            </p>
          </div>
          <div className="flex flex-wrap gap-4">
            <Link href="/authors" className="rounded-full bg-blue-500 px-8 py-3.5 text-[14px] font-semibold text-white transition-colors hover:bg-blue-600">
              Meet the authors
            </Link>
            <Link href="/join" className="rounded-full border border-white/15 px-8 py-3.5 text-[14px] text-white/60 transition-all hover:border-blue-500 hover:text-blue-400">
              Join the Family
            </Link>
          </div>
        </div>
      </section>

      <CTASection
        eyebrow="Add Your Title"
        title={
          <>
            Ready to publish into
            <br />
            the flagship catalog?
          </>
        }
        description="Every book on this page is part of the J Merrill Publishing family. Start your path and we’ll help position your title with the same premium standard."
        primary={{ label: 'Join the Family', href: '/join' }}
        secondary={{ label: 'Explore publishing', href: '/publishing' }}
      />
    </div>
  )
}
