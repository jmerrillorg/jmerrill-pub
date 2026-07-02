import type { Metadata } from 'next'
import Link from 'next/link'

import {
  editorialAuthorWorkspaceRows,
  editorialBoundaries,
  editorialCanonSources,
  editorialDataverseSources,
  editorialHardStops,
  editorialStages,
  editorialStatusRows,
  editorialStyleGuides,
  editorialSummary,
  internalStyleOverlays,
  type EditorialTone,
} from '@/lib/publishing/editorial-command-center'

export const metadata: Metadata = {
  title: 'Editorial Command Center | J Merrill Publishing',
  description: 'Governed editorial orchestration command center for J Merrill Publishing titles.',
  robots: {
    index: false,
    follow: false,
  },
}

const toneClasses: Record<EditorialTone, string> = {
  complete: 'border-emerald-400/20 bg-emerald-400/10 text-emerald-200',
  active: 'border-blue-400/25 bg-blue-500/10 text-blue-200',
  pending: 'border-amber-300/20 bg-amber-300/10 text-amber-100',
  blocked: 'border-rose-300/20 bg-rose-400/10 text-rose-100',
}

export default function EditorialCommandCenterPage() {
  return (
    <div className="min-h-screen bg-[#0F1C2E] pt-[76px] text-white">
      <div
        className="pointer-events-none fixed inset-0"
        style={{ background: 'radial-gradient(ellipse 64% 44% at 50% 18%, rgba(30,144,255,0.09) 0%, transparent 68%)' }}
      />

      <main className="relative z-10 mx-auto max-w-[1280px] px-6 py-16 sm:px-8 sm:py-20 lg:px-12">
        <section className="mb-8 rounded-[32px] border border-blue-500/20 bg-blue-500/[0.06] p-7 sm:p-9">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-blue-300">OP-005 Editorial</p>
              <h1
                className="mt-3 max-w-[840px] text-white"
                style={{ fontFamily: "'Libre Baskerville', serif", fontSize: 'clamp(36px,5vw,58px)', fontWeight: 700, lineHeight: 1.06 }}
              >
                Editorial orchestration without generic editing shortcuts.
              </h1>
              <p className="mt-4 max-w-[780px] text-[15px] font-light leading-[1.8] text-white/52">
                Track imprint confirmation, Editorial Review, stage routing, style-guide carry-forward, hard-stop
                holds, author approval requests, and production handoffs while JM Editorial Doctrine remains the
                editing authority.
              </p>
            </div>
            <Link
              href="/author"
              className="inline-flex h-12 items-center justify-center self-end rounded-full border border-blue-400/25 px-5 text-[12px] font-semibold uppercase tracking-[0.08em] text-blue-200 transition-colors hover:border-blue-300 hover:text-white"
            >
              Author hub
            </Link>
          </div>
        </section>

        <section className="mb-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Object.entries(editorialSummary).map(([label, value]) => (
            <div key={label} className="rounded-2xl border border-white/8 bg-white/[0.035] p-5">
              <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-white/30">{formatLabel(label)}</p>
              <p className="mt-2 text-[14px] font-medium leading-[1.55] text-white/75">{value}</p>
            </div>
          ))}
        </section>

        <section className="mb-8 rounded-[32px] border border-white/8 bg-white/[0.035] p-7 sm:p-9">
          <div className="mb-7 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-blue-300">Stage path</p>
              <h2 className="mt-3 text-[26px] font-semibold text-white">Stage 3 through Stage 8 readiness.</h2>
            </div>
            <p className="max-w-[420px] text-[12px] leading-[1.7] text-white/34">
              Stage 7a hands off to OP-007 for layout, then Stage 7b re-enters editorial for production proofread.
            </p>
          </div>
          <div className="grid gap-4 lg:grid-cols-3">
            {editorialStages.map((stage, index) => (
              <div key={stage.id} className="rounded-2xl border border-white/8 bg-black/15 p-5">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-mono text-[11px] text-white/28">{String(index + 1).padStart(2, '0')}</span>
                  <span className={`rounded-full border px-3 py-1 text-[10px] uppercase tracking-[0.1em] ${toneClasses[stage.tone]}`}>
                    {stage.status}
                  </span>
                </div>
                <h3 className="mt-4 text-[16px] font-semibold text-white">{stage.label}</h3>
                <p className="mt-3 text-[12px] font-light leading-[1.7] text-white/40">{stage.description}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mb-8 grid gap-5 lg:grid-cols-[minmax(0,1fr)_390px]">
          <div className="rounded-[32px] border border-white/8 bg-white/[0.035] p-7 sm:p-9">
            <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-blue-300">Canon controls</p>
            <h2 className="mt-3 text-[26px] font-semibold text-white">Style matrix and author boundary.</h2>
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {editorialStatusRows.map(([label, value]) => (
                <div key={label} className="rounded-2xl border border-white/8 bg-black/15 p-5">
                  <h3 className="text-[15px] font-semibold text-white">{label}</h3>
                  <p className="mt-2 text-[13px] font-light leading-[1.7] text-white/38">{value}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-5">
            <div className="rounded-[32px] border border-white/8 bg-white/[0.035] p-6">
              <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-blue-300">14 style guides</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {editorialStyleGuides.map((guide) => (
                  <span key={guide} className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[12px] text-white/70">
                    {guide}
                  </span>
                ))}
              </div>
            </div>

            <div className="rounded-[32px] border border-white/8 bg-white/[0.035] p-6">
              <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-blue-300">Internal overlays</p>
              <ul className="mt-4 space-y-2">
                {internalStyleOverlays.map((overlay) => (
                  <li key={overlay} className="text-[12px] leading-[1.65] text-white/58">{overlay}</li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <section className="mb-8 grid gap-5 lg:grid-cols-2">
          <div className="rounded-[32px] border border-white/8 bg-white/[0.035] p-7">
            <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-blue-300">Canon source</p>
            <div className="mt-5 space-y-4">
              {editorialCanonSources.map(([label, value]) => (
                <div key={label} className="border-b border-white/8 pb-4 last:border-b-0 last:pb-0">
                  <h3 className="text-[14px] font-semibold text-white">{label}</h3>
                  <p className="mt-1 text-[12px] leading-[1.65] text-white/38">{value}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[32px] border border-white/8 bg-white/[0.035] p-7">
            <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-blue-300">Dataverse references</p>
            <div className="mt-5 space-y-4">
              {Object.entries(editorialDataverseSources).map(([label, source]) => (
                <div key={label} className="border-b border-white/8 pb-4 last:border-b-0 last:pb-0">
                  <h3 className="text-[14px] font-semibold text-white">{formatLabel(label)}</h3>
                  <p className="mt-1 text-[12px] leading-[1.65] text-white/38">
                    {source.logicalName} / {source.entitySet}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[32px] border border-rose-300/15 bg-rose-400/[0.055] p-7 lg:col-span-2">
            <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-rose-100/70">Hard stops</p>
            <ul className="mt-4 space-y-2">
              {editorialHardStops.map((stop) => (
                <li key={stop} className="text-[12px] leading-[1.65] text-white/58">{stop}</li>
              ))}
            </ul>
          </div>
        </section>

        <section className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="rounded-[32px] border border-white/8 bg-white/[0.035] p-7 sm:p-9">
            <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-blue-300">Author Workspace exposure</p>
            <h2 className="mt-3 text-[26px] font-semibold text-white">Only safe progress appears to authors.</h2>
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {editorialAuthorWorkspaceRows.map(([label, value]) => (
                <div key={label} className="rounded-2xl border border-white/8 bg-black/15 p-5">
                  <h3 className="text-[15px] font-semibold text-white">{label}</h3>
                  <p className="mt-2 text-[13px] font-light leading-[1.7] text-white/38">{value}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[32px] border border-rose-300/15 bg-rose-400/[0.055] p-6">
            <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-rose-100/70">Boundaries</p>
            <ul className="mt-4 space-y-2">
              {editorialBoundaries.map((boundary) => (
                <li key={boundary} className="text-[12px] leading-[1.65] text-white/58">{boundary}</li>
              ))}
            </ul>
          </div>
        </section>
      </main>
    </div>
  )
}

function formatLabel(value: string) {
  return value.replace(/([A-Z])/g, ' $1').trim()
}
