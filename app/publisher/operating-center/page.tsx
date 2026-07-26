import type { Metadata } from 'next'
import Link from 'next/link'

import { PublisherOperatingCenter } from '../_components/PublisherOperatingCenter'
import { buildPublisherOperatingCenterModel, requirePublisherOperator } from '@/lib/server/publisher-operating-center'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Publisher Operating Center | J Merrill Publishing',
  description: 'Internal publisher command surface for J Merrill Publishing operations.',
  robots: {
    index: false,
    follow: false,
  },
}

export default function PublisherOperatingCenterPage() {
  const publisher = requirePublisherOperator()

  if (!publisher.ok) {
    return (
      <main className="min-h-screen bg-[#101418] px-5 py-10 text-white">
        <section className="mx-auto max-w-3xl border border-white/10 bg-white/[0.04] p-8">
          <p className="font-mono text-xs uppercase tracking-[0.16em] text-sky-300">Publisher Operating Center</p>
          <h1 className="mt-4 text-3xl font-semibold">Internal publisher access required.</h1>
          <p className="mt-4 text-sm leading-7 text-white/65">{publisher.reason}</p>
          <Link className="mt-6 inline-flex border border-white/15 px-4 py-2 text-sm text-white/80" href="/">
            Return to jmerrill.pub
          </Link>
        </section>
      </main>
    )
  }

  const model = buildPublisherOperatingCenterModel(publisher.operator)
  return <PublisherOperatingCenter model={model} />
}
