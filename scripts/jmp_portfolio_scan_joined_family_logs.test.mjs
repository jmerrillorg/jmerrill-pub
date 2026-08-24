import assert from 'node:assert/strict'
import test from 'node:test'
import { evaluatePortfolio } from '../lib/publishing/portfolio/automation-controller.mjs'
import { buildControllerRecords } from './jmp_portfolio_automation_controller_scan.mjs'

test('portfolio scan consumes Joined-the-Family execution logs before queuing onboarding consequences', () => {
  const opportunityId = '455daa4a-629f-f111-b8dc-6045bdd69678'
  const titleId = 'fd577d2b-01a0-f111-b8dc-000d3a14673b'
  const source = {
    titles: [{
      jm1pub_titleid: titleId,
      jm1pub_titlename: 'Indomitable',
      jm1pub_authordisplayname: 'Quanisha Dockery',
      'jm1pub_stage@OData.Community.Display.V1.FormattedValue': 'Editorial',
      'jm1_lifecyclestage@OData.Community.Display.V1.FormattedValue': 'Editing',
      modifiedon: '2026-08-24T21:17:27Z',
      createdon: '2026-08-24T21:17:27Z',
    }],
    intakes: [],
    opportunities: [{
      opportunityid: opportunityId,
      jm1pub_projecttitle: 'Indomitable',
      name: 'Indomitable - Professional Publishing Package - Quanisha Dockery',
      jm1_m6selectedinstallmentcount: 24,
      'jm1_m6agreementpreparationstatus@OData.Community.Display.V1.FormattedValue': 'AGREEMENT_SIGNED_ACTIVE',
      'jm1_m6firstpaymentstatus@OData.Community.Display.V1.FormattedValue': 'Paid Confirmed',
      'jm1_m6authorportalstatus@OData.Community.Display.V1.FormattedValue': 'Active',
      'jm1pub_contractstatus@OData.Community.Display.V1.FormattedValue': 'Signed',
      modifiedon: '2026-08-24T21:17:27Z',
      createdon: '2026-08-24T10:15:38Z',
    }],
    authorProfiles: [],
    stages: [{
      jm1pub_editorialstageid: '0f587d2b-01a0-f111-b8dc-000d3a14673b',
      _jm1pub_titleid_value: titleId,
      jm1pub_name: 'Developmental Editing - Indomitable',
      'jm1pub_stagetype@OData.Community.Display.V1.FormattedValue': 'Developmental',
      'jm1pub_stagestatus@OData.Community.Display.V1.FormattedValue': 'Not Started',
      modifiedon: '2026-08-24T21:17:27Z',
      createdon: '2026-08-24T21:17:27Z',
    }],
    gates: [],
    artifacts: [{
      jm1pub_editorialartifactid: 'c373402b-01a0-f111-b8db-7c1e525801f6',
      _jm1pub_titleid_value: titleId,
      jm1pub_filename: 'Indomitable_Compiled_Batch1_2.docx',
      jm1pub_sha256: '08cedd4d4db470887ea75e792359c6b4fa807f54bf09f2b50be0144f5e7f7181',
      modifiedon: '2026-08-24T21:17:27Z',
      createdon: '2026-08-24T21:17:27Z',
    }],
    productionProjects: [],
    productionTasks: [],
    logs: [{
      jm1_executionlogid: '080294cc-fb9f-f111-b8db-7c1e525801f6',
      jm1_name: `JOINED-THE-FAMILY-${opportunityId}`,
      jm1_actiontype: 'JOINED_THE_FAMILY',
      jm1_sourcerecordid: opportunityId,
      createdon: '2026-08-24T20:38:53Z',
    }],
  }

  const records = buildControllerRecords(source)
  const indomitable = records.find((record) => record.title === 'Indomitable')
  assert.equal(indomitable.joinedFamily, true)
  assert.match(indomitable.notes, /JOINED_THE_FAMILY/)

  const evaluation = evaluatePortfolio(records, { evaluatedOn: '2026-08-24T21:30:00Z' })
  const item = evaluation.items.find((row) => row.title === 'Indomitable')
  assert.notEqual(item.bucket, 'AUTO_QUEUE_NOW')
  assert.notEqual(item.nextGovernedAction, 'Evaluate Joined-the-Family consequence and workspace/onboarding provisioning')
})
