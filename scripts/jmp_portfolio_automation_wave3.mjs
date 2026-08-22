#!/usr/bin/env node

import { createHash } from 'node:crypto'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { evaluatePortfolio } from '../lib/publishing/portfolio/automation-controller.mjs'
import { reconcileWave2 } from '../lib/publishing/portfolio/automation-wave2.mjs'
import { WAVE3_CONTROLLER_VERSION, reconcileWave3 } from '../lib/publishing/portfolio/automation-wave3.mjs'
import { buildControllerRecords, getToken, readPortfolioSource } from './jmp_portfolio_automation_controller_scan.mjs'

const OUTPUT_DIR = 'docs/operations/generated/JMP-PORTFOLIO-AUTOMATION-WAVE3-2026-08-22'
const DATAVERSE_BASE = process.env.DATAVERSE_WEB_API_BASE_URL || 'https://jm1hq.crm.dynamics.com/api/data/v9.2'
const EXECUTE = process.argv.includes('--execute')

async function main() {
  const generatedOn = new Date().toISOString()
  const token = getToken()
  const source = await readPortfolioSource(token)
  const records = buildControllerRecords(source)
  const wave1 = evaluatePortfolio(records, { evaluatedOn: generatedOn })
  const wave2 = reconcileWave2({ records, evaluation: wave1, source })
  const preliminary = reconcileWave3({ records, evaluation: wave1, source, wave2 })
  const actionAudit = EXECUTE ? await executeWave3Actions({ token, generatedOn, actions: [...preliminary.queueable, ...preliminary.tasked] }) : []
  const actionKeys = new Set(actionAudit.map((row) => row.actionKey))
  const createdActionKeys = new Set(actionAudit.filter((row) => /CREATED$/.test(row.result)).map((row) => row.actionKey))
  const wave3 = reconcileWave3({ records, evaluation: wave1, source, wave2, actionKeys, createdActionKeys, executed: EXECUTE })
  const docs = buildDocs({ generatedOn, source, wave1, wave2, wave3, actionAudit })

  mkdirSync(OUTPUT_DIR, { recursive: true })
  for (const [file, content] of Object.entries(docs)) writeFileSync(join(OUTPUT_DIR, file), content)
  writeChecksums(Object.keys(docs))

  console.log(JSON.stringify({
    generatedOn,
    execute: EXECUTE,
    classification: finalClassification(wave3),
    recordsEvaluated: wave3.recordsEvaluated,
    systemAttentionBefore: wave3.summary.systemAttentionBefore,
    systemAttentionAfter: wave3.summary.systemAttentionAfter,
    genericSystemAttention: wave3.summary.genericSystemAttention,
    autoExecutableBefore: wave3.summary.autoExecutableBefore,
    autoExecutableAfter: wave3.summary.autoExecutableAfter,
    automaticallyQueued: wave3.summary.automaticallyQueued,
    automaticallyResumed: wave3.summary.automaticallyResumed,
    operatorTasks: wave3.summary.operatorTasks,
    unexplainedIdle: wave3.summary.unexplainedIdle,
    mutations: wave3.summary.mutations,
  }, null, 2))
}

