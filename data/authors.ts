export type AuthorOverride = {
  slug: string
  name: string
  shortBio?: string
  longBio?: string
  photoUrl?: string
  location?: string
  featuredQuote?: string
  specialties?: string[]
  socialLinks?: Array<{ label: string; href: string }>
}

export const authorOverrides: AuthorOverride[] = [
  {
    slug: 'jackie-smith-jr',
    name: 'Jackie Smith, Jr.',
    shortBio:
      'Founder of J Merrill Publishing and a relationship-first publishing strategist focused on authorship, ownership, and legacy.',
    longBio:
      'Jackie Smith, Jr. is the founder of J Merrill Publishing, Inc. and the visionary behind J Merrill One. His work centers on helping authors protect their intellectual property, publish with excellence, and build platforms that outlast a single launch cycle.',
    location: 'Columbus, Ohio',
    specialties: ['Publishing strategy', 'Faith publishing', 'Author platform growth'],
    featuredQuote:
      'Publishing should feel like entering a family with standards, infrastructure, and vision.',
  },
  {
    slug: 'carolyn-pierce',
    name: 'Carolyn Pierce',
    shortBio:
      'A J Merrill Publishing author whose work expands the flagship catalog with practical, reader-focused storytelling.',
    longBio:
      'Carolyn Pierce is part of the J Merrill Publishing author family, contributing work that reflects the premium yet accessible publishing standard the brand is known for. Her titles support the broader mission of helping authors help themselves through thoughtful, professionally curated publishing.',
    specialties: ['Reader engagement', 'Personal storytelling'],
  },
  {
    slug: 'obadiah-harris',
    name: 'Obadiah Harris',
    shortBio:
      'A J Merrill Publishing author contributing insight-driven work designed to serve readers with clarity and purpose.',
    longBio:
      'Obadiah Harris is among the voices represented in the J Merrill Publishing catalog, writing work positioned for meaningful reach through a relationship-driven publishing model. His presence in the catalog reflects the flagship brand’s commitment to substantive, professionally produced books.',
    specialties: ['Inspirational writing', 'Wisdom literature'],
  },
  {
    slug: 'toni-kleckley',
    name: 'Toni Kleckley',
    shortBio:
      'A J Merrill Publishing author whose titles contribute to the catalog’s focus on purposeful, conversation-shaping work.',
    longBio:
      'Toni Kleckley is part of the J Merrill Publishing author roster, contributing work that aligns with the publisher’s commitment to accessible publishing, professional curation, and meaningful reader impact.',
    specialties: ['Personal narrative', 'Thought leadership'],
  },
]
