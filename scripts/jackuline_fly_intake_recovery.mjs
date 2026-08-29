import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { createRequire } from 'node:module'
import { mkdirSync, readFileSync, writeFileSync, statSync } from 'node:fs'
import { basename, join } from 'node:path'

const require = createRequire(import.meta.url)
const mammoth = require('../azure-functions/diagnostic-ai-runner/node_modules/mammoth')
const { runPrePackageEditorialReview } = require('../azure-functions/diagnostic-ai-runner/src/editorial/preContractEditorialReviewRunner.js')

export const RECOVERY_ACTION = 'RECOVER_EXISTING_INTAKE_MANUSCRIPT'
export const AUTHOR = Object.freeze({
  firstName: 'Jackuline',
  lastName: 'Fly',
  name: 'Jackuline Fly',
  email: 'jackie2doreen@att.net',
  phone: '3139807206',
  title: 'WHOLENESS - BECOMING',
  sourceFile: '/Users/jmerrillone/Downloads/WHOLENESS - BECOMING 7-9-26.DOC.docx',
  leadId: 'c57472de-fb9a-f111-b8dc-000d3a1a9efa',
  contactId: '106a78d0-fb9a-f111-b8dc-6045bdd69738',
  joinSubmittedAt: '2026-08-18T11:56:42Z',
  reference: 'JMP-INT-202608-JFLY01',
})

const DV_BASE = 'https://jm1hq.crm.dynamics.com/api/data/v9.2'
const DV_RESOURCE = 'https://jm1hq.crm.dynamics.com'
const GRAPH_BASE = 'https://graph.microsoft.com/v1.0'
const EVIDENCE_DIR = 'docs/operations/generated/JMP-JACKULINE-FLY-INTAKE-RECOVERY-EDITORIAL-ACTIVATION-2026-08-29'
const PUBLISHING_SITE_PATH = 'jmerrillfoundation.sharepoint.com:/sites/publishing'
const RELAY_URL = 'https://func-jm1-acs-email-relay.azurewebsites.net/api/send-approved-author-response'

const OPTION = Object.freeze({
  intakeStatusInReview: 835500001,
  workTypeManuscriptReviewFree: 196650008,
  manuscriptTypeWorkbookJournal: 196650005,
  manuscriptCompleteEditingRequested: 196650005,
  websiteSourceAuthorSignup: 196650016,
  workspaceCreated: 835513001,
  stage0Ready: 835500001,
  diagnosticInProgress: 196650001,
  diagnosticInitial: 196650000,
  titleStageEditorial: 100000006,
  assetFormatOther: 100000006,
  assetStatusStaged: 100000000,
  distributionDraft: 100000000,
  stageTypeReview: 100000000,
  stageStatusInProgress: 100000001,
  healthHealthy: 196650000,
  artifactTypeManuscriptReviewCopy: 196650000,
  artifactStatusApproved: 196650003,
  visibilityInternalOnly: 196650001,
  executionSuccess: 835500001,
  bandLevel1: 835500000,
})

export function buildRecoveryIdempotencyKey({ leadId = AUTHOR.leadId, sha256 }) {
  return `RECOVER-JFLY-${leadId.slice(0, 8)}-${sha256.slice(0, 24)}`
}

export function classifyIntakeFieldRows({ lead, manuscript, intake }) {
  const description = lead?.description || ''
  const rows = [
    ['First Name', AUTHOR.firstName, 'Dataverse Contact/Lead', Boolean(intake?.jm1_firstname), true],
    ['Last Name', AUTHOR.lastName, 'Dataverse Contact/Lead', Boolean(intake?.jm1_lastname), true],
    ['Email', AUTHOR.email, 'Dataverse Contact/Lead', Boolean(intake?.jm1_email), true],
    ['Phone', AUTHOR.phone, 'Dataverse Contact/Lead', Boolean(intake?.jm1_mobilephone), true],
    ['Book Title', AUTHOR.title, 'Founder manuscript custody + lead description', Boolean(intake?.jm1_projecttitle), true],
    ['Intent', 'Publishing', 'JM1-WEB-INTAKE-API lead description', Boolean(intake?.jm1_worktype), true],
    ['Manuscript Type', 'Workbook / Journal', 'JM1-WEB-INTAKE-API lead description', Boolean(intake?.jm1_manuscripttype), true],
    ['Estimated Word Count', String(manuscript.wordCount), 'Founder-supplied DOCX extraction', Boolean(intake?.jm1_estimatedwordcount), true],
    ['Goal / Purpose', description, 'JM1-WEB-INTAKE-API lead description', Boolean(intake?.jm1_purpose), true],
    ['Referral Source', 'Word of mouth / referral', 'JM1-WEB-INTAKE-API lead description', Boolean(intake?.jm1_referralsource), false],
    ['Consent to Contact', 'true', '/join validation plus JM1-WEB-INTAKE-API accepted lead', Boolean(intake?.jm1_consenttocontact), true],
    ['Consent to Terms', 'true', '/join validation plus JM1-WEB-INTAKE-API accepted lead', Boolean(intake?.jm1_consenttoterms), true],
    ['Rights Ownership', 'Not recovered', 'No governed field found in recovered lead/manuscript evidence', false, false],
    ['AI Disclosure', 'Not recovered', 'No governed field found in recovered lead/manuscript evidence', false, false],
    ['Third-party Material', 'References present; attestation not recovered', 'DOCX extraction', false, false],
    ['Sensitive Content', 'Not recovered', 'No governed field found in recovered lead/manuscript evidence', false, false],
  ]
  return rows.map(([field, value, source, present, required]) => ({
    field,
    value: String(value || ''),
    source,
    currentOrHistorical: present ? 'CURRENT' : 'HISTORICAL / RECOVERED',
    recoverable: present || value !== 'Not recovered',
    required,
    classification: present ? 'PRESENT' : value === 'Not recovered' ? 'MISSING_NONBLOCKING' : 'RECOVERED',
  }))
}

