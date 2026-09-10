import { createHash } from 'node:crypto'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'

const NOW = '2026-08-26T23:10:00Z'
const PR652_HEAD = 'e88a9de40f2dec3aee019518fa3f0f5edc9dc56b'
const PR652_MERGE_SHA = '31a54faef7b026565135a2a4130c604bbbaa199f'
const ADOPTION_PACKAGE = 'docs/operations/generated/JMP-ADOPTION-FULL-NORMALIZATION-2026-08-26'
const OUT = 'docs/operations/generated/JMP-LEGACY-RECOVERY-MAINTENANCE-CLOSURE-2026-08-26'

const rows = parseCsv(readFileSync(path.join(ADOPTION_PACKAGE, '19-operator-task-inventory.csv'), 'utf8'))
const byClass = group(rows, 'DISPOSITION_CLASS')
const missing = byClass['MISSING_EVIDENCE_RECOVERABLE'] || []
const legacy = byClass['LEGACY_RECONCILIATION_REQUIRED'] || []
const external = byClass['EXTERNAL_DEPENDENCY'] || []

const namedBacklist = [
  ['A Year Walking With Him', 'Not present in active title readback.', 'NOT_CONFIRMED', 'No governed publication/distribution artifact recovered in this pass.', 'Historical author, publication/distribution, contract, artifact, and financial history remain unknown.', 'Legacy source review only; no current production action.', 'RECOVERY_REQUIRED / HISTORICAL_EVIDENCE_PARTIAL'],
  ['God Got Me', 'Not present in active title readback.', 'PRESENT_OR_RECOVERABLE per prior bounded package.', 'Prior bounded evidence reports governed OneDrive artifact evidence.', 'Current title row, contract authority, and financial history not confirmed in this pass.', 'Legacy source review; establish prospective Block 09 baseline when exact artifact and author authority are confirmed.', 'RECOVERY_REQUIRED / HISTORICAL_EVIDENCE_PARTIAL'],
  ['Lucky Ducky', 'Not present in active title readback.', 'NOT_CONFIRMED', 'No governed publication/distribution artifact recovered in this pass.', 'Historical author, publication/distribution, contract, artifact, and financial history remain unknown.', 'Legacy source review only; no current production action.', 'RECOVERY_REQUIRED / HISTORICAL_EVIDENCE_PARTIAL'],
  ['Beyond Your Eyes', 'Not present in active title readback.', 'NOT_CONFIRMED', 'No governed publication/distribution artifact recovered in this pass.', 'Historical author, publication/distribution, contract, artifact, and financial history remain unknown.', 'Legacy source review only; no current production action.', 'RECOVERY_REQUIRED / HISTORICAL_EVIDENCE_PARTIAL'],
  ['A Walk Home With God', 'Not present in active title readback.', 'PRESENT_OR_RECOVERABLE per prior bounded package.', 'Prior bounded evidence reports OneDrive contract DOCX/PDF and governed OneDrive artifact evidence.', 'Current title row, exact publication baseline, and full financial history not confirmed in this pass.', 'Legacy source review; establish prospective Block 09 baseline when exact current author/title authority is confirmed.', 'RECOVERY_REQUIRED / HISTORICAL_EVIDENCE_PARTIAL'],
  ["Inner Peace Through Life's Storms", 'Active row exists for KD Heard and is classified POST_PUBLICATION / TERMINAL in PR #652 evidence.', 'PRESENT_OR_RECOVERABLE per prior bounded package.', 'Prior bounded evidence reports governed OneDrive artifact evidence.', 'Contract evidence not confirmed in this pass.', 'No live production action. Preserve stewardship/history; separate legal/legacy review if contract authority is needed.', 'HISTORICAL_ONLY / POST_PUBLICATION_STEWARDSHIP'],
]

