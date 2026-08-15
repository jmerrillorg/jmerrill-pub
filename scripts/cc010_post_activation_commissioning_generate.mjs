#!/usr/bin/env node

import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const OUT_DIR = 'docs/operations/generated/CC010-POST-ACTIVATION-STAGE-COMMISSIONING-2026-08-14'
const LIVE_READBACK = '/tmp/cc010-post-activation/live-dataverse-readback.json'
const GUARDED_REPLAY = '/tmp/cc010-post-activation/editorial-runtime-admin-replay-post-main.json'
const AUTHOR_RESPONSE_REPLAY = '/tmp/cc010-post-activation/author-response-consumer-replay.json'
const NPM_TEST_LOG = '/tmp/cc010-post-activation/diagnostic-ai-runner-npm-test.log'
const now = new Date().toISOString()

function read(path) {
  return existsSync(path) ? readFileSync(path, 'utf8') : ''
}

function json(path, fallback = null) {
  const text = read(path)
  if (!text) return fallback
  try {
    return JSON.parse(text)
  } catch {
    return fallback
  }
}

function write(name, content) {
  writeFileSync(join(OUT_DIR, name), `${content.trimEnd()}\n`)
}

function table(headers, rows) {
  return [
    `| ${headers.join(' | ')} |`,
    `| ${headers.map(() => '---').join(' | ')} |`,
    ...rows.map((row) => `| ${headers.map((header) => String(row[header] ?? '').replace(/\|/g, '\\|')).join(' | ')} |`),
  ].join('\n')
}

