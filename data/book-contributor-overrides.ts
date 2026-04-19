export type BookContributorOverride = {
  displayName: string
  contributors: Array<{
    name: string
    slug?: string | null
  }>
}

export const bookContributorOverrides: Record<string, BookContributorOverride> = {
  'department-of-the-air-force-mission-driven-leadership': {
    displayName: 'Multiple Authors',
    contributors: [
      { name: 'Andrew Bowens', slug: null },
      { name: 'Lenetta Banks Williams', slug: null },
      { name: 'Jamichael Hill Beard', slug: null },
      { name: 'Anthony Cain', slug: null },
    ],
  },
}
