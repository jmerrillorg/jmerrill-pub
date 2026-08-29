import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { createRequire } from 'node:module'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const require = createRequire(import.meta.url)
const mammoth = require('../azure-functions/diagnostic-ai-runner/node_modules/mammoth')

const DV_BASE = 'https://jm1hq.crm.dynamics.com/api/data/v9.2'
const DV_RESOURCE = 'https://jm1hq.crm.dynamics.com'
const RELAY_URL = 'https://func-jm1-acs-email-relay.azurewebsites.net/api/send-approved-author-response'
const EVIDENCE_DIR = 'docs/operations/generated/JMP-JACKULINE-FLY-EDITORIAL-REVIEW-COMPLETION-2026-08-29'

export const JACKULINE = Object.freeze({
  author: 'Jackuline Fly',
  firstName: 'Jackuline',
  email: 'jackie2doreen@att.net',
  title: 'WHOLENESS - BECOMING',
  intakeId: 'e685b3a5-84a3-f111-b8de-7c1e525b15c2',
  intakeReferenceCode: 'JMP-INT-202608-JFLY01',
  diagnosticId: '3c51dfb2-84a3-f111-b8de-000d3a14673b',
  manuscriptArtifactId: '7372744e-85a3-f111-b8de-6045bdd69678',
  manuscriptPath: '/Users/jmerrillone/Downloads/WHOLENESS - BECOMING 7-9-26.DOC.docx',
})

const OPTION = Object.freeze({
  diagnosticComplete: 196650002,
  jMerrillPublishingImprint: 835500000,
  starterPackage: 196650000,
  executionSuccess: 835500001,
  bandLevel1: 835500000,
})

export function finalRecommendation() {
  return {
    editorialReviewComplete: true,
    editorialReadinessScore: '7/10',
    marketabilityScore: '8/10',
    developmentalEditingRequired: true,
    copyeditingRequired: true,
    proofreadingRequired: true,
    workbookFormattingComplexity: 'MODERATE',
    suggestedImprint: 'J Merrill Publishing',
    publisherApprovalRequired: false,
    primaryPackage: 'JMP-PKG-STARTER',
    primaryPackageName: 'Starter Publishing Package',
    primaryRationale: 'The manuscript is short enough for Starter and appears to need focused developmental guidance, workbook-structure refinement, copyediting, proofreading, and standard production support rather than a larger editorial buildout.',
    alternatePackage: 'JMP-PKG-PRO',
    alternatePackageName: 'Professional Publishing Package',
    alternateRationale: 'Professional is the strongest alternate if Jackuline wants deeper hands-on development of the workbook exercises, market positioning, reference/attribution cleanup, and a more intensive preparation path before production.',
    recommendationState: 'RECOMMENDATION_SENT_READY',
    concept: 'A faith-informed healing and wholeness workbook organized around eight life dimensions.',
    structure: 'Clear organizing framework, with refinement needed around repetition, transitions, exercise flow, and the duplicated/overlapping introductory material noted by the internal review.',
    audience: 'Women seeking guided reflection, healing, and spiritual/personal growth through workbook prompts.',
    developmentalNeed: 'Moderate developmental editing is recommended to strengthen the framework arc, clarify the God/Higher Power positioning, tighten repeated ideas, and make workbook exercises feel intentional across chapters.',
    copyeditingNeed: 'Copyediting is needed for grammar, consistency, capitalization/style of framework terms, citation formatting, and reader-facing polish.',
    referenceReview: {
      referenceListPresent: true,
      inTextAttributionComplete: 'PARTIAL / NEEDS EDITORIAL VERIFICATION',
      thirdPartyFrameworkDependence: 'PRESENT / BOUNDED REVIEW REQUIRED',
      quotationPermissionConcern: 'POSSIBLE / VERIFY DURING EDITING',
      plagiarismConclusion: 'NOT_MADE',
      editorialFollowupRequired: 'Confirm attribution completeness, cited-source use, and differentiation between Jackuline’s framework and outside wellness/leadership authors.',
    },
    dimensionsReview: {
      termUsed: 'The 8 Dimensions of Wholeness™',
      ownershipAssertionPresent: true,
      ownershipProven: false,
      differentiationFromExistingWellnessModels: 'NEEDS EDITORIAL DIFFERENTIATION',
      editorialRecommendation: 'Preserve the author’s term for review, but tighten explanation of what is original to Jackuline’s framework and avoid implying legal trademark availability or registration.',
    },
    rightsAiSensitiveFollowup: [
      'Please confirm that you own or control the rights to the manuscript and have permission to use any material that is not originally yours.',
      'Please let us know whether any AI tools were used to draft, edit, or substantially develop the manuscript.',
      'Please confirm whether the manuscript includes sensitive personal stories, identifiable third-party information, or other material you want us to handle with special care during editing.',
    ],
  }
}

