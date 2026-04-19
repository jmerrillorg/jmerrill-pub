import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Apply — Publishing Partner Program',
  description: 'Apply for the J Merrill Publishing Partner Program. Application-based. Limited availability.',
}

export default function PartnerApplyPage() {
  return (
    <div className="pt-[76px] min-h-screen bg-[#0F1C2E]">
      <div className="absolute inset-0 top-[76px] pointer-events-none"
        style={{ background: 'radial-gradient(ellipse 60% 50% at 50% 30%, rgba(30,144,255,0.08) 0%, transparent 65%)' }} />

      <div className="relative z-10 max-w-[680px] mx-auto px-6 py-20">

        {/* Back link */}
        <Link href="/publishing-partner" className="inline-flex items-center gap-2 text-[13px] text-white/30 hover:text-blue-400 transition-colors mb-10">
          ← Back to Partner Program
        </Link>

        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 rounded-full px-4 py-2 mb-6">
            <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" />
            <span className="text-[11px] text-blue-400 font-medium tracking-[0.1em] uppercase"
              style={{ fontFamily: "'DM Mono', monospace" }}>
              Application — Not Signup
            </span>
          </div>
          <h1 className="text-white mb-4"
            style={{ fontFamily: "'Libre Baskerville', serif", fontSize: 'clamp(32px,5vw,52px)', fontWeight: 700, lineHeight: 1.05, letterSpacing: '-0.02em' }}>
            Apply for the<br />
            <em className="not-italic italic text-blue-500">Partner Program</em>
          </h1>
          <p className="text-[15px] font-light text-white/45 leading-[1.75]">
            Applications are reviewed on a rolling basis. We respond within 3–5 business days.
          </p>
        </div>

        <div className="bg-white/[0.04] border border-white/8 rounded-3xl p-8 backdrop-blur">
          <form method="POST" action="/api/partner-apply" className="flex flex-col gap-6">

            {/* Personal info */}
            <div className="grid sm:grid-cols-2 gap-4">
              <FieldDark label="First Name" name="firstName" required />
              <FieldDark label="Last Name"  name="lastName"  required />
            </div>
            <FieldDark label="Email Address" name="email" type="email" required />
            <FieldDark label="Phone"         name="phone" type="tel" />
            <FieldDark label="Website or Social Profile URL" name="website" type="url" />

            {/* Program tier */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-medium tracking-[0.1em] uppercase text-white/40"
                style={{ fontFamily: "'DM Mono', monospace" }}>
                Program Tier <span className="text-blue-500">*</span>
              </label>
              <select name="tier" required
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-[14px] text-white focus:outline-none focus:border-blue-500 transition-colors"
                style={{ colorScheme: 'dark' }}>
                <option value="">Select a tier</option>
                <option value="Partner">Partner — Up to 2 titles/year ($9,000 annually)</option>
                <option value="Signature">Signature Author — Up to 3 titles/year ($15,000 annually)</option>
                <option value="Unsure">Not sure yet — help me decide</option>
              </select>
            </div>

            {/* Imprint */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-medium tracking-[0.1em] uppercase text-white/40"
                style={{ fontFamily: "'DM Mono', monospace" }}>
                Primary Imprint <span className="text-blue-500">*</span>
              </label>
              <select name="imprint" required
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-[14px] text-white focus:outline-none focus:border-blue-500 transition-colors"
                style={{ colorScheme: 'dark' }}>
                <option value="">Select an imprint</option>
                <option value="J Merrill Publishing">J Merrill Publishing — flagship and core catalog</option>
                <option value="JM Little">JM Little — children&apos;s and youth titles</option>
                <option value="JM Verse">JM Verse — poetry, lyrical, and verse-centered work</option>
                <option value="JM Signature">JM Signature — marquee and prestige releases</option>
                <option value="JM Works">JM Works — general trade, inspirational, memoir, and nonfiction</option>
                <option value="Unsure">Not sure — spanning multiple genres</option>
              </select>
            </div>

            <FieldDark label="Current Published Title(s)" name="existingTitles"
              hint="List any books you've already published" />

            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-medium tracking-[0.1em] uppercase text-white/40"
                style={{ fontFamily: "'DM Mono', monospace" }}>
                Titles in Your Pipeline <span className="text-blue-500">*</span>
              </label>
              <textarea name="pipeline" rows={3} required
                placeholder="Briefly describe the books you plan to publish over the next 1–2 years — titles, genres, and where each is in the writing process."
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-[14px] text-white placeholder:text-white/20 focus:outline-none focus:border-blue-500 transition-colors resize-none" />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-medium tracking-[0.1em] uppercase text-white/40"
                style={{ fontFamily: "'DM Mono', monospace" }}>
                Your Publishing Vision <span className="text-blue-500">*</span>
              </label>
              <textarea name="vision" rows={4} required
                placeholder="What are you building? What impact do you want your body of work to have? Who is your audience?"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-[14px] text-white placeholder:text-white/20 focus:outline-none focus:border-blue-500 transition-colors resize-none" />
            </div>

            <div className="pt-2">
              <button type="submit"
                className="w-full bg-blue-500 text-white text-[14px] font-semibold tracking-[0.05em] uppercase py-4 rounded-full hover:bg-blue-600 transition-all hover:-translate-y-0.5 shadow-[0_4px_24px_rgba(30,144,255,0.4)]">
                Submit Application →
              </button>
              <p className="text-center text-[12px] text-white/20 mt-4">
                Applications reviewed within 3–5 business days. This is not a commitment — it is the beginning of a conversation.
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

function FieldDark({ label, name, type = 'text', required = false, hint }: {
  label: string; name: string; type?: string; required?: boolean; hint?: string
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[11px] font-medium tracking-[0.1em] uppercase text-white/40"
        style={{ fontFamily: "'DM Mono', monospace" }}>
        {label}{required && <span className="text-blue-500 ml-0.5">*</span>}
      </label>
      <input type={type} name={name} required={required}
        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-[14px] text-white placeholder:text-white/20 focus:outline-none focus:border-blue-500 transition-colors" />
      {hint && <span className="text-[11px] text-white/20 font-light">{hint}</span>}
    </div>
  )
}