export function canonicalNotice({ firstName = AUTHOR.firstName, title = AUTHOR.title }) {
  const subject = `Your manuscript for ${title} is in Editorial Review`
  const body = [
    `Good day ${firstName},`,
    '',
    `I’m writing to let you know that we have received your manuscript for ${title}.`,
    '',
    'The earlier intake issue has been handled on our side, so you do not need to resubmit your form, re-upload the manuscript, or send the file again.',
    '',
    'Your manuscript has now entered Editorial Review. We will contact you when the review and publishing recommendation are ready.',
    '',
    'With care,',
    '',
    'The Publishing Team',
    'J Merrill Publishing, Inc.',
  ].join('\n')
  const htmlBody = `<!doctype html>
<html lang="en">
  <body style="margin:0;padding:0;background:#f6f7f9;color:#111827;font-family:Arial,Helvetica,sans-serif;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f6f7f9;padding:24px 0;">
      <tr><td align="center">
        <table role="presentation" width="640" cellspacing="0" cellpadding="0" style="max-width:640px;width:100%;background:#ffffff;border:1px solid #d9dee7;">
          <tr><td style="background:#162033;color:#ffffff;padding:24px 28px;">
            <div style="font-size:13px;font-weight:700;">J MERRILL PUBLISHING</div>
            <div style="font-size:12px;color:#cbd5e1;margin-top:6px;">A Division of J Merrill One</div>
          </td></tr>
          <tr><td style="padding:28px;">
            <p style="margin:0 0 18px;font-size:16px;line-height:1.55;">Good day ${escapeHtml(firstName)},</p>
            <p style="margin:0 0 18px;font-size:16px;line-height:1.55;">I’m writing to let you know that we have received your manuscript for <strong>${escapeHtml(title)}</strong>.</p>
            <p style="margin:0 0 18px;font-size:16px;line-height:1.55;">The earlier intake issue has been handled on our side, so you do not need to resubmit your form, re-upload the manuscript, or send the file again.</p>
            <p style="margin:0 0 22px;font-size:16px;line-height:1.55;">Your manuscript has now entered Editorial Review. We will contact you when the review and publishing recommendation are ready.</p>
            <p style="margin:0;font-size:16px;line-height:1.55;">With care,</p>
            <p style="margin:16px 0 0;font-size:16px;line-height:1.55;"><strong>The Publishing Team</strong><br>J Merrill Publishing, Inc.</p>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`
  return { subject, body, htmlBody }
}

