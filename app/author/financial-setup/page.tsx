import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

import { AuthorGate } from '../_components/AuthorGate'
import { AuthorPortalShell } from '../_components/AuthorPortalShell'
import { StripeConnectSetupCard } from '../_components/StripeConnectSetupCard'
import { getAuthorPortalContextFromCookies } from '@/lib/server/author-portal-context'
import {
  readConnectEnrollmentStatusFromToken,
  type ConnectHumanStatus,
} from '@/lib/server/stripe/author-workspace-stripe'

export const metadata: Metadata = {
  title: 'Direct Deposit Setup | J Merrill Publishing',
  description: 'Private direct deposit setup for J Merrill Publishing authors.',
  robots: {
    index: false,
    follow: false,
  },
}

export default async function AuthorFinancialSetupPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>> | Record<string, string | string[] | undefined>
}) {
  const params = await searchParams
  const contact = first(params?.contact)
  if (isValidLegacyConnectContact(contact)) {
    redirect(`/api/author/stripe/connect/refresh?contact=${encodeURIComponent(contact)}`)
  }

  const connectMode = first(params?.connect)
  const token = first(params?.token)
  if (token) {
    return <ConnectReturnExperience token={token} />
  }
  if (connectMode === 'support') {
    return <ConnectSupportExperience />
  }

  const context = await getAuthorPortalContextFromCookies()
  const paymentSetupAlreadyComplete = Boolean(context && !context.tasks.paymentRoyaltyRequired)

  return (
    <AuthorPortalShell
      eyebrow="Direct Deposit"
      title="Set up direct deposit."
      description="Securely provide Stripe with the identity, tax, and banking details needed for J Merrill Publishing direct deposit. Stripe collects those details securely; please do not send banking or tax information by email."
    >
      <AuthorGate scope="portal">
        {paymentSetupAlreadyComplete ? (
          <div className="rounded-[32px] border border-blue-500/25 bg-blue-500/[0.06] p-10 text-center">
            <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-blue-500 text-[24px] text-white">✓</div>
            <h2
              className="text-white"
              style={{ fontFamily: "'Libre Baskerville', serif", fontSize: '30px', fontWeight: 700 }}
            >
              Direct deposit setup is already in place.
            </h2>
            <p className="mx-auto mt-3 max-w-[560px] text-[14px] font-light leading-[1.8] text-white/45">
              This author relationship already has setup status on file. Return to your workspace to continue with the correct project and current stage.
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

async function ConnectReturnExperience({ token }: { token: string }) {
  try {
    const status = await readConnectEnrollmentStatusFromToken(token)
    const copy = humanStatusCopy(status.humanStatus)
    return (
      <AuthorPortalShell
        eyebrow="Direct Deposit"
        title="Set up direct deposit."
        description="Stripe has sent you back to J Merrill Publishing. We checked your Stripe setup status directly and listed the next step below."
      >
        <div className="rounded-[32px] border border-white/8 bg-white/[0.04] p-8 sm:p-10">
          <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-blue-300">{copy.kicker}</p>
          <h2
            className="mt-3 text-white"
            style={{ fontFamily: "'Libre Baskerville', serif", fontSize: '30px', fontWeight: 700 }}
          >
            {copy.heading}
          </h2>
          <p className="mt-4 max-w-[720px] text-[14px] font-light leading-[1.8] text-white/50">{copy.body}</p>
          {copy.showContinue ? (
            <div className="mt-7">
              <a
                href={`/api/author/stripe/connect/refresh?token=${encodeURIComponent(token)}`}
                className="inline-flex min-h-[52px] items-center justify-center rounded-full bg-blue-500 px-7 text-[13px] font-semibold uppercase tracking-[0.08em] text-white shadow-[0_4px_20px_rgba(30,144,255,0.35)] transition-all hover:-translate-y-0.5 hover:bg-blue-600"
              >
                Continue setup with Stripe
              </a>
            </div>
          ) : null}
          <p className="mt-6 text-[12px] leading-[1.7] text-white/35">
            If Stripe asks for a verification code, that code comes from Stripe. J Merrill Publishing does not collect banking or tax details by email.
          </p>
          <p className="mt-3 text-[12px] leading-[1.7] text-white/35">
            Questions? Reply to the Publishing Team at publishing@jmerrill.one.
          </p>
        </div>
      </AuthorPortalShell>
    )
  } catch {
    return <ConnectSupportExperience />
  }
}

function ConnectSupportExperience() {
  return (
    <AuthorPortalShell
      eyebrow="Direct Deposit"
      title="Set up direct deposit."
      description="We could not confirm this setup link. The Publishing Team can send a fresh Stripe setup link without asking you for banking or tax information by email."
    >
      <div className="rounded-[32px] border border-amber-400/25 bg-amber-400/[0.06] p-8 sm:p-10">
        <h2
          className="text-white"
          style={{ fontFamily: "'Libre Baskerville', serif", fontSize: '30px', fontWeight: 700 }}
        >
          Please ask us for a fresh setup link.
        </h2>
        <p className="mt-4 max-w-[720px] text-[14px] font-light leading-[1.8] text-white/50">
          Stripe setup links can expire. Reply to your J Merrill Publishing email or contact publishing@jmerrill.one and we will send a new setup link tied to your author record.
        </p>
        <p className="mt-4 text-[12px] leading-[1.7] text-white/35">
          You do not need a separate J Merrill Publishing code for direct deposit setup. If Stripe asks for a verification code, that code comes from Stripe.
        </p>
      </div>
    </AuthorPortalShell>
  )
}

function humanStatusCopy(status: ConnectHumanStatus) {
  switch (status) {
    case 'SETUP_COMPLETE':
      return {
        kicker: 'Setup complete',
        heading: 'Your direct deposit setup has been received.',
        body:
          'Stripe shows that your setup is complete. J Merrill Publishing will keep using this safe setup status without storing your banking or tax details here.',
        showContinue: false,
      }
    case 'UNDER_REVIEW':
      return {
        kicker: 'Under review',
        heading: 'Stripe is reviewing your setup.',
        body:
          'Stripe has received your submitted information. If Stripe needs anything else, it will ask you directly through the secure Stripe setup flow.',
        showContinue: false,
      }
    case 'MORE_INFORMATION_NEEDED':
      return {
        kicker: 'More information needed',
        heading: 'Stripe needs a little more information.',
        body:
          'Continue with Stripe to finish the remaining secure steps. Please do not email banking, tax, or identity documents to J Merrill Publishing.',
        showContinue: true,
      }
    case 'SETUP_IN_PROGRESS':
    case 'NOT_STARTED':
    case 'SUPPORT_REQUIRED':
    default:
      return {
        kicker: 'Setup in progress',
        heading: 'Continue your direct deposit setup with Stripe.',
        body:
          'Your setup is not complete yet. Continue with Stripe to securely provide the remaining information.',
        showContinue: true,
      }
  }
}

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] || '' : value || ''
}

function isValidLegacyConnectContact(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
}
