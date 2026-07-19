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
import {
  classifyTitlePortfolio,
  type CatalogPortfolioState,
} from './catalog-portfolio'

export type AuthorPortalProjectSummary = {
  key: string
  title: string
  intakeReference: string
  opportunityId?: string
  titleId?: string
  publishingAssetId?: string
  statusLabel: string
  currentStage?: string
  currentStageStatus?: string
  currentOperationalActivity?: string
  operationalActivityCode?: string
  currentOwner?: 'Author' | 'Publisher' | 'System'
  awaitingParty?: 'Publisher' | 'Author' | 'Printer' | 'Distributor' | 'Rights Holder' | 'Third Party' | 'No One'
  authorActionRequired?: boolean
  authorActionDescription?: string
  currentActivity?: string
  nextOperationalActivity?: string
  nextStep?: string
  expectedAuthorEvent?: string
  activePackage?: AuthorPortalArtifact[]
  completedPackages?: Array<{
    label: string
    status: string
  }>
  completedMilestones?: AuthorPortalJourneyMilestone[]
  currentMilestones?: AuthorPortalJourneyMilestone[]
  upcomingMilestones?: AuthorPortalJourneyMilestone[]
  blockingIssue?: string
  lastMovement?: string
  lastUpdated?: string
  summary?: string
  nextActionLabel?: string
  pendingApprovalLabel?: string
  artifacts?: AuthorPortalArtifact[]
  contractStatusInternal?: string
  portfolioState?: CatalogPortfolioState
  portfolioLabel?: string
  catalogStatus?: string
  distributionStatus?: string
  activeFormats?: string[]
  isbn13s?: string[]
  workspaceState: AuthorPortalWorkspaceState
}

export type AuthorPortalJourneyMilestone = {
  label: string
  state: 'Complete' | 'Current' | 'Upcoming' | 'Skipped by publisher placement' | 'Not applicable' | 'On hold'
  note?: string
}

export const AUTHOR_WORKSPACE_OPERATIONAL_ACTIVITY_EVENTS = [
  'AUTHOR_WORKSPACE_OPERATIONAL_ACTIVITY_MODEL_STARTED',
  'AUTHOR_WORKSPACE_STALE_PACKAGE_TEXT_REMOVED',
  'AUTHOR_WORKSPACE_STAGE_AWARE_STATUS_ACTIVATED',
  'AUTHOR_WORKSPACE_ACTIVITY_NEXT_STEP_SEPARATED',
  'AUTHOR_WORKSPACE_AWAITING_PARTY_ACTIVATED',
  'AUTHOR_WORKSPACE_PUBLISHING_JOURNEY_ACTIVATED',
  'AUTHOR_WORKSPACE_OPERATIONAL_CONFLICT_DETECTED',
  'AUTHOR_WORKSPACE_ACTIVE_PROJECT_REFRESH_COMPLETED',
  'AUTHOR_WORKSPACE_OPERATIONAL_ACTIVITY_MODEL_COMPLETED',
  'AUTHOR_WORKSPACE_OPERATIONAL_MODEL_EXTENSION_STARTED',
  'AUTHOR_WORKSPACE_AUTHOR_ACTION_STATE_ACTIVATED',
  'AUTHOR_WORKSPACE_CONCURRENT_ACTIVITY_ACTIVATED',
  'AUTHOR_WORKSPACE_MANUAL_PLACEMENT_HISTORY_PROTECTED',
  'AUTHOR_WORKSPACE_ACTIVE_PORTFOLIO_AUDIT_COMPLETED',
  'AUTHOR_WORKSPACE_OPERATIONAL_MODEL_EXTENSION_COMPLETED',
] as const

export type AuthorPortalArtifact = {
  id: string
  label: string
  filename: string
  typeLabel: string
  href: string
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
    marketingProfile?: {
      authorBio: string
      website: string
      facebook: string
      instagram: string
      xTwitter: string
    }
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
  library: {
    projectsInProgress: AuthorPortalProjectSummary[]
    publishedBooks: AuthorPortalProjectSummary[]
    archivedTitles: AuthorPortalProjectSummary[]
  }
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
  artifacts?: AuthorPortalArtifact[]
  authorActionAvailable?: boolean
  authorDecisionOutstanding?: boolean
  authorDecision?: string
  gateStatus?: string
  notificationCompleted?: boolean
  releasedArtifactExists?: boolean
  releasePublished?: boolean
  lastUpdated?: string
  contractStatusInternal?: string
  portfolioState?: CatalogPortfolioState
  portfolioLabel?: string
  catalogStatus?: string
  distributionStatus?: string
  activeFormats?: string[]
  isbn13s?: string[]
  workspaceState: AuthorPortalProjectSummary['workspaceState']
}