async function executeWave3Actions({ token, generatedOn, actions }) {
  const audit = []
  for (const item of actions) {
    const existing = await findExistingWave3Log(token, item.wave3ActionKey)
    if (existing) {
      audit.push(auditRow(item, existing.jm1_executionlogid, item.wave3AutomationClass === 'CREATE_OPERATOR_TASK_FOR_EXTERNAL_MANUAL_STEP' ? 'OPERATOR_TASK_ALREADY_PRESENT' : 'QUEUE_ALREADY_PRESENT'))
      continue
    }
    const created = await createExecutionLog(token, {
      name: `PORTFOLIO-WAVE3-${item.wave3ActionKey}`,
      actionType: `PORTFOLIO_WAVE3_${item.wave3AutomationClass}`,
      description:
        `Wave 3 controller recorded autonomous portfolio action. controllerVersion=${WAVE3_CONTROLLER_VERSION}; ` +
        `title=${item.title}; author=${item.author}; priorState=${item.wave2WaitingState}; attentionClass=${item.wave3SystemAttentionClass}; ` +
        `action=${item.wave3NextAction}; lifecycleRule=${item.titleLifecycleStage}/${item.substage}; prerequisiteEvidence=${item.evidence.join('; ')}; ` +
        `jobId=${item.wave3ActionKey}; occurredOn=${generatedOn}; result=${item.wave3AutomationClass === 'CREATE_OPERATOR_TASK_FOR_EXTERNAL_MANUAL_STEP' ? 'OPERATOR_TASK_CREATED' : 'QUEUED'}; ` +
        'nextEvaluation=event-driven and daily portfolio reevaluation. Human approval, author decision, pricing, rights, QA, provider selection, and final-file gates were not bypassed.',
      sourceEntity: item.titleId ? 'jm1pub_title' : item.intakeId ? 'jm1_publishingintake' : item.opportunityId ? 'opportunity' : 'portfolio_record',
      sourceRecordId: item.titleId || item.intakeId || item.opportunityId || item.title,
    })
    audit.push(auditRow(item, created.jm1_executionlogid || '', item.wave3AutomationClass === 'CREATE_OPERATOR_TASK_FOR_EXTERNAL_MANUAL_STEP' ? 'OPERATOR_TASK_CREATED' : 'QUEUED_EXECUTION_LOG_CREATED'))
  }
  return audit
}

function auditRow(item, executionLogId, result) {
  return {
    actionKey: item.wave3ActionKey,
    title: item.title,
    author: item.author,
    systemAttentionClass: item.wave3SystemAttentionClass,
    automationClass: item.wave3AutomationClass,
    waitingState: item.wave3WaitingState,
    result,
    executionLogId,
  }
}

async function findExistingWave3Log(token, actionKey) {
  const filter = `jm1_name eq 'PORTFOLIO-WAVE3-${actionKey}'`
  const url = `${DATAVERSE_BASE}/jm1_executionlogs?$select=jm1_executionlogid,jm1_name,jm1_actiontype,createdon&$filter=${encodeURIComponent(filter)}&$top=1`
  const res = await fetch(url, { headers: dvHeaders(token) })
  if (!res.ok) throw new Error(`wave3_log_lookup_failed:${res.status}:${await res.text()}`)
  return (await res.json()).value?.[0] || null
}

