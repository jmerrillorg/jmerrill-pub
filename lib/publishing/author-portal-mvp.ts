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
  authorRelationship: 'Activated publishing relationship',
  titleRelationship: 'Title child record eligible for production readiness',
  agreementStatus: 'Signed / completed',
  firstPaymentStatus: 'Paid / confirmed',
  portalStatus: 'Active',
  systemOfRecord: 'Dataverse',
  fileLayer: 'SharePoint',
} as const

export const portalMilestones = [
  { label: 'Agreement', status: 'Complete', tone: 'complete' },
  { label: 'First payment', status: 'Confirmed', tone: 'complete' },
  { label: 'Portal', status: 'Active', tone: 'active' },
  { label: 'Onboarding', status: 'Author action', tone: 'pending' },
  { label: 'Production readiness', status: 'Staff review', tone: 'pending' },
  { label: 'Registration', status: 'Next module', tone: 'locked' },
] as const

export const portalTasks: PortalTask[] = [
  {
    id: 'author-onboarding',
    label: 'Complete author onboarding',
    owner: 'Author',
    status: 'Available',
    tone: 'active',
    description: 'Confirm author identity, title metadata, manuscript status, production preferences, and marketing foundation.',
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
    description: 'Confirm title coverage, royalty contact, reporting preference, agreement status, and future dashboard readiness.',
    href: '/author/royalty-setup',
  },
  {
    id: 'workspace-review',
    label: 'Review project workspace',
    owner: 'J Merrill Publishing',
    status: 'Staff-managed',
    tone: 'pending',
    description: 'Project files remain in the governed SharePoint workspace. Staff will share approved links or requests as needed.',
  },
  {
    id: 'metadata-readiness',
    label: 'Confirm metadata readiness',
    owner: 'J Merrill Publishing',
    status: 'Pending review',
    tone: 'pending',
    description: 'Title metadata is reviewed before registration, production, distribution, and release readiness.',
  },
]

export const portalFileControls = [
  ['Approved documents only', 'The portal shows approved document status and file pathways, not raw manuscript storage.'],
  ['Version protection', 'Production files, proofs, and metadata updates must follow staff-managed version control.'],
  ['No sensitive uploads', 'Tax IDs, bank details, and signatures stay in approved secure systems, not website notes.'],
  ['SharePoint remains file layer', 'The author/title workspace is the file home; Dataverse remains status authority.'],
] as const

export const portalReadinessCards = [
  ['Payment confirmation', 'Confirmed through OP-002 before portal activation. The portal does not create payment links.'],
  ['Contact pathway', 'Authors can route questions to publishing@jmerrill.one while staff workflows remain authoritative.'],
  ['Marketing signal', 'Author platform and launch inputs are captured through onboarding, but public marketing remains gated.'],
  ['Royalty visibility', 'Future royalty statements remain hidden until live royalty generation is separately authorized.'],
] as const

export const portalBoundaryRows = [
  ['System of record', 'Dataverse, not portal'],
  ['File authority', 'SharePoint workspace'],
  ['Payments', 'No payment request generated'],
  ['Contracts', 'No signing packet generated'],
  ['Production', 'Not started by portal'],
  ['Royalties', 'No live statements or payments'],
] as const
