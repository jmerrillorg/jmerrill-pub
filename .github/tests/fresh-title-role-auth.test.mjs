import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const workflow = readFileSync(new URL('../workflows/publishing-fresh-title-role-deploy.yml', import.meta.url), 'utf8')
const auth = workflow.split('\n      - name: Authenticate with GitHub OIDC\n')[1]?.split('\n      - name: ')[0]
const profileName = auth?.match(/--name\s+([^\\\s]+)/)?.[1]

test('fresh-title production auth uses a PAC-compatible profile name and GitHub federation', () => {
  assert.ok(auth)
  assert.ok(profileName)
  assert.ok(profileName.length > 0 && profileName.length <= 30)
  assert.match(auth, /--githubFederated/)
  assert.match(auth, /--applicationId "\$PAC_APPLICATION_ID"/)
  assert.match(auth, /--tenant "\$PAC_TENANT_ID"/)
  assert.doesNotMatch(auth, /--clientSecret|--certificateDiskPath/)
})
