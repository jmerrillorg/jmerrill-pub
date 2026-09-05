import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import crypto from 'node:crypto'

const DEV_URL = 'https://org52409ff2.crm.dynamics.com'
const DEV_ORG_ID = '579864ae-44cc-f011-95c7-000d3a37fe06'
const LIFECYCLE_ID = '645dcc16-93a7-f111-b8dd-000d3a30bedf'
const ROOT = 'JMP-PUBLISHING-V2-COMMISSIONING-THE-INTENTIONAL-LEADER-VOL1-INTAKE-REMEDIATION-2026-09-05/evidence'
const OUTPUT = `${ROOT}/dataverse/synthetic_intake_test_results.json`

async function main() {
  const request = createClient(DEV_URL)
  const who = await request('WhoAmI()')
  if (String(who.OrganizationId).toLowerCase() !== DEV_ORG_ID) throw new Error('not_development_environment')

  const run = `INTAKE-REMEDIATION-${Date.now()}`
  const authorId = crypto.randomUUID()
  const inquiry = await request('jmpv2_inquiries', {
    method: 'POST', headers: { Prefer: 'return=representation' },
    body: JSON.stringify({ jmpv2_inquirykey: `${run}-inquiry`, jmpv2_prospectname: 'Synthetic Intake Author', jmpv2_workingtitle: `${run} Test Title`, jmpv2_lifecycleid: LIFECYCLE_ID, jmpv2_inquirystatus: 'INQUIRY_RECEIVED', jmpv2_testclassification: 'INTAKE_REMEDIATION_SYNTHETIC_ONLY' }),
  })
  const intake = await request('jmpv2_intakesubmissions', {
    method: 'POST', headers: { Prefer: 'return=representation' },
    body: JSON.stringify({ jmpv2_intakekey: `${run}-intake`, jmpv2_inquirykey: `${run}-inquiry`, jmpv2_lifecycleid: LIFECYCLE_ID, jmpv2_fullname: 'Synthetic Intake Author', jmpv2_workingtitle: `${run} Test Title`, jmpv2_returningauthorcontactid: authorId, jmpv2_completenessstatus: 'REQUIRES_CLARIFICATION', jmpv2_completenessreasons: 'MISSING_TARGET_AUDIENCE;RIGHTS_PROVENANCE_DISCLOSURE_REQUIRES_CURRENT_CONFIRMATION;SENSITIVE_CONTENT_DISCLOSURE_REQUIRES_CURRENT_CONFIRMATION;ACCESSIBILITY_INFORMATION_REQUIRES_CURRENT_CONFIRMATION;SERIES_INFORMATION_REQUIRES_CURRENT_CONFIRMATION', jmpv2_disposition: 'SYNTHETIC_ACTIVE', jmpv2_testclassification: 'INTAKE_REMEDIATION_SYNTHETIC_ONLY' }),
  })

  const ids = { inquiryId: inquiry.jmpv2_inquiryid, intakeId: intake.jmpv2_intakesubmissionid, lifecycleId: LIFECYCLE_ID, authorId }
  const results = []
  async function test(name, work) {
    try { const detail = await work(); results.push({ name, status: 'PASS', detail }) }
    catch (error) { results.push({ name, status: 'FAIL', error: String(error?.message || error) }) }
  }

  const invoke = (responses, mode = 'SAVE', overrides = {}) => request('jmpv2_SaveIntakeResponses', {
    method: 'POST', body: JSON.stringify({ AuthorContactId: authorId, PublishingEngagementId: inquiry.jmpv2_inquiryid, LifecycleInstanceId: LIFECYCLE_ID, IntakeSubmissionId: intake.jmpv2_intakesubmissionid, ResponsesJson: JSON.stringify(responses), Mode: mode, AuthorityContext: 'SYNTHETIC_TEST', V2CorrelationId: `${run}-${crypto.randomUUID()}`, ...overrides }),
  })

  await test('partial save accepted', async () => assert((await invoke({ TARGET_AUDIENCE: 'Leaders building intentional teams.' })).Accepted === true))
  await test('partial save remains incomplete', async () => assert((await getIntake(request, ids.intakeId)).jmpv2_completenessstatus === 'REQUIRES_CLARIFICATION'))
  await test('partial save has four deterministic reasons', async () => assert(String((await getIntake(request, ids.intakeId)).jmpv2_completenessreasons).split(';').length === 4))
  await test('partial response persists', async () => assert((await getResponses(request, ids.intakeId)).some(row => row.jmpv2_questioncode === 'TARGET_AUDIENCE' && row.jmpv2_responsevalue)))
  await test('lifecycle remains Stage 02', async () => assert((await getLifecycle(request)).jmpv2_currentstagecode === '02_INTAKE'))
  await test('wrong author denied', async () => expectDenied(() => invoke({}, 'SAVE', { AuthorContactId: crypto.randomUUID() }), 'AUTHOR_NOT_AUTHORIZED'))
  await test('wrong engagement denied', async () => expectDenied(() => invoke({}, 'SAVE', { PublishingEngagementId: crypto.randomUUID() }), 'Does Not Exist'))
  await test('wrong lifecycle denied', async () => expectDenied(() => invoke({}, 'SAVE', { LifecycleInstanceId: crypto.randomUUID() }), 'Does Not Exist'))
  await test('wrong intake denied', async () => expectDenied(() => invoke({}, 'SAVE', { IntakeSubmissionId: crypto.randomUUID() }), 'Does Not Exist'))
  await test('unknown question denied', async () => expectDenied(() => invoke({ WRONG_FIELD: 'bad' }), 'UNKNOWN_INTAKE_QUESTION'))
  await test('direct response create denied', async () => expectDenied(() => request('jmpv2_intakeresponses', { method: 'POST', body: JSON.stringify({ jmpv2_responsekey: `${run}-direct` }) }), 'DIRECT_INTAKE_RESPONSE_WRITE_DENIED'))
  await test('direct completeness write denied', async () => expectDenied(() => request(`jmpv2_intakesubmissions(${ids.intakeId})`, { method: 'PATCH', body: JSON.stringify({ jmpv2_completenessstatus: 'COMPLETE' }) }), 'DIRECT_INTAKE_COMPLETENESS_WRITE_DENIED'))

  await test('remaining answers save', async () => assert((await invoke({ RIGHTS_PROVENANCE: 'Confirmed.', SENSITIVE_CONTENT: 'None.', ACCESSIBILITY_INFORMATION: 'No additional considerations.', SERIES_INFORMATION: 'Not part of a series.' })).Accepted === true))
  await test('all-answer save is ready not complete', async () => assert((await getIntake(request, ids.intakeId)).jmpv2_completenessstatus === 'READY_TO_SUBMIT'))
  await test('submission is required', async () => assert((await getIntake(request, ids.intakeId)).jmpv2_completenessreasons === 'AUTHOR_SUBMISSION_REQUIRED'))
  await test('five response rows exist', async () => assert((await getResponses(request, ids.intakeId)).length === 5))
  await test('replay does not duplicate response', async () => { await invoke({ TARGET_AUDIENCE: 'Leaders building intentional teams.' }); assert((await getResponses(request, ids.intakeId)).length === 5) })
  await test('response version increments', async () => assert((await getResponses(request, ids.intakeId)).find(row => row.jmpv2_questioncode === 'TARGET_AUDIENCE').jmpv2_responseversion >= 2))
  await test('response authority context recorded', async () => assert((await getResponses(request, ids.intakeId)).every(row => row.jmpv2_authoritycontext === 'SYNTHETIC_TEST')))
  await test('response correlation recorded', async () => assert((await getResponses(request, ids.intakeId)).every(row => row.jmpv2_correlationid)))
  await test('response environment is authoritative', async () => assert((await getResponses(request, ids.intakeId)).every(row => row.jmpv2_environment === 'JM1-Dev')))
  await test('complete submission accepted', async () => assert((await invoke(Object.fromEntries((await getResponses(request, ids.intakeId)).map(row => [row.jmpv2_questioncode, row.jmpv2_responsevalue])), 'SUBMIT')).Accepted === true))
  await test('completeness derives complete', async () => assert((await getIntake(request, ids.intakeId)).jmpv2_completenessstatus === 'COMPLETE'))
  await test('submitted timestamp derives', async () => assert(Boolean((await getIntake(request, ids.intakeId)).jmpv2_submittedat)))
  await test('completion reasons cleared', async () => assert(!(await getIntake(request, ids.intakeId)).jmpv2_completenessreasons))
  await test('all response rows submitted', async () => assert((await getResponses(request, ids.intakeId)).every(row => row.jmpv2_submissionstatus === 'SUBMITTED')))
  await test('direct response update denied', async () => { const row = (await getResponses(request, ids.intakeId))[0]; await expectDenied(() => request(`jmpv2_intakeresponses(${row.jmpv2_intakeresponseid})`, { method: 'PATCH', body: JSON.stringify({ jmpv2_responsevalue: 'tampered' }) }), 'DIRECT_INTAKE_RESPONSE_WRITE_DENIED') })
  await test('direct response delete denied', async () => { const row = (await getResponses(request, ids.intakeId))[0]; await expectDenied(() => request(`jmpv2_intakeresponses(${row.jmpv2_intakeresponseid})`, { method: 'DELETE' }), 'DIRECT_INTAKE_RESPONSE_WRITE_DENIED') })
  await test('lifecycle still Stage 02 after submit', async () => assert((await getLifecycle(request)).jmpv2_currentstagecode === '02_INTAKE'))
  await test('environment config resolves development identity', async () => { const rows = await request(`jmpv2_environmentauthorities?$filter=jmpv2_organizationid eq '${DEV_ORG_ID}'`); assert(rows.value[0].jmpv2_environmentname === 'JM1-Dev') })

  const evidence = { startedAt: new Date().toISOString(), environment: 'JM1-Dev', whoAmI: who, run, ids, tests: results, passed: results.filter(row => row.status === 'PASS').length, failed: results.filter(row => row.status === 'FAIL').length, completedAt: new Date().toISOString() }
  fs.writeFileSync(OUTPUT, `${JSON.stringify(evidence, null, 2)}\n`)
  console.log(JSON.stringify({ status: evidence.failed ? 'FAIL' : 'PASS', passed: evidence.passed, failed: evidence.failed, output: OUTPUT }, null, 2))
  if (evidence.failed) process.exitCode = 1
}

