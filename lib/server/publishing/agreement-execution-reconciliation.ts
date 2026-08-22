import { stage05OnboardingRequirementLabels } from './stage05-onboarding-readiness'

const EXECUTION_STATUS = {
  SUCCESS: 835500001,
  FAILED: 835500002,
} as const

const BAND_LEVEL = {
  BAND_1: 835500000,
} as const

const CONTRACT_STATUS = {
  ACTIVE: 196650002,
} as const

const CONTRACT_TYPE = {
  AUTHOR_AGREEMENT: 196650000,
} as const

const ESIGN_PROVIDER = {
  ADOBE_SIGN: 835500000,
  OTHER: 835500003,
} as const

const OPPORTUNITY_CONTRACT_STATUS = {
  SIGNED: 196650003,
} as const

const FIRST_PAYMENT_STATUS = {
  PAID_CONFIRMED: 835510002,
} as const

const AUTHOR_PORTAL_STATUS = {
  ACTIVE: 835512003,
} as const

type DataverseConfig = {
  apiBase: string
  resourceUrl: string
  tenantId: string
  clientId: string
  clientSecret: string
}

type DataverseRow = Record<string, any>

export type PublishingAgreementExecutionInput = {
  opportunityId: string
  authorId: string
  titleId?: string | null
  title?: string | null
  artifactPath: string
  checksum: string
  agreementType?: string | null
  packageCode?: string | null
  packageFee?: number | null
  paymentPolicy?: string | null
  executedOn: string
  authorSignedOn?: string | null
  publisherSignedOn?: string | null
  provider?: 'ADOBE_SIGN' | 'OTHER' | string | null
  providerTransactionId?: string | null
  source?: string | null
}

export async function processPublishingAgreementExecuted(input: PublishingAgreementExecutionInput) {
  const normalized = normalizeAgreementInput(input)
  if (!normalized.ok) return normalized

  const config = getDataverseConfig()
  if (!config) return blocked('DATAVERSE_CONFIG_MISSING')
  const token = await getDataverseToken(config)

  const opportunity = await getOpportunity(config, token, normalized.opportunityId)
  if (!opportunity) return blocked('OPPORTUNITY_NOT_FOUND', { opportunityId: normalized.opportunityId })

  const contactId = normalizeString(opportunity._parentcontactid_value) || normalizeString(opportunity._customerid_value) || normalized.authorId
  if (contactId !== normalized.authorId) {
    return blocked('AUTHOR_OPPORTUNITY_MISMATCH', {
      opportunityId: normalized.opportunityId,
    })
  }

  const contract = await ensureExecutedContract(config, token, normalized, opportunity)
  await bindContractToTitleIfAvailable(config, token, normalized.titleId, contract.contractId)
  await patchContactAuthorFlag(config, token, contactId)

  const agreementLog = await logAgreementExecutedOnce(config, token, normalized, contract.contractId)
  const joined = await reconcileJoinedFamily(config, token, normalized, opportunity, contract.contractId)
  const referral = await reconcileReferral(config, token, normalized, opportunity)
  const notification = await sendJoinedFamilyNotificationOnce(config, token, normalized, opportunity, joined)

  return {
    ok: true,
    code: 'PUBLISHING_AGREEMENT_EXECUTED_RECONCILED',
    opportunityId: normalized.opportunityId,
    authorId: normalized.authorId,
    titleId: normalized.titleId || null,
    title: titleName(opportunity, normalized),
    contractId: contract.contractId,
    contractCreated: contract.created,
    agreementLogId: agreementLog.jm1_executionlogid || null,
    joinedTheFamily: joined.joinedTheFamily,
    joinedTheFamilyOn: joined.joinedTheFamilyOn,
    joinedFamilyLogId: joined.joinedFamilyLogId,
    workspace: joined.workspace,
    onboarding: joined.onboarding,
    referral,
    notification,
    liveActions: {
      createsOrRepairsStructuredAgreementRecord: contract.created || contract.repaired,
      setsJoinedTheFamily: joined.joinedTheFamily,
      activatesAuthorRelationship: true,
      activatesTitleRelationship: Boolean(normalized.titleId),
      startsWorkspaceProvisioning: joined.workspace.provisioningLogged,
      unlocksWorkspace: joined.workspace.active,
      initiatesOnboarding: joined.onboarding.initiated,
      sendsInternalJoinedFamilyNotification: notification.accepted === true,
      sendsAuthorCommunication: false,
      chargesAuthor: false,
      repricesAuthor: false,
      changesPaymentPolicy: false,
      recreatesPaymentSchedule: false,
      clearsFinalDeliveryPaymentGate: false,
      postsBusinessCentral: false,
    },
  }
}

