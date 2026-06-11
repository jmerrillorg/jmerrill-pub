import type { Metadata } from 'next'
import JoinForm from './JoinForm'

export const metadata: Metadata = {
  title: 'Join the Family — Start Your Publishing Journey',
  description: "Tell us about your book, your message, and where you are in the journey. We'll help you understand the right next step while your voice and rights stay at the center.",
}

export default function JoinPage() {
  return (
    <div className="pt-[76px] min-h-screen bg-[#0F1C2E] relative overflow-hidden">
      <div
        className="absolute inset-x-0 top-0 h-[520px] pointer-events-none"
        style={{ background: 'radial-gradient(ellipse 65% 55% at 50% 24%, rgba(30,144,255,0.14) 0%, rgba(30,144,255,0.05) 38%, transparent 72%)' }}
      />
      <div className="relative z-10 max-w-[700px] mx-auto px-6 py-20">

        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-blue-500/12 border border-blue-400/25 rounded-full px-4 py-2 mb-6">
            <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse" />
            <span
              className="text-[11px] text-blue-300 font-medium tracking-[0.1em] uppercase"
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
            <em className="not-italic italic text-blue-400">Join the Family.</em>
          </h1>
          <p className="text-[16px] font-light text-white/72 leading-[1.75]">
            Complete the inquiry below. You do not need every publishing answer yet. This first step helps us understand the work, protect the author's voice, and prepare our editorial review.
          </p>
        </div>

        <div className="mb-8 rounded-3xl border border-blue-400/25 bg-blue-500/[0.09] p-6 shadow-[0_14px_50px_rgba(0,0,0,0.18)]">
          <p className="text-[14px] font-light leading-[1.8] text-white/76">
            Your inquiry starts a conversation, not a transaction. Your name, rights, message, and long-term goals remain central while we help identify whether J Merrill Publishing is the right family for your book.
          </p>
        </div>

        {/* Client-side form with API submission */}
        <JoinForm />

        {/* Or schedule */}
        <div className="text-center mt-8">
          <p className="text-[14px] text-white/58 mb-3">Prefer to talk first?</p>
          <a
            href="https://outlook.office.com/book/JMerrillPublishing@jmerrill.one/?ismsaljsauthenabled"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-[14px] text-blue-300 border-b border-blue-300/40 pb-px hover:border-blue-200 hover:text-blue-200 transition-colors"
          >
            Schedule a free consultation ↗
          </a>
        </div>
      </div>
    </div>
  )
}
