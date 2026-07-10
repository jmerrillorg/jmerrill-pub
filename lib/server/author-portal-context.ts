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
import {
  buildEditorialDisplayState,
  normalizeWorkspaceText,
  type AuthorPortalWorkspaceState,
} from './author-portal-status'

export type AuthorPortalProjectSummary = {
  key: string
  title: string
  intakeReference: string
  opportunityId?: string
  titleId?: string
  publishingAssetId?: string
  statusLabel: string
  summary?: string
  nextActionLabel?: string
  pendingApprovalLabel?: string
  contractStatusInternal?: string
  workspaceState: AuthorPortalWorkspaceState
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
  relationship: {
    classificationStatus: 'Invited Project Relationship' | 'Grandfathered' | 'Grandfathered - Activated'
    activationStatus: 'pending_validation' | 'validated' | 'activated'
    operationalHealthStatus: 'activated' | 'verified' | 'healthy'
    authorProfileStatus: 'complete' | 'incomplete'
    stripeConnectStatus: 'complete' | 'missing' | 'unknown'
    taxStatus: 'complete' | 'missing' | 'unknown'
    payoutProfileStatus: 'complete' | 'missing' | 'unknown'
    contractStatusInternal?: string
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
  contractStatusInternal?: string
  workspaceState: AuthorPortalProjectSummary['workspaceState']
}

type RelationshipBackedTitleRow = {
  titleId?: string
  title: string
  authorName?: string
  intakeReference?: string
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

    const relationshipBackedTitles = await getRelationshipBackedTitles(config, contact)

    const projects = await buildProjectSummaries(config, {
      requestedReference,
      scopedOpportunity,
      intake,
      relatedIntakes,
      relatedOpportunities,
      relationshipBackedTitles,
      session,
      overrides,
    })

    const currentProject = selectCurrentProject(projects, overrides, requestedReference) || projects[0] || buildFallbackProject(session, requestedReference)

    const isReturningAuthor =
      Boolean(contact) &&
      (relatedOpportunities.length > 0 ||
        relatedIntakes.length > 1 ||
        relationshipBackedTitles.length > 0)

    const relationshipProfileComplete = Boolean(
      stringValue(contact?.fullname) && stringValue(contact?.emailaddress1),
    )
    const relationshipStripeComplete = isReturningAuthor
    const relationshipTaxComplete = isReturningAuthor
    const relationshipPayoutComplete = isReturningAuthor
    const contractSatisfied = isReturningAuthor
    const relationshipActivated =
      isReturningAuthor &&
      relationshipProfileComplete &&
      relationshipStripeComplete &&
      relationshipTaxComplete &&
      relationshipPayoutComplete
    const relationshipVerified =
      relationshipActivated &&
      currentProject.workspaceState !== 'pre_contract_setup' &&
      !currentProject.contractStatusInternal
    const relationshipHealthy =
      relationshipVerified &&
      projects.every((project) => !project.contractStatusInternal) &&
      projects.every((project) => project.workspaceState !== 'pre_contract_setup')

    const tasks = buildPortalTaskState({
      relationshipProfileComplete,
      relationshipStripeComplete,
      relationshipTaxComplete,
      relationshipPayoutComplete,
      contractSatisfied,
      currentProjectState: currentProject.workspaceState,
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
      relationship: {
        classificationStatus: isReturningAuthor
          ? relationshipActivated
            ? 'Grandfathered - Activated'
            : 'Grandfathered'
          : 'Invited Project Relationship',
        activationStatus: isReturningAuthor
          ? relationshipActivated
            ? 'activated'
            : 'validated'
          : 'pending_validation',
        operationalHealthStatus: relationshipHealthy
          ? 'healthy'
          : relationshipVerified
            ? 'verified'
            : 'activated',
        authorProfileStatus: relationshipProfileComplete ? 'complete' : 'incomplete',
        stripeConnectStatus: relationshipStripeComplete ? 'complete' : 'unknown',
        taxStatus: relationshipTaxComplete ? 'complete' : 'unknown',
        payoutProfileStatus: relationshipPayoutComplete ? 'complete' : 'unknown',
        contractStatusInternal: isReturningAuthor
          ? 'Signed / Exists - Location Pending Reconciliation'
          : undefined,
      },
      currentProject,
      projects,
      selectedProjectKey: currentProject.key,
      tasks,
      editorial:
        isEditorialWorkspaceState(currentProject.workspaceState)
          ? buildEditorialDisplayState({
              workspaceState: currentProject.workspaceState,
              stageLabel: getProjectStageLabel(currentProject),
              stageStatus: getProjectStageStatus(currentProject),
              summary: currentProject.summary,
              nextActionLabel: currentProject.nextActionLabel,
            })
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
    relationshipBackedTitles,
    session,
    overrides,
  }: {
    requestedReference: string
    scopedOpportunity: Record<string, unknown> | null
    intake: Record<string, unknown> | null
    relatedIntakes: Record<string, unknown>[]
    relatedOpportunities: Record<string, unknown>[]
    relationshipBackedTitles: RelationshipBackedTitleRow[]
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
      stageLabel: stage ? dataverseFormatted(stage, 'jm1pub_stagetype', '') : undefined,
      stageStatus: stage ? dataverseFormatted(stage, 'jm1pub_stagestatus', '') : undefined,
      summary:
        stringValue(summary?.jm1pub_summarybody) ||
        stringValue(stage?.jm1pub_authorsafesummary) ||
        undefined,
      nextActionLabel: stringValue(summary?.jm1pub_nextactionlabel) || undefined,
      pendingApprovalLabel: pendingGate ? dataverseFormatted(pendingGate, 'jm1pub_gatestatus', '') : undefined,
      contractStatusInternal:
        title && !asset ? 'Signed / Exists - Location Pending Reconciliation' : undefined,
      workspaceState: inferWorkspaceState({
        hasOpportunity: Boolean(dataverseLookupId(opportunity, 'opportunityid')),
        hasTitle: Boolean(dataverseLookupId(title || {}, 'jm1pub_titleid')),
        hasAsset: Boolean(dataverseLookupId(asset || {}, 'jm1pub_publishingassetid')),
        stageLabel: stage ? dataverseFormatted(stage, 'jm1pub_stagetype', '') : undefined,
        stageStatus: stage ? dataverseFormatted(stage, 'jm1pub_stagestatus', '') : undefined,
      }),
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
        asset
          ? 'This historical title is linked to your author relationship and is waiting for the next governed action.'
          : title
            ? 'This project is linked to your author relationship and is waiting for the next governed action.'
            : 'This project is linked to your author relationship and is waiting for the next governed action.',
      contractStatusInternal: title ? 'Signed / Exists - Location Pending Reconciliation' : undefined,
      workspaceState: inferWorkspaceState({
        hasOpportunity: false,
        hasTitle: Boolean(dataverseLookupId(title || {}, 'jm1pub_titleid')),
        hasAsset: Boolean(dataverseLookupId(asset || {}, 'jm1pub_publishingassetid')),
      }),
      stageLabel: undefined,
      stageStatus: undefined,
    })

    projects.push(row)
  }

  for (const relationshipTitle of relationshipBackedTitles) {
    const title =
      (relationshipTitle.titleId
        ? await dataverseFirst(config, 'jm1pub_titles', {
            $select: 'jm1pub_titleid,jm1pub_titlename,jm1pub_slug,jm1pub_authorname,jm1pub_authordisplayname',
            $filter: `jm1pub_titleid eq ${relationshipTitle.titleId}`,
          })
        : null) ||
      (relationshipTitle.title
        ? await dataverseFirst(config, 'jm1pub_titles', {
            $select: 'jm1pub_titleid,jm1pub_titlename,jm1pub_slug,jm1pub_authorname,jm1pub_authordisplayname',
            $filter: `jm1pub_titlename eq '${escapeODataText(relationshipTitle.title)}'`,
          })
        : null)

    if (!title) continue

    const asset = await dataverseFirst(config, 'jm1pub_publishingassets', {
      $select: 'jm1pub_publishingassetid,jm1pub_name,_jm1pub_titleid_value',
      $filter: `_jm1pub_titleid_value eq ${dataverseLookupId(title, 'jm1pub_titleid')}`,
    })

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

    projects.push(
      normalizeProjectRow({
        title: stringValue(title.jm1pub_titlename) || relationshipTitle.title,
        intakeReference: relationshipTitle.intakeReference || '',
        titleId: dataverseLookupId(title, 'jm1pub_titleid'),
        publishingAssetId: dataverseLookupId(asset || {}, 'jm1pub_publishingassetid') || undefined,
        stageLabel: stage ? dataverseFormatted(stage, 'jm1pub_stagetype', '') : undefined,
        stageStatus: stage ? dataverseFormatted(stage, 'jm1pub_stagestatus', '') : undefined,
        summary:
          stringValue(summary?.jm1pub_summarybody) ||
          stringValue(stage?.jm1pub_authorsafesummary) ||
          undefined,
        nextActionLabel: stringValue(summary?.jm1pub_nextactionlabel) || undefined,
        pendingApprovalLabel: pendingGate ? dataverseFormatted(pendingGate, 'jm1pub_gatestatus', '') : undefined,
        contractStatusInternal:
          dataverseLookupId(title, 'jm1pub_titleid') && !asset
            ? 'Signed / Exists - Location Pending Reconciliation'
            : undefined,
        workspaceState: inferWorkspaceState({
          hasOpportunity: false,
          hasTitle: true,
          hasAsset: Boolean(dataverseLookupId(asset || {}, 'jm1pub_publishingassetid')),
          stageLabel: stage ? dataverseFormatted(stage, 'jm1pub_stagetype', '') : undefined,
          stageStatus: stage ? dataverseFormatted(stage, 'jm1pub_stagestatus', '') : undefined,
        }),
      }),
    )
  }

  if (projects.length === 0) {
    projects.push(
      normalizeProjectRow({
        opportunityId: dataverseLookupId(scopedOpportunity || {}, 'opportunityid') || session.opportunityId,
        title: session.title || stringValue(intake?.jm1_projecttitle) || 'Current project',
        intakeReference: requestedReference || stringValue(intake?.jm1_intakereferencecode) || session.intakeReference || '',
        workspaceState: 'pre_contract_setup',
      }),
    )
  }

  return collapseProjects(projects, requestedReference)
}