function normalizeAgreementInput(input: PublishingAgreementExecutionInput) {
  const opportunityId = normalizeString(input.opportunityId)
  const authorId = normalizeString(input.authorId)
  const titleId = normalizeString(input.titleId)
  const checksum = normalizeString(input.checksum).toLowerCase()
  const artifactPath = normalizeString(input.artifactPath)
  const executedOn = normalizeIso(input.executedOn)
  if (!isGuid(opportunityId)) return blocked('OPPORTUNITY_ID_INVALID')
  if (!isGuid(authorId)) return blocked('AUTHOR_ID_INVALID')
  if (titleId && !isGuid(titleId)) return blocked('TITLE_ID_INVALID')
  if (!artifactPath) return blocked('AGREEMENT_ARTIFACT_PATH_MISSING')
  if (!/^[a-f0-9]{64}$/.test(checksum)) return blocked('AGREEMENT_CHECKSUM_INVALID')
  if (!executedOn) return blocked('AGREEMENT_EXECUTED_ON_INVALID')

  return {
    ok: true as const,
    opportunityId,
    authorId,
    titleId: titleId || null,
    title: normalizeString(input.title) || null,
    artifactPath,
    checksum,
    agreementType: normalizeString(input.agreementType) || 'JMP Publishing Agreement v1.3.1 + Package Addendum',
    packageCode: normalizeString(input.packageCode),
    packageFee: Number.isFinite(Number(input.packageFee)) ? Number(input.packageFee) : null,
    paymentPolicy: normalizeString(input.paymentPolicy) || 'JMP_MULTIPAY_TRANSACTION_FEE_4_PERCENT_v1.0',
    executedOn,
    authorSignedOn: normalizeIso(input.authorSignedOn) || null,
    publisherSignedOn: normalizeIso(input.publisherSignedOn) || null,
    provider: normalizeString(input.provider) || 'ADOBE_SIGN',
    providerTransactionId: normalizeString(input.providerTransactionId) || `ADOBE-SIGNED-PDF-${checksum.slice(0, 16)}`,
    source: normalizeString(input.source) || 'FOUNDER_SUPPLIED_EXECUTED_PDF',
  }
}

async function ensureExecutedContract(
  config: DataverseConfig,
  token: string,
  input: ReturnType<typeof normalizeAgreementInput> & { ok: true },
  opportunity: DataverseRow,
) {
  const existing = await findContract(config, token, input)
  const payload = contractPayload(input, opportunity)
  if (existing) {
    await dataverseRequest(config, token, `jm1pub_contracts(${existing.jm1pub_contractid})`, {
      method: 'PATCH',
      headers: { Prefer: 'return=minimal' },
      body: payload,
    })
    return { contractId: existing.jm1pub_contractid, created: false, repaired: true }
  }

  const created = await dataverseRequest(config, token, 'jm1pub_contracts', {
    method: 'POST',
    headers: { Prefer: 'return=representation' },
    body: payload,
  })
  return { contractId: created.jm1pub_contractid, created: true, repaired: false }
}

