type PageSectionProps = {
  eyebrow: string
  title: React.ReactNode
  description?: string
  children: React.ReactNode
  surface?: 'light' | 'dark'
}

export function PageSection({
  eyebrow,
  title,
  description,
  children,
  surface = 'light',
}: PageSectionProps) {
  const light = surface === 'light'

  return (
    <section className={light ? 'bg-white px-6 py-20 sm:px-12' : 'bg-[#070710] px-6 py-20 sm:px-12'}>
      <div className="mx-auto max-w-[1280px]">
        <div className="mb-12 max-w-[760px]">
          <div className="mb-4 flex items-center gap-3">
            <span className={`block h-px w-8 ${light ? 'bg-blue-500' : 'bg-blue-400'}`} />
            <span
              className={`font-mono text-[10px] uppercase tracking-[0.16em] ${light ? 'text-blue-500' : 'text-blue-400'}`}
            >
              {eyebrow}
            </span>
          </div>
          <h2
            className={light ? 'text-charcoal' : 'text-white'}
            style={{
              fontFamily: "'Libre Baskerville', serif",
              fontSize: 'clamp(30px,4vw,52px)',
              fontWeight: 700,
              lineHeight: 1.08,
              letterSpacing: '-0.02em',
            }}
          >
            {title}
          </h2>
          {description && (
            <p className={`mt-4 max-w-[620px] text-[16px] font-light leading-[1.8] ${light ? 'text-gray-500' : 'text-white/45'}`}>
              {description}
            </p>
          )}
        </div>
        {children}
      </div>
    </section>
  )
}
