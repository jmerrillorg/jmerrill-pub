#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const outDir = 'docs/operations/generated'
const reconciliation = JSON.parse(readFileSync(join(outDir, '2026-07-18-JM1-2026-Royalty-Source-Row-Reconciliation.json'), 'utf8'))
const monthlyClose = JSON.parse(readFileSync(join(outDir, '2026-07-18-JM1-2026-Royalty-Monthly-Close.json'), 'utf8'))
const coreLoad = JSON.parse(readFileSync(join(outDir, '2026-07-18-JM1-2026-Royalty-Core-Load-Result.json'), 'utf8'))
const paymentRows = readCsv(join(outDir, '2026-07-17-JM1-2026-Royalty-Payment-Final-Classification.csv'))
const statementRows = readCsv(join(outDir, '2026-07-17-JM1-2026-Royalty-Draft-Statement-Set.csv'))

const heldRows = reconciliation.rows.filter((row) => row.matchStatus !== 'MATCHED_CORE_IDENTIFIER')
const matchedRows = reconciliation.rows.filter((row) => row.matchStatus === 'MATCHED_CORE_IDENTIFIER')
const packages = buildDecisionPackages(heldRows)
const statements = buildStatementQueue(coreLoad.statements || [], matchedRows, heldRows, paymentRows, statementRows)
const monthlyCloseWave2 = buildMonthlyClose(monthlyClose)
const summary = {
  generatedAt: new Date().toISOString(),
  acceptedBaseline: {
    sharePointEvidenceItems: 37,
    operationalSourceFiles: monthlyClose.sourceImportSummary?.files || 34,
    reconciledImports: monthlyClose.sourceImportSummary?.importedFiles || 24,
    normalizedRows: reconciliation.rowCount,
    coreRoyaltyRows: reconciliation.matched,
    heldRows: reconciliation.heldTitle,
    januaryBDisposition: 'SUPERSEDED',
  },
  decisionPackages: {
    count: packages.length,
    heldRows: heldRows.length,
    affectedDollars: round(packages.reduce((sum, item) => sum + item.financialImpact, 0)),
    highConfidence: packages.filter((item) => item.confidence === 'high').length,
    mediumConfidence: packages.filter((item) => item.confidence === 'medium').length,
    lowConfidence: packages.filter((item) => item.confidence === 'low').length,
    approvalStatus: 'Awaiting Jackie package decisions',
  },
  mappingResults: {
    durableMappingsCreated: 0,
    rowsReleased: 0,
    remainingHeldRows: heldRows.length,
    reusableMappingCoverage: '0% new Wave 2 mapping coverage; no Jackie mapping approvals supplied in this instruction.',
  },
  statementReadiness: summarizeStatements(statements),
  monthlyClose: {
    januaryThroughJuneStatus: monthlyCloseWave2.months.map((month) => ({
      month: month.month,
      status: month.status,
      waitingFor: month.waitingFor,
    })),
    missingSourceActions: monthlyCloseWave2.missingSourceActions,
  },
  boundaries: {
    authorVisibility: 'Off',
    statementRelease: 'Not authorized',
    payments: 'Not authorized',
    businessCentralPosting: 'Not authorized',
  },
}