function contractPayload(input: ReturnType<typeof normalizeAgreementInput> & { ok: true }, opportunity: DataverseRow) {
  return removeNullish({
    jm1pub_contractname: `Executed Publishing Agreement - ${authorName(opportunity)} - ${titleName(opportunity, input)} - 2026-08-19`,
    jm1pub_contracttype: CONTRACT_TYPE.AUTHOR_AGREEMENT,
    jm1pub_status: CONTRACT_STATUS.ACTIVE,
    jm1pub_docurl: compactArtifactReference(input),
    jm1pub_esignprovider: providerChoice(input.provider),
    jm1pub_agreementsenton: input.authorSignedOn || input.executedOn,
    jm1pub_signeddate: input.executedOn,
    jm1pub_provideragreementid: input.providerTransactionId,
    jm1pub_providerstatus: 'ADOBE_SIGNED_COMPLETED',
    jm1pub_templateversionreference: input.agreementType,
    jm1pub_selectedpackagecode: input.packageCode,
    jm1pub_standardpackageprice: input.packageFee,
    jm1pub_commissioningtransactionamount: centsFromDataverseMoney(opportunity.jm1_m6selectedpaymentamount) / 100 || undefined,
    jm1pub_paymentpath: input.paymentPolicy,
    'jm1pub_Opportunity@odata.bind': `/opportunities(${input.opportunityId})`,
    'new_Author@odata.bind': `/contacts(${input.authorId})`,
  })
}

async function findContract(config: DataverseConfig, token: string, input: ReturnType<typeof normalizeAgreementInput> & { ok: true }) {
  const filters = [
    `_jm1pub_opportunity_value eq ${input.opportunityId}`,
    `jm1pub_provideragreementid eq '${encodeODataString(input.providerTransactionId)}'`,
    `jm1pub_docurl eq '${encodeODataString(compactArtifactReference(input))}'`,
  ].join(' or ')
  const result = await dataverseRequest(
    config,
    token,
    `jm1pub_contracts?$select=jm1pub_contractid,jm1pub_contractname,jm1pub_provideragreementid,jm1pub_docurl,_jm1pub_opportunity_value,_new_author_value&$filter=${encodeURIComponent(filters)}&$orderby=modifiedon desc&$top=1`,
  )
  return Array.isArray(result.value) && result.value.length > 0 ? result.value[0] : null
}

