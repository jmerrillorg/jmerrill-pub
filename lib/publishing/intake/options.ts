// TODO(INT-PUB-005): Align WORK_TYPE_OPTIONS to the Dataverse jm1pub_manuscripttype choice during mapping.
export const WORK_TYPE_OPTIONS = [
  'Full-length Book',
  'Novella',
  "Children's Picture Book",
  'Poetry Collection',
  'Devotional',
  'Workbook / Journal',
  'Short Story Collection',
  'Other',
] as const

export const MANUSCRIPT_STATUS_OPTIONS = [
  'Complete',
  'Near complete',
  'In progress',
  'Idea stage',
] as const

export const PUBLISHED_BEFORE_OPTIONS = [
  'First book',
  'Published before with JMP',
  'Published before elsewhere',
] as const

export const REFERRAL_SOURCE_OPTIONS = [
  'Referral',
  'Church or ministry',
  'Social media',
  'Search',
  'Event',
  'Other',
] as const

export type WorkType = (typeof WORK_TYPE_OPTIONS)[number]
export type ManuscriptStatus = (typeof MANUSCRIPT_STATUS_OPTIONS)[number]
export type PublishedBefore = (typeof PUBLISHED_BEFORE_OPTIONS)[number]
export type ReferralSource = (typeof REFERRAL_SOURCE_OPTIONS)[number]
