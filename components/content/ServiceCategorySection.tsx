import type { ServiceCategoryRecord } from '@/lib/content'

export function ServiceCategorySection({ category }: { category: ServiceCategoryRecord }) {
  return (
    <section id={category.anchor} className="mb-16 scroll-mt-32">
      <div className="mb-6 flex items-start gap-4 border-b border-gray-200 pb-5">
        <span className="mt-0.5 text-[28px]">{category.icon}</span>
        <div className="flex-1">
          <div className="mb-1 flex items-center gap-3">
            <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-gray-300">{category.num}</span>
            <h2 className="text-charcoal" style={{ fontFamily: "'Libre Baskerville', serif", fontSize: '24px', fontWeight: 700 }}>
              {category.title}
            </h2>
          </div>
          <p className="text-[14px] font-light text-gray-400">{category.description}</p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {category.services.map((service) => (
          <div
            key={service.name}
            className="rounded-xl border border-gray-100 p-5 transition-all duration-200 hover:border-blue-200 hover:bg-blue-50/30"
          >
            <div className="mb-1.5 text-[14px] font-semibold text-charcoal">{service.name}</div>
            <div className="text-[13px] font-light leading-[1.65] text-gray-400">{service.desc}</div>
          </div>
        ))}
      </div>
    </section>
  )
}