async function reconcileJoinedFamily(
  config: DataverseConfig,
  token: string,
  input: ReturnType<typeof normalizeAgreementInput> & { ok: true },
  opportunity: DataverseRow,
  contractId: string,
) {
  const firstPaymentReceivedOn = normalizeIso(opportunity.jm1_m6firstpaymentconfirmedon)
  const paymentConfirmed = opportunity.jm1_m6firstpaymentstatus === FIRST_PAYMENT_STATUS.PAID_CONFIRMED && Boolean(firstPaymentReceivedOn)
  if (!paymentConfirmed) {
    return {
      joinedTheFamily: false,
      joinedTheFamilyOn: null,
      joinedFamilyLogId: null,
      workspace: { active: false, provisioningLogged: false },
      onboarding: { initiated: false, complete: false, remainingRequiredItems: onboardingRemainingItems() },
    }
  }

  const joinedTheFamilyOn = firstPaymentReceivedOn || input.executedOn
  await dataverseRequest(config, token, `opportunities(${input.opportunityId})`, {
    method: 'PATCH',
    headers: { Prefer: 'return=minimal' },
    body: {
      jm1pub_contractstatus: OPPORTUNITY_CONTRACT_STATUS.SIGNED,
      jm1_m6agreementpreparationstatus: 'AGREEMENT_SIGNED_ACTIVE',
      jm1_m6authorportalstatus: AUTHOR_PORTAL_STATUS.ACTIVE,
      jm1_m6onboardingstatus: 'ONBOARDING_INITIATED_INCOMPLETE',
    },
  })

  const joinName = `JOINED-THE-FAMILY-${input.opportunityId}`
  const existingJoin = await findExecutionLog(config, token, joinName, 'JOINED_THE_FAMILY')
  let joinedFamilyLogId = existingJoin?.jm1_executionlogid || null
  if (!existingJoin) {
    const created = await postExecutionLog(config, token, {
      name: joinName,
      actionType: 'JOINED_THE_FAMILY',
      description: [
        `Joined the Family confirmed for ${authorName(opportunity)} / ${titleName(opportunity, input)}.`,
        `Agreement executed on ${input.executedOn}; initial payment received on ${firstPaymentReceivedOn}.`,
        'Business event time is the second qualifying condition, not the later reconciliation timestamp.',
        `Package ${input.packageCode || normalizeString(opportunity.jm1_m6authorselectedpackagecode) || 'not provided'}; payment policy ${input.paymentPolicy}.`,
        'No additional charge, repricing, payment schedule recreation, Business Central posting, final-delivery clearance, or author-facing communication occurred.',
      ].join(' '),
      sourceEntity: 'opportunity',
      sourceRecordId: input.opportunityId,
      completedAt: joinedTheFamilyOn,
    })
    joinedFamilyLogId = created.jm1_executionlogid || null
  }

  const provisioningLogged = await logOnce(config, token, {
    name: `WORKSPACE-PROVISIONING-${input.opportunityId}`,
    actionType: 'WORKSPACE_PROVISIONING',
    description:
      'Author Workspace provisioning/recovery initiated from Joined the Family reconciliation using the existing opportunity author-portal status path. No second workspace architecture was created.',
    sourceEntity: 'opportunity',
    sourceRecordId: input.opportunityId,
    completedAt: joinedTheFamilyOn,
  })
  await logOnce(config, token, {
    name: `WORKSPACE-ACTIVE-${input.opportunityId}`,
    actionType: 'WORKSPACE_ACTIVE',
    description:
      'Author Workspace active/unlocked because the executed agreement is bound and the required initial payment is confirmed. No production-stage progression or author communication occurred.',
    sourceEntity: 'opportunity',
    sourceRecordId: input.opportunityId,
    completedAt: joinedTheFamilyOn,
  })
  await logOnce(config, token, {
    name: `AUTHOR-ONBOARDING-INITIATED-${input.opportunityId}`,
    actionType: 'AUTHOR_ONBOARDING_INITIATED',
    description:
      'Structured onboarding initiated/recovered from trusted intake, Contact, agreement, package, payment, and title/project evidence. Onboarding is not complete; remaining required items must be collected in the Author Workspace.',
    sourceEntity: 'opportunity',
    sourceRecordId: input.opportunityId,
    completedAt: joinedTheFamilyOn,
  })
  await logOnce(config, token, {
    name: `COMMERCIAL-PRODUCTION-AUTHORIZED-${input.opportunityId}`,
    actionType: 'COMMERCIAL_PRODUCTION_AUTHORIZED',
    description:
      'Commercial production authorization is true because the signed package addendum states production begins upon first payment and the first payment is confirmed. Operational production readiness remains subject to onboarding prerequisites. Final delivery payment gate remains closed.',
    sourceEntity: 'opportunity',
    sourceRecordId: input.opportunityId,
    completedAt: joinedTheFamilyOn,
  })

  return {
    joinedTheFamily: true,
    joinedTheFamilyOn,
    joinedFamilyLogId,
    workspace: { active: true, provisioningLogged: Boolean(provisioningLogged), status: 'ACTIVE' },
    onboarding: { initiated: true, complete: false, remainingRequiredItems: onboardingRemainingItems() },
  }
}

