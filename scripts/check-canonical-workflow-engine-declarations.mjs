import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'

const ENGINE_SENSITIVE_PATHS = [
  /^app\/api\//,
  /^app\/author\//,
  /^app\/publisher\//,
  /^components\//,
  /^lib\/server\//,
  /^azure-functions\/diagnostic-ai-runner\/src\//,
]

const STAGE_OR_WORKFLOW_PATTERN =
  /\b(Developmental|Line Editing|Copyediting|Proofreading|Interior Layout|Cover Design|Production Proof|author[- ]review|Author Review|package|notification|gate activation|Publisher Today|Current Activity|Next Step|author action)\b/i

const ALLOWED_ENGINES = new Set([
  'Stage Transition Engine',
  'Notification Engine',
  'Package Engine',
  'Workspace Rendering Engine',
  'Publisher Today Rendering Engine',
  'Cadence Engine',
  'Marketing Engine',
  'Production Engine',
  'Distribution Engine',
  'Royalty Engine',
  'Communications Engine',
  'Identity & Access Engine',
  'Inbound Communications Engine',
])

function changedFiles() {
  const base = process.env.CANONICAL_ENGINE_GUARD_BASE || 'origin/main'
  const diffArgs = ['diff', '--name-only', `${base}...HEAD`]
  const tracked = execFileSync('git', diffArgs, { encoding: 'utf8' })
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
  const untracked = execFileSync('git', ['ls-files', '--others', '--exclude-standard'], { encoding: 'utf8' })
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
  return Array.from(new Set([...tracked, ...untracked]))
}

function isSensitive(path) {
  return ENGINE_SENSITIVE_PATHS.some((pattern) => pattern.test(path))
}

function declaration(content) {
  const engine = content.match(/Engine:\s*([^\n\r]+)/i)?.[1]?.trim()
  const reusable = content.match(/Reusable\?\s*(Y|N)/i)?.[1]?.toUpperCase()
  const exception = content.match(/Stage-specific exception\?\s*(Y|N)/i)?.[1]?.toUpperCase()
  return { engine, reusable, exception }
}

const failures = []

for (const path of changedFiles()) {
  if (!isSensitive(path)) continue
  if (!/\.(ts|tsx|js|mjs|jsx)$/.test(path)) continue

  const content = readFileSync(path, 'utf8')
  if (!STAGE_OR_WORKFLOW_PATTERN.test(content)) continue

  const meta = declaration(content)
  if (!meta.engine || !ALLOWED_ENGINES.has(meta.engine)) {
    failures.push(`${path}: missing valid "Engine:" declaration`)
  }
  if (!meta.reusable) failures.push(`${path}: missing "Reusable? Y/N" declaration`)
  if (!meta.exception) failures.push(`${path}: missing "Stage-specific exception? Y/N" declaration`)
  if (meta.exception === 'Y' && !/Approved exception:/i.test(content)) {
    failures.push(`${path}: stage-specific exception requires "Approved exception:" rationale`)
  }
}

if (failures.length) {
  console.error('Canonical workflow engine declaration guard failed:')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log('Canonical workflow engine declaration guard passed.')
