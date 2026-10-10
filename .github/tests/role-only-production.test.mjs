import {test} from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
const workflow=readFileSync(new URL('../workflows/publishing-fresh-title-role-deploy.yml',import.meta.url),'utf8')
const guard=readFileSync(new URL('../../powerplatform/deployment/verify-role-only-production.mjs',import.meta.url),'utf8')
test('only dedicated reviewed package is imported',()=>{
 assert.match(workflow,/1bc8f785288345c6f3d7b3289c51971aa6e5c3c812c270edd42d31c011686a19/)
 assert.doesNotMatch(workflow,/14fc42c5|publish-changes.*Phase6|PREVIOUS_SOLUTION_VERSION/)
 assert.equal((workflow.match(/solution import/g)??[]).length,1)
})
test('protected exact-main binding remains before authentication',()=>{
 assert.match(workflow,/environment: jm1-power-platform-production/)
 assert.ok(workflow.indexOf('verify-fresh-title-release-binding.mjs')<workflow.indexOf('Authenticate with GitHub OIDC'))
})
test('native acceptance and effective scope are enforced',()=>{
 assert.match(guard,/accepted.status !== 'PASS'/)
 assert.match(guard,/r.Depth!=='Local'/)
 assert.match(guard,/NATIVE_IMPORT_EXCLUSION_UNPROVEN/)
})
test('existing role and assignments have exact before-after parity',()=>{
 assert.match(guard,/rights.length !== 45/)
 assert.match(guard,/JSON.stringify\(proof.before\)!==JSON.stringify\(proof.after\)/)
 assert.doesNotMatch(guard,/method:.*(POST|PATCH|DELETE)/)
})
test('production never runs sandbox or title work',()=>{
 assert.doesNotMatch(workflow,/fixture_base64|fresh-role-create-acceptance|title-commissioning.*execute/)
 assert.match(workflow,/cancel-in-progress: false/)
 assert.match(workflow,/if: always\(\)/)
})
