import type { Metadata } from 'next'
import Link from 'next/link'

import { AuthorGate } from '../_components/AuthorGate'
import { AuthorPortalShell } from '../_components/AuthorPortalShell'
import { authorWorkspaceModules, commissioningTitle } from '@/lib/publishing/author-workspace-modules'

export const metadata: Metadata = {
  title: 'Author Workspace | J Merrill Publishing',
  description: 'Private author workspace for active J Merrill Publishing projects.',
  robots: {
    index: false,
    follow: false,
  },
}

export default function AuthorPortalPage() {
  return (
    <AuthorPortalShell
      eyebrow="Author Workspace"
      title="Welcome to your publishing workspace."
      description="See what needs your attention now, what J Merrill Publishing is preparing next, and where your book stands in the publishing journey."
    >
      <AuthorGate scope="portal">
        <section className="space-y-6">
          <div className="rounded-[32px] border border-blue-500/20 bg-blue-500/[0.06] p-7 sm:p-9">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-blue-300">Active project</p>
                <h2 className="mt-3 text-[28px] font-semibold text-white">{commissioningTitle.title}</h2>
                <p className="mt-2 text-[14px] font-light leading-[1.75] text-white/52">{commissioningTitle.packageName}</p>
              </div>
              <div className="rounded-2xl border border-rose-300/15 bg-rose-400/[0.06] px-5 py-4">
                <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-rose-100/70">Release status</p>
                <p className="mt-2 text-[14px] font-semibold text-white">{commissioningTitle.distributionStatus}</p>
              </div>
            </div>
            <p className="mt-7 text-[14px] font-light leading-[1.85] text-white/50">
              Your agreement and initial setup are complete. The workspace is now open for the active publishing path.
              Public release, retailer submission, preorder, and distribution actions remain paused until release approval.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {authorWorkspaceModules.map((module) => (
              <Link
                key={module.id}
                href={module.href}
                className="group rounded-[28px] border border-white/8 bg-white/[0.045] p-6 transition-colors hover:border-blue-300/40 hover:bg-blue-500/[0.08]"
              >
                <div className="flex items-start justify-between gap-4">
                  <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-blue-300">{module.eyebrow}</span>
                  <span className="rounded-full border border-white/10 px-3 py-1 text-[10px] uppercase tracking-[0.1em] text-white/45">
                    {module.status}
                  </span>
                </div>
                <h2 className="mt-4 text-[22px] font-semibold text-white">{module.title}</h2>
                <p className="mt-3 text-[14px] font-light leading-[1.75] text-white/52">{module.summary}</p>
                <span className="mt-6 inline-flex text-[13px] font-semibold text-blue-300 transition-colors group-hover:text-blue-100">
                  Open module →
                </span>
              </Link>
            ))}
          </div>
        </section>
      </AuthorGate>
    </AuthorPortalShell>
  )
}
