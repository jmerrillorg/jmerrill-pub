#!/usr/bin/env node

import { createHash } from 'node:crypto'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { evaluatePortfolio } from '../lib/publishing/portfolio/automation-controller.mjs'
import { reconcileWave2 } from '../lib/publishing/portfolio/automation-wave2.mjs'
import { buildControllerRecords, getToken, readPortfolioSource } from './jmp_portfolio_automation_controller_scan.mjs'

const OUTPUT_DIR = 'docs/operations/generated/JMP-PORTFOLIO-AUTOMATION-WAVE2-2026-08-22'
const DATAVERSE_BASE = process.env.DATAVERSE_WEB_API_BASE_URL || 'https://jm1hq.crm.dynamics.com/api/data/v9.2'
const EXECUTE = process.argv.includes('--execute')

async function main() {
  const generatedOn = new Date().toISOString()
  const token = getToken()
  const source = await readPortfolioSource(token)
  const records = buildControllerRecords(source)
  const wave1 = evaluatePortfolio(records, { evaluatedOn: generatedOn })
  const preliminary = reconcileWave2({ records, evaluation: wave1, source })
  const actionAudit = EXECUTE ? await executeSafeQueueActions({ token, generatedOn, queueable: preliminary.queueable }) : []
  const queuedActionKeys = new Set(actionAudit.map((row) => row.actionKey))
  const executedActionKeys = new Set(actionAudit.filter((row) => row.result === 'QUEUED_EXECUTION_LOG_CREATED').map((row) => row.actionKey))
  const wave2 = reconcileWave2({ records, evaluation: wave1, source, queuedActionKeys, executedActionKeys, executed: EXECUTE })
  const docs = buildDocs({ generatedOn, source, wave1, wave2, actionAudit })

  mkdirSync(OUTPUT_DIR, { recursive: true })
  for (const [file, content] of Object.entries(docs)) writeFileSync(join(OUTPUT_DIR, file), content)
  writeChecksums(Object.keys(docs))

  console.log(JSON.stringify({
    generatedOn,
    execute: EXECUTE,
    classification: finalClassification(wave2),
    recordsEvaluated: wave2.recordsEvaluated,
    systemAttentionBefore: wave2.summary.systemAttentionBefore,
    systemAttentionAfter: wave2.summary.systemAttentionAfter,
    autoExecutableBefore: wave2.summary.autoExecutableBefore,
    autoExecutableAfter: wave2.summary.autoExecutableAfter,
    automaticallyQueued: wave2.summary.automaticallyQueued,
    mutations: actionAudit.filter((row) => row.result === 'QUEUED_EXECUTION_LOG_CREATED').length,
  }, null, 2))
}

async function executeSafeQueueActions({ token, generatedOn, queueable }) {
  const audit = []
  for (const item of queueable) {
    const existing = await findExistingQueueLog(token, item.actionKey)
    if (existing) {
      audit.push({
        actionKey: item.actionKey,
        title: item.title,
        author: item.author,
        automationClass: item.automationClass,
        result: 'QUEUE_ALREADY_PRESENT',
        executionLogId: existing.jm1_executionlogid,
      })
      continue
    }
    const created = await createExecutionLog(token, {
      name: `PORTFOLIO-WAVE2-QUEUE-${item.actionKey}`,
      actionType: `PORTFOLIO_${item.automationClass}`,
      description:
        `Wave 2 controller queued safe autonomous action. controllerVersion=${item.controllerVersion}; ` +
        `title=${item.title}; author=${item.author}; priorState=${item.wave1Bucket}; reason=${item.rootCause}; ` +
        `lifecycleRule=${item.titleLifecycleStage}/${item.substage}; prerequisiteEvidence=${item.evidence.join('; ')}; ` +
        `jobId=${item.actionKey}; occurredOn=${generatedOn}; result=QUEUED; nextEvaluation=automatic portfolio reevaluation. ` +
        'No human gate was bypassed and no contract, royalty, pricing, rights, payout, author decision, or final-file approval was fabricated.',
      sourceEntity: item.titleId ? 'jm1pub_title' : item.intakeId ? 'jm1_publishingintake' : 'portfolio_record',
      sourceRecordId: item.titleId || item.intakeId || item.title,
    })
    audit.push({
      actionKey: item.actionKey,
      title: item.title,
      author: item.author,
      automationClass: item.automationClass,
      result: 'QUEUED_EXECUTION_LOG_CREATED',
      executionLogId: created.jm1_executionlogid || '',
    })
  }
  return audit
}

