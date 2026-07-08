import { cookies } from 'next/headers'
import { type NextRequest, NextResponse } from 'next/server'

import {
  buildPortalTaskState,
  createAuthorPortalSession,
  getAuthorPortalCookieName,
  readAuthorPortalSession,
  resolveAuthorPortalAccessGrant,
  type AuthorPortalSession,
} from './author-portal-access'
import {
  dataverseFirst,
  dataverseFormatted,
  dataverseList,
  dataverseLookupId,
  getDataverseServerConfig,
  stringValue,
} from './dataverse-server'

export type AuthorPortalProjectSummary = {
  key: string
  title: string
  intakeReference: string
  opportunityId?: string
  titleId?: string
  publishingAssetId?: string
  statusLabel: string
  nextActionLabel?: string
  pendingApprovalLabel?: string
  workspaceState: 'pre_contract' | 'active_editorial'
}

export type AuthorPortalContext = {
  access: {
    intakeReference: string
    scope: 'project' | 'relationship'
    source: 'dataverse' | 'development-fallback'
  }
  author: {
    name: string
    firstName: string
    email: string
    contactId?: string
    isReturningAuthor: boolean
    relationshipState?: string
    workspaceMode?: string
  }
  currentProject: AuthorPortalProjectSummary
  projects: AuthorPortalProjectSummary[]
  selectedProjectKey: string
  tasks: {
    authorProfileRequired: boolean
    paymentRoyaltyRequired: boolean
  }
  editorial: null | {
    stageLabel: string
    stageStatus: string
    summary: string
    nextActionLabel?: string
  }
}

type ResolveOverrides = {
  intakeReference?: string
  opportunityId?: string
  titleId?: string
  publishingAssetId?: string
}

type ResolvedProjectRow = {
  intakeReference: string
  title: string
  opportunityId?: string
  titleId?: string
  publishingAssetId?: string
  stageLabel?: string
  stageStatus?: string
  summary?: string
  nextActionLabel?: string
  pendingApprovalLabel?: string
  workspaceState: 'pre_contract' | 'active_editorial'
}

export async function createAuthorPortalGateResponse({
  code,
  requestedReference,
}: {
  code: string
  requestedReference?: string
}) {
  const resolvedGrant = resolveAuthorPortalAccessGrant({ code, requestedReference })
  const grant = resolvedGrant
    ? ({
        ...resolvedGrant,
        scope: resolvedGrant.scope === 'relationship' ? 'relationship' : 'project',
      } satisfies typeof resolvedGrant)
    : null

  if (!grant) {
    return NextResponse.json({ error: 'Invalid access code.' }, { status: 401 })
  }

  const sessionValue = createAuthorPortalSession(grant)
  const context = await resolveAuthorPortalContext(readAuthorPortalSession(sessionValue), {
    intakeReference: requestedReference || grant.intakeReference,
  })
  const response = NextResponse.json({ success: true, context })

  response.cookies.set(getAuthorPortalCookieName(), sessionValue, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 8,
  })

  return response
}

export function requireAuthorAccess(req: NextRequest) {
  const session = readAuthorPortalSession(req.cookies.get(getAuthorPortalCookieName())?.value)
  if (session) return { session }

  return {
    unauthorized: NextResponse.json(
      {
        error: 'Author workspace access is restricted. Please unlock the author workspace with the access code provided by J Merrill Publishing.',
      },
      { status: 401 },
    ),
  }
}

export async function getAuthorPortalContextFromCookies(overrides?: ResolveOverrides) {
  const session = readAuthorPortalSession(cookies().get(getAuthorPortalCookieName())?.value)
  if (!session) return null
  return resolveAuthorPortalContext(session, overrides)
}