async function reconcileReferral(
  config: DataverseConfig,
  token: string,
  input: ReturnType<typeof normalizeAgreementInput> & { ok: true },
  opportunity: DataverseRow,
) {
  const logs = await dataverseRequest(
    config,
    token,
    `jm1_executionlogs?$select=jm1_executionlogid,jm1_name,jm1_actiontype,jm1_actiondescription&$filter=${encodeURIComponent(`jm1_sourcerecordid eq '${input.opportunityId}' and (contains(jm1_actiondescription,'referr') or contains(jm1_name,'REFERR'))`)}&$top=5`,
  )
  const hasReferrer = Array.isArray(logs.value) && logs.value.some((row: DataverseRow) => {
    const text = `${row.jm1_name} ${row.jm1_actiontype} ${row.jm1_actiondescription}`
    return /REFERRAL_ATTRIBUTION|REFERRED_BY|REFERRING_AUTHOR|referrer:/i.test(text)
  })
  if (!hasReferrer) {
    const created = await logOnce(config, token, {
      name: `NO-QUALIFYING-REFERRER-${input.opportunityId}`,
      actionType: 'NO_QUALIFYING_REFERRER',
      description: `No qualifying referrer was found for ${authorName(opportunity)} / ${titleName(opportunity, input)} during Joined the Family reconciliation. No referral credit was created.`,
      sourceEntity: 'opportunity',
      sourceRecordId: input.opportunityId,
      completedAt: new Date().toISOString(),
    })
    return { referrer: null, qualification: 'NO QUALIFYING REFERRER', creditEvent: null, evidenceLogId: created?.jm1_executionlogid || null }
  }
  return { referrer: 'FOUND_IN_EXISTING_EVIDENCE', qualification: 'REQUIRES_SEPARATE_REFERRAL_LEDGER_PROCESSING', creditEvent: null }
}

async function sendJoinedFamilyNotificationOnce(
  config: DataverseConfig,
  token: string,
  input: ReturnType<typeof normalizeAgreementInput> & { ok: true },
  opportunity: DataverseRow,
  joined: Awaited<ReturnType<typeof reconcileJoinedFamily>>,
) {
  const sentName = `PUBLISHING_JOINED_FAMILY_NOTIFICATION_SENT-${input.opportunityId}`
  const existing = await findExecutionLog(config, token, sentName, 'PUBLISHING_JOINED_FAMILY_NOTIFICATION_SENT')
  if (existing) return { accepted: false, skipped: true, code: 'JOINED_FAMILY_NOTIFICATION_ALREADY_SENT', recipient: 'publishing@jmerrill.one' }
  if (!joined.joinedTheFamily || !joined.joinedTheFamilyOn) return { accepted: false, code: 'JOINED_THE_FAMILY_NOT_SET' }

  const notification = await sendJoinedFamilyInternalNotification(input, opportunity, joined)
  await postExecutionLog(config, token, {
    name: sentName,
    actionType: notification.accepted ? 'PUBLISHING_JOINED_FAMILY_NOTIFICATION_SENT' : 'PUBLISHING_JOINED_FAMILY_NOTIFICATION_FAILED',
    description: [
      `Internal Joined the Family notification ${notification.accepted ? 'sent' : 'failed'} for ${authorName(opportunity)} / ${titleName(opportunity, input)}.`,
      `Notification code ${notification.code || 'unknown'}.`,
      'No author-facing communication was sent.',
    ].join(' '),
    sourceEntity: 'opportunity',
    sourceRecordId: input.opportunityId,
    status: notification.accepted ? 'success' : 'failed',
  })
  return notification
}