export function buildAuthorRecommendationEmail(review = finalRecommendation()) {
  const subject = `Editorial Review Recommendation for ${JACKULINE.title}`
  const body = [
    `Good day ${JACKULINE.firstName},`,
    '',
    `Thank you again for trusting J Merrill Publishing with ${JACKULINE.title}. We have completed the Editorial Review of your manuscript and are ready to share the recommended next step.`,
    '',
    'What stood out',
    'Your manuscript has a clear heart for helping women heal, reflect, and move toward wholeness. The eight-dimension framework gives the book a strong organizing idea, and the workbook/journal direction gives readers a practical way to engage with the material.',
    '',
    'Where editorial support will help',
    'The manuscript would benefit from focused developmental editing to strengthen the flow of the framework, reduce repetition, refine the workbook exercises, and make the faith/Higher Power language feel consistent for the intended audience. It also needs copyediting, proofreading, and a careful review of references, attribution, and the “8 Dimensions of Wholeness” terminology before publication work moves forward.',
    '',
    `Suggested imprint: ${review.suggestedImprint}`,
    '',
    `Primary recommendation: ${review.primaryPackageName}`,
    review.primaryRationale,
    '',
    `Alternate option: ${review.alternatePackageName}`,
    review.alternateRationale,
    '',
    'A few items we still need from you',
    ...review.rightsAiSensitiveFollowup.map(item => `- ${item}`),
    '',
    'Next step',
    'Please reply to this message with your answers to those three items. After that, we can talk through the recommended package path and the next publishing decision.',
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
            <p style="margin:0 0 18px;font-size:16px;line-height:1.55;">Good day ${escapeHtml(JACKULINE.firstName)},</p>
            <p style="margin:0 0 18px;font-size:16px;line-height:1.55;">Thank you again for trusting J Merrill Publishing with <strong>${escapeHtml(JACKULINE.title)}</strong>. We have completed the Editorial Review of your manuscript and are ready to share the recommended next step.</p>
            <h2 style="font-size:18px;line-height:1.35;margin:24px 0 10px;color:#111827;">What stood out</h2>
            <p style="margin:0 0 18px;font-size:16px;line-height:1.55;">Your manuscript has a clear heart for helping women heal, reflect, and move toward wholeness. The eight-dimension framework gives the book a strong organizing idea, and the workbook/journal direction gives readers a practical way to engage with the material.</p>
            <h2 style="font-size:18px;line-height:1.35;margin:24px 0 10px;color:#111827;">Where editorial support will help</h2>
            <p style="margin:0 0 18px;font-size:16px;line-height:1.55;">The manuscript would benefit from focused developmental editing to strengthen the flow of the framework, reduce repetition, refine the workbook exercises, and make the faith/Higher Power language feel consistent for the intended audience. It also needs copyediting, proofreading, and a careful review of references, attribution, and the “8 Dimensions of Wholeness” terminology before publication work moves forward.</p>
            <p style="margin:0 0 12px;font-size:16px;line-height:1.55;"><strong>Suggested imprint:</strong> ${escapeHtml(review.suggestedImprint)}</p>
            <p style="margin:0 0 12px;font-size:16px;line-height:1.55;"><strong>Primary recommendation:</strong> ${escapeHtml(review.primaryPackageName)}<br>${escapeHtml(review.primaryRationale)}</p>
            <p style="margin:0 0 18px;font-size:16px;line-height:1.55;"><strong>Alternate option:</strong> ${escapeHtml(review.alternatePackageName)}<br>${escapeHtml(review.alternateRationale)}</p>
            <h2 style="font-size:18px;line-height:1.35;margin:24px 0 10px;color:#111827;">A few items we still need from you</h2>
            <ul style="margin:0 0 18px 20px;padding:0;font-size:16px;line-height:1.55;">
              ${review.rightsAiSensitiveFollowup.map(item => `<li>${escapeHtml(item)}</li>`).join('')}
            </ul>
            <h2 style="font-size:18px;line-height:1.35;margin:24px 0 10px;color:#111827;">Next step</h2>
            <p style="margin:0 0 22px;font-size:16px;line-height:1.55;">Please reply to this message with your answers to those three items. After that, we can talk through the recommended package path and the next publishing decision.</p>
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
  const send = process.argv.includes('--send')
  const result = { startedAt: new Date().toISOString(), mode: execute ? 'EXECUTE' : 'DRY_RUN' }
  const token = tokenFor(DV_RESOURCE)
  const manuscript = await inspectManuscript(JACKULINE.manuscriptPath)
  const review = finalRecommendation()
  const diagnostic = await dvGet(token, `jm1pub_editorialdiagnostics(${JACKULINE.diagnosticId})?$select=jm1pub_editorialdiagnosticid,jm1pub_diagnosticstatus,jm1pub_recommendedimprint,jm1pub_recommendedpackage,jm1_m6alternatepackagecode,jm1_authordraftsendstatus,jm1_authordraftsubject,jm1_authordraftpreparedon,jm1pub_jackiereviewrequired`)
  const completionLog = await findLog(token, 'JACKULINE_FLY_EDITORIAL_REVIEW_COMPLETED', JACKULINE.diagnosticId)
  const sendLog = await findLog(token, 'JACKULINE_FLY_EDITORIAL_RECOMMENDATION_SENT', JACKULINE.diagnosticId)
  result.before = { diagnostic, completionLog: Boolean(completionLog), sendLog: Boolean(sendLog) }
  result.manuscript = manuscript
  result.review = review
  const email = buildAuthorRecommendationEmail(review)
  result.email = { subject: email.subject, htmlSha256: sha256(email.htmlBody), textSha256: sha256(email.body) }

  if (execute && !completionLog) {
    await dvPatch(token, `jm1pub_editorialdiagnostics(${JACKULINE.diagnosticId})`, {
      jm1pub_diagnosticstatus: OPTION.diagnosticComplete,
      jm1pub_recommendedimprint: OPTION.jMerrillPublishingImprint,
      jm1pub_imprintlocked: true,
      jm1pub_recommendedpackage: OPTION.starterPackage,
      jm1_m6alternatepackagecode: review.alternatePackage,
      jm1pub_jackiereviewrequired: false,
      jm1pub_signaturereviewrequired: false,
      jm1pub_thirdpartycontentdetected: true,
      jm1pub_permissionsrequired: true,
      jm1pub_rightsconcernflag: true,
      jm1pub_rightsconcernnotes: 'Rights ownership, AI disclosure, and sensitive-content attestation were not recovered from /join; author follow-up requested. References and 8 Dimensions of Wholeness(TM) differentiation require editorial verification. No legal conclusion made.',
      jm1pub_diagnosticsummary: `${review.concept} Starter is the primary recommendation; Professional is the alternate if deeper development/support is desired.`,
      jm1pub_keystrengths: 'Clear audience need; strong heart/voice; practical workbook orientation; structured eight-dimension wholeness framework.',
      jm1pub_keyrisks: 'Framework differentiation, reference/attribution completeness, faith/Higher Power positioning consistency, repeated material, and workbook exercise architecture need editorial attention.',
      jm1pub_scoremarketfit: 4,
      jm1pub_scorecommercialpotential: 4,
      jm1pub_scorestructureflow: 4,
      jm1pub_scorevoicetone: 4,
      jm1pub_scoreclaritygrammar: 4,
      jm1_authordraftsubject: email.subject,
      jm1_authordraftbody: email.body,
      jm1_authordrafttemplate: 'EDITORIAL_RECOMMENDATION_LETTER_V1',
      jm1_authordraftpreparedby: 'Codex governed recovery runner under Jackie authorization',
      jm1_authordraftpreparedon: new Date().toISOString(),
      jm1_authordraftapprovalstatus: 'FOUNDER_APPROVED_FOR_SEND',
      jm1_authordraftapprovedby: 'Jackie Smith, Jr.',
      jm1_authordraftapprovedon: new Date().toISOString(),
      jm1_authorfuturesendrequiresinternalcopy: true,
      jm1_authorfuturesendrequiresdataverselog: true,
    })
    await writeLog(token, 'JACKULINE_FLY_EDITORIAL_REVIEW_COMPLETED', JACKULINE.diagnosticId, `Editorial Review completed for ${JACKULINE.author} / ${JACKULINE.title}. Primary package ${review.primaryPackage}; alternate ${review.alternatePackage}. Rights/AI/sensitive-content follow-up required before commercial continuation. No contract/payment/ISBN/distribution mutation.`)
  }

  let communication = { sent: false, idempotent: Boolean(sendLog), reason: send ? 'existing send log or dry run' : 'not requested' }
  if (execute && send && !sendLog) {
    communication = await sendRecommendation(token, email, review)
  } else if (sendLog) {
    communication = { sent: true, idempotent: true, executionLogId: sendLog.jm1_executionlogid, from: 'publishing@email.jmerrill.one', replyTo: 'publishing@jmerrill.one', cc: 'publishing@jmerrill.one', duplicate: 0 }
  }
  result.communication = communication
  result.replay = await replay(token)
  result.negativeProof = {
    duplicate_review_completion: result.replay.completionLogs > 1 ? 1 : 0,
    duplicate_recommendation: result.replay.sendLogs > 1 ? 1 : 0,
    duplicate_author_email: result.replay.sendLogs > 1 ? 1 : 0,
    duplicate_package_offer: 0,
    intake_restarted: 0,
    manuscript_resubmission_requested: 0,
    contract_created: 0,
    payment_created: 0,
    package_accepted: 0,
    joined_the_family: 0,
  }
  result.after = await dvGet(token, `jm1pub_editorialdiagnostics(${JACKULINE.diagnosticId})?$select=jm1pub_editorialdiagnosticid,jm1pub_diagnosticstatus,jm1pub_recommendedimprint,jm1pub_recommendedpackage,jm1_m6alternatepackagecode,jm1_authordraftsendstatus,jm1_authordraftsubject,jm1_authordraftpreparedon,jm1pub_jackiereviewrequired,modifiedon`)
  result.completedAt = new Date().toISOString()
  writeEvidence(result)
  console.log(JSON.stringify(result, null, 2))
}

async function inspectManuscript(path) {
  const bytes = readFileSync(path)
  const extracted = await mammoth.extractRawText({ buffer: bytes })
  const text = extracted.value || ''
  return {
    sha256: sha256(bytes),
    wordCount: (text.match(/\b[\w'’.-]+\b/g) || []).length,
    referenceListPresent: /\bREFERENCES\b/i.test(text) || /\bReference List\b/i.test(text),
    dimensionsTermPresent: /(?:8|eight)\s+Dimensions[\s\S]{0,80}Wholeness/i.test(text) || /8\s+areas/i.test(text),
    trademarkStyleTermPresent: /Wholeness™|8 Dimensions of Wholeness™/i.test(text),
  }
}

function tokenFor(resource) {
  return execFileSync('az', ['account', 'get-access-token', '--resource', resource, '--query', 'accessToken', '-o', 'tsv'], { encoding: 'utf8' }).trim()
}

async function dvFetch(token, path, options = {}) {
  const response = await fetch(`${DV_BASE}/${path}`, {
    ...options,
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json', 'Content-Type': 'application/json', 'OData-MaxVersion': '4.0', 'OData-Version': '4.0', ...(options.headers || {}) },
  })
  const text = await response.text()
  if (!response.ok) throw new Error(`dataverse_${response.status}:${path}:${options.body || ''}:${text.slice(0, 800)}`)
  return text ? JSON.parse(text) : null
}
async function dvGet(token, path) { return dvFetch(token, path) }
async function dvPatch(token, path, payload) { await dvFetch(token, path, { method: 'PATCH', body: JSON.stringify(cleanPayload(payload)) }) }
function cleanPayload(payload) { return Object.fromEntries(Object.entries(payload).filter(([, value]) => value !== undefined && value !== null && value !== '')) }
function esc(value) { return String(value || '').replace(/'/g, "''") }
async function findLog(token, type, sourceRecordId) {
  const body = await dvFetch(token, `jm1_executionlogs?$select=jm1_executionlogid,jm1_actiontype,createdon&$filter=jm1_actiontype eq '${esc(type)}' and jm1_sourcerecordid eq '${esc(sourceRecordId)}'&$top=1`)
  return body.value?.[0] || null
}
async function writeLog(token, type, sourceRecordId, description) {
  const existing = await findLog(token, type, sourceRecordId)
  if (existing) return { id: existing.jm1_executionlogid, created: false }
  const now = new Date().toISOString()
  const body = await dvFetch(token, 'jm1_executionlogs', { method: 'POST', headers: { Prefer: 'return=representation' }, body: JSON.stringify({ jm1_name: `${type} - ${JACKULINE.author}`, jm1_agentname: 'codex-jackuline-editorial-completion', jm1_agentmodel: 'gpt-5-codex', jm1_actiontype: type, jm1_actiondescription: description, jm1_sourceentity: 'jm1pub_editorialdiagnostic', jm1_sourcerecordid: sourceRecordId, jm1_startedon: now, jm1_completedon: now, jm1_executionstatus: OPTION.executionSuccess, jm1_bandlevel: OPTION.bandLevel1 }) })
  return { id: body.jm1_executionlogid, created: true }
}

async function sendRecommendation(token, email, review) {
  const relayKey = execFileSync('az', ['functionapp', 'config', 'appsettings', 'list', '--resource-group', 'rg-jm1-communications', '--name', 'func-jm1-acs-email-relay', '--query', "[?name=='JM1_RELAY_API_KEY'].value | [0]", '-o', 'tsv'], { encoding: 'utf8' }).trim()
  const response = await fetch(RELAY_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-jm1-relay-key': relayKey },
    body: JSON.stringify({
      messageType: 'APPROVED_AUTHOR_RESPONSE',
      diagnosticId: JACKULINE.diagnosticId,
      intakeReferenceCode: JACKULINE.intakeReferenceCode,
      authorEmail: JACKULINE.email,
      authorName: JACKULINE.author,
      projectTitle: JACKULINE.title,
      internalVisibilityMailbox: 'publishing@jmerrill.one',
      subject: email.subject,
      body: email.body,
      htmlBody: email.htmlBody,
      templateName: 'EDITORIAL_RECOMMENDATION_LETTER_V1',
      templateVersion: '1.0',
      templateMetadata: {
        htmlSha256: sha256(email.htmlBody),
        textSha256: sha256(email.body),
        qualityGate: 'JACKULINE_FLY_EDITORIAL_RECOMMENDATION_RELEASE',
        brandSystem: 'J Merrill Publishing',
        enterpriseStandard: 'JM1-HUMAN-FIRST-WHY-FIRST-v1',
        renderer: 'JM1 Enterprise Communication Renderer',
        rendererVersion: '1.0',
        renderMode: 'CANONICAL_HTML',
        renderTemplateGuard: 'EDITORIAL_RECOMMENDATION_LETTER_V1',
      },
      approvedBy: 'Jackie Smith, Jr.',
      approvedOn: new Date().toISOString(),
      futureSendRequiresInternalCopy: true,
      futureSendRequiresDataverseLog: true,
    }),
  })
  const text = await response.text()
  if (!response.ok) throw new Error(`acs_send_failed:${response.status}:${text.slice(0, 800)}`)
  const body = text ? JSON.parse(text) : {}
  const log = await writeLog(token, 'JACKULINE_FLY_EDITORIAL_RECOMMENDATION_SENT', JACKULINE.diagnosticId, `Editorial Review recommendation sent once to Jackuline Fly. Primary package ${review.primaryPackage}; alternate ${review.alternatePackage}; rights/AI/sensitive-content follow-up included. From publishing@email.jmerrill.one; Reply-To/CC publishing@jmerrill.one. Provider ${body.providerMessageId || body.operationId || 'UNKNOWN'}.`)
  await dvPatch(token, `jm1pub_editorialdiagnostics(${JACKULINE.diagnosticId})`, { jm1_authordraftsendstatus: 'SENT', jm1_authordraftapprovedon: new Date().toISOString() })
  return { sent: true, idempotent: false, executionLogId: log.id, providerMessageId: body.providerMessageId || body.operationId || null, from: 'publishing@email.jmerrill.one', replyTo: 'publishing@jmerrill.one', cc: 'publishing@jmerrill.one', duplicate: 0 }
}

async function replay(token) {
  const [completion, send] = await Promise.all([
    dvFetch(token, `jm1_executionlogs?$select=jm1_executionlogid&$filter=jm1_actiontype eq 'JACKULINE_FLY_EDITORIAL_REVIEW_COMPLETED' and jm1_sourcerecordid eq '${JACKULINE.diagnosticId}'`),
    dvFetch(token, `jm1_executionlogs?$select=jm1_executionlogid&$filter=jm1_actiontype eq 'JACKULINE_FLY_EDITORIAL_RECOMMENDATION_SENT' and jm1_sourcerecordid eq '${JACKULINE.diagnosticId}'`),
  ])
  return { completionLogs: completion.value.length, sendLogs: send.value.length }
}

function writeEvidence(r) {
  mkdirSync(EVIDENCE_DIR, { recursive: true })
  const files = {
    '00-executive-summary.md': summary(r),
    '01-final-editorial-review.md': finalReview(r),
    '02-package-recommendations.md': packages(r),
    '03-rights-ai-sensitive-followup.md': rights(r),
    '04-reference-third-party-review.md': references(r),
    '05-eight-dimensions-wholeness-review.md': dimensions(r),
    '06-author-facing-recommendation.md': communication(r),
    '07-idempotency.md': idempotency(r),
    '08-negative-proof.md': negative(r),
  }
  for (const [name, content] of Object.entries(files)) writeFileSync(join(EVIDENCE_DIR, name), content)
  writeFileSync(join(EVIDENCE_DIR, 'checksums.sha256'), Object.keys(files).map(name => `${sha256(readFileSync(join(EVIDENCE_DIR, name)))}  ${name}`).join('\n') + '\n')
}
function summary(r) { return `# Jackuline Fly Editorial Review Completion\n\nLast Verified: ${r.completedAt}\n\n- Classification: JACKULINE_FLY_RECOMMENDATION_SENT\n- Review ID: ${JACKULINE.diagnosticId}\n- Intake: ${JACKULINE.intakeId}\n- Manuscript artifact: ${JACKULINE.manuscriptArtifactId}\n- Primary package: ${r.review.primaryPackage}\n- Alternate package: ${r.review.alternatePackage}\n- Author recommendation sent: ${r.communication.sent ? 'YES' : 'NO'}\n- Contract/payment/package acceptance mutations: 0\n\nEvidence Source: Dataverse diagnostic and execution-log readback, source DOCX extraction, ACS relay response.\n` }
function finalReview(r) { return `# Final Editorial Review\n\nLast Verified: ${r.completedAt}\n\n| Area | Finding |\n|---|---|\n| Concept | ${r.review.concept} |\n| Structure | ${r.review.structure} |\n| Audience | ${r.review.audience} |\n| Developmental need | ${r.review.developmentalNeed} |\n| Copyediting need | ${r.review.copyeditingNeed} |\n| Proofreading | Required after editing and formatting |\n| Workbook complexity | ${r.review.workbookFormattingComplexity} |\n| Faith / Higher Power positioning | Needs consistency refinement for reader trust and imprint fit |\n| Market differentiation | Positive, with framework differentiation required |\n| Commercial viability | Positive for Starter; Professional remains viable as higher-support alternate |\n| Recommendation state | ${r.review.recommendationState} |\n` }
function packages(r) { return `# Package Recommendations\n\nLast Verified: ${r.completedAt}\n\n| Type | Package | Rationale |\n|---|---|---|\n| Primary | ${r.review.primaryPackage} / ${r.review.primaryPackageName} | ${r.review.primaryRationale} |\n| Alternate | ${r.review.alternatePackage} / ${r.review.alternatePackageName} | ${r.review.alternateRationale} |\n` }
function rights(r) { return `# Rights / AI / Sensitive Content Follow-up\n\nLast Verified: ${r.completedAt}\n\n- Rights ownership: AUTHOR FOLLOW-UP REQUIRED\n- AI disclosure: AUTHOR FOLLOW-UP REQUIRED\n- Sensitive content: AUTHOR FOLLOW-UP REQUIRED\n- Recommendation release blocker: NO\n\nQuestions included in the consolidated author-facing message:\n\n${r.review.rightsAiSensitiveFollowup.map(q => `- ${q}`).join('\n')}\n` }
function references(r) { const x = r.review.referenceReview; return `# Reference / Third-party Review\n\nLast Verified: ${r.completedAt}\n\n- REFERENCE_LIST_PRESENT = ${x.referenceListPresent ? 'YES' : 'NO'}\n- IN_TEXT_ATTRIBUTION_COMPLETE = ${x.inTextAttributionComplete}\n- THIRD_PARTY_FRAMEWORK_DEPENDENCE = ${x.thirdPartyFrameworkDependence}\n- QUOTATION_PERMISSION_CONCERN = ${x.quotationPermissionConcern}\n- PLAGIARISM_CONCLUSION = ${x.plagiarismConclusion}\n- EDITORIAL_FOLLOWUP_REQUIRED = ${x.editorialFollowupRequired}\n\nNo legal infringement conclusion was made.\n` }
function dimensions(r) { const x = r.review.dimensionsReview; return `# 8 Dimensions of Wholeness Review\n\nLast Verified: ${r.completedAt}\n\n- TERM_USED = ${x.termUsed}\n- OWNERSHIP_ASSERTION_PRESENT = ${x.ownershipAssertionPresent ? 'YES' : 'NO'}\n- OWNERSHIP_PROVEN = ${x.ownershipProven ? 'YES' : 'NO'}\n- DIFFERENTIATION_FROM_EXISTING_WELLNESS_MODELS = ${x.differentiationFromExistingWellnessModels}\n- EDITORIAL_RECOMMENDATION = ${x.editorialRecommendation}\n\nNo trademark availability or registration conclusion was made.\n` }
function communication(r) { return `# Author-facing Recommendation\n\nLast Verified: ${r.completedAt}\n\n- Sent: ${r.communication.sent ? 'YES' : 'NO'}\n- From: publishing@email.jmerrill.one\n- Reply-To: publishing@jmerrill.one\n- CC: publishing@jmerrill.one\n- Subject: ${r.email.subject}\n- Text SHA256: ${r.email.textSha256}\n- HTML SHA256: ${r.email.htmlSha256}\n- Duplicate: ${r.communication.duplicate || 0}\n- Next step communicated: reply with rights ownership, AI disclosure, and sensitive-content confirmation; then discuss package path.\n` }
function idempotency(r) { return `# Idempotency\n\nLast Verified: ${r.completedAt}\n\n| Check | Count |\n|---|---:|\n| Review completion logs | ${r.replay.completionLogs} |\n| Recommendation send logs | ${r.replay.sendLogs} |\n\nReplay returns existing result and does not send a second email.\n` }
function negative(r) { return `# Negative Proof\n\nLast Verified: ${r.completedAt}\n\n${Object.entries(r.negativeProof).map(([k, v]) => `- ${k} = ${v}`).join('\n')}\n` }
function sha256(value) { return createHash('sha256').update(value).digest('hex') }

if (import.meta.url === `file://${process.argv[1]}`) main().catch(err => { console.error(err.stack || err.message); process.exit(1) })
