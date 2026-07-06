export type AuthorWorkspaceTone = 'complete' | 'active' | 'pending' | 'hold'

export type AuthorWorkspaceModule = {
  id: string
  href: string
  title: string
  eyebrow: string
  status: string
  tone: AuthorWorkspaceTone
  summary: string
  whyItMatters: string
  currentFocus: string
  nextStep: string
  checklist: readonly string[]
  note?: string
}

export const commissioningTitle = {
  title: 'The Intentional Leader',
  reference: 'JMP-INT-202607-0W5PTQ',
  packageName: 'Premier Publishing Package',
  workspaceStatus: 'Active publishing workspace',
  distributionStatus: 'Release held for approval',
} as const

export const authorWorkspaceModules: readonly AuthorWorkspaceModule[] = [
  {
    id: 'editorial',
    href: '/author/editorial',
    title: 'Editorial',
    eyebrow: 'Manuscript development',
    status: 'Active',
    tone: 'active',
    summary: 'Your manuscript is moving through the editorial path established for your book.',
    whyItMatters: 'This is where we protect the strength, clarity, structure, and reader experience of the manuscript before design begins.',
    currentFocus: 'Preparing the manuscript for the next editorial stage.',
    nextStep: 'Watch for any author review request or requested clarification from J Merrill Publishing.',
    checklist: [
      'Editorial path confirmed',
      'Style and imprint direction carried forward',
      'Author-facing requests will be shown here when your response is needed',
    ],
  },
  {
    id: 'cover',
    href: '/author/cover',
    title: 'Cover Design',
    eyebrow: 'Visual direction',
    status: 'Preparing',
    tone: 'pending',
    summary: 'Cover planning will begin from your book’s audience, category, tone, and publishing package.',
    whyItMatters: 'The cover is the reader’s first signal. It needs to feel true to the book and strong in a retail setting.',
    currentFocus: 'Gathering the creative direction needed for the first cover brief.',
    nextStep: 'You may be asked to review cover direction, preferences, or concept options when they are ready.',
    checklist: [
      'Cover brief',
      'Market/category fit',
      'Concept review',
      'Final cover approval',
    ],
  },
  {
    id: 'layout',
    href: '/author/layout',
    title: 'Interior Layout',
    eyebrow: 'Book design',
    status: 'Queued',
    tone: 'pending',
    summary: 'Interior layout will turn the edited manuscript into a polished book interior.',
    whyItMatters: 'Good layout shapes readability, pacing, chapter flow, image placement, and the finished feel of the book.',
    currentFocus: 'Waiting for the manuscript and design inputs to be ready for layout.',
    nextStep: 'When layout proofs are ready, you will review them here and provide any requested changes.',
    checklist: [
      'Trim size and format',
      'Interior design direction',
      'Proof review',
      'Final interior approval',
    ],
  },
  {
    id: 'production',
    href: '/author/production-readiness',
    title: 'Production',
    eyebrow: 'Final files',
    status: 'Queued',
    tone: 'pending',
    summary: 'Production brings approved editorial, cover, and interior work into final file readiness.',
    whyItMatters: 'This step helps make sure the book files are complete, consistent, and ready before distribution preparation.',
    currentFocus: 'Production remains queued until editorial, cover, and layout gates are satisfied.',
    nextStep: 'No action is needed yet. We will show any file review requests when the book reaches this point.',
    checklist: [
      'Final manuscript readiness',
      'Final cover readiness',
      'Final interior readiness',
      'Publisher release approval',
    ],
  },
  {
    id: 'distribution',
    href: '/author/distribution-command',
    title: 'Distribution',
    eyebrow: 'Release preparation',
    status: 'Release held',
    tone: 'hold',
    summary: 'Distribution preparation can be reviewed, but no public release action will happen until J Merrill Publishing approves the release.',
    whyItMatters: 'Distribution readiness makes sure the metadata, files, formats, and channel plan are correct before any public release action.',
    currentFocus: 'Holding before any retailer, printer, preorder, or public availability action.',
    nextStep: 'No author action is needed while release approval is pending.',
    checklist: [
      'Metadata readiness',
      'Print and ebook readiness',
      'Channel preparation',
      'Publisher release authorization',
    ],
    note: 'No retailer submission, public listing, preorder, or public release occurs until release approval is complete.',
  },
  {
    id: 'marketing',
    href: '/author/marketing',
    title: 'Marketing',
    eyebrow: 'Launch preparation',
    status: 'Planning',
    tone: 'pending',
    summary: 'Marketing preparation will shape the book’s message, launch materials, reader positioning, and campaign readiness.',
    whyItMatters: 'A strong launch needs clear language, consistent visuals, and the right audience path before any public promotion begins.',
    currentFocus: 'Preparing the foundation for future launch messaging without starting a public campaign.',
    nextStep: 'You may be asked to review author bio, book description, launch preferences, or marketing assets later.',
    checklist: [
      'Book description',
      'Author bio',
      'Launch message',
      'Marketing kit readiness',
    ],
  },
  {
    id: 'royalties',
    href: '/author/royalties',
    title: 'Royalties Dashboard',
    eyebrow: 'Future reporting',
    status: 'Not yet active',
    tone: 'pending',
    summary: 'Royalty reporting will become available after the book is released and reportable activity exists.',
    whyItMatters: 'This area will help you understand royalty cycles and future reporting without exposing private financial processing details.',
    currentFocus: 'Royalty setup is complete enough for commissioning; live royalty reporting has not started.',
    nextStep: 'No action is needed until royalty reporting becomes active for the title.',
    checklist: [
      'Royalty profile readiness',
      'Title relationship',
      'Reporting cadence',
      'Future statements',
    ],
  },
  {
    id: 'author-success',
    href: '/author/author-success',
    title: 'Author Success',
    eyebrow: 'Relationship support',
    status: 'Active',
    tone: 'active',
    summary: 'This is the relationship layer for questions, next steps, future titles, and long-term author support.',
    whyItMatters: 'Publishing is not just a file handoff. This area keeps communication, support, and future planning visible.',
    currentFocus: 'Keeping the author relationship active while the first title moves through production.',
    nextStep: 'Reach out to publishing@jmerrill.one if you need help or have a question about your project.',
    checklist: [
      'Support contact',
      'Project questions',
      'Future title planning',
      'Relationship follow-up',
    ],
  },
] as const

export function getAuthorWorkspaceModule(id: string) {
  return authorWorkspaceModules.find((module) => module.id === id) || null
}