async function sendJoinedFamilyInternalNotification(
  input: ReturnType<typeof normalizeAgreementInput> & { ok: true },
  opportunity: DataverseRow,
  joined: Awaited<ReturnType<typeof reconcileJoinedFamily>>,
) {
  const relayUrl = normalizeString(process.env.JM1_JOIN_INTERNAL_NOTIFICATION_RELAY_URL || process.env.JM1_INTERNAL_NOTIFICATION_RELAY_URL)
  const relayKey = normalizeString(process.env.JM1_JOIN_INTERNAL_NOTIFICATION_RELAY_KEY || process.env.JM1_INTERNAL_NOTIFICATION_RELAY_KEY)
  if (!relayUrl || !relayKey) return { accepted: false, code: 'JOINED_FAMILY_NOTIFICATION_RELAY_CONFIG_MISSING' }
  const installmentCount = Number(opportunity.jm1_m6selectedinstallmentcount || 0)
  const paymentsRemaining = Math.max(0, installmentCount - 1)
  const response = await fetch(`${relayUrl.replace(/\/$/, '')}/api/send-publishing-joined-family-internal-notification`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-jm1-relay-key': relayKey,
    },
    body: JSON.stringify({
      notificationType: 'PUBLISHING_JOINED_THE_FAMILY',
      recipient: 'publishing@jmerrill.one',
      authorName: authorName(opportunity),
      projectTitle: titleName(opportunity, input),
      opportunityId: input.opportunityId,
      packageCode: input.packageCode || normalizeString(opportunity.jm1_m6authorselectedpackagecode) || normalizeString(opportunity.jm1pub_packagerecommended),
      paymentOption: normalizeString(opportunity.jm1_m6selectedpaymentoption),
      paymentPolicy: input.paymentPolicy,
      paymentStatus: `1 of ${installmentCount || 8} paid`,
      paymentsRemaining,
      agreementExecutedOn: input.executedOn,
      initialPaymentReceivedOn: normalizeIso(opportunity.jm1_m6firstpaymentconfirmedon),
      joinedTheFamilyOn: joined.joinedTheFamilyOn,
      workspaceStatus: joined.workspace.active ? 'Active' : 'Provisioning',
      onboardingStatus: 'Started; required details remain incomplete',
      productionAuthorization: 'Commercial production authorization confirmed',
      finalDeliveryGate: 'Closed until remaining payment obligation is complete',
      nextAction: 'Complete onboarding readiness review and proceed only when operational prerequisites are satisfied.',
      noAuthorCommunication: true,
    }),
  })
  const result = await response.json().catch(() => ({}))
  if (!response.ok) return { accepted: false, code: result?.reason || result?.code || `JOINED_FAMILY_NOTIFICATION_RELAY_FAILED_${response.status}` }
  return {
    accepted: result.accepted === true,
    code: result.deliveryStatus || 'JOINED_FAMILY_INTERNAL_NOTIFICATION_SENT',
    providerMessageId: result.providerMessageId || null,
    recipient: result.recipient || 'publishing@jmerrill.one',
  }
}

async function logAgreementExecutedOnce(
  config: DataverseConfig,
  token: string,
  input: ReturnType<typeof normalizeAgreementInput> & { ok: true },
  contractId: string,
) {
  const name = `PUBLISHING-AGREEMENT-EXECUTED-${input.opportunityId}`
  const existing = await findExecutionLog(config, token, name, 'PUBLISHING_AGREEMENT_EXECUTED')
  if (existing) return existing
  return postExecutionLog(config, token, {
    name,
    actionType: 'PUBLISHING_AGREEMENT_EXECUTED',
    description: [
      'Founder-supplied executed agreement reconciled into structured contract authority.',
      `Artifact ${input.artifactPath}; checksum ${input.checksum}; provider ${input.provider}; provider transaction ${input.providerTransactionId}.`,
      `Author signed ${input.authorSignedOn || 'not provided'}; publisher signed ${input.publisherSignedOn || 'not provided'}; completed ${input.executedOn}.`,
      `Package ${input.packageCode || 'not provided'}; payment policy ${input.paymentPolicy}.`,
      'The signed PDF was not regenerated or replaced.',
    ].join(' '),
    sourceEntity: 'jm1pub_contract',
    sourceRecordId: contractId,
    completedAt: input.executedOn,
  })
}

async function bindContractToTitleIfAvailable(config: DataverseConfig, token: string, titleId: string | null, contractId: string) {
  if (!titleId) return
  await dataverseRequest(config, token, `jm1pub_titles(${titleId})`, {
    method: 'PATCH',
    headers: { Prefer: 'return=minimal' },
    body: {
      'jm1pub_Contract@odata.bind': `/jm1pub_contracts(${contractId})`,
      'jm1_PrimaryAuthor@odata.bind': undefined,
    },
  })
}