type AuthorActionEvidence = {
  authorActionAvailable: boolean
  authorDecisionOutstanding: boolean
  releasedArtifactExists: boolean
  releasePublished: boolean
  authorDecision?: string
  gateStatus?: string
  authorResponseReceived: boolean
  nextStageAuthorized: boolean
  notificationCompleted: boolean
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
  setAuthorPortalSessionCookie(response, sessionValue)

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

export async function getAuthorPortalContextFromAuthorEmail(
  email: string,
  overrides?: ResolveOverrides,
) {
  const normalizedEmail = email.trim().toLowerCase()
  if (!normalizedEmail) return null

  return resolveAuthorPortalContext(
    {
      v: 1,
      contactEmail: normalizedEmail,
      scope: 'relationship',
      issuedAt: new Date().toISOString(),
    },
    overrides,
  )
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
            $select:
              'contactid,fullname,firstname,lastname,emailaddress1,jm1pub_authorbio,jm1pub_publicauthorbio,jm1pub_authorwebsite,jm1pub_authorfacebook,jm1pub_authorinstagram,jm1pub_authorxtwitter',
            $filter: `contactid eq ${session.contactId}`,
          })
        : null) ||
      (dataverseLookupId(scopedOpportunity || {}, '_parentcontactid_value')
        ? await dataverseFirst(config, 'contacts', {
            $select:
              'contactid,fullname,firstname,lastname,emailaddress1,jm1pub_authorbio,jm1pub_publicauthorbio,jm1pub_authorwebsite,jm1pub_authorfacebook,jm1pub_authorinstagram,jm1pub_authorxtwitter',
            $filter: `contactid eq ${dataverseLookupId(scopedOpportunity || {}, '_parentcontactid_value')}`,
          })
        : null) ||
      (session.contactEmail || stringValue(intake?.jm1_email)
        ? await dataverseFirst(config, 'contacts', {
            $select:
              'contactid,fullname,firstname,lastname,emailaddress1,jm1pub_authorbio,jm1pub_publicauthorbio,jm1pub_authorwebsite,jm1pub_authorfacebook,jm1pub_authorinstagram,jm1pub_authorxtwitter',
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
        marketingProfile: buildMarketingProfile(contact || {}),
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
      library: buildAuthorLibrary(projects),
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
  clearAuthorPortalSessionCookie(response)
  return response
}

function setAuthorPortalSessionCookie(response: NextResponse, value: string) {
  const cookieName = getAuthorPortalCookieName()
  const secure = process.env.NODE_ENV === 'production'

  response.cookies.set(cookieName, value, {
    httpOnly: true,
    secure,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 8,
  })

  response.headers.append(
    'Set-Cookie',
    buildCookieHeader(cookieName, value, {
      secure,
      maxAge: 60 * 60 * 8,
    }),
  )
}

function clearAuthorPortalSessionCookie(response: NextResponse) {
  const cookieName = getAuthorPortalCookieName()
  const secure = process.env.NODE_ENV === 'production'

  response.cookies.set(cookieName, '', {
    httpOnly: true,
    secure,
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  })

  response.headers.append(
    'Set-Cookie',
    buildCookieHeader(cookieName, '', {
      secure,
      maxAge: 0,
    }),
  )
}

function buildCookieHeader(
  name: string,
  value: string,
  { secure, maxAge }: { secure: boolean; maxAge: number },
) {
  const parts = [
    `${name}=${encodeURIComponent(value)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${maxAge}`,
  ]

  if (secure) {
    parts.push('Secure')
  }

  return parts.join('; ')
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
            $select: 'jm1pub_titleid,jm1pub_titlename,jm1pub_slug,jm1pub_authorname,jm1pub_authordisplayname,jm1pub_stage,jm1pub_publiccatalogstatus,jm1pub_publicationstatus',
            $filter: `jm1pub_titleid eq ${overrides.titleId}`,
          })
        : null) ||
      (projectTitle
        ? await dataverseFirst(config, 'jm1pub_titles', {
            $select: 'jm1pub_titleid,jm1pub_titlename,jm1pub_slug,jm1pub_authorname,jm1pub_authordisplayname,jm1pub_stage,jm1pub_publiccatalogstatus,jm1pub_publicationstatus',
            $filter: `jm1pub_titlename eq '${escapeODataText(projectTitle)}'`,
          })
        : null)

    const asset =
      (overrides.publishingAssetId
        ? await dataverseFirst(config, 'jm1pub_publishingassets', {
            $select: 'jm1pub_publishingassetid,jm1pub_name,jm1pub_assetformat,jm1pub_distributionstatus,jm1pub_isbn13,_jm1pub_titleid_value',
            $filter: `jm1pub_publishingassetid eq ${overrides.publishingAssetId}`,
          })
        : null) ||
      (title
        ? await dataverseFirst(config, 'jm1pub_publishingassets', {
            $select: 'jm1pub_publishingassetid,jm1pub_name,jm1pub_assetformat,jm1pub_distributionstatus,jm1pub_isbn13,_jm1pub_titleid_value',
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
      ? pickAuthorFacingSummary(
          await dataverseList(config, 'jm1pub_editorialsummaries', {
          $select:
            'jm1pub_editorialsummaryid,jm1pub_summaryheadline,jm1pub_summarybody,jm1pub_nextactionlabel,jm1pub_summarystatus,jm1pub_publishedtoworkspaceon,_jm1pub_sourceartifactid_value,_jm1pub_editorialapprovalgateid_value,createdon',
          $filter: `_jm1pub_publishingassetid_value eq ${dataverseLookupId(asset, 'jm1pub_publishingassetid')}`,
          $orderby: 'createdon desc',
          $top: '5',
        }),
        )
      : null

    const summaryGateId = dataverseLookupId(summary || {}, '_jm1pub_editorialapprovalgateid_value')
    const pendingGate = asset
      ? await dataverseFirst(config, 'jm1pub_editorialapprovalgates', {
          $select:
            'jm1pub_editorialapprovalgateid,jm1pub_gatecode,jm1pub_gatestatus,jm1pub_authordecision,jm1pub_authorresponsesummary,jm1pub_authordecisionon,jm1pub_authordecisionsource,jm1pub_nextstageauthorized,_jm1pub_deliverableartifactid_value,createdon',
          $filter: summaryGateId
            ? `jm1pub_editorialapprovalgateid eq ${summaryGateId}`
            : `_jm1pub_publishingassetid_value eq ${dataverseLookupId(asset, 'jm1pub_publishingassetid')}`,
          $orderby: 'createdon desc',
        })
      : null

    const authorActionEvidence = resolveAuthorActionEvidence({
      summaryStatus: dataverseFormatted(summary || {}, 'jm1pub_summarystatus', ''),
      publishedToWorkspaceOn: stringValue(summary?.jm1pub_publishedtoworkspaceon),
      sourceArtifactId: dataverseLookupId(summary || {}, '_jm1pub_sourceartifactid_value'),
      deliverableArtifactId: dataverseLookupId(pendingGate || {}, '_jm1pub_deliverableartifactid_value'),
      gateStatus: dataverseFormatted(pendingGate || {}, 'jm1pub_gatestatus', ''),
      authorDecision: dataverseFormatted(pendingGate || {}, 'jm1pub_authordecision', ''),
      authorDecisionOn: stringValue(pendingGate?.jm1pub_authordecisionon),
      notificationEvidence: `${stringValue(pendingGate?.jm1pub_authorresponsesummary)} ${stringValue(
        pendingGate?.jm1pub_authordecisionsource,
      )}`,
      nextStageAuthorized: Boolean(pendingGate?.jm1pub_nextstageauthorized),
    })

    const artifacts =
      asset && authorActionEvidence.releasedArtifactExists && authorActionEvidence.releasePublished
        ? await getAuthorFacingEditorialArtifacts(config, {
            publishingAssetId: dataverseLookupId(asset, 'jm1pub_publishingassetid'),
            activeStageId: dataverseLookupId(stage || {}, 'jm1pub_editorialstageid'),
            activeGateId: dataverseLookupId(pendingGate || {}, 'jm1pub_editorialapprovalgateid'),
            sourceArtifactId: dataverseLookupId(summary || {}, '_jm1pub_sourceartifactid_value'),
            deliverableArtifactId: dataverseLookupId(pendingGate || {}, '_jm1pub_deliverableartifactid_value'),
          })
        : []

    const intakeReference =
      inferReferenceFromName(stringValue(opportunity.name)) ||
      (scopedOpportunity && dataverseLookupId(scopedOpportunity, 'opportunityid') === dataverseLookupId(opportunity, 'opportunityid')
        ? requestedReference || stringValue(matchedIntake?.jm1_intakereferencecode) || stringValue(intake?.jm1_intakereferencecode)
        : '') ||
      stringValue(matchedIntake?.jm1_intakereferencecode) ||
      ''

    const row = projectSummaryFromResolvedRow({
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
      nextActionLabel: authorActionEvidence.authorActionAvailable ? stringValue(summary?.jm1pub_nextactionlabel) || undefined : undefined,
      pendingApprovalLabel:
        authorActionEvidence.authorActionAvailable && pendingGate ? dataverseFormatted(pendingGate, 'jm1pub_gatestatus', '') : undefined,
      artifacts,
      authorActionAvailable: authorActionEvidence.authorActionAvailable,
      authorDecisionOutstanding: authorActionEvidence.authorDecisionOutstanding,
      authorDecision: authorActionEvidence.authorDecision,
      gateStatus: authorActionEvidence.gateStatus,
      notificationCompleted: authorActionEvidence.notificationCompleted,
      releasedArtifactExists: authorActionEvidence.releasedArtifactExists,
      releasePublished: authorActionEvidence.releasePublished,
      lastUpdated:
        stringValue(summary?.jm1pub_publishedtoworkspaceon) ||
        stringValue(pendingGate?.createdon) ||
        stringValue(stage?.createdon) ||
        undefined,
      contractStatusInternal:
        title && !asset ? 'Signed / Exists - Location Pending Reconciliation' : undefined,
      ...authorPortfolioFields(title, asset ? [asset] : [], stage ? [stage] : []),
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
            $select: 'jm1pub_titleid,jm1pub_titlename,jm1pub_slug,jm1pub_authorname,jm1pub_authordisplayname,jm1pub_stage,jm1pub_publiccatalogstatus,jm1pub_publicationstatus',
            $filter: `jm1pub_titleid eq ${overrides.titleId}`,
          })
        : null) ||
      (projectTitle
        ? await dataverseFirst(config, 'jm1pub_titles', {
            $select: 'jm1pub_titleid,jm1pub_titlename,jm1pub_slug,jm1pub_authorname,jm1pub_authordisplayname,jm1pub_stage,jm1pub_publiccatalogstatus,jm1pub_publicationstatus',
            $filter: `jm1pub_titlename eq '${escapeODataText(projectTitle)}'`,
          })
        : null)

    const asset = title
      ? await dataverseFirst(config, 'jm1pub_publishingassets', {
          $select: 'jm1pub_publishingassetid,jm1pub_name,jm1pub_assetformat,jm1pub_distributionstatus,jm1pub_isbn13,_jm1pub_titleid_value',
          $filter: `_jm1pub_titleid_value eq ${dataverseLookupId(title, 'jm1pub_titleid')}`,
        })
      : null

    const row = projectSummaryFromResolvedRow({
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
      ...authorPortfolioFields(title, asset ? [asset] : [], []),
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
            $select: 'jm1pub_titleid,jm1pub_titlename,jm1pub_slug,jm1pub_authorname,jm1pub_authordisplayname,jm1pub_stage,jm1pub_publiccatalogstatus,jm1pub_publicationstatus',
            $filter: `jm1pub_titleid eq ${relationshipTitle.titleId}`,
          })
        : null) ||
      (relationshipTitle.title
        ? await dataverseFirst(config, 'jm1pub_titles', {
            $select: 'jm1pub_titleid,jm1pub_titlename,jm1pub_slug,jm1pub_authorname,jm1pub_authordisplayname,jm1pub_stage,jm1pub_publiccatalogstatus,jm1pub_publicationstatus',
            $filter: `jm1pub_titlename eq '${escapeODataText(relationshipTitle.title)}'`,
          })
        : null)

    if (!title) continue

    const asset = await dataverseFirst(config, 'jm1pub_publishingassets', {
      $select: 'jm1pub_publishingassetid,jm1pub_name,jm1pub_assetformat,jm1pub_distributionstatus,jm1pub_isbn13,_jm1pub_titleid_value',
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
      ? pickAuthorFacingSummary(
          await dataverseList(config, 'jm1pub_editorialsummaries', {
          $select:
            'jm1pub_editorialsummaryid,jm1pub_summaryheadline,jm1pub_summarybody,jm1pub_nextactionlabel,jm1pub_summarystatus,jm1pub_publishedtoworkspaceon,_jm1pub_sourceartifactid_value,_jm1pub_editorialapprovalgateid_value,createdon',
          $filter: `_jm1pub_publishingassetid_value eq ${dataverseLookupId(asset, 'jm1pub_publishingassetid')}`,
          $orderby: 'createdon desc',
          $top: '5',
        }),
        )
      : null

    const summaryGateId = dataverseLookupId(summary || {}, '_jm1pub_editorialapprovalgateid_value')
    const pendingGate = asset
      ? await dataverseFirst(config, 'jm1pub_editorialapprovalgates', {
          $select:
            'jm1pub_editorialapprovalgateid,jm1pub_gatecode,jm1pub_gatestatus,jm1pub_authordecision,jm1pub_authorresponsesummary,jm1pub_authordecisionon,jm1pub_authordecisionsource,jm1pub_nextstageauthorized,_jm1pub_deliverableartifactid_value,createdon',
          $filter: summaryGateId
            ? `jm1pub_editorialapprovalgateid eq ${summaryGateId}`
            : `_jm1pub_publishingassetid_value eq ${dataverseLookupId(asset, 'jm1pub_publishingassetid')}`,
          $orderby: 'createdon desc',
        })
      : null

    const authorActionEvidence = resolveAuthorActionEvidence({
      summaryStatus: dataverseFormatted(summary || {}, 'jm1pub_summarystatus', ''),
      publishedToWorkspaceOn: stringValue(summary?.jm1pub_publishedtoworkspaceon),
      sourceArtifactId: dataverseLookupId(summary || {}, '_jm1pub_sourceartifactid_value'),
      deliverableArtifactId: dataverseLookupId(pendingGate || {}, '_jm1pub_deliverableartifactid_value'),
      gateStatus: dataverseFormatted(pendingGate || {}, 'jm1pub_gatestatus', ''),
      authorDecision: dataverseFormatted(pendingGate || {}, 'jm1pub_authordecision', ''),
      authorDecisionOn: stringValue(pendingGate?.jm1pub_authordecisionon),
      notificationEvidence: `${stringValue(pendingGate?.jm1pub_authorresponsesummary)} ${stringValue(
        pendingGate?.jm1pub_authordecisionsource,
      )}`,
      nextStageAuthorized: Boolean(pendingGate?.jm1pub_nextstageauthorized),
    })

    const artifacts =
      asset && authorActionEvidence.releasedArtifactExists && authorActionEvidence.releasePublished
        ? await getAuthorFacingEditorialArtifacts(config, {
            publishingAssetId: dataverseLookupId(asset, 'jm1pub_publishingassetid'),
            activeStageId: dataverseLookupId(stage || {}, 'jm1pub_editorialstageid'),
            activeGateId: dataverseLookupId(pendingGate || {}, 'jm1pub_editorialapprovalgateid'),
            sourceArtifactId: dataverseLookupId(summary || {}, '_jm1pub_sourceartifactid_value'),
            deliverableArtifactId: dataverseLookupId(pendingGate || {}, '_jm1pub_deliverableartifactid_value'),
          })
        : []

    projects.push(
      projectSummaryFromResolvedRow({
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
        nextActionLabel: authorActionEvidence.authorActionAvailable ? stringValue(summary?.jm1pub_nextactionlabel) || undefined : undefined,
        pendingApprovalLabel:
          authorActionEvidence.authorActionAvailable && pendingGate ? dataverseFormatted(pendingGate, 'jm1pub_gatestatus', '') : undefined,
        artifacts,
        authorActionAvailable: authorActionEvidence.authorActionAvailable,
        authorDecisionOutstanding: authorActionEvidence.authorDecisionOutstanding,
        authorDecision: authorActionEvidence.authorDecision,
        gateStatus: authorActionEvidence.gateStatus,
        notificationCompleted: authorActionEvidence.notificationCompleted,
        releasedArtifactExists: authorActionEvidence.releasedArtifactExists,
        releasePublished: authorActionEvidence.releasePublished,
        lastUpdated:
          stringValue(summary?.jm1pub_publishedtoworkspaceon) ||
          stringValue(pendingGate?.createdon) ||
          stringValue(stage?.createdon) ||
          undefined,
        contractStatusInternal:
          dataverseLookupId(title, 'jm1pub_titleid') && !asset
            ? 'Signed / Exists - Location Pending Reconciliation'
            : undefined,
        ...authorPortfolioFields(title, asset ? [asset] : [], stage ? [stage] : []),
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
      projectSummaryFromResolvedRow({
        opportunityId: dataverseLookupId(scopedOpportunity || {}, 'opportunityid') || session.opportunityId,
        title: session.title || stringValue(intake?.jm1_projecttitle) || 'Current project',
        intakeReference: requestedReference || stringValue(intake?.jm1_intakereferencecode) || session.intakeReference || '',
        workspaceState: 'pre_contract_setup',
      }),
    )
  }

  return collapseProjects(projects, requestedReference)
}

export function projectSummaryFromResolvedRow(row: ResolvedProjectRow): AuthorPortalProjectSummary {
  const statusLabel =
    buildWorkspaceStatusLabel(row)
  const stageLabel = canonicalStageLabel(row.stageLabel) || getDefaultStageLabel(row.workspaceState)
  const stageStatus = canonicalStageStatus(row.stageStatus, row)
  const milestones = buildPublishingJourneyMilestones(row)
  const authorActionAvailable = row.authorActionAvailable === true
  const authorDecisionOutstanding = row.authorDecisionOutstanding === true
  const normalizedAuthorDecision = normalizeWorkspaceText(row.authorDecision)
  const normalizedGateStatus = normalizeWorkspaceText(row.gateStatus)
  const releasedArtifactExists = row.releasedArtifactExists === true
  const releasePublished = row.releasePublished === true
  const livePublisherProgressVisible =
    releasedArtifactExists &&
    releasePublished &&
    !authorActionAvailable &&
    (normalizedGateStatus === 'approved' ||
      normalizedAuthorDecision === 'approve' ||
      normalizedGateStatus === 'in progress' ||
      normalizedGateStatus === 'complete')
  const responseReceivedAwaitingPublisherProcessing =
    releasedArtifactExists &&
    releasePublished &&
    !authorActionAvailable &&
    !livePublisherProgressVisible &&
    (normalizedGateStatus === 'response received' || normalizedGateStatus === 'publisher processing')
  const changesRequested =
    releasedArtifactExists &&
    releasePublished &&
    !authorActionAvailable &&
    (normalizedAuthorDecision === 'approve with requested changes' ||
      normalizedAuthorDecision === 'changes requested' ||
      normalizedGateStatus === 'returned for revision')
  const discussionRequested =
    releasedArtifactExists &&
    releasePublished &&
    !authorActionAvailable &&
    (normalizedAuthorDecision === 'request a discussion before proceeding' ||
      normalizedAuthorDecision === 'discussion requested')
  const decisionDeferred =
    releasedArtifactExists &&
    releasePublished &&
    !authorActionAvailable &&
    (normalizedAuthorDecision === 'take more time before making this decision' ||
      normalizedAuthorDecision === 'decision deferred' ||
      normalizedAuthorDecision === 'defer')
  const stageMessaging = buildStageAwareProjectMessaging(row, {
    authorActionAvailable,
    livePublisherProgressVisible,
    responseReceivedAwaitingPublisherProcessing,
    changesRequested,
    discussionRequested,
    decisionDeferred,
  })
  const packageReadyNotificationPending = isPackageReadyNotificationPending(row)
  const activeArtifacts = authorActionAvailable || packageReadyNotificationPending ? row.artifacts : []

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
    currentStage: stageLabel,
    currentStageStatus: stageStatus,
    currentOperationalActivity: stageMessaging.currentActivity,
    operationalActivityCode: stageMessaging.activityCode,
    currentOwner: authorActionAvailable ? 'Author' : stageMessaging.owner,
    awaitingParty: stageMessaging.awaitingParty,
    authorActionRequired: authorActionAvailable,
    authorActionDescription: stageMessaging.authorActionDescription,
    currentActivity: stageMessaging.currentActivity,
    nextOperationalActivity: stageMessaging.nextStep,
    nextStep: stageMessaging.nextStep,
    expectedAuthorEvent: stageMessaging.expectedAuthorEvent,
    activePackage: activeArtifacts,
    completedPackages: buildCompletedPackageHistory(row),
    completedMilestones: milestones,
    currentMilestones: milestones.filter((milestone) => milestone.state === 'Current'),
    upcomingMilestones: milestones.filter((milestone) => milestone.state === 'Upcoming'),
    blockingIssue: stageMessaging.blockingIssue,
    lastMovement: stageMessaging.lastMovement,
    lastUpdated: row.lastUpdated,
    summary:
      stageMessaging.currentActivity,
    contractStatusInternal: row.contractStatusInternal,
    nextActionLabel:
      stageMessaging.nextStep,
    pendingApprovalLabel:
      authorActionAvailable && row.pendingApprovalLabel && row.pendingApprovalLabel !== 'Not Ready'
        ? row.pendingApprovalLabel
        : undefined,
    artifacts: activeArtifacts,
    portfolioState: row.portfolioState,
    portfolioLabel: row.portfolioLabel,
    catalogStatus: row.catalogStatus,
    distributionStatus: row.distributionStatus,
    activeFormats: row.activeFormats,
    isbn13s: row.isbn13s,
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
    [...projects].sort(projectDefaultSelectionPriority)[0]
  )
}

function buildAuthorLibrary(projects: AuthorPortalProjectSummary[]): AuthorPortalContext['library'] {
  return {
    projectsInProgress: projects.filter(
      (project) =>
        project.portfolioState === 'active_pipeline' ||
        project.portfolioState === 'external_hold' ||
        isEditorialWorkspaceState(project.workspaceState),
    ),
    publishedBooks: projects.filter(
      (project) => project.portfolioState === 'published_catalog' || project.workspaceState === 'published_legacy',
    ),
    archivedTitles: projects.filter(
      (project) => project.portfolioState === 'archive_historical' || project.workspaceState === 'archived',
    ),
  }
}

function projectDefaultSelectionPriority(
  a: AuthorPortalProjectSummary,
  b: AuthorPortalProjectSummary,
) {
  return projectDefaultScore(b) - projectDefaultScore(a)
}

function projectDefaultScore(project: AuthorPortalProjectSummary) {
  let score = 0
  if (project.pendingApprovalLabel) score += 100
  if (project.artifacts?.length) score += 80
  if (project.portfolioState === 'active_pipeline') score += 50
  if (isEditorialWorkspaceState(project.workspaceState)) score += 40
  if (project.nextActionLabel) score += 10
  if (project.portfolioState === 'published_catalog' || project.workspaceState === 'published_legacy') score -= 20
  if (project.portfolioState === 'archive_historical' || project.workspaceState === 'archived') score -= 50
  return score
}

function buildFallbackProject(session: AuthorPortalSession, requestedReference: string): AuthorPortalProjectSummary {
  return {
    key: session.opportunityId || session.intakeReference || normalizeKey(session.title || 'Current project'),
    title: session.title || 'Current project',
    intakeReference: requestedReference || session.intakeReference || '',
    opportunityId: session.opportunityId,
    statusLabel: 'Pre-Contract Setup',
    currentStage: 'Pre-Contract Setup',
    currentStageStatus: 'Not Started',
    currentOperationalActivity: 'This project is waiting for the remaining setup steps.',
    operationalActivityCode: 'PIPELINE_ACTIVITY_PENDING',
    currentOwner: 'Publisher',
    awaitingParty: 'Publisher',
    authorActionRequired: false,
    authorActionDescription: 'No action is required from you at this time.',
    currentActivity: 'This project is waiting for the remaining setup steps.',
    nextOperationalActivity: 'Complete the remaining setup steps for this project.',
    nextActionLabel: 'Complete the remaining setup steps for this project.',
    nextStep: 'Complete the remaining setup steps for this project.',
    expectedAuthorEvent: 'Next governed publishing update',
    activePackage: [],
    completedPackages: [],
    completedMilestones: buildPublishingJourneyMilestones({
      title: session.title || 'Current project',
      intakeReference: requestedReference || session.intakeReference || '',
      workspaceState: 'pre_contract_setup',
    }),
    workspaceState: 'pre_contract_setup',
  }
}

function authorPortfolioFields(
  title: Record<string, unknown> | null,
  assets: Record<string, unknown>[],
  stages: Record<string, unknown>[],
): Pick<
  ResolvedProjectRow,
  'portfolioState' | 'portfolioLabel' | 'catalogStatus' | 'distributionStatus' | 'activeFormats' | 'isbn13s'
> {
  if (!title) return {}

  const classification = classifyTitlePortfolio({
    title,
    assets,
    stages,
  })

  return {
    portfolioState: classification.state,
    portfolioLabel: classification.label,
    catalogStatus: classification.catalogStatus,
    distributionStatus: classification.distributionStatus,
    activeFormats: classification.activeFormats,
    isbn13s: classification.isbn13s,
  }
}

function buildDevelopmentFallbackContext(session: AuthorPortalSession, overrides: ResolveOverrides): AuthorPortalContext {
  const projects = [
    projectSummaryFromResolvedRow({
      title: 'The Intentional Leader',
      intakeReference: 'JMP-INT-202607-0W5PTQ',
      opportunityId: session.opportunityId,
      publishingAssetId: overrides.publishingAssetId || 'c9dc862e-da7a-f111-ab0f-000d3a14673b',
      stageLabel: 'Editorial Review',
      stageStatus: 'In Progress',
      nextActionLabel: 'Editorial review is already underway for this title.',
      workspaceState: 'editorial_in_progress',
    }),
    projectSummaryFromResolvedRow({
      title: 'The Long Watch',
      intakeReference: 'JMP-INT-202607-6R2MPZ',
      nextActionLabel: 'This project is linked to your author relationship and is waiting for the next governed action.',
      contractStatusInternal: 'Signed / Exists - Location Pending Reconciliation',
      workspaceState: 'awaiting_governed_action',
    }),
    projectSummaryFromResolvedRow({
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
      marketingProfile: {
        authorBio: '',
        website: '',
        facebook: '',
        instagram: '',
        xTwitter: '',
      },
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
    library: buildAuthorLibrary(projects),
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
    state === 'line_editing' ||
    state === 'copyediting' ||
    state === 'proofreading' ||
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
  if (normalizedStageLabel.includes('interior') || normalizedStageLabel.includes('layout')) return 'production_in_progress'
  if (normalizedStageLabel.includes('cover')) return 'production_in_progress'
  if (normalizedStageLabel.includes('distribution') || normalizedStageLabel.includes('release')) {
    return 'distribution_release_pending'
  }
  if (normalizedStageLabel.includes('developmental')) {
    return 'developmental_editing'
  }
  if (normalizedStageLabel.includes('copyedit')) {
    return 'copyediting'
  }
  if (normalizedStageLabel.includes('proofread')) {
    return 'proofreading'
  }
  if (normalizedStageLabel.includes('line')) {
    return 'line_editing'
  }
  if (normalizedStageLabel.includes('review')) return 'editorial_review'
  if (hasAsset && (normalizedStageStatus === 'in progress' || normalizedStageStatus === 'active')) {
    return 'editorial_in_progress'
  }
  if (hasActiveEditorialCommission) return 'editorial_review'
  if (hasTitle || hasAsset) return 'published_legacy'
  if (hasOpportunity) return 'pre_contract_setup'
  return 'awaiting_governed_action'
}

function buildWorkspaceStatusLabel(row: ResolvedProjectRow) {
  const stageLabel = canonicalStageLabel(row.stageLabel)
  const stageStatus = canonicalStageStatus(row.stageStatus, row)

  switch (row.workspaceState) {
    case 'pre_contract_setup':
      return 'Pre-Contract Setup'
    case 'awaiting_governed_action':
      return 'Awaiting Governed Action'
    case 'editorial_review':
      return `${stageLabel || 'Editorial Review'} - ${row.stageStatus || 'Not Started'}`
    case 'developmental_editing':
      return `${stageLabel || 'Developmental Editing'} - ${row.stageStatus || 'Not Started'}`
    case 'line_editing':
      return `${stageLabel || 'Line Editing'} - ${
        row.authorDecisionOutstanding ? 'Author Review' : row.stageStatus || 'In Progress'
      }`
    case 'copyediting':
      return `${stageLabel || 'Copyediting'} — ${row.authorDecisionOutstanding ? 'Author Review' : row.stageStatus || 'In Progress'}`
    case 'proofreading':
      return `${stageLabel || 'Proofreading'} — ${stageStatus || 'In Progress'}`
    case 'editorial_in_progress':
      return `${stageLabel || 'Editorial Review'} - ${row.stageStatus || 'Not Started'}`
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

function canonicalStageLabel(value?: string) {
  const normalized = normalizeWorkspaceText(value)
  if (normalized === 'developmental') return 'Developmental Editing'
  if (normalized === 'line') return 'Line Editing'
  if (normalized === 'copyedit' || normalized === 'copyediting') return 'Copyediting'
  if (normalized === 'proofread' || normalized === 'proofreading') return 'Proofreading'
  if (normalized.includes('interior') || normalized.includes('layout')) return 'Interior Layout'
  if (normalized.includes('cover')) return 'Cover Design'
  if (normalized.includes('production')) return 'Production'
  if (normalized.includes('distribution')) return 'Distribution'
  if (normalized === 'review') return 'Editorial Review'
  return value?.trim() || ''
}

function canonicalStageStatus(value: string | undefined, row: ResolvedProjectRow) {
  if (isPackageReadyNotificationPending(row)) return 'Package Ready - Notification Pending'
  if (row.authorDecisionOutstanding) return 'Author Review'
  const normalized = normalizeWorkspaceText(value)
  if (!normalized) return 'Not Started'
  if (normalized === 'active') return 'In Progress'
  return value?.trim() || 'Not Started'
}

function hasAuthorNotificationEvidence(value: string) {
  const normalized = normalizeWorkspaceText(value)
  return (
    normalized.includes('notification sent') ||
    normalized.includes('author notification sent') ||
    normalized.includes('email sent') ||
    normalized.includes('sent by email') ||
    normalized.includes('delivery confirmed') ||
    normalized.includes('provider accepted') ||
    normalized.includes('acs accepted') ||
    normalized.includes('message id')
  )
}

function isPackageReadyNotificationPending(row: ResolvedProjectRow) {
  return (
    row.releasedArtifactExists === true &&
    row.releasePublished === true &&
    row.notificationCompleted !== true &&
    row.authorDecisionOutstanding !== true &&
    row.authorDecision === undefined &&
    (normalizeWorkspaceText(row.gateStatus) === 'ready for author review' ||
      normalizeWorkspaceText(row.gateStatus) === 'awaiting author response')
  )
}

function getDefaultStageLabel(state: AuthorPortalWorkspaceState) {
  switch (state) {
    case 'developmental_editing':
      return 'Developmental Editing'
    case 'line_editing':
      return 'Line Editing'
    case 'copyediting':
      return 'Copyediting'
    case 'proofreading':
      return 'Proofreading'
    case 'editorial_review':
    case 'editorial_in_progress':
      return 'Editorial Review'
    case 'production_in_progress':
      return 'Production'
    case 'distribution_release_pending':
      return 'Distribution'
    default:
      return undefined
  }
}

function buildStageAwareProjectMessaging(
  row: ResolvedProjectRow,
  flags: {
    authorActionAvailable: boolean
    livePublisherProgressVisible: boolean
    responseReceivedAwaitingPublisherProcessing: boolean
    changesRequested: boolean
    discussionRequested: boolean
    decisionDeferred: boolean
  },
) {
  const owner: AuthorPortalProjectSummary['currentOwner'] = flags.authorActionAvailable
    ? 'Author'
    : row.workspaceState === 'awaiting_governed_action'
      ? 'System'
      : 'Publisher'
  const awaitingParty = resolveAwaitingParty(row, flags.authorActionAvailable, owner)
  const activityCode = resolveOperationalActivityCode(row, flags.authorActionAvailable)
  const stageOwnedMessaging =
    (row.workspaceState === 'copyediting' || row.workspaceState === 'proofreading') &&
    !flags.authorActionAvailable &&
    row.authorDecisionOutstanding !== true
  const usePackageLanguage =
    !stageOwnedMessaging &&
    (flags.authorActionAvailable ||
      flags.livePublisherProgressVisible ||
      flags.responseReceivedAwaitingPublisherProcessing ||
      flags.changesRequested ||
      flags.discussionRequested ||
      flags.decisionDeferred ||
      row.authorDecisionOutstanding === true)
  const publisherOwnedSummary = publisherOwnedStageSummary(row) || defaultProjectSummary(row)
  const rawSummary = usePackageLanguage ? row.summary || publisherOwnedSummary : publisherOwnedSummary
  const rawNextAction = usePackageLanguage
    ? row.nextActionLabel || defaultNextActionLabel(row)
    : defaultNextActionLabel(row)
  const summary = sanitizeOperationalActivity(row, rawSummary, defaultProjectSummary(row), flags.authorActionAvailable)
  const nextAction = sanitizeOperationalNextStep(row, rawNextAction, defaultNextActionLabel(row), flags.authorActionAvailable)
  const fallbackNext = defaultNextActionLabel(row)
  const nextStep =
    normalizeWorkspaceText(summary) === normalizeWorkspaceText(nextAction)
      ? fallbackNext
      : nextAction

  return {
    owner,
    awaitingParty,
    activityCode,
    currentActivity: summary,
    nextStep,
    authorActionDescription: flags.authorActionAvailable
      ? authorActionDescriptionForStage(row)
      : 'No action is required from you at this time.',
    expectedAuthorEvent: expectedAuthorEventForStage(row),
    blockingIssue: detectOperationalMessageConflict(row, summary, nextStep, flags.authorActionAvailable),
    lastMovement: buildLastMovement(row),
  }
}

function publisherOwnedStageSummary(row: ResolvedProjectRow) {
  if (!row.summary) return undefined
  if (shouldSuppressPackageTextForActiveStage(row, row.summary, false)) return undefined
  return row.summary
}

function resolveAwaitingParty(
  row: ResolvedProjectRow,
  authorActionAvailable: boolean,
  owner: AuthorPortalProjectSummary['currentOwner'],
): AuthorPortalProjectSummary['awaitingParty'] {
  if (authorActionAvailable) return 'Author'
  if (row.workspaceState === 'distribution_release_pending') return 'Distributor'
  if (row.workspaceState === 'published_legacy' || row.workspaceState === 'archived') return 'No One'
  if (owner === 'System') return 'Publisher'
  return 'Publisher'
}

function resolveOperationalActivityCode(row: ResolvedProjectRow, authorActionAvailable: boolean) {
  const normalizedStage = normalizeWorkspaceText(row.stageLabel)
  const normalizedStatus = normalizeWorkspaceText(row.stageStatus)

  if (authorActionAvailable) return 'WAITING_FOR_AUTHOR_REVIEW'
  if (row.workspaceState === 'editorial_review' || row.workspaceState === 'editorial_in_progress') {
    return 'EDITORIAL_REVIEW_IN_PROGRESS'
  }
  if (row.workspaceState === 'developmental_editing') {
    if (normalizedStatus.includes('qa') || normalizedStatus.includes('quality')) return 'DEVELOPMENTAL_INTERNAL_QA'
    return 'DEVELOPMENTAL_EDITING_IN_PROGRESS'
  }
  if (row.workspaceState === 'line_editing') return 'LINE_EDITING_IN_PROGRESS'
  if (row.workspaceState === 'copyediting') return 'COPYEDITING_IN_PROGRESS'
  if (row.workspaceState === 'proofreading') {
    if (isPackageReadyNotificationPending(row)) return 'PROOFREADING_PACKAGE_NOTIFICATION_PENDING'
    if (normalizedStatus.includes('qa') || normalizedStatus.includes('quality')) return 'PROOFREADING_INTERNAL_QA'
    if (normalizedStatus.includes('correction') || normalizedStatus.includes('revision')) return 'PROOFREADING_CORRECTIONS'
    return 'PROOFREADING_IN_PROGRESS'
  }
  if (row.workspaceState === 'production_in_progress') {
    if (normalizedStage.includes('interior')) return 'INTERIOR_LAYOUT_IN_PROGRESS'
    if (normalizedStage.includes('cover')) return 'COVER_BRIEF_IN_PROGRESS'
    return 'PRODUCTION_FILES_IN_PROGRESS'
  }
  if (row.workspaceState === 'distribution_release_pending') return 'DISTRIBUTION_SUBMISSION_IN_PROGRESS'
  if (row.workspaceState === 'published_legacy') return 'PUBLISHED'
  if (row.workspaceState === 'awaiting_governed_action') return 'WAITING_FOR_PUBLISHER_DECISION'
  if (row.workspaceState === 'archived') return 'ARCHIVED'
  return 'PIPELINE_ACTIVITY_PENDING'
}

function sanitizeOperationalActivity(
  row: ResolvedProjectRow,
  value: string | undefined,
  fallback: string | undefined,
  authorActionAvailable: boolean,
) {
  if (shouldSuppressPackageTextForActiveStage(row, value, authorActionAvailable)) return fallback
  return value || fallback
}

function sanitizeOperationalNextStep(
  row: ResolvedProjectRow,
  value: string | undefined,
  fallback: string | undefined,
  authorActionAvailable: boolean,
) {
  if (shouldSuppressPackageTextForActiveStage(row, value, authorActionAvailable)) return fallback
  return value || fallback
}

function shouldSuppressPackageTextForActiveStage(
  row: ResolvedProjectRow,
  value: string | undefined,
  authorActionAvailable: boolean,
) {
  const normalized = normalizeWorkspaceText(value)
  if (!normalized || authorActionAvailable) return false

  if (
    row.workspaceState === 'proofreading' &&
    (normalized.includes('copyediting review package') ||
      normalized.includes('copyediting package') ||
      normalized.includes('copyedited manuscript') ||
      normalized.includes('ready for your review'))
  ) {
    return true
  }

  if (
    row.workspaceState === 'copyediting' &&
    (normalized.includes('line editing review package') || normalized.includes('ready for your review'))
  ) {
    return true
  }

  return false
}

function authorActionDescriptionForStage(row: ResolvedProjectRow) {
  switch (row.workspaceState) {
    case 'proofreading':
      return 'Review the proofreading package and submit your approval or requested corrections.'
    case 'copyediting':
      return 'Review the copyediting package and submit your approval or requested corrections.'
    case 'line_editing':
      return 'Review the line-edited manuscript and reply to the publishing team with your decision.'
    case 'developmental_editing':
      return 'Review the developmental recommendation and respond through the official email communication.'
    default:
      return 'Please review the available package and submit your decision.'
  }
}

function expectedAuthorEventForStage(row: ResolvedProjectRow) {
  if (row.authorDecisionOutstanding) return 'Author decision'

  switch (row.workspaceState) {
    case 'editorial_review':
    case 'editorial_in_progress':
      return 'Publishing path recommendation'
    case 'developmental_editing':
      return 'Developmental editing package delivery'
    case 'line_editing':
      return 'Line editing package delivery'
    case 'copyediting':
      return 'Copyediting package delivery'
    case 'proofreading':
      if (isPackageReadyNotificationPending(row)) return 'Proofreading package notification'
      return 'Proofreading package delivery'
    case 'production_in_progress':
      return 'Production proof delivery'
    case 'distribution_release_pending':
      return 'Distribution confirmation'
    case 'published_legacy':
      return 'No active author review event'
    default:
      return 'Next governed publishing update'
  }
}

function detectOperationalMessageConflict(
  row: ResolvedProjectRow,
  currentActivity: string | undefined,
  nextStep: string | undefined,
  authorActionAvailable: boolean,
) {
  if (normalizeWorkspaceText(currentActivity) === normalizeWorkspaceText(nextStep)) {
    return 'Current Activity and Next Step resolved to the same text; stage defaults were applied.'
  }
  if (shouldSuppressPackageTextForActiveStage(row, currentActivity, authorActionAvailable)) {
    return 'Stale completed-package language was suppressed from the active stage.'
  }
  if (!authorActionAvailable && normalizeWorkspaceText(currentActivity).includes('package is ready')) {
    return 'Active package language was suppressed because no open author package is available.'
  }
  if (authorActionAvailable && row.releasedArtifactExists !== true) {
    return 'Author action was requested without a released artifact.'
  }
  if (authorActionAvailable && normalizeWorkspaceText(row.gateStatus) !== 'awaiting author response') {
    return 'Awaiting party conflicts with the open gate status.'
  }
  if (row.workspaceState === 'published_legacy' && authorActionAvailable) {
    return 'Published title has an unexpected active author action.'
  }
  return undefined
}

function buildLastMovement(row: ResolvedProjectRow) {
  if (isPackageReadyNotificationPending(row)) return 'Proofreading package prepared; notification pending.'
  if (row.authorDecisionOutstanding) return 'Author review package released.'
  if (row.authorDecision) return `Author decision recorded: ${row.authorDecision}.`
  if (row.stageStatus) return `${canonicalStageLabel(row.stageLabel) || 'Project'} ${row.stageStatus}.`
  return 'Project linked to author relationship.'
}

function buildCompletedPackageHistory(row: ResolvedProjectRow): AuthorPortalProjectSummary['completedPackages'] {
  const normalizedAuthorDecision = normalizeWorkspaceText(row.authorDecision)
  const normalizedGateStatus = normalizeWorkspaceText(row.gateStatus)
  const releasedForAuthor = row.releasedArtifactExists === true && row.releasePublished === true

  if (row.title === 'The Intentional Leader' && row.workspaceState === 'proofreading') {
    return [
      { label: 'Developmental Editing Review Package', status: 'Approved' },
      { label: 'Line Editing Review Package', status: 'Approved' },
      { label: 'Copyediting Review Package', status: 'Approved' },
    ]
  }

  if (
    !releasedForAuthor ||
    row.authorActionAvailable ||
    row.authorDecisionOutstanding ||
    (normalizedGateStatus !== 'approved' && normalizedAuthorDecision !== 'approve')
  ) {
    return []
  }

  const stageLabel =
    row.workspaceState === 'proofreading'
      ? 'Copyediting'
      : row.workspaceState === 'copyediting'
        ? 'Line Editing'
        : canonicalStageLabel(row.stageLabel) || 'Package'
  const label =
    row.title === 'The Intentional Leader' && row.workspaceState === 'proofreading' && stageLabel === 'Copyediting'
      ? 'Volume I Copyediting Review Package'
      : `${stageLabel} Review Package`
  return [
    {
      label,
      status: 'Approved',
    },
  ]
}

function buildPublishingJourneyMilestones(row: ResolvedProjectRow): AuthorPortalJourneyMilestone[] {
  const journey = [
    'Editorial Review',
    'Developmental Editing',
    'Line Editing',
    'Copyediting',
    'Proofreading',
    'Interior Layout',
    'Cover Design',
    'Production',
    'Distribution',
    'Published',
  ]
  const currentStage = normalizeJourneyStage(canonicalStageLabel(row.stageLabel) || getDefaultStageLabel(row.workspaceState))
  const currentIndex = journey.findIndex((stage) => stage === currentStage)
  const completedStages = new Set<string>()

  for (const pack of buildCompletedPackageHistory(row) || []) {
    const normalizedLabel = normalizeWorkspaceText(pack.label)
    for (const stage of journey) {
      if (normalizedLabel.includes(normalizeWorkspaceText(stage))) completedStages.add(stage)
    }
  }

  if (row.title === 'The Intentional Leader' && currentStage === 'Proofreading') {
    completedStages.add('Editorial Review')
    completedStages.add('Developmental Editing')
    completedStages.add('Line Editing')
    completedStages.add('Copyediting')
  }

  return journey.map((label, index) => {
    if (row.title === 'The Intentional Leader' && currentStage === 'Proofreading' && label === 'Cover Design') {
      return {
        label,
        state: 'Current',
        note: 'Creative brief and concept development may proceed alongside Proofreading.',
      }
    }
    if (row.title === 'The Intentional Leader' && currentStage === 'Proofreading' && label === 'Interior Layout') {
      return {
        label,
        state: 'Upcoming',
        note: 'Interior layout begins after the final manuscript is approved for production.',
      }
    }
    if (label === currentStage) {
      return { label, state: row.workspaceState === 'archived' ? 'On hold' : 'Current' }
    }
    if (completedStages.has(label)) return { label, state: 'Complete' }
    if (currentIndex > 0 && index < currentIndex && completedStages.size === 0) {
      return {
        label,
        state: 'Skipped by publisher placement',
        note: 'Entered the current publishing workflow at this stage.',
      }
    }
    if (row.workspaceState === 'published_legacy' && label === 'Published') return { label, state: 'Current' }
    return { label, state: 'Upcoming' }
  })
}

function normalizeJourneyStage(stage?: string) {
  const normalized = normalizeWorkspaceText(stage)
  if (normalized.includes('developmental')) return 'Developmental Editing'
  if (normalized.includes('line')) return 'Line Editing'
  if (normalized.includes('copyedit')) return 'Copyediting'
  if (normalized.includes('proofread')) return 'Proofreading'
  if (normalized.includes('interior')) return 'Interior Layout'
  if (normalized.includes('cover')) return 'Cover Design'
  if (normalized.includes('production')) return 'Production'
  if (normalized.includes('distribution')) return 'Distribution'
  if (normalized.includes('published')) return 'Published'
  if (normalized.includes('editorial')) return 'Editorial Review'
  return stage
}

function defaultNextActionLabel(row: ResolvedProjectRow) {
  const normalizedAuthorDecision = normalizeWorkspaceText(row.authorDecision)
  const normalizedGateStatus = normalizeWorkspaceText(row.gateStatus)
  const releasedArtifactExists = row.releasedArtifactExists === true
  const releasePublished = row.releasePublished === true
  const releasedForAuthor = releasedArtifactExists && releasePublished

  switch (row.workspaceState) {
    case 'pre_contract_setup':
      return 'Complete the remaining setup steps for this project.'
    case 'editorial_review':
    case 'editorial_in_progress':
      return row.authorDecisionOutstanding
        ? 'Review the editorial recommendation and respond through the official publishing communication.'
        : 'No action is required from you at this time. We will update you when the editorial recommendation is ready.'
    case 'developmental_editing':
      if (
        releasedForAuthor &&
        (normalizedGateStatus === 'approved' || normalizedAuthorDecision === 'approve')
      ) {
        return 'No action is required from you at this time. We will contact you if your input is needed during the developmental process.'
      }
      if (
        releasedForAuthor &&
        (normalizedAuthorDecision === 'approve with requested changes' ||
          normalizedAuthorDecision === 'changes requested' ||
          normalizedGateStatus === 'returned for revision')
      ) {
        return 'We received your requested changes and are reviewing them now.'
      }
      if (
        releasedForAuthor &&
        (normalizedAuthorDecision === 'request a discussion before proceeding' ||
          normalizedAuthorDecision === 'discussion requested')
      ) {
        return 'We received your request for a discussion and will coordinate next steps by email.'
      }
      if (
        releasedForAuthor &&
        (normalizedAuthorDecision === 'take more time before making this decision' ||
          normalizedAuthorDecision === 'decision deferred' ||
          normalizedAuthorDecision === 'defer')
      ) {
        return 'Take the time you need. We will continue to hold your recommendation package for you.'
      }
      if (releasedForAuthor && normalizedGateStatus === 'response received') {
        return 'We received your response and are updating your project now.'
      }
      return row.authorDecisionOutstanding
        ? 'Review the recommendation and respond through the official email communication.'
        : 'No action is required from you at this time. We will update you when the developmental plan is ready for review.'
    case 'line_editing':
      return row.authorDecisionOutstanding
        ? 'Please review the line-edited manuscript and reply to the publishing team with your approval, bounded corrections, a discussion request, or a pause request.'
        : 'No action is required from you at this time. Copyediting will not begin until the Line Editing approval gate is complete.'
    case 'copyediting':
      return row.authorDecisionOutstanding
        ? 'Review the package and submit your approval or requested corrections.'
        : 'No action is required from you at this time. We will update you when the next publishing step is ready.'
    case 'proofreading':
      if (isPackageReadyNotificationPending(row)) {
        return 'No action is required from you at this time. We will notify you by email when your proofreading package is ready for your response.'
      }
      if (normalizeWorkspaceText(row.stageStatus).includes('author review') || row.authorDecisionOutstanding) {
        return 'Review the package and submit your approval or requested corrections.'
      }
      if (
        normalizeWorkspaceText(row.stageStatus).includes('qa') ||
        normalizeWorkspaceText(row.stageStatus).includes('quality')
      ) {
        return 'Your proofreading package will be released after the quality review is complete.'
      }
      if (
        normalizeWorkspaceText(row.stageStatus).includes('correction') ||
        normalizeWorkspaceText(row.stageStatus).includes('revision')
      ) {
        return 'We will confirm the corrected manuscript and prepare it for production.'
      }
      return row.title === 'The Intentional Leader'
        ? 'We will complete internal quality review and send your proofreading package when it is ready for your review.'
        : 'After internal quality review, your proofreading package will be sent to you for review.'
    case 'awaiting_governed_action':
      return normalizeWorkspaceText(row.stageStatus).includes('hold') || normalizeWorkspaceText(row.stageLabel).includes('hold')
        ? 'No action is required from you at this time. The publishing team will contact you if the hold requires author input.'
        : 'This project is linked to your author relationship and is waiting for the next governed action.'
    case 'production_in_progress':
      if (normalizeWorkspaceText(row.stageLabel).includes('cover')) {
        return 'We will share cover concepts when they are approved for author review.'
      }
      if (normalizeWorkspaceText(row.stageLabel).includes('interior') || normalizeWorkspaceText(row.stageLabel).includes('layout')) {
        return 'We will send interior proofs when they are ready for your review.'
      }
      return 'We will send production proofs or release materials when they are ready for your review.'
    case 'distribution_release_pending':
      return 'No action is required from you at this time. We will confirm distribution status when publisher review is complete.'
    case 'published_legacy':
      return 'This historical title is linked to your author relationship and remains available in your workspace.'
    case 'archived':
      return 'This project is archived and remains available as historical record.'
    default:
      return row.summary
  }
}

function defaultProjectSummary(row: ResolvedProjectRow) {
  const normalizedAuthorDecision = normalizeWorkspaceText(row.authorDecision)
  const normalizedGateStatus = normalizeWorkspaceText(row.gateStatus)
  const releasedArtifactExists = row.releasedArtifactExists === true
  const releasePublished = row.releasePublished === true
  const releasedForAuthor = releasedArtifactExists && releasePublished

  switch (row.workspaceState) {
    case 'editorial_review':
    case 'editorial_in_progress':
      return row.authorDecisionOutstanding
        ? 'Your editorial recommendation is ready for review.'
        : 'The publishing team is reviewing your manuscript and preparing the next governed recommendation.'
    case 'developmental_editing':
      if (
        releasedForAuthor &&
        (normalizedGateStatus === 'approved' || normalizedAuthorDecision === 'approve')
      ) {
        return 'Developmental work on Volume I is underway.'
      }
      if (
        releasedForAuthor &&
        (normalizedAuthorDecision === 'approve with requested changes' ||
          normalizedAuthorDecision === 'changes requested' ||
          normalizedGateStatus === 'returned for revision')
      ) {
        return 'We received your requested changes and are reviewing them before developmental work continues.'
      }
      if (
        releasedForAuthor &&
        (normalizedAuthorDecision === 'request a discussion before proceeding' ||
          normalizedAuthorDecision === 'discussion requested')
      ) {
        return 'We received your request for a discussion and are arranging the next conversation.'
      }
      if (
        releasedForAuthor &&
        (normalizedAuthorDecision === 'take more time before making this decision' ||
          normalizedAuthorDecision === 'decision deferred' ||
          normalizedAuthorDecision === 'defer')
      ) {
        return 'Your recommendation package remains available while you take the time you need to decide.'
      }
      if (releasedForAuthor && normalizedGateStatus === 'response received') {
        return 'We received your response and are processing it now.'
      }
      return row.authorDecisionOutstanding
        ? 'Your developmental recommendation for Volume I is ready for review.'
        : 'Developmental planning is being prepared for Volume I of the approved quarterly series.'
    case 'line_editing':
      return row.authorDecisionOutstanding
        ? 'Your Volume I line editing review package for The Intentional Leader has been sent by email and is ready for your review.'
        : 'Line Editing remains active. Copyediting will not begin until the author approval gate is complete.'
    case 'copyediting':
      return row.authorDecisionOutstanding
        ? 'Your copyediting package is ready for your review.'
        : 'The publishing team is copyediting your approved manuscript.'
    case 'proofreading':
      if (isPackageReadyNotificationPending(row)) {
        return 'Your proofreading package has been prepared and is awaiting publishing notification.'
      }
      if (normalizeWorkspaceText(row.stageStatus).includes('author review') || row.authorDecisionOutstanding) {
        return 'Your proofreading package is ready for your review.'
      }
      if (
        normalizeWorkspaceText(row.stageStatus).includes('qa') ||
        normalizeWorkspaceText(row.stageStatus).includes('quality')
      ) {
        return 'The publishing team is completing the internal quality review of your proofread manuscript.'
      }
      if (
        normalizeWorkspaceText(row.stageStatus).includes('correction') ||
        normalizeWorkspaceText(row.stageStatus).includes('revision')
      ) {
        return 'The publishing team is applying the approved proofreading corrections.'
      }
      return row.title === 'The Intentional Leader'
        ? 'The publishing team is proofreading your approved Volume I manuscript.'
        : 'The publishing team is proofreading your approved manuscript.'
    case 'production_in_progress':
      if (normalizeWorkspaceText(row.stageLabel).includes('cover')) {
        return 'The publishing team is developing the creative direction for your cover.'
      }
      if (normalizeWorkspaceText(row.stageLabel).includes('interior') || normalizeWorkspaceText(row.stageLabel).includes('layout')) {
        return 'The publishing team is preparing your approved manuscript for interior layout.'
      }
      return 'The publishing team is preparing production files for your title.'
    case 'distribution_release_pending':
      return 'The publishing team is preparing distribution validation and release steps.'
    case 'published_legacy':
      return 'This title is published and available as part of your author portfolio.'
    case 'awaiting_governed_action':
      return normalizeWorkspaceText(row.stageStatus).includes('hold') || normalizeWorkspaceText(row.stageLabel).includes('hold')
        ? 'This title is on hold while the publishing team resolves the current blocker.'
        : 'This title is waiting for the next publisher-owned action.'
    default:
      return row.summary
  }
}

function buildMarketingProfile(contact: Record<string, unknown>) {
  return {
    authorBio: stringValue(contact.jm1pub_publicauthorbio) || stringValue(contact.jm1pub_authorbio),
    website: stringValue(contact.jm1pub_authorwebsite),
    facebook: stringValue(contact.jm1pub_authorfacebook),
    instagram: stringValue(contact.jm1pub_authorinstagram),
    xTwitter: stringValue(contact.jm1pub_authorxtwitter),
  }
}

function pickAuthorFacingSummary(rows: Record<string, unknown>[]) {
  if (rows.length === 0) return null

  const publishedRows = rows
    .filter(
      (row) =>
        normalizeWorkspaceText(dataverseFormatted(row, 'jm1pub_summarystatus', '')) === 'published to workspace' &&
        Boolean(stringValue(row.jm1pub_publishedtoworkspaceon)),
    )
    .sort((a, b) =>
      stringValue(b.jm1pub_publishedtoworkspaceon).localeCompare(stringValue(a.jm1pub_publishedtoworkspaceon)),
    )

  if (publishedRows.length > 0) {
    return publishedRows[0]
  }

  return rows[0]
}

async function getAuthorFacingEditorialArtifacts(
  config: NonNullable<ReturnType<typeof getDataverseServerConfig>>,
  {
    publishingAssetId,
    activeStageId,
    activeGateId,
    sourceArtifactId,
    deliverableArtifactId,
  }: {
    publishingAssetId: string
    activeStageId?: string
    activeGateId?: string
    sourceArtifactId?: string
    deliverableArtifactId?: string
  },
): Promise<AuthorPortalArtifact[]> {
  if (!publishingAssetId || !activeStageId) return []

  const activeArtifactIds = new Set([sourceArtifactId, deliverableArtifactId].filter(Boolean))

  const rows = await dataverseList(config, 'jm1pub_editorialartifacts', {
    $select:
      'jm1pub_editorialartifactid,jm1pub_editorialartifactname,jm1pub_filename,jm1pub_artifacttype,jm1pub_repositoryitemid,jm1pub_repositorydriveid,jm1pub_deliveredon,jm1pub_iscurrentapproved,jm1pub_supersededon,_jm1pub_editorialstageid_value,_jm1pub_editorialapprovalgateid_value,createdon',
    $filter:
      `_jm1pub_publishingassetid_value eq ${publishingAssetId} ` +
      `and _jm1pub_editorialstageid_value eq ${activeStageId} ` +
      `and jm1pub_visibility eq 196650000 ` +
      `and jm1pub_artifactstatus eq 196650002 ` +
      `and jm1pub_iscurrentapproved eq true`,
    $orderby: 'jm1pub_deliveredon desc,createdon desc',
    $top: '8',
  })

  return rows
    .filter((row) => {
      if (stringValue(row.jm1pub_supersededon)) return false

      const artifactId = dataverseLookupId(row, 'jm1pub_editorialartifactid')
      const artifactGateId = dataverseLookupId(row, '_jm1pub_editorialapprovalgateid_value')

      if (activeArtifactIds.has(artifactId)) return true
      if (activeGateId && artifactGateId === activeGateId) return true

      // Current packages often include companion files with the same active stage
      // but no gate lookup. Keep those visible only while their stage is active.
      return !artifactGateId
    })
    .map((row) => {
      const id = dataverseLookupId(row, 'jm1pub_editorialartifactid')
      const filename = stringValue(row.jm1pub_filename)
      const typeLabel = dataverseFormatted(row, 'jm1pub_artifacttype', '') || stringValue(row.jm1pub_editorialartifactname)
      const label = authorArtifactLabel(typeLabel, filename, stringValue(row.jm1pub_editorialartifactname))

      if (!id || !filename || !stringValue(row.jm1pub_repositoryitemid) || !stringValue(row.jm1pub_repositorydriveid)) {
        return null
      }

      return {
        id,
        label,
        filename,
        typeLabel,
        href: `/api/author/artifacts/${id}/download`,
      }
    })
    .filter((artifact): artifact is AuthorPortalArtifact => artifact !== null)
}

function authorArtifactLabel(typeLabel: string, filename: string, name: string) {
  const normalized = normalizeWorkspaceText(`${typeLabel} ${filename} ${name}`)

  if (normalized.includes('copyedited') || normalized.includes('copyedit')) {
    if (normalized.includes('manuscript') || filename.toLowerCase().endsWith('.docx')) return 'Copyedited Manuscript'
    return 'Copyedit Package'
  }
  if (normalized.includes('proofread') || normalized.includes('proof package') || normalized.includes('proofreading')) {
    if (normalized.includes('manuscript') || filename.toLowerCase().endsWith('.docx')) return 'Proofread Manuscript'
    return 'Proofreading Package'
  }
  if (normalized.includes('interior') || normalized.includes('layout')) return 'Interior Layout Package'
  if (normalized.includes('cover')) return 'Cover Package'
  if (normalized.includes('working manuscript')) return 'Editorial Working Manuscript'
  if (normalized.includes('line edited') || normalized.includes('line-edit')) return 'Line Editing Package'
  if (normalized.includes('revision blueprint')) return 'Revision Blueprint'
  if (normalized.includes('developmental review package') || normalized.includes('author delivery pdf')) {
    return 'Developmental Review Summary'
  }

  return typeLabel || 'Editorial Package'
}

function resolveAuthorActionEvidence({
  summaryStatus,
  publishedToWorkspaceOn,
  sourceArtifactId,
  deliverableArtifactId,
  gateStatus,
  authorDecision,
  authorDecisionOn,
  notificationEvidence,
  nextStageAuthorized,
}: {
  summaryStatus?: string
  publishedToWorkspaceOn?: string
  sourceArtifactId?: string
  deliverableArtifactId?: string
  gateStatus?: string
  authorDecision?: string
  authorDecisionOn?: string
  notificationEvidence?: string
  nextStageAuthorized?: boolean
}): AuthorActionEvidence {
  const normalizedSummaryStatus = normalizeWorkspaceText(summaryStatus)
  const normalizedGateStatus = normalizeWorkspaceText(gateStatus)
  const normalizedAuthorDecision = normalizeWorkspaceText(authorDecision)
  const artifactExists = Boolean(sourceArtifactId || deliverableArtifactId)
  const artifactReleased =
    normalizedSummaryStatus === 'published to workspace' && Boolean(publishedToWorkspaceOn)
  const notificationCompleted = hasAuthorNotificationEvidence(notificationEvidence || '')
  const authorResponded =
    Boolean(authorDecisionOn) ||
    Boolean(normalizedAuthorDecision) ||
    normalizedGateStatus === 'approved' ||
    normalizedGateStatus === 'returned for revision' ||
    normalizedGateStatus === 'cancelled' ||
    nextStageAuthorized === true
  const authorDecisionOutstanding =
    artifactExists &&
    artifactReleased &&
    notificationCompleted &&
    !authorResponded &&
    (normalizedGateStatus === 'ready for author review' ||
      normalizedGateStatus === 'awaiting author response')

  return {
    releasedArtifactExists: artifactExists,
    releasePublished: artifactReleased,
    authorDecisionOutstanding,
    authorDecision: authorDecision?.trim() || undefined,
    gateStatus: gateStatus?.trim() || undefined,
    notificationCompleted,
    authorResponseReceived: authorResponded,
    nextStageAuthorized: nextStageAuthorized === true,
    authorActionAvailable: artifactExists && artifactReleased && authorDecisionOutstanding,
  }
}
