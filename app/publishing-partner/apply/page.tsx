import type { Metadata } from 'next'
import Link from 'next/link'
import { PartnerApplyForm } from '@/components/publishing-partner/PartnerApplyForm'

export const metadata: Metadata = {
  title: 'Apply — JM Prestige',
  description: "Apply for JM Prestige — J Merrill Publishing's premium publishing imprint. Application-based. Limited availability.",
}

export default function PartnerApplyPage() {
  return (
    <div className="pt-[76px] min-h-screen bg-[#0F1C2E]">
      <div className="absolute inset-0 top-[76px] pointer-events-none"
        style={{ background: 'radial-gradient(ellipse 60% 50% at 50% 30%, rgba(30,144,255,0.08) 0%, transparent 65%)' }} />

      <div className="relative z-10 max-w-[680px] mx-auto px-6 py-20">

        {/* Back link */}
        <Link href="/publishing-partner" className="inline-flex items-center gap-2 text-[13px] text-white/30 hover:text-blue-400 transition-colors mb-10">
          ← Back to JM Prestige
        </Link>

        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 rounded-full px-4 py-2 mb-6">
            <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" />
            <span className="text-[11px] text-blue-400 font-medium tracking-[0.1em] uppercase"
              style={{ fontFamily: "'DM Mono', monospace" }}>
              JM Prestige — Application Only
            </span>
          </div>
          <h1 className="text-white mb-4"
            style={{ fontFamily: "'Libre Baskerville', serif", fontSize: 'clamp(32px,5vw,52px)', fontWeight: 700, lineHeight: 1.05, letterSpacing: '-0.02em' }}>
            Apply for<br />
            <em className="not-italic italic text-blue-500">JM Prestige</em>
          </h1>
          <p className="text-[15px] font-light text-white/45 leading-[1.75]">
            JM Prestige applications are reviewed on a rolling basis. We respond within 3–5 business days.
          </p>
        </div>

        <div className="bg-white/[0.04] border border-white/8 rounded-3xl p-8 backdrop-blur">
          <PartnerApplyForm />
        </div>
      </div>
    </div>
  )
}