writeFileSync(join(outDir, '2026-07-19-JM1-Royalty-Operations-Wave2-Decision-Packages.json'), `${JSON.stringify({ summary, packages, statements, monthlyClose: monthlyCloseWave2 }, null, 2)}\n`)
writeFileSync(join(outDir, '2026-07-19-JM1-Royalty-Operations-Wave2-Decision-Packages.csv'), toCsv(packages.map((item) => ({
  packageKey: item.packageKey,
  recommendedDecision: item.recommendedDecision,
  confidence: item.confidence,
  affectedRows: item.affectedRows,
  statementPeriods: item.statementPeriods.join('; '),
  sourceSystems: item.sourceSystems.join('; '),
  sourceFiles: item.sourceFiles.join('; '),
  identifiers: item.identifiers.join('; '),
  reportedTitle: item.reportedTitle,
  canonicalTitleStatus: item.canonicalTitleStatus,
  authorRightsholderStatus: item.authorRightsholderStatus,
  royaltyRuleStatus: item.royaltyRuleStatus,
  units: item.units,
  financialImpact: item.financialImpact.toFixed(2),
  reusableMappingImpact: item.reusableMappingImpact,
  downstreamEffect: item.downstreamEffect,
}))))
writeFileSync(join(outDir, '2026-07-19-JM1-Royalty-Operations-Wave2-Statement-Readiness.json'), `${JSON.stringify({ generatedAt: summary.generatedAt, statements, summary: summary.statementReadiness }, null, 2)}\n`)
writeFileSync(join(outDir, '2026-07-19-JM1-Royalty-Operations-Wave2-Publisher-Decision-Resolution-Report.md'), renderReport(summary, packages, statements, monthlyCloseWave2))
console.log(JSON.stringify({ ok: true, packages: packages.length, heldRows: heldRows.length, affectedDollars: summary.decisionPackages.affectedDollars, statements: statements.length }, null, 2))

function buildDecisionPackages(rows) {
  const groups = new Map()
  for (const row of rows) {
    const identifier = normalizeIdentifier(row.isbn || '')
    const title = clean(row.title)
    const key = [normalizeTitle(title), identifier, 'AUTHOR_PENDING', 'ROYALTY_RULE_PENDING', `2026-${String(row.month).padStart(2, '0')}`].join('|')
    const current = groups.get(key) || {
      packageKey: `ROYALTY-W2-${String(groups.size + 1).padStart(3, '0')}`,
      reportedTitle: title,
      normalizedTitle: normalizeTitle(title),
      canonicalTitleStatus: 'Jackie decision required - choose existing canonical title/asset or classify source row out of scope.',
      authorRightsholderStatus: 'Pending canonical title mapping; rightsholder and royalty profile must follow the approved title/asset.',
      royaltyRuleStatus: 'Pending mapped title/rightsholder royalty profile; no new contract rate inferred.',
      sourceSystems: new Set(),
      sourceFiles: new Set(),
      statementPeriods: new Set(),
      identifiers: new Set(),
      accounts: new Set(),
      currencies: new Set(),
      rowHashes: new Set(),
      affectedRows: 0,
      units: 0,
      financialImpact: 0,
      grossCompensation: 0,
      evidence: [],
    }
    current.sourceSystems.add(clean(row.sourceSystem))
    current.sourceFiles.add(clean(row.sourceFile))
    current.statementPeriods.add(`2026-${String(row.month).padStart(2, '0')}`)
    if (identifier) current.identifiers.add(identifier)
    if (row.account) current.accounts.add(String(row.account))
    if (row.currency) current.currencies.add(String(row.currency))
    if (row.lineItem) current.rowHashes.add(String(row.lineItem))
    current.affectedRows += 1
    current.units += Number(row.units || 0)
    current.financialImpact = round(current.financialImpact + Number(row.net || 0))
    current.grossCompensation = round(current.grossCompensation + Number(row.gross || 0))
    current.evidence.push(`row ${row.rowNumber || '?'} ${clean(row.sourceSystem)} ${clean(row.sourceFile)} ${identifier || 'identifier pending'} net ${Number(row.net || 0).toFixed(2)}`)
    groups.set(key, current)
  }
  return [...groups.values()]
    .map((item) => {
      const identifiers = [...item.identifiers]
      const confidence = identifiers.length ? 'medium' : 'low'
      return {
        ...item,
        sourceSystems: [...item.sourceSystems].filter(Boolean).sort(),
        sourceFiles: [...item.sourceFiles].filter(Boolean).sort(),
        statementPeriods: [...item.statementPeriods].filter(Boolean).sort(),
        identifiers,
        accounts: [...item.accounts].filter(Boolean).sort(),
        currencies: [...item.currencies].filter(Boolean).sort(),
        rowHashes: [...item.rowHashes].filter(Boolean).sort(),
        confidence,
        recommendedDecision: identifiers.length
          ? `Approve durable identifier mapping for ${identifiers.join(', ')} to the correct existing JM1 canonical title/format/rightsholder.`
          : `Approve title-text mapping for ${item.reportedTitle} only after confirming the existing JM1 canonical title/format/rightsholder.`,
        supportingEvidence: item.evidence.slice(0, 8),
        reusableMappingImpact: identifiers.length
          ? 'Future source rows carrying the approved identifier should reconcile automatically.'
          : 'Future rows with the approved alternate title spelling should route to the same decision unless an identifier is later added.',
        downstreamEffect: 'After approval: persist mapping, reevaluate held rows, import eligible activity, refresh draft statement, keep author visibility off.',
        approvalState: 'Awaiting Jackie approval',
      }
    })
    .sort((a, b) => Math.abs(b.financialImpact) - Math.abs(a.financialImpact))
    .map((item, index) => ({ ...item, packageKey: `ROYALTY-W2-${String(index + 1).padStart(3, '0')}` }))
}

