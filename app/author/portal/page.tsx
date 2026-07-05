import type { Metadata } from 'next'
import Link from 'next/link'

import { AuthorGate } from '../_components/AuthorGate'
import { AuthorPortalShell } from '../_components/AuthorPortalShell'

export const metadata: Metadata = {
  title: 'Author Workspace | J Merrill Publishing',
  description: 'Private pre-contract author workspace for accepted J Merrill Publishing projects.',
  robots: {
    index: false,
    follow: false,
  },
}

const setupSteps = [
  {
    label: 'Author Onboarding',
    description: 'Confirm your author details, mailing address, and book information.',
    href: '/author/onboarding',
  },
  {
    label: 'Payment & Royalty Setup',
    description: 'Securely connect Stripe so payments and royalties can be handled safely.',
    href: '/author/financial-setup',
  },
]

export default function AuthorPortalPage() {
  return (
    <AuthorPortalShell
      eyebrow="Author Workspace"
      title="Your Author Workspace is ready."
      description="Complete these setup steps so we can prepare your publishing agreement and begin your publishing journey."
    >
      <AuthorGate scope="portal">
        <section className="rounded-[32px] border border-blue-500/20 bg-blue-500/[0.06] p-7 sm:p-9">
          <div className="grid gap-4 md:grid-cols-2">
            {setupSteps.map((step, index) => (
              <Link
                key={step.label}
                href={step.href}
                className="group rounded-[28px] border border-white/8 bg-white/[0.045] p-6 transition-colors hover:border-blue-300/40 hover:bg-blue-500/[0.08]"
              >
                <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-blue-300">Step {index + 1}</span>
                <h2 className="mt-4 text-[22px] font-semibold text-white">{step.label}</h2>
                <p className="mt-3 text-[14px] font-light leading-[1.75] text-white/52">{step.description}</p>
                <span className="mt-6 inline-flex text-[13px] font-semibold text-blue-300 transition-colors group-hover:text-blue-100">
                  Open step →
                </span>
              </Link>
            ))}
          </div>
          <p className="mt-7 text-[13px] font-light leading-[1.8] text-white/45">
            Additional publishing tools will unlock after your agreement is signed and your initial payment is confirmed.
          </p>
        </section>
      </AuthorGate>
    </AuthorPortalShell>
  )
}