function normalizeProjectRow(row: ResolvedProjectRow): AuthorPortalProjectSummary {
  const statusLabel =
    buildWorkspaceStatusLabel(row)

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
    summary: row.summary || defaultProjectSummary(row),
    contractStatusInternal: row.contractStatusInternal,
    nextActionLabel:
      row.nextActionLabel || defaultNextActionLabel(row),
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
    workspaceState: 'pre_contract_setup',
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
      workspaceState: 'editorial_in_progress',
    }),
    normalizeProjectRow({
      title: 'The Long Watch',
      intakeReference: 'JMP-INT-202607-6R2MPZ',
      nextActionLabel: 'This project is linked to your author relationship and is waiting for the next governed action.',
      contractStatusInternal: 'Signed / Exists - Location Pending Reconciliation',
      workspaceState: 'awaiting_governed_action',
    }),
    normalizeProjectRow({
      title: 'Establishing Glory: The Library',
      intakeReference: 'JMP-INT-202606-UFYG6O',
      nextActionLabel: 'This historical title is linked to your author relationship and remains available in your workspace.',
      contractStatusInternal: 'Signed / Exists - Location Pending Reconciliation',
      workspaceState: 'published_legacy',
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
    relationship: {
      classificationStatus: 'Grandfathered - Activated',
      activationStatus: 'activated',
      operationalHealthStatus: 'activated',
      authorProfileStatus: 'complete',
      stripeConnectStatus: 'complete',
      taxStatus: 'complete',
      payoutProfileStatus: 'complete',
      contractStatusInternal: 'Signed / Exists - Location Pending Reconciliation',
    },
    currentProject,
    projects,
    selectedProjectKey: currentProject.key,
    tasks: {
      authorProfileRequired: false,
      paymentRoyaltyRequired: false,
    },
    editorial:
      isEditorialWorkspaceState(currentProject.workspaceState)
        ? buildEditorialDisplayState({
            workspaceState: currentProject.workspaceState,
            stageLabel: getProjectStageLabel(currentProject),
            stageStatus: getProjectStageStatus(currentProject),
            summary:
              currentProject.title === 'The Intentional Leader'
                ? 'Your manuscript is already in Editorial Review. We will share the next decision step as soon as it is ready.'
                : 'This title is already active in your author relationship.',
            nextActionLabel: currentProject.nextActionLabel,
          })
        : null,
  }
}