function buildStatementQueue(coreStatements, matchedRows, heldRows, payments, legacyStatements) {
  const byPeriod = new Map()
  const paymentByPeriod = new Map()
  for (const payment of payments) {
    const rawDate = payment.date || payment.paymentDate || payment.transactionDate || ''
    const period = periodFromDate(rawDate)
    if (!period) continue
    const current = paymentByPeriod.get(period) || { rows: 0, allocationUnknown: 0, unresolved: 0, amount: 0 }
    current.rows += 1
    const status = payment.finalPaymentStatus || ''
    if (status.includes('ALLOCATION UNKNOWN')) current.allocationUnknown += 1
    if (status.includes('UNRESOLVED')) current.unresolved += 1
    current.amount = round(current.amount + Number(payment.amount || 0))
    paymentByPeriod.set(period, current)
  }
  for (const statement of coreStatements) {
    const period = statement.period
    const matched = matchedRows.filter((row) => `2026-${String(row.month).padStart(2, '0')}` === period)
    const held = heldRows.filter((row) => `2026-${String(row.month).padStart(2, '0')}` === period)
    const payment = paymentByPeriod.get(period) || { rows: 0, allocationUnknown: 0, unresolved: 0, amount: 0 }
    byPeriod.set(period, {
      period,
      statementId: statement.id || '',
      coreAction: statement.action || '',
      status: held.length || payment.allocationUnknown || payment.unresolved ? 'Draft — Exceptions' : 'Draft — Ready for Jackie Review',
      matchedSourceRows: matched.length,
      heldRows: held.length,
      paymentEvidenceRows: payment.rows,
      paymentAllocationUnknown: payment.allocationUnknown,
      unresolvedPayments: payment.unresolved,
      sourceNetCompensation: round(matched.reduce((sum, row) => sum + Number(row.net || 0), 0)),
      heldNetCompensation: round(held.reduce((sum, row) => sum + Number(row.net || 0), 0)),
      paymentEvidenceAmount: payment.amount,
      provenanceStatus: held.length ? 'Held rows require publisher mapping before complete row-level provenance.' : 'Loaded rows trace source file -> normalized row -> Core source row -> draft statement period.',
      readinessBlocker: held.length
        ? `${held.length} held row(s) require approved reusable mapping.`
        : payment.allocationUnknown || payment.unresolved
          ? 'Payment evidence requires allocation decision before ready review.'
          : 'Ready for Jackie review after final payment allocation check.',
    })
  }
  return [...byPeriod.values()].sort((a, b) => a.period.localeCompare(b.period))
}