async function getIntake(request, id) { return request(`jmpv2_intakesubmissions(${id})?$select=jmpv2_completenessstatus,jmpv2_completenessreasons,jmpv2_submittedat`) }
async function getLifecycle(request) { return request(`jmpv2_lifecycleinstances(${LIFECYCLE_ID})?$select=jmpv2_currentstagecode`) }
async function getResponses(request, intakeId) { return (await request(`jmpv2_intakeresponses?$select=jmpv2_intakeresponseid,jmpv2_questioncode,jmpv2_responsevalue,jmpv2_responseversion,jmpv2_submissionstatus,jmpv2_authoritycontext,jmpv2_correlationid,jmpv2_environment&$filter=jmpv2_intakesubmissionid eq '${intakeId}'`)).value }
async function expectDenied(work, marker) { try { await work(); throw new Error('request_was_not_denied') } catch (error) { if (String(error.message).includes('request_was_not_denied') || !String(error.message).includes(marker)) throw error } }
function assert(condition) { if (!condition) throw new Error('assertion_failed'); return true }

function createClient(resourceUrl) {
  const token = execFileSync('az', ['account', 'get-access-token', '--resource', resourceUrl, '--query', 'accessToken', '-o', 'tsv'], { encoding: 'utf8' }).trim()
  return async (path, options = {}) => {
    const response = await fetch(`${resourceUrl}/api/data/v9.2/${path}`, { ...options, headers: { Authorization: `Bearer ${token}`, Accept: 'application/json', 'Content-Type': 'application/json', 'OData-Version': '4.0', 'OData-MaxVersion': '4.0', ...(options.headers || {}) } })
    const raw = await response.text(); const body = raw ? JSON.parse(raw) : null
    if (!response.ok) throw new Error(`${options.method || 'GET'} ${path} failed ${response.status}: ${raw.slice(0, 1000)}`)
    return body
  }
}

main().catch(error => { console.error(error); process.exitCode = 1 })
