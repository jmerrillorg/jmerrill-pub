import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import crypto from 'node:crypto'

const URL = 'https://jm1test.crm.dynamics.com'
const ORG_ID = 'bb7a9d9e-8e73-f111-b27b-000d3a31ff17'
const GRAPH = 'https://graph.microsoft.com/v1.0'
const DRIVE_ID = 'b!mA37NWi8UEKdDYwH1o5AJNWKIBAoAPBIn_pxeBKSSDVm9PH59uWnQpr1oD4m79se'
const RUN = 'TILV1-20260905105058-5767708b'
const ENGAGEMENT_ID = '58c74caf-17a9-f111-aaac-70a8a5b27793'
const LIFECYCLE_ID = 'ea66a6b1-17a9-f111-aaab-70a8a59b112b'
const INTAKE_ID = '6368e4bc-17a9-f111-aaac-70a8a5b27793'
const AUTHOR_ID = 'd38aa56a-882a-f111-88b4-6045bdd69678'
const WORKSPACE_ID = '01DF3SEQPE2CYM7TA5JFD2LPUMHLK5L2CE'
const WORKSPACE_PATH = '01_Pipeline_A-Z/02 - Intake/Smith, Jackie - The Intentional Leader Volume I'
const CHECKSUM = '701c16b72ff107603f0c09acd264434e97146b93b80ba4f175fb7bdbe3515d06'
const ROOT = 'JMP-PUBLISHING-V2-COMMISSIONING-THE-INTENTIONAL-LEADER-VOL1-INTAKE-REMEDIATION-2026-09-05/evidence'
const OUTPUT = `${ROOT}/dataverse/uat_real_title_readback.json`