function buildMonthlyClose(input) {
  const generatedPolicy = 'Automated reports are generated no later than the 10th of the month; if no generated report exists before that date, no automated report is expected for that source/month. Manual reports may be uploaded at any time and must not be inferred as zero activity.'
  const months = input.months.map((month) => {
    const sources = month.sources.map((source) => {
      const automatedMissing = source.state === 'SOURCE MISSING' && /lsi|ingram|acx/i.test(source.label) && !/direct/i.test(source.label)
      return automatedMissing
        ? { ...source, state: 'KNOWN UNAVAILABLE', detail: `${source.detail}; generated-report deadline policy applied.` }
        : source
    })
    return {
      ...month,
      sources,
      waitingFor: month.waitingFor.map((item) => `${item} Manual reports may still be supplied at any time where applicable.`),
    }
  })
  const missingSourceActions = []
  for (const month of months) {
    for (const source of month.sources) {
      if (source.state === 'UPLOAD REQUIRED') missingSourceActions.push({ month: month.month, source: source.label, action: source.label === 'Direct Sales' ? 'Upload Direct Sales or Confirm No Activity' : `Upload ${source.label} source report`, state: source.state })
      if (source.label === 'ACX' && source.state === 'KNOWN UNAVAILABLE') missingSourceActions.push({ month: month.month, source: source.label, action: 'Wait for official ACX source; do not estimate', state: source.state })
    }
  }
  return { ...input, generatedReportPolicy: generatedPolicy, months, missingSourceActions }
}

function summarizeStatements(statements) {
  return {
    statementPeriods: statements.length,
    readyForJackieReview: statements.filter((item) => item.status.includes('Ready')).length,
    exceptions: statements.filter((item) => item.status.includes('Exceptions')).length,
    rowsReconciled: statements.reduce((sum, item) => sum + item.matchedSourceRows, 0),
    rowsHeld: statements.reduce((sum, item) => sum + item.heldRows, 0),
    sourceNetCompensation: round(statements.reduce((sum, item) => sum + item.sourceNetCompensation, 0)),
    heldNetCompensation: round(statements.reduce((sum, item) => sum + item.heldNetCompensation, 0)),
  }
}

