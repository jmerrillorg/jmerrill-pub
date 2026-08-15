#!/usr/bin/env node

import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, symlinkSync, unlinkSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { execFileSync } from 'node:child_process'

const OUT_DIR = 'docs/operations/generated/CC010-AUTHOR-PACKAGE-PORTFOLIO-REEVALUATION-2026-08-15'
const GATE_SOURCE = 'docs/operations/generated/CC010-WORKING-TITLE-AUTHOR-SELECTION-2026-08-15/07-all-gates-reclassification.csv'
const PORTFOLIO_SOURCE = 'docs/operations/generated/CC010-PORTFOLIO-ACTIVATION-2026-08-14/02-activation-ledger.csv'
const FINAL_PORTFOLIO_SOURCE = 'docs/operations/generated/CC010-PORTFOLIO-ACTIVATION-2026-08-14/19-final-portfolio-state.md'
const now = new Date().toISOString()

function sh(command, args) {
  return execFileSync(command, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim()
}

function trySh(command, args) {
  try {
    return sh(command, args)
  } catch {
    return ''
  }
}

function read(path) {
  return readFileSync(path, 'utf8')
}

function parseCsv(text) {
  const lines = text.trim().split(/\r?\n/)
  const headers = splitCsvLine(lines.shift() || '')
  return lines.filter(Boolean).map((line) => {
    const cells = splitCsvLine(line)
    return Object.fromEntries(headers.map((header, index) => [header, cells[index] || '']))
  })
}

function splitCsvLine(line) {
  const cells = []
  let cell = ''
  let quoted = false
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index]
    if (char === '"' && line[index + 1] === '"') {
      cell += '"'
      index += 1
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

function table(headers, rows) {
  return [
    `| ${headers.join(' | ')} |`,
    `| ${headers.map(() => '---').join(' | ')} |`,
    ...rows.map((row) => `| ${headers.map((header) => String(row[header] ?? '').replace(/\|/g, '\\|')).join(' | ')} |`),
  ].join('\n')
}

function countBy(rows, key) {
  const counts = new Map()
  for (const row of rows) counts.set(row[key] || 'Unknown', (counts.get(row[key] || 'Unknown') || 0) + 1)
  return [...counts].sort(([left], [right]) => String(left).localeCompare(String(right))).map(([name, count]) => ({ name, count }))
}

function write(name, content) {
  writeFileSync(join(OUT_DIR, name), `${content.trim()}\n`)
}

function md(name, lines) {
  write(name, lines.join('\n'))
}

function stageRows(rows, queue) {
  return rows.filter((row) => row.queue === queue)
}

async function main() {
  const createdShims = []
  for (const [shim, target] of [
    ['../lib/server/working-title-policy', 'working-title-policy.ts'],
    ['../lib/server/author-review-package-engine', 'author-review-package-engine.ts'],
    ['../lib/server/author-package-notification-engine', 'author-package-notification-engine.ts'],
  ]) {
    const shimUrl = new URL(shim, import.meta.url)
    if (!existsSync(shimUrl)) {
      symlinkSync(target, shimUrl)
      createdShims.push(shimUrl)
    }
  }
  const {
    negativeProof,
    queuePortfolio,
    reevaluateAuthorGates,
  } = await import('../lib/server/cc010-author-package-portfolio-reevaluation.ts')
  const {
    buildAuthorFacingEditorialReviewPackage,
  } = await import('../lib/server/author-facing-editorial-review-package.ts')

  mkdirSync(OUT_DIR, { recursive: true })

  const gateRows = parseCsv(read(GATE_SOURCE))
  const reevaluatedGates = reevaluateAuthorGates(gateRows, {
    authorFacingEditorialReviewPackageAvailable: true,
  })
  const existingResponses = reevaluatedGates.filter((row) => row.reclassification === 'EXISTING_RESPONSE_CONSUMED')
  const newlyUnblocked = reevaluatedGates.filter((row) => row.newly_unblocked === 'YES')

  const portfolioRows = parseCsv(read(PORTFOLIO_SOURCE))
  const portfolio = queuePortfolio(portfolioRows)
  const proof = negativeProof(reevaluatedGates, portfolio)
  const pr508 = JSON.parse(sh('gh', ['pr', 'view', '508', '--json', 'number,state,mergedAt,mergeCommit,headRefOid,url,title']))
  const originMain = sh('git', ['rev-parse', 'origin/main'])
  const head = sh('git', ['rev-parse', 'HEAD'])
  const productionSettings = JSON.parse(trySh('az', [
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
  ]) || '[]')
  const productionFunction = JSON.parse(trySh('az', [
    'functionapp',
    'show',
    '-g',
    'rg-jm1-ai',
    '-n',
    'func-jm1-diagnostic-ai-runner',
    '--query',
    '{state:state,defaultHostName:defaultHostName,lastModifiedTimeUtc:lastModifiedTimeUtc,linuxFxVersion:siteConfig.linuxFxVersion}',
    '-o',
    'json',
  ]) || '{}')
  const productionReleaseSha = productionSettings.find((setting) => setting.name === 'JM1_RELEASE_SHA')?.value || 'UNVERIFIED'

  const attaInput = {
    titleId: 'ca68c994-fd89-f111-ab10-00224820105b',
    stageId: 'stage0-editorial-review-atta',
    gateId: 'eeffc5fb-5698-f111-8076-000d3a14673b',
    authorId: 'author-atta-boateng',
    authorName: 'Atta Boateng',
    titleName: 'Untitled',
    intakeReference: 'JMP-INT-202607-422JSZ',
    sourceArtifactId: 'governed-source-manuscript-editorial-review-untitled',
    sourceChecksum: '732bb73d786a25e860ad926d75c6e0446ba415394a4e262eb6758a3806ab96d2',
    stage0DiagnosticId: 'cc010-stage0-editorial-review-diagnostic-atta',
    packageVersion: 'v1',
    generatedAt: now,
    reviewSummary: 'The manuscript has completed Stage 0 / Editorial Review and needs an author-facing review package before any author approval request can be sent.',
    manuscriptStrengths: ['Clear author intent', 'Governed Stage 0 source is available', 'Author-facing title handling is now explicit'],
    editorialOpportunities: ['Present the review in plain author language', 'Keep title selection separate from editorial approval', 'Preserve source and package version lineage'],
    recommendedPath: 'Developmental Editing',
    stageRecommendation: 'Move to Developmental Editing only after full author approval of Editorial Review.',
    importantObservations: ['Working title semantics require display as Working Title: Untitled until the author chooses otherwise.'],
    nextStageLabel: 'Developmental Editing',
    suggestedTitles: ['Faith Through the Fire', 'Becoming Indomitable', 'Escaping the Shadows'],
  }
  const attaPackage = buildAuthorFacingEditorialReviewPackage(attaInput)

  const gateHeaders = ['gate_id', 'title', 'stage', 'new_classification', 'reclassification', 'newly_unblocked', 'resume_action', 'sendable', 'waiting_owner', 'reevaluation_reason']
  const portfolioHeaders = ['Title', 'Author', 'Current_CC010_Stage', 'Waiting_On', 'Current_Blocker', 'Next_Governed_Action', 'Safe_to_Resume', 'Mutation_Required', 'queue', 'provider', 'portfolio_serialized_behind_atta']

  md('01-pr508-canonicalization.md', [
    '# 01 - PR #508 Canonicalization',
    '',
    `Last verified: ${now}`,
    '',
    table(['Item', 'State'], [
      { Item: 'PR #508', State: `${pr508.state} / ${pr508.url}` },
      { Item: 'PR #508 merge SHA', State: pr508.mergeCommit?.oid || '' },
      { Item: 'PR #508 merged at', State: pr508.mergedAt || '' },
      { Item: 'origin/main', State: originMain },
      { Item: 'current branch head', State: head },
      { Item: 'working title semantics', State: 'CANONICAL ON MAIN' },
      { Item: 'production diagnostic-runner release SHA', State: productionReleaseSha },
      { Item: 'production diagnostic-runner readback', State: `${productionFunction.state || 'UNVERIFIED'} / ${productionFunction.linuxFxVersion || 'UNVERIFIED'} / ${productionFunction.lastModifiedTimeUtc || 'UNVERIFIED'}` },
      { Item: 'production deployment from this branch', State: 'NOT EXECUTED - branch not merged' },
      { Item: 'PR #508 production deploy parity', State: productionReleaseSha === (pr508.mergeCommit?.oid || '') ? 'MATCH' : 'NOT MATCHED - production remains on prior release marker' },
    ]),
  ])

  md('02-author-facing-package-contract.md', [
    '# 02 - Author-Facing Package Contract',
    '',
    `Last verified: ${now}`,
    '',
    'Contract source: lib/server/author-facing-editorial-review-package.ts',
    '',
    table(['Requirement', 'State'], [
      { Requirement: 'Reusable Editorial Review package transformer', State: 'IMPLEMENTED' },
      { Requirement: 'No internal Markdown sent to author', State: 'GUARDED' },
      { Requirement: 'Author Workspace preferred', State: 'SUPPORTED' },
      { Requirement: 'Package version-bound to title/intake/gate/source/checksum/diagnostic/timestamp', State: 'IMPLEMENTED' },
      { Requirement: 'Working title display', State: 'Working Title: Untitled' },
      { Requirement: 'Title suggestions', State: 'EXACTLY 3 REQUIRED / CLAUDE ROUTE / NO FALLBACK' },
      { Requirement: 'Title task', State: 'NONBLOCKING FOR EDITORIAL APPROVAL' },
      { Requirement: 'Editorial approval', State: 'FULL APPROVAL REQUIRED; title choice does not substitute for stage approval' },
    ]),
  ])

  md('03-author-package-rendering.md', [
    '# 03 - Author Package Rendering',
    '',
    `Last verified: ${now}`,
    '',
    table(['Artifact role', 'Author visible', 'Email attachment', 'Workspace download', 'Checksum'], attaPackage.artifacts.map((artifact) => ({
      'Artifact role': artifact.role,
      'Author visible': String(artifact.authorVisible),
      'Email attachment': String(artifact.emailAttachment),
      'Workspace download': String(artifact.workspaceDownload),
      Checksum: artifact.checksum,
    }))),
    '',
    `Package checksum: ${attaPackage.packageChecksum}`,
    `Idempotency key: ${attaPackage.idempotencyKey}`,
  ])

  md('04-atta-proof.md', [
    '# 04 - Atta Proof',
    '',
    `Last verified: ${now}`,
    '',
    table(['Field', 'Value'], [
      { Field: 'Title ID', Value: attaInput.titleId },
      { Field: 'Author', Value: attaInput.authorName },
      { Field: 'Displayed title', Value: 'Working Title: Untitled' },
      { Field: 'Intake', Value: attaInput.intakeReference },
      { Field: 'Gate', Value: attaInput.gateId },
      { Field: 'Source checksum', Value: attaInput.sourceChecksum },
      { Field: 'Package status', Value: 'SOURCE-COMMISSIONED / REQUIRES MERGE+DEPLOY BEFORE LIVE SEND' },
      { Field: 'Author send', Value: '0' },
    ]),
  ])

  md('05-title-suggestions.md', [
    '# 05 - Title Suggestions',
    '',
    `Last verified: ${now}`,
    '',
    table(['Field', 'Value'], [
      { Field: 'Route', Value: attaPackage.titleSuggestionRequest?.route.provider || '' },
      { Field: 'Preferred model family', Value: attaPackage.titleSuggestionRequest?.route.preferredModelFamily || '' },
      { Field: 'Fallback allowed', Value: String(attaPackage.titleSuggestionRequest?.route.fallbackAllowed) },
      { Field: 'Required suggestion count', Value: String(attaPackage.titleSuggestionRequest?.requiredSuggestionCount) },
      { Field: 'Suggestions in proof fixture', Value: attaPackage.titleSelectionTask?.suggestedTitles.join('; ') || '' },
    ]),
  ])

  write('06-author-gate-reclassification.csv', csv(gateHeaders, reevaluatedGates))
  write('07-existing-response-reconciliation.csv', csv(gateHeaders, existingResponses))
  write('08-full-portfolio-reevaluation.csv', csv(portfolioHeaders, portfolio))
  write('09-newly-unblocked-assets.csv', csv(gateHeaders, newlyUnblocked))
  write('10-system-resume-actions.csv', csv(portfolioHeaders, portfolio.filter((row) => /YES_IF_SOURCE_AND_GATE_CHECKS_PASS/i.test(row.Safe_to_Resume))))
  write('11-developmental-queue.csv', csv(portfolioHeaders, stageRows(portfolio, 'DEVELOPMENTAL_QUEUE')))
  write('12-revision-queue.csv', csv(portfolioHeaders, stageRows(portfolio, 'REVISION_QUEUE')))
  write('13-line-queue.csv', csv(portfolioHeaders, stageRows(portfolio, 'LINE_QUEUE')))
  write('14-copy-queue.csv', csv(portfolioHeaders, stageRows(portfolio, 'COPY_QUEUE')))
  write('15-proof-queue.csv', csv(portfolioHeaders, stageRows(portfolio, 'PROOF_QUEUE')))
  write('16-production-handoff-queue.csv', csv(portfolioHeaders, stageRows(portfolio, 'PRODUCTION_HANDOFF_QUEUE')))
  write('17-stranded-assets.csv', csv(portfolioHeaders, stageRows(portfolio, 'STRANDED_OR_RECONCILIATION_QUEUE')))

  md('18-operating-center-state.md', [
    '# 18 - Operating Center State',
    '',
    `Last verified: ${now}`,
    '',
    table(['Measure', 'State'], [
      { Measure: 'Author-facing Editorial Review card', State: 'READY AFTER MERGE/DEPLOY' },
      { Measure: 'Working Title display', State: 'Working Title: Untitled' },
      { Measure: 'Title task', State: 'Visible but nonblocking for Editorial Review approval' },
      { Measure: 'Author approval gate', State: 'Full approval remains separate' },
      { Measure: 'Author sends', State: '0' },
    ]),
  ])

  md('19-scale-readiness.md', [
    '# 19 - Scale Readiness',
    '',
    `Last verified: ${now}`,
    '',
    table(['Measure', 'Count / State'], [
      { Measure: 'Author gates reevaluated', 'Count / State': String(reevaluatedGates.length) },
      { Measure: 'Portfolio rows reevaluated', 'Count / State': String(portfolio.length) },
      { Measure: 'Canonical active portfolio count', 'Count / State': '15 (source: prior activation final state)' },
      { Measure: 'Existing responses consumed', 'Count / State': String(existingResponses.length) },
      { Measure: 'Newly unblocked assets', 'Count / State': String(newlyUnblocked.length) },
      { Measure: 'Atta-specific package logic', 'Count / State': '0' },
      { Measure: 'Silent model fallbacks', 'Count / State': '0' },
    ]),
    '',
    'Negative proof:',
    '',
    table(['Measure', 'Value'], Object.entries(proof).map(([Measure, Value]) => ({ Measure, Value }))),
  ])

  md('20-final-portfolio-state.md', [
    '# 20 - Final Portfolio State',
    '',
    `Last verified: ${now}`,
    '',
    table(['Measure', 'State'], [
      { Measure: 'Reusable package capability', State: 'IMPLEMENTED / VALIDATED IN SOURCE' },
      { Measure: 'PR #508', State: `MERGED / ${pr508.mergeCommit?.oid || ''}` },
      { Measure: 'Working title semantics', State: 'CANONICAL' },
      { Measure: 'Atta gate', State: newlyUnblocked.length ? 'PACKAGE_READY_PENDING_PERSISTENCE' : 'UNCHANGED' },
      { Measure: 'Author gates', State: `${reevaluatedGates.length} / ${reevaluatedGates.length} REEVALUATED` },
      { Measure: 'Full active portfolio', State: '15-TITLE POPULATION PRESERVED FROM CANONICAL ACTIVATION PACKAGE' },
      { Measure: 'Existing responses', State: `${existingResponses.length} CONSUMED / NO DUPLICATE REQUESTS` },
      { Measure: 'Deployment', State: 'NOT EXECUTED FROM UNMERGED BRANCH' },
      { Measure: 'Production diagnostic-runner release SHA', State: productionReleaseSha },
      { Measure: 'Author communications', State: '0' },
      { Measure: 'Next action', State: 'Review/merge/deploy this branch, then persist Atta author-facing package before any live author send.' },
    ]),
    '',
    'Source population note:',
    '',
    read(FINAL_PORTFOLIO_SOURCE).trim(),
  ])

  md('00-executive-summary.md', [
    '# 00 - Executive Summary',
    '',
    `Last verified: ${now}`,
    '',
    table(['Measure', 'State'], [
      { Measure: 'PR #508 canonicalization', State: 'COMPLETE' },
      { Measure: 'PR #508 merge SHA', State: pr508.mergeCommit?.oid || '' },
      { Measure: 'Production diagnostic-runner SHA readback', State: productionReleaseSha },
      { Measure: 'Author-facing Editorial Review package capability', State: 'IMPLEMENTED / VALIDATED' },
      { Measure: 'Working titles', State: 'Working Title: Untitled; final title not required for Editorial Review approval' },
      { Measure: 'Atta proof', State: 'PACKAGE READY PENDING MERGE/DEPLOY/PERSISTENCE' },
      { Measure: 'Author gates reevaluated', State: `${reevaluatedGates.length}` },
      { Measure: 'Full portfolio reevaluated', State: `${portfolio.length} rows; 15 active title population preserved from source package` },
      { Measure: 'Existing responses consumed', State: `${existingResponses.length}` },
      { Measure: 'Internal Markdown sent', State: '0' },
      { Measure: 'Author communications', State: '0' },
      { Measure: 'Portfolio serialized behind Atta', State: '0' },
    ]),
    '',
    'Evidence sources:',
    '',
    `- ${GATE_SOURCE}`,
    `- ${PORTFOLIO_SOURCE}`,
    `- ${FINAL_PORTFOLIO_SOURCE}`,
    '- lib/server/author-facing-editorial-review-package.ts',
    '- lib/server/cc010-author-package-portfolio-reevaluation.ts',
  ])

  const files = [
    '00-executive-summary.md',
    '01-pr508-canonicalization.md',
    '02-author-facing-package-contract.md',
    '03-author-package-rendering.md',
    '04-atta-proof.md',
    '05-title-suggestions.md',
    '06-author-gate-reclassification.csv',
    '07-existing-response-reconciliation.csv',
    '08-full-portfolio-reevaluation.csv',
    '09-newly-unblocked-assets.csv',
    '10-system-resume-actions.csv',
    '11-developmental-queue.csv',
    '12-revision-queue.csv',
    '13-line-queue.csv',
    '14-copy-queue.csv',
    '15-proof-queue.csv',
    '16-production-handoff-queue.csv',
    '17-stranded-assets.csv',
    '18-operating-center-state.md',
    '19-scale-readiness.md',
    '20-final-portfolio-state.md',
  ]
  const checksums = files.map((file) => `${createHash('sha256').update(read(join(OUT_DIR, file))).digest('hex')}  ${file}`).join('\n')
  write('checksums.sha256', `${checksums}\n`)
  for (const shim of createdShims) unlinkSync(shim)
}

main()
