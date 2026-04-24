'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import type { ImprintSlug } from '@/data/imprints'
import { getImprintStrategyBySlug, imprintStrategies } from '@/data/imprints'
import { ReaderSignupForm } from './ReaderSignupForm'

type ReaderFunnelSectionProps = {
  initialImprintSlug?: ImprintSlug | null
  contextBookId?: string
  contextTitle?: string
}

export function ReaderFunnelSection({
  initialImprintSlug = null,
  contextBookId = '',
  contextTitle = '',
}: ReaderFunnelSectionProps) {
  const [selectedImprintSlug, setSelectedImprintSlug] = useState<ImprintSlug | null>(initialImprintSlug)

  const selectedImprint = useMemo(
    () => getImprintStrategyBySlug(selectedImprintSlug),
    [selectedImprintSlug],
  )

  function selectImprint(slug: ImprintSlug) {
    setSelectedImprintSlug(slug)

    if (typeof document !== 'undefined') {
      window.setTimeout(() => {
        document.getElementById('reader-signup')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 80)
    }
  }

  return (
    <div className="grid gap-8 xl:grid-cols-[1.15fr_0.85fr]">
      <div>
        <div className="grid gap-4 md:grid-cols-2">
          {imprintStrategies.map((imprint) => {
            const active = imprint.slug === selectedImprintSlug

            return (
              <button
                key={imprint.slug}
                type="button"
                onClick={() => selectImprint(imprint.slug)}
                className={`rounded-[28px] border p-6 text-left transition-all duration-200 ${
                  active
                    ? 'border-blue-500 bg-blue-500/[0.08] shadow-[0_18px_48px_rgba(30,144,255,0.14)]'
                    : 'border-gray-200 bg-white hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-[0_16px_40px_rgba(15,28,46,0.08)]'
                }`}
              >
                <div className={`font-mono text-[10px] uppercase tracking-[0.14em] ${active ? 'text-blue-500' : 'text-blue-500/80'}`}>
                  {imprint.label}
                </div>
                <h3
                  className={`mt-3 ${active ? 'text-charcoal' : 'text-charcoal'}`}
                  style={{ fontFamily: "'Libre Baskerville', serif", fontSize: '24px', fontWeight: 700, lineHeight: 1.15 }}
                >
                  {imprint.readerPathLabel}
                </h3>
                <p className="mt-3 text-[14px] font-light leading-[1.8] text-gray-500">{imprint.readerPathSummary}</p>
                <div className="mt-5 flex items-center justify-between gap-3">
                  <span className="text-[12px] text-gray-400">Focus: {imprint.recommendedCtaEmphasis}</span>
                  <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-blue-500">Select</span>
                </div>
              </button>
            )
          })}
        </div>

        <div className="mt-8 rounded-[28px] border border-gray-200 bg-[#F7F8FA] p-6">
          <div className="grid gap-4 md:grid-cols-3">
            {[
              {
                title: 'New releases',
                body: 'Stay close to upcoming books across the J Merrill Publishing family before the wider market catches up.',
              },
              {
                title: 'Special editions',
                body: 'Hear first about curated editions, flagship drops, and imprint-led release moments.',
              },
              {
                title: 'Exclusive content',
                body: 'Get reader extras, behind-the-book insights, and direct website-first discovery.',
              },
            ].map((item) => (
              <div key={item.title} className="rounded-[22px] border border-white bg-white px-5 py-5">
                <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-blue-500">{item.title}</div>
                <p className="mt-3 text-[14px] font-light leading-[1.8] text-gray-500">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div id="reader-signup" className="xl:sticky xl:top-28">
        <ReaderSignupForm
          imprintSlug={selectedImprintSlug}
          source="Book CTA"
          contextBookId={contextBookId}
          contextTitle={contextTitle}
        />

        <div className="mt-5 rounded-[24px] border border-white/10 bg-white/[0.03] p-5">
          <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-blue-400">Reader path</div>
          <p className="mt-3 text-[14px] font-light leading-[1.8] text-white/45">
            {selectedImprint
              ? `${selectedImprint.label} readers hear first about ${selectedImprint.recommendedCtaEmphasis}.`
              : 'Choose an imprint to tailor what reaches your inbox.'}
          </p>
          <div className="mt-5 flex flex-wrap gap-4 text-[13px]">
            <Link href="/books" className="text-white/40 transition-colors hover:text-blue-400">
              Browse titles
            </Link>
            <Link href="/about" className="text-white/40 transition-colors hover:text-blue-400">
              About J Merrill Publishing
            </Link>
            {selectedImprint ? (
              <Link href={selectedImprint.pageHref} className="text-white/40 transition-colors hover:text-blue-400">
                Explore {selectedImprint.label}
              </Link>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}
