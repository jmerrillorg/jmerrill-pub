export type SitePageStatus = 'Live' | 'Planned'

export type SitePage = {
  title: string
  href: string
  eyebrow: string
  description: string
  audience: string
  status: SitePageStatus
  ctaLabel: string
}

export type PlatformModule = {
  name: string
  phase: string
  description: string
  outcome: string
}

export type JourneyMilestone = {
  step: string
  title: string
  description: string
  destination: string
}

export const homePageSectionOrder = [
  'hero',
  'operating-system',
  'catalog',
  'author-journey',
  'onboarding',
  'packages',
  'imprints',
  'architecture',
  'memberships',
  'platform',
  'closing',
] as const

export const flagshipExperiencePages: SitePage[] = [
  {
    title: 'Book Catalog',
    href: '/books',
    eyebrow: 'Catalog Layer',
    description:
      'A living catalog of titles, formats, and imprints designed to strengthen jmerrill.pub as the domain authority around every book.',
    audience: 'Readers, booksellers, libraries, and prospective authors evaluating the catalog.',
    status: 'Live',
    ctaLabel: 'View catalog',
  },
  {
    title: 'Authors',
    href: '/authors',
    eyebrow: 'Author Layer',
    description:
      'Dedicated author profiles that connect each writer to their books, positioning, and relationship with the flagship publishing brand.',
    audience: 'Readers and partners researching the people behind the books.',
    status: 'Live',
    ctaLabel: 'Meet the authors',
  },
  {
    title: 'Publishing Services',
    href: '/services',
    eyebrow: 'Capability Layer',
    description:
      'Full-spectrum editorial, production, AI publishing intelligence, marketing, distribution, and author platform services.',
    audience: 'Authors comparing what J Merrill can execute end to end.',
    status: 'Live',
    ctaLabel: 'Explore services',
  },
  {
    title: 'Publishing',
    href: '/publishing',
    eyebrow: 'Publishing Layer',
    description:
      'The flagship publishing overview: relationship model, package pathways, publishing standards, and how authors move through the system.',
    audience: 'Prospective authors deciding whether JMP is the right publishing home.',
    status: 'Live',
    ctaLabel: 'Explore publishing',
  },
  {
    title: 'Join the Family',
    href: '/join',
    eyebrow: 'Onboarding Layer',
    description:
      'The flagship inquiry and onboarding entrypoint that routes authors into the right package, partner tier, and next step.',
    audience: 'Ready-to-start authors who need a premium onboarding experience.',
    status: 'Live',
    ctaLabel: 'Start onboarding',
  },
  {
    title: 'Contact',
    href: '/contact',
    eyebrow: 'Connection Layer',
    description:
      'A clear, premium contact surface for publishing inquiries, media requests, consultations, and future reader growth touchpoints.',
    audience: 'Authors, media, partners, and readers who need a direct path into the brand.',
    status: 'Live',
    ctaLabel: 'Get in touch',
  },
]

export const relationshipPages: SitePage[] = [
  {
    title: 'About J Merrill Publishing',
    href: '/about',
    eyebrow: 'Brand Layer',
    description:
      'Mission, standards, ownership philosophy, and the reason this publishing company exists in the first place.',
    audience: 'Authors deciding whether the brand is the right home.',
    status: 'Live',
    ctaLabel: 'Read the story',
  },
  {
    title: 'Publishing Packages',
    href: '/packages',
    eyebrow: 'Commercial Layer',
    description:
      'Structured Starter, Professional, and Signature publishing packages with premium delivery and clear scope.',
    audience: 'Authors choosing the right investment tier.',
    status: 'Live',
    ctaLabel: 'Compare packages',
  },
  {
    title: 'Distribution Network',
    href: '/distribution',
    eyebrow: 'Infrastructure Layer',
    description:
      'Publisher-grade print, digital, audio, and faith-market distribution built on Ingram infrastructure.',
    audience: 'Authors who need channel confidence before they publish.',
    status: 'Live',
    ctaLabel: 'See the network',
  },
  {
    title: 'Author Journey',
    href: '/author-journey',
    eyebrow: 'Journey Layer',
    description:
      'A dedicated walkthrough of how authors move from inquiry to launch, growth, and long-term catalog building.',
    audience: 'Prospective authors who want clarity before committing.',
    status: 'Live',
    ctaLabel: 'Walk the journey',
  },
  {
    title: 'Publishing Partner Program',
    href: '/publishing-partner',
    eyebrow: 'High-Touch Layer',
    description:
      'Application-based publishing support for authors building a body of work, not just one title.',
    audience: 'Authors, coaches, and ministry leaders with real catalog momentum.',
    status: 'Live',
    ctaLabel: 'See the program',
  },
  {
    title: 'Author Memberships',
    href: '/memberships',
    eyebrow: 'Retention Layer',
    description:
      'Community, support, marketing, and AI-powered memberships that keep authors connected after launch.',
    audience: 'Published authors ready for continuity, support, and growth.',
    status: 'Live',
    ctaLabel: 'Review memberships',
  },
  {
    title: 'Platform Roadmap',
    href: '/platform',
    eyebrow: 'Enterprise Layer',
    description:
      'The future-state content platform for Dataverse, Dynamics, Power BI, and AI-driven author lifecycle orchestration.',
    audience: 'Strategic partners and internal stakeholders planning the next platform phase.',
    status: 'Live',
    ctaLabel: 'View roadmap',
  },
]

export const authorJourneyMilestones: JourneyMilestone[] = [
  {
    step: '01',
    title: 'Discover the right entry point',
    description:
      'Authors begin on the homepage, packages, services, or pathfinder experience and are routed toward the right publishing fit.',
    destination: '/packages',
  },
  {
    step: '02',
    title: 'Join the Family onboarding',
    description:
      'Inquiry, evaluation, package matching, and consultation are treated as a premium onboarding experience instead of a generic form fill.',
    destination: '/join',
  },
  {
    step: '03',
    title: 'Move through production with clarity',
    description:
      'Editorial, design, metadata, distribution, and launch are framed as one guided operating system, not disconnected services.',
    destination: '/author-journey',
  },
  {
    step: '04',
    title: 'Grow into long-term author support',
    description:
      'Memberships, partner programs, dashboards, and future automation deepen the relationship after the first publication.',
    destination: '/memberships',
  },
]

export const platformRoadmap: PlatformModule[] = [
  {
    name: 'Dataverse author graph',
    phase: 'Phase 1',
    description:
      'Unify author, title, package, imprint, and lifecycle records into one governed publishing data model.',
    outcome: 'One source of truth for every relationship and every title.',
  },
  {
    name: 'Dynamics onboarding orchestration',
    phase: 'Phase 2',
    description:
      'Route inquiries, consultations, package decisions, and production handoffs through structured business workflows.',
    outcome: 'Premium onboarding with less operational drag and more consistency.',
  },
  {
    name: 'Power BI catalog intelligence',
    phase: 'Phase 3',
    description:
      'Surface performance by title, channel, imprint, and campaign in executive, team, and author-friendly dashboards.',
    outcome: 'Faster decisions and clearer visibility into publishing performance.',
  },
  {
    name: 'AI publishing agents',
    phase: 'Phase 4',
    description:
      'Deploy governed assistants for package guidance, metadata enrichment, launch prep, and relationship follow-through.',
    outcome: 'A more intelligent publishing experience without sacrificing human trust.',
  },
]
