import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const publisher = readFileSync('lib/server/publisher-operating-center.ts', 'utf8')
const authorContext = readFileSync('lib/server/author-portal-context.ts', 'utf8')
const communicationBrand = readFileSync('lib/server/author-communication-brand.ts', 'utf8')
const runtimeOwnership = readFileSync('scripts/runtime_ownership_model.test.mjs', 'utf8')

const checks = [
  {
    name: 'automation may execute work but must not be the visible waiting owner',
    ok:
      publisher.includes("executionOwner: 'JM1 Automation'") &&
      !publisher.includes("awaiting: 'JM1 Automation'") &&
      !publisher.includes("awaiting: 'System runtime'") &&
      !publisher.includes("businessOwner: 'System'") &&
      runtimeOwnership.includes('active operational waits never assign awaiting ownership to System, JM1 Automation, or Cody'),
  },
  {
    name: 'author workspace does not expose System as current owner',
    ok:
      authorContext.includes("currentOwner?: 'Author' | 'Publisher'") &&
      !authorContext.includes("currentOwner?: 'Author' | 'Publisher' | 'System'") &&
      !authorContext.includes("? 'System'"),
  },
  {
    name: 'completed-stage evidence can remain hidden until author action is available',
    ok:
      authorContext.includes('completedPackages: buildCompletedPackageHistory(row)') &&
      authorContext.includes('const activeArtifacts = authorActionAvailable ? row.artifacts : []') &&
      authorContext.includes("authorAccessState: authorActionAvailable ? ('AVAILABLE' as const) : ('HIDDEN' as const)"),
  },
  {
    name: 'author-facing package communication must use governed brand renderer',
    ok:
      communicationBrand.includes('AUTHOR_COMMUNICATION_BRAND') &&
      communicationBrand.includes('Why you are receiving this') &&
      communicationBrand.includes('What we need from you') &&
      communicationBrand.includes('What happens next') &&
      communicationBrand.includes('AUTHOR_COMMUNICATION_BLOCKED'),
  },
]

const failures = checks.filter((check) => !check.ok)
for (const check of checks) {
  console.log(`${failures.includes(check) ? 'FAIL' : 'PASS'} ${check.name}`)
}
assert.equal(failures.length, 0, failures.map((failure) => failure.name).join('; '))
