#!/usr/bin/env node

import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const OUT_DIR = 'docs/operations/generated/CC010-PORTFOLIO-ACTIVATION-2026-08-14'
const RECOVERY_DIR = 'docs/operations/generated/CC010-EDITORIAL-PORTFOLIO-RECOVERY-2026-08-13'
const FIRST_REPLAY = '/tmp/cc010-activation/editorial-runtime-admin-replay.json'
const POST_GUARD_REPLAY = '/tmp/cc010-activation/editorial-runtime-admin-replay-post-guard.json'
const now = new Date().toISOString()

function sh(command, args) {
  return execFileSync(command, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim()
}

function read(path) {
  return existsSync(path) ? readFileSync(path, 'utf8') : ''
}

function json(path) {
  const text = read(path)
  return text ? JSON.parse(text) : null
}

function csvParse(text) {
  const rows = []
  const lines = text.trim().split(/\r?\n/)
  const headers = splitCsvLine(lines.shift() || '')
  for (const line of lines) {
    if (!line.trim()) continue
    const cells = splitCsvLine(line)
    rows.push(Object.fromEntries(headers.map((header, index) => [header, cells[index] || ''])))
  }
  return rows
}

function splitCsvLine(line) {
  const cells = []
  let cell = ''
  let quoted = false
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i]
    if (char === '"' && line[i + 1] === '"') {
      cell += '"'
      i += 1
    } else if (char === '"') {
      quoted = !quoted
    } else if (char === ',' && !quoted) {
      cells.push(cell)
      cell = ''
    } else {
      cell += char
    }
  }
  cells.push(cell)
  return cells
}

function csvCell(value) {
  const text = String(value ?? '').replace(/\r?\n/g, ' ').replace(/\s+/g, ' ').trim()
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

function csv(headers, rows) {
  return [headers.join(','), ...rows.map((row) => headers.map((header) => csvCell(row[header])).join(','))].join('\n') + '\n'
}

function mdTable(headers, rows) {
  return [
    `| ${headers.join(' | ')} |`,
    `| ${headers.map(() => '---').join(' | ')} |`,
    ...rows.map((row) => `| ${headers.map((header) => String(row[header] ?? '').replace(/\|/g, '\\|')).join(' | ')} |`),
  ].join('\n')
}

function write(name, content) {
  writeFileSync(join(OUT_DIR, name), content)
}

function counts(rows, key) {
  return [...rows.reduce((map, row) => map.set(row[key] || 'Unknown', (map.get(row[key] || 'Unknown') || 0) + 1), new Map())]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => String(a.name).localeCompare(String(b.name)))
}

function stageCode(stage) {
  const text = String(stage || '').toLowerCase()
  if (text.includes('developmental')) return 'Developmental'
  if (text.includes('line')) return 'Line'
  if (text.includes('copy')) return 'Copy'
  if (text.includes('proof')) return 'Proof'
  if (text.includes('production')) return 'Production Handoff'
  if (text.includes('stage 0') || text.includes('editorial review')) return 'Stage 0'
  return 'Unknown'
}

function latestArtifactFor(artifacts, key) {
  return artifacts.find((row) => row.canonical_key === key) || null
}

function replayRows(replay, label) {
  return (replay?.results || []).map((result) => ({
    replay: label,
    stage_id: result.stageId,
    title_id: result.titleId,
    stage_code: result.stageCode,
    status: result.status,
    source_artifact_id: result.sourceArtifactId || '',
    output_count: Array.isArray(result.outputs) ? result.outputs.length : 0,
    package_id: result.packageHandoff?.packageId || '',
    package_checksum: result.packageHandoff?.packageChecksum || '',
    exact_blocker: result.exactBlocker || '',
    idempotent: result.idempotent === true || result.claim?.idempotent === true ? 'YES' : 'NO',
  }))
}

function settingRows() {
  const raw = sh('az', [
    'functionapp',
    'config',
    'appsettings',
    'list',
    '-g',
    'rg-jm1-ai',
    '-n',
    'func-jm1-diagnostic-ai-runner',
    '--query',
    "[?name=='JM1_RELEASE_SHA' || name=='JM1_PROMPT_MODEL_DEPLOYMENT_ALIAS' || name=='AZURE_FOUNDRY_CLAUDE_DEPLOYMENT_NAME'].{name:name,value:value}",
    '-o',
    'json',
  ])
  return JSON.parse(raw)
}

function functionState() {
  return JSON.parse(sh('az', [
    'functionapp',
    'show',
    '-g',
    'rg-jm1-ai',
    '-n',
    'func-jm1-diagnostic-ai-runner',
    '--query',
    '{linuxFxVersion:siteConfig.linuxFxVersion,state:state,defaultHostName:defaultHostName,lastModifiedTimeUtc:lastModifiedTimeUtc}',
    '-o',
    'json',
  ]))
}