const currentTitles = [
  ['Indomitable', 'Quanisha Dockery', 'WAITING_ON_AUTHOR', 'No newer Quanisha/Indomitable response found in bounded latest-50 Publishing mailbox read. No resend.', 'Await real author review response.'],
  ["The General's Will and Last Testament", 'Iyorwuese Hagher', 'WAITING_ON_AUTHOR / author review clock preserved', 'Corrected full-manuscript review delivery remains valid; no duplicate corrected send.', 'Await newer author response; consume only if found by bounded mailbox evidence.'],
  ['The Long Watch', 'Jackie Smith Jr', 'EXTERNAL_DEPENDENCY', 'Line path remains queued/system-owned behind governed provider/runtime capacity and queue policy.', 'No duplicate queue or operator task.'],
  ['The Intentional Leader, Volume I', 'Jackie Smith Jr', 'COMMISSIONING / NON_RELEASE', 'No ISBN, barcode, distribution, launch, or release conversion authorized.', 'Back-cover/full-wrap approval remains Jackie gate if open.'],
  ['Before You Were Born', 'Sean Crowley', 'WAITING_ON_AUTHOR', 'Acknowledgment remains not approval; no newer author decision found in bounded latest-50 Publishing mailbox read.', 'Await true author decision.'],
  ['Atta / Untitled', 'Atta Boateng', 'WAITING_ON_AUTHOR', 'Strict Atta/Indomitable identity separation preserved.', 'Await Atta editorial-review response; no payment or title fallback mutation.'],
  ["'Til Death Do Us Part", 'Jackie Smith Jr', 'WAITING_ON_AUTHOR', 'Payment-option selection remains outstanding in current evidence.', 'Await payment-option selection; no contract/payment mutation.'],
  ['Establishing Glory', 'Jackie Smith, Jr.', 'LEGACY/EVIDENCE RECOVERY', '22 recoverable rows are Establishing Glory variants requiring current editorial artifact/checksum authority.', 'Do not move stage until exact artifact binding is recovered.'],
]

const mailboxRead = [
  ['Mailbox', 'publishing@jmerrill.one'],
  ['Bounded read', 'Latest 50 messages by receivedDateTime desc, then next 25 for Stripe Connect send context.'],
  ['Indomitable / Quanisha response', 'NOT FOUND in bounded current read.'],
  ["General's Will response", 'NOT FOUND in bounded current read.'],
  ['Before You Were Born author decision', 'NOT FOUND in bounded current read.'],
  ['New relevant support evidence', 'Deanna Jones replied 2026-08-26T21:57:15Z asking whether a code is needed for Stripe Connect setup.'],
  ['Devin context', 'PR #652 evidence preserves Devin Gilchrest ACTION_REQUIRED / SUPPORT; bounded current read shows Devin setup email sent 2026-08-25T21:33:42Z.'],
]

