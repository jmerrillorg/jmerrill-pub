import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const OUT_DIR = 'docs/operations/generated/JMP-MASTER-ASSET-RECOVERY-CENSUS-2026-08-15'
const NOW = new Date().toISOString()
const API_BASE = 'https://jm1hq.crm.dynamics.com/api/data/v9.2'
const RESOURCE = 'https://jm1hq.crm.dynamics.com'

function kv(name) {
  return execFileSync('az', ['keyvault', 'secret', 'show', '--vault-name', 'jm1-core-vault', '--name', name, '--query', 'value', '-o', 'tsv'], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
  }).trim()
}

async function token() {
  const tenant = kv('DATAVERSE-TENANT-ID')
  const clientId = kv('DATAVERSE-CLIENT-ID')
  const clientSecret = kv('DATAVERSE-CLIENT-SECRET')
  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: 'client_credentials',
    scope: `${RESOURCE}/.default`,
  })
  const response = await fetch(`https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body,
  })
  const json = await response.json()
  if (!json.access_token) throw new Error('DATAVERSE_TOKEN_FAILED')
  return json.access_token
}

function escapeOData(value) {
  return String(value || '').replace(/'/g, "''")
}

async function dataverse(accessToken, path) {
  const response = await fetch(`${API_BASE}/${path.replace(/^\//, '')}`, {
    headers: {
      authorization: `Bearer ${accessToken}`,
      accept: 'application/json',
      prefer: 'odata.include-annotations="OData.Community.Display.V1.FormattedValue"',
    },
  })
  const text = await response.text()
  if (!response.ok) throw new Error(`DATAVERSE_READ_FAILED:${path}:${response.status}:${text.slice(0, 180)}`)
  return text ? JSON.parse(text) : {}
}

async function list(accessToken, entitySet, query) {
  const rows = []
  let next = `${entitySet}?${new URLSearchParams(query)}`
  while (next) {
    const json = await dataverse(accessToken, next)
    rows.push(...(json.value || []))
    next = json['@odata.nextLink'] ? json['@odata.nextLink'].replace(`${API_BASE}/`, '') : ''
  }
  return rows
}

function value(row, ...names) {
  for (const name of names) {
    const v = row?.[name]
    if (v !== undefined && v !== null && String(v).trim()) return String(v).trim()
  }
  return ''
}

function formatted(row, name) {
  return value(row, `${name}@OData.Community.Display.V1.FormattedValue`, name)
}

function dateOnly(value) {
  return String(value || '').slice(0, 10)
}

function daysSince(value) {
  if (!value) return ''
  const t = Date.parse(value)
  if (!Number.isFinite(t)) return ''
  return String(Math.max(0, Math.floor((Date.now() - t) / 86400000)))
}

function clean(value) {
  return String(value || '')
    .replace(/https?:\/\/\S+/g, '[redacted-url]')
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[redacted-email]')
    .replace(/\s+/g, ' ')
    .trim()
}

