import Link from 'next/link'

type CTAAction = {
  label: string
  href: string
  external?: boolean
}

export function CTASection({
  eyebrow,
  title,
  description,
  primary,
  secondary,
  dark = true,
}: {
  eyebrow: string
  title: React.ReactNode
  description: string
  primary: CTAAction
  secondary?: CTAAction
  dark?: boolean
}) {
  return (
    <section className={dark ? 'bg-charcoal px-6 py-20 text-center sm:px-12' : 'bg-[#F7F8FA] px-6 py-20 text-center sm:px-12'}>
      <div className="mx-auto max-w-[760px]">
        <div className={`mb-5 font-mono text-[10px] uppercase tracking-[0.16em] ${dark ? 'text-blue-400' : 'text-blue-500'}`}>
          {eyebrow}
        </div>
        <h2
          className={dark ? 'text-white' : 'text-charcoal'}
          style={{ fontFamily: "'Libre Baskerville', serif", fontSize: 'clamp(34px,4vw,56px)', fontWeight: 700, lineHeight: 1.08, letterSpacing: '-0.02em' }}
        >
          {title}
        </h2>
        <p className={`mx-auto mt-4 max-w-[580px] text-[16px] font-light leading-[1.8] ${dark ? 'text-white/45' : 'text-gray-500'}`}>
          {description}
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
          <ActionButton action={primary} primary dark={dark} />
          {secondary && <ActionButton action={secondary} dark={dark} />}
        </div>
      </div>
    </section>
  )
}

function ActionButton({
  action,
  primary = false,
  dark = true,
}: {
  action: CTAAction
  primary?: boolean
  dark?: boolean
}) {
  const className = primary
    ? 'rounded-full bg-blue-500 px-8 py-3.5 text-[14px] font-semibold text-white transition-colors hover:bg-blue-600'
    : dark
      ? 'rounded-full border border-white/15 px-8 py-3.5 text-[14px] text-white/60 transition-all hover:border-blue-500 hover:text-blue-400'
      : 'rounded-full border border-gray-300 px-8 py-3.5 text-[14px] text-gray-600 transition-all hover:border-blue-500 hover:text-blue-500'

  return action.external ? (
    <a href={action.href} target="_blank" rel="noopener noreferrer" className={className}>
      {action.label}
    </a>
  ) : (
    <Link href={action.href} className={className}>
      {action.label}
    </Link>
  )
}
