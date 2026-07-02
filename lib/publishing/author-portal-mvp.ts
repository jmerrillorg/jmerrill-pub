export type PortalStatusTone = 'complete' | 'active' | 'pending' | 'locked'

export type PortalTask = {
  id: string
  label: string
  owner: 'Author' | 'J Merrill Publishing'
  status: string
  tone: PortalStatusTone
  description: string
  href?: string
}

export const portalActivationSummary = {
  authorRelationship: 'Accepted author relationship',
  titleRelationship: 'Title child record pending contract package',
  agreementStatus: 'Not generated until setup is complete',
  firstPaymentStatus: 'Not requested until setup is complete',
  portalStatus: 'Pre-contract intake',
  systemOfRecord: 'Dataverse',
  fileLayer: 'SharePoint',
} as const

export const portalMilestones = [
  { label: 'Author accepts', status: 'Complete', tone: 'complete' },
  { label: 'Portal invitation', status: 'Available', tone: 'active' },
  { label: 'Author onboarding', status: 'Required', tone: 'pending' },
  { label: 'Financial setup', status: 'Required', tone: 'pending' },
  { label: 'Royalty setup', status: 'Required', tone: 'pending' },
  { label: 'Contract + payment', status: 'Locked', tone: 'locked' },
] as const

export const portalTasks: PortalTask[] = [
  {
    id: 'author-onboarding',
    label: 'Complete author onboarding',
    owner: 'Author',
    status: 'Available',
    tone: 'active',
    description: 'Confirm author identity, address, legal name, title metadata, manuscript status, production preferences, and marketing foundation.',
    href: '/author/onboarding',
  },
  {
    id: 'financial-setup',
    label: 'Complete financial setup',
    owner: 'Author',
    status: 'Available',
    tone: 'active',
    description: 'Provide payee readiness, tax-document status, and secure follow-up preferences without entering bank or tax ID values.',
    href: '/author/financial-setup',
  },
  {
    id: 'royalty-setup',
    label: 'Complete royalty setup',
    owner: 'Author',
    status: 'Available',
    tone: 'active',
    description: 'Confirm title coverage, royalty contact, reporting preference, and future royalty dashboard readiness.',
    href: '/author/royalty-setup',
  },
]

export const portalFileControls = [
  ['Pre-contract only', 'This portal opens before the contract package is generated so required author information can be collected first.'],
  ['No private project materials', 'Private project materials remain hidden until active portal unlock is authorized.'],
  ['No sensitive uploads', 'Tax IDs, bank details, and signatures stay in approved secure systems, not website notes.'],
  ['Dataverse remains authority', 'Portal status reflects governed records; the portal does not become the source of truth.'],
] as const

export const portalReadinessCards = [
  ['Contract package', 'Generated only after Author Onboarding, Financial Setup, and Royalty Setup are complete.'],
  ['Payment request', 'Generated only after the contract package is ready; no payment request is shown in pre-contract mode.'],
  ['Active portal unlock', 'Additional project modules remain hidden until agreement and payment are complete.'],
  ['Returning authors', 'Existing author portals receive new title children; onboarding updates are requested only when required.'],
] as const

export const portalBoundaryRows = [
  ['System of record', 'Dataverse, not portal'],
  ['Visible modules', 'Onboarding, financial setup, royalty setup'],
  ['Payments', 'No payment request generated'],
  ['Agreement actions', 'No signing packet generated'],
  ['Project workspace', 'Unavailable before active unlock'],
  ['Financial records', 'Unavailable before active unlock'],
] as const
