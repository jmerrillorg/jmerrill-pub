import Link from 'next/link'

export function AuthorPortalShell({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string
  title: string
  description: string
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-[#070710] pt-[76px]">
      <section className="relative overflow-hidden border-b border-white/5 px-6 py-16 sm:px-12">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'radial-gradient(ellipse 70% 60% at 50% 10%, rgba(30,144,255,0.16) 0%, transparent 65%)',
          }}
        />
        <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.8) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.8) 1px, transparent 1px)', backgroundSize: '72px 72px' }} />

        <div className="relative z-10 mx-auto max-w-[1180px]">
          <Link href="/author" className="mb-10 inline-flex text-[13px] text-white/30 transition-colors hover:text-blue-400">
            ← Back to Author Hub
          </Link>
          <div className="max-w-[820px]">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-blue-500/25 bg-blue-500/10 px-4 py-2">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
              <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-blue-300">{eyebrow}</span>
            </div>
            <h1
              className="text-white"
              style={{
                fontFamily: "'Libre Baskerville', serif",
                fontSize: 'clamp(38px, 5vw, 72px)',
                fontWeight: 700,
                lineHeight: 1.02,
                letterSpacing: '-0.03em',
              }}
            >
              {title}
            </h1>
            <p className="mt-5 max-w-[680px] text-[17px] font-light leading-[1.8] text-white/45">
              {description}
            </p>
          </div>
        </div>
      </section>

      <section className="px-6 py-14 sm:px-12">
        <div className="mx-auto grid max-w-[1180px] gap-10 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div>{children}</div>
          <aside className="space-y-4">
            {[
              ['01', 'Private author intake', 'These routes are intentionally separate from the public Join form and are not linked in public navigation.'],
              ['02', 'Dataverse ready', 'Submissions are shaped for future Power Automate and Dataverse ingestion.'],
              ['03', 'Notification routed', 'Operational notifications are routed to publishing@jmerrill.one when a sender is configured.'],
            ].map(([number, heading, body]) => (
              <div key={number} className="rounded-3xl border border-white/8 bg-white/[0.035] p-6">
                <div className="font-mono text-[11px] text-blue-400">{number}</div>
                <h2 className="mt-3 text-[15px] font-semibold text-white">{heading}</h2>
                <p className="mt-2 text-[13px] font-light leading-[1.7] text-white/35">{body}</p>
              </div>
            ))}
          </aside>
        </div>
      </section>
    </div>
  )
}
