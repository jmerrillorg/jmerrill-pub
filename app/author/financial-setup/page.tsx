import type { Metadata } from 'next'

import { AuthorGate } from '../_components/AuthorGate'
import { AuthorPortalShell } from '../_components/AuthorPortalShell'
import { StripeConnectSetupCard } from '../_components/StripeConnectSetupCard'
import { getAuthorPortalContextFromCookies } from '@/lib/server/author-portal-context'

export const metadata: Metadata = {
  title: 'Author Payout Enrollment | J Merrill Publishing',
  description: 'Private author payout enrollment for J Merrill Publishing authors.',
  robots: {
    index: false,
    follow: false,
  },
}

export default async function AuthorFinancialSetupPage() {
  const context = await getAuthorPortalContextFromCookies()
  const paymentSetupAlreadyComplete = Boolean(context && !context.tasks.paymentRoyaltyRequired)

  return (
    <AuthorPortalShell
      eyebrow="Author Payout Enrollment"
      title="Set up future payment readiness."
      description="Securely provide Stripe with identity, tax, and banking details for future J Merrill Publishing payments. Enrollment does not mean a payment is due, approved, or scheduled."
    >
      <AuthorGate scope="portal">
        {paymentSetupAlreadyComplete ? (
          <div className="rounded-[32px] border border-blue-500/25 bg-blue-500/[0.06] p-10 text-center">
            <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-blue-500 text-[24px] text-white">✓</div>
            <h2
              className="text-white"
              style={{ fontFamily: "'Libre Baskerville', serif", fontSize: '30px', fontWeight: 700 }}
            >
              Author Payout Enrollment is already in place.
            </h2>
            <p className="mx-auto mt-3 max-w-[560px] text-[14px] font-light leading-[1.8] text-white/45">
              This author relationship already has enrollment status on file. Return to your workspace to continue with the correct project and current stage.
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
          <StripeConnectSetupCard />
        )}
      </AuthorGate>
    </AuthorPortalShell>
  )
}
