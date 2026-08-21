import type { Metadata } from 'next'
import ContinuationUpload from './ContinuationUpload'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Continue Your Publishing Inquiry',
  description: 'Securely add a manuscript to an existing J Merrill Publishing inquiry.',
}

export default function ContinueJoinPage({ params }: { params: { token: string } }) {
  return (
    <main className="min-h-screen bg-[#0F1C2E] px-4 py-12 text-white sm:px-6">
      <div className="mx-auto max-w-2xl">
        <ContinuationUpload token={params.token} />
      </div>
    </main>
  )
}
