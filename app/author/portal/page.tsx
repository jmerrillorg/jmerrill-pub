import type { Metadata } from 'next'
import Link from 'next/link'

import { AuthorGate } from '../_components/AuthorGate'
import { AuthorPortalShell } from '../_components/AuthorPortalShell'
import {
  portalActivationSummary,
  portalBoundaryRows,
  portalFileControls,
  portalMilestones,
  portalReadinessCards,
  portalTasks,
  type PortalStatusTone,
} from '@/lib/publishing/author-portal-mvp'

export const metadata: Metadata = {
  title: 'Author Portal | J Merrill Publishing',
  description: 'Private pre-contract author portal for accepted J Merrill Publishing projects.',
  robots: {
    index: false,
    follow: false,
  },
}

const toneClasses: Record<PortalStatusTone, string> = {
  complete: 'border-emerald-400/20 bg-emerald-400/10 text-emerald-200',
  active: 'border-blue-400/25 bg-blue-500/10 text-blue-200',
  pending: 'border-amber-300/20 bg-amber-300/10 text-amber-100',
  locked: 'border-white/10 bg-white/[0.04] text-white/35',
}

export default function AuthorPortalPage() {
  return (
    <AuthorPortalShell
      eyebrow="Author portal MVP"
      title="Complete the steps below to begin your publishing journey."
      description="This private pre-contract portal collects the information needed to prepare your agreement package and first payment request. The full project portal unlocks only after agreement and payment requirements are complete."
    >
      <AuthorGate scope="portal">
        <div className="space-y-8">
          <section className="rounded-[32px] border border-blue-500/20 bg-blue-500/[0.06] p-7 sm:p-9">
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
              <div>
                <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-blue-300">Pre-contract portal</p>
                <h2
                  className="mt-3 text-white"
                  style={{ fontFamily: "'Libre Baskerville', serif", fontSize: '34px', fontWeight: 700, lineHeight: 1.12 }}
                >
                  Three setup steps unlock contract preparation.
                </h2>
                <p className="mt-3 max-w-[700px] text-[14px] font-light leading-[1.8] text-white/50">
                  Author Onboarding, Financial Setup, and Royalty Setup come before contract generation because the
                  agreement package depends on the information collected here. Dataverse remains the operational source
                  of truth.
                </p>
              </div>
              <Link
                href="mailto:publishing@jmerrill.one"
                className="inline-flex h-12 items-center justify-center self-end rounded-full border border-blue-400/25 px-5 text-[12px] font-semibold uppercase tracking-[0.08em] text-blue-200 transition-colors hover:border-blue-300 hover:text-white"
              >
                Contact publishing
              </Link>
            </div>
          </section>

          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {Object.entries(portalActivationSummary).map(([label, value]) => (
              <div key={label} className="rounded-2xl border border-white/8 bg-white/[0.035] p-5">
                <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-white/30">{formatLabel(label)}</p>
                <p className="mt-2 text-[14px] font-medium leading-[1.55] text-white/75">{value}</p>
              </div>
            ))}
          </section>

          <section className="rounded-[32px] border border-white/8 bg-white/[0.035] p-7 sm:p-9">
            <div className="mb-7 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-blue-300">Progress</p>
                <h2 className="mt-3 text-[26px] font-semibold text-white">Required setup before agreement.</h2>
              </div>
              <p className="max-w-[360px] text-[12px] leading-[1.7] text-white/32">
                Contract signing and payment actions appear only after all three setup steps are complete.
              </p>
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              {portalMilestones.map((milestone, index) => (
                <div key={milestone.label} className="rounded-2xl border border-white/8 bg-black/15 p-5">
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-mono text-[11px] text-white/28">0{index + 1}</span>
                    <span className={`rounded-full border px-3 py-1 text-[10px] uppercase tracking-[0.1em] ${toneClasses[milestone.tone]}`}>
                      {milestone.status}
                    </span>
                  </div>
                  <h3 className="mt-4 text-[16px] font-semibold text-white">{milestone.label}</h3>
                </div>
              ))}
            </div>
          </section>

          <section className="grid gap-5 lg:grid-cols-2">
            {portalTasks.map((task) => (
              <div key={task.id} className="rounded-[28px] border border-white/8 bg-white/[0.04] p-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <span className="font-mono text-[11px] uppercase tracking-[0.1em] text-white/35">{task.owner}</span>
                  <span className={`rounded-full border px-3 py-1 text-[10px] uppercase tracking-[0.1em] ${toneClasses[task.tone]}`}>
                    {task.status}
                  </span>
                </div>
                <h3 className="mt-4 text-[20px] font-semibold text-white">{task.label}</h3>
                <p className="mt-3 text-[13px] font-light leading-[1.75] text-white/42">{task.description}</p>
                {task.href ? (
                  <Link href={task.href} className="mt-5 inline-flex text-[13px] text-blue-300 transition-colors hover:text-blue-200">
                    Open step →
                  </Link>
                ) : null}
              </div>
            ))}
          </section>

          <section className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div className="rounded-[32px] border border-white/8 bg-white/[0.035] p-7 sm:p-9">
              <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-blue-300">Locked until active portal</p>
              <h2 className="mt-3 text-[26px] font-semibold text-white">Private project modules stay hidden.</h2>
              <div className="mt-6 grid gap-4 md:grid-cols-2">
                {portalFileControls.map(([heading, body]) => (
                  <div key={heading} className="rounded-2xl border border-white/8 bg-black/15 p-5">
                    <h3 className="text-[15px] font-semibold text-white">{heading}</h3>
                    <p className="mt-2 text-[13px] font-light leading-[1.7] text-white/38">{body}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-[32px] border border-white/8 bg-white/[0.035] p-6">
              <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-blue-300">Boundaries</p>
              <div className="mt-4 space-y-3">
                {portalBoundaryRows.map(([label, value]) => (
                  <div key={label} className="flex items-center justify-between gap-4 border-b border-white/8 pb-3 last:border-b-0 last:pb-0">
                    <span className="text-[12px] text-white/35">{label}</span>
                    <span className="text-right text-[12px] font-medium text-white/70">{value}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="rounded-[32px] border border-white/8 bg-white/[0.035] p-7 sm:p-9">
            <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-blue-300">Readiness signals</p>
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {portalReadinessCards.map(([heading, body]) => (
                <div key={heading} className="rounded-2xl border border-white/8 bg-black/15 p-5">
                  <h3 className="text-[15px] font-semibold text-white">{heading}</h3>
                  <p className="mt-2 text-[13px] font-light leading-[1.7] text-white/38">{body}</p>
                </div>
              ))}
            </div>
          </section>
        </div>
      </AuthorGate>
    </AuthorPortalShell>
  )
}

function formatLabel(value: string) {
  return value.replace(/([A-Z])/g, ' $1').trim()
}
