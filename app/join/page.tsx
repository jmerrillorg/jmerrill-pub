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
        className="absolute inset-x-0 top-0 h-[560px] pointer-events-none"
        style={{ background: 'radial-gradient(ellipse 70% 58% at 50% 20%, rgba(30,144,255,0.18) 0%, rgba(30,144,255,0.08) 36%, transparent 74%)' }}
      />
      <div className="relative z-10 max-w-[700px] mx-auto px-6 py-20">

        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-blue-500/18 border border-blue-300/40 rounded-full px-4 py-2 mb-6 shadow-[0_0_24px_rgba(30,144,255,0.12)]">
            <span className="w-1.5 h-1.5 bg-blue-300 rounded-full animate-pulse" />
            <span
              className="text-[11px] text-blue-100 font-semibold tracking-[0.1em] uppercase"
              style={{ fontFamily: "'DM Mono', monospace" }}
            >
              Now Welcoming New Authors
            </span>
          </div>
          <h1
            className="mb-5"
            style={{
              color: '#FFFFFF',
              fontFamily: "'Libre Baskerville', serif",
              fontSize: 'clamp(36px,5vw,56px)',
              fontWeight: 700,
              lineHeight: 1.05,
              letterSpacing: '-0.02em',
              textShadow: '0 2px 18px rgba(0,0,0,0.35)',
            }}
          >
            Ready to publish?<br />
            <em className="not-italic italic" style={{ color: '#57A8FF' }}>Join the Family.</em>
          </h1>
          <p className="mx-auto max-w-[620px] text-[16px] font-normal leading-[1.75]" style={{ color: 'rgba(255,255,255,0.88)' }}>
            Your book is more than a project. It carries your story, your voice, and the people you hope to reach. Start here so we can understand the heart of your work and help you find the right publishing path.
          </p>
        </div>

        <div className="mb-8 rounded-3xl border border-blue-300/35 bg-[#14345A] p-6 shadow-[0_14px_50px_rgba(0,0,0,0.24)]">
          <p className="text-[14px] font-normal leading-[1.8]" style={{ color: 'rgba(255,255,255,0.9)' }}>
            This first step is not a transaction. It is an invitation to be heard. We want to know why this book matters, who it is for, and how J Merrill Publishing can walk with you through the next right step.
          </p>
        </div>

        {/* Client-side form with API submission */}
        <JoinForm />

        {/* Or schedule */}
        <div className="text-center mt-8">
          <p className="text-[14px] text-white/72 mb-3">Prefer to talk first?</p>
          <a
            href="https://outlook.office.com/book/JMerrillPublishing@jmerrill.one/?ismsaljsauthenabled"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-[14px] text-blue-200 border-b border-blue-200/50 pb-px hover:border-blue-100 hover:text-blue-100 transition-colors"
          >
            Schedule a free consultation ↗
          </a>
        </div>
      </div>
    </div>
  )
}