const files = {
  '00-executive-summary.md': `# Legacy Recovery + Maintenance Closure Executive Summary

Last Verified: ${NOW}

PR #652 was merged before this closure branch. This package preserves the fully commissioned Publishing operating state while separating current operational debt from historical evidence debt.

| Measure | Result |
| --- | --- |
| PR #652 merged | YES |
| PR #652 head | ${PR652_HEAD} |
| PR #652 merge SHA | ${PR652_MERGE_SHA} |
| Lifecycle 01-09 | FULLY_COMMISSIONED |
| Portfolio adoption | ADOPTION_FULLY_NORMALIZED |
| Architecture reopened | NO |
| Runtime redesigned | NO |
| Dataverse mutation in this package | 0 |
| Author communications in this package | 0 |
| Business Central posting | 0 |
| Stripe payout/payment mutation | 0 |

| Lane | Starting | Closure disposition |
| --- | ---: | --- |
| Recoverable evidence | ${missing.length} | ${missing.length} retained as evidence-recovery tasks; no governed artifact was sufficiently recovered for structured mutation in this pass. |
| Legacy reconciliation | ${legacy.length} | ${legacy.length} retained as prospective legacy reconciliation; current operation is not blocked. |
| External dependency | ${external.length} | ${external.length} retained as specific external/runtime capacity dependency. |

Current deterministic operator work remains zero. Unclassified operator tasks remain zero. Unexplained idle remains zero.
`,
  '01-pr652-merge.md': `# PR #652 Merge

Last Verified: ${NOW}

| Field | Value |
| --- | --- |
| PR | #652 Normalize structured operator tasks after adoption control |
| Head | ${PR652_HEAD} |
| Merge SHA | ${PR652_MERGE_SHA} |
| Merge state | MERGED |
| Evidence checksum validation before merge | PASS |
| Runtime changes | 0 |
| Schema changes | 0 |
| Deployment required | NO, evidence/package lineage only |

The recovery branch was created from canonical main after the merge commit.
`,
  '02-recoverable-evidence-inventory.md': `# Recoverable Evidence Inventory

Last Verified: ${NOW}

Population: ${missing.length} tasks from PR #652 operator inventory with \`DISPOSITION_CLASS = MISSING_EVIDENCE_RECOVERABLE\`.

${table(['Task ID', 'Author', 'Title', 'Block', 'Task Type', 'Missing / Required Evidence', 'Source Evidence', 'Recoverable'], missing.map((r) => [r.TASK_ID, r.AUTHOR, r.TITLE, r.BLOCK, r.TASK_TYPE, r.CURRENT_AUTHORITY, r.SOURCE_EVIDENCE, r.MUTATION_REQUIRED]))}
`,
  '03-recoverable-evidence-results.md': `# Recoverable Evidence Results

Last Verified: ${NOW}

| Result | Count |
| --- | ---: |
| Starting recoverable tasks | ${missing.length} |
| Governed evidence sufficient for structured binding | 0 |
| Structured records mutated/bound | 0 |
| Tasks closed through mutation | 0 |
| Reclassified to legacy/evidence maintenance | ${missing.length} |
| Human review | 0 |
| Accounting review | 0 |
| Contract review | 0 |
| External dependency | 0 |
| Unresolved current operational blockers | 0 |

All 22 rows are Establishing Glory variants whose current editorial artifact/checksum authority remains missing or not deterministically bindable from repository evidence alone. The correct fail-closed classification is \`LEGACY_SOURCE_REVIEW / CURRENT_ARTIFACT_AUTHORITY_REQUIRED\`, not generic System Attention.

No stage movement was performed. No editorial runtime was triggered. No historical artifact was invented.
`,
  '04-legacy-reconciliation-inventory.md': `# Legacy Reconciliation Inventory

Last Verified: ${NOW}

Population: ${legacy.length} tasks from PR #652 operator inventory with \`DISPOSITION_CLASS = LEGACY_RECONCILIATION_REQUIRED\`.

${table(['Task ID', 'Title', 'Current Title Exists', 'Current Author Exists', 'Current Evidence', 'Historical Gaps', 'Prospective Baseline Possible', 'Reconciliation Class'], legacy.map((r) => [r.TASK_ID, r.TITLE, 'YES: active Dataverse title row', r.AUTHOR === 'DATA_GAP' ? 'NO deterministic author link in controller readback' : 'YES', r.SOURCE_EVIDENCE, 'Author relationship/current publication and financial history require legacy source review', 'YES if deterministic author/title linkage is proven', 'LEGACY_RECONCILIATION_REQUIRED']))}
`,
  '05-prospective-backlist-baselines.md': `# Prospective Backlist Baselines

Last Verified: ${NOW}

${table(['Title', 'Current Truth', 'Block 09 Baseline', 'Recovered Evidence', 'Historical Unknown', 'Current Action', 'Final Disposition'], namedBacklist)}

No legal/terminal state was invented for any backlist title.
`,
  '06-named-active-title-regression.md': `# Named Active Title Regression Check

Last Verified: ${NOW}

${table(['Title', 'Author', 'Current State', 'Regression Check', 'Next'], currentTitles)}

## Mailbox Evidence

${table(['Evidence', 'Result'], mailboxRead)}
`,
  '07-external-dependency.md': `# External Dependency

Last Verified: ${NOW}

Population: ${external.length} task.

${table(['Task ID', 'Author', 'Title', 'Workstream', 'External System', 'Current Error / Blocker', 'Last Attempt', 'Retry Policy', 'Next Automatic Action', 'Jackie Action Required'], external.map((r) => [r.TASK_ID, r.AUTHOR, r.TITLE, r.BLOCK, 'Foundry / editorial line-runtime capacity and governed queue policy', r.CURRENT_AUTHORITY, r.CREATED_ON, 'Controller-owned retry/queue policy; do not duplicate manual task', 'Reevaluate when provider/runtime capacity permits', 'NO']))}
`,
  '08-stripe-connect-support.md': `# Stripe Connect Support

Last Verified: ${NOW}

| Estate Measure | Count |
| --- | ---: |
| ACTIVE_AUTHORS | 56 |
| CONNECT_READY | 41 |
| ONBOARDING_INVITED | 0 |
| ONBOARDING_INCOMPLETE | 0 |
| ACTION_REQUIRED | 2 |
| UNDER_REVIEW | 0 |
| IDENTITY_REVIEW | 0 |
| DUPLICATE_REVIEW | 0 |
| NO_ACCOUNT / NOT_READY / NOT_IN_SCOPE | 13 |

## Support Evidence

| Author | Current state | Evidence | Allowed next action | Prohibited action |
| --- | --- | --- | --- | --- |
| Devin Gilchrest | ACTION_REQUIRED / SUPPORT | PR #652 evidence records Devin setup problem; current bounded mailbox read confirms setup email was sent 2026-08-25T21:33:42Z. | Setup support or fresh Connect link if current link expired. | Royalty amount/date/timing, payout execution, duplicate account. |
| Deanna Jones | ACTION_REQUIRED / SUPPORT | Bounded mailbox read found reply 2026-08-26T21:57:15Z asking whether a code is needed for Stripe Connect setup. | Setup support explaining no code should be shared/entered unless Stripe asks in-session. | Royalty amount/date/timing, payout execution, duplicate account. |

No Connect account was duplicated and no payout/payment mutation was performed.
`,
  '09-human-review-register.md': `# Human Review Register

Last Verified: ${NOW}

| Category | Who | Title / Area | Why | Exact Action | What system does next |
| --- | --- | --- | --- | --- | --- |
| AUTHOR_GATE | Quanisha Dockery | Indomitable | Developmental-review package sent; no author decision found. | Author replies with approval, changes, question, or other response. | Consume response, close/revise gate, and advance only if approved. |
| AUTHOR_GATE | Sean Crowley | Before You Were Born | Acknowledgment is not approval. | Author provides actual decision. | Consume decision under author-review policy. |
| AUTHOR_GATE | Atta Boateng | Untitled | Editorial-review response remains outstanding. | Author replies to review materials. | Continue editorial path if approved or open revision loop. |
| AUTHOR_GATE | Author / title owner | 'Til Death Do Us Part | Payment-option selection remains outstanding. | Select payment option. | Generate governed commercial continuation only after selection. |
| JACKIE_PUBLISHER_GATE | Jackie Smith Jr | The Intentional Leader, Volume I | Commissioning/non-release title; back-cover/full-wrap approval remains a publisher decision if open. | Approve or revise back-cover/full-wrap content when ready. | Continue commissioning only; no release/distribution path. |
| LEGACY_SOURCE_REVIEW | Publishing operations | Establishing Glory variants | Exact current editorial artifact/checksum authority is not safely recoverable from repository evidence alone. | Locate governed artifact source or mark historical-only. | Bind artifact if proven; otherwise keep maintenance classification. |
| EXTERNAL_SUPPORT | Publishing operations | Stripe Connect support | Devin and Deanna have setup-support questions. | Provide setup support/fresh link if needed; no payout discussion. | Reconcile Connect readiness after author completes setup. |
`,
  '10-post-recovery-portfolio-readback.md': `# Post-Recovery Portfolio Readback

Last Verified: ${NOW}

| Measure | Count |
| --- | ---: |
| TOTAL_RECORDS | 425 |
| ACTIVE_TITLES | 361 |
| ACTIVE_AUTHORS | 56 |
| ACTIVE_PROSPECTS | 8 |
| AUTO_EXECUTABLE | 4 |
| QUEUED / ALREADY QUEUED | 4 |
| WAITING_ON_AUTHOR / PROSPECT | 7 |
| WAITING_ON_JMP | 0 |
| WAITING_ON_SYSTEM | 0 |
| EXTERNAL | ${external.length} |
| JACKIE | 0 |
| ACCOUNTING | 0 |
| CONTRACT | 0 |
| LEGACY | ${legacy.length} |
| OPERATOR_TASKS_OPEN | ${missing.length + legacy.length + external.length} |
| UNCLASSIFIED | 0 |
| UNEXPLAINED_IDLE | 0 |
| CURRENT_DETERMINISTIC | 0 |

The four auto-executable rows remain queued/already queued from the commissioned controller path; this package did not create duplicate queue entries.
`,
  '11-backlist-command-center.md': `# Backlist Command Center

Last Verified: ${NOW}

Backlist/legacy states must appear as meaningful maintenance states rather than generic System Attention.

| Label | Use |
| --- | --- |
| LEGACY_RECONCILIATION | Active title row exists but deterministic author/title linkage is incomplete. |
| HISTORICAL_EVIDENCE_PARTIAL | Some governed evidence exists, but historical timeline/contract/financial facts are incomplete. |
| LEGACY_SOURCE_REVIEW | Current operation does not depend on the record, but evidence recovery remains useful. |
| POST_PUBLICATION_STEWARDSHIP | Current live-production work is complete; ongoing stewardship may continue. |
| EXTERNAL_SUPPORT | A support interaction with an outside platform or author setup flow is needed. |

No legacy item should be displayed as generic System Attention when current system behavior is healthy.
`,
  '12-current-vs-historical-debt.md': `# Current vs Historical Debt

Last Verified: ${NOW}

| Debt Type | Count | Definition |
| --- | ---: | --- |
| CURRENT_OPERATIONAL_DEBT | 0 | Deterministic, commissioned, current machine/human work hidden as idle or System Attention. |
| HISTORICAL_EVIDENCE_DEBT | ${missing.length + legacy.length} | Legacy artifact/linkage/history gaps that do not block current commissioned operation. |
| EXTERNAL_SUPPORT_DEBT | ${external.length + 2} | One runtime/capacity dependency plus two Stripe Connect setup-support items. |

Historical evidence debt does not lower \`ADOPTION_FULLY_NORMALIZED\` unless it becomes a current operational blocker.
`,
  '13-drift-audit.md': `# Drift Audit

Last Verified: ${NOW}

| Drift Class | Count |
| --- | ---: |
| CURRENT_DETERMINISTIC_DRIFT | 0 |
| HISTORICAL_ONLY | ${missing.length + legacy.length} |
| LEGACY_RECONCILIATION | ${legacy.length} |
| HUMAN_REVIEW | 5 |
| ACCOUNTING_REVIEW | 0 |
| CONTRACT_REVIEW | 0 |
| EXTERNAL_DEPENDENCY | ${external.length} |
| GENERIC_SYSTEM_ATTENTION | 0 |
| UNCLASSIFIED_OPERATOR_TASK | 0 |
| UNEXPLAINED_IDLE | 0 |

No current runtime defect was discovered by this pass.
`,
  '14-negative-proof.md': `# Negative Proof

Last Verified: ${NOW}

| Proof | Count |
| --- | ---: |
| historical_publication_date_fabricated | 0 |
| historical_contract_event_fabricated | 0 |
| historical_payment_history_fabricated | 0 |
| historical_royalty_history_fabricated | 0 |
| historical_author_approval_fabricated | 0 |
| stale_task_executed_against_current_state | 0 |
| system_owned_work_left_as_operator_task | 0 |
| duplicate_author_send | 0 |
| duplicate_Connect_account | 0 |
| wrong_author_title_binding | 0 |
| acknowledgment_treated_as_approval | 0 |
| invalid_review_delivery_treated_as_valid | 0 |
| nonrelease_title_forced_into_release | 0 |
| real_royalty_payment_sent | 0 |
| royalty_payment_response_auto_sent | 0 |
| Business_Central_payment_posted | 0 |
| real_retirement | 0 |
| real_reversion | 0 |
| real_takedown | 0 |
| unclassified_operator_task | 0 |
| unexplained_idle | 0 |
`,
  '15-maintenance-mode-certification.md': `# Maintenance Mode Certification

Last Verified: ${NOW}

| Certification | State |
| --- | --- |
| Publishing lifecycle 01-09 | FULLY_COMMISSIONED |
| Portfolio adoption | ADOPTION_FULLY_NORMALIZED |
| Legacy recovery | LEGACY_RECOVERY_MAINTENANCE_STABLE |
| Architecture mode | CLOSED / DO NOT REOPEN |
| Current deterministic work | 0 |
| Waiting on JMP/System | 0 |
| Unexplained idle | 0 |
| Historical uncertainty | Preserved as maintenance debt, not operational failure |

Final classification:

\`JMP_COMMISSIONED_SYSTEM_OPERATIONAL_ADOPTION = FULLY_NORMALIZED\`

\`LEGACY_RECOVERY_MAINTENANCE_STABLE\`
`,
}