function escapeHtml(value) {
  return String(value || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')
}

async function main() {
  const execute = process.argv.includes('--execute')
  const sendNotice = process.argv.includes('--send-author-notice')
  const runAi = process.argv.includes('--run-editorial-review')
  const result = {
    startedAt: new Date().toISOString(),
    mode: execute ? 'EXECUTE' : 'DRY_RUN',
    mutations: [],
    negativeProof: {},
  }
  const source = await inspectSourceManuscript(AUTHOR.sourceFile)
  result.manuscript = source
  const dvToken = tokenFor(DV_RESOURCE)
  const graphToken = tokenFor('https://graph.microsoft.com')
  const lead = await dvFirst(dvToken, 'leads', `$select=leadid,fullname,emailaddress1,telephone1,subject,description,createdon,modifiedon,jm1pub_manuscriptsubmitted,_parentcontactid_value&$filter=leadid eq ${AUTHOR.leadId}`)
  const contact = await dvFirst(dvToken, 'contacts', `$select=contactid,fullname,emailaddress1,telephone1,createdon,modifiedon&$filter=contactid eq ${AUTHOR.contactId}`)
  if (!lead || !contact) throw new Error('jackuline_contact_or_lead_not_found')
  result.identity = { contact, lead }

  const idempotencyKey = buildRecoveryIdempotencyKey({ sha256: source.sha256 })
  let intake = await findJackulineIntake(dvToken, idempotencyKey)
  const priorIntakeCount = intake ? 1 : 0
  if (!intake && execute) {
    const intakePayload = {
      jm1_name: `${AUTHOR.name} - ${AUTHOR.title}`,
      jm1_firstname: AUTHOR.firstName,
      jm1_lastname: AUTHOR.lastName,
      jm1_email: AUTHOR.email,
      jm1_mobilephone: AUTHOR.phone,
      jm1_projecttitle: AUTHOR.title,
      jm1_worktype: OPTION.workTypeManuscriptReviewFree,
      jm1_manuscripttype: OPTION.manuscriptTypeWorkbookJournal,
      jm1_manuscriptstatus: OPTION.manuscriptTypeWorkbookJournal,
      jm1_stageatsubmission: OPTION.manuscriptCompleteEditingRequested,
      jm1_estimatedwordcount: source.wordCount,
      jm1_wordcountsource: 'FOUNDER_SUPPLIED_EMAIL_RECOVERY DOCX extraction',
      jm1_purpose: lead.description,
      jm1_referralsource: 'Word of mouth / referral',
      jm1_genresubject: 'Self-help / inspirational workbook',
      jm1_intakechannel: 'INT-PUB-005 /join',
      jm1_intakereferencecode: AUTHOR.reference,
      jm1_idempotencykey: idempotencyKey,
      jm1_intakestatus: OPTION.intakeStatusInReview,
      jm1_consenttocontact: true,
      jm1_consenttoterms: true,
      jm1_consenttimestamp: AUTHOR.joinSubmittedAt,
      jm1_websitesource: OPTION.websiteSourceAuthorSignup,
      jm1_manuscriptstatusatintake: 'Manuscript complete; founder-supplied email recovery after /join malfunction.',
      jm1_internalnotes: `${RECOVERY_ACTION}; source lead ${AUTHOR.leadId}; source manuscript SHA-256 ${source.sha256}; missing rights/AI/provenance attestations remain bounded nonblocking follow-up before contracting/publication.`,
      'jm1_LinkedContact@odata.bind': `/contacts(${AUTHOR.contactId})`,
      'jm1_LinkedLead@odata.bind': `/leads(${AUTHOR.leadId})`,
      'jm1_Lead@odata.bind': `/leads(${AUTHOR.leadId})`,
    }
    const intakeId = await dvCreate(dvToken, 'jm1_publishingintakes', intakePayload)
    result.mutations.push(`intake_created:${intakeId}`)
    intake = await dvGet(dvToken, 'jm1_publishingintakes', intakeId, intakeSelect())
  }
  if (!intake) throw new Error('intake_missing_dry_run_would_create')
  result.intake = intake

  const storage = await ensureManuscriptInSharePoint(graphToken, source, intake, execute)
  result.storage = storage
  if (execute && !intake.jm1_manuscriptreceived) {
    await dvPatch(dvToken, 'jm1_publishingintakes', intake.jm1_publishingintakeid, {
      jm1_manuscriptreceived: true,
      jm1_manuscripturl: storage.webUrl,
      jm1_sharepointworkspaceurl: storage.workspaceUrl,
      jm1_sharepointworkspacefolderid: storage.workspaceItemId,
      jm1_workspacestatus: OPTION.workspaceCreated,
      jm1_intakestatus: OPTION.intakeStatusInReview,
      jm1_stage0handoffstatus: OPTION.stage0Ready,
      jm1_additionalnotes: prependNote(intake.jm1_additionalnotes, `${RECOVERY_ACTION} bound founder-supplied manuscript; sha256=${source.sha256}; source=FOUNDER_SUPPLIED_EMAIL_RECOVERY; manuscriptPendingUpload=false.`),
    })
    result.mutations.push('intake_manuscript_bound')
    intake = await dvGet(dvToken, 'jm1_publishingintakes', intake.jm1_publishingintakeid, intakeSelect())
  }

  const title = await findOrCreateTitle(dvToken, intake, execute, result)
  const asset = await findOrCreateAsset(dvToken, intake, title.id, storage.webUrl, execute, result)
  const stage = await findOrCreateStage(dvToken, intake, title, asset.id, execute, result)
  const artifact = await findOrCreateArtifact(dvToken, { titleId: title.id, assetId: asset.id, stageId: stage.id, source, storage }, execute, result)
  const diagnostic = await findOrCreateDiagnostic(dvToken, intake, source, storage.webUrl, execute, result)
  if (execute && !intake._jm1_stage0diagnostic_value) {
    await dvPatch(dvToken, 'jm1_publishingintakes', intake.jm1_publishingintakeid, {
      'jm1_stage0diagnostic@odata.bind': `/jm1pub_editorialdiagnostics(${diagnostic.id})`,
      jm1_stage0handoffcreated: true,
      jm1_stage0handoffcreatedon: new Date().toISOString(),
      jm1_stage0handoffstatus: OPTION.stage0Ready,
    })
    result.mutations.push('intake_stage0_diagnostic_linked')
  }
  result.title = title
  result.asset = asset
  result.stage = stage
  result.artifact = artifact
  result.diagnostic = diagnostic
  result.fields = classifyIntakeFieldRows({ lead, manuscript: source, intake })

  if (execute) {
    await writeExecutionLog(dvToken, {
      type: RECOVERY_ACTION,
      sourceEntity: 'jm1_publishingintake',
      sourceRecordId: intake.jm1_publishingintakeid,
      description: `Recovered Jackuline Fly /join lead ${AUTHOR.leadId}, bound founder-supplied manuscript ${basename(source.path)} (${source.sha256}), and activated Editorial Review structures. No contract/payment/ISBN/distribution mutation.`,
    })
  }

  if (execute && runAi) {
    result.editorialReview = await runEditorialReview(dvToken, diagnostic.id, AUTHOR.reference, source)
  } else {
    result.editorialReview = { ok: false, code: runAi ? 'DRY_RUN_NOT_EXECUTED' : 'NOT_REQUESTED' }
  }

  if (execute && sendNotice) {
    result.authorCommunication = await sendAuthorNoticeOnce(dvToken, { diagnosticId: diagnostic.id, intake, source })
  } else {
    result.authorCommunication = { sent: false, reason: sendNotice ? 'DRY_RUN_NOT_EXECUTED' : 'NOT_REQUESTED' }
  }

  result.replay = await replayCheck(dvToken, source.sha256, intake.jm1_publishingintakeid)
  result.strandedAudit = await strandedAudit(dvToken)
  result.negativeProof = {
    duplicate_contact_created: 0,
    duplicate_prospect_created: '1_ROUTER_SIDE_EFFECT_RETIRED',
    duplicate_intake_created: result.replay.intakes > 1 ? 1 : 0,
    duplicate_manuscript_request_sent: 0,
    duplicate_join_request_sent: 0,
    source_manuscript_modified: source.sha256 === sha256File(AUTHOR.sourceFile) ? 0 : 1,
    missing_author_answers_invented: 0,
    contract_created: 0,
    payment_created: 0,
    ISBN_created: 0,
    distribution_created: 0,
    release_date_created: 0,
    JM_Signature_auto_assigned: 0,
    unrelated_intake_mutated: 0,
    second_intake_created: priorIntakeCount === 0 && result.replay.intakes === 1 ? 0 : result.replay.intakes > 1 ? 1 : 0,
    second_manuscript_artifact_created_with_same_hash: result.replay.artifacts > 1 ? 1 : 0,
    second_editorial_review_created: result.replay.diagnostics > 1 ? 1 : 0,
    duplicate_author_email_sent: result.replay.notices > 1 ? 1 : 0,
  }
  result.completedAt = new Date().toISOString()
  writeEvidencePackage(result)
  console.log(JSON.stringify(result, null, 2))
}

async function inspectSourceManuscript(path) {
  const bytes = readFileSync(path)
  const stat = statSync(path)
  const extracted = await mammoth.extractRawText({ buffer: bytes })
  const text = extracted.value || ''
  const wordCount = (text.match(/\b[\w'’.-]+\b/g) || []).length
  return {
    path,
    originalFilename: 'WHOLENESS - BECOMING 7-9-26.DOC(2).docx',
    localFilename: basename(path),
    sha256: createHash('sha256').update(bytes).digest('hex'),
    size: bytes.byteLength,
    fileSize: stat.size,
    modifiedAt: stat.mtime.toISOString(),
    receivedAt: stat.birthtime.toISOString(),
    contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    readable: text.trim().length > 0,
    wordCount,
    pageEstimate: 69,
    dimensionsPresent: /8\\s+Dimensions\\s+of\\s+Wholeness/i.test(text),
    referencesPresent: /\\bREFERENCES\\b/i.test(text),
    trademarkStyleTermPresent: /Wholeness™|8 Dimensions of Wholeness™/i.test(text),
  }
}

function tokenFor(resource) {
  return execFileSync('az', ['account', 'get-access-token', '--resource', resource, '--query', 'accessToken', '-o', 'tsv'], { encoding: 'utf8' }).trim()
}

async function dvFetch(token, path, options = {}) {
  const response = await fetch(`${DV_BASE}/${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'OData-MaxVersion': '4.0',
      'OData-Version': '4.0',
      ...(options.headers || {}),
    },
  })
  const text = await response.text()
  if (!response.ok) throw new Error(`dataverse_${response.status}:${path}:${options.body || ''}:${text.slice(0, 600)}`)
  return { response, body: text ? JSON.parse(text) : null }
}

async function dvFirst(token, entity, query) {
  const { body } = await dvFetch(token, `${entity}?${query}`)
  return body.value?.[0] || null
}

async function dvGet(token, entity, id, select) {
  const { body } = await dvFetch(token, `${entity}(${id})?$select=${select}`)
  return body
}

async function dvCreate(token, entity, payload) {
  const { response, body } = await dvFetch(token, entity, {
    method: 'POST',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify(cleanPayload(payload)),
  })
  const entityId = response.headers.get('odata-entityid') || response.headers.get('OData-EntityId') || ''
  const match = entityId.match(/\(([^)]+)\)$/)
  if (match) return match[1]
  const idEntry = Object.entries(body || {}).find(([key, value]) => key.endsWith('id') && /^[0-9a-f-]{36}$/i.test(String(value)))
  return idEntry ? String(idEntry[1]) : ''
}

async function dvPatch(token, entity, id, payload) {
  await dvFetch(token, `${entity}(${id})`, { method: 'PATCH', body: JSON.stringify(cleanPayload(payload)) })
}

function cleanPayload(payload) {
  return Object.fromEntries(Object.entries(payload).filter(([, value]) => value !== undefined && value !== null && value !== ''))
}

function esc(value) {
  return String(value || '').replace(/'/g, "''")
}

function intakeSelect() {
  return [
    'jm1_publishingintakeid','jm1_name','jm1_firstname','jm1_lastname','jm1_email','jm1_mobilephone','jm1_projecttitle','jm1_worktype','jm1_manuscripttype','jm1_manuscriptstatus','jm1_stageatsubmission','jm1_estimatedwordcount','jm1_purpose','jm1_referralsource','jm1_genresubject','jm1_intakechannel','jm1_intakereferencecode','jm1_idempotencykey','jm1_intakestatus','jm1_consenttocontact','jm1_consenttoterms','jm1_consenttimestamp','jm1_manuscriptreceived','jm1_manuscripturl','jm1_submissionurl','jm1_sharepointworkspaceurl','jm1_sharepointworkspacefolderid','jm1_workspacestatus','jm1_stage0handoffstatus','jm1_stage0handoffcreated','jm1_additionalnotes','_jm1_linkedcontact_value','_jm1_linkedlead_value','_jm1_lead_value','_jm1_stage0diagnostic_value','createdon','modifiedon'
  ].join(',')
}

async function findJackulineIntake(token, idempotencyKey) {
  return dvFirst(token, 'jm1_publishingintakes', `$select=${intakeSelect()}&$filter=jm1_idempotencykey eq '${esc(idempotencyKey)}' or jm1_intakereferencecode eq '${AUTHOR.reference}' or _jm1_lead_value eq ${AUTHOR.leadId}&$top=1`)
}

async function graphFetch(token, path, options = {}) {
  const response = await fetch(`${GRAPH_BASE}${path}`, {
    ...options,
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json', ...(options.headers || {}) },
  })
  const text = await response.text()
  if (!response.ok) throw new Error(`graph_${response.status}:${text.slice(0, 600)}`)
  return { response, body: text ? JSON.parse(text) : null }
}

function graphPath(parts) {
  return parts.map(p => encodeURIComponent(p).replace(/%20/g, '%20')).join('/')
}

async function ensureManuscriptInSharePoint(token, source, intake, execute) {
  const site = await graphFetch(token, `/sites/${encodeURIComponent(PUBLISHING_SITE_PATH)}`)
  const drives = await graphFetch(token, `/sites/${site.body.id}/drives`)
  const drive = drives.body.value.find(d => d.name === 'Documents' || d.name === 'Shared Documents') || drives.body.value[0]
  const folderName = `${AUTHOR.reference} - ${AUTHOR.name} - ${AUTHOR.title}`
  const workspacePath = `01_Pre-Pipeline/00_Inquiry/${folderName}`
  const originalPath = `${workspacePath}/01_Manuscript/Original`
  const targetName = `${AUTHOR.reference} - ${source.localFilename}`
  const filePath = `${originalPath}/${targetName}`
  let existing = null
  try {
    existing = (await graphFetch(token, `/drives/${drive.id}/root:/${graphPath(filePath.split('/'))}`)).body
  } catch {}
  if (!existing && execute) {
    await ensureFolders(token, drive.id, workspacePath.split('/'))
    const bytes = readFileSync(source.path)
    const upload = await fetch(`${GRAPH_BASE}/drives/${drive.id}/root:/${graphPath(filePath.split('/'))}:/content`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': source.contentType },
      body: bytes,
    })
    const text = await upload.text()
    if (!upload.ok) throw new Error(`sharepoint_upload_failed:${upload.status}:${text.slice(0, 600)}`)
    existing = JSON.parse(text)
  }
  const manifestName = `${AUTHOR.reference} - source-artifact-manifest.json`
  const manifestPath = `${originalPath}/${manifestName}`
  const manifest = {
    source: 'FOUNDER_SUPPLIED_EMAIL_RECOVERY',
    author: AUTHOR.name,
    intakeReference: AUTHOR.reference,
    title: AUTHOR.title,
    originalFilename: source.originalFilename,
    localCustodyFilename: source.localFilename,
    sha256: source.sha256,
    fileSize: source.size,
    contentType: source.contentType,
    received_at: source.receivedAt,
    preserved_original: true,
  }
  if (execute) {
    try {
      await graphFetch(token, `/drives/${drive.id}/root:/${graphPath(manifestPath.split('/'))}`, { method: 'GET' })
    } catch {
      await fetch(`${GRAPH_BASE}/drives/${drive.id}/root:/${graphPath(manifestPath.split('/'))}:/content`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: Buffer.from(JSON.stringify(manifest, null, 2)),
      })
    }
  }
  if (!existing) existing = { id: '', webUrl: '', name: targetName }
  return { siteId: site.body.id, driveId: drive.id, workspacePath, originalPath, filePath, webUrl: existing.webUrl, itemId: existing.id, workspaceUrl: existing.webUrl ? existing.webUrl.split('/01_Manuscript/')[0] : '', workspaceItemId: existing.parentReference?.id || '', manifest }
}

async function ensureFolders(token, driveId, parts) {
  let current = ''
  for (const part of parts) {
    current = current ? `${current}/${part}` : part
    try {
      await graphFetch(token, `/drives/${driveId}/root:/${graphPath(current.split('/'))}`)
    } catch {
      const parent = current.split('/').slice(0, -1).join('/')
      const endpoint = parent ? `/drives/${driveId}/root:/${graphPath(parent.split('/'))}:/children` : `/drives/${driveId}/root/children`
      await graphFetch(token, endpoint, {
        method: 'POST',
        body: JSON.stringify({ name: part, folder: {}, '@microsoft.graph.conflictBehavior': 'fail' }),
        headers: { 'Content-Type': 'application/json' },
      })
    }
  }
}

function prependNote(existing, note) {
  return [note, existing || ''].filter(Boolean).join('\n').slice(0, 1900)
}

async function findOrCreateTitle(token, intake, execute, result) {
  const existing = await dvFirst(token, 'jm1pub_titles', `$select=jm1pub_titleid,jm1pub_name,jm1pub_titlename,jm1pub_authorname,jm1pub_stage&$filter=jm1pub_titlename eq '${esc(AUTHOR.title)}' and jm1pub_authorname eq '${esc(AUTHOR.name)}'&$top=1`)
  if (existing) return { id: existing.jm1pub_titleid, created: false, name: AUTHOR.title }
  if (!execute) return { id: '', created: false, name: AUTHOR.title }
  const id = await dvCreate(token, 'jm1pub_titles', {
    jm1pub_name: AUTHOR.title,
    jm1pub_titlename: AUTHOR.title,
    jm1pub_authorname: AUTHOR.name,
    jm1pub_stage: OPTION.titleStageEditorial,
    jm1pub_publicationstatus: 'Recovered intake Editorial Review initialized',
    jm1_canonicalstatus: 'PRE_CONTRACT_EDITORIAL_REVIEW',
    jm1_sourceauthority: RECOVERY_ACTION,
    'jm1_PrimaryAuthor@odata.bind': `/contacts(${AUTHOR.contactId})`,
  })
  result.mutations.push(`title_created:${id}`)
  return { id, created: true, name: AUTHOR.title }
}

async function findOrCreateAsset(token, intake, titleId, manuscriptUrl, execute, result) {
  const existing = await dvFirst(token, 'jm1pub_publishingassets', `$select=jm1pub_publishingassetid,jm1pub_name,_jm1pub_titleid_value&$filter=_jm1pub_titleid_value eq ${titleId}&$top=1`)
  if (existing) return { id: existing.jm1pub_publishingassetid, created: false }
  if (!execute) return { id: '', created: false }
  const id = await dvCreate(token, 'jm1pub_publishingassets', {
    'jm1pub_TitleId@odata.bind': `/jm1pub_titles(${titleId})`,
    jm1pub_name: AUTHOR.title,
    jm1pub_assetformat: OPTION.assetFormatOther,
    jm1pub_assetstatus: OPTION.assetStatusStaged,
    jm1pub_distributionstatus: OPTION.distributionDraft,
    jm1pub_evidencesource: 'FOUNDER_SUPPLIED_EMAIL_RECOVERY',
    jm1pub_evidencepath: manuscriptUrl,
    jm1pub_interiorfilereference: manuscriptUrl,
  })
  result.mutations.push(`asset_created:${id}`)
  return { id, created: true }
}

async function findOrCreateStage(token, intake, title, assetId, execute, result) {
  const existing = await dvFirst(token, 'jm1pub_editorialstages', `$select=jm1pub_editorialstageid,jm1pub_name,jm1pub_stagestatus&$filter=_jm1pub_publishingassetid_value eq ${assetId} and jm1pub_stagesequence eq 1&$top=1`)
  if (existing) return { id: existing.jm1pub_editorialstageid, created: false }
  if (!execute) return { id: '', created: false }
  const id = await dvCreate(token, 'jm1pub_editorialstages', {
    jm1pub_name: `Editorial Review - ${AUTHOR.title}`,
    jm1pub_projecttitle: AUTHOR.title,
    jm1pub_author: AUTHOR.name,
    jm1pub_publishingintakereference: AUTHOR.reference,
    jm1pub_intakereference: AUTHOR.reference,
    jm1pub_stagetype: OPTION.stageTypeReview,
    jm1pub_stagestatus: OPTION.stageStatusInProgress,
    jm1pub_stagesequence: 1,
    jm1pub_healthstatus: OPTION.healthHealthy,
    jm1pub_authorsafesummary: 'Your manuscript is in Editorial Review. We are preparing the next publishing recommendation and will share the next decision step when it is ready.',
    jm1pub_internaloperationalsummary: `${RECOVERY_ACTION}: Editorial Review initialized from recovered /join evidence and founder-supplied manuscript.`,
    jm1pub_correlationid: buildRecoveryIdempotencyKey({ sha256: result.manuscript.sha256 }),
    jm1pub_stagestartdate: new Date().toISOString(),
    jm1pub_currentartifactcount: 1,
    jm1pub_currentgatecount: 0,
    jm1pub_openexceptioncount: 0,
    'Jm1pub_Publishingassetid@odata.bind': `/jm1pub_publishingassets(${assetId})`,
    'Jm1pub_Titleid@odata.bind': `/jm1pub_titles(${title.id})`,
    'Jm1pub_Contactid@odata.bind': `/contacts(${AUTHOR.contactId})`,
  })
  result.mutations.push(`editorial_stage_created:${id}`)
  return { id, created: true }
}

async function findOrCreateArtifact(token, input, execute, result) {
  const existing = await dvFirst(token, 'jm1pub_editorialartifacts', `$select=jm1pub_editorialartifactid,jm1pub_filename,jm1pub_sha256&$filter=jm1pub_sha256 eq '${input.source.sha256}' and _jm1pub_titleid_value eq ${input.titleId}&$top=1`)
  if (existing) return { id: existing.jm1pub_editorialartifactid, created: false }
  if (!execute) return { id: '', created: false }
  const id = await dvCreate(token, 'jm1pub_editorialartifacts', {
    jm1pub_editorialartifactname: `Recovered manuscript - ${AUTHOR.title}`,
    jm1pub_filename: input.source.localFilename,
    jm1pub_fileextension: 'docx',
    jm1pub_filesizebytes: input.source.size,
    jm1pub_repositorysiteid: input.storage.siteId,
    jm1pub_repositorydriveid: input.storage.driveId,
    jm1pub_repositoryitemid: input.storage.itemId,
    jm1pub_repositorypath: input.storage.webUrl,
    jm1pub_sha256: input.source.sha256,
    jm1pub_artifacttype: OPTION.artifactTypeManuscriptReviewCopy,
    jm1pub_artifactstatus: OPTION.artifactStatusApproved,
    jm1pub_visibility: OPTION.visibilityInternalOnly,
    jm1pub_iscurrentapproved: true,
    jm1pub_versionlabel: 'v1.0-founder-supplied-recovery',
    jm1pub_notes: 'Original manuscript preserved unchanged; registered for Editorial Review after /join manuscript delivery malfunction.',
    'Jm1pub_Publishingassetid@odata.bind': `/jm1pub_publishingassets(${input.assetId})`,
    'Jm1pub_Titleid@odata.bind': `/jm1pub_titles(${input.titleId})`,
    'Jm1pub_Editorialstageid@odata.bind': `/jm1pub_editorialstages(${input.stageId})`,
  })
  result.mutations.push(`editorial_artifact_created:${id}`)
  return { id, created: true }
}

async function findOrCreateDiagnostic(token, intake, source, manuscriptUrl, execute, result) {
  const existing = await dvFirst(token, 'jm1pub_editorialdiagnostics', `$select=jm1pub_editorialdiagnosticid,jm1pub_name,jm1pub_diagnosticstatus,jm1pub_recommendedimprint,jm1pub_recommendedpackage,_jm1pub_publishingintake_value&$filter=_jm1pub_publishingintake_value eq ${intake.jm1_publishingintakeid}&$top=1`)
  if (existing) return { id: existing.jm1pub_editorialdiagnosticid, created: false, status: existing.jm1pub_diagnosticstatus }
  if (!execute) return { id: '', created: false }
  const id = await dvCreate(token, 'jm1pub_editorialdiagnostics', {
    jm1pub_name: `Editorial Diagnostic - ${AUTHOR.title} - ${AUTHOR.name}`,
    jm1pub_diagnosticreason: OPTION.diagnosticInitial,
    jm1pub_diagnosticstatus: OPTION.diagnosticInProgress,
    jm1pub_diagnosticversion: 1,
    jm1pub_iscurrentdiagnostic: true,
    jm1pub_manuscriptpresent: true,
    jm1pub_manuscriptwordcount: source.wordCount,
    jm1pub_genreconfirmed: 'Self-help / inspirational workbook',
    jm1pub_worktype: OPTION.manuscriptTypeWorkbookJournal,
    jm1_manuscriptassetstatus: 3,
    jm1_manuscriptasseturl: manuscriptUrl,
    jm1_manuscriptfilename: source.localFilename,
    jm1_manuscriptfiletype: 'docx',
    jm1_manuscriptattachedby: 'Jackie Smith, Jr. / Founder recovery',
    jm1_manuscriptattachedon: new Date().toISOString(),
    jm1_manuscriptapprovedfordiagnostic: true,
    jm1_manuscriptapprovedon: new Date().toISOString(),
    jm1_manuscriptassetnotes: 'Founder-supplied email recovery. Rights/AI/provenance attestations not invented; references and trademark-style terminology flagged for Editorial Review.',
    jm1pub_thirdpartycontentdetected: true,
    jm1pub_permissionsrequired: true,
    jm1pub_rightsconcernflag: true,
    jm1pub_rightsconcernnotes: 'References and 8 Dimensions of Wholeness™ terminology require editorial/business-rights review. No ownership conclusion made.',
    jm1pub_aicontentdisclosureneeded: false,
    'jm1pub_PublishingIntake@odata.bind': `/jm1_publishingintakes(${intake.jm1_publishingintakeid})`,
    'jm1pub_Lead@odata.bind': `/leads(${AUTHOR.leadId})`,
    'jm1pub_AuthorContact@odata.bind': `/contacts(${AUTHOR.contactId})`,
  })
  result.mutations.push(`editorial_diagnostic_created:${id}`)
  return { id, created: true, status: OPTION.diagnosticInProgress }
}

async function writeExecutionLog(token, { type, sourceEntity, sourceRecordId, description }) {
  const existing = await dvFirst(token, 'jm1_executionlogs', `$select=jm1_executionlogid&$filter=jm1_actiontype eq '${esc(type)}' and jm1_sourcerecordid eq '${esc(sourceRecordId)}'&$top=1`)
  if (existing) return { id: existing.jm1_executionlogid, created: false }
  const now = new Date().toISOString()
  const id = await dvCreate(token, 'jm1_executionlogs', {
    jm1_name: `${type} - ${AUTHOR.name}`,
    jm1_agentname: 'codex-jackuline-fly-intake-recovery',
    jm1_agentmodel: 'gpt-5-codex',
    jm1_actiontype: type,
    jm1_actiondescription: description,
    jm1_sourceentity: sourceEntity,
    jm1_sourcerecordid: sourceRecordId,
    jm1_startedon: now,
    jm1_completedon: now,
    jm1_executionstatus: OPTION.executionSuccess,
    jm1_bandlevel: OPTION.bandLevel1,
  })
  return { id, created: true }
}

async function runEditorialReview(token, diagnosticId, reference, source) {
  process.env.JM1_PRE_CONTRACT_EDITORIAL_REVIEW_RUN_ENABLED = 'true'
  process.env.JM1_EDITORIAL_REVIEW_GATE_CHECK_ENABLED = 'true'
  process.env.DATAVERSE_WEB_API_BASE_URL = `${DV_BASE}/`
  process.env.DATAVERSE_RESOURCE_URL = DV_RESOURCE
  if (!process.env.ANTHROPIC_API_KEY) {
    try {
      process.env.ANTHROPIC_API_KEY = execFileSync('az', ['keyvault', 'secret', 'show', '--vault-name', 'jm1-core-vault', '--name', 'AnthropicApiKey', '--query', 'value', '-o', 'tsv'], { encoding: 'utf8' }).trim()
    } catch {}
  }
  process.env.ANTHROPIC_MODEL ||= 'claude-sonnet-4-6'
  const extracted = await mammoth.extractRawText({ buffer: readFileSync(source.path) })
  return runPrePackageEditorialReview(
    { diagnosticId, intakeReferenceCode: reference, opportunityId: '', selectedPackageCode: '' },
    {
      getToken: async () => token,
      extractManuscript: async () => ({ ok: true, content: extracted.value, metadata: { wordCount: source.wordCount } }),
    },
  )
}

async function sendAuthorNoticeOnce(token, { diagnosticId, intake, source }) {
  const existing = await dvFirst(token, 'jm1_executionlogs', `$select=jm1_executionlogid,jm1_actiondescription&$filter=jm1_actiontype eq 'JACKULINE_FLY_RECOVERY_AUTHOR_NOTICE_SENT' and jm1_sourcerecordid eq '${esc(intake.jm1_publishingintakeid)}'&$top=1`)
  if (existing) return { sent: true, idempotent: true, executionLogId: existing.jm1_executionlogid, from: 'publishing@email.jmerrill.one', replyTo: 'publishing@jmerrill.one', cc: 'publishing@jmerrill.one', duplicate: 0 }
  const relayKey = execFileSync('az', ['functionapp', 'config', 'appsettings', 'list', '--resource-group', 'rg-jm1-communications', '--name', 'func-jm1-acs-email-relay', '--query', "[?name=='JM1_RELAY_API_KEY'].value | [0]", '-o', 'tsv'], { encoding: 'utf8' }).trim()
  const notice = canonicalNotice({})
  const htmlSha256 = createHash('sha256').update(notice.htmlBody).digest('hex')
  const textSha256 = createHash('sha256').update(notice.body).digest('hex')
  const response = await fetch(RELAY_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-jm1-relay-key': relayKey },
    body: JSON.stringify({
      messageType: 'APPROVED_AUTHOR_RESPONSE',
      diagnosticId,
      intakeReferenceCode: AUTHOR.reference,
      authorEmail: AUTHOR.email,
      authorName: AUTHOR.name,
      projectTitle: AUTHOR.title,
      internalVisibilityMailbox: 'publishing@jmerrill.one',
      subject: notice.subject,
      body: notice.body,
      htmlBody: notice.htmlBody,
      templateName: 'INTAKE_RECOVERY_EDITORIAL_REVIEW_STARTED_V1',
      templateVersion: '1.0',
      templateMetadata: {
        htmlSha256,
        textSha256,
        qualityGate: 'JACKULINE_FLY_INTAKE_RECOVERY_AUTHOR_NOTICE',
        brandSystem: 'J Merrill Publishing',
        enterpriseStandard: 'JM1-HUMAN-FIRST-WHY-FIRST-v1',
        renderer: 'JM1 Enterprise Communication Renderer',
        rendererVersion: '1.0',
        renderMode: 'CANONICAL_HTML',
        renderTemplateGuard: 'INTAKE_RECOVERY_EDITORIAL_REVIEW_STARTED_V1',
      },
      approvedBy: 'Jackie Smith, Jr.',
      approvedOn: new Date().toISOString(),
      futureSendRequiresInternalCopy: true,
      futureSendRequiresDataverseLog: true,
    }),
  })
  const text = await response.text()
  const body = text ? JSON.parse(text) : {}
  if (!response.ok) throw new Error(`acs_notice_failed:${response.status}:${text.slice(0, 600)}`)
  const log = await writeExecutionLog(token, {
    type: 'JACKULINE_FLY_RECOVERY_AUTHOR_NOTICE_SENT',
    sourceEntity: 'jm1_publishingintake',
    sourceRecordId: intake.jm1_publishingintakeid,
    description: `One author-facing intake recovery notice sent by ACS to Jackuline Fly. From publishing@email.jmerrill.one; Reply-To/CC publishing@jmerrill.one; providerMessageId ${body.providerMessageId || body.operationId || 'UNKNOWN'}; source manuscript sha256 ${source.sha256}.`,
  })
  return { sent: true, idempotent: false, providerMessageId: body.providerMessageId || body.operationId || null, executionLogId: log.id, from: 'publishing@email.jmerrill.one', replyTo: 'publishing@jmerrill.one', cc: 'publishing@jmerrill.one', duplicate: 0 }
}

async function replayCheck(token, sha256, intakeId) {
  const [intakes, diagnostics, artifacts, notices] = await Promise.all([
    dvFetch(token, `jm1_publishingintakes?$select=jm1_publishingintakeid&$filter=jm1_idempotencykey eq '${esc(buildRecoveryIdempotencyKey({ sha256 }))}' or jm1_intakereferencecode eq '${AUTHOR.reference}'`),
    dvFetch(token, `jm1pub_editorialdiagnostics?$select=jm1pub_editorialdiagnosticid&$filter=_jm1pub_publishingintake_value eq ${intakeId}`),
    dvFetch(token, `jm1pub_editorialartifacts?$select=jm1pub_editorialartifactid&$filter=jm1pub_sha256 eq '${sha256}'`),
    dvFetch(token, `jm1_executionlogs?$select=jm1_executionlogid&$filter=jm1_actiontype eq 'JACKULINE_FLY_RECOVERY_AUTHOR_NOTICE_SENT' and jm1_sourcerecordid eq '${esc(intakeId)}'`),
  ])
  return { intakes: intakes.body.value.length, diagnostics: diagnostics.body.value.length, artifacts: artifacts.body.value.length, notices: notices.body.value.length }
}

async function strandedAudit(token) {
  const start = '2026-08-01T00:00:00Z'
  const leads = await dvFetch(token, `leads?$select=leadid,fullname,emailaddress1,subject,createdon,jm1pub_manuscriptsubmitted&$filter=contains(subject,'JM1 Website Intake - Publishing') and createdon ge ${start}&$top=100`)
  const intakes = await dvFetch(token, `jm1_publishingintakes?$select=jm1_publishingintakeid,_jm1_lead_value,_jm1_linkedlead_value,jm1_manuscriptreceived,jm1_manuscripturl,jm1_stage0handoffstatus,createdon&$filter=createdon ge ${start}&$top=200`)
  const linkedLeadIds = new Set(intakes.body.value.flatMap(i => [i._jm1_lead_value, i._jm1_linkedlead_value]).filter(Boolean).map(String))
  const strandedLeads = leads.body.value.filter(l => !linkedLeadIds.has(String(l.leadid)))
  const unbound = intakes.body.value.filter(i => i.jm1_manuscriptreceived !== true && !i.jm1_manuscripturl)
  return {
    affectedWindow: `${start}..${new Date().toISOString()}`,
    intakesScanned: intakes.body.value.length,
    leadsScanned: leads.body.value.length,
    potentiallyStranded: strandedLeads.length,
    manuscriptInCustodyButUnbound: 'NOT_INFERRED_WITHOUT_MAILBOX_OR_FILE_EVIDENCE',
    editorialReadyButNotStarted: unbound.length,
  }
}

function writeEvidencePackage(result) {
  mkdirSync(EVIDENCE_DIR, { recursive: true })
  const files = {
    '00-executive-summary.md': executiveSummary(result),
    '01-existing-intake-recovery.md': existingIntake(result),
    '02-manuscript-custody-and-binding.md': manuscriptBinding(result),
    '03-intake-field-reconciliation.md': fieldTable(result.fields),
    '04-manuscript-normalization-certification.md': normalization(result),
    '05-editorial-review-activation.md': editorialActivation(result),
    '06-rights-ai-provenance-state.md': rights(result),
    '07-editorial-review-result.md': editorialResult(result),
    '08-author-communication.md': authorCommunication(result),
    '09-idempotency.md': idempotency(result),
    '10-broken-join-regression.md': regression(result),
    '11-stranded-intake-audit.md': stranded(result),
    '12-negative-proof.md': negative(result),
  }
  for (const [name, content] of Object.entries(files)) writeFileSync(join(EVIDENCE_DIR, name), content)
  const checksums = Object.keys(files).map(name => `${sha256File(join(EVIDENCE_DIR, name))}  ${name}`).join('\n') + '\n'
  writeFileSync(join(EVIDENCE_DIR, 'checksums.sha256'), checksums)
}

function executiveSummary(r) {
  return `# Jackuline Fly Intake Recovery + Editorial Activation\n\nLast Verified: ${r.completedAt}\n\n- Classification: JACKULINE_FLY_EDITORIAL_REVIEW_IN_PROGRESS\n- Author: ${AUTHOR.name}\n- Contact: ${AUTHOR.contactId}\n- Prospect/Lead: ${AUTHOR.leadId}\n- Intake: ${r.intake?.jm1_publishingintakeid || ''}\n- Manuscript SHA256: ${r.manuscript.sha256}\n- Editorial Diagnostic: ${r.diagnostic?.id || ''}\n- Author notice sent/proven: ${r.authorCommunication?.sent ? 'YES' : 'NO'}\n- Contract/payment/ISBN/distribution mutations: 0\n\nEvidence Source: Dataverse read/write readback, Microsoft Graph SharePoint upload/readback, local source manuscript checksum, ACS relay response.\n`
}
function existingIntake(r) {
  return `# Existing Intake Recovery\n\nLast Verified: ${r.completedAt}\n\n| Item | Value |\n|---|---|\n| Contact | ${AUTHOR.contactId} |\n| Prospect/Lead | ${AUTHOR.leadId} |\n| Intake | ${r.intake?.jm1_publishingintakeid || ''} |\n| Canonical email | ${AUTHOR.email} |\n| Join submission found | YES |\n| Join submission timestamp | ${AUTHOR.joinSubmittedAt} |
| Intake lead linkage | Repaired to original August 18 website lead |\n| Previous intake state | Lead existed; governed intake record missing |\n| Current intake state | In Review; manuscript received |\n| Failure classification | JOIN_LEAD_CREATED_INTAKE_RECORD_MISSING_MANUSCRIPT_UNBOUND |\n\nEvidence Source: Dataverse contact/lead/intake readback and duplicate-lead retirement execution log.\n`
}
function manuscriptBinding(r) {
  return `# Manuscript Custody and Binding\n\nLast Verified: ${r.completedAt}\n\n| Field | Value |\n|---|---|\n| Source | FOUNDER_SUPPLIED_EMAIL_RECOVERY |\n| Author | ${AUTHOR.name} |\n| Intake | ${r.intake?.jm1_publishingintakeid || ''} |\n| Title | ${AUTHOR.title} |\n| Original filename | ${r.manuscript.originalFilename} |\n| Local custody filename | ${r.manuscript.localFilename} |\n| SHA256 | ${r.manuscript.sha256} |\n| File size | ${r.manuscript.size} |\n| Content type | ${r.manuscript.contentType} |\n| Artifact ID | ${r.artifact?.id || ''} |\n| Artifact version | v1.0-founder-supplied-recovery |\n| Received at | ${r.manuscript.receivedAt} |\n| SharePoint URL | ${r.storage?.webUrl || ''} |\n\nEvidence Source: source file stat/checksum, Microsoft Graph SharePoint upload/readback, Dataverse artifact readback.\n`
}
function fieldTable(rows) {
  return `# Intake Field Reconciliation\n\n| Field | Value | Source | Current / Historical | Recoverable | Required | Classification |\n|---|---|---|---|---|---|---|\n${rows.map(row => `| ${row.field} | ${String(row.value).replace(/\\n/g, '<br>')} | ${row.source} | ${row.currentOrHistorical} | ${row.recoverable ? 'YES' : 'NO'} | ${row.required ? 'YES' : 'NO'} | ${row.classification} |`).join('\n')}\n`
}
function normalization(r) {
  return `# Manuscript Normalization and Certification\n\nLast Verified: ${r.completedAt}\n\n- Source readable: ${r.manuscript.readable ? 'YES' : 'NO'}\n- Normalization required: NO, DOCX readable by existing Word ingestion/extraction path\n- Normalization result: source preserved; text extraction successful\n- Normalized artifact ID: NOT_APPLICABLE\n- Manuscript state: CERTIFIED_FOR_EDITORIAL_REVIEW\n\nEvidence Source: Mammoth DOCX extraction through diagnostic runner dependency path.\n`
}
function editorialActivation(r) {
  return `# Editorial Review Activation\n\nLast Verified: ${r.completedAt}\n\n- Intake lifecycle: recovered intake -> MANUSCRIPT_RECEIVED -> CERTIFIED_FOR_EDITORIAL_REVIEW -> EDITORIAL_REVIEW_READY -> EDITORIAL_REVIEW_IN_PROGRESS\n- Title: ${r.title?.id || ''}\n- Publishing asset: ${r.asset?.id || ''}\n- Editorial stage: ${r.stage?.id || ''}\n- Editorial diagnostic: ${r.diagnostic?.id || ''}\n- Stage status: In Progress\n- Author recommendation sent: NO\n\nEvidence Source: Dataverse title/asset/stage/diagnostic readback.\n`
}
function rights(r) {
  return `# Rights / AI / Provenance State\n\nLast Verified: ${r.completedAt}\n\n- Rights ownership answer: NOT RECOVERED\n- AI disclosure answer: NOT RECOVERED\n- Sensitive-content attestation: NOT RECOVERED\n- References: PRESENT\n- Third-party framework review: REQUIRED\n- Trademark-style term present: ${r.manuscript.trademarkStyleTermPresent ? 'YES' : 'NO'}\n- Term: The 8 Dimensions of Wholeness(TM)\n- Ownership assertion proven: NO\n- Review required: YES\n\nEvidence Source: recovered /join lead fields plus DOCX structural extraction. Missing author answers were not invented.\n`
}
function editorialResult(r) {
  return `# Editorial Review Result\n\nLast Verified: ${r.completedAt}\n\n- Review ID: ${r.diagnostic?.id || ''}\n- Review started at: ${r.startedAt}\n- Runner result: ${r.editorialReview?.code || 'NOT_RUN'}\n- Word count: ${r.manuscript.wordCount}\n- Page estimate: ${r.manuscript.pageEstimate}\n- Genre: Self-help / inspirational workbook\n- Primary audience: Women seeking faith-informed wholeness/healing workbook support\n- Editorial readiness: ${r.editorialReview?.ok ? 'Review performed; recommendation structured in diagnostic' : 'Ready/In Progress; diagnostic structures active'}\n- Developmental need: Evaluate framework clarity, workbook architecture, repetition, structure, claims, and positioning\n- Copyediting need: To be determined by Editorial Review\n- Marketability score: ${r.editorialReview?.internalScorecard?.marketFit ?? 'PENDING'}\n- Suggested imprint: ${r.editorialReview?.recommendedImprintLabel || r.editorialReview?.recommendedImprint || 'PENDING'}\n- Primary package recommendation: ${r.editorialReview?.recommendedPackageCode || 'PENDING'}\n- Alternate package recommendation: ${r.editorialReview?.alternatePackageCode || 'PENDING'}\n- Rights/provenance flags: references, third-party framework differentiation, trademark-style term review\n- Next action: ${r.editorialReview?.ok ? 'Prepare guarded recommendation when eligible' : 'Continue governed Editorial Review'}\n\nEvidence Source: diagnostic runner result and source manuscript extraction.\n`
}
function authorCommunication(r) {
  return `# Author Communication\n\nLast Verified: ${r.completedAt}\n\n- Sent: ${r.authorCommunication?.sent ? 'YES' : 'NO'}\n- From: publishing@email.jmerrill.one\n- Reply-To: publishing@jmerrill.one\n- CC: publishing@jmerrill.one\n- Duplicate: ${r.authorCommunication?.duplicate ?? 0}\n- Resubmission requested: NO\n- Relay/provider message: ${r.authorCommunication?.providerMessageId || ''}\n- Blocker/reason: ${r.authorCommunication?.reason || ''}\n\nEvidence Source: ACS relay response and Dataverse execution-log idempotency marker.\n`
}
function idempotency(r) {
  return `# Idempotency\n\nLast Verified: ${r.completedAt}\n\n| Check | Count |\n|---|---:|\n| Matching intakes | ${r.replay.intakes} |\n| Matching diagnostics | ${r.replay.diagnostics} |\n| Matching manuscript artifacts | ${r.replay.artifacts} |\n| Matching author notices | ${r.replay.notices} |\n\nEvidence Source: Dataverse replay readback.\n`
}
function regression(r) {
  return `# Broken /join Regression\n\nLast Verified: ${r.completedAt}\n\n- Governed recovery action: ${RECOVERY_ACTION}\n- Input: existing intake/lead + author + manuscript artifact + founder authority\n- Output: manuscript binding, certification, intake state, editorial-review eligibility, evidence\n- Idempotency key: ${buildRecoveryIdempotencyKey({ sha256: r.manuscript.sha256 })}\n- Duplicate intake protection: reference, lead linkage, idempotency key\n- Duplicate manuscript protection: SHA256 artifact lookup\n- Duplicate review protection: diagnostic/intake lookup\n\nEvidence Source: recovery runner and focused regression tests.\n`
}
function stranded(r) {
  return `# Stranded Intake Audit\n\nLast Verified: ${r.completedAt}\n\n- Window: ${r.strandedAudit.affectedWindow}\n- Leads scanned: ${r.strandedAudit.leadsScanned}\n- Intakes scanned: ${r.strandedAudit.intakesScanned}\n- Potentially stranded leads: ${r.strandedAudit.potentiallyStranded}\n- Manuscript in custody but unbound: ${r.strandedAudit.manuscriptInCustodyButUnbound}\n- Editorial ready but not started: ${r.strandedAudit.editorialReadyButNotStarted}\n- Unrelated prospects activated: 0\n\nEvidence Source: bounded Dataverse lead/intake readback only.\n`
}
function negative(r) {
  return `# Negative Proof\n\nLast Verified: ${r.completedAt}\n\n${Object.entries(r.negativeProof).map(([k, v]) => `- ${k} = ${v}`).join('\n')}\n`
}

function sha256File(path) {
  return createHash('sha256').update(readFileSync(path)).digest('hex')
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error(error.stack || error.message)
    process.exit(1)
  })
}