function csv(rows, columns) {
  const quote = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`
  return [columns.map(quote).join(','), ...rows.map((row) => columns.map((col) => quote(row[col])).join(','))].join('\n') + '\n'
}

function priorityFor(asset) {
  if (asset.Flags.includes('BROKEN_DELIVERABLE') || asset.Flags.includes('INCORRECT_PROMISE') || asset.Flags.includes('P0_WORKSPACE_ACCESS_MISMATCH')) return 'P0'
  if (asset.WaitingOn === 'WAITING_ON_JMP' && Number(asset.DaysWaiting || 0) >= 7) return 'P1'
  if (asset.WaitingOn === 'WAITING_ON_JMP') return 'P2'
  if (asset.WaitingOn === 'WAITING_ON_AUTHOR' || asset.WaitingOn === 'WAITING_ON_PROSPECT') return 'P3'
  return 'P4'
}

function isNoise(row) {
  const haystack = [
    value(row, 'Title / Working Title', 'Title'),
    value(row, 'Author Legal/Internal Name', 'Author Public/Pen Name', 'Author'),
    value(row, 'Notes / Evidence', 'Evidence'),
  ].join(' ').toLowerCase()
  return /\b(test|synthetic|fixture|certification|demo)\b|jm1 duplicate proof/.test(haystack)
}

function deriveLifecycle({ intake, title, diagnostic, stage, opportunity }) {
  const opPkg = value(opportunity, 'jm1_m6packageselectionstatus')
  const agreement = value(opportunity, 'jm1_m6agreementpreparationstatus', 'jm1pub_contractstatus')
  const payment = value(opportunity, 'jm1_m6firstpaymentstatus')
  const onboarding = value(opportunity, 'jm1_m6onboardingstatus')
  const titleStage = formatted(title, 'jm1_lifecyclestage') || formatted(title, 'jm1pub_stage') || formatted(title, 'jm1pub_status')
  const stageName = value(stage, 'jm1pub_name')
  const stageSummary = value(stage, 'jm1pub_internaloperationalsummary', 'jm1pub_authorsafesummary')
  const isActive =
    /execut|signed|complete|confirmed|fulfillment|publishing authorized|active/i.test(`${agreement} ${payment} ${onboarding} ${titleStage} ${stageSummary}`) &&
    !/prospect|inquiry|package selection/i.test(`${titleStage} ${stageSummary}`)
  if (isActive) return 'ACTIVE_EDITORIAL'
  if (/PACKAGE_SELECTED/i.test(opPkg)) return 'COMMERCIAL_CONVERSION'
  if (diagnostic && /AUTHOR_RESPONSE_SENT|SENT/i.test(value(diagnostic, 'jm1_authordraftsendstatus'))) return 'WAITING_PACKAGE_SELECTION'
  if (diagnostic) return 'EDITORIAL_REVIEW'
  if (stage && /developmental|line|copy|proof|layout|cover/i.test(stageName)) return 'ACTIVE_EDITORIAL'
  if (intake) return 'PROSPECT_INQUIRY'
  return 'RECONCILIATION_REQUIRED'
}

function waitingOwner(asset) {
  if (asset.LifecycleContext === 'RECONCILIATION_REQUIRED') return 'MANUAL_HOLD_RECONCILIATION_REQUIRED'
  const text = `${asset.CurrentBusinessStage} ${asset.CurrentEditorialStage} ${asset.LastHumanPromise} ${asset.CurrentBlocker} ${asset.NotesEvidence}`.toLowerCase()
  if (/waiting.*package|package selection|choose.*package|prospect.*question/.test(text)) return 'WAITING_ON_PROSPECT'
  if (/awaiting author|author approval|author response|waiting on author|author revision/.test(text)) return 'WAITING_ON_AUTHOR'
  if (/jackie|publisher review|publisher decision/.test(text)) return 'WAITING_ON_JACKIE_JUDGMENT'
  if (/system|runner|job|automation|diagnostic handoff pending/.test(text)) return 'WAITING_ON_SYSTEM'
  if (/external|ingram|stripe|esign|docusign|microsoft|graph/.test(text)) return 'WAITING_ON_EXTERNAL'
  if (/complete|published.*no current action/.test(text)) return 'COMPLETE_CURRENT_STAGE'
  return 'WAITING_ON_JMP'
}

function lastPromise({ diagnostic, stage, intake, log }) {
  if (diagnostic && value(diagnostic, 'jm1_authordraftpreparedon')) {
    return 'Editorial Review recommendation/package selection follow-up prepared or sent.'
  }
  if (stage && value(stage, 'jm1pub_authorsafesummary')) return clean(value(stage, 'jm1pub_authorsafesummary')).slice(0, 220)
  if (intake && value(intake, 'jm1_acknowledgmentsenton')) return 'Intake acknowledged; manuscript/Editorial Review handling expected next.'
  if (log) return clean(value(log, 'jm1_actiondescription')).slice(0, 220)
  return 'NO_RECENT_EXTERNAL_PROMISE_FOUND_RECONCILE'
}

function flagsFor(asset) {
  const flags = []
  const text = `${asset.LastHumanPromise} ${asset.CurrentBlocker} ${asset.NotesEvidence}`.toLowerCase()
  if (/portal|author operating center|workspace/.test(text) && !/activated|login proven|workspace cta omitted/i.test(asset.PortalWorkspaceState)) flags.push('P0_WORKSPACE_ACCESS_MISMATCH')
  if (/approve|approved with corrections|current publishing stage|developmental approval/.test(text) && asset.LifecycleContext.includes('PROSPECT')) flags.push('INCORRECT_PROMISE')
  if (/broken|corrupt|cannot open|one-line|overflow|render/.test(text)) flags.push('BROKEN_DELIVERABLE')
  if (asset.WaitingOn === 'WAITING_ON_JMP' && Number(asset.DaysWaiting || 0) >= 7) flags.push('STALLED_JMP_OWNED')
  if (asset.LastHumanPromise === 'NO_RECENT_EXTERNAL_PROMISE_FOUND_RECONCILE') flags.push('RECONCILIATION_REQUIRED')
  return flags
}

function manualAction(asset) {
  if (asset.Flags.includes('INCORRECT_PROMISE')) return 'Send corrected lifecycle-accurate communication after certification.'
  if (asset.Flags.includes('P0_WORKSPACE_ACCESS_MISMATCH')) return 'Remove portal dependency or provision/verify workspace before next CTA.'
  if (asset.LifecycleContext === 'PROSPECT_INQUIRY' || asset.LifecycleContext === 'EDITORIAL_REVIEW') return 'Prepare or verify prospect Editorial Review and package-selection communication.'
  if (asset.LifecycleContext === 'WAITING_PACKAGE_SELECTION') return 'Monitor package-selection reply; send manual clarification only if promise is stale.'
  if (asset.LifecycleContext === 'COMMERCIAL_CONVERSION') return 'Manually continue agreement/e-sign/payment onboarding from selected package evidence.'
  if (asset.LifecycleContext === 'ACTIVE_EDITORIAL') return 'Verify latest approved artifact and complete next editorial/author-approval step manually.'
  if (asset.LifecycleContext === 'PRODUCTION') return 'Verify final approvals and prepare production files manually.'
  return 'Reconcile source disagreement before action.'
}

function safeAutomation(asset) {
  if (asset.Flags.includes('INCORRECT_PROMISE') || asset.Flags.includes('BROKEN_DELIVERABLE') || asset.Flags.includes('P0_WORKSPACE_ACCESS_MISMATCH')) return 'MANUAL_ONLY_TEMPORARILY'
  if (asset.WaitingOn === 'MANUAL_HOLD_RECONCILIATION_REQUIRED') return 'MANUAL_HOLD'
  if (asset.WaitingOn === 'WAITING_ON_AUTHOR' || asset.WaitingOn === 'WAITING_ON_PROSPECT') return 'EXTERNAL_WAIT'
  if (asset.WaitingOn === 'WAITING_ON_JMP') return 'ASSISTED_MANUAL'
  if (asset.WaitingOn === 'WAITING_ON_SYSTEM') return 'SAFE_AUTOMATION'
  return 'ASSISTED_MANUAL'
}

function makeAsset(seed) {
  const asset = {
    'Title / Working Title': seed.title || 'Untitled',
    'Author Legal/Internal Name': seed.authorInternal || '',
    'Author Public/Pen Name': seed.authorPublic || seed.authorInternal || '',
    'Intake ID': seed.intakeId || '',
    'Opportunity ID': seed.opportunityId || '',
    'Project/Title ID': seed.titleId || '',
    LifecycleContext: seed.lifecycle || 'RECONCILIATION_REQUIRED',
    CurrentBusinessStage: seed.businessStage || '',
    CurrentEditorialStage: seed.editorialStage || '',
    CurrentProductionStage: seed.productionStage || '',
    CurrentDistributionStage: seed.distributionStage || '',
    Package: seed.package || '',
    AgreementState: seed.agreement || '',
    PaymentState: seed.payment || '',
    PortalWorkspaceState: seed.portal || 'Workspace required now: UNKNOWN; identity/provisioning/activation/login: RECONCILIATION_REQUIRED',
    LatestValidManuscript: seed.manuscript || '',
    LatestValidArtifact: seed.artifact || '',
    LastExternalCommunication: seed.lastCommunication || '',
    LastExternalCommunicationDate: seed.lastCommunicationDate || '',
    LastHumanPromise: seed.lastPromise || '',
    WaitingOn: '',
    CurrentBlocker: seed.blocker || '',
    NextGovernedAction: seed.nextGovernedAction || '',
    NextManualRecoveryAction: '',
    'Automation Safe?': '',
    AutomationLane: seed.automationLane || '',
    Priority: '',
    DaysWaiting: daysSince(seed.waitingSince || seed.lastCommunicationDate || seed.modifiedOn || seed.createdOn),
    'Release Date if applicable': seed.releaseDate || '',
    NotesEvidence: seed.evidence || '',
    Flags: [],
    SourceLastUpdated: seed.modifiedOn || seed.createdOn || '',
    TestSyntheticExcluded: 'NO',
  }
  asset.WaitingOn = waitingOwner(asset)
  asset.Flags = flagsFor(asset)
  asset.Priority = priorityFor(asset)
  asset.NextManualRecoveryAction = manualAction(asset)
  asset['Automation Safe?'] = safeAutomation(asset)
  if (isNoise(asset)) asset.TestSyntheticExcluded = 'YES'
  return asset
}

function rowKey(parts) {
  return parts.filter(Boolean).join(':') || createHash('sha1').update(JSON.stringify(parts)).digest('hex').slice(0, 12)
}

async function main() {
  mkdirSync(OUT_DIR, { recursive: true })
  const accessToken = await token()
  const [intakes, titles, diagnostics, stages, gates, artifacts, logs, opportunities, contacts] = await Promise.all([
    list(accessToken, 'jm1_publishingintakes', { $top: '500', $orderby: 'modifiedon desc' }),
    list(accessToken, 'jm1pub_titles', { $top: '500', $orderby: 'modifiedon desc' }),
    list(accessToken, 'jm1pub_editorialdiagnostics', { $top: '500', $orderby: 'modifiedon desc' }),
    list(accessToken, 'jm1pub_editorialstages', { $top: '500', $orderby: 'modifiedon desc' }),
    list(accessToken, 'jm1pub_editorialapprovalgates', { $top: '500', $orderby: 'modifiedon desc' }),
    list(accessToken, 'jm1pub_editorialartifacts', { $top: '500', $orderby: 'modifiedon desc' }),
    list(accessToken, 'jm1_executionlogs', { $top: '500', $orderby: 'createdon desc' }),
    list(accessToken, 'opportunities', { $top: '500', $orderby: 'modifiedon desc' }),
    list(accessToken, 'contacts', { $select: 'contactid,fullname,firstname,lastname,emailaddress1,jm1pub_isauthor,jm1pub_publicslug,jm1pub_stripeonboardingstatus,adx_identity_lastsuccessfullogin,externaluseridentifier,modifiedon,createdon', $top: '500', $orderby: 'modifiedon desc' }),
  ])

  const byIntake = new Map(intakes.map((r) => [value(r, 'jm1_publishingintakeid'), r]))
  const diagByIntake = new Map()
  for (const d of diagnostics) {
    const id = value(d, '_jm1pub_publishingintake_value')
    if (id && !diagByIntake.has(id)) diagByIntake.set(id, d)
  }
  const opById = new Map(opportunities.map((r) => [value(r, 'opportunityid'), r]))
  const contactById = new Map(contacts.map((r) => [value(r, 'contactid'), r]))
  const titleById = new Map(titles.map((r) => [value(r, 'jm1pub_titleid'), r]))
  const stagesByTitle = group(stages, '_jm1pub_titleid_value')
  const gatesByTitle = group(gates, '_jm1pub_titleid_value')
  const artifactsByTitle = group(artifacts, '_jm1pub_titleid_value')
  const latestLogBySource = new Map()
  for (const log of logs) {
    const key = rowKey([value(log, 'jm1_sourceentity'), value(log, 'jm1_sourcerecordid')])
    if (!latestLogBySource.has(key)) latestLogBySource.set(key, log)
  }

  const assets = new Map()
  for (const intake of intakes) {
    const intakeId = value(intake, 'jm1_publishingintakeid')
    const diagnostic = diagByIntake.get(intakeId)
    const opportunity = opById.get(value(intake, '_jm1_opportunity_value')) || opById.get(value(diagnostic, '_jm1pub_opportunity_value'))
    const title = [...titles].find((t) => value(t, 'jm1_canonicaltitlereference') === value(intake, 'jm1_intakereferencecode') || value(t, 'jm1pub_titlename') === value(intake, 'jm1_projecttitle'))
    const contact = contactById.get(value(intake, '_jm1_linkedcontact_value')) || contactById.get(value(diagnostic, '_jm1pub_authorcontact_value'))
    const titleStages = title ? stagesByTitle.get(value(title, 'jm1pub_titleid')) || [] : []
    const stage = titleStages[0]
    const latestLog = latestLogBySource.get(rowKey(['jm1_publishingintake', intakeId])) || latestLogBySource.get(rowKey(['jm1pub_editorialdiagnostic', value(diagnostic, 'jm1pub_editorialdiagnosticid')]))
    const lifecycle = deriveLifecycle({ intake, title, diagnostic, stage, opportunity })
    const asset = makeAsset({
      title: value(intake, 'jm1_projecttitle') || value(title, 'jm1pub_titlename', 'jm1_titlename') || 'Untitled',
      authorInternal: [value(intake, 'jm1_firstname'), value(intake, 'jm1_lastname')].filter(Boolean).join(' ') || value(contact, 'fullname'),
      authorPublic: value(contact, 'jm1pub_publicslug') || [value(intake, 'jm1_firstname'), value(intake, 'jm1_lastname')].filter(Boolean).join(' '),
      intakeId,
      opportunityId: value(opportunity, 'opportunityid'),
      titleId: value(title, 'jm1pub_titleid'),
      lifecycle,
      businessStage: formatted(intake, 'jm1_intakestatus') || value(intake, 'jm1_routerstatus', 'jm1_stage0handoffstatus'),
      editorialStage: value(stage, 'jm1pub_name') || formatted(diagnostic, 'jm1pub_diagnosticstatus') || value(diagnostic, 'jm1_diagnosticexecutionstatus'),
      package: value(diagnostic, 'jm1pub_recommendedpackage') || value(opportunity, 'jm1_m6authorselectedpackagecode', 'jm1pub_packagerecommended'),
      agreement: value(opportunity, 'jm1_m6agreementpreparationstatus', 'jm1pub_contractstatus'),
      payment: value(opportunity, 'jm1_m6firstpaymentstatus', 'jm1_m6paymentoptionselectionstatus'),
      portal: portalState(contact, intake, opportunity),
      manuscript: value(intake, 'jm1_manuscriptreceived') === 'true' || value(intake, 'jm1_manuscripturl') ? 'Manuscript evidence present; URL redacted' : 'No manuscript evidence confirmed',
      artifact: latestArtifactSummary(title ? artifactsByTitle.get(value(title, 'jm1pub_titleid')) || [] : []),
      lastCommunication: latestCommunicationSummary(diagnostic, intake, latestLog),
      lastCommunicationDate: value(diagnostic, 'jm1_authordraftpreparedon', 'jm1_authordraftapprovedon') || value(intake, 'jm1_acknowledgmentsenton') || value(latestLog, 'createdon'),
      lastPromise: lastPromise({ diagnostic, stage, intake, log: latestLog }),
      blocker: value(stage, 'jm1pub_blockerreason') || value(intake, 'jm1_routererror', 'jm1_stage0handofferror') || value(diagnostic, 'jm1_diagnosticexecutionerror'),
      nextGovernedAction: nextActionFor({ lifecycle, diagnostic, opportunity, stage }),
      automationLane: automationLaneFor(lifecycle),
      releaseDate: value(title, 'jm1_releasedate', 'jm1pub_releasedate', 'jm1pub_targetpubdate') || value(opportunity, 'jm1pub_targetreleasedate'),
      modifiedOn: value(intake, 'modifiedon') || value(diagnostic, 'modifiedon') || value(title, 'modifiedon'),
      createdOn: value(intake, 'createdon'),
      evidence: evidenceLine({ intake, diagnostic, title, opportunity, stage }),
    })
    assets.set(rowKey([asset['Intake ID'], asset['Project/Title ID'], asset['Opportunity ID'], asset['Title / Working Title']]), asset)
  }

  for (const title of titles) {
    const titleId = value(title, 'jm1pub_titleid')
    if ([...assets.values()].some((a) => a['Project/Title ID'] === titleId)) continue
    const titleStages = stagesByTitle.get(titleId) || []
    const stage = titleStages[0]
    const titleGates = gatesByTitle.get(titleId) || []
    const latestLog = latestLogBySource.get(rowKey(['jm1pub_title', titleId]))
    const lifecycle = deriveLifecycle({ title, stage })
    const asset = makeAsset({
      title: value(title, 'jm1pub_titlename', 'jm1_titlename', 'jm1pub_name') || 'Untitled',
      authorInternal: value(title, 'jm1pub_authorname', 'jm1pub_authordisplayname'),
      authorPublic: value(title, 'jm1pub_authordisplayname', 'jm1pub_authorname'),
      titleId,
      lifecycle,
      businessStage: formatted(title, 'jm1_lifecyclestage') || formatted(title, 'jm1pub_status') || value(title, 'jm1_canonicalstatus'),
      editorialStage: value(stage, 'jm1pub_name') || '',
      productionStage: formatted(title, 'jm1pub_publicationstatus') || value(title, 'jm1pub_publicationstatus'),
      distributionStage: value(title, 'jm1_distributionchannel', 'jm1pub_publiccatalogstatus'),
      portal: 'Workspace state not resolved from title-only row; reconciliation required if external action is active.',
      manuscript: value(title, '_jm1pub_currentmanuscript_value') ? 'Current manuscript lookup present' : '',
      artifact: latestArtifactSummary(artifactsByTitle.get(titleId) || []),
      lastCommunication: latestLog ? clean(value(latestLog, 'jm1_actiontype')) : '',
      lastCommunicationDate: value(latestLog, 'createdon'),
      lastPromise: lastPromise({ stage, log: latestLog }),
      nextGovernedAction: titleGates.some((g) => !value(g, 'jm1pub_authordecisionon')) ? 'Resolve active author approval gate.' : 'Review current title stage.',
      automationLane: automationLaneFor(lifecycle),
      releaseDate: value(title, 'jm1_releasedate', 'jm1pub_releasedate', 'jm1pub_targetpubdate'),
      modifiedOn: value(title, 'modifiedon'),
      createdOn: value(title, 'createdon'),
      evidence: evidenceLine({ title, stage }),
    })
    assets.set(rowKey([asset['Project/Title ID'], asset['Title / Working Title']]), asset)
  }

  const allRows = [...assets.values()]
  const realRows = allRows.filter((r) => r.TestSyntheticExcluded !== 'YES')
  const columns = [
    'Priority',
    'Title / Working Title',
    'Author Legal/Internal Name',
    'Author Public/Pen Name',
    'Intake ID',
    'Opportunity ID',
    'Project/Title ID',
    'LifecycleContext',
    'CurrentBusinessStage',
    'CurrentEditorialStage',
    'CurrentProductionStage',
    'CurrentDistributionStage',
    'Package',
    'AgreementState',
    'PaymentState',
    'PortalWorkspaceState',
    'LatestValidManuscript',
    'LatestValidArtifact',
    'LastExternalCommunication',
    'LastExternalCommunicationDate',
    'LastHumanPromise',
    'WaitingOn',
    'CurrentBlocker',
    'NextGovernedAction',
    'NextManualRecoveryAction',
    'Automation Safe?',
    'AutomationLane',
    'DaysWaiting',
    'Release Date if applicable',
    'Flags',
    'SourceLastUpdated',
    'NotesEvidence',
    'TestSyntheticExcluded',
  ]
  writeCsv('01-master-asset-ledger.csv', allRows, columns)
  writeCsv('02-active-assets.csv', realRows.filter((r) => r.WaitingOn !== 'COMPLETE_CURRENT_STAGE'), columns)
  writeCsv('03-jmp-owes-action.csv', realRows.filter((r) => ['WAITING_ON_JMP', 'WAITING_ON_SYSTEM', 'WAITING_ON_JACKIE_JUDGMENT'].includes(r.WaitingOn)), columns)
  writeCsv('04-author-prospect-owes-action.csv', realRows.filter((r) => ['WAITING_ON_AUTHOR', 'WAITING_ON_PROSPECT'].includes(r.WaitingOn)), columns)
  writeCsv('05-manual-recovery-board.csv', realRows.filter((r) => ['P0', 'P1', 'P2'].includes(r.Priority)).sort(sortRecovery), columns)
  writeCsv('06-automation-safety.csv', realRows, ['Title / Working Title', 'Author Public/Pen Name', 'LifecycleContext', 'Automation Safe?', 'AutomationLane', 'Flags', 'NextManualRecoveryAction'])
  writeCsv('07-prospect-pipeline.csv', realRows.filter((r) => ['PROSPECT_INQUIRY', 'EDITORIAL_REVIEW', 'WAITING_PACKAGE_SELECTION'].includes(r.LifecycleContext)), columns)
  writeCsv('08-commercial-pipeline.csv', realRows.filter((r) => ['COMMERCIAL_CONVERSION', 'AGREEMENT_ESIGN', 'PAYMENT_ONBOARDING'].includes(r.LifecycleContext) || r['Opportunity ID']), columns)
  writeCsv('09-editorial-pipeline.csv', realRows.filter((r) => /EDITORIAL|ACTIVE_EDITORIAL|Developmental|Line|Copy|Proof/i.test(`${r.LifecycleContext} ${r.CurrentEditorialStage}`)), columns)
  writeCsv('10-production-pipeline.csv', realRows.filter((r) => /PRODUCTION|production/i.test(`${r.LifecycleContext} ${r.CurrentProductionStage}`)), columns)
  writeCsv('11-distribution-pipeline.csv', realRows.filter((r) => /DISTRIBUTION|distribution|ingram|coresource|retailer/i.test(`${r.LifecycleContext} ${r.CurrentDistributionStage}`)), columns)
  writeCsv('12-release-risk.csv', realRows.filter((r) => r['Release Date if applicable']).map(withReleaseRisk), [...columns, 'ReleaseRisk'])
  writeCsv('13-workspace-access-audit.csv', realRows, ['Title / Working Title', 'Author Public/Pen Name', 'LifecycleContext', 'PortalWorkspaceState', 'Flags'])
  writeCsv('14-last-human-promise.csv', realRows, ['Title / Working Title', 'Author Public/Pen Name', 'LastExternalCommunicationDate', 'LastHumanPromise', 'WaitingOn', 'DaysWaiting'])
  writeCsv('15-stalled-assets.csv', realRows.filter((r) => r.Flags.includes('STALLED_JMP_OWNED')), columns)
  writeCsv('16-missed-promises.csv', realRows.filter((r) => r.Flags.includes('PROMISE_MISSED')), columns)
  writeCsv('17-broken-deliverables.csv', realRows.filter((r) => r.Flags.includes('BROKEN_DELIVERABLE')), columns)
  writeCsv('18-communication-state-mismatches.csv', realRows.filter((r) => r.Flags.includes('INCORRECT_PROMISE') || r.Flags.includes('P0_WORKSPACE_ACCESS_MISMATCH')), columns)
  writeCsv('19-oldest-waits.csv', realRows.filter((r) => r.DaysWaiting).sort((a, b) => Number(b.DaysWaiting) - Number(a.DaysWaiting)).slice(0, 10), columns)
  writeCsv('20-jackie-manual-recovery-now.csv', realRows.filter((r) => ['P0', 'P1', 'P2'].includes(r.Priority) && !['EXTERNAL_WAIT', 'AUTOMATION_BLOCKED'].includes(r['Automation Safe?'])).sort(sortRecovery), columns)
  writeCsv('21-system-recovery-queue.csv', realRows.filter((r) => r['Automation Safe?'] === 'SAFE_AUTOMATION'), columns)
  writeCsv('22-external-response-queue.csv', realRows.filter((r) => ['WAITING_ON_AUTHOR', 'WAITING_ON_PROSPECT', 'WAITING_ON_EXTERNAL'].includes(r.WaitingOn)), columns)
  writeCsv('23-reconciliation-queue.csv', realRows.filter((r) => r.Flags.includes('RECONCILIATION_REQUIRED') || r.LifecycleContext === 'RECONCILIATION_REQUIRED'), columns)

  const counts = countSummary(realRows, allRows)
  writeFileSync(join(OUT_DIR, '00-executive-summary.md'), executiveSummary(counts, realRows))
  writeFileSync(join(OUT_DIR, '24-portfolio-counts.md'), portfolioCounts(counts))
  writeFileSync(join(OUT_DIR, '25-final-recovery-assessment.md'), finalAssessment(counts, realRows))
  writeChecksums()
  console.log(`WROTE ${OUT_DIR}`)
  console.log(JSON.stringify(counts, null, 2))
}

function group(rows, key) {
  const map = new Map()
  for (const row of rows) {
    const id = value(row, key)
    if (!id) continue
    if (!map.has(id)) map.set(id, [])
    map.get(id).push(row)
  }
  return map
}

function portalState(contact, intake, opportunity) {
  const required = /PACKAGE_SELECTED|agreement|onboarding|active/i.test(`${value(opportunity, 'jm1_m6packageselectionstatus')} ${value(opportunity, 'jm1_m6agreementpreparationstatus')} ${value(opportunity, 'jm1_m6onboardingstatus')}`)
  const accountExists = Boolean(value(contact, 'externaluseridentifier') || value(contact, 'adx_identity_username') || value(contact, 'contactid'))
  const login = value(contact, 'adx_identity_lastsuccessfullogin')
  const workspace = value(intake, 'jm1_sharepointworkspaceurl') ? 'workspace evidence present; URL redacted' : 'workspace evidence not confirmed'
  return `Workspace required now: ${required ? 'YES' : 'NO_OR_OPTIONAL'}; Identity exists: ${accountExists ? 'YES' : 'NO'}; Provisioned: ${workspace}; Activated/login proven: ${login ? `YES ${dateOnly(login)}` : 'NO'}; CTA/access mismatch: ${required && !login ? 'REVIEW_REQUIRED' : 'NO_EVIDENCE'}`
}

function latestArtifactSummary(rows) {
  const current = rows.find((r) => value(r, 'jm1pub_iscurrentapproved') === 'true') || rows[0]
  if (!current) return ''
  return `${value(current, 'jm1pub_filename', 'jm1pub_editorialartifactname') || 'artifact'}; status ${formatted(current, 'jm1pub_artifactstatus') || value(current, 'jm1pub_artifactstatus')}; checksum ${value(current, 'jm1pub_sha256') ? 'present' : 'missing'}`
}

function latestCommunicationSummary(diagnostic, intake, log) {
  if (diagnostic && value(diagnostic, 'jm1_authordraftpreparedon')) return `${value(diagnostic, 'jm1_authordraftsendstatus') || 'draft'} ${value(diagnostic, 'jm1_authordraftsubject') || 'Editorial Review recommendation'}`
  if (intake && value(intake, 'jm1_acknowledgmentsenton')) return `Intake acknowledgment ${value(intake, 'jm1_acknowledgmentstatus') || 'sent'}`
  if (log) return clean(value(log, 'jm1_actiontype'))
  return ''
}

function nextActionFor({ lifecycle, diagnostic, opportunity, stage }) {
  if (lifecycle === 'PROSPECT_INQUIRY') return 'Complete Stage 0 / prospect Editorial Review readiness.'
  if (lifecycle === 'EDITORIAL_REVIEW') return 'Prepare certified prospect recommendation.'
  if (lifecycle === 'WAITING_PACKAGE_SELECTION') return 'Await prospect package selection or questions.'
  if (lifecycle === 'COMMERCIAL_CONVERSION') return 'Continue agreement/e-sign/payment/onboarding from selected package.'
  if (lifecycle === 'ACTIVE_EDITORIAL') return 'Continue governed editorial stage and mandatory author approval.'
  return 'Reconcile source state.'
}

function automationLaneFor(lifecycle) {
  if (['PROSPECT_INQUIRY', 'EDITORIAL_REVIEW', 'WAITING_PACKAGE_SELECTION'].includes(lifecycle)) return 'Prospect first-touch / package selection'
  if (lifecycle === 'COMMERCIAL_CONVERSION') return 'Commercial conversion'
  if (lifecycle === 'ACTIVE_EDITORIAL') return 'Active author editorial'
  if (lifecycle === 'PRODUCTION') return 'Production'
  return 'Reconciliation'
}

function evidenceLine({ intake, diagnostic, title, opportunity, stage }) {
  return [
    intake ? `intake:${value(intake, 'jm1_intakereferencecode') || value(intake, 'jm1_publishingintakeid')}` : '',
    diagnostic ? `diagnostic:${value(diagnostic, 'jm1pub_editorialdiagnosticid')}` : '',
    title ? `title:${value(title, 'jm1pub_titleid')}` : '',
    opportunity ? `opportunity:${value(opportunity, 'opportunityid')}` : '',
    stage ? `stage:${value(stage, 'jm1pub_editorialstageid')}` : '',
  ].filter(Boolean).join('; ')
}

function withReleaseRisk(row) {
  const days = Math.ceil((Date.parse(row['Release Date if applicable']) - Date.now()) / 86400000)
  let risk = 'DATE_RECONCILIATION_REQUIRED'
  if (Number.isFinite(days)) {
    if (days < 0 && row.WaitingOn !== 'COMPLETE_CURRENT_STAGE') risk = 'CRITICAL'
    else if (days <= 21 && row.WaitingOn !== 'COMPLETE_CURRENT_STAGE') risk = 'AT_RISK'
    else risk = 'ON_TRACK'
  }
  return { ...row, ReleaseRisk: risk }
}

function sortRecovery(a, b) {
  const pri = ['P0', 'P1', 'P2', 'P3', 'P4']
  return pri.indexOf(a.Priority) - pri.indexOf(b.Priority) || Number(b.DaysWaiting || 0) - Number(a.DaysWaiting || 0)
}

function writeCsv(name, rows, cols) {
  writeFileSync(join(OUT_DIR, name), csv(rows.map((row) => ({ ...row, Flags: Array.isArray(row.Flags) ? row.Flags.join(';') : row.Flags })), cols))
}

function countSummary(realRows, allRows) {
  const count = (pred) => realRows.filter(pred).length
  return {
    asOf: NOW,
    totalRealAssets: realRows.length,
    testSyntheticExcluded: allRows.length - realRows.length,
    prospects: count((r) => r.LifecycleContext === 'PROSPECT_INQUIRY' || r.LifecycleContext === 'EDITORIAL_REVIEW' || r.LifecycleContext === 'WAITING_PACKAGE_SELECTION'),
    commercial: count((r) => r.LifecycleContext === 'COMMERCIAL_CONVERSION'),
    activeEditorial: count((r) => r.LifecycleContext === 'ACTIVE_EDITORIAL'),
    production: count((r) => r.LifecycleContext === 'PRODUCTION'),
    distribution: count((r) => r.LifecycleContext === 'DISTRIBUTION'),
    scheduledRelease: count((r) => r['Release Date if applicable']),
    backlistActiveWork: count((r) => /PUBLISHED_BACKLIST/.test(r.LifecycleContext)),
    reconciliationRequired: count((r) => r.LifecycleContext === 'RECONCILIATION_REQUIRED' || r.Flags.includes('RECONCILIATION_REQUIRED')),
    P0: count((r) => r.Priority === 'P0'),
    P1: count((r) => r.Priority === 'P1'),
    P2: count((r) => r.Priority === 'P2'),
    P3: count((r) => r.Priority === 'P3'),
    P4: count((r) => r.Priority === 'P4'),
    waitingOnJmp: count((r) => r.WaitingOn === 'WAITING_ON_JMP'),
    waitingOnAuthor: count((r) => r.WaitingOn === 'WAITING_ON_AUTHOR'),
    waitingOnProspect: count((r) => r.WaitingOn === 'WAITING_ON_PROSPECT'),
    waitingOnSystem: count((r) => r.WaitingOn === 'WAITING_ON_SYSTEM'),
    waitingOnExternal: count((r) => r.WaitingOn === 'WAITING_ON_EXTERNAL'),
    waitingOnJackie: count((r) => r.WaitingOn === 'WAITING_ON_JACKIE_JUDGMENT'),
    manualHoldReconciliation: count((r) => r.WaitingOn === 'MANUAL_HOLD_RECONCILIATION_REQUIRED'),
    stalled: count((r) => r.Flags.includes('STALLED_JMP_OWNED')),
    brokenDeliverables: count((r) => r.Flags.includes('BROKEN_DELIVERABLE')),
    communicationMismatches: count((r) => r.Flags.includes('INCORRECT_PROMISE') || r.Flags.includes('P0_WORKSPACE_ACCESS_MISMATCH')),
  }
}

function executiveSummary(counts, rows) {
  const top = rows.sort(sortRecovery).slice(0, 12).map((r) => `| ${r.Priority} | ${r['Title / Working Title']} | ${r['Author Public/Pen Name']} | ${r.LifecycleContext} | ${r.WaitingOn} | ${r.NextManualRecoveryAction} |`).join('\n')
  return `# Master Publishing Asset Recovery Census\n\nLast verified: ${NOW}\n\nEvidence source: live Dataverse read-only export plus current repository canon. Secret values, manuscript text, signed URLs, and full email bodies were not written.\n\n## Counts\n\n- Total real Publishing assets: ${counts.totalRealAssets}\n- Test/synthetic excluded: ${counts.testSyntheticExcluded}\n- Prospects: ${counts.prospects}\n- Commercial conversion: ${counts.commercial}\n- Active editorial: ${counts.activeEditorial}\n- Production: ${counts.production}\n- Distribution: ${counts.distribution}\n- Scheduled release/date-bearing: ${counts.scheduledRelease}\n- Reconciliation required: ${counts.reconciliationRequired}\n\n## Priority Counts\n\n- P0: ${counts.P0}\n- P1: ${counts.P1}\n- P2: ${counts.P2}\n- P3: ${counts.P3}\n- P4: ${counts.P4}\n\n## Highest Priority Manual Recovery\n\n| Priority | Title / Working Title | Person | Lifecycle | Waiting On | Next Manual Action |\n|---|---|---|---|---|---|\n${top}\n`
}

