import type { Metadata } from 'next'
import JoinForm from './JoinForm'

export const metadata: Metadata = {
  title: 'Join the Family — Start Your Publishing Journey',
  description: "Tell us about your book and your vision. We'll match you with the right publishing package and walk you through every step of your journey.",
}

export default function JoinPage() {
  return (
    <div className="pt-[76px] min-h-screen bg-[#0F1C2E] relative">
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse 60% 50% at 50% 30%, rgba(30,144,255,0.08) 0%, transparent 65%)' }}
      />
      <div className="relative z-10 max-w-[700px] mx-auto px-6 py-20">

        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 rounded-full px-4 py-2 mb-6">
            <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" />
            <span
              className="text-[11px] text-blue-400 font-medium tracking-[0.1em] uppercase"
              style={{ fontFamily: "'DM Mono', monospace" }}
            >
              Now Accepting New Authors
            </span>
          </div>
          <h1
            className="text-white mb-4"
            style={{
              fontFamily: "'Libre Baskerville', serif",
              fontSize: 'clamp(36px,5vw,56px)',
              fontWeight: 700,
              lineHeight: 1.05,
              letterSpacing: '-0.02em',
            }}
          >
            Ready to publish?<br />
            <em className="not-italic italic text-blue-500">Join the Family.</em>
          </h1>
          <p className="text-[16px] font-light text-white/45 leading-[1.75]">
            Complete the inquiry below. We follow up within 1–2 business days.
          </p>
        </div>

        {/* Client-side form with API submission */}
        <JoinForm />

        {/* Or schedule */}
        <div className="text-center mt-8">
          <p className="text-[14px] text-white/30 mb-3">Prefer to talk first?</p>
          <a
            href="https://outlook.office.com/book/JMerrillPublishing@jmerrill.one/?ismsaljsauthenabled"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-[14px] text-blue-400 border-b border-blue-400/30 pb-px hover:border-blue-400 transition-colors"
          >
            Schedule a free consultation ↗
          </a>
        </div>
      </div>
    </div>
  )
}
