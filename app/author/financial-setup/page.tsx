import type { Metadata } from 'next'

import { AuthorGate } from '../_components/AuthorGate'
import { AuthorPortalShell } from '../_components/AuthorPortalShell'
import { StripeConnectSetupCard } from '../_components/StripeConnectSetupCard'
import { getAuthorPortalContextFromCookies } from '@/lib/server/author-portal-context'

export const metadata: Metadata = {
  title: 'Payment & Royalty Setup | J Merrill Publishing',
  description: 'Private Stripe setup for J Merrill Publishing authors.',
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
      eyebrow="Payment & Royalty Setup"
      title="Connect Stripe for payment and royalties."
      description="Securely connect Stripe so agreement payment and future royalty handling can be managed safely."
    >
      <AuthorGate scope="portal">
        {paymentSetupAlreadyComplete ? (
          <div className="rounded-[32px] border border-blue-500/25 bg-blue-500/[0.06] p-10 text-center">
            <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-blue-500 text-[24px] text-white">✓</div>
            <h2
              className="text-white"
              style={{ fontFamily: "'Libre Baskerville', serif", fontSize: '30px', fontWeight: 700 }}
            >
              Payment and royalty setup is already in place.
            </h2>
            <p className="mx-auto mt-3 max-w-[560px] text-[14px] font-light leading-[1.8] text-white/45">
              This author relationship already has the required setup on file. Return to your workspace to continue with the correct project and current stage.
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