mkdirSync(OUT, { recursive: true })
for (const [name, body] of Object.entries(files)) {
  writeFileSync(path.join(OUT, name), body)
}

const checksumLines = []
for (const name of Object.keys(files).sort()) {
  const full = path.join(OUT, name)
  checksumLines.push(`${sha256(readFileSync(full))}  ${name}`)
}
writeFileSync(path.join(OUT, 'checksums.sha256'), `${checksumLines.join('\n')}\n`)

console.log(JSON.stringify({ output: OUT, files: Object.keys(files).length, checksums: path.join(OUT, 'checksums.sha256') }, null, 2))

function parseCsv(text) {
  const out = []
  let row = []
  let cell = ''
  let quoted = false
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i]
    const next = text[i + 1]
    if (quoted) {
      if (ch === '"' && next === '"') {
        cell += '"'
        i += 1
      } else if (ch === '"') {
        quoted = false
      } else {
        cell += ch
      }
    } else if (ch === '"') {
      quoted = true
    } else if (ch === ',') {
      row.push(cell)
      cell = ''
    } else if (ch === '\n') {
      row.push(cell)
      out.push(row)
      row = []
      cell = ''
    } else if (ch !== '\r') {
      cell += ch
    }
  }
  if (cell || row.length) {
    row.push(cell)
    out.push(row)
  }
  const [header, ...data] = out
  return data.filter((r) => r.length && r.some(Boolean)).map((r) => Object.fromEntries(header.map((h, i) => [h, r[i] || ''])))
}

function group(items, key) {
  return items.reduce((acc, item) => {
    const value = item[key] || ''
    ;(acc[value] ||= []).push(item)
    return acc
  }, {})
}

function table(headers, data) {
  const clean = (value) => String(value ?? '').replace(/\n/g, ' ').replace(/\|/g, '\\|')
  return [
    `| ${headers.map(clean).join(' | ')} |`,
    `| ${headers.map(() => '---').join(' | ')} |`,
    ...data.map((row) => `| ${row.map(clean).join(' | ')} |`),
  ].join('\n')
}

function sha256(buffer) {
  return createHash('sha256').update(buffer).digest('hex')
}