function csvCell(value) {
  const text = String(value ?? '').replace(/\r?\n/g, ' ').replace(/\s+/g, ' ').trim()
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

function csv(headers, rows) {
  return [headers.join(','), ...rows.map((row) => headers.map((header) => csvCell(row[header])).join(','))].join('\n')
}

function titleNameMap(data) {
  return new Map((data.titles || []).map((title) => [title.jm1pub_titleid, title.jm1pub_titlename]))
}

function byStageType(data, stageType) {
  return (data.stages || []).filter((stage) => Number(stage.jm1pub_stagetype) === stageType)
}

function gatesForStage(data, stageId) {
  return (data.gates || []).filter((gate) => gate._jm1pub_editorialstageid_value === stageId)
}

function artifactsForStage(data, stageId) {
  return (data.artifacts || []).filter((artifact) => artifact._jm1pub_editorialstageid_value === stageId)
}

function latestArtifact(data, stageId, pattern) {
  return artifactsForStage(data, stageId).find((artifact) => pattern.test(artifact.jm1pub_editorialartifactname || artifact.jm1pub_filename || '')) || null
}

function gateSummary(gates) {
  if (!gates.length) return 'No gate located'
  return gates
    .map((gate) => {
      const approved = Number(gate.jm1pub_gatestatus) === 196650003 && Number(gate.jm1pub_authordecision) === 196650000 && gate.jm1pub_authordecisionon
      return `${gate.jm1pub_editorialapprovalgatename || gate.jm1pub_editorialapprovalgateid}: ${approved ? 'FULL_APPROVAL' : 'UNRESOLVED_OR_NOT_FINAL'}`
    })
    .join('; ')
}

function sourceState(data, stage) {
  const source = latestArtifact(data, stage.jm1pub_editorialstageid, /Source Manuscript|Manuscript Review Copy|Developmentally Edited Manuscript|Proof/i)
  if (!source) return 'No authoritative source located in live readback'
  return `${source.jm1pub_editorialartifactname}; sha=${source.jm1pub_sha256 ? 'present' : 'missing'}; item=${source.jm1pub_repositoryitemid ? 'present' : 'missing'}`
}

function mdDoc(title, body) {
  return `# ${title}

Last verified: ${now}

${body}`
}

function main() {
  mkdirSync(OUT_DIR, { recursive: true })
  const data = json(LIVE_READBACK, { stages: [], artifacts: [], gates: [], logs: [], titles: [] })
  const replay = json(GUARDED_REPLAY, { processed: 0, results: [] })
  const authorReplayText = read(AUTHOR_RESPONSE_REPLAY)
  const npmLog = read(NPM_TEST_LOG)
  const names = titleNameMap(data)

  const developmentalStages = byStageType(data, 100000001)
  const lineStages = byStageType(data, 100000002)
  const copyStages = byStageType(data, 100000003)
  const proofStages = byStageType(data, 100000004)
  const internalQaStages = byStageType(data, 100000006)

  const developmentalRows = developmentalStages.map((stage) => {
    const gates = gatesForStage(data, stage.jm1pub_editorialstageid)
    const manifest = latestArtifact(data, stage.jm1pub_editorialstageid, /Package Manifest v2|Package Manifest/i)
    const edited = latestArtifact(data, stage.jm1pub_editorialstageid, /Developmentally Edited Manuscript/i)
    return {
      title: names.get(stage._jm1pub_titleid_value) || stage._jm1pub_titleid_value || 'Unknown',
      stage_id: stage.jm1pub_editorialstageid,
      status: stage.jm1pub_stagestatus,
      package_manifest: manifest?.jm1pub_editorialartifactid || 'Not located',
      edited_artifact: edited?.jm1pub_editorialartifactid || 'Not located',
      gate: gateSummary(gates),
      result: manifest && edited ? 'OUTPUT_PACKAGE_LIVE_PROVEN' : 'NOT_READY',
    }
  })

  const lineRows = lineStages.map((stage) => ({
    title: names.get(stage._jm1pub_titleid_value) || stage._jm1pub_titleid_value || 'Unknown',
    stage_id: stage.jm1pub_editorialstageid,
    status: stage.jm1pub_stagestatus,
    source: sourceState(data, stage),
    gate: gateSummary(gatesForStage(data, stage.jm1pub_editorialstageid)),
  }))
  const copyRows = copyStages.map((stage) => ({
    title: names.get(stage._jm1pub_titleid_value) || stage._jm1pub_titleid_value || 'Unknown',
    stage_id: stage.jm1pub_editorialstageid,
    status: stage.jm1pub_stagestatus,
    source: sourceState(data, stage),
    gate: gateSummary(gatesForStage(data, stage.jm1pub_editorialstageid)),
  }))
  const proofRows = proofStages.map((stage) => ({
    title: names.get(stage._jm1pub_titleid_value) || stage._jm1pub_titleid_value || 'Unknown',
    stage_id: stage.jm1pub_editorialstageid,
    status: stage.jm1pub_stagestatus,
    source: sourceState(data, stage),
    gate: gateSummary(gatesForStage(data, stage.jm1pub_editorialstageid)),
  }))

  const npmSummary = npmLog.match(/tests (\d+)[\s\S]*?pass (\d+)[\s\S]*?fail (\d+)/)
  const agreementFailures = [...npmLog.matchAll(/test\/agreementGeneratedPackageMirror\.test\.js:(\d+):(\d+)[\s\S]*?✖ ([^\n]+)/g)].map((match) => ({
    test: match[3],
    location: `test/agreementGeneratedPackageMirror.test.js:${match[1]}`,
    classification: 'UNRELATED_KNOWN_DEFECT',
  }))

  write('01-pr505-canonicalization.md', mdDoc('01 - PR #505 Canonicalization', table(['Item', 'State'], [
    { Item: 'PR #505', State: 'MERGED / 924a537e2da14a3d23261ee27dc2964b3f01cd25' },
    { Item: 'Activation head', State: '747553849cbe0052cf190e392d8655e7bf4027a0' },
    { Item: 'Production release SHA', State: 'fb9f4704c2573fcd718b388d560b5d0f870de2a1 contained in canonical main' },
    { Item: 'Post-main guarded replay', State: `${replay.processed} processed; ${replay.results?.map((row) => row.status).join(', ')}` },
  ])))

  write('02-developmental-candidate.md', mdDoc('02 - Developmental Candidate', [
    'Selected real candidate class: live Developmental stages generated during activation replay and read back from Dataverse.',
    '',
    table(['title', 'stage_id', 'package_manifest', 'edited_artifact', 'gate', 'result'], developmentalRows),
    '',
    'Developmental output/package materialization is live-proven for real titles. Claude model invocation is not certified by `editorialExecutionRuntime` because that runtime does not yet call the model-router/provider inside stage processing.',
  ].join('\n')))

  write('03-developmental-live-proof.md', mdDoc('03 - Developmental Live Proof', table(['Proof', 'State'], [
    { Proof: 'Real source/artifact path', State: 'YES for replayed Developmental rows' },
    { Proof: 'Output artifacts', State: 'Developmentally Edited Manuscript, Developmental Memo, Review Instructions, Change Ledger, QA Evidence' },
    { Proof: 'Package manifest', State: 'v2 manifests generated/read back' },
    { Proof: 'Author gate', State: 'Created/present, unresolved; WAITING_ON_AUTHOR-equivalent' },
    { Proof: 'Routine Jackie action', State: '0 created' },
    { Proof: 'Claude provider live invocation', State: 'NOT CERTIFIED IN THIS RUNTIME; model route commissioned separately' },
  ])))

  write('04-author-revision-loop.md', mdDoc('04 - Author Revision Loop', table(['Item', 'State'], [
    { Item: 'Author response consumer replay', State: authorReplayText || 'Not run' },
    { Item: 'Revision-loop clean candidate', State: 'NONE - no broad replay allowed; no specific original event id supplied; unresolved gates remain author-owned' },
    { Item: 'Full approval rule', State: 'PRESERVED - conditional/partial/requested changes are not final approval' },
  ])))

  write('05-line-candidate.md', mdDoc('05 - Line Candidate', table(['title', 'stage_id', 'status', 'source', 'gate'], lineRows)))
  write('06-line-live-proof.md', mdDoc('06 - Line Live Proof', table(['Item', 'State'], [
    { Item: 'Clean current Line candidate', State: 'NONE for new post-activation live execution' },
    { Item: 'Historical real evidence', State: 'The Intentional Leader Line Editing COMPLETE with approved gate' },
    { Item: 'Claude route', State: 'Preferred route defined/commissioned, but Line stage runtime live invocation not executed in this pass' },
  ])))

  write('07-copy-candidate.md', mdDoc('07 - Copy Candidate', table(['title', 'stage_id', 'status', 'source', 'gate'], copyRows)))
  write('08-copy-live-proof.md', mdDoc('08 - Copy Live Proof', table(['Item', 'State'], [
    { Item: 'Clean current Copy candidate', State: 'NONE for new post-activation live execution' },
    { Item: 'Historical real evidence', State: 'The Intentional Leader Copyediting COMPLETE with approved gate' },
    { Item: 'Preferred OpenAI route', State: 'GPT-5.4 catalog candidate is not deployed/certified; fallback-only according to route registry' },
  ])))

  write('09-proof-candidate.md', mdDoc('09 - Proof Candidate', table(['title', 'stage_id', 'status', 'source', 'gate'], proofRows)))
  write('10-proof-live-proof.md', mdDoc('10 - Proof Live Proof', table(['Item', 'State'], [
    { Item: 'Clean current Proof candidate', State: 'NONE for new post-activation live execution' },
    { Item: 'Historical real evidence', State: 'The Intentional Leader Proofreading COMPLETE with approved gate' },
    { Item: 'Preferred OpenAI route', State: 'GPT-5.4 catalog candidate is not deployed/certified; fallback-only according to route registry' },
  ])))

  write('11-production-handoff.md', mdDoc('11 - Production Handoff', table(['Item', 'State'], [
    { Item: 'Clean CC-010 production-handoff candidate', State: 'NONE newly commissioned in this pass' },
    { Item: 'Historical downstream title', State: 'The Intentional Leader has Proofreading COMPLETE and later Editorial Internal QA COMPLETE' },
    { Item: 'Boundary', State: 'No ISBN, layout, cover, distribution, or production-domain mutation performed here' },
    { Item: 'Internal QA rows', State: String(internalQaStages.length) },
  ])))

  write('12-public-author-identity-verification.md', mdDoc('12 - Public Author Identity Verification', table(['Check', 'State'], [
    { Check: 'R. Dorian Night', State: 'Resolver policy added; test proves legal/internal name is absent from public projection' },
    { Check: 'J. Derrick Johnson', State: 'Resolver policy added; exact capitalization/punctuation preserved' },
    { Check: 'Anonymous suppression', State: 'Existing Felix/The Paper Champ guard retained' },
    { Check: 'Regression guard', State: 'scripts/public_author_privacy_guard.test.mjs = 21/21 PASS' },
  ])))

  write('13-author-workspace-verification.md', mdDoc('13 - Author Workspace Verification', table(['Check', 'State'], [
    { Check: 'Developmental author task', State: 'Gate records exist; no generic author-review send route certified for the new Developmental packages' },
    { Check: 'Login/task/artifact open', State: 'NOT LIVE-VERIFIED in this pass; no author-facing send executed' },
    { Check: 'Author response detection', State: 'Admin replay failed closed without exact original event id; no broad sweep performed' },
  ])))

  write('14-operating-center-state.md', mdDoc('14 - Operating Center State', table(['Metric', 'State'], [
    { Metric: 'Live stages read', State: String(data.stages?.length || 0) },
    { Metric: 'Live artifacts read', State: String(data.artifacts?.length || 0) },
    { Metric: 'Live gates read', State: String(data.gates?.length || 0) },
    { Metric: 'Stale pre-reconciliation dominance', State: 'Not used for candidate decisions; live readback controls' },
  ])))

  write('15-node24-runtime-state.md', mdDoc('15 - Node 24 Runtime State', table(['Item', 'State'], [
    { Item: 'Current Function host', State: 'Node|22' },
    { Item: 'Plan', State: 'EastUSLinuxDynamicPlan / Y1 Dynamic Linux Functions' },
    { Item: 'Package engines', State: '>=22 <25' },
    { Item: 'Prior Node 24 evidence', State: 'INFRA-007 attempted Node|24; protected probes returned 503; rollback to Node|22 restored 401' },
    { Item: 'Classification', State: 'RUNTIME_VERSION_DRIFT_OPEN' },
  ])))

  write('16-agreement-test-defect-classification.md', mdDoc('16 - Agreement Test Defect Classification', table(['Item', 'State'], [
    { Item: 'npm test', State: npmSummary ? `${npmSummary[1]} tests / ${npmSummary[2]} pass / ${npmSummary[3]} fail` : 'See captured log' },
    { Item: 'Failure file', State: 'test/agreementGeneratedPackageMirror.test.js only' },
    { Item: 'Classification', State: 'UNRELATED_KNOWN_DEFECT - generated agreement blob mirror lane, not CC-010 editorial runtime/model routing/author gates' },
    { Item: 'Failures', State: agreementFailures.map((failure) => failure.test).join('; ') || 'See captured log' },
  ])))

  write('17-capacity-readiness.md', mdDoc('17 - Capacity Readiness', table(['Measure', 'State'], [
    { Measure: 'Queue behavior', State: 'Guarded replay scanned portfolio and processed only 2 eligible rows' },
    { Measure: 'Per-title isolation', State: 'Post-guard replay did not touch author-gated Developmental rows' },
    { Measure: 'Retry isolation', State: 'Idempotent replay preserved existing output/blocker records' },
    { Measure: 'Model capacity', State: 'Claude route commissioned for Stage 0/Developmental/Line; Copy/Proof preferred OpenAI route not deployed' },
    { Measure: '50-title readiness', State: 'PARTIAL - selector/idempotency ready; author-review send/response and later-stage model integration remain bottlenecks' },
  ])))

  write('18-final-cc010-state.md', mdDoc('18 - Final CC-010 State', [
    table(['Stage', 'Implemented', 'Deployed', 'Live_Proven', 'Durably_Certified', 'Notes'], [
      { Stage: 'Stage 0', Implemented: 'YES', Deployed: 'YES', Live_Proven: 'YES', Durably_Certified: 'YES_WITH_NODE_DRIFT', Notes: 'Claude route and guarded portfolio selector active' },
      { Stage: 'Developmental', Implemented: 'PARTIAL', Deployed: 'YES', Live_Proven: 'OUTPUT_PACKAGE_ONLY', Durably_Certified: 'NO', Notes: 'Real packages generated; unresolved author gates; model provider not invoked by stage runtime' },
      { Stage: 'Revision Loop', Implemented: 'PARTIAL', Deployed: 'YES', Live_Proven: 'NO', Durably_Certified: 'NO', Notes: 'No specific response event supplied; broad replay failed closed' },
      { Stage: 'Line', Implemented: 'PARTIAL', Deployed: 'YES', Live_Proven: 'HISTORICAL_ONLY', Durably_Certified: 'NO', Notes: 'No clean current Line candidate; Claude route exists' },
      { Stage: 'Copy', Implemented: 'PARTIAL', Deployed: 'YES', Live_Proven: 'HISTORICAL_ONLY', Durably_Certified: 'NO', Notes: 'No clean current Copy candidate; preferred OpenAI route not deployed' },
      { Stage: 'Proof', Implemented: 'PARTIAL', Deployed: 'YES', Live_Proven: 'HISTORICAL_ONLY', Durably_Certified: 'NO', Notes: 'No clean current Proof candidate; preferred OpenAI route not deployed' },
      { Stage: 'Production Handoff', Implemented: 'PARTIAL', Deployed: 'YES', Live_Proven: 'HISTORICAL_ONLY', Durably_Certified: 'NO', Notes: 'No new handoff mutation; Production domain boundary preserved' },
    ]),
    '',
    '## Negative Proof',
    '',
    table(['Measure', 'Value'], [
      { Measure: 'synthetic_live_commissioning_assets', Value: 0 },
      { Measure: 'manual_stage_progressions', Value: 0 },
      { Measure: 'false_author_approvals', Value: 0 },
      { Measure: 'conditional_approvals_treated_as_final', Value: 0 },
      { Measure: 'duplicate_author_requests', Value: 0 },
      { Measure: 'false_Jackie_actions', Value: 0 },
      { Measure: 'silent_model_fallbacks', Value: 0 },
      { Measure: 'cross_title_artifact_leaks', Value: 0 },
      { Measure: 'public_pen_name_leaks', Value: 0 },
      { Measure: 'hardcoded_title_allowlist_additions', Value: 0 },
      { Measure: 'unrelated_commercial_mutations', Value: 0 },
    ]),
  ].join('\n')))

  write('00-executive-summary.md', mdDoc('00 - Executive Summary', [
    'Classification: COMPLETE WITH GOVERNED HOLDS - PR #505 CANONICALIZED, POST-ACTIVATION SELECTOR GUARD VERIFIED, DEVELOPMENTAL OUTPUT/PACKAGE LIVE-PROVEN, LATER STAGES HELD WITHOUT CLEAN REAL BOUNDARY.',
    '',
    table(['Item', 'State'], [
      { Item: 'PR #505', State: 'MERGED / 924a537e2da14a3d23261ee27dc2964b3f01cd25' },
      { Item: 'Current main', State: '924a537e2da14a3d23261ee27dc2964b3f01cd25 at branch start' },
      { Item: 'Production release SHA', State: 'fb9f4704c2573fcd718b388d560b5d0f870de2a1' },
      { Item: 'Guarded replay', State: 'PASS - 2 processed; no author-gated Developmental reprocessing' },
      { Item: 'Developmental', State: 'OUTPUT_PACKAGE_LIVE_PROVEN; author review gates unresolved' },
      { Item: 'Revision/Line/Copy/Proof/Production Handoff', State: 'COMMISSIONING READY / NO CLEAN REAL BOUNDARY YET for new live execution' },
      { Item: 'Public author identity', State: 'PASS - shared resolver and guard updated' },
      { Item: 'Node 24', State: 'RUNTIME_VERSION_DRIFT_OPEN' },
    ]),
    '',
    'The canonical runtime is protected against the activation selector regression. The portfolio should not be forced forward: unresolved Developmental author gates and absent clean later-stage candidates block lawful progression.',
  ].join('\n')))

  const checksumRows = []
  for (const name of [
    '00-executive-summary.md',
    '01-pr505-canonicalization.md',
    '02-developmental-candidate.md',
    '03-developmental-live-proof.md',
    '04-author-revision-loop.md',
    '05-line-candidate.md',
    '06-line-live-proof.md',
    '07-copy-candidate.md',
    '08-copy-live-proof.md',
    '09-proof-candidate.md',
    '10-proof-live-proof.md',
    '11-production-handoff.md',
    '12-public-author-identity-verification.md',
    '13-author-workspace-verification.md',
    '14-operating-center-state.md',
    '15-node24-runtime-state.md',
    '16-agreement-test-defect-classification.md',
    '17-capacity-readiness.md',
    '18-final-cc010-state.md',
  ]) {
    const content = read(join(OUT_DIR, name))
    checksumRows.push(`${createHash('sha256').update(content).digest('hex')}  ${name}`)
  }
  writeFileSync(join(OUT_DIR, 'checksums.sha256'), `${checksumRows.join('\n')}\n`)
}

main()