async function patchContactAuthorFlag(config: DataverseConfig, token: string, contactId: string) {
  await dataverseRequest(config, token, `contacts(${contactId})`, {
    method: 'PATCH',
    headers: { Prefer: 'return=minimal' },
    body: { jm1pub_isauthor: true },
  })
}

async function getOpportunity(config: DataverseConfig, token: string, opportunityId: string) {
  return dataverseRequest(
    config,
    token,
    `opportunities(${opportunityId})?$select=opportunityid,name,jm1pub_projecttitle,jm1pub_packagerecommended,jm1_m6authorselectedpackagecode,jm1_m6selectedpaymentamount,jm1_m6selectedpaymenttotal,jm1_m6selectedinstallmentcount,jm1_m6selectedpaymentoption,jm1pub_contractstatus,jm1_m6agreementpreparationstatus,jm1_m6authorportalstatus,jm1_m6onboardingstatus,jm1_m6firstpaymentstatus,jm1_m6firstpaymentconfirmedon,_parentcontactid_value,_customerid_value`,
  )
}

function getDataverseConfig(): DataverseConfig | null {
  const apiBase =
    process.env.DATAVERSE_WEB_API_BASE_URL ||
    (process.env.DATAVERSE_ENVIRONMENT_URL
      ? `${process.env.DATAVERSE_ENVIRONMENT_URL.replace(/\/$/, '')}/api/data/v9.2`
      : '')
  const resourceUrl = process.env.DATAVERSE_RESOURCE_URL || process.env.DATAVERSE_ENVIRONMENT_URL || ''
  const tenantId = process.env.DATAVERSE_TENANT_ID || ''
  const clientId = process.env.DATAVERSE_CLIENT_ID || ''
  const clientSecret = process.env.DATAVERSE_CLIENT_SECRET || ''
  if (!apiBase || !resourceUrl || !tenantId || !clientId || !clientSecret) return null
  return {
    apiBase: apiBase.replace(/\/$/, ''),
    resourceUrl: resourceUrl.replace(/\/$/, ''),
    tenantId,
    clientId,
    clientSecret,
  }
}

async function getDataverseToken(config: DataverseConfig) {
  const response = await fetch(`https://login.microsoftonline.com/${config.tenantId}/oauth2/v2.0/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      scope: `${config.resourceUrl}/.default`,
      grant_type: 'client_credentials',
    }),
  })
  if (!response.ok) throw new Error(`dataverse_token_failed:${response.status}`)
  const body = await response.json()
  if (!body.access_token) throw new Error('dataverse_token_missing')
  return body.access_token as string
}

async function dataverseRequest(config: DataverseConfig, token: string, path: string, options: {
  method?: string
  headers?: Record<string, string>
  body?: Record<string, unknown>
} = {}) {
  const response = await fetch(`${config.apiBase}/${path.replace(/^\//, '')}`, {
    method: options.method || 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'OData-MaxVersion': '4.0',
      'OData-Version': '4.0',
      ...(options.headers || {}),
    },
    body: options.body ? JSON.stringify(removeNullish(options.body)) : undefined,
  })
  if (response.status === 204) return {}
  const body = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw Object.assign(new Error(body?.error?.message || `dataverse_request_failed:${response.status}`), {
      safeCode: body?.error?.code || 'DATAVERSE_REQUEST_FAILED',
      status: response.status,
    })
  }
  return body
}

async function findExecutionLog(config: DataverseConfig, token: string, name: string, actionType: string) {
  const filter = `jm1_name eq '${encodeODataString(name)}' and jm1_actiontype eq '${encodeODataString(actionType)}'`
  const result = await dataverseRequest(
    config,
    token,
    `jm1_executionlogs?$select=jm1_executionlogid,jm1_name,jm1_actiontype,createdon&$filter=${encodeURIComponent(filter)}&$top=1`,
  )
  return Array.isArray(result.value) && result.value.length > 0 ? result.value[0] : null
}

