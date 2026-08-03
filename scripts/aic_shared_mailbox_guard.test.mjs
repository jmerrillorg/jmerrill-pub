import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import createJiti from 'jiti'

const jiti = createJiti(import.meta.url)
const canon = jiti('../lib/server/aic-shared-mailbox-canon.ts')
const tokens = jiti('../lib/server/jm1-enterprise-design-tokens.ts')
const bootstrap = readFileSync('scripts/jm1_bootstrap.mjs', 'utf8')
const handoff = JSON.parse(readFileSync('docs/operations/active/agape-shared-mailbox-implementation/CURRENT-STATE.json', 'utf8'))

test('AIC mailbox canon excludes legacy .com and locks shared mailbox strategy', () => {
  assert.equal(canon.AIC_SHARED_MAILBOX_CANON.tenant, 'JM1')
  assert.equal(canon.AIC_SHARED_MAILBOX_CANON.primaryDomain, 'agapeic.org')
  assert.equal(canon.AIC_SHARED_MAILBOX_CANON.legacyDomainScope, 'EXCLUDED')
  assert.equal(canon.AIC_SHARED_MAILBOX_CANON.separateTenantMigration, 'NOT_PLANNED')
  assert.equal(canon.AIC_SHARED_MAILBOX_CANON.mailboxStrategy, 'ROLE_BASED_SHARED_MAILBOXES')
  assert.equal(canon.AIC_SHARED_MAILBOX_CANON.directSharedMailboxSignIn, 'PROHIBITED')
})

test('AIC primary shared mailbox and alias registries match approved plan', () => {
  assert.equal(canon.AIC_PRIMARY_SHARED_MAILBOXES.length, 18)
  assert.ok(canon.AIC_PRIMARY_SHARED_MAILBOXES.includes('bishop@agapeic.org'))
  assert.equal(canon.AIC_PRIMARY_SHARED_MAILBOXES.includes('bishopmcintoshspeaks@agapeic.org'), false)
  assert.equal(canon.AIC_PRIMARY_SHARED_MAILBOXES.some((mailbox) => mailbox.endsWith('@agapeic.com')), false)
  assert.deepEqual(canon.AIC_SHARED_MAILBOX_ALIASES.filter((item) => item.required).map((item) => `${item.alias}->${item.target}`), [
    'donate@agapeic.org->giving@agapeic.org',
    'seed@agapeic.org->women@agapeic.org',
  ])
})

test('AIC mailbox validation fails closed on prohibited sender and access patterns', () => {
  assert.equal(canon.validateAicMailboxPlan({ sender: 'info@agapeic.org', ecrOverlay: 'agapeInternationalCathedral' }).ok, true)
  assert.equal(canon.validateAicMailboxPlan({ sender: 'info@agapeic.com' }).blocker, 'AIC_LEGACY_DOMAIN_SELECTED')
  assert.equal(canon.validateAicMailboxPlan({ sender: 'random@agapeic.org' }).blocker, 'AIC_UNAPPROVED_SENDER')
  assert.equal(canon.validateAicMailboxPlan({ sender: 'info@agapeic.org', directSignIn: true }).blocker, 'AIC_SHARED_MAILBOX_DIRECT_SIGNIN')
  assert.equal(canon.validateAicMailboxPlan({ sender: 'info@agapeic.org', delegateAuthorized: false }).blocker, 'AIC_MAILBOX_DELEGATE_NOT_AUTHORIZED')
  assert.equal(canon.validateAicMailboxPlan({ sender: 'info@agapeic.org', ecrOverlay: 'publishing' }).blocker, 'AIC_ECR_OVERLAY_NOT_LOADED')
})

test('Agape ECR overlay uses agapeic.org without public JM1 division language', () => {
  const overlay = tokens.JM1_BRAND_OVERLAYS.agapeInternationalCathedral
  assert.equal(overlay.brandName, 'Agape International Cathedral')
  assert.equal(overlay.primaryDomain, 'agapeic.org')
  assert.equal(overlay.email, 'info@agapeic.org')
  assert.equal(overlay.administrativeEmail, 'office@agapeic.org')
  assert.equal(overlay.website, 'agapeic.org')
  assert.doesNotMatch(overlay.divisionRelationship, /division of j merrill one/i)
})

test('Bootstrap carries AIC authority and fails closed while domain is unverified', () => {
  for (const code of [
    'AIC_UNAPPROVED_SENDER',
    'AIC_LEGACY_DOMAIN_SELECTED',
    'AIC_SHARED_MAILBOX_DIRECT_SIGNIN',
    'AIC_MAILBOX_DELEGATE_NOT_AUTHORIZED',
    'AIC_ECR_OVERLAY_NOT_LOADED',
  ]) {
    assert.match(bootstrap, new RegExp(code))
  }
  const result = spawnSync(
    'npm',
    ['run', 'jm1-bootstrap', '--', '--initiative', 'Agape Shared Mailbox Implementation', '--mode', 'production-mutation'],
    { encoding: 'utf8' },
  )
  const output = `${result.stdout}\n${result.stderr}`
  assert.equal(result.status, 1)
  assert.match(output, /BOOTSTRAP FAIL/)
  assert.match(output, /BRAND: Agape International Cathedral/)
  assert.match(output, /TENANT: JM1/)
  assert.match(output, /PRIMARY_DOMAIN: agapeic\.org/)
})

test('AIC active handoff records read-only stop condition', () => {
  assert.equal(handoff.domainAuthority.azureDnsAuthority, 'CONFIRMED_READ_ONLY')
  assert.equal(handoff.domainAuthority.microsoft365DomainPresent, false)
  assert.equal(handoff.domainAuthority.microsoft365DomainVerified, false)
  assert.equal(handoff.domainAuthority.exchangeServicesConfigured, false)
  assert.equal(handoff.mailboxAuthority.primarySharedMailboxesCreated, 0)
  assert.ok(handoff.currentBlockers.includes('AIC_DOMAIN_NOT_PRESENT_IN_M365'))
})