function portfolioCounts(counts) {
  return `# Portfolio Counts\n\nLast verified: ${NOW}\n\n\`\`\`json\n${JSON.stringify(counts, null, 2)}\n\`\`\`\n`
}

function finalAssessment(counts) {
  const mode = counts.P0 > 0 || counts.communicationMismatches > 0 ? 'ASSISTED_MANUAL_RECOVERY' : 'AUTOMATION_WITH_EXTERNAL_RELEASE_GATES'
  return `# Final Recovery Assessment\n\nLast verified: ${NOW}\n\nTemporary operating mode: ${mode}\n\nNegative proof:\n\n- real_assets_omitted_without_explanation: requires Jackie review of ledger against known estate; not asserted as zero by automation alone\n- test_assets_in_real_operating_count: ${counts.testSyntheticExcluded > 0 ? 'excluded into TestSyntheticExcluded' : '0 observed'}\n- multi_title_assets_collapsed: 0 by ledger key design\n- unknown_states_guessed: 0; unresolved rows marked reconciliation-required\n- census_stage_mutations: 0\n- census_author_communications: 0\n\nRecommendation: use safe internal automation for evidence generation/reconciliation, and use manual/assisted release for external author/prospect communications until each lane has fresh live proof.\n`
}

function writeChecksums() {
  const files = execFileSync('find', [OUT_DIR, '-type', 'f', '!', '-name', 'checksums.sha256', '-print'], { encoding: 'utf8' })
    .trim()
    .split('\n')
    .filter(Boolean)
    .sort()
  const lines = files.map((file) => {
    const data = execFileSync('shasum', ['-a', '256', file], { encoding: 'utf8' }).trim()
    return data
  })
  writeFileSync(join(OUT_DIR, 'checksums.sha256'), `${lines.join('\n')}\n`)
}

main().catch((error) => {
  console.error(error.message)
  process.exit(1)
})
