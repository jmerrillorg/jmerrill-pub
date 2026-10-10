import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { verifyFreshTitleReleaseBinding } from './fresh-title-release-binding.mjs'

const packagePath = resolve(process.env.PACKAGE_PATH ?? '')
const actualPackageSha256 = createHash('sha256').update(readFileSync(packagePath)).digest('hex')
const checkoutSha = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim()
const result = verifyFreshTitleReleaseBinding({
  approvedSourceSha: process.env.APPROVED_SOURCE_SHA,
  runSha: process.env.RUN_SHA,
  workflowSha: process.env.WORKFLOW_SHA,
  checkoutSha,
  runRef: process.env.RUN_REF,
  expectedRef: process.env.EXPECTED_RELEASE_REF,
  packageSha256: actualPackageSha256,
  expectedPackageSha256: process.env.PACKAGE_SHA256,
})

if (!result.allowed) {
  console.error(`RELEASE_BINDING_DENIED ${result.problems.join(',')}`)
  process.exit(1)
}

console.log(`RELEASE_BINDING_PASS source=${checkoutSha} package=${actualPackageSha256}`)
