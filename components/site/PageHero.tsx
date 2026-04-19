import Link from 'next/link'

type Action = {
  label: string
  href: string
  external?: boolean
}

type PageHeroProps = {
  eyebrow: string
  title: React.ReactNode
  description: string
  ghost: string
  actions?: Action[]
}

export function PageHero({
  eyebrow,
  title,
  description,
  ghost,
  actions = [],
}: PageHeroProps) {
  return (
    <section className="relative overflow-hidden border-b border-white/5 bg-[#0F1C2E] px-6 py-24 sm:px-12">
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 60% 80% at 20% 50%, rgba(30,144,255,0.14) 0%, transparent 65%)',
        }}
      />
      <div
        className="pointer-events-none absolute -bottom-8 right-0 select-none"
        style={{
          fontFamily: "'Libre Baskerville', serif",
          fontSize: 'clamp(96px, 14vw, 220px)',
          fontWeight: 700,
          color: 'transparent',
          WebkitTextStroke: '1px rgba(255,255,255,0.03)',
          letterSpacing: '-0.05em',
          whiteSpace: 'nowrap',
        }}
      >
        {ghost}
      </div>

      <div className="relative z-10 mx-auto max-w-[1280px]">
        <div className="mb-5 flex items-center gap-3">
          <span className="block h-px w-8 bg-blue-500" />
          <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-blue-400">
            {eyebrow}
          </span>
        </div>
        <h1
          className="mb-5 max-w-[760px] text-white"
          style={{
            fontFamily: "'Libre Baskerville', serif",
            fontSize: 'clamp(40px,5vw,72px)',
            fontWeight: 700,
            lineHeight: 1.05,
            letterSpacing: '-0.02em',
          }}
        >
          {title}
        </h1>
        <p className="max-w-[620px] text-[17px] font-light leading-[1.75] text-white/45">
          {description}
        </p>

        {actions.length > 0 && (
          <div className="mt-9 flex flex-wrap gap-4">
            {actions.map((action, index) =>
              action.external ? (
                <a
                  key={action.href}
                  href={action.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={
                    index === 0
                      ? 'rounded-full bg-blue-500 px-8 py-3.5 text-[14px] font-semibold text-white transition-colors hover:bg-blue-600'
                      : 'rounded-full border border-white/15 px-8 py-3.5 text-[14px] text-white/60 transition-all hover:border-blue-500 hover:text-blue-400'
                  }
                >
                  {action.label}
                </a>
              ) : (
                <Link
                  key={action.href}
                  href={action.href}
                  className={
                    index === 0
                      ? 'rounded-full bg-blue-500 px-8 py-3.5 text-[14px] font-semibold text-white transition-colors hover:bg-blue-600'
                      : 'rounded-full border border-white/15 px-8 py-3.5 text-[14px] text-white/60 transition-all hover:border-blue-500 hover:text-blue-400'
                  }
                >
                  {action.label}
                </Link>
              ),
            )}
          </div>
        )}
      </div>
    </section>
  )
}
