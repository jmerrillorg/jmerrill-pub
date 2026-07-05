import Link from 'next/link'

import { AuthorGate } from './AuthorGate'
import type { AuthorWorkspaceModule } from '@/lib/publishing/author-workspace-modules'
import { commissioningTitle } from '@/lib/publishing/author-workspace-modules'

const toneClasses: Record<AuthorWorkspaceModule['tone'], string> = {
  complete: 'border-emerald-400/20 bg-emerald-400/10 text-emerald-200',
  active: 'border-blue-400/25 bg-blue-500/10 text-blue-200',
  pending: 'border-amber-300/20 bg-amber-300/10 text-amber-100',
  hold: 'border-rose-300/20 bg-rose-400/10 text-rose-100',
}

export function AuthorWorkspaceModulePage({ module }: { module: AuthorWorkspaceModule }) {
  return (
    <div className="min-h-screen bg-[#0F1C2E] pt-[76px] text-white">
      <main className="mx-auto max-w-[1120px] px-6 py-14 sm:px-8 sm:py-18 lg:px-12">
        <Link href="/author/portal" className="mb-8 inline-flex text-[13px] text-white/40 transition-colors hover:text-blue-300">
          ← Back to Author Workspace
        </Link>

        <AuthorGate scope="portal">
          <section className="rounded-[32px] border border-blue-500/20 bg-blue-500/[0.06] p-7 sm:p-9">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div className="max-w-[760px]">
                <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-blue-300">{module.eyebrow}</p>
                <h1
                  className="mt-3 text-white"
                  style={{ fontFamily: "'Libre Baskerville', serif", fontSize: 'clamp(36px,5vw,62px)', fontWeight: 700, lineHeight: 1.05 }}
                >
                  {module.title}
                </h1>
                <p className="mt-4 text-[16px] font-light leading-[1.8] text-white/55">{module.summary}</p>
              </div>
              <span className={`inline-flex w-fit rounded-full border px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.1em] ${toneClasses[module.tone]}`}>
                {module.status}
              </span>
            </div>
          </section>

          <section className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1fr)_330px]">
            <div className="space-y-5">
              <div className="rounded-[28px] border border-white/8 bg-white/[0.04] p-6 sm:p-7">
                <h2 className="text-[22px] font-semibold text-white">Why this step matters</h2>
                <p className="mt-3 text-[14px] font-light leading-[1.8] text-white/50">{module.whyItMatters}</p>
              </div>

              <div className="rounded-[28px] border border-white/8 bg-white/[0.04] p-6 sm:p-7">
                <h2 className="text-[22px] font-semibold text-white">Current focus</h2>
                <p className="mt-3 text-[14px] font-light leading-[1.8] text-white/50">{module.currentFocus}</p>
              </div>

              <div className="rounded-[28px] border border-blue-500/20 bg-blue-500/[0.06] p-6 sm:p-7">
                <h2 className="text-[22px] font-semibold text-white">What comes next</h2>
                <p className="mt-3 text-[14px] font-light leading-[1.8] text-white/58">{module.nextStep}</p>
              </div>
            </div>

            <aside className="space-y-5">
              <div className="rounded-[28px] border border-white/8 bg-white/[0.04] p-6">
                <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-blue-300">Project</p>
                <h2 className="mt-3 text-[20px] font-semibold text-white">{commissioningTitle.title}</h2>
                <p className="mt-2 text-[13px] font-light leading-[1.7] text-white/45">{commissioningTitle.packageName}</p>
              </div>

              <div className="rounded-[28px] border border-white/8 bg-white/[0.04] p-6">
                <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-blue-300">Checklist</p>
                <ul className="mt-4 space-y-3">
                  {module.checklist.map((item) => (
                    <li key={item} className="flex gap-3 text-[13px] leading-[1.6] text-white/55">
                      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-400" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {module.note ? (
                <div className="rounded-[28px] border border-rose-300/15 bg-rose-400/[0.06] p-6">
                  <p className="text-[13px] font-light leading-[1.75] text-white/58">{module.note}</p>
                </div>
              ) : null}
            </aside>
          </section>
        </AuthorGate>
      </main>
    </div>
  )
}
