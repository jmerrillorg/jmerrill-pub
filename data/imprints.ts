export type ImprintSlug =
  | 'jm-verse'
  | 'jm-works'
  | 'jm-little'
  | 'j-merrill-publishing'
  | 'jm-signature'

export type ImprintStrategy = {
  label: string
  slug: ImprintSlug
  pageHref: string
  booksHref: string
  readerPathLabel: string
  readerPathSummary: string
  positioningStatement: string
  audienceSummary: string
  primaryPlatforms: string[]
  secondaryPlatforms: string[]
  recommendedCtaEmphasis: string
  assignmentRule: string
  featuredTitleIds?: string[]
}

export const imprintStrategies: ImprintStrategy[] = [
  {
    label: 'JM Verse',
    slug: 'jm-verse',
    pageHref: '/imprints/jm-verse',
    booksHref: '/books?imprint=verse',
    readerPathLabel: 'Poetry & Spoken Word',
    readerPathSummary: 'For readers drawn to poetic voice, spoken word energy, and emotionally resonant collections.',
    positioningStatement: 'JM Verse is the imprint for poetry, chapbooks, spoken word, and lyrical work that lives on the page and in performance.',
    audienceSummary: 'Readers looking for poetry collections, hybrid forms, chapbooks, and spoken word-centered releases.',
    primaryPlatforms: ['Instagram', 'TikTok', 'YouTube'],
    secondaryPlatforms: ['Threads / X'],
    recommendedCtaEmphasis: 'spoken word, poetry, performances',
    assignmentRule: 'Poetry collections, chapbooks, spoken word, and hybrid verse-first forms.',
  },
  {
    label: 'JM Works',
    slug: 'jm-works',
    pageHref: '/imprints/jm-works',
    booksHref: '/books?imprint=works',
    readerPathLabel: 'General Fiction & Nonfiction',
    readerPathSummary: 'For commercially positioned fiction and nonfiction with broad trade appeal.',
    positioningStatement: 'JM Works is the general trade imprint for fiction and nonfiction built for broad-market discovery and sustained readership.',
    audienceSummary: 'Readers interested in general trade fiction, nonfiction, memoir, and commercial category titles.',
    primaryPlatforms: ['Instagram', 'Facebook', 'Goodreads'],
    secondaryPlatforms: ['BookBub', 'Amazon'],
    recommendedCtaEmphasis: 'new releases, general trade discovery',
    assignmentRule: 'General trade fiction or nonfiction with no primary faith positioning.',
  },
  {
    label: 'JM Little',
    slug: 'jm-little',
    pageHref: '/imprints/jm-little',
    booksHref: '/books?imprint=little',
    readerPathLabel: 'Children & Youth',
    readerPathSummary: 'For parents, educators, and families looking for books for younger readers.',
    positioningStatement: 'JM Little is the children’s imprint for picture books, early readers, middle grade, and youth-facing releases.',
    audienceSummary: 'Parents, educators, caregivers, and young readers seeking children’s titles and read-aloud-friendly books.',
    primaryPlatforms: ['Instagram', 'YouTube', 'Pinterest'],
    secondaryPlatforms: ['Facebook'],
    recommendedCtaEmphasis: 'parents, educators, read-alouds',
    assignmentRule: 'Children’s content for roughly ages 0–12, including picture books, early readers, and middle grade.',
  },
  {
    label: 'J Merrill Publishing',
    slug: 'j-merrill-publishing',
    pageHref: '/imprints/j-merrill-publishing',
    booksHref: '/books?imprint=publishing',
    readerPathLabel: 'Faith & Inspiration',
    readerPathSummary: 'For readers seeking faith-based, inspirational, devotional, and ministry-aligned books.',
    positioningStatement: 'J Merrill Publishing is the flagship imprint for faith-based, faith-adjacent, and inspirational releases under the primary publishing brand.',
    audienceSummary: 'Readers looking for Christian living, spiritual memoir, devotional, inspirational, and ministry-centered books.',
    primaryPlatforms: ['Facebook', 'YouTube', 'Instagram'],
    secondaryPlatforms: ['Email'],
    recommendedCtaEmphasis: 'faith, inspiration, teaching, devotionals',
    assignmentRule: 'Faith-based or faith-adjacent content, including inspirational, Christian living, ministry nonfiction, and devotional work.',
  },
  {
    label: 'JM Signature',
    slug: 'jm-signature',
    pageHref: '/imprints/jm-signature',
    booksHref: '/books?imprint=signature',
    readerPathLabel: 'Premium / Signature Releases',
    readerPathSummary: 'For readers who want elevated flagship releases, special editions, and curated marquee titles.',
    positioningStatement: 'JM Signature is the selective imprint for premium, exclusive, and prestige-positioned releases within the J Merrill Publishing system.',
    audienceSummary: 'Readers interested in marquee releases, elevated presentation, collector-style editions, and flagship exclusives.',
    primaryPlatforms: ['Website', 'Email', 'LinkedIn'],
    secondaryPlatforms: ['Instagram'],
    recommendedCtaEmphasis: 'premium / exclusive releases',
    assignmentRule: 'Publisher-designated only. Prestige-level work without designation should be flagged for publisher confirmation.',
  },
]

const imprintAliases: Record<string, ImprintSlug> = imprintStrategies.reduce<Record<string, ImprintSlug>>((map, imprint) => {
  map[imprint.slug] = imprint.slug
  map[imprint.label.toLowerCase()] = imprint.slug
  map[imprint.label.toLowerCase().replace(/[^a-z0-9]+/g, '-')] = imprint.slug
  return map
}, {
  publishing: 'j-merrill-publishing',
  works: 'jm-works',
  verse: 'jm-verse',
  little: 'jm-little',
  signature: 'jm-signature',
})

export function normalizeImprintSlug(value: string | null | undefined) {
  const normalized = String(value || '').trim().toLowerCase()
  return imprintAliases[normalized] || null
}

export function getImprintStrategyBySlug(slug: string | null | undefined) {
  const normalized = normalizeImprintSlug(slug)
  return normalized ? imprintStrategies.find((imprint) => imprint.slug === normalized) || null : null
}

export function getImprintStrategyByLabel(label: string | null | undefined) {
  const normalized = String(label || '').trim().toLowerCase()
  return imprintStrategies.find((imprint) => imprint.label.toLowerCase() === normalized) || null
}
