#!/usr/bin/env node
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'

const registerPath = new URL('../data/repository-authority/pr-dependency-register.json', import.meta.url)
const register = JSON.parse(readFileSync(registerPath, 'utf8'))
const now = new Date()

const openPrs = readOpenPrs()
const problems = []
const activeByAuthority = new Map()

for (const pr of openPrs) {
  const record = register.pullRequests.find((entry) => Number(entry.pr) === Number(pr.number))
  if (!record) {
    problems.push(`PR #${pr.number}: open PR is missing from dependency register`)
    continue
  }
  const updatedDays = ageDays(pr.updatedAt)
  const openDays = ageDays(pr.createdAt)
  if (openDays > register.rules.staleOpenDays) problems.push(`PR #${pr.number}: open for ${openDays.toFixed(1)} days`)
  if (updatedDays > register.rules.staleNoUpdateDays) problems.push(`PR #${pr.number}: no update for ${updatedDays.toFixed(1)} days`)
  if (record.disposition === 'MERGED') problems.push(`PR #${pr.number}: register says merged but PR is open`)
  if (
    record.classification !== 'ADMINISTRATIVE_EXCEPTION_RETAIN' &&
    /Static Web Apps|SWA preview|azure-static-web-apps/i.test(`${pr.title}\n${pr.body || ''}`)
  ) {
    problems.push(`PR #${pr.number}: references retired Publishing SWA authority`)
  }
  if (!record.currentOwner) problems.push(`PR #${pr.number}: no named owner`)
  if (!record.decisionDeadline) problems.push(`PR #${pr.number}: no decision deadline`)
  const authorityKey = record.classification === 'ADMINISTRATIVE_EXCEPTION_RETAIN' ? `admin:${record.pr}` : record.supersedes?.join(',') || pr.title
  if (activeByAuthority.has(authorityKey)) {
    problems.push(`PR #${pr.number}: duplicate authority with PR #${activeByAuthority.get(authorityKey)}`)
  }
  activeByAuthority.set(authorityKey, pr.number)
}

const implementationOpen = openPrs.filter((pr) => {
  const record = register.pullRequests.find((entry) => Number(entry.pr) === Number(pr.number))
  return record && record.evidenceOnly !== true && record.classification !== 'ADMINISTRATIVE_EXCEPTION_RETAIN'
})

if (implementationOpen.length > register.routineImplementationPrLimit) {
  problems.push(`Open implementation PR count ${implementationOpen.length} exceeds limit ${register.routineImplementationPrLimit}`)
}

if (problems.length) {
  console.log('STALE_PR_AUTHORITY_GUARD: FAIL')
  for (const problem of problems) console.log(`- ${problem}`)
  process.exit(1)
}

console.log('STALE_PR_AUTHORITY_GUARD: PASS')
console.log(`Open PRs: ${openPrs.length}`)
console.log(`Open implementation PRs: ${implementationOpen.length}`)

function readOpenPrs() {
  try {
    const output = execFileSync(
      'gh',
      [
        'pr',
        'list',
        '--state',
        'open',
        '--limit',
        '200',
        '--json',
        'number,title,body,createdAt,updatedAt,isDraft,mergeable,headRefOid',
      ],
      { encoding: 'utf8' },
    )
    return JSON.parse(output)
  } catch (error) {
    console.log('STALE_PR_AUTHORITY_GUARD: NO_GITHUB_CONTEXT')
    console.log(error.message)
    return []
  }
}

function ageDays(value) {
  const then = new Date(value)
  if (Number.isNaN(then.getTime())) return 0
  return (now.getTime() - then.getTime()) / 86_400_000
}