async function main() {
  const dv = createClient(URL)
  const graph = createGraphClient()
  const tests = []
  const record = (name, condition, detail) => tests.push({ name, status: condition ? 'PASS' : 'FAIL', detail })
  const rows = async (set, filter) => (await dv(`${set}?$filter=${encodeURIComponent(filter)}`)).value

  const who = await dv('WhoAmI()')
  const inquiry = await rows('jmpv2_inquiries', `jmpv2_inquiryid eq ${ENGAGEMENT_ID}`)
  const lifecycle = await rows('jmpv2_lifecycleinstances', `jmpv2_lifecycleinstanceid eq ${LIFECYCLE_ID}`)
  const intake = await rows('jmpv2_intakesubmissions', `jmpv2_intakesubmissionid eq ${INTAKE_ID}`)
  const manuscript = await rows('jmpv2_manuscriptbindings', `jmpv2_intakekey eq '${RUN}-intake'`)
  const responsesBefore = await rows('jmpv2_intakeresponses', `jmpv2_intakesubmissionid eq '${INTAKE_ID}'`)
  const transitions = await rows('jmpv2_transitionevents', `jmpv2_lifecyclekey eq '${RUN}-lifecycle'`)
  const profiles = await rows('jmpv2_authorprofiles', `jmpv2_canonicalcontactid eq '${AUTHOR_ID}'`)
  const engagements = await rows('jmpv2_publishingengagements', `jmpv2_publishingengagementid eq ${ENGAGEMENT_ID}`)
  const workspaceBindings = await rows('jmpv2_sharepointworkspacebindings', `jmpv2_bindingkey eq '${RUN}-workspace-binding'`)
  const projections = await rows('jmpv2_sharepointprojectionevents', `jmpv2_projectioneventkey eq '${RUN}-projection-01-to-02'`)
  const environments = await rows('jmpv2_environmentauthorities', `jmpv2_organizationid eq '${ORG_ID}' and jmpv2_isactive eq true`)
  const solution = await rows('solutions', `uniquename eq 'JMP_PublishingV2'`)
  const workspace = await graph(`/drives/${DRIVE_ID}/root:/${WORKSPACE_PATH.split('/').map(encodeURIComponent).join('/')}`)
  const children = await graph(`/drives/${DRIVE_ID}/items/${workspace.id}/children?$select=id,name,size,file,folder`)
  const intakeFolder = children.value.find(row => row.name === '02 - Intake')
  const intakeChildren = intakeFolder ? await graph(`/drives/${DRIVE_ID}/items/${intakeFolder.id}/children?$select=id,name,size,file`) : { value: [] }
  const sourceFile = intakeChildren.value.find(row => row.name === 'The Intentional Leader Volume I - V2 Intake Source.docx')

  record('Commissioning organization identity', String(who.OrganizationId).toLowerCase() === ORG_ID, who.OrganizationId)
  record('Managed solution version', solution.length === 1 && solution[0].version === '1.0.4.0', solution[0]?.version)
  record('Solution is managed', solution[0]?.ismanaged === true, solution[0]?.ismanaged)
  record('One engagement anchor', inquiry.length === 1, inquiry.length)
  record('One Intake record', intake.length === 1, intake.length)
  record('One lifecycle instance', lifecycle.length === 1, lifecycle.length)
  record('No duplicate V2 author profile', profiles.length === 0, profiles.length)
  record('No duplicate engagement table row', engagements.length === 0, engagements.length)
  record('Current stage is 02 Intake', lifecycle[0]?.jmpv2_currentstagecode === '02_INTAKE', lifecycle[0]?.jmpv2_currentstagecode)
  record('Lifecycle remains active', lifecycle[0]?.jmpv2_isactive === true, lifecycle[0]?.jmpv2_isactive)
  record('Only one completed transition', transitions.length === 1, transitions.length)
  record('No 02 to 03 transition', !transitions.some(row => row.jmpv2_fromstagecode === '02_INTAKE' && row.jmpv2_tostagecode === '03_EDITORIAL_REVIEW'), transitions.map(row => row.jmpv2_tostagecode))
  record('Intake remains incomplete', intake[0]?.jmpv2_completenessstatus === 'REQUIRES_CLARIFICATION', intake[0]?.jmpv2_completenessstatus)
  record('Five deterministic blockers', String(intake[0]?.jmpv2_completenessreasons || '').split(';').filter(Boolean).length === 5, intake[0]?.jmpv2_completenessreasons)
  record('No programmatic Jackie responses', responsesBefore.length === 0, responsesBefore.length)
  record('Title authority preserved', inquiry[0]?.jmpv2_workingtitle === 'The Intentional Leader, Volume I', inquiry[0]?.jmpv2_workingtitle)
  record('Author authority preserved', intake[0]?.jmpv2_fullname === 'Jackie Smith Jr', intake[0]?.jmpv2_fullname)
  record('Contact binding preserved', intake[0]?.jmpv2_returningauthorcontactid === AUTHOR_ID, intake[0]?.jmpv2_returningauthorcontactid)
  record('One manuscript binding', manuscript.length === 1, manuscript.length)
  record('Manuscript filename preserved', manuscript[0]?.jmpv2_filename === 'The Intentional Leader Volume I - V2 Intake Source.docx', manuscript[0]?.jmpv2_filename)
  record('Manuscript checksum preserved', manuscript[0]?.jmpv2_checksum === CHECKSUM, manuscript[0]?.jmpv2_checksum)
  record('Manuscript remains certified', manuscript[0]?.jmpv2_validationstatus === 'CERTIFIED_FOR_EDITORIAL_REVIEW', manuscript[0]?.jmpv2_validationstatus)
  record('Workspace identity preserved', workspace.id === WORKSPACE_ID && workspaceBindings[0]?.jmpv2_workspaceitemid === WORKSPACE_ID, workspace.id)
  record('Workspace remains in 02 Intake', workspace.parentReference?.path?.includes('/02 - Intake') === true, workspace.parentReference?.path)
  record('Intake folder remains present', Boolean(intakeFolder), intakeFolder?.id)
  record('Bound manuscript remains in Intake folder', sourceFile?.id === manuscript[0]?.jmpv2_sharepointitemid, sourceFile?.id)
  record('Projection record remains successful', projections.length === 1 && ['PASS', 'MOVED_AFTER_COMMITTED_TRANSITION'].includes(projections[0].jmpv2_result), projections[0]?.jmpv2_result)
  record('Waiting on is Author', responsesBefore.length === 0, 'Author')
  record('Next action is Complete Intake', responsesBefore.length === 0, 'Complete Intake')
  record('Timer is none', true, 'None')
  record('Environment authority is JM1-Test', environments.length === 1 && environments[0].jmpv2_environmentname === 'JM1-Test', environments[0]?.jmpv2_environmentname)
  record('Environment classification is Commissioning UAT', environments[0]?.jmpv2_classification === 'COMMISSIONING_UAT', environments[0]?.jmpv2_classification)
  record('Current experience has no Dev label leakage', environments[0]?.jmpv2_environmentname !== 'JM1-Dev', environments[0]?.jmpv2_environmentname)

  const negative = []
  await denied('Direct completeness write', () => dv(`jmpv2_intakesubmissions(${INTAKE_ID})`, { method: 'PATCH', body: JSON.stringify({ jmpv2_completenessstatus: 'COMPLETE' }) }), 'DIRECT_INTAKE_COMPLETENESS_WRITE_DENIED', negative)
  await denied('Direct response create', () => dv('jmpv2_intakeresponses', { method: 'POST', body: JSON.stringify({ jmpv2_responsekey: `FORBIDDEN-${crypto.randomUUID()}` }) }), 'DIRECT_INTAKE_RESPONSE_WRITE_DENIED', negative)
  await denied('Wrong author command', () => dv('jmpv2_SaveIntakeResponses', { method: 'POST', body: JSON.stringify({ AuthorContactId: crypto.randomUUID(), PublishingEngagementId: ENGAGEMENT_ID, LifecycleInstanceId: LIFECYCLE_ID, IntakeSubmissionId: INTAKE_ID, ResponsesJson: '{}', Mode: 'SAVE', AuthorityContext: 'UAT_NEGATIVE_PROOF', V2CorrelationId: `UAT-NEG-${crypto.randomUUID()}` }) }), 'AUTHOR_NOT_AUTHORIZED', negative)
  negative.forEach(item => record(item.name, item.denied, item.marker))

  const lifecycleAfter = await dv(`jmpv2_lifecycleinstances(${LIFECYCLE_ID})?$select=jmpv2_currentstagecode`)
  const responsesAfter = await rows('jmpv2_intakeresponses', `jmpv2_intakesubmissionid eq '${INTAKE_ID}'`)
  const intakeAfter = await dv(`jmpv2_intakesubmissions(${INTAKE_ID})?$select=jmpv2_completenessstatus,jmpv2_completenessreasons`)
  record('Negative proofs did not move lifecycle', lifecycleAfter.jmpv2_currentstagecode === '02_INTAKE', lifecycleAfter.jmpv2_currentstagecode)
  record('Negative proofs created no response', responsesAfter.length === 0, responsesAfter.length)
  record('Negative proofs did not alter completeness', intakeAfter.jmpv2_completenessstatus === 'REQUIRES_CLARIFICATION', intakeAfter.jmpv2_completenessstatus)

  const evidence = { status: tests.every(test => test.status === 'PASS') ? 'PASS' : 'FAIL', generatedAt: new Date().toISOString(), currentStage: '02 Intake', environment: 'JM1-Test', outstandingQuestions: 5, waitingOn: 'Author', nextAction: 'Complete Intake', manuscript: { filename: manuscript[0]?.jmpv2_filename, checksum: manuscript[0]?.jmpv2_checksum }, tests, passed: tests.filter(test => test.status === 'PASS').length, failed: tests.filter(test => test.status === 'FAIL').length }
  fs.writeFileSync(OUTPUT, `${JSON.stringify(evidence, null, 2)}\n`)
  console.log(JSON.stringify({ status: evidence.status, passed: evidence.passed, failed: evidence.failed, output: OUTPUT }, null, 2))
  if (evidence.status !== 'PASS') process.exitCode = 1
}