async function getRelationshipBackedTitles(
  config: NonNullable<ReturnType<typeof getDataverseServerConfig>>,
  contact: Record<string, unknown> | null,
): Promise<RelationshipBackedTitleRow[]> {
  const contactId = dataverseLookupId(contact || {}, 'contactid')
  const fullName = stringValue(contact?.fullname)
  if (!contactId || !fullName) return []

  const relationships = await dataverseList(config, 'jm1_relationships', {
    $select: 'jm1_relationshipid,_jm1_fromcontact_value,jm1_relationshiptype,jm1_status',
    $filter: `_jm1_fromcontact_value eq ${contactId}`,
    $top: '25',
  })

  if (relationships.length === 0) return []

  const titles = await dataverseList(config, 'jm1pub_titles', {
    $select:
      'jm1pub_titleid,jm1pub_titlename,jm1pub_authorname,jm1pub_authordisplayname,jm1pub_slug',
    $filter: `jm1pub_authorname eq '${escapeODataText(fullName)}' or jm1pub_authordisplayname eq '${escapeODataText(fullName)}'`,
    $orderby: 'jm1pub_titlename asc',
    $top: '50',
  })

  return titles.map((title) => ({
    titleId: dataverseLookupId(title, 'jm1pub_titleid'),
    title: stringValue(title.jm1pub_titlename),
    authorName:
      stringValue(title.jm1pub_authordisplayname) || stringValue(title.jm1pub_authorname) || fullName,
  }))
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
  if (isEditorialWorkspaceState(project.workspaceState)) score += 4
  if (project.publishingAssetId) score += 2
  if (project.opportunityId) score += 1
  return score
}