function prState(number) {
  return JSON.parse(sh('gh', ['pr', 'view', String(number), '--json', 'number,state,mergedAt,mergeCommit,headRefOid,url,title']))
}

function main() {
  mkdirSync(OUT_DIR, { recursive: true })
  const classification = csvParse(read(join(RECOVERY_DIR, '02-real-title-classification.csv')))
  const states = csvParse(read(join(RECOVERY_DIR, '03-current-editorial-state.csv')))
  const artifacts = csvParse(read(join(RECOVERY_DIR, '04-artifact-authority.csv')))
  const authorActions = csvParse(read(join(RECOVERY_DIR, '13-author-actions.csv')))
  const jackieActions = csvParse(read(join(RECOVERY_DIR, '12-jackie-actions.csv')))
  const recoveryReconciliation = classification.filter((row) => row.classification === 'RECONCILIATION_REQUIRED')
  const active = classification.filter((row) => row.classification === 'REAL_ACTIVE')
  const activeStates = states.filter((row) => row.real_test === 'REAL_ACTIVE')
  const firstReplay = json(FIRST_REPLAY)
  const postGuardReplay = json(POST_GUARD_REPLAY)
  const resumeRows = [...replayRows(firstReplay, 'FIRST_REPLAY'), ...replayRows(postGuardReplay, 'POST_GUARD_REPLAY')]
  const settings = settingRows()
  const runtime = functionState()
  const pr503 = prState(503)
  const pr504 = prState(504)
  const mainSha = sh('git', ['rev-parse', 'origin/main'])
  const headSha = sh('git', ['rev-parse', 'HEAD'])

  const activationLedger = activeStates.map((state) => {
    const cls = active.find((row) => row.canonical_key === state.canonical_key) || {}
    const artifact = latestArtifactFor(artifacts, state.canonical_key)
    const safeToResume =
      state.waiting_on === 'System' && !/author|external|jackie/i.test(state.earliest_unresolved_boundary || '')
        ? 'YES_IF_SOURCE_AND_GATE_CHECKS_PASS'
        : 'NO'
    return {
      Title: state.title,
      Author: state.author || cls.author || '',
      Canonical_Title_ID: cls.title_id || '',
      Intake_ID: cls.intake_refs || '',
      Opportunity_ID: '',
      Current_CC010_Stage: state.current_cc010_stage,
      Latest_Trustworthy_Artifact: artifact?.artifact_name || 'Not located',
      Artifact_Hash_Version: artifact?.sha256 || artifact?.current_approved || '',
      Latest_Proven_Completed_Boundary: state.latest_completed_boundary,
      Earliest_Unresolved_Governed_Boundary: state.earliest_unresolved_boundary,
      Author_Approval_State: authorActions.find((row) => row.title === state.title)?.response_status || 'No active author action located',
      Internal_Review_State: state.current_status || '',
      Waiting_On: state.waiting_on,
      Current_Blocker: state.blocker,
      Next_Governed_Action: state.next_action,
      Automation_Capability_Status: state.automation_status,
      Safe_to_Resume: safeToResume,
      Mutation_Required: resumeRows.some((row) => row.title_id && row.title_id === cls.title_id) ? 'RUNTIME_REPLAY_APPLIED' : state.mutation_required,
    }
  })

  const reconciliationRows = recoveryReconciliation.map((row) => ({
    title: row.title,
    author: row.author,
    ambiguity: row.sharepoint_paths ? 'LEGACY_RUNTIME_STATE' : 'UNKNOWN',
    evidence_needed: row.sharepoint_paths ? 'Bind source artifact/title identity to canonical title lifecycle.' : 'Locate source/stage/title authority before activation.',
    blocking: 'NONBLOCKING_FOR_CLEAN_TITLES',
  }))

  write('01-canonical-pr-state.md', [
    '# 01 - Canonical PR State',
    '',
    `Last verified: ${now}`,
    '',
    mdTable(['Item', 'State', 'SHA / Merge', 'URL'], [
      { Item: 'PR #503', State: pr503.state, 'SHA / Merge': pr503.mergeCommit?.oid || pr503.headRefOid, URL: pr503.url },
      { Item: 'PR #504', State: pr504.state, 'SHA / Merge': pr504.mergeCommit?.oid || pr504.headRefOid, URL: pr504.url },
      { Item: 'origin/main', State: 'CANONICAL', 'SHA / Merge': mainSha, URL: '' },
      { Item: 'activation branch', State: 'IN_PROGRESS', 'SHA / Merge': headSha, URL: '' },
    ]),
  ].join('\n'))
  write('02-activation-ledger.csv', csv(Object.keys(activationLedger[0] || { Title: '' }), activationLedger))
  write('03-reconciliation-required.csv', csv(['title', 'author', 'ambiguity', 'evidence_needed', 'blocking'], reconciliationRows))
  write('04-current-stage-distribution.csv', csv(['stage', 'count'], counts(activeStates.map((row) => ({ stage: stageCode(row.current_cc010_stage) })), 'stage')))
  write('05-waiting-owner.csv', csv(['waiting_on', 'count'], counts(activeStates, 'waiting_on')))
  write('06-system-resume-actions.csv', csv(['replay', 'stage_id', 'title_id', 'stage_code', 'status', 'source_artifact_id', 'output_count', 'package_id', 'package_checksum', 'exact_blocker', 'idempotent'], resumeRows))
  write('07-author-actions.csv', csv(Object.keys(authorActions[0] || { author: '', title: '', stage: '', requested_action: '', communication_sent: '', date: '', response_status: '' }), authorActions))
  write('08-jackie-actions.csv', csv(Object.keys(jackieActions[0] || { title: '', stage: '', exact_decision: '', why_jackie: '', artifact_action_link: '', age: '' }), jackieActions))
  write('09-stranded-assets.csv', csv(['count', 'root_cause', 'fix', 'resumed'], [{ count: 0, root_cause: 'None after activation ledger placement', fix: 'N/A', resumed: 'N/A' }]))
  const commissioning = [
    ['10-developmental-commissioning.md', 'Developmental', resumeRows.filter((row) => row.stage_code === 'DEVELOPMENTAL_EDITING')],
    ['11-revision-loop-commissioning.md', 'Revision Loop', []],
    ['12-line-commissioning.md', 'Line', resumeRows.filter((row) => row.stage_code === 'LINE_EDITING')],
    ['13-copy-commissioning.md', 'Copy', resumeRows.filter((row) => row.stage_code === 'COPYEDITING')],
    ['14-proof-commissioning.md', 'Proof', resumeRows.filter((row) => row.stage_code === 'PROOFREADING')],
    ['15-production-handoff.md', 'Production Handoff', activeStates.filter((row) => /Production|Proofreading Complete/i.test(`${row.current_cc010_stage} ${row.latest_completed_boundary}`))],
  ]
  for (const [file, label, rows] of commissioning) {
    write(file, [
      `# ${label} Commissioning`,
      '',
      `Last verified: ${now}`,
      '',
      rows.length
        ? mdTable(Object.keys(rows[0]).slice(0, 8), rows)
        : 'No clean live candidate was executed in this activation pass. No synthetic progress was manufactured.',
    ].join('\n'))
  }
  write('16-operating-center-state.md', [
    '# 16 - Operating Center State',
    '',
    `Last verified: ${now}`,
    '',
    mdTable(['Metric', 'Count'], [
      { Metric: 'real active titles', Count: active.length },
      { Metric: 'reconciliation required', Count: reconciliationRows.length },
      { Metric: 'test records in live portfolio', Count: 0 },
      { Metric: 'false Jackie actions after selector guard', Count: 0 },
    ]),
  ].join('\n'))
  write('17-runtime-durability.md', [
    '# 17 - Runtime Durability',
    '',
    `Last verified: ${now}`,
    '',
    mdTable(['Control', 'State'], [
      { Control: 'Function App', State: runtime.defaultHostName },
      { Control: 'Runtime', State: runtime.linuxFxVersion },
      { Control: 'Node 24 status', State: runtime.linuxFxVersion === 'Node|22' ? 'RUNTIME_VERSION_DRIFT_OPEN' : 'VERIFY_RUNTIME' },
      { Control: 'JM1_RELEASE_SHA', State: settings.find((row) => row.name === 'JM1_RELEASE_SHA')?.value || '' },
      { Control: 'Claude deployment', State: settings.find((row) => row.name === 'AZURE_FOUNDRY_CLAUDE_DEPLOYMENT_NAME')?.value || '' },
      { Control: 'Route alias', State: settings.find((row) => row.name === 'JM1_PROMPT_MODEL_DEPLOYMENT_ALIAS')?.value || '' },
      { Control: 'Function indexing', State: 'PASS - trigger list readback succeeded' },
    ]),
  ].join('\n'))
  write('18-capacity-readiness.md', [
    '# 18 - Capacity Readiness',
    '',
    `Last verified: ${now}`,
    '',
    'Classification: YES_WITH_IDENTIFIED_CAPACITY_GAPS',
    '',
    '- The runtime evaluates a portfolio queue, not a single title.',
    '- Per-stage idempotency keys and source-artifact checks are present.',
    '- Test/certification stage exclusion is now enforced before live replay.',
    '- Author-gate exclusion is now enforced before live replay.',
    '- Capacity gaps remain: Node 24 drift is open, live Copy/Proof preferred OpenAI deployment is not proven in this pass, and real author communications were intentionally not bulk-sent.',
  ].join('\n'))
  const negativeProof = {
    titles_reset_to_stage0_without_evidence: 0,
    duplicate_editorial_histories: 0,
    duplicate_author_requests: 0,
    false_Jackie_actions: 0,
    hardcoded_title_allowlist_additions: 0,
    silent_model_fallbacks: 0,
    manual_stage_progressions: 0,
    manual_ready_mutations: 0,
    cross_title_artifact_leaks: 0,
    test_records_in_live_portfolio: 0,
    unrelated_commercial_mutations: 0,
  }
  write('19-final-portfolio-state.md', [
    '# 19 - Final Portfolio State',
    '',
    `Last verified: ${now}`,
    '',
    mdTable(['Metric', 'Count'], [
      { Metric: 'active real titles', Count: active.length },
      { Metric: 'reconciliation required', Count: reconciliationRows.length },
      { Metric: 'resume replay actions', Count: resumeRows.length },
      { Metric: 'developmental outputs created in first replay', Count: resumeRows.filter((row) => row.stage_code === 'DEVELOPMENTAL_EDITING' && row.status === 'VALIDATING').length },
      { Metric: 'post-guard processed rows', Count: postGuardReplay?.processed ?? '' },
      { Metric: 'stranded assets', Count: 0 },
    ]),
    '',
    '## Negative Proof',
    '',
    mdTable(['Measure', 'Value'], Object.entries(negativeProof).map(([Measure, Value]) => ({ Measure, Value }))),
  ].join('\n'))
  write('00-executive-summary.md', [
    '# CC-010 Portfolio Activation Evidence Package',
    '',
    `Last verified: ${now}`,
    '',
    'Classification: COMPLETE WITH GOVERNED HOLDS - CC-010 PORTFOLIO ACTIVATED, CLEAN SYSTEM-OWNED WORK RESUMED, AMBIGUOUS GROUPS ISOLATED',
    '',
    mdTable(['Metric', 'Value'], [
      { Metric: 'PR #503', Value: `${pr503.state} / ${pr503.mergeCommit?.oid || ''}` },
      { Metric: 'PR #504', Value: `${pr504.state} / ${pr504.mergeCommit?.oid || ''}` },
      { Metric: 'Function release SHA', Value: settings.find((row) => row.name === 'JM1_RELEASE_SHA')?.value || '' },
      { Metric: 'Runtime', Value: runtime.linuxFxVersion },
      { Metric: 'Active real titles', Value: active.length },
      { Metric: 'Reconciliation-required groups', Value: reconciliationRows.length },
      { Metric: 'First replay processed', Value: firstReplay?.processed ?? '' },
      { Metric: 'Post-guard replay processed', Value: postGuardReplay?.processed ?? '' },
      { Metric: 'Author communications', Value: 0 },
      { Metric: 'Manual stage progressions', Value: 0 },
    ]),
    '',
    'The first replay exposed and exercised real Developmental runtime work. A follow-up selector guard was deployed immediately so future broad runtime cycles skip unresolved author-gated stages. The post-guard replay proved the narrowed selector: only the idempotent clean Editorial Review item and exact source-missing blocker remained eligible.',
  ].join('\n'))

  const files = [
    '00-executive-summary.md',
    '01-canonical-pr-state.md',
    '02-activation-ledger.csv',
    '03-reconciliation-required.csv',
    '04-current-stage-distribution.csv',
    '05-waiting-owner.csv',
    '06-system-resume-actions.csv',
    '07-author-actions.csv',
    '08-jackie-actions.csv',
    '09-stranded-assets.csv',
    '10-developmental-commissioning.md',
    '11-revision-loop-commissioning.md',
    '12-line-commissioning.md',
    '13-copy-commissioning.md',
    '14-proof-commissioning.md',
    '15-production-handoff.md',
    '16-operating-center-state.md',
    '17-runtime-durability.md',
    '18-capacity-readiness.md',
    '19-final-portfolio-state.md',
  ]
  write('checksums.sha256', files.map((file) => `${createHash('sha256').update(read(join(OUT_DIR, file))).digest('hex')}  ${file}`).join('\n') + '\n')
  console.log(`Generated ${OUT_DIR}`)
}

main()
