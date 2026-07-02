export type RegistrationTone = 'complete' | 'active' | 'pending' | 'blocked'

export type RegistrationChecklistItem = {
  id: string
  label: string
  owner: 'Publishing Operations' | 'Author' | 'Publisher'
  status: string
  tone: RegistrationTone
  description: string
}

export const registrationSummary = {
  commandCenter: 'OP-004 Registration',
  workflowState: 'Readiness tracking',
  systemOfRecord: 'Dataverse',
  evidenceLayer: 'SharePoint',
  liveSubmissions: 'Not triggered by website',
  nextGate: 'Editorial Command Center',
} as const

export const registrationWorkflow = [
  { label: 'Title metadata', status: 'Required', tone: 'active' },
  { label: 'ISBN assignment', status: 'Tracked', tone: 'pending' },
  { label: 'BISAC categories', status: 'Tracked', tone: 'pending' },
  { label: 'LCCN workflow', status: 'Tracked', tone: 'pending' },
  { label: 'Copyright workflow', status: 'Tracked', tone: 'pending' },
  { label: 'Registration approval', status: 'Locked', tone: 'blocked' },
] as const

export const registrationChecklist: RegistrationChecklistItem[] = [
  {
    id: 'title-metadata',
    label: 'Confirm title metadata',
    owner: 'Publishing Operations',
    status: 'Required',
    tone: 'active',
    description: 'Confirm title, subtitle, author display name, imprint, edition, formats, description posture, keywords, and release-readiness notes.',
  },
  {
    id: 'isbn-management',
    label: 'Track ISBN management',
    owner: 'Publishing Operations',
    status: 'Tracked',
    tone: 'pending',
    description: 'Track ISBN need by format, assignment status, format association, barcode dependency, and final metadata alignment.',
  },
  {
    id: 'copyright-registration',
    label: 'Prepare copyright registration',
    owner: 'Publisher',
    status: 'Tracked',
    tone: 'pending',
    description: 'Track copyright claimant, authorship basis, publication status, deposit copy readiness, filing evidence, and registration certificate follow-up.',
  },
  {
    id: 'lccn-workflow',
    label: 'Prepare LCCN workflow',
    owner: 'Publishing Operations',
    status: 'Tracked',
    tone: 'pending',
    description: 'Track eligibility, title-page readiness, imprint metadata, submission status, control number, and evidence location.',
  },
  {
    id: 'bisac-category',
    label: 'Confirm BISAC and categories',
    owner: 'Publishing Operations',
    status: 'Tracked',
    tone: 'pending',
    description: 'Track primary BISAC, secondary BISAC, market categories, audience posture, comparable shelf, and downstream distribution readiness.',
  },
  {
    id: 'registration-approval',
    label: 'Approve registration packet',
    owner: 'Publisher',
    status: 'Locked',
    tone: 'blocked',
    description: 'Publisher approval is required before live registration submission, public metadata use, or downstream production certification.',
  },
]

export const registrationStatusRows = [
  ['ISBN assignment', 'Tracked only; no automatic assignment'],
  ['Copyright filing', 'Prepared only; no live filing'],
  ['LCCN request', 'Prepared only; no live submission'],
  ['BISAC/category', 'Draft readiness only'],
  ['Metadata readiness', 'Requires publisher approval'],
  ['Execution log', 'Safe evidence expected where practical'],
] as const

export const registrationEvidenceRows = [
  ['Dataverse', 'Registration status, title metadata readiness, approvals, blockers'],
  ['SharePoint', 'Evidence files, correspondence, certificate copies, metadata packet'],
  ['Website', 'Read-only command-center surface; not source of truth'],
  ['External agencies', 'No submission triggered by OP-004 website MVP'],
] as const

export const registrationBoundaries = [
  'Does not assign ISBNs.',
  'Does not file copyright registrations.',
  'Does not submit LCCN requests.',
  'Does not submit metadata to retailers or distributors.',
  'Does not start editorial, production, distribution, launch, royalties, or author payments.',
  'Does not expose sensitive author or private project records.',
] as const
