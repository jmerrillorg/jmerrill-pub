#!/usr/bin/env node

import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs'
import { basename, join } from 'node:path'

const OUT_DIR = 'docs/operations/generated/CC010-EDITORIAL-PORTFOLIO-RECOVERY-2026-08-13'
const SHAREPOINT_TITLE_ROOT =
  '/Users/jmerrillone/Library/CloudStorage/OneDrive-JMerrillFoundation,Inc/JM1-PUB/01_Titles'

const STAGE_TYPES = {
  100000000: 'Stage 0 / Editorial Review',
  100000001: 'Developmental Editing',
  100000002: 'Line Editing',
  100000003: 'Copyediting',
  100000004: 'Proofreading',
  100000006: 'Editorial Internal QA',
}

const STAGE_STATUS = {
  100000001: 'In Progress',
  100000002: 'Author Review',
  100000008: 'Complete',
}

const SEED_TITLES = [
  'Indomitable',
  'Til Death Do Us Part',
  "'Til Death Do Us Part",
  'Atta',
  'The Intentional Leader',
  "The General's Will and Last Testament",
  'Iyorwuese',
  'Before You Were Born',
  'Establishing Glory',
  'The Long Watch',
]

const KNOWN_REAL_HINTS = [
  'quanishia',
  'indomitable',
  'til death',
  'death do us part',
  'atta',
  'intentional leader',
  'general',
  'iyorwuese',
  'before you were born',
  'establishing glory',
  'long watch',
]

const TEST_PHRASE_HINTS = [
  'synthetic',
  'fixture',
  'gate w1',
  'staging',
  'duplicate proof',
  'preview proof',
  'certification manuscript',
  'final proof 202607',
  'test automation',
  'test package',
  'test title',
]

const now = new Date().toISOString()

function sh(command, args, options = {}) {
  return execFileSync(command, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], ...options }).trim()
}

function azSetting(name) {
  return sh('az', [
    'functionapp',
    'config',
    'appsettings',
    'list',
    '-g',
    'rg-jm1-ai',
    '-n',
    'func-jm1-diagnostic-ai-runner',
    '--query',
    `[?name=='${name}'].value | [0]`,
    '-o',
    'tsv',
  ])
}

function functionRuntimeState() {
  try {
    return sh('az', [
      'functionapp',
      'show',
      '-g',
      'rg-jm1-ai',
      '-n',
      'func-jm1-diagnostic-ai-runner',
      '--query',
      'siteConfig.linuxFxVersion',
      '-o',
      'tsv',
    ])
  } catch (error) {
    return `UNABLE_TO_VERIFY: ${String(error.message || error).slice(0, 160)}`
  }
}

async function dataverseClient() {
  const base = azSetting('DATAVERSE_WEB_API_BASE_URL').replace(/\/$/, '')
  const resource = azSetting('DATAVERSE_RESOURCE_URL').replace(/\/$/, '')
  const token = sh('az', ['account', 'get-access-token', '--resource', resource, '--query', 'accessToken', '-o', 'tsv'])
  async function list(entitySet, query = '') {
    const url = `${base}/${entitySet}${query ? `?${query}` : ''}`
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
        Prefer: 'odata.include-annotations="OData.Community.Display.V1.FormattedValue"',
      },
    })
    if (!response.ok) {
      return { entitySet, error: `${response.status}:${(await response.text()).slice(0, 300)}`, rows: [] }
    }
    const json = await response.json()
    return { entitySet, error: '', rows: Array.isArray(json.value) ? json.value : [] }
  }
  return { list }
}

function value(row, ...keys) {
  for (const key of keys) {
    const v = row?.[key]
    if (typeof v === 'string' && v.trim()) return v.trim()
    if (typeof v === 'number') return String(v)
    if (typeof v === 'boolean') return String(v)
  }
  return ''
}

function formatted(row, key) {
  return value(row, `${key}@OData.Community.Display.V1.FormattedValue`)
}

function lookup(row, key) {
  return value(row, key)
}

