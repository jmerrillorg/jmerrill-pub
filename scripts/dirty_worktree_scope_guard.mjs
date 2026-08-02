#!/usr/bin/env node

import { execFileSync } from 'node:child_process'

const args = process.argv.slice(2)
const scopesArg = valueFor('--scope') || valueFor('--scopes') || process.env.JM1_INITIATIVE_SCOPE || ''
const allowedScopes = scopesArg
  .split(',')
  .map((scope) => normalizePath(scope))
  .filter(Boolean)

const status = execFileSync('git', ['status', '--porcelain=v1'], { encoding: 'utf8' })
  .split('\n')
  .map((line) => line.trimEnd())
  .filter(Boolean)

if (status.length === 0) {
  console.log('DIRTY_WORKTREE_SCOPE_GUARD PASS: worktree clean.')
  process.exit(0)
}

if (allowedScopes.length === 0) {
  console.error('DIRTY_WORKTREE_UNRELATED_CHANGES')
  console.error('Changed files exist, but no initiative scope was declared.')
  console.error('Declare comma-separated scopes with --scope path/to/dir,path/to/file or JM1_INITIATIVE_SCOPE.')
  process.exit(1)
}

const changed = status.map(parseStatusLine)
const unrelated = changed.filter((entry) => !allowedScopes.some((scope) => isWithinScope(entry.path, scope)))

if (unrelated.length > 0) {
  console.error('DIRTY_WORKTREE_UNRELATED_CHANGES')
  console.error(`Allowed scopes: ${allowedScopes.join(', ')}`)
  for (const entry of unrelated) {
    console.error(`${entry.state} ${entry.path}`)
  }
  process.exit(1)
}

console.log(`DIRTY_WORKTREE_SCOPE_GUARD PASS: ${changed.length} changed file(s) limited to declared scope.`)

function valueFor(flag) {
  const index = args.indexOf(flag)
  if (index === -1) return ''
  return args[index + 1] || ''
}

function parseStatusLine(line) {
  const state = line.slice(0, 2)
  const rawPath = line.slice(3)
  const renamed = rawPath.includes(' -> ') ? rawPath.split(' -> ').at(-1) || rawPath : rawPath
  return { state, path: normalizePath(renamed) }
}

function normalizePath(path) {
  return path.trim().replace(/^\.\/+/, '').replace(/\/+$/, '')
}

function isWithinScope(path, scope) {
  return path === scope || path.startsWith(`${scope}/`)
}
