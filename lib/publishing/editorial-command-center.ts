export type EditorialTone = 'complete' | 'active' | 'pending' | 'blocked'

export type EditorialStage = {
  id: string
  label: string
  status: string
  tone: EditorialTone
  description: string
}

export const editorialDataverseSources = {
  diagnostic: {
    logicalName: 'jm1pub_editorialdiagnostic',
    entitySet: 'jm1pub_editorialdiagnostics',
    primaryId: 'jm1pub_editorialdiagnosticid',
    primaryName: 'jm1pub_name',
  },
  stage: {
    logicalName: 'jm1pub_editorialstage',
    entitySet: 'jm1pub_editorialstages',
    primaryId: 'jm1pub_editorialstageid',
    primaryName: 'jm1pub_name',
  },
  title: {
    logicalName: 'jm1pub_title',
    entitySet: 'jm1pub_titles',
    primaryId: 'jm1pub_titleid',
    primaryName: 'jm1pub_titlename',
  },
  executionLog: {
    logicalName: 'jm1_executionlog',
    entitySet: 'jm1_executionlogs',
    primaryId: 'jm1_executionlogid',
    primaryName: 'jm1_name',
  },
} as const

export const editorialSummary = {
  commandCenter: 'OP-005 Editorial',
  workflowState: 'Orchestration only',
  systemOfRecord: 'Dataverse',
  doctrineSource: 'JM Editorial Doctrine',
  authorWorkspaceExposure: 'Stage, next action, safe summary only',
  nextGate: 'Cover Design Command Center',
} as const

export const editorialStyleGuides = [
  'CMoS',
  'APA',
  'MLA',
  'AP',
  'Harvard',
  'Turabian',
  'AMA',
  'ACS',
  'Bluebook',
  'IEEE',
  'CSE',
  'GPO',
  'MHRA',
  'Oxford',
] as const

export const internalStyleOverlays = [
  'Faith & Inspirational',
  'Urban / Street-Lit Voice Preservation',
  "Children's Book Standard",
] as const

export const editorialStages: EditorialStage[] = [
  {
    id: 'imprint-confirmation',
    label: 'Imprint confirmation',
    status: 'Required',
    tone: 'active',
    description: 'Confirm imprint/path before editorial routing; missing imprint is a hard stop.',
  },
  {
    id: 'stage-3-review',
    label: 'Stage 3 Editorial Review',
    status: 'Canon',
    tone: 'complete',
    description: 'Invoke approved Editorial Review doctrine, score the eight categories, assign style guide once, and route safely.',
  },
  {
    id: 'stage-4-developmental',
    label: 'Stage 4 Developmental Editing',
    status: 'Approved canon',
    tone: 'pending',
    description: 'Invoke approved Developmental Editing doctrine; hard-stop re-trigger remains active.',
  },
  {
    id: 'stage-5-line',
    label: 'Stage 5 Line Editing',
    status: 'Approved canon',
    tone: 'pending',
    description: 'Invoke approved Line Editing doctrine; carry forward Stage 3 style guide unless publisher override is logged.',
  },
  {
    id: 'stage-6-copyedit',
    label: 'Stage 6 Copyediting',
    status: 'Approved canon',
    tone: 'pending',
    description: 'Invoke approved Copyediting doctrine; maintain style guide and JM Signature guard.',
  },
  {
    id: 'stage-7a-manuscript-proofread',
    label: 'Stage 7a Manuscript Proofread',
    status: 'Approved canon',
    tone: 'pending',
    description: 'Invoke approved manuscript proofread doctrine before OP-007 interior layout handoff.',
  },
  {
    id: 'op-007-handoff',
    label: 'OP-007 handoff',
    status: 'Handoff tracked',
    tone: 'pending',
    description: 'Move only approved proof-ready manuscript state into Interior Layout Command Center.',
  },
  {
    id: 'stage-7b-production-proofread',
    label: 'Stage 7b Production Proofread',
    status: 'Re-entry tracked',
    tone: 'pending',
    description: 'Re-enter editorial proofing after layout/proof files exist; hard-stop re-trigger remains active.',
  },
  {
    id: 'stage-8-handoff',
    label: 'Stage 8 handoff',
    status: 'Locked',
    tone: 'blocked',
    description: 'Distribution handoff stays locked until editorial approval, production proofread, and publisher approval are complete.',
  },
]

export const editorialHardStops = [
  'Missing imprint',
  'JM Signature without required Publisher authorization',
  'Rights issue',
  'Ethics issue',
  'Sensitivity flag',
  'Plagiarism or attribution concern',
  'Legal or content-risk concern',
  'Unconfirmed Dataverse table reference',
] as const

export const editorialStatusRows = [
  ['Style guide assignment', 'Determined at Stage 3 and carried forward unless Publisher override is logged'],
  ['Scoring visibility', 'Internal only; raw scores do not display in Author Workspace'],
  ['Hard-stop details', 'Internal only; author sees safe status or review-request language'],
  ['Author interaction', 'Approval and request-changes actions require free-text response'],
  ['Execution logging', 'Stage transitions write safe evidence to jm1_executionlog where practical'],
  ['JM Signature', 'Publisher-only advisory guard persists at every editorial stage'],
] as const

export const editorialAuthorWorkspaceRows = [
  ['Current stage', 'Safe stage/progress label'],
  ['Next action', 'Author approval, revision request, or no action needed'],
  ['Safe summary', 'Plain-language status without raw scores or internal risk detail'],
  ['Review response', 'Free-text response required for approval or requested changes'],
] as const

export const editorialBoundaries = [
  'Does not invent generic editorial methodology.',
  'Does not expose raw diagnostic scores, internal notes, or hard-stop detail to authors.',
  'Does not send author communications.',
  'Does not rewrite manuscripts or run autonomous editorial agents.',
  'Does not start cover, layout, distribution, launch, royalties, payments, or Business Central postings.',
  'Does not create duplicate Opportunities or replace Dataverse as the source of truth.',
] as const
