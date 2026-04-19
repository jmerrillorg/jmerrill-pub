import Link from 'next/link'
import type { PublishingPackageRecord } from '@/lib/content'

export function PackageCard({ pkg, dark = false }: { pkg: PublishingPackageRecord; dark?: boolean }) {
  return (
    <div
      className={`relative flex h-full flex-col rounded-[28px] border p-8 ${
        dark
          ? pkg.featured
            ? 'border-blue-500/40 bg-blue-500/[0.08]'
            : 'border-white/10 bg-white/[0.03]'
          : pkg.featured
            ? 'border-blue-200 bg-blue-50'
            : 'border-gray-200 bg-white'
      }`}
    >
      {pkg.featured && (
        <div className="absolute right-6 top-6 rounded-full bg-blue-500 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-white">
          Flagship pick
        </div>
      )}
      <div className={`font-mono text-[10px] uppercase tracking-[0.12em] ${dark ? 'text-blue-400' : 'text-blue-500'}`}>
        {pkg.sku}
      </div>
      <h3
        className={`mt-4 ${dark ? 'text-white' : 'text-charcoal'}`}
        style={{ fontFamily: "'Libre Baskerville', serif", fontSize: '30px', fontWeight: 700, lineHeight: 1.1 }}
      >
        {pkg.tier}
      </h3>
      <div className={`mt-2 text-[44px] font-bold leading-none ${dark ? 'text-white' : 'text-charcoal'}`}>
        ${pkg.price.toLocaleString()}
      </div>
      <p className={`mt-1 text-[12px] ${dark ? 'text-white/30' : 'text-gray-400'}`}>Up to {pkg.wordLimit} words</p>
      <p className={`mt-5 text-[14px] font-light leading-[1.8] ${dark ? 'text-white/50' : 'text-gray-500'}`}>
        {pkg.summary}
      </p>
      <p className={`mt-3 text-[13px] ${dark ? 'text-white/35' : 'text-gray-400'}`}>{pkg.audience}</p>
      <ul className={`mt-6 flex flex-1 flex-col gap-2.5 border-t pt-6 ${dark ? 'border-white/8' : 'border-gray-100'}`}>
        {pkg.features.slice(0, 6).map((feature) => (
          <li key={feature} className={`flex items-start gap-2 text-[13px] font-light leading-[1.6] ${dark ? 'text-white/55' : 'text-gray-500'}`}>
            <span className="mt-0.5 text-blue-500">✓</span>
            {feature}
          </li>
        ))}
      </ul>
      <div className="mt-8 flex gap-3">
        <Link
          href="/join"
          className={`rounded-full px-5 py-3 text-[13px] font-semibold transition-colors ${
            dark
              ? 'bg-blue-500 text-white hover:bg-blue-600'
              : 'bg-charcoal text-white hover:bg-blue-500'
          }`}
        >
          Join the Family
        </Link>
        <Link
          href="/packages"
          className={`rounded-full border px-5 py-3 text-[13px] transition-all ${
            dark
              ? 'border-white/10 text-white/45 hover:border-blue-500 hover:text-blue-400'
              : 'border-gray-200 text-gray-500 hover:border-blue-500 hover:text-blue-500'
          }`}
        >
          Full details
        </Link>
      </div>
    </div>
  )
}