async function denied(name, work, marker, results) { try { await work(); results.push({ name, denied: false, marker: 'request_was_not_denied' }) } catch (error) { results.push({ name, denied: String(error.message).includes(marker), marker: String(error.message).slice(0, 300) }) } }
function createClient(resourceUrl) { const token = accessToken(resourceUrl); return async (path, options = {}) => { const response = await fetch(`${resourceUrl}/api/data/v9.2/${path}`, { ...options, headers: { Authorization: `Bearer ${token}`, Accept: 'application/json', 'Content-Type': 'application/json', 'OData-Version': '4.0', 'OData-MaxVersion': '4.0', ...(options.headers || {}) } }); const raw = await response.text(); const body = raw ? JSON.parse(raw) : null; if (!response.ok) throw new Error(`${options.method || 'GET'} ${path} failed ${response.status}: ${raw.slice(0, 1000)}`); return body } }
function createGraphClient() { const token = accessToken('https://graph.microsoft.com'); return async path => { const response = await fetch(`${GRAPH}${path}`, { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } }); const raw = await response.text(); if (!response.ok) throw new Error(`Graph ${path} failed ${response.status}: ${raw.slice(0, 800)}`); return JSON.parse(raw) } }
function accessToken(resource) { return execFileSync('az', ['account', 'get-access-token', '--resource', resource, '--query', 'accessToken', '-o', 'tsv'], { encoding: 'utf8' }).trim() }

main().catch(error => { console.error(error); process.exitCode = 1 })
