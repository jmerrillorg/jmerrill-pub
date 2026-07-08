import type { Metadata } from 'next'
import Link from 'next/link'

import { AuthorGate } from '../_components/AuthorGate'
import { AuthorPortalShell } from '../_components/AuthorPortalShell'

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
      title="Your Author Workspace is ready."
      description="Complete these setup steps so we can prepare your publishing agreement and begin your publishing journey."
    >
      <AuthorGate scope="portal">
        <section className="space-y-6">
          <div className="rounded-[32px] border border-blue-500/20 bg-blue-500/[0.06] p-7 sm:p-9">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-blue-300">Pre-Contract Workspace</p>
                <h2 className="mt-3 text-[28px] font-semibold text-white">We just need these first setup steps.</h2>
                <p className="mt-3 max-w-[760px] text-[14px] font-light leading-[1.85] text-white/50">
                  Complete your author details and secure Stripe setup here. Once your agreement is signed and your
                  initial payment is confirmed, the rest of your publishing tools will unlock.
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {[
              {
                id: 'author-profile',
                href: '/author/onboarding',
                step: 'Step 1',
                title: 'Author Profile',
                summary: 'Confirm your author details, mailing address, and book information.',
                cta: 'Open Author Profile',
              },
              {
                id: 'payment-royalty-setup',
                href: '/author/financial-setup',
                step: 'Step 2',
                title: 'Payment & Royalty Setup',
                summary: 'Securely connect Stripe so payments and royalties can be handled safely.',
                cta: 'Open Stripe Setup',
              },
            ].map((module) => (
              <Link
                key={module.id}
                href={module.href}
                className="group rounded-[28px] border border-white/8 bg-white/[0.045] p-6 transition-colors hover:border-blue-300/40 hover:bg-blue-500/[0.08]"
              >
                <div className="flex items-start justify-between gap-4">
                  <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-blue-300">{module.step}</span>
                  <span className="rounded-full border border-blue-400/20 bg-blue-500/10 px-3 py-1 text-[10px] uppercase tracking-[0.1em] text-blue-200">
                    Ready
                  </span>
                </div>
                <h2 className="mt-4 text-[22px] font-semibold text-white">{module.title}</h2>
                <p className="mt-3 text-[14px] font-light leading-[1.75] text-white/52">{module.summary}</p>
                <span className="mt-6 inline-flex text-[13px] font-semibold text-blue-300 transition-colors group-hover:text-blue-100">
                  {module.cta} →
                </span>
              </Link>
            ))}
          </div>

          <div className="rounded-[28px] border border-white/8 bg-white/[0.035] p-6">
            <p className="text-[14px] font-light leading-[1.8] text-white/45">
              Additional publishing tools will unlock after your agreement is signed and your initial payment is
              confirmed.
            </p>
          </div>
        </section>
      </AuthorGate>
    </AuthorPortalShell>
  )
}
