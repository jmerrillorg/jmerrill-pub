import type { Metadata } from 'next'

import { AuthorGate } from '../_components/AuthorGate'
import { AuthorPortalShell } from '../_components/AuthorPortalShell'
import { AuthorSetupForm, onboardingFields } from '../_components/AuthorSetupForm'
import { getAuthorPortalContextFromCookies } from '@/lib/server/author-portal-context'

export const metadata: Metadata = {
  title: 'Author Onboarding | J Merrill Publishing',
  description: 'Private author onboarding for J Merrill Publishing authors joining the family.',
  robots: {
    index: false,
    follow: false,
  },
}

export default async function AuthorOnboardingPage() {
  const context = await getAuthorPortalContextFromCookies()
  const onboardingAlreadyComplete = Boolean(context && !context.tasks.authorProfileRequired)

  return (
    <AuthorPortalShell
      eyebrow="Author onboarding"
      title="Complete author onboarding."
      description="Confirm your author details, mailing address, and book information so we can prepare your publishing agreement."
    >
      <AuthorGate scope="portal">
        {onboardingAlreadyComplete ? (
          <div className="rounded-[32px] border border-blue-500/25 bg-blue-500/[0.06] p-10 text-center">
            <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-blue-500 text-[24px] text-white">✓</div>
            <h2
              className="text-white"
              style={{ fontFamily: "'Libre Baskerville', serif", fontSize: '30px', fontWeight: 700 }}
            >
              Your author profile is already on file.
            </h2>
            <p className="mx-auto mt-3 max-w-[560px] text-[14px] font-light leading-[1.8] text-white/45">
              You do not need to repeat onboarding for this author relationship. Return to your workspace to continue with the correct project and next action.
            </p>
            <div className="mt-7">
              <a
                href="/author/portal"
                className="inline-flex items-center justify-center rounded-full border border-blue-500/25 px-6 py-3 text-[13px] font-semibold uppercase tracking-[0.08em] text-blue-300 transition-all hover:border-blue-400 hover:text-blue-200"
              >
                Return to Author Workspace →
              </a>
            </div>
          </div>
        ) : (
          <AuthorSetupForm
            endpoint="/api/author/onboarding"
            fields={onboardingFields}
            submitLabel="Submit onboarding"
            successTitle="Your onboarding intake has been received."
            successMessage="A notification has been sent to publishing@jmerrill.one. You can expect a follow-up within 1–2 business days."
            successDetails={['Next step: complete Payment & Royalty Setup in your Author Workspace.']}
            successLink={{ href: '/author/portal', label: 'Return to Author Workspace' }}
            failureMessage="We could not submit your onboarding form at this time. Please try again or contact publishing@jmerrill.one."
          />
        )}
      </AuthorGate>
    </AuthorPortalShell>
  )
}