async function logOnce(config: DataverseConfig, token: string, input: Parameters<typeof postExecutionLog>[2]) {
  const existing = await findExecutionLog(config, token, input.name, input.actionType)
  if (existing) return null
  return postExecutionLog(config, token, input)
}

async function postExecutionLog(config: DataverseConfig, token: string, input: {
  name: string
  actionType: string
  description: string
  sourceEntity: string
  sourceRecordId: string
  completedAt?: string
  status?: 'success' | 'failed'
}) {
  const completedAt = input.completedAt || new Date().toISOString()
  return dataverseRequest(config, token, 'jm1_executionlogs', {
    method: 'POST',
    headers: { Prefer: 'return=representation' },
    body: {
      jm1_name: input.name.slice(0, 200),
      jm1_actiondescription: safeDetail(input.description),
      jm1_actiontype: input.actionType,
      jm1_agentname: 'jmerrill.pub',
      jm1_agentmodel: 'publishing-agreement-execution-reconciliation',
      jm1_bandlevel: BAND_LEVEL.BAND_1,
      jm1_executionstatus: input.status === 'failed' ? EXECUTION_STATUS.FAILED : EXECUTION_STATUS.SUCCESS,
      jm1_startedon: completedAt,
      jm1_completedon: completedAt,
      jm1_sourceentity: input.sourceEntity,
      jm1_sourcerecordid: input.sourceRecordId,
    },
  })
}

function providerChoice(provider: string) {
  return provider.toUpperCase().includes('ADOBE') ? ESIGN_PROVIDER.ADOBE_SIGN : ESIGN_PROVIDER.OTHER
}

function compactArtifactReference(input: { artifactPath: string; checksum: string }) {
  const fileName = input.artifactPath.split('/').filter(Boolean).pop() || 'signed-agreement.pdf'
  return `${fileName} sha256:${input.checksum.slice(0, 16)}`.slice(0, 100)
}

function onboardingRemainingItems() {
  return [...stage05OnboardingRequirementLabels]
}

function encodeODataString(value: string) {
  return normalizeString(value).replace(/'/g, "''")
}

function blocked(reason: string, extra: Record<string, unknown> = {}) {
  return { ok: false as const, code: 'PUBLISHING_AGREEMENT_RECONCILIATION_BLOCKED', reason, ...extra }
}

function normalizeString(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

function normalizeIso(value: unknown) {
  const text = normalizeString(value)
  if (!text) return ''
  const date = new Date(text)
  return Number.isNaN(date.getTime()) ? '' : date.toISOString()
}

function isGuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
}

function centsFromDataverseMoney(value: unknown) {
  const number = Number(value)
  return Number.isFinite(number) && number > 0 ? Math.round(number * 100) : 0
}

function authorName(opportunity: DataverseRow) {
  return normalizeString(opportunity['_parentcontactid_value@OData.Community.Display.V1.FormattedValue'])
    || normalizeString(opportunity['_customerid_value@OData.Community.Display.V1.FormattedValue'])
    || 'Atta Boateng'
}

function titleName(opportunity: DataverseRow, input: { title?: string | null }) {
  return normalizeString(input.title) || normalizeString(opportunity.jm1pub_projecttitle) || normalizeString(opportunity.name) || 'Untitled'
}

function removeNullish(input: Record<string, unknown>) {
  return Object.fromEntries(Object.entries(input).filter(([, value]) => value !== null && value !== undefined && value !== ''))
}

function safeDetail(value: string) {
  return value
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[email-redacted]')
    .replace(/https:\/\/[^\s"']+/g, '[url-redacted]')
    .replace(/\b(acct|ch|cs|cus|evt|in|plink|price|prod|pi|py|sub|sub_sched)_[A-Za-z0-9_]+\b/g, '[stripe-id]')
    .slice(0, 1000)
}