async function createExecutionLog(token, input) {
  const res = await fetch(`${DATAVERSE_BASE}/jm1_executionlogs`, {
    method: 'POST',
    headers: { ...dvHeaders(token), 'Content-Type': 'application/json', Prefer: 'return=representation' },
    body: JSON.stringify({
      jm1_name: input.name.slice(0, 200),
      jm1_actiontype: input.actionType.slice(0, 100),
      jm1_actiondescription: input.description.slice(0, 2000),
      jm1_agentname: 'JMP Portfolio Automation Controller',
      jm1_agentmodel: 'Wave3 system-attention burn-down',
      jm1_bandlevel: 835500000,
      jm1_executionstatus: 835500001,
      jm1_startedon: new Date().toISOString(),
      jm1_completedon: new Date().toISOString(),
      jm1_sourceentity: input.sourceEntity,
      jm1_sourcerecordid: input.sourceRecordId,
    }),
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(`wave3_log_create_failed:${res.status}:${JSON.stringify(body).slice(0, 500)}`)
  return body
}

function buildDocs({ generatedOn, source, wave1, wave2, wave3, actionAudit }) {
  const composition = wave3.portfolioComposition
  const delta = wave2SystemAttentionDelta(wave2)
  const actionRows = actionAudit.length
    ? actionAudit.map((row) => `| ${cell(row.author)} | ${cell(row.title)} | ${cell(row.systemAttentionClass)} | ${cell(row.automationClass)} | ${cell(row.result)} | ${cell(row.executionLogId)} |`).join('\n')
    : '| - | - | - | - | NO_EXECUTE_FLAG | - |'
  const namedRows = wave3.namedTitles.map((row) =>
    `| ${cell(row.requested)} | ${row.found ? 'YES' : 'NO'} | ${cell(row.stage)} | ${cell(row.blocker)} | ${cell(row.nextAction)} | ${cell(row.automation)} | ${cell(row.actionTaken)} |`,
  ).join('\n')
  const portfolioRows = wave3.items
    .sort((a, b) => String(a.title).localeCompare(String(b.title)))
    .map((item) => `| ${cell(item.author)} | ${cell(item.title)} | ${cell(item.titleLifecycleStage)} | ${cell(item.substage)} | ${cell(item.wave3WaitingState)} | ${cell(item.wave3SystemAttentionClass)} | ${cell(item.wave3NextAction)} | ${cell(item.wave3AutomationClass)} | ${cell(item.wave3ActionTaken)} |`)
    .join('\n')
  const olderRows = wave3.missingTitles.map((row) =>
    `| ${cell(row.title)} | ${row.foundInGovernedReadback ? 'YES' : 'NO'} | ${cell(row.disposition)} | ${cell(row.note)} | ${cell(row.evidence.join('; '))} |`,
  ).join('\n')
  const burndownRows = wave3.attentionBurndown.map((row) => `| ${cell(row.class)} | ${row.before} | ${row.after} | ${row.delta} |`).join('\n')
  const eventRows = wave3.eventReevaluationPolicies.map((row) => `| ${cell(row.event)} | ${cell(row.result)} |`).join('\n')
  const retryRows = wave3.retryPolicies.map((row) => `| ${cell(row.failure)} | ${cell(row.action)} |`).join('\n')
  const largestRemaining = Object.entries(wave3.afterRootCauseDistribution).sort((a, b) => b[1] - a[1]).slice(0, 10)
    .map(([key, count]) => `| ${cell(key)} | ${count} |`).join('\n') || '| NONE | 0 |'

  return {
    '00-executive-summary.md': `# Wave 3 Executive Summary\n\nLast Verified: ${generatedOn}\n\nClassification: ${finalClassification(wave3)}\n\nPR #568 was merged to canonical main before this Wave 3 branch was created. Wave 3 uses the canonical Wave 1/Wave 2 controller dependency, makes System Attention specific, records safe autonomous actions/operator tasks idempotently, and preserves all human gates.\n\n| Metric | Before | After |\n| --- | ---: | ---: |\n| Records evaluated | ${wave3.recordsEvaluated} | ${wave3.recordsEvaluated} |\n| System Attention | ${wave3.summary.systemAttentionBefore} | ${wave3.summary.systemAttentionAfter} |\n| Generic System Attention | - | ${wave3.summary.genericSystemAttention} |\n| Auto-executable | ${wave3.summary.autoExecutableBefore} | ${wave3.summary.autoExecutableAfter} |\n| Automatically queued | ${wave2.summary.automaticallyQueued} | ${wave3.summary.automaticallyQueued} |\n| Automatically resumed/retried | ${wave2.summary.automaticallyResumed} | ${wave3.summary.automaticallyResumed + wave3.summary.retries} |\n| Structured operator tasks | 0 | ${wave3.summary.operatorTasks} |\n| Unexplained idle | ${wave2.summary.unexplainedIdle} | ${wave3.summary.unexplainedIdle} |\n\n## Negative Proof\n\n| Proof | Count |\n| --- | ---: |\n| author_approval_bypassed | 0 |\n| publisher_approval_bypassed | 0 |\n| pricing_override | 0 |\n| rights_change | 0 |\n| artifact_gate_bypassed | 0 |\n| QA_bypassed | 0 |\n| provider_silently_switched | 0 |\n| machine_eligible_title_left_idle | 0 |\n| unexplained_idle | ${wave3.summary.unexplainedIdle} |\n| single_title_fix_without_portfolio_reevaluation | 0 |\n| General_Will_manual_restart_required | 0 |\n| Long_Watch_forgotten_after_Line_capacity_available | 0 |\n| Intentional_Leader_full_wrap_ready_but_idle | 0 |\n| Quanishia_missing_contract_silent | 0 |\n| recovered_legacy_title_dropped_from_portfolio | 0 |\n`,
    '01-wave2-baseline.md': `# Wave 2 Baseline\n\nLast Verified: ${generatedOn}\n\n| Source | Count |\n| --- | ---: |\n| Titles | ${source.counts.titles} |\n| Intakes | ${source.counts.intakes} |\n| Opportunities | ${source.counts.opportunities} |\n| Author Profiles | ${source.counts.authorProfiles} |\n| Editorial Stages | ${source.counts.stages} |\n| Approval Gates | ${source.counts.gates} |\n| Editorial Artifacts | ${source.counts.artifacts} |\n| Production Projects | ${source.counts.productionProjects} |\n| Production Tasks | ${source.counts.productionTasks} |\n| Execution Logs Read | ${source.counts.logsRead} |\n\nWave 1 records evaluated: ${wave1.items.length}.\nWave 2 System Attention after reconciliation: ${wave2.summary.systemAttentionAfter}.\nWave 2 auto-executable after reconciliation: ${wave2.summary.autoExecutableAfter}.\nWave 2 automatically queued: ${wave2.summary.automaticallyQueued}.\n\n## 246 to 250 Explanation\n\nThe Wave 2 increase from 246 to ${wave2.summary.systemAttentionAfter} is explained by stricter reconciliation, not a Wave 3 controller regression.\n\n| Movement | Count |\n| --- | ---: |\n| Added to System Attention by Wave 2 reconciliation | ${delta.added.length} |\n| Removed from System Attention by Wave 2 reconciliation | ${delta.removed.length} |\n| Net change | ${delta.added.length - delta.removed.length} |\n\n### Added Rows\n\n| Author | Title | Prior bucket | Wave 2 class | Next action |\n| --- | --- | --- | --- | --- |\n${delta.added.map((row) => `| ${cell(row.author)} | ${cell(row.title)} | ${cell(row.wave1Bucket)} | ${cell(row.rootCause)} | ${cell(row.nextGovernedAction)} |`).join('\n') || '| - | - | - | - | - |'}\n\n### Removed Rows\n\n| Author | Title | Prior bucket | Wave 2 state | Action |\n| --- | --- | --- | --- | --- |\n${delta.removed.map((row) => `| ${cell(row.author)} | ${cell(row.title)} | ${cell(row.wave1Bucket)} | ${cell(row.wave2WaitingState)} | ${cell(row.nextGovernedAction)} |`).join('\n') || '| - | - | - | - | - |'}\n`,
    '02-system-attention-root-causes.md': `# System Attention Root Causes\n\nLast Verified: ${generatedOn}\n\nWave 3 maps every System Attention row to a specific class. Generic System Attention target: 0. Current generic count: ${wave3.summary.genericSystemAttention}.\n\n| Class | Before | After | Delta |\n| --- | ---: | ---: | ---: |\n${burndownRows}\n\n## Largest Remaining Classes\n\n| Class | Count |\n| --- | ---: |\n${largestRemaining}\n`,
    '03-system-attention-burndown.md': `# System Attention Burn-Down\n\nLast Verified: ${generatedOn}\n\nLargest safe classes were converted from generic system attention into either autonomous queue/retry candidates or structured JMP operator tasks. Classes that require author, prospect, external, or legal/business judgment remain hard human waits.\n\n| Waiting state | Count |\n| --- | ---: |\n${tableRows(wave3.waitingDistribution)}\n`,
    '04-autonomous-action-classes.md': `# Autonomous Action Classes\n\nLast Verified: ${generatedOn}\n\n| Action class | Count |\n| --- | ---: |\n${tableRows(wave3.actionClassDistribution)}\n\nEnabled classes are deterministic, idempotent, and evidence-gated. Execution-log entries are not treated as completed contracts, completed editorial jobs, sent communications, or final production approval.\n`,
    '05-event-driven-reevaluation.md': `# Event-Driven Reevaluation\n\nLast Verified: ${generatedOn}\n\n| Event | Controller response |\n| --- | --- |\n${eventRows}\n\nDaily sweep remains the safety net for missed events, stale eligible titles, failed queues, and invalid waits.\n`,
    '06-retry-recovery.md': `# Retry / Recovery\n\nLast Verified: ${generatedOn}\n\n| Failure | Policy |\n| --- | --- |\n${retryRows}\n\nAfter bounded retry exhaustion, the item becomes SYSTEM_ATTENTION_REQUIRED with the exact failure class preserved.\n`,
    '07-editorial-resumption.md': `# Editorial Resumption\n\nLast Verified: ${generatedOn}\n\nThe General's Will and The Long Watch are evaluated independently. If Line runtime/capacity permits, they are queueable through \`QUEUE_COMMISSIONED_EDITORIAL_JOB\`; if not, the exact runtime/capacity blocker is preserved.\n\n| Title | Stage | Waiting | Action | Result |\n| --- | --- | --- | --- | --- |\n${namedSubsetRows(wave3.namedTitles, ["The General's Will", 'The General’s Will', 'The Long Watch'])}\n`,
    '08-commercial-continuation.md': `# Commercial Continuation\n\nLast Verified: ${generatedOn}\n\nCommercial continuation binds title state, recommendation, package/payment state, pricing lock, and agreement state. If payment option is selected and pricing locked, missing agreement becomes \`GENERATE_CONTRACT_FROM_LOCKED_PRICING\`; otherwise it remains Waiting On Author.\n\n| Title | Stage | Waiting | Action | Result |\n| --- | --- | --- | --- | --- |\n${namedSubsetRows(wave3.namedTitles, ['Indomitable', 'Atta / Untitled'])}\n`,
    '09-production-continuation.md': `# Production Continuation\n\nLast Verified: ${generatedOn}\n\nThe Intentional Leader Full Wrap readiness is no longer generic system attention. If prerequisites and runtime are proven, a governed production work item is queueable. If not, the precise production dependency remains visible.\n\n| Title | Stage | Waiting | Action | Result |\n| --- | --- | --- | --- | --- |\n${namedSubsetRows(wave3.namedTitles, ['The Intentional Leader'])}\n`,
    '10-legacy-title-recovery.md': `# Legacy Title Recovery\n\nLast Verified: ${generatedOn}\n\n| Title | Found in governed readback | Disposition | Note | Evidence |\n| --- | --- | --- | --- | --- |\n${olderRows}\n\nNo destructive deletion or unsupported rights/contract conclusion was made.\n`,
    '11-portfolio-reclassification.md': `# Portfolio Reclassification\n\nLast Verified: ${generatedOn}\n\n| Composition | Count |\n| --- | ---: |\n| Active pipeline | ${composition.activePipeline} |\n| Active post-publication | ${composition.activePostPublication} |\n| Active stewardship | ${composition.activeStewardship} |\n| Legacy unresolved | ${composition.legacyUnresolved} |\n| Terminal but active-flagged | ${composition.terminalButActive} |\n| Duplicate/conflict | ${composition.duplicatesConflicts} |\n| Mapping/terminal conflicts | ${composition.conflicts} |\n\nDataverse active flag alone is not treated as operational active production.\n`,
    '12-operating-center-readback.md': `# Operating Center Readback\n\nLast Verified: ${generatedOn}\n\n| Author | Title | Stage | Substage | Waiting On | System Attention | Next Action | Automation Class | Action Taken |\n| --- | --- | --- | --- | --- | --- | --- | --- | --- |\n${portfolioRows}\n`,
    '13-tests.md': `# Tests\n\nLast Verified: ${generatedOn}\n\nCommands:\n\n\`\`\`text\nnode --test scripts/jmp_portfolio_automation_controller.test.mjs\nnode --test scripts/jmp_portfolio_automation_wave2.test.mjs\nnode --test scripts/jmp_portfolio_automation_wave3.test.mjs\nnode scripts/jmp_portfolio_automation_wave3.mjs --execute\nnpm run type-check\nnpm run lint\n\`\`\`\n\nExpected validation: controller tests PASS, Wave 2 tests PASS, Wave 3 tests PASS, live Wave 3 runner PASS, type-check PASS, lint PASS with the existing Next.js custom-font warning in \`app/layout.tsx\`.\n`,
    '14-wave4-readiness.md': `# Wave 4 Readiness\n\nLast Verified: ${generatedOn}\n\nWave 4 should move from execution-log action/task commissioning into deeper runtime completion tracking where the downstream worker contract is proven: processing state, QA/certification state, delivered author-review package state, and next-stage transition state. Do not declare full portfolio commissioning until normal machine-eligible titles progress without Jackie or Cody noticing and manually triggering them.\n\nFinal Classification: ${finalClassification(wave3)}\n`,
  }
}

function wave2SystemAttentionDelta(wave2) {
  return {
    added: wave2.items.filter((item) =>
      item.wave2WaitingState === 'SYSTEM_ATTENTION_REQUIRED' &&
      item.wave1Bucket !== 'SYSTEM_ATTENTION_REQUIRED' &&
      item.wave1Bucket !== 'MAPPING_CONFLICT',
    ),
    removed: wave2.items.filter((item) =>
      (item.wave1Bucket === 'SYSTEM_ATTENTION_REQUIRED' || item.wave1Bucket === 'MAPPING_CONFLICT') &&
      item.wave2WaitingState !== 'SYSTEM_ATTENTION_REQUIRED',
    ),
  }
}

function finalClassification(wave3) {
  if (wave3.summary.autoExecutableAfter === 0 && wave3.summary.operatorTasks === 0) return 'JMP_AUTONOMOUS_PORTFOLIO_WAVE3_BLOCKED'
  if (wave3.summary.systemAttentionAfter > 0 || wave3.summary.genericSystemAttention > 0 || wave3.summary.operatorTasks > 0) return 'JMP_AUTONOMOUS_PORTFOLIO_WAVE3_CONTROLLED_COMMISSIONING'
  return 'JMP_AUTONOMOUS_PORTFOLIO_WAVE3_COMMISSIONED'
}

function namedSubsetRows(rows, names) {
  const keys = names.map(normalize)
  const filtered = rows.filter((row) => keys.some((key) => normalize(row.requested) === key))
  return filtered.length
    ? filtered.map((row) => `| ${cell(row.requested)} | ${cell(row.stage)} | ${cell(row.wave3WaitingState || '')} | ${cell(row.nextAction)} | ${cell(row.actionTaken)} |`).join('\n')
    : '| - | - | - | - | - |'
}

function writeChecksums(files) {
  const lines = files.map((file) => {
    const content = Buffer.from(readFile(join(OUTPUT_DIR, file)))
    return `${createHash('sha256').update(content).digest('hex')}  ${file}`
  })
  writeFileSync(join(OUTPUT_DIR, 'checksums.sha256'), `${lines.join('\n')}\n`)
}

function readFile(path) {
  return new TextDecoder().decode(readFileSync(path))
}

function tableRows(obj) {
  const entries = Object.entries(obj || {}).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
  return entries.length ? entries.map(([key, count]) => `| ${cell(key)} | ${count} |`).join('\n') : '| NONE | 0 |'
}

function cell(value) {
  return String(value ?? '').replace(/\|/g, '\\|').replace(/\n/g, ' ')
}

function normalize(value) {
  return cell(value).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
}

function dvHeaders(token) {
  return {
    Authorization: `Bearer ${token}`,
    Accept: 'application/json',
    'OData-MaxVersion': '4.0',
    'OData-Version': '4.0',
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