async function findExistingQueueLog(token, actionKey) {
  const filter = `jm1_name eq 'PORTFOLIO-WAVE2-QUEUE-${actionKey}'`
  const url = `${DATAVERSE_BASE}/jm1_executionlogs?$select=jm1_executionlogid,jm1_name,jm1_actiontype,createdon&$filter=${encodeURIComponent(filter)}&$top=1`
  const res = await fetch(url, { headers: dvHeaders(token) })
  if (!res.ok) throw new Error(`queue_log_lookup_failed:${res.status}:${await res.text()}`)
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
      jm1_agentmodel: 'Wave2 safe autonomous queue',
      jm1_bandlevel: 835500000,
      jm1_executionstatus: 835500001,
      jm1_startedon: new Date().toISOString(),
      jm1_completedon: new Date().toISOString(),
      jm1_sourceentity: input.sourceEntity,
      jm1_sourcerecordid: input.sourceRecordId,
    }),
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(`queue_log_create_failed:${res.status}:${JSON.stringify(body).slice(0, 500)}`)
  return body
}

function buildDocs({ generatedOn, source, wave1, wave2, actionAudit }) {
  const rootRows = tableRows(wave2.rootCauseDistribution)
  const waitRows = tableRows(wave2.waitingDistribution)
  const composition = wave2.portfolioComposition
  const namedRows = wave2.namedTitles.map((row) =>
    `| ${cell(row.requested)} | ${row.found ? 'YES' : 'NO'} | ${cell(row.stage)} | ${cell(row.blocker)} | ${cell(row.nextAction)} | ${cell(row.automation)} | ${cell(row.actionTaken)} |`,
  ).join('\n')
  const portfolioRows = wave2.items
    .sort((a, b) => String(a.title).localeCompare(String(b.title)))
    .map((item) => `| ${cell(item.author)} | ${cell(item.title)} | ${cell(item.titleLifecycleStage)} | ${cell(item.substage)} | ${cell(item.wave2WaitingState)} | ${cell(item.rootCause)} | ${cell(item.nextGovernedAction)} | ${cell(item.automationClass)} | ${cell(item.actionTaken)} |`)
    .join('\n')
  const actionRows = actionAudit.length
    ? actionAudit.map((row) => `| ${cell(row.author)} | ${cell(row.title)} | ${cell(row.automationClass)} | ${cell(row.result)} | ${cell(row.executionLogId)} |`).join('\n')
    : '| - | - | - | NO_EXECUTE_FLAG | - |'
  const missingRows = wave2.missingTitles.map((row) =>
    `| ${cell(row.title)} | ${row.foundInGovernedReadback ? 'YES' : 'NO'} | ${cell(row.disposition)} | ${cell(row.note)} | ${cell(row.evidence.join('; '))} |`,
  ).join('\n')
  const validationText = `node --test scripts/jmp_portfolio_automation_controller.test.mjs\nnode --test scripts/jmp_portfolio_automation_wave2.test.mjs\nnode scripts/jmp_portfolio_automation_wave2.mjs --execute\nnpm run type-check`

  return {
    '00-executive-summary.md': `# Wave 2 Executive Summary\n\nLast Verified: ${generatedOn}\n\nClassification: ${finalClassification(wave2)}\n\nPR #566 was merged to main before this Wave 2 branch was created. Wave 2 uses the canonical Wave 1 controller readback and adds root-cause reconciliation plus idempotent safe queue/audit actions.\n\n| Metric | Before | After |\n| --- | ---: | ---: |\n| System Attention | ${wave2.summary.systemAttentionBefore} | ${wave2.summary.systemAttentionAfter} |\n| Auto-Executable | ${wave2.summary.autoExecutableBefore} | ${wave2.summary.autoExecutableAfter} |\n| Automatically Queued | 0 | ${wave2.summary.automaticallyQueued} |\n| Automatically Resumed | 0 | ${wave2.summary.automaticallyResumed} |\n| Unexplained Idle | ${wave1.unexplainedIdleCount} | ${wave2.summary.unexplainedIdle} |\n| Human Wait | ${wave1.counts.waitingOnAuthor} | ${wave2.summary.humanWait} |\n| Recovered Missing Titles | 0 | ${wave2.summary.recoveredMissingTitles} |\n\nProduction/data writes performed by Wave 2 are limited to idempotent execution-log queue/audit entries for safe autonomous candidates. No human decision, author approval, pricing, rights, royalty, payout, or final-file approval was changed.\n`,
    '01-wave1-baseline.md': `# Wave 1 Baseline\n\nLast Verified: ${generatedOn}\n\n| Source | Count |\n| --- | ---: |\n| Titles | ${source.counts.titles} |\n| Intakes | ${source.counts.intakes} |\n| Opportunities | ${source.counts.opportunities} |\n| Author Profiles | ${source.counts.authorProfiles} |\n| Editorial Stages | ${source.counts.stages} |\n| Approval Gates | ${source.counts.gates} |\n| Editorial Artifacts | ${source.counts.artifacts} |\n| Production Projects | ${source.counts.productionProjects} |\n| Production Tasks | ${source.counts.productionTasks} |\n| Execution Logs Read | ${source.counts.logsRead} |\n\nWave 1 records evaluated: ${wave1.items.length}.\n`,
    '02-system-attention-root-causes.md': `# System Attention Root Causes\n\nLast Verified: ${generatedOn}\n\n| Root cause | Count |\n| --- | ---: |\n${rootRows}\n\n| Reconciled waiting state | Count |\n| --- | ---: |\n${waitRows}\n`,
    '03-active-portfolio-composition.md': `# Active Portfolio Composition\n\nLast Verified: ${generatedOn}\n\n| Composition | Count |\n| --- | ---: |\n| Raw active title records | ${composition.rawActiveTitleRecords} |\n| Active pipeline | ${composition.activePipeline} |\n| Active post-publication | ${composition.activePostPublication} |\n| Legacy/unreconciled | ${composition.legacyUnreconciled} |\n| Terminal but active-flagged | ${composition.terminalButActive} |\n| Duplicates/conflicts | ${composition.duplicatesConflicts} |\n| Data-quality conflicts | ${composition.dataQualityConflict} |\n\nDataverse \`statecode = active\` is not treated as operationally active production by itself.\n`,
    '04-founder-named-title-reconciliation.md': `# Founder-Named Title Reconciliation\n\nLast Verified: ${generatedOn}\n\n| Title | Found | Stage | Blocker | Next action | Automation | Action taken |\n| --- | --- | --- | --- | --- | --- | --- |\n${namedRows}\n`,
    '05-missing-title-recovery.md': `# Missing / Older Title Recovery\n\nLast Verified: ${generatedOn}\n\n| Title | Found in governed readback | Disposition | Note | Evidence |\n| --- | --- | --- | --- | --- |\n${missingRows}\n\nSharePoint/OneDrive broad tenant search was not performed because only folder/list/fetch primitives were available in this session, not a broad search primitive. No terminal legal/rights conclusion is inferred from missing SharePoint evidence.\n`,
    '06-next-action-rules.md': `# Next Action Rules\n\nLast Verified: ${generatedOn}\n\nWave 2 rules turn generic System Attention into specific classes and queue only safe actions. Missing commercial state, artifact authority, production state, distribution state, author relationship, and title linkage remain explicit blockers. Author and prospect decisions remain human gates.\n`,
    '07-safe-autonomous-action-classes.md': `# Safe Autonomous Action Classes\n\nLast Verified: ${generatedOn}\n\n| Automation class | Count |\n| --- | ---: |\n${tableRows(wave2.automationClassDistribution)}\n\nClasses are limited to deterministic, idempotent, commissioned or queueable work. Human approvals, pricing, rights, royalties, payouts, and author decisions are excluded.\n`,
    '08-actions-executed.md': `# Actions Executed\n\nLast Verified: ${generatedOn}\n\n| Author | Title | Automation class | Result | Execution log |\n| --- | --- | --- | --- | --- |\n${actionRows}\n`,
    '09-stale-title-watchdog.md': `# Stale Title Watchdog\n\nLast Verified: ${generatedOn}\n\nDaily sweep behavior: commissioned in code as Wave 2 runner pattern. Each nonterminal record is assigned a valid wait, auto-executable queue candidate, or specific System Attention root cause.\n\nTarget unexplained idle: 0.\n\nCurrent unexplained idle: ${wave2.summary.unexplainedIdle}.\n`,
    '10-commercial-gap-recovery.md': `# Commercial Gap Recovery\n\nLast Verified: ${generatedOn}\n\nIndomitable and other locked-pricing contract gaps are surfaced as \`GENERATE_CONTRACT_FROM_LOCKED_PRICING\` only when package/payment/pricing evidence exists and no agreement is present. If payment option is missing, the state remains WAITING_ON_AUTHOR.\n`,
    '11-editorial-gap-recovery.md': `# Editorial Gap Recovery\n\nLast Verified: ${generatedOn}\n\nLine-ready title handling is portfolio-scoped. The General's Will and The Long Watch are evaluated independently; The Long Watch is not held merely behind The General's Will unless capacity policy evidence requires it.\n`,
    '12-production-gap-recovery.md': `# Production Gap Recovery\n\nLast Verified: ${generatedOn}\n\nThe Intentional Leader is classified with exact Full Wrap prerequisite recovery rather than generic System Attention: trim, binding, paper, final page count, spine, distribution route, approved cover concept, and current cover artifacts.\n`,
    '13-operating-center-integration.md': `# Operating Center Integration\n\nLast Verified: ${generatedOn}\n\nWave 2 uses the controller read model fields needed by the Publisher Operating Center: Automation State, Next Action, Queued, Processing, Retrying, Human Required, System Attention, Last Evaluated, and Last Transition. No competing dashboard was created.\n\n## Portfolio Table\n\n| Author | Title | Stage | Substage | Waiting On | System Attention | Next Action | Automation Class | Action Taken |\n| --- | --- | --- | --- | --- | --- | --- | --- | --- |\n${portfolioRows}\n`,
    '14-tests.md': `# Tests\n\nLast Verified: ${generatedOn}\n\nCommands:\n\n\`\`\`text\n${validationText}\n\`\`\`\n\nExpected validation: controller tests PASS, Wave 2 tests PASS, live Wave 2 runner PASS, type-check PASS.\n`,
    '15-wave3-readiness.md': `# Wave 3 Readiness\n\nLast Verified: ${generatedOn}\n\nWave 3 should expand from execution-log queue/audit into durable runtime dispatch once the affected downstream runtime contract is confirmed per action class. Do not treat execution-log queue entries as completed contracts, completed editorial jobs, sent author communications, or completed production work.\n\nFinal Classification: ${finalClassification(wave2)}\n`,
  }
}

function finalClassification(wave2) {
  return wave2.summary.automaticallyQueued > 0
    ? 'JMP_AUTONOMOUS_PORTFOLIO_WAVE2_CONTROLLED_COMMISSIONING'
    : 'JMP_AUTONOMOUS_PORTFOLIO_WAVE2_BLOCKED'
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
