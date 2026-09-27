import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { resolve, relative } from 'node:path'

const root = process.cwd()
function files(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    if (['node_modules', 'test', 'generated'].includes(entry.name)) return []
    const path = resolve(directory, entry.name)
    return entry.isDirectory() ? files(path) : /\.(?:ts|js)$/.test(entry.name) ? [path] : []
  })
}
test('production ACS transport has one completed-receipt implementation', () => {
  const paths = ['app', 'lib', 'azure-functions'].flatMap(path => files(resolve(root, path)))
  const senders = paths.filter(path => /\.beginSend\s*\(/.test(readFileSync(path, 'utf8'))).map(path => relative(root, path))
  assert.deepEqual(senders, ['azure-functions/acs-email-relay/src/provider/acsCompletion.js'])
})
test('raw Graph/Resend form notifications remain internal-only', () => {
  const source = readFileSync(resolve(root, 'lib/server/form-integrations.ts'), 'utf8')
  assert.ok(source.includes('INTERNAL_FORM_NOTIFICATION_RECIPIENT_DENIED'))
})