function normalize(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function canonicalTitleKey(title, author = '', intake = '') {
  const titleNorm = normalize(title)
  if (titleNorm) return titleNorm
  const intakeNorm = normalize(intake)
  if (intakeNorm) return intakeNorm
  return normalize(author) || 'unknown'
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

function scanSharePointTitles() {
  const rows = []
  if (!existsSync(SHAREPOINT_TITLE_ROOT)) return rows
  for (const stageFolder of readdirSync(SHAREPOINT_TITLE_ROOT)) {
    const stagePath = join(SHAREPOINT_TITLE_ROOT, stageFolder)
    if (!statSync(stagePath).isDirectory()) continue
    for (const child of readdirSync(stagePath)) {
      const childPath = join(stagePath, child)
      if (!statSync(childPath).isDirectory()) continue
      const parsed = parseTitleFolder(child)
      rows.push({
        source: 'SharePointSync',
        entity_type: 'sharepoint_folder',
        record_id: childPath,
        record_name: child,
        title: parsed.title,
        author: parsed.author,
        intake_reference: parsed.intakeReference,
        title_id: '',
        stage_type: stageFolder,
        stage_status: '',
        modified_on: '',
        source_path: childPath,
      })
    }
  }
  return rows
}

function parseTitleFolder(name) {
  const match = name.match(/(JMP-INT-\d{6}-[A-Z0-9]+)\s+-\s+(.+?)\s+-\s+(.+)$/i)
  if (!match) return { intakeReference: '', author: '', title: name }
  return { intakeReference: match[1], author: match[2], title: cleanupTitleName(match[3]) }
}

function parseManuscriptAssetUrl(url) {
  if (!url) return { intakeReference: '', author: '', title: '' }
  const decoded = decodeURIComponent(String(url))
  const folderMatch = decoded.match(/(JMP-INT-\d{6}-[A-Z0-9]+)\s+-\s+(.+?)\s+-\s+([^/?#]+)/i)
  if (!folderMatch) return { intakeReference: '', author: '', title: '' }
  return {
    intakeReference: folderMatch[1],
    author: folderMatch[2].trim(),
    title: cleanupTitleName(folderMatch[3].trim()),
  }
}

function cleanupTitleName(value) {
  return String(value || '')
    .replace(/^(Editorial Review|Developmental Editing|Developmental Edit|Line Editing|Copyediting|Proofreading|Author Review|Developmental Editing Author Review|Cover Review|Interior Review)\s+-\s+/i, '')
    .replace(/^INT-PUB-\d+\s+Stage\s+0\s+Handoff\s+-\s+/i, '')
    .replace(/^JMP-INT-\d{6}-[A-Z0-9]+\s+-\s+/i, '')
    .trim()
}

function hasTestSignal(row) {
  const text = normalize([row.title, row.author, row.record_name, row.source_path, row.stage_type, row.stage_status].join(' '))
  if (TEST_PHRASE_HINTS.some((hint) => text.includes(hint))) return true
  if (/\btest\b/.test(text) && !/\btestament\b/.test(text)) return true
  return false
}

function classifyRecord(row) {
  const text = normalize([row.title, row.author, row.record_name, row.source_path, row.stage_type, row.stage_status].join(' '))
  const titleText = normalize([row.title, row.record_name, row.source_path].join(' '))
  if (hasTestSignal(row)) {
    if (text.includes('duplicate')) return 'DUPLICATE'
    if (text.includes('certification')) return 'CERTIFICATION'
    return text.includes('synthetic') ? 'SYNTHETIC' : 'TEST'
  }
  if (text.includes('archive') || text.includes('retired')) return 'REAL_ARCHIVED_RETIRED'
  if (text.includes('backlist') || text.includes('published')) return 'REAL_PUBLISHED_BACKLIST'
  if (KNOWN_REAL_HINTS.some((hint) => titleText.includes(hint))) return 'REAL_ACTIVE'
  if (row.title || row.author || row.intake_reference || row.title_id) return 'RECONCILIATION_REQUIRED'
  return 'RECONCILIATION_REQUIRED'
}

function waitingOwner(input) {
  const text = normalize([input.stage_status, input.summary, input.gate_status, input.author_decision, input.record_name].join(' '))
  if (text.includes('delivery failed') || text.includes('external') || text.includes('provider')) return 'External'
  if (text.includes('author review') || text.includes('await author') || text.includes('waiting author')) return 'Author'
  if (text.includes('jackie') || text.includes('publisher decision') || text.includes('release decision')) return 'Jackie'
  if (text.includes('blocked') || text.includes('source artifact missing') || text.includes('automation') || text.includes('in progress')) return 'System'
  return 'None'
}

function stageLabel(type, fallback = '') {
  return STAGE_TYPES[Number(type)] || fallback || ''
}

function statusLabel(status, fallback = '') {
  return STAGE_STATUS[Number(status)] || fallback || ''
}

function appendRecord(map, key, record) {
  const existing = map.get(key) || []
  existing.push(record)
  map.set(key, existing)
}

function groupKey(record) {
  const title = cleanupTitleName(record.title || record.record_name || '')
  const titleNorm = normalize(title)
  if (titleNorm) return `title:${titleNorm}`
  const intake = normalize(record.intake_reference)
  if (intake) return `intake:${intake}`
  if (record.title_id) return `title_id:${record.title_id}`
  return canonicalTitleKey(record.title, record.author, record.intake_reference)
}

function groupClassification(group) {
  const nonTest = group.filter((row) => !['TEST', 'CERTIFICATION', 'SYNTHETIC', 'DUPLICATE'].includes(row.classification_hint))
  if (nonTest.length === 0) {
    const first = group.find((row) => ['TEST', 'CERTIFICATION', 'SYNTHETIC', 'DUPLICATE'].includes(row.classification_hint))
    return first?.classification_hint || 'TEST'
  }
  const hasActiveEditorialEvidence = group.some((row) => {
    if (['editorial_stage', 'approval_gate', 'editorial_artifact', 'intake', 'sharepoint_folder'].includes(row.entity_type)) return true
    if (row.entity_type !== 'editorial_diagnostic') return false
    const title = normalize(cleanupTitleName(row.title || row.record_name))
    return Boolean(row.source_path || (title && !title.startsWith('int pub 005 stage 0 handoff')))
  })
  if (hasActiveEditorialEvidence) {
    return 'REAL_ACTIVE'
  }
  if (group.some((row) => row.classification_hint === 'REAL_ACTIVE') && group.some((row) => row.stage_type || row.stage_status || row.source_path)) {
    return 'REAL_ACTIVE'
  }
  if (group.some((row) => row.classification_hint === 'REAL_ARCHIVED_RETIRED')) return 'REAL_ARCHIVED_RETIRED'
  if (group.some((row) => row.classification_hint === 'REAL_PUBLISHED_BACKLIST')) return 'REAL_PUBLISHED_BACKLIST'
  if (group.every((row) => row.entity_type === 'title')) return 'REAL_PUBLISHED_BACKLIST'
  return 'RECONCILIATION_REQUIRED'
}

function uniqueByTitle(rows) {
  const seen = new Set()
  const out = []
  for (const row of rows) {
    const key = normalize(row.title)
    if (!key || seen.has(key)) continue
    seen.add(key)
    out.push(row)
  }
  return out
}

function newest(rows) {
  return [...rows].sort((a, b) => Date.parse(b.modified_on || b.created_on || '') - Date.parse(a.modified_on || a.created_on || ''))[0] || null
}

function displayTitleForGroup(group, primary, key) {
  const titleRow = group.find((row) => row.entity_type === 'title' && cleanupTitleName(row.title))
  const folderRow = group.find((row) => row.entity_type === 'sharepoint_folder' && cleanupTitleName(row.title))
  const diagnosticRow = group.find((row) => row.entity_type === 'editorial_diagnostic' && cleanupTitleName(row.title))
  return cleanupTitleName(titleRow?.title || folderRow?.title || diagnosticRow?.title || primary.title || primary.record_name || key)
}

function latestArtifact(rows) {
  const candidates = rows
    .filter((row) => row.entity_type === 'editorial_artifact')
    .sort((a, b) => {
      const approved = Number(Boolean(b.is_current_approved)) - Number(Boolean(a.is_current_approved))
      if (approved) return approved
      return Date.parse(b.modified_on || b.created_on || '') - Date.parse(a.modified_on || a.created_on || '')
    })
  return candidates[0] || null
}

function computeReentry(records) {
  const artifacts = records.filter((r) => r.entity_type === 'editorial_artifact')
  const stages = records.filter((r) => r.entity_type === 'editorial_stage')
  const diagnostics = records.filter((r) => r.entity_type === 'editorial_diagnostic')
  const gates = records.filter((r) => r.entity_type === 'approval_gate')
  const latestStage = newest(stages)
  const latestDiagnostic = newest(diagnostics)
  const artifact = latestArtifact(artifacts)
  const latestGate = newest(gates)
  const currentStage = latestStage?.stage_type || latestDiagnostic?.stage_type || inferStageFromSharePoint(records) || 'Unknown'
  const currentStatus = latestStage?.stage_status || latestDiagnostic?.stage_status || ''
  const owner = waitingOwner({
    stage_status: currentStatus,
    summary: latestStage?.summary || latestGate?.summary || '',
    gate_status: latestGate?.gate_status || '',
    author_decision: latestGate?.author_decision || '',
    record_name: latestStage?.record_name || '',
  })
  const lower = normalize([currentStage, currentStatus, latestStage?.summary, latestDiagnostic?.summary, latestGate?.summary].join(' '))
  const latestCompletedBoundary =
    lower.includes('production ready') || lower.includes('production handoff') ? 'Production Handoff Readiness' :
    lower.includes('proof') && (lower.includes('complete') || lower.includes('approved')) ? 'Proofreading Complete' :
    lower.includes('copy') && (lower.includes('complete') || lower.includes('approved')) ? 'Copyediting Complete' :
    lower.includes('line') && (lower.includes('complete') || lower.includes('approved')) ? 'Line Complete' :
    lower.includes('developmental') && (lower.includes('complete') || lower.includes('approved')) ? 'Developmental Complete' :
    lower.includes('editorial review') && (lower.includes('complete') || lower.includes('package preparation')) ? 'Editorial Review Complete' :
    'None proven'
  const unresolved =
    owner === 'Author' ? `Await ${currentStage} author response/full approval` :
    owner === 'Jackie' ? `Publisher decision for ${currentStage}` :
    owner === 'System' ? `System-owned ${currentStage} continuation or exact blocker resolution` :
    owner === 'External' ? `External dependency for ${currentStage}` :
    currentStage === 'Unknown' ? 'Reconciliation required' :
    `Confirm next boundary after ${currentStage}`
  return {
    currentStage,
    currentStatus,
    latestCompletedBoundary,
    earliestUnresolvedBoundary: unresolved,
    waitingOn: owner,
    latestArtifact: artifact,
    latestGate,
    mutationRequired: owner === 'System' && lower.includes('source artifact missing') ? 'NO - blocker evidence only' : 'NO - dry-run evidence first',
  }
}

function inferStageFromSharePoint(records) {
  const folder = records.find((row) => row.entity_type === 'sharepoint_folder')
  if (!folder) return ''
  const stage = String(folder.stage_type || '')
  if (stage.includes('01_Editorial')) return 'Stage 0 / Editorial Review'
  if (stage.includes('02_Developmental')) return 'Developmental Editing'
  if (stage.includes('03_Line')) return 'Line Editing'
  if (stage.includes('04_Copy')) return 'Copyediting'
  if (stage.includes('05_Proof')) return 'Proofreading'
  if (stage.includes('06_Production')) return 'Production / Downstream'
  return stage
}

function automationStatus(stage, classification) {
  if (classification.includes('FROZEN')) return 'MANUAL_FROZEN'
  if (stage.includes('Stage 0')) return 'AVAILABLE - Stage 0 Claude live-proven'
  if (stage.includes('Developmental')) return 'PARTIAL - route commissioned; execution requires clean boundary'
  if (stage.includes('Line')) return 'PARTIAL - route commissioned; execution requires clean boundary'
  if (stage.includes('Copy')) return 'PARTIAL - OpenAI preferred route preserved'
  if (stage.includes('Proof')) return 'PARTIAL - OpenAI preferred route preserved'
  if (stage.includes('Production')) return 'DOWNSTREAM'
  return 'NOT_COMMISSIONED'
}

function write(name, content) {
  writeFileSync(join(OUT_DIR, name), content)
}

function checksumFiles(files) {
  return files
    .map((file) => {
      const content = Buffer.from(readFileSyncString(join(OUT_DIR, file)))
      return `${createHash('sha256').update(content).digest('hex')}  ${file}`
    })
    .join('\n') + '\n'
}

function readFileSyncString(path) {
  return existsSync(path) ? String(execFileSync('cat', [path])) : ''
}

async function main() {
  mkdirSync(OUT_DIR, { recursive: true })
  const dv = await dataverseClient()
  const [
    titles,
    intakes,
    diagnostics,
    stages,
    gates,
    artifacts,
    logs,
    contacts,
    leads,
    opportunities,
  ] = await Promise.all([
    dv.list('jm1pub_titles', '$top=500&$orderby=modifiedon desc'),
    dv.list('jm1pub_publishingintakes', '$top=500&$orderby=modifiedon desc'),
    dv.list('jm1pub_editorialdiagnostics', '$top=500&$orderby=modifiedon desc'),
    dv.list('jm1pub_editorialstages', '$top=500&$orderby=modifiedon desc'),
    dv.list('jm1pub_editorialapprovalgates', '$top=500&$orderby=modifiedon desc'),
    dv.list('jm1pub_editorialartifacts', '$top=500&$orderby=modifiedon desc'),
    dv.list('jm1_executionlogs', "$top=500&$orderby=createdon desc&$filter=contains(jm1_actiondescription,'editorial') or contains(jm1_actiontype,'EDITORIAL') or contains(jm1_name,'Editorial')"),
    dv.list('contacts', '$top=500&$orderby=modifiedon desc'),
    dv.list('leads', '$top=500&$orderby=modifiedon desc'),
    dv.list('opportunities', '$top=500&$orderby=modifiedon desc'),
  ])

  const records = []
  const runtimeState = functionRuntimeState()
  const add = (record) => records.push({ ...record, classification_hint: classifyRecord(record) })

  for (const row of titles.rows) {
    add({
      source: 'Dataverse',
      entity_type: 'title',
      record_id: value(row, 'jm1pub_titleid'),
      record_name: value(row, 'jm1pub_titlename', 'jm1pub_name'),
      title: value(row, 'jm1pub_titlename', 'jm1pub_name'),
      author: value(row, 'jm1pub_authorname') || formatted(row, '_jm1pub_authorcontact_value'),
      intake_reference: value(row, 'jm1pub_intakereference', 'jm1pub_publishingintakereference'),
      title_id: value(row, 'jm1pub_titleid'),
      stage_type: formatted(row, 'jm1pub_lifecyclestage') || value(row, 'jm1pub_lifecyclestage'),
      stage_status: formatted(row, 'jm1pub_status') || value(row, 'jm1pub_status'),
      modified_on: value(row, 'modifiedon'),
      created_on: value(row, 'createdon'),
      source_path: '',
    })
  }
  for (const row of intakes.rows) {
    add({
      source: 'Dataverse',
      entity_type: 'intake',
      record_id: value(row, 'jm1pub_publishingintakeid'),
      record_name: value(row, 'jm1pub_name', 'jm1pub_title', 'jm1pub_booktitle'),
      title: value(row, 'jm1pub_booktitle', 'jm1pub_title', 'jm1pub_name'),
      author: value(row, 'jm1pub_authorname') || formatted(row, '_jm1pub_contact_value'),
      intake_reference: value(row, 'jm1pub_intaketrackingid', 'jm1pub_intakereference'),
      title_id: lookup(row, '_jm1pub_title_value'),
      stage_type: 'Publishing Intake',
      stage_status: formatted(row, 'jm1pub_status') || value(row, 'jm1pub_status'),
      modified_on: value(row, 'modifiedon'),
      created_on: value(row, 'createdon'),
      source_path: '',
    })
  }
  for (const row of diagnostics.rows) {
    const sourceAsset = parseManuscriptAssetUrl(value(row, 'jm1_manuscriptasseturl'))
    const sourcePath = value(row, 'jm1_manuscriptasseturl', 'jm1_manuscriptfilename')
    add({
      source: 'Dataverse',
      entity_type: 'editorial_diagnostic',
      record_id: value(row, 'jm1pub_editorialdiagnosticid'),
      record_name: value(row, 'jm1pub_name'),
      title: cleanupTitleName(value(row, 'jm1pub_title')) || sourceAsset.title || cleanupTitleName(value(row, 'jm1pub_name')),
      author: sourceAsset.author || formatted(row, '_jm1pub_authorcontact_value'),
      intake_reference: sourceAsset.intakeReference || value(row, 'jm1pub_intakereferencecode', 'jm1pub_intaketrackingid'),
      title_id: lookup(row, '_jm1pub_title_value'),
      stage_type: 'Stage 0 / Editorial Review',
      stage_status: formatted(row, 'jm1pub_diagnosticstatus') || value(row, 'jm1pub_diagnosticstatus'),
      modified_on: value(row, 'modifiedon'),
      created_on: value(row, 'createdon'),
      source_path: sourcePath,
      summary: value(row, 'jm1pub_diagnosticoutputsummary', 'jm1pub_editorialfitsummary'),
    })
  }
  for (const row of stages.rows) {
    const type = value(row, 'jm1pub_stagetype')
    const status = value(row, 'jm1pub_stagestatus')
    add({
      source: 'Dataverse',
      entity_type: 'editorial_stage',
      record_id: value(row, 'jm1pub_editorialstageid'),
      record_name: value(row, 'jm1pub_name'),
      title: cleanupTitleName(value(row, 'jm1pub_title', 'jm1pub_title_name', 'jm1pub_name')),
      author: value(row, 'jm1pub_author', 'jm1pub_authorname') || formatted(row, '_jm1pub_contactid_value'),
      intake_reference: value(row, 'jm1pub_intakereference', 'jm1pub_publishingintakereference'),
      title_id: lookup(row, '_jm1pub_titleid_value'),
      stage_type: stageLabel(type, formatted(row, 'jm1pub_stagetype') || type),
      stage_status: statusLabel(status, formatted(row, 'jm1pub_stagestatus') || status),
      modified_on: value(row, 'modifiedon'),
      created_on: value(row, 'createdon'),
      source_path: '',
      summary: value(row, 'jm1pub_internaloperationalsummary', 'jm1pub_authorsafesummary'),
    })
  }
  for (const row of gates.rows) {
    add({
      source: 'Dataverse',
      entity_type: 'approval_gate',
      record_id: value(row, 'jm1pub_editorialapprovalgateid'),
      record_name: value(row, 'jm1pub_editorialapprovalgatename', 'jm1pub_name'),
      title: cleanupTitleName(value(row, 'jm1pub_title', 'jm1pub_editorialapprovalgatename', 'jm1pub_name')),
      author: value(row, 'jm1pub_authorname'),
      intake_reference: '',
      title_id: lookup(row, '_jm1pub_titleid_value'),
      stage_type: 'Author Approval Gate',
      stage_status: formatted(row, 'jm1pub_gatestatus') || value(row, 'jm1pub_gatestatus'),
      modified_on: value(row, 'modifiedon'),
      created_on: value(row, 'createdon'),
      source_path: '',
      gate_status: formatted(row, 'jm1pub_gatestatus') || value(row, 'jm1pub_gatestatus'),
      author_decision: formatted(row, 'jm1pub_authordecision') || value(row, 'jm1pub_authordecision'),
      summary: value(row, 'jm1pub_authorresponsesummary', 'jm1pub_authordecisionsource'),
    })
  }
  for (const row of artifacts.rows) {
    add({
      source: 'Dataverse',
      entity_type: 'editorial_artifact',
      record_id: value(row, 'jm1pub_editorialartifactid'),
      record_name: value(row, 'jm1pub_editorialartifactname', 'jm1pub_filename'),
      title: formatted(row, '_jm1pub_titleid_value'),
      author: '',
      intake_reference: '',
      title_id: lookup(row, '_jm1pub_titleid_value'),
      stage_type: formatted(row, 'jm1pub_artifacttype') || value(row, 'jm1pub_artifacttype'),
      stage_status: formatted(row, 'jm1pub_artifactstatus') || value(row, 'jm1pub_artifactstatus'),
      modified_on: value(row, 'modifiedon'),
      created_on: value(row, 'createdon'),
      source_path: value(row, 'jm1pub_repositorypath'),
      artifact_id: value(row, 'jm1pub_editorialartifactid'),
      artifact_name: value(row, 'jm1pub_editorialartifactname', 'jm1pub_filename'),
      artifact_hash: value(row, 'jm1pub_sha256'),
      is_current_approved: row.jm1pub_iscurrentapproved === true,
      summary: value(row, 'jm1pub_notes'),
    })
  }
  for (const row of scanSharePointTitles()) add(row)

  const byTitle = new Map()
  const titleIdGroupKeys = new Map()
  for (const record of records) {
    if (record.entity_type === 'title' && record.title_id) titleIdGroupKeys.set(record.title_id, groupKey(record))
  }
  for (const record of records) {
    const key = record.title_id && titleIdGroupKeys.has(record.title_id)
      ? titleIdGroupKeys.get(record.title_id)
      : groupKey(record)
    appendRecord(byTitle, key, record)
  }

  const titleRows = []
  const realRows = []
  const stateRows = []
  const artifactRows = []
  const approvalRows = []
  const ownerRows = []
  const strandedRows = []
  const testRows = []
  const legacyRows = []
  const reentryRows = []
  const ledgerRows = []
  const jackieRows = []
  const authorRows = []
  const systemRows = []
  const externalRows = []

  for (const record of records) {
    titleRows.push(record)
    if (['TEST', 'CERTIFICATION', 'SYNTHETIC', 'DUPLICATE'].includes(record.classification_hint)) testRows.push(record)
  }

  for (const [key, group] of byTitle) {
    const primary = newest(group) || group[0]
    const classification = groupClassification(group)
    const reentry = computeReentry(group)
    const title = displayTitleForGroup(group, primary, key)
    const author = primary.author || group.find((r) => r.author)?.author || ''
    const intakeRefs = [...new Set(group.map((r) => r.intake_reference).filter(Boolean))].join('; ')
    const paths = [...new Set(group.map((r) => r.source_path).filter(Boolean))].slice(0, 5).join('; ')
    const reason = classification === 'REAL_ACTIVE' ? 'Known real title or live SharePoint/Dataverse editorial evidence' :
      classification === 'RECONCILIATION_REQUIRED' ? 'Record has insufficient evidence for automatic real/test/backlist classification' :
      'Classified from record name/path/status evidence'
    realRows.push({
      canonical_key: key,
      title,
      author,
      classification,
      reason,
      record_count: group.length,
      title_id: primary.title_id || group.find((r) => r.title_id)?.title_id || '',
      intake_refs: intakeRefs,
      sharepoint_paths: paths,
    })
    stateRows.push({
      canonical_key: key,
      title,
      author,
      real_test: classification,
      current_cc010_stage: reentry.currentStage,
      current_status: reentry.currentStatus,
      latest_completed_boundary: reentry.latestCompletedBoundary,
      earliest_unresolved_boundary: reentry.earliestUnresolvedBoundary,
      waiting_on: reentry.waitingOn,
      blocker: reentry.earliestUnresolvedBoundary,
      next_action: reentry.earliestUnresolvedBoundary,
      automation_status: automationStatus(reentry.currentStage, classification),
      mutation_required: reentry.mutationRequired,
    })
    if (reentry.latestArtifact) {
      artifactRows.push({
        canonical_key: key,
        title,
        artifact_id: reentry.latestArtifact.artifact_id || reentry.latestArtifact.record_id,
        artifact_name: reentry.latestArtifact.artifact_name || reentry.latestArtifact.record_name,
        artifact_type: reentry.latestArtifact.stage_type,
        artifact_status: reentry.latestArtifact.stage_status,
        sha256: reentry.latestArtifact.artifact_hash || '',
        repository_path: reentry.latestArtifact.source_path || '',
        current_approved: reentry.latestArtifact.is_current_approved ? 'YES' : 'NO/UNKNOWN',
        provenance: reentry.latestArtifact.summary || 'Dataverse editorial artifact',
      })
    }
    if (reentry.latestGate) {
      approvalRows.push({
        canonical_key: key,
        title,
        gate_id: reentry.latestGate.record_id,
        gate_name: reentry.latestGate.record_name,
        gate_status: reentry.latestGate.gate_status || reentry.latestGate.stage_status,
        author_decision: reentry.latestGate.author_decision,
        decision_summary: reentry.latestGate.summary,
        artifact_specific: reentry.latestGate.record_id ? 'YES - gate linked to specific record evidence' : 'UNKNOWN',
      })
    }
    ownerRows.push({
      canonical_key: key,
      title,
      waiting_on: reentry.waitingOn,
      stage: reentry.currentStage,
      age_basis: primary.modified_on || primary.created_on,
      blocker: reentry.earliestUnresolvedBoundary,
    })
    reentryRows.push({
      canonical_key: key,
      title,
      author,
      proposed_cc010_stage: reentry.currentStage,
      latest_completed_boundary: reentry.latestCompletedBoundary,
      earliest_unresolved_boundary: reentry.earliestUnresolvedBoundary,
      waiting_on: reentry.waitingOn,
      evidence: group.map((r) => `${r.entity_type}:${r.record_id || r.record_name}`).slice(0, 6).join('; '),
      mutation_required: reentry.mutationRequired,
    })
    ledgerRows.push({
      Title: title,
      Prior_Authority: group.map((r) => r.entity_type).filter(Boolean).slice(0, 5).join('; '),
      Prior_State: reentry.currentStatus || reentry.currentStage,
      Canonical_Artifact: reentry.latestArtifact?.artifact_name || reentry.latestArtifact?.record_name || 'Not located',
      Evidence: group.map((r) => r.record_id || r.record_name).filter(Boolean).slice(0, 5).join('; '),
      New_CC010_State: reentry.currentStage,
      Waiting_On: reentry.waitingOn,
      Next_Action: reentry.earliestUnresolvedBoundary,
      Mutation: reentry.mutationRequired,
      Reason: 'Dry-run reconciliation evidence first; no broad mutation in this pass.',
      Execution_Log: 'Not written - dry-run ledger',
    })
    if (classification === 'REAL_ACTIVE' && reentry.waitingOn === 'Jackie') {
      jackieRows.push({ title, stage: reentry.currentStage, exact_decision: reentry.earliestUnresolvedBoundary, why_jackie: reentry.earliestUnresolvedBoundary, artifact_action_link: paths, age: primary.modified_on || '' })
    }
    if (classification === 'REAL_ACTIVE' && reentry.waitingOn === 'Author') {
      authorRows.push({ author, title, stage: reentry.currentStage, requested_action: reentry.earliestUnresolvedBoundary, communication_sent: 'See gate/execution evidence', date: primary.modified_on || '', response_status: reentry.currentStatus })
    }
    if (classification === 'REAL_ACTIVE' && reentry.waitingOn === 'System') {
      systemRows.push({ title, stage: reentry.currentStage, pending_job: reentry.earliestUnresolvedBoundary, retry: 'Per canonical runtime idempotency', blocker: reentry.earliestUnresolvedBoundary, expected_next_attempt: automationStatus(reentry.currentStage, classification) })
    }
    if (classification === 'REAL_ACTIVE' && reentry.waitingOn === 'External') {
      externalRows.push({ title, provider: 'External/Delivery', dependency: reentry.earliestUnresolvedBoundary, since: primary.modified_on || '', retry_escalation_behavior: 'Do not convert to Jackie gate' })
    }
    if (classification === 'REAL_ACTIVE' && reentry.waitingOn === 'None' && reentry.currentStage === 'Unknown') {
      strandedRows.push({ title, stage: reentry.currentStage, reason: 'DATA_RECONCILIATION', why_stopped: 'No definitive current CC-010 stage found', fix: 'Resolve identity/artifact linkage before progression', restarted: 'NO' })
    }
  }

  const priorFive = uniqueByTitle(realRows.filter((row) =>
    row.classification === 'REAL_ACTIVE' &&
    [
      'before you were born',
      'establishing glory the library',
      'the general s will and last testament',
      'the long watch',
      'the intentional leader',
    ].some((name) => normalize(row.title).includes(name)),
  ))
  const waveRows = selectWaveCandidates(stateRows)

  write('01-discovered-title-estate.csv', csv(['source', 'entity_type', 'record_id', 'record_name', 'title', 'author', 'intake_reference', 'title_id', 'stage_type', 'stage_status', 'modified_on', 'classification_hint', 'source_path'], titleRows))
  write('02-real-title-classification.csv', csv(['canonical_key', 'title', 'author', 'classification', 'reason', 'record_count', 'title_id', 'intake_refs', 'sharepoint_paths'], realRows))
  write('03-current-editorial-state.csv', csv(['canonical_key', 'title', 'author', 'real_test', 'current_cc010_stage', 'current_status', 'latest_completed_boundary', 'earliest_unresolved_boundary', 'waiting_on', 'blocker', 'next_action', 'automation_status', 'mutation_required'], stateRows))
  write('04-artifact-authority.csv', csv(['canonical_key', 'title', 'artifact_id', 'artifact_name', 'artifact_type', 'artifact_status', 'sha256', 'repository_path', 'current_approved', 'provenance'], artifactRows))
  write('05-author-approval-state.csv', csv(['canonical_key', 'title', 'gate_id', 'gate_name', 'gate_status', 'author_decision', 'decision_summary', 'artifact_specific'], approvalRows))
  write('06-waiting-owner-analysis.csv', csv(['canonical_key', 'title', 'waiting_on', 'stage', 'age_basis', 'blocker'], ownerRows))
  write('07-stranded-assets.csv', csv(['title', 'stage', 'reason', 'why_stopped', 'fix', 'restarted'], strandedRows))
  write('08-test-certification-isolation.csv', csv(['source', 'entity_type', 'record_id', 'record_name', 'title', 'author', 'classification_hint', 'source_path'], testRows))
  write('09-legacy-paths.csv', csv(['path_or_component', 'classification', 'evidence', 'normal_runtime_disposition'], [
    { path_or_component: 'lib/server/five-title-executive-recovery-dispatch.ts', classification: 'RECOVERY_ONLY', evidence: 'Exact five-title recovery path; not canonical normal CC-010 lifecycle authority.', normal_runtime_disposition: 'Guarded as recovery-only; portfolio guard prevents normal-runtime use as live editorial authority.' },
    { path_or_component: 'azure-functions/diagnostic-ai-runner/src/functions/runIntentionalLeaderAuthorResponse.js', classification: 'RECOVERY_ONLY', evidence: 'Intentional Leader-specific response processor exists.', normal_runtime_disposition: 'Keep historical/recovery only; shared author-response consumer is canonical.' },
    { path_or_component: 'lib/server/author-portal-context.ts', classification: 'SUPERSEDED_IF_NORMAL_RUNTIME', evidence: 'Contains title-specific author workspace state branches.', normal_runtime_disposition: 'Must defer to canonical CC-010/Author Workspace state projection for normal current-state truth.' },
    { path_or_component: 'lib/server/publisher-operating-center.ts', classification: 'CANONICAL_CC010_WITH_REMEDIATION', evidence: 'Current Publisher Operating Center read model; contains title-specific priority/next-action branches to generalize.', normal_runtime_disposition: 'Extend with CC-010 portfolio view and guard.' },
  ]))
  write('10-reentry-plan.csv', csv(['canonical_key', 'title', 'author', 'proposed_cc010_stage', 'latest_completed_boundary', 'earliest_unresolved_boundary', 'waiting_on', 'evidence', 'mutation_required'], reentryRows))
  write('11-reconciliation-ledger.csv', csv(['Title', 'Prior_Authority', 'Prior_State', 'Canonical_Artifact', 'Evidence', 'New_CC010_State', 'Waiting_On', 'Next_Action', 'Mutation', 'Reason', 'Execution_Log'], ledgerRows))
  write('12-jackie-actions.csv', csv(['title', 'stage', 'exact_decision', 'why_jackie', 'artifact_action_link', 'age'], jackieRows))
  write('13-author-actions.csv', csv(['author', 'title', 'stage', 'requested_action', 'communication_sent', 'date', 'response_status'], authorRows))
  write('14-system-work-queue.csv', csv(['title', 'stage', 'pending_job', 'retry', 'blocker', 'expected_next_attempt'], systemRows))
  write('15-external-dependencies.csv', csv(['title', 'provider', 'dependency', 'since', 'retry_escalation_behavior'], externalRows))
  write('16-commissioning-wave-candidates.md', [
    '# 16 - Commissioning Wave Candidates',
    '',
    `Last verified: ${now}`,
    '',
    mdTable(['Wave', 'Candidate', 'Why'], waveRows),
    '',
    'No title was moved or manufactured to create a candidate.',
  ].join('\n'))
  write('17-operating-center-truth.md', operatingCenterTruth({ stateRows, testRows }))
  write('18-shared-capabilities.md', sharedCapabilities())
  write('19-final-portfolio-state.md', finalPortfolioState({ realRows, stateRows, priorFive, strandedRows, testRows, jackieRows, authorRows, systemRows, externalRows, waveRows, runtimeState }))
  write('00-executive-summary.md', executiveSummary({ records, realRows, stateRows, testRows, strandedRows, jackieRows, authorRows, systemRows, externalRows, priorFive, runtimeState }))

  const files = [
    '00-executive-summary.md',
    '01-discovered-title-estate.csv',
    '02-real-title-classification.csv',
    '03-current-editorial-state.csv',
    '04-artifact-authority.csv',
    '05-author-approval-state.csv',
    '06-waiting-owner-analysis.csv',
    '07-stranded-assets.csv',
    '08-test-certification-isolation.csv',
    '09-legacy-paths.csv',
    '10-reentry-plan.csv',
    '11-reconciliation-ledger.csv',
    '12-jackie-actions.csv',
    '13-author-actions.csv',
    '14-system-work-queue.csv',
    '15-external-dependencies.csv',
    '16-commissioning-wave-candidates.md',
    '17-operating-center-truth.md',
    '18-shared-capabilities.md',
    '19-final-portfolio-state.md',
  ]
  write('checksums.sha256', checksumFiles(files))
  console.log(`Generated ${OUT_DIR}`)
}

function selectWaveCandidates(stateRows) {
  const real = stateRows.filter((row) => row.real_test === 'REAL_ACTIVE')
  const find = (stage) => real.find((row) => row.current_cc010_stage.includes(stage))
  const stage0 = real.find((row) => normalize(row.title).includes('indomitable')) || find('Stage 0')
  const developmental = find('Developmental')
  const revision = real.find((row) => normalize(`${row.current_status} ${row.blocker}`).includes('author')) || developmental
  const line = find('Line')
  const copy = find('Copy')
  const proof = find('Proof')
  const handoff = real.find((row) => normalize(row.latest_completed_boundary).includes('proofreading complete') || normalize(row.current_cc010_stage).includes('production'))
  return [
    { Wave: 'Wave 1 - Stage 0', Candidate: stage0?.title || 'None found', Why: stage0 ? 'Live Stage 0 asset with governed source manuscript and Claude route proof.' : 'No Stage 0 candidate found.' },
    { Wave: 'Wave 2 - Developmental', Candidate: developmental?.title || 'None found', Why: developmental ? 'Real Developmental-stage title; use only if its current boundary requires system-owned Developmental work.' : 'No Developmental candidate found.' },
    { Wave: 'Wave 3 - Author Revision', Candidate: revision?.title || 'None found', Why: revision ? 'Real title with author/gate state requiring response or revision-loop handling.' : 'No author revision candidate found.' },
    { Wave: 'Wave 4A - Line', Candidate: line?.title || 'None found', Why: line ? 'Real Line-stage evidence found; do not re-run if already approved/completed.' : 'No Line-ready candidate found.' },
    { Wave: 'Wave 4B - Copy', Candidate: copy?.title || 'None found', Why: copy ? 'Real Copyediting stage evidence found.' : 'No Copy-ready candidate found.' },
    { Wave: 'Wave 4C - Proof', Candidate: proof?.title || 'None found', Why: proof ? 'Real Proofreading stage evidence found.' : 'No Proof-ready candidate found.' },
    { Wave: 'Wave 5 - Production Handoff', Candidate: handoff?.title || 'None found', Why: handoff ? 'Real title at or beyond final editorial/proof boundary; verify no editorial blockers remain.' : 'No production-handoff candidate found.' },
  ]
}

function operatingCenterTruth({ stateRows, testRows }) {
  return [
    '# 17 - Operating Center Truth',
    '',
    `Last verified: ${now}`,
    '',
    'Required default behavior:',
    '',
    '- Real titles only by default.',
    '- Test, certification, synthetic, and duplicate records isolated behind an explicit debug/test toggle.',
    '- One title equals one editorial card.',
    '- Cards show stage, artifact, waiting owner, blocker, next action, automation status, and whether Jackie genuinely needs to act.',
    '- UI must request governed actions from canonical services; no drag/drop or direct status mutation may bypass gate validation.',
    '',
    'Current evidence:',
    '',
    mdTable(['Metric', 'Count'], [
      { Metric: 'Active real title rows in recovery state table', Count: stateRows.filter((row) => row.real_test === 'REAL_ACTIVE').length },
      { Metric: 'Test/certification/synthetic rows isolated', Count: testRows.length },
      { Metric: 'Current Jackie rows from dry-run ledger', Count: stateRows.filter((row) => row.waiting_on === 'Jackie' && row.real_test === 'REAL_ACTIVE').length },
      { Metric: 'Current author rows from dry-run ledger', Count: stateRows.filter((row) => row.waiting_on === 'Author' && row.real_test === 'REAL_ACTIVE').length },
      { Metric: 'Current system rows from dry-run ledger', Count: stateRows.filter((row) => row.waiting_on === 'System' && row.real_test === 'REAL_ACTIVE').length },
    ]),
  ].join('\n')
}

function sharedCapabilities() {
  return [
    '# 18 - Shared Capabilities Consumed by CC-010',
    '',
    `Last verified: ${now}`,
    '',
    mdTable(['Capability', 'Canonical implementation', 'CC-010 disposition'], [
      { Capability: 'Intake handoff', 'Canonical implementation': '/join -> Publishing Intake -> source/manuscript ready -> Stage 0', 'CC-010 disposition': 'Consumes; does not replace /join.' },
      { Capability: 'Artifact storage', 'Canonical implementation': 'Governed JM1-PUB SharePoint title folders plus Dataverse artifact references/checksums', 'CC-010 disposition': 'Consumes; SharePoint remains artifact authority.' },
      { Capability: 'Model routing', 'Canonical implementation': 'governedRouteRegistry + editorialModelRoutingRegistry', 'CC-010 disposition': 'Consumes centralized routing; no per-title provider choice.' },
      { Capability: 'Communication', 'Canonical implementation': 'Publishing dispatch / ACS governed communication services', 'CC-010 disposition': 'Consumes; no CC-010 email fork.' },
      { Capability: 'Author response', 'Canonical implementation': 'authorReviewResponseConsumer / publishing mailbox reader', 'CC-010 disposition': 'Consumes shared response capture and correlation.' },
      { Capability: 'Jackie notification', 'Canonical implementation': 'JACKIE_ACTION_REQUIRED notification model in Publisher Operating Center', 'CC-010 disposition': 'Consumes reusable notification model.' },
      { Capability: 'Author Workspace', 'Canonical implementation': 'Author Operating Center / shared author auth/session', 'CC-010 disposition': 'Consumes; no separate editorial portal.' },
      { Capability: 'Authentication', 'Canonical implementation': 'Durable Author/Publisher auth services', 'CC-010 disposition': 'Consumes shared identity platform.' },
      { Capability: 'Execution logging', 'Canonical implementation': 'jm1_executionlog', 'CC-010 disposition': 'Writes through canonical execution log discipline.' },
      { Capability: 'Public identity', 'Canonical implementation': 'author identity / public attribution resolver', 'CC-010 disposition': 'Consumes; no separate name resolver.' },
      { Capability: 'E-sign', 'Canonical implementation': 'Governed agreement/e-sign lane upstream/downstream of editorial', 'CC-010 disposition': 'Referenced only when relevant; not editorial authority.' },
    ]),
    '',
    '## Current Model Routing Preference',
    '',
    mdTable(['CC-010 phase', 'Preferred provider'], [
      { 'CC-010 phase': 'Stage 0 / Editorial Review', 'Preferred provider': 'Claude via Microsoft Foundry' },
      { 'CC-010 phase': 'Developmental Editing', 'Preferred provider': 'Claude via Microsoft Foundry' },
      { 'CC-010 phase': 'Line Editing', 'Preferred provider': 'Claude via Microsoft Foundry' },
      { 'CC-010 phase': 'Copyediting', 'Preferred provider': 'OpenAI' },
      { 'CC-010 phase': 'Proofreading', 'Preferred provider': 'OpenAI' },
    ]),
  ].join('\n')
}

function finalPortfolioState({ realRows, stateRows, priorFive, strandedRows, testRows, jackieRows, authorRows, systemRows, externalRows, waveRows, runtimeState }) {
  return [
    '# 19 - Final Portfolio State',
    '',
    `Last verified: ${now}`,
    '',
    mdTable(['Metric', 'Count'], [
      { Metric: 'Real unique titles', Count: realRows.filter((row) => row.classification === 'REAL_ACTIVE').length },
      { Metric: 'Active editorial title states', Count: stateRows.filter((row) => row.real_test === 'REAL_ACTIVE').length },
      { Metric: 'Published/backlist classifications', Count: realRows.filter((row) => row.classification === 'REAL_PUBLISHED_BACKLIST').length },
      { Metric: 'Test/certification/synthetic/duplicate isolated rows', Count: testRows.length },
      { Metric: 'Reconciliation required title groups', Count: realRows.filter((row) => row.classification === 'RECONCILIATION_REQUIRED').length },
      { Metric: 'Stranded assets', Count: strandedRows.length },
      { Metric: 'Jackie actions', Count: jackieRows.length },
      { Metric: 'Author actions', Count: authorRows.length },
      { Metric: 'System queue', Count: systemRows.length },
      { Metric: 'External dependencies', Count: externalRows.length },
    ]),
    '',
    '## Prior Five',
    '',
    mdTable(['Title', 'Author', 'Classification'], priorFive.map((row) => ({ Title: row.title, Author: row.author, Classification: row.classification }))),
    '',
    '## Wave Candidates',
    '',
    mdTable(['Wave', 'Candidate', 'Why'], waveRows),
    '',
    '## Runtime Drift',
    '',
    `Function App runtime: ${runtimeState || 'UNKNOWN'}`,
    '',
    normalize(runtimeState) === 'node 22'
      ? 'Node 24 drift state: HOST_ROLLBACK_EXCEPTION_RECORDED. CC-010 recovery preserves the current proven Node 22 host while recording that the repository target remains Node 24 and requires a separately governed upgrade path.'
      : 'Node 24 drift state: See current Function App runtime above; do not infer compatibility without the governed runtime parity check.',
  ].join('\n')
}

function executiveSummary({ records, realRows, stateRows, testRows, strandedRows, jackieRows, authorRows, systemRows, externalRows, priorFive, runtimeState }) {
  return [
    '# CC-010 Editorial Portfolio Recovery Evidence Package',
    '',
    `Last verified: ${now}`,
    '',
    '## Classification',
    '',
    'DRY-RUN COMPLETE - CC-010 EDITORIAL PORTFOLIO RECOVERY EVIDENCE GENERATED',
    '',
    'This package is the required evidence-first pass before broad mutation. It discovers title records from Dataverse and governed Publishing SharePoint sync, classifies real/test/certification/noise, computes proposed CC-010 re-entry states, and records mutation intent. No Dataverse mutation is performed by this generator.',
    '',
    mdTable(['Metric', 'Count'], [
      { Metric: 'Total discovered records', Count: records.length },
      { Metric: 'Real unique active title groups', Count: realRows.filter((row) => row.classification === 'REAL_ACTIVE').length },
      { Metric: 'Active editorial title state rows', Count: stateRows.filter((row) => row.real_test === 'REAL_ACTIVE').length },
      { Metric: 'Published/backlist groups', Count: realRows.filter((row) => row.classification === 'REAL_PUBLISHED_BACKLIST').length },
      { Metric: 'Test/certification/synthetic/duplicate rows isolated', Count: testRows.length },
      { Metric: 'Reconciliation-required groups', Count: realRows.filter((row) => row.classification === 'RECONCILIATION_REQUIRED').length },
      { Metric: 'Stranded assets', Count: strandedRows.length },
      { Metric: 'Jackie actions', Count: jackieRows.length },
      { Metric: 'Author actions', Count: authorRows.length },
      { Metric: 'System-owned queue', Count: systemRows.length },
      { Metric: 'External dependency queue', Count: externalRows.length },
      { Metric: 'Prior five recovered', Count: priorFive.length },
    ]),
    '',
    '## Boundary',
    '',
    '- No title is reset to Stage 0 merely for CC-010 uniformity.',
    '- No author communication is sent.',
    '- No Jackie notification is sent.',
    '- No Dataverse record is patched by this generator.',
    '- Reconciliation remains evidence-first; ambiguous title groups are marked `RECONCILIATION_REQUIRED`.',
    '',
    '## Runtime Drift',
    '',
    `Function App runtime last verified: ${runtimeState || 'UNKNOWN'}`,
    '',
    normalize(runtimeState) === 'node 22'
      ? 'Node 24 drift classification: HOST_ROLLBACK_EXCEPTION_RECORDED. The current production host remains Node 22 because the prior Node 24 host failed during commissioning; this pass records the drift and does not assume Node 22 is the desired end state.'
      : 'Node 24 drift classification: VERIFY_CURRENT_RUNTIME. The runtime did not report NODE|22 during this pass; review the exact value above before authorizing runtime changes.',
  ].join('\n')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