function isEditorialWorkspaceState(state: AuthorPortalProjectSummary['workspaceState']) {
  return (
    state === 'editorial_review' ||
    state === 'developmental_editing' ||
    state === 'editorial_in_progress' ||
    state === 'production_in_progress' ||
    state === 'distribution_release_pending'
  )
}

function getProjectStageLabel(project: AuthorPortalProjectSummary) {
  const [label] = project.statusLabel.split(' - ')
  return label?.trim() || undefined
}

function getProjectStageStatus(project: AuthorPortalProjectSummary) {
  const [, status] = project.statusLabel.split(' - ')
  return status?.trim() || undefined
}

export function inferWorkspaceState({
  hasOpportunity,
  hasTitle,
  hasAsset,
  stageLabel,
  stageStatus,
}: {
  hasOpportunity: boolean
  hasTitle: boolean
  hasAsset: boolean
  stageLabel?: string
  stageStatus?: string
}): AuthorPortalProjectSummary['workspaceState'] {
  const normalizedStageLabel = normalizeWorkspaceText(stageLabel)
  const normalizedStageStatus = normalizeWorkspaceText(stageStatus)
  const hasActiveEditorialCommission =
    hasAsset &&
    Boolean(normalizedStageLabel) &&
    [
      'not started',
      'in progress',
      'active',
      'plan delivered',
      'plan approved',
      'calibration approved',
      'author revision requested',
      'author revision received',
      'complete',
    ].includes(normalizedStageStatus)

  if (normalizedStageLabel.includes('hold') || normalizedStageLabel.includes('block')) {
    return 'awaiting_governed_action'
  }
  if (normalizedStageLabel.includes('archive') || normalizedStageStatus.includes('archive')) {
    return 'archived'
  }

  if (normalizedStageLabel.includes('production')) return 'production_in_progress'
  if (normalizedStageLabel.includes('distribution') || normalizedStageLabel.includes('release')) {
    return 'distribution_release_pending'
  }
  if (hasAsset && (normalizedStageStatus === 'in progress' || normalizedStageStatus === 'active')) {
    return 'editorial_in_progress'
  }
  if (normalizedStageLabel.includes('developmental')) {
    return 'developmental_editing'
  }
  if (normalizedStageLabel.includes('review')) return 'editorial_review'
  if (hasActiveEditorialCommission) return 'editorial_review'
  if (hasTitle || hasAsset) return 'published_legacy'
  if (hasOpportunity) return 'pre_contract_setup'
  return 'awaiting_governed_action'
}

function buildWorkspaceStatusLabel(row: ResolvedProjectRow) {
  switch (row.workspaceState) {
    case 'pre_contract_setup':
      return 'Pre-Contract Setup'
    case 'awaiting_governed_action':
      return 'Awaiting Governed Action'
    case 'editorial_review':
      return `${row.stageLabel || 'Editorial Review'} - ${row.stageStatus || 'Not Started'}`
    case 'developmental_editing':
      return `${row.stageLabel || 'Developmental Editing'} - ${row.stageStatus || 'Not Started'}`
    case 'editorial_in_progress':
      return `${row.stageLabel || 'Editorial Review'} - ${row.stageStatus || 'Not Started'}`
    case 'production_in_progress':
      return 'Production In Progress'
    case 'distribution_release_pending':
      return 'Distribution / Release Pending'
    case 'published_legacy':
      return 'Published / Legacy'
    case 'archived':
      return 'Archived'
    default:
      return 'Awaiting Governed Action'
  }
}

function defaultNextActionLabel(row: ResolvedProjectRow) {
  switch (row.workspaceState) {
    case 'pre_contract_setup':
      return 'Complete the remaining setup steps for this project.'
    case 'developmental_editing':
      return 'No action is required from you at this time. We will update you when the developmental plan is ready for review.'
    case 'awaiting_governed_action':
      return 'This project is linked to your author relationship and is waiting for the next governed action.'
    case 'published_legacy':
      return 'This historical title is linked to your author relationship and remains available in your workspace.'
    case 'archived':
      return 'This project is archived and remains available as historical record.'
    default:
      return row.summary
  }
}

function defaultProjectSummary(row: ResolvedProjectRow) {
  switch (row.workspaceState) {
    case 'developmental_editing':
      return 'Developmental planning is being prepared for Volume I of the approved quarterly series.'
    default:
      return row.summary
  }
}