export async function resolveAuthorPortalContext(
  session: AuthorPortalSession | null,
  overrides: ResolveOverrides = {},
): Promise<AuthorPortalContext | null> {
  if (!session) return null

  const config = getDataverseServerConfig()
  if (!config) {
    return buildDevelopmentFallbackContext(session, overrides)
  }

  try {
    const requestedReference = overrides.intakeReference || session.intakeReference || ''
    const intake = requestedReference
      ? await dataverseFirst(config, 'jm1_publishingintakes', {
          $select:
            'jm1_publishingintakeid,jm1_intakereferencecode,jm1_projecttitle,jm1_email,jm1_firstname,jm1_lastname,createdon',
          $filter: `jm1_intakereferencecode eq '${escapeODataText(requestedReference)}'`,
        })
      : null

    const scopedOpportunity =
      (overrides.opportunityId
        ? await dataverseFirst(config, 'opportunities', {
            $select: 'opportunityid,name,_parentcontactid_value,createdon',
            $filter: `opportunityid eq ${overrides.opportunityId}`,
          })
        : null) ||
      (session.opportunityId
        ? await dataverseFirst(config, 'opportunities', {
            $select: 'opportunityid,name,_parentcontactid_value,createdon',
            $filter: `opportunityid eq ${session.opportunityId}`,
          })
        : null) ||
      (intake
        ? await dataverseFirst(config, 'opportunities', {
            $select: 'opportunityid,name,_parentcontactid_value,createdon',
            $filter: `contains(name,'${escapeODataText(stringValue(intake.jm1_projecttitle))}')`,
            $orderby: 'createdon desc',
          })
        : null)

    const contact =
      (session.contactId
        ? await dataverseFirst(config, 'contacts', {
            $select: 'contactid,fullname,firstname,lastname,emailaddress1',
            $filter: `contactid eq ${session.contactId}`,
          })
        : null) ||
      (dataverseLookupId(scopedOpportunity || {}, '_parentcontactid_value')
        ? await dataverseFirst(config, 'contacts', {
            $select: 'contactid,fullname,firstname,lastname,emailaddress1',
            $filter: `contactid eq ${dataverseLookupId(scopedOpportunity || {}, '_parentcontactid_value')}`,
          })
        : null) ||
      (session.contactEmail || stringValue(intake?.jm1_email)
        ? await dataverseFirst(config, 'contacts', {
            $select: 'contactid,fullname,firstname,lastname,emailaddress1',
            $filter: `emailaddress1 eq '${escapeODataText(session.contactEmail || stringValue(intake?.jm1_email))}'`,
          })
        : null)

    const relatedOpportunities =
      contact && dataverseLookupId(contact, 'contactid')
        ? await dataverseList(config, 'opportunities', {
            $select: 'opportunityid,name,createdon',
            $filter: `_parentcontactid_value eq ${dataverseLookupId(contact, 'contactid')}`,
            $orderby: 'createdon desc',
            $top: '25',
          })
        : scopedOpportunity
          ? [scopedOpportunity]
          : []

    const relatedIntakes =
      session.contactEmail || stringValue(contact?.emailaddress1) || stringValue(intake?.jm1_email)
        ? await dataverseList(config, 'jm1_publishingintakes', {
            $select:
              'jm1_publishingintakeid,jm1_intakereferencecode,jm1_projecttitle,jm1_email,createdon',
            $filter: `jm1_email eq '${escapeODataText(
              session.contactEmail || stringValue(contact?.emailaddress1) || stringValue(intake?.jm1_email),
            )}'`,
            $orderby: 'createdon desc',
            $top: '25',
          })
        : intake
          ? [intake]
          : []

    const projects = await buildProjectSummaries(config, {
      requestedReference,
      scopedOpportunity,
      intake,
      relatedIntakes,
      relatedOpportunities,
      session,
      overrides,
    })

    const currentProject = selectCurrentProject(projects, overrides, requestedReference) || projects[0] || buildFallbackProject(session, requestedReference)

    const isReturningAuthor =
      Boolean(contact) &&
      (relatedOpportunities.length > 0 || relatedIntakes.length > 1)

    const hasRelationshipSetup = isReturningAuthor || Boolean(contact)
    const hasPaymentRoyaltySetup = isReturningAuthor || Boolean(contact)

    const tasks = buildPortalTaskState({
      isReturningAuthor: hasRelationshipSetup,
      hasEditorialWorkspace: hasRelationshipSetup,
      hasContract: hasPaymentRoyaltySetup,
      hasStripeAccount: hasPaymentRoyaltySetup,
    })

    return {
      access: {
        intakeReference: requestedReference || stringValue(intake?.jm1_intakereferencecode) || currentProject.intakeReference,
        scope: session.scope,
        source: 'dataverse',
      },
      author: {
        name:
          stringValue(contact?.fullname) ||
          [stringValue(intake?.jm1_firstname), stringValue(intake?.jm1_lastname)].filter(Boolean).join(' ') ||
          'Author',
        firstName: stringValue(contact?.firstname) || stringValue(intake?.jm1_firstname) || 'Author',
        email: stringValue(contact?.emailaddress1) || stringValue(intake?.jm1_email) || session.contactEmail || '',
        contactId: dataverseLookupId(contact || {}, 'contactid') || session.contactId,
        isReturningAuthor,
        relationshipState: isReturningAuthor ? 'Active Author' : '',
        workspaceMode: isReturningAuthor ? 'Standard Pipeline Workspace' : '',
      },
      currentProject,
      projects,
      selectedProjectKey: currentProject.key,
      tasks,
      editorial:
        currentProject.workspaceState === 'active_editorial'
          ? {
              stageLabel: currentProject.statusLabel.split(' - ')[0] || 'Editorial Review',
              stageStatus: currentProject.statusLabel.split(' - ')[1] || 'In Progress',
              summary: currentProject.nextActionLabel || 'Your editorial work is in progress.',
              nextActionLabel: currentProject.nextActionLabel,
            }
          : null,
    }
  } catch (error) {
    console.error('Author portal context resolution failed:', error)
    return buildDevelopmentFallbackContext(session, overrides)
  }
}