function renderReport(summary, packages, statements, monthlyCloseWave2) {
  const top = packages.slice(0, 20).map((item) => `| ${item.packageKey} | ${item.reportedTitle.replace(/\|/g, '/')} | ${item.identifiers.join('; ') || 'Pending'} | ${item.statementPeriods.join('; ')} | ${item.affectedRows} | ${item.financialImpact.toFixed(2)} | ${item.confidence} | ${item.recommendedDecision.replace(/\|/g, '/')} |`).join('\n')
  const statementLines = statements.map((item) => `| ${item.period} | ${item.status} | ${item.matchedSourceRows} | ${item.heldRows} | ${item.sourceNetCompensation.toFixed(2)} | ${item.heldNetCompensation.toFixed(2)} | ${item.readinessBlocker.replace(/\|/g, '/')} |`).join('\n')
  const monthLines = monthlyCloseWave2.months.map((month) => `| ${month.month} | ${month.status} | ${month.sources.map((source) => `${source.label}: ${source.state}`).join('<br>')} | ${month.waitingFor.join('<br>') || 'None'} |`).join('\n')
  return `# JM1 Royalty Operations Wave 2 - Publisher Decision Resolution Report\n\n## Accepted Baseline\n\n- PR #304 royalty ingestion platform remains accepted and deployed.\n- SharePoint evidence items: ${summary.acceptedBaseline.sharePointEvidenceItems}\n- Operational source files: ${summary.acceptedBaseline.operationalSourceFiles}\n- Reconciled imports: ${summary.acceptedBaseline.reconciledImports}\n- Normalized rows: ${summary.acceptedBaseline.normalizedRows}\n- Core royalty rows: ${summary.acceptedBaseline.coreRoyaltyRows}\n- Held rows: ${summary.acceptedBaseline.heldRows}\n- January -B disposition: ${summary.acceptedBaseline.januaryBDisposition}\n\nNo accepted imports were regenerated or reloaded.\n\n## Decision Packages\n\n- Packages created: ${summary.decisionPackages.count}\n- Held rows covered: ${summary.decisionPackages.heldRows}\n- Financial impact: $${summary.decisionPackages.affectedDollars.toFixed(2)}\n- High-confidence auto approvals: ${summary.decisionPackages.highConfidence}\n- Jackie package approvals required: ${summary.decisionPackages.mediumConfidence + summary.decisionPackages.lowConfidence}\n\n| Package | Reported title | Identifier | Periods | Rows | Net | Confidence | Recommended decision |\n|---|---|---:|---|---:|---:|---|---|\n${top}\n\nThe full package list is stored in \`2026-07-19-JM1-Royalty-Operations-Wave2-Decision-Packages.csv\` and \`.json\`.\n\n## Mapping Results\n\n- Durable mappings created: ${summary.mappingResults.durableMappingsCreated}\n- Rows released: ${summary.mappingResults.rowsReleased}\n- Remaining held rows: ${summary.mappingResults.remainingHeldRows}\n- Reusable mapping coverage: ${summary.mappingResults.reusableMappingCoverage}\n\nNo Jackie mapping approvals were included in this instruction, so no held rows were released.\n\n## Statement Reconciliation\n\n| Period | Status | Matched rows | Held rows | Loaded net | Held net | Blocker |\n|---|---|---:|---:|---:|---:|---|\n${statementLines}\n\n## Monthly Close\n\nPolicy: ${monthlyCloseWave2.generatedReportPolicy}\n\n| Month | Status | Sources | Waiting for |\n|---|---|---|---|\n${monthLines}\n\n## Publisher Today\n\nPublisher Today should now show decision-package queue, statement-readiness queue, monthly close states, and missing-source upload actions. It must not show author visibility, statement release, payments, or Business Central posting as available actions.\n\n## Final Boundary\n\nThe royalty ingestion platform is operational and no longer the limiting factor. Royalty Operations Wave 2 focuses on converting the remaining governed decision rows into reusable publisher mappings, reconciling draft statements to row-level source provenance, and preparing complete royalty statements for Jackie's review while preserving truthful monthly-close status and preventing premature financial release.\n`
}

function readCsv(path) {
  const text = readFileSync(path, 'utf8')
  const [headerLine, ...lines] = text.split(/\r?\n/).filter(Boolean)
  const headers = parseCsvLine(headerLine)
  return lines.map((line) => Object.fromEntries(parseCsvLine(line).map((cell, index) => [headers[index], cell])))
}
function parseCsvLine(line) {
  const cells = []
  let value = ''
  let quoted = false
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i]
    const next = line[i + 1]
    if (char === '"' && quoted && next === '"') { value += '"'; i += 1 }
    else if (char === '"') quoted = !quoted
    else if (char === ',' && !quoted) { cells.push(value); value = '' }
    else value += char
  }
  cells.push(value)
  return cells
}
function toCsv(rows) {
  if (!rows.length) return ''
  const headers = Object.keys(rows[0])
  return `${headers.join(',')}\n${rows.map((row) => headers.map((header) => csv(row[header])).join(',')).join('\n')}\n`
}
function csv(value) { const s = String(value ?? ''); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s }
function normalizeTitle(value) { return clean(value).toLowerCase().replace(/[’']/g, "'").replace(/[^a-z0-9]+/g, ' ').trim() }
function normalizeIdentifier(value) { return String(value || '').replace(/[^0-9XxA-Za-z]/g, '').toUpperCase() }
function clean(value) { return String(value || '').trim() }
function round(value) { return Math.round((value + Number.EPSILON) * 100) / 100 }
function periodFromDate(value) {
  const match = String(value || '').match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/)
  if (!match) return ''
  return `${match[3]}-${match[1].padStart(2, '0')}`
}
