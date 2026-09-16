import type { CatalogAuthorDetail, CatalogAuthorSummary, CatalogTitleSummary } from '@/lib/catalog/types'

export type EnhancedAuthorExperience = {
  slug: string
  model: 'ENHANCED_AUTHOR_PAGE'
  featuredTitleSlug: string
  featuredTitleDisplay: string
  heroLabel: string
  heroDeck: string
  positioning: string[]
  readerCallsToAction: Array<{
    label: string
    href: string
    kind: 'primary' | 'secondary'
  }>
  contentRequired: string[]
}

export type FeaturedAuthorExperience = {
  slug: string
  authorName: string
  featuredTitleSlug: string
  featuredTitleDisplay: string
  effectiveFrom: string
  effectiveThrough: string
  status: 'SCHEDULED'
}

export type FeaturedAuthorRuntimeState = 'PRE_NOVEMBER' | 'ACTIVE' | 'POST_NOVEMBER'

export const enhancedAuthorExperiences: EnhancedAuthorExperience[] = [
  {
    slug: 'kimberly-reeder',
    model: 'ENHANCED_AUTHOR_PAGE',
    featuredTitleSlug: 'girl-did-you-know',
    featuredTitleDisplay: "Girl, Did You Know...?: A Journey of Healing, Truth, and God's Restoration",
    heroLabel: 'Enhanced Author Experience',
    heroDeck:
      "Kimberly Reeder's author destination centers the message and reader pathway for Girl, Did You Know...? while preserving the governed JMP catalog authority behind the title.",
    positioning: [
      'J Merrill Publishing author',
      'Featured Author for November 2026',
      "Author of Girl, Did You Know...?",
    ],
    readerCallsToAction: [
      { label: 'Explore the Featured Book', href: '/books/girl-did-you-know', kind: 'primary' },
      { label: 'Browse JMP Authors', href: '/authors', kind: 'secondary' },
    ],
    contentRequired: [
      'Approved Kimberly Reeder author photograph',
      'Approved expanded Kimberly Reeder biography',
      'Approved ministry or platform positioning, if public',
      'Approved social, website, or contact destinations, if public',
      'Approved testimonial, pull quote, or reader-facing author statement, if desired',
    ],
  },
]

export const featuredAuthorExperiences: FeaturedAuthorExperience[] = [
  {
    slug: 'kimberly-reeder',
    authorName: 'Kimberly Reeder',
    featuredTitleSlug: 'girl-did-you-know',
    featuredTitleDisplay: "Girl, Did You Know...?: A Journey of Healing, Truth, and God's Restoration",
    effectiveFrom: '2026-11-01',
    effectiveThrough: '2026-11-30',
    status: 'SCHEDULED',
  },
]

export function getEnhancedAuthorExperience(slug: string): EnhancedAuthorExperience | null {
  return enhancedAuthorExperiences.find((experience) => experience.slug === slug) || null
}

export function getFeaturedAuthorRuntimeState(
  featured: FeaturedAuthorExperience,
  date: Date | string = new Date(),
): FeaturedAuthorRuntimeState {
  const current = easternDateKey(date)
  if (current < featured.effectiveFrom) return 'PRE_NOVEMBER'
  if (current > featured.effectiveThrough) return 'POST_NOVEMBER'
  return 'ACTIVE'
}

export function getCurrentFeaturedAuthorExperience(date: Date | string = new Date()): FeaturedAuthorExperience | null {
  return featuredAuthorExperiences.find((featured) => getFeaturedAuthorRuntimeState(featured, date) === 'ACTIVE') || null
}

export function getFeaturedAuthorExperience(slug: string): FeaturedAuthorExperience | null {
  return featuredAuthorExperiences.find((featured) => featured.slug === slug) || null
}

export function authorExperienceContentRequired(experience: EnhancedAuthorExperience | null): string[] {
  return experience?.contentRequired || []
}

export function resolveFeaturedAuthorTitle(
  featured: FeaturedAuthorExperience | EnhancedAuthorExperience,
  titles: CatalogTitleSummary[],
): CatalogTitleSummary | null {
  return titles.find((title) => title.slug === featured.featuredTitleSlug || title.id === featured.featuredTitleSlug) || null
}

export function enhancedAuthorAuthorityIsValid(
  experience: EnhancedAuthorExperience,
  authors: Array<CatalogAuthorSummary | CatalogAuthorDetail>,
  titles: CatalogTitleSummary[],
) {
  return Boolean(
    authors.some((author) => author.slug === experience.slug) &&
      resolveFeaturedAuthorTitle(experience, titles),
  )
}

function easternDateKey(date: Date | string): string {
  if (typeof date === 'string') return date.slice(0, 10)

  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date)

  const part = (type: string) => parts.find((item) => item.type === type)?.value || ''
  return `${part('year')}-${part('month')}-${part('day')}`
}