export function clearAuthorPortalSession() {
  const response = NextResponse.json({ success: true })
  response.cookies.set(getAuthorPortalCookieName(), '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  })
  return response
}

async function buildProjectSummaries(
  config: NonNullable<ReturnType<typeof getDataverseServerConfig>>,
  {
    requestedReference,
    scopedOpportunity,
    intake,
    relatedIntakes,
    relatedOpportunities,
    session,
    overrides,
  }: {
    requestedReference: string
    scopedOpportunity: Record<string, unknown> | null
    intake: Record<string, unknown> | null
    relatedIntakes: Record<string, unknown>[]
    relatedOpportunities: Record<string, unknown>[]
    session: AuthorPortalSession
    overrides: ResolveOverrides
  },
): Promise<AuthorPortalProjectSummary[]> {
  const projects: AuthorPortalProjectSummary[] = []

  for (const opportunity of relatedOpportunities) {
    const projectTitle =
      deriveTitleFromOpportunityName(stringValue(opportunity.name)) || stringValue(opportunity.name) || session.title || 'Project'

    const matchedIntake =
      relatedIntakes.find(
        (candidate) => stringValue(candidate.jm1_projecttitle) === projectTitle,
      ) || null

    const title =
      (overrides.titleId
        ? await dataverseFirst(config, 'jm1pub_titles', {
            $select: 'jm1pub_titleid,jm1pub_titlename,jm1pub_slug',
            $filter: `jm1pub_titleid eq ${overrides.titleId}`,
          })
        : null) ||
      (projectTitle
        ? await dataverseFirst(config, 'jm1pub_titles', {
            $select: 'jm1pub_titleid,jm1pub_titlename,jm1pub_slug',
            $filter: `jm1pub_titlename eq '${escapeODataText(projectTitle)}'`,
          })
        : null)

    const asset =
      (overrides.publishingAssetId
        ? await dataverseFirst(config, 'jm1pub_publishingassets', {
            $select: 'jm1pub_publishingassetid,jm1pub_name,_jm1pub_titleid_value',
            $filter: `jm1pub_publishingassetid eq ${overrides.publishingAssetId}`,
          })
        : null) ||
      (title
        ? await dataverseFirst(config, 'jm1pub_publishingassets', {
            $select: 'jm1pub_publishingassetid,jm1pub_name,_jm1pub_titleid_value',
            $filter: `_jm1pub_titleid_value eq ${dataverseLookupId(title, 'jm1pub_titleid')}`,
          })
        : null)

    const stage = asset
      ? await dataverseFirst(config, 'jm1pub_editorialstages', {
          $select:
            'jm1pub_editorialstageid,jm1pub_authorsafesummary,jm1pub_stagestatus,jm1pub_stagetype,createdon',
          $filter: `_jm1pub_publishingassetid_value eq ${dataverseLookupId(asset, 'jm1pub_publishingassetid')}`,
          $orderby: 'createdon desc',
        })
      : null

    const summary = asset
      ? await dataverseFirst(config, 'jm1pub_editorialsummaries', {
          $select:
            'jm1pub_editorialsummaryid,jm1pub_summarybody,jm1pub_nextactionlabel,jm1pub_summarystatus,createdon',
          $filter: `_jm1pub_publishingassetid_value eq ${dataverseLookupId(asset, 'jm1pub_publishingassetid')}`,
          $orderby: 'createdon desc',
        })
      : null

    const pendingGate = asset
      ? await dataverseFirst(config, 'jm1pub_editorialapprovalgates', {
          $select: 'jm1pub_editorialapprovalgateid,jm1pub_gatecode,jm1pub_gatestatus,createdon',
          $filter: `_jm1pub_publishingassetid_value eq ${dataverseLookupId(asset, 'jm1pub_publishingassetid')}`,
          $orderby: 'createdon desc',
        })
      : null

    const intakeReference =
      inferReferenceFromName(stringValue(opportunity.name)) ||
      (scopedOpportunity && dataverseLookupId(scopedOpportunity, 'opportunityid') === dataverseLookupId(opportunity, 'opportunityid')
        ? requestedReference || stringValue(matchedIntake?.jm1_intakereferencecode) || stringValue(intake?.jm1_intakereferencecode)
        : '') ||
      stringValue(matchedIntake?.jm1_intakereferencecode) ||
      ''

    const row = normalizeProjectRow({
      opportunityId: dataverseLookupId(opportunity, 'opportunityid'),
      titleId: dataverseLookupId(title || {}, 'jm1pub_titleid') || overrides.titleId,
      publishingAssetId: dataverseLookupId(asset || {}, 'jm1pub_publishingassetid') || overrides.publishingAssetId,
      title: projectTitle,
      intakeReference,
      stageLabel: stage ? dataverseFormatted(stage, 'jm1pub_stagetype', 'Editorial Review') : undefined,
      stageStatus: stage ? dataverseFormatted(stage, 'jm1pub_stagestatus', 'In Progress') : undefined,
      summary:
        stringValue(summary?.jm1pub_summarybody) ||
        stringValue(stage?.jm1pub_authorsafesummary) ||
        undefined,
      nextActionLabel: stringValue(summary?.jm1pub_nextactionlabel) || undefined,
      pendingApprovalLabel: pendingGate ? dataverseFormatted(pendingGate, 'jm1pub_gatestatus', '') : undefined,
      workspaceState: asset && stage ? 'active_editorial' : 'pre_contract',
    })

    projects.push(row)
  }

  for (const candidateIntake of relatedIntakes) {
    const intakeReference = stringValue(candidateIntake.jm1_intakereferencecode)
    const projectTitle = stringValue(candidateIntake.jm1_projecttitle) || 'Current project'

    const title =
      (overrides.titleId && projectTitle === session.title
        ? await dataverseFirst(config, 'jm1pub_titles', {
            $select: 'jm1pub_titleid,jm1pub_titlename,jm1pub_slug',
            $filter: `jm1pub_titleid eq ${overrides.titleId}`,
          })
        : null) ||
      (projectTitle
        ? await dataverseFirst(config, 'jm1pub_titles', {
            $select: 'jm1pub_titleid,jm1pub_titlename,jm1pub_slug',
            $filter: `jm1pub_titlename eq '${escapeODataText(projectTitle)}'`,
          })
        : null)

    const asset = title
      ? await dataverseFirst(config, 'jm1pub_publishingassets', {
          $select: 'jm1pub_publishingassetid,jm1pub_name,_jm1pub_titleid_value',
          $filter: `_jm1pub_titleid_value eq ${dataverseLookupId(title, 'jm1pub_titleid')}`,
        })
      : null

    const row = normalizeProjectRow({
      title: projectTitle,
      intakeReference,
      titleId: dataverseLookupId(title || {}, 'jm1pub_titleid') || undefined,
      publishingAssetId: dataverseLookupId(asset || {}, 'jm1pub_publishingassetid') || undefined,
      nextActionLabel:
        asset || title
          ? 'Open this project to review the current stage and next required step.'
          : 'This project is linked to your author relationship and is waiting for the next governed action.',
      workspaceState: asset ? 'active_editorial' : 'pre_contract',
      stageLabel: asset ? 'Active Project' : undefined,
      stageStatus: asset ? 'In Progress' : undefined,
    })

    projects.push(row)
  }

  if (projects.length === 0) {
    projects.push(
      normalizeProjectRow({
        opportunityId: dataverseLookupId(scopedOpportunity || {}, 'opportunityid') || session.opportunityId,
        title: session.title || stringValue(intake?.jm1_projecttitle) || 'Current project',
        intakeReference: requestedReference || stringValue(intake?.jm1_intakereferencecode) || session.intakeReference || '',
        workspaceState: 'pre_contract',
      }),
    )
  }

  return collapseProjects(projects, requestedReference)
}

function normalizeProjectRow(row: ResolvedProjectRow): AuthorPortalProjectSummary {
  const statusLabel =
    row.workspaceState === 'active_editorial'
      ? `${row.stageLabel || 'Editorial Review'} - ${row.stageStatus || 'In Progress'}`
      : 'Pre-Contract Setup'

  return {
    key:
      row.publishingAssetId ||
      row.opportunityId ||
      row.intakeReference ||
      normalizeKey(row.title),
    title: row.title,
    intakeReference: row.intakeReference,
    opportunityId: row.opportunityId,
    titleId: row.titleId,
    publishingAssetId: row.publishingAssetId,
    statusLabel,
    nextActionLabel:
      row.nextActionLabel ||
      (row.workspaceState === 'pre_contract' ? 'Complete the remaining setup steps for this project.' : row.summary),
    pendingApprovalLabel:
      row.pendingApprovalLabel && row.pendingApprovalLabel !== 'Not Ready' ? row.pendingApprovalLabel : undefined,
    workspaceState: row.workspaceState,
  }
}

function selectCurrentProject(
  projects: AuthorPortalProjectSummary[],
  overrides: ResolveOverrides,
  requestedReference: string,
) {
  return (
    projects.find((project) => overrides.publishingAssetId && project.publishingAssetId === overrides.publishingAssetId) ||
    projects.find((project) => overrides.opportunityId && project.opportunityId === overrides.opportunityId) ||
    projects.find((project) => overrides.titleId && project.titleId === overrides.titleId) ||
    projects.find((project) => requestedReference && project.intakeReference === requestedReference) ||
    projects[0]
  )
}

function buildFallbackProject(session: AuthorPortalSession, requestedReference: string): AuthorPortalProjectSummary {
  return {
    key: session.opportunityId || session.intakeReference || normalizeKey(session.title || 'Current project'),
    title: session.title || 'Current project',
    intakeReference: requestedReference || session.intakeReference || '',
    opportunityId: session.opportunityId,
    statusLabel: 'Pre-Contract Setup',
    nextActionLabel: 'Complete the remaining setup steps for this project.',
    workspaceState: 'pre_contract',
  }
}

function buildDevelopmentFallbackContext(session: AuthorPortalSession, overrides: ResolveOverrides): AuthorPortalContext {
  const projects = [
    normalizeProjectRow({
      title: 'The Intentional Leader',
      intakeReference: 'JMP-INT-202607-0W5PTQ',
      opportunityId: session.opportunityId,
      publishingAssetId: overrides.publishingAssetId || 'c9dc862e-da7a-f111-ab0f-000d3a14673b',
      stageLabel: 'Editorial Review',
      stageStatus: 'In Progress',
      nextActionLabel: 'Editorial review is already underway for this title.',
      workspaceState: 'active_editorial',
    }),
    normalizeProjectRow({
      title: 'The Long Watch',
      intakeReference: 'JMP-INT-LONGWATCH',
      nextActionLabel: 'Review the current intake and proposal status for this title.',
      workspaceState: 'pre_contract',
    }),
    normalizeProjectRow({
      title: 'Establishing Glory: The Library',
      intakeReference: 'JMP-INT-EGLIBRARY',
      nextActionLabel: 'This title is already operating as an active project.',
      workspaceState: 'active_editorial',
      stageLabel: 'Active Project',
      stageStatus: 'In Progress',
    }),
  ]

  const currentProject = selectCurrentProject(projects, overrides, overrides.intakeReference || session.intakeReference || '') || projects[0]

  return {
    access: {
      intakeReference: currentProject.intakeReference,
      scope: session.scope,
      source: 'development-fallback',
    },
    author: {
      name: 'Jackie Smith, Jr.',
      firstName: 'Jackie',
      email: session.contactEmail || 'chosen2k7@gmail.com',
      contactId: session.contactId,
      isReturningAuthor: true,
      relationshipState: 'Active Author',
      workspaceMode: 'Standard Pipeline Workspace',
    },
    currentProject,
    projects,
    selectedProjectKey: currentProject.key,
    tasks: {
      authorProfileRequired: false,
      paymentRoyaltyRequired: false,
    },
    editorial:
      currentProject.workspaceState === 'active_editorial'
        ? {
            stageLabel: currentProject.statusLabel.split(' - ')[0] || 'Editorial Review',
            stageStatus: currentProject.statusLabel.split(' - ')[1] || 'In Progress',
            summary:
              currentProject.title === 'The Intentional Leader'
                ? 'Your manuscript is already in Editorial Review. We will share the next decision step as soon as it is ready.'
                : 'This title is already active in your author relationship.',
            nextActionLabel: currentProject.nextActionLabel,
          }
        : null,
  }
}

function deriveTitleFromOpportunityName(value: string) {
  if (!value) return ''
  const intakePrefix = value.match(/^publishing intake\s+[—-]\s+/i)
  if (intakePrefix) {
    return value.slice(intakePrefix[0].length).trim()
  }
  const parts = value.split('—').map((part) => part.trim()).filter(Boolean)
  return parts[parts.length - 1] || value
}

function inferReferenceFromName(value: string) {
  const match = value.match(/JMP-INT-[A-Z0-9-]+/i)
  return match?.[0] || ''
}

function escapeODataText(value: string) {
  return value.replace(/'/g, "''")
}

function normalizeKey(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-')
}

function collapseProjects(projects: AuthorPortalProjectSummary[], requestedReference: string) {
  const collapsed = new Map<string, AuthorPortalProjectSummary>()

  for (const project of projects) {
    const identity = project.titleId || normalizeKey(project.title)
    const existing = collapsed.get(identity)
    if (!existing) {
      collapsed.set(identity, project)
      continue
    }

    const projectScore = projectPriority(project, requestedReference)
    const existingScore = projectPriority(existing, requestedReference)
    if (projectScore > existingScore) {
      collapsed.set(identity, project)
    }
  }

  return Array.from(collapsed.values())
}

function projectPriority(project: AuthorPortalProjectSummary, requestedReference: string) {
  let score = 0
  if (project.intakeReference && project.intakeReference === requestedReference) score += 8
  if (project.workspaceState === 'active_editorial') score += 4
  if (project.publishingAssetId) score += 2
  if (project.opportunityId) score += 1
  return score
}
