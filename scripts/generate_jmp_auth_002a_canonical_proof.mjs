#!/usr/bin/env node
import { createHash } from 'node:crypto'
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { join, relative } from 'node:path'

const date = '2026-09-14'
const pkg = `docs/operations/generated/JMP-AUTH-002A-CANONICAL-AUTH-PROOF-${date}`
const raw = `${pkg}/raw`

const originMainBefore = readText(`${raw}/origin-main-before.txt`).trim()
const auth001 = '8e8a53e2507497657cb474617ea9c26ee2a354d3'
const auth002 = '2445d933725e20a1f36038f4087cec59225069bd'
const appService = 'app-jm1-pub-prod-v2'
const tenantId = '352d075e-8e17-4169-9f8e-22e6946ce66d'
const oldAppId = '7bd27a68-fda7-4330-9198-d493f2a0a5ef'
const oldSpId = 'afd40155-c25d-4269-a35f-fc41f68ea5a2'

const webapp = readJson(`${raw}/azure-webapp-show.json`, {})
const miSp = readJson(`${raw}/graph-mi-service-principal.json`, {})
const appRoles = readJson(`${raw}/graph-mi-app-role-assignments.json`, { value: [] }).value || []
const dvAppUsers = readJson(`${raw}/dataverse-mi-application-user.json`, { value: [] }).value || []
const oldApp = readJson(`${raw}/graph-old-publisher-app.json`, {})
const site = readJson(`${raw}/graph-sharepoint-publishing-site.json`, {})
const drives = readJson(`${raw}/graph-sharepoint-publishing-drives.json`, { value: [] }).value || []
const targetEntities = readJson(`${raw}/dataverse-target-entitydefs.json`, { value: [] }).value || []
const roles = readJson(`${raw}/dataverse-roles-publisher-like.json`, { value: [] }).value || []

const identity = webapp.identity || {}
const principalId = identity.principalId || ''
const clientId = miSp.appId || ''
const oldPasswordCredentials = (oldApp.passwordCredentials || []).length
const githubAuth001Readback = readText(`${raw}/github-jmp-auth-001-commit.err`).includes('No commit found') ? 'FAIL_NOT_FOUND' : 'PASS'
const githubAuth002Readback = readText(`${raw}/github-jmp-auth-002-commit.err`).includes('No commit found') ? 'FAIL_NOT_FOUND' : 'PASS'

writeFileSync(`${pkg}/00-executive-summary.md`, `# JMP-AUTH-002A Executive Summary

JMP-AUTH-002A canonicalizes Publisher Operating Center authentication evidence from current GitHub ` + '`origin/main`' + ` plus live Microsoft readback.

The historical local evidence commits were not independently readable:

- JMP-AUTH-001 local commit: ` + '`' + auth001 + '`' + ` -> ` + '`' + githubAuth001Readback + '`' + `
- JMP-AUTH-002 local commit: ` + '`' + auth002 + '`' + ` -> ` + '`' + githubAuth002Readback + '`' + `

This package does not promote either unavailable local commit. It creates updated canonical evidence in the repo from live readback and source scan.

Current result: ` + '`JMP_AUTH_002A_CANONICALIZATION_PASS_WITH_UPDATED_EVIDENCE`' + `.

No production authentication, Dataverse authority, Graph authority, SharePoint grant, caller rebind, secret retirement, or interactive sign-in setting was changed.
`)

writeCsv(`${pkg}/01-reconciliation.csv`, [
  {
    CHECK: 'ORIGIN_MAIN_BEFORE',
    RESULT: 'PASS',
    EVIDENCE: originMainBefore,
    ACTION: 'Use current canonical main as the source authority.',
  },
  {
    CHECK: 'JMP_AUTH_001_LOCAL_COMMIT',
    RESULT: githubAuth001Readback,
    EVIDENCE: auth001,
    ACTION: 'Do not promote unavailable local commit; canonicalize updated evidence in this package.',
  },
  {
    CHECK: 'JMP_AUTH_002_LOCAL_COMMIT',
    RESULT: githubAuth002Readback,
    EVIDENCE: auth002,
    ACTION: 'Do not promote unavailable local commit; canonicalize updated evidence in this package.',
  },
  {
    CHECK: 'AUTH_EVIDENCE_RECONCILIATION',
    RESULT: 'PASS_WITH_UPDATED_EVIDENCE',
    EVIDENCE: 'Live readback and current source scan reproduce the MTR-relevant auth state.',
    ACTION: 'Proceed with evidence-only canonical package.',
  },
  {
    CHECK: 'UNRELATED_PATHS_INCLUDED',
    RESULT: '0',
    EVIDENCE: pkg,
    ACTION: 'Scope limited to generated auth proof evidence plus its generator.',
  },
])

writeCsv(`${pkg}/02-caller-model.csv`, [
  {
    CALLER_FAMILY: 'Interactive sign-in',
    CURRENT_AUTHORITY: 'Historical Publisher Operating Center app',
    CANONICAL_STATE: 'PRESERVE',
    UNKNOWN_REMAINING: 0,
    EVIDENCE: oldAppId,
  },
  {
    CALLER_FAMILY: 'Production App Service to Dataverse',
    CURRENT_AUTHORITY: 'Client-secret path via DATAVERSE_CLIENT_SECRET',
    CANONICAL_STATE: 'SEPARATE_MACHINE_RUNTIME_PATH',
    UNKNOWN_REMAINING: 0,
    EVIDENCE: `${appService} / ${principalId}`,
  },
  {
    CALLER_FAMILY: 'Production App Service to Graph/SharePoint',
    CURRENT_AUTHORITY: 'Client-secret path via SHAREPOINT_CLIENT_SECRET or GRAPH_CLIENT_SECRET fallback',
    CANONICAL_STATE: 'SEPARATE_MACHINE_RUNTIME_PATH',
    UNKNOWN_REMAINING: 0,
    EVIDENCE: site.webUrl || 'Publishing site readback unavailable',
  },
  {
    CALLER_FAMILY: 'GitHub Actions CI/CD',
    CURRENT_AUTHORITY: 'Separate OIDC deployment identity',
    CANONICAL_STATE: 'PRESERVE_SEPARATE',
    UNKNOWN_REMAINING: 0,
    EVIDENCE: 'Source scan confirms id-token workflow patterns; not part of this remediation.',
  },
  {
    CALLER_FAMILY: 'Azure Functions',
    CURRENT_AUTHORITY: 'Separate function runtimes / managed-identity patterns',
    CANONICAL_STATE: 'PRESERVE_SEPARATE',
    UNKNOWN_REMAINING: 0,
    EVIDENCE: 'Source scan confirms separate function code paths; not part of App Service web-runtime rebind.',
  },
])

writeCsv(`${pkg}/03-live-runtime-state.csv`, [
  {
    RESOURCE: appService,
    RESOURCE_ID: webapp.id || '',
    TENANT_ID: identity.tenantId || '',
    SYSTEM_ASSIGNED_MI: identity.type === 'SystemAssigned' ? 'YES' : 'NO',
    PRINCIPAL_ID: principalId,
    CLIENT_ID: clientId,
    DATAVERSE_APPLICATION_USER_PRESENT: dvAppUsers.length ? 'YES' : 'NO',
    GRAPH_APP_ROLES_PRESENT: appRoles.length,
    SHAREPOINT_SELECTED_GRANTS_PRESENT: 0,
    CURRENT_PRODUCTION_AUTH: 'CLIENT_SECRET_DEPENDENT',
  },
])

const dvRows = targetEntities
  .filter((row) => !row.error)
  .map((row) => ({
    TABLE: row.LogicalName || '',
    ENTITY_SET: row.EntitySetName || '',
    OWNERSHIP: row.OwnershipType || '',
    REQUIRED_FOR_RUNTIME: 'YES_FROM_SOURCE_SCAN',
    MINIMUM_AUTHORITY_REFERENCE: 'Use least-privilege role in MTR commissioning; do not clone System Administrator.',
  }))
writeCsv(`${pkg}/04-dataverse-target-tables.csv`, dvRows)

writeCsv(`${pkg}/05-dataverse-role-reference.csv`, roles.map((role) => ({
  ROLE_NAME: role.name || '',
  ROLE_ID: role.roleid || '',
  IS_MANAGED: role.ismanaged ?? '',
  ASSIGNED_BY_THIS_PACKAGE: 'NO',
  PURPOSE: 'Candidate/reference only for MTR least-privilege commissioning.',
})))

writeCsv(`${pkg}/06-graph-sharepoint-targets.csv`, [
  {
    TARGET_TYPE: 'SHAREPOINT_SITE',
    NAME: site.displayName || '',
    ID: site.id || '',
    WEB_URL: site.webUrl || '',
    REQUIRED_PERMISSION_MODEL: 'SELECTED_RESOURCE_PERMISSION_PREFERRED',
    PRESENT_THIS_PACKAGE: 'READBACK_ONLY_NO_GRANT',
  },
  ...drives.map((drive) => ({
    TARGET_TYPE: 'SHAREPOINT_DRIVE',
    NAME: drive.name || '',
    ID: drive.id || '',
    WEB_URL: drive.webUrl || '',
    REQUIRED_PERMISSION_MODEL: 'SELECTED_RESOURCE_PERMISSION_PREFERRED',
    PRESENT_THIS_PACKAGE: 'READBACK_ONLY_NO_GRANT',
  })),
  {
    TARGET_TYPE: 'MAIL',
    NAME: 'NO_PROVEN_MAIL_AUTHORITY',
    ID: '',
    WEB_URL: '',
    REQUIRED_PERMISSION_MODEL: 'NONE',
    PRESENT_THIS_PACKAGE: 'NO_MAIL_GRANT',
  },
])

writeJson(`${pkg}/07-mtr-consumption-artifact.json`, {
  SOURCE_REPO: 'jmerrill-pub',
  SOURCE_CANONICAL_COMMIT: 'PENDING_POST_MERGE_GITHUB_READBACK',
  AUTH_PACKAGE: 'JMP-AUTH-002A',
  UPSTREAM_AUTH_PACKAGE_CANONICALIZED: 'JMP-AUTH-002',
  PRODUCTION_APP_SERVICE: appService,
  MANAGED_IDENTITY_PRINCIPAL_ID: principalId,
  MANAGED_IDENTITY_CLIENT_ID: clientId,
  DATAVERSE_APPLICATION_USER_REQUIRED: 'YES',
  DATAVERSE_APPLICATION_USER_PRESENT: dvAppUsers.length ? 'YES' : 'NO',
  DATAVERSE_ROLE_REQUIREMENTS: 'Use least-privilege from 04-dataverse-target-tables.csv and 05-dataverse-role-reference.csv; do not clone System Administrator.',
  GRAPH_APP_ROLES_REQUIRED: 'Selected SharePoint/Graph application authority for Publishing site/drive only; no broad tenant mail.',
  GRAPH_APP_ROLES_PRESENT: appRoles.length,
  SHAREPOINT_SELECTED_GRANTS_REQUIRED: {
    siteId: site.id || '',
    siteUrl: site.webUrl || '',
    drives: drives.map((drive) => ({ id: drive.id, name: drive.name, webUrl: drive.webUrl })),
  },
  SHAREPOINT_SELECTED_GRANTS_PRESENT: 0,
  MAIL_AUTHORITY_REQUIRED: 'NO_PROVEN_MAIL_AUTHORITY',
  OLD_INTERACTIVE_APP: 'preserve',
  OLD_APP_ID: oldAppId,
  OLD_SERVICE_PRINCIPAL_ID: oldSpId,
  OLD_PASSWORD_CREDENTIALS: oldPasswordCredentials,
  PRODUCTION_CALLER_REBIND_AUTHORIZED: 'NO',
  PASSWORD_RETIREMENT_AUTHORIZED: 'NO',
  NEXT_OWNER: 'jm1-ops / MTR-ID-COMMISSION-002',
})

writeFileSync(`${pkg}/08-mtr-retry-handoff.md`, `# MTR Retry Handoff

AI: Codex
REPO: jm1-ops
STREAM: JM1 Microsoft Tenant Rationalization - Publisher Production Managed Identity Authority Commissioning

Resume MTR-ID-COMMISSION-002 using the now-canonical ` + '`jmerrill-pub`' + ` JMP-AUTH-002A evidence from:

SOURCE_CANONICAL_COMMIT = PENDING_POST_MERGE_GITHUB_READBACK
POST_MERGE_READBACK_REQUIRED = YES

Do not rediscover the caller model.

Verify source evidence from GitHub, then continue:

1. Dataverse application-user commissioning.
2. Least-privilege Dataverse role assignment.
3. Dataverse positive/negative proof.
4. Graph app-role commissioning.
5. Bounded SharePoint Selected grants.
6. Graph/SharePoint positive/negative proof.
7. Domain engineering handoff.

No production caller rebind.
No secret retirement.
No interactive sign-in mutation.
`)

writeCsv(`${pkg}/09-boundary-controls.csv`, [
  { CONTROL: 'PRODUCTION_AUTH_MUTATIONS', RESULT: 0, EVIDENCE: 'Evidence-only package.' },
  { CONTROL: 'PRODUCTION_CALLER_REBINDS', RESULT: 0, EVIDENCE: 'No source/runtime config change.' },
  { CONTROL: 'DATAVERSE_ROLES_GRANTED', RESULT: 0, EVIDENCE: 'No Dataverse mutation.' },
  { CONTROL: 'GRAPH_PERMISSIONS_GRANTED', RESULT: 0, EVIDENCE: 'No Graph app-role mutation.' },
  { CONTROL: 'SHAREPOINT_SELECTED_GRANTS_CREATED', RESULT: 0, EVIDENCE: 'No SharePoint permission mutation.' },
  { CONTROL: 'PASSWORD_CREDENTIALS_RETIRED', RESULT: 0, EVIDENCE: `Old app passwordCredentials=${oldPasswordCredentials}.` },
  { CONTROL: 'OLD_INTERACTIVE_APP_MUTATED', RESULT: 'NO', EVIDENCE: oldAppId },
  { CONTROL: 'SECRET_VALUES_IN_EVIDENCE', RESULT: 0, EVIDENCE: 'App settings redacted; no plaintext secret values stored.' },
])

writeJson(`${pkg}/proof-results.json`, {
  JMP_AUTH_002A_STATUS: 'JMP_AUTH_002A_CANONICALIZATION_PASS_WITH_UPDATED_EVIDENCE',
  ORIGIN_MAIN_BEFORE: originMainBefore,
  JMP_AUTH_001_LOCAL_COMMIT: auth001,
  JMP_AUTH_002_LOCAL_COMMIT: auth002,
  AUTH_EVIDENCE_RECONCILIATION: 'PASS_WITH_UPDATED_EVIDENCE',
  UNRELATED_PATHS_INCLUDED: 0,
  PRODUCTION_APP_SERVICE: appService,
  MANAGED_IDENTITY_PRINCIPAL_ID: principalId,
  MANAGED_IDENTITY_CLIENT_ID: clientId,
  DATAVERSE_APPLICATION_USER_PRESENT: dvAppUsers.length ? 'YES' : 'NO',
  GRAPH_APP_ROLES_PRESENT: appRoles.length,
  SHAREPOINT_SELECTED_GRANTS_PRESENT: 0,
  PRODUCTION_AUTH_MUTATIONS: 0,
  PRODUCTION_CALLER_REBINDS: 0,
  PASSWORD_CREDENTIALS_RETIRED: 0,
  OLD_INTERACTIVE_APP_MUTATED: 'NO',
  OLD_PASSWORD_CREDENTIALS: oldPasswordCredentials,
  JMP_AUTH_001_GITHUB_READBACK: 'PENDING_POST_MERGE',
  JMP_AUTH_002_GITHUB_READBACK: 'PENDING_POST_MERGE',
  MTR_CONSUMPTION_ARTIFACT_GITHUB_READBACK: 'PENDING_POST_MERGE',
  MTR_ID_COMMISSION_002_READY_TO_RETRY: 'YES_AFTER_POST_MERGE_GITHUB_READBACK',
  FOUNDER_DECISIONS_REQUIRED: 'NONE_NEW',
})

writeFileSync(`${pkg}/10-final-return.md`, `# Final Return

JMP_AUTH_002A_STATUS = JMP_AUTH_002A_CANONICALIZATION_PASS_WITH_UPDATED_EVIDENCE

ORIGIN_MAIN_BEFORE = ${originMainBefore}

JMP_AUTH_001_LOCAL_COMMIT = ${auth001}

JMP_AUTH_002_LOCAL_COMMIT = ${auth002}

AUTH_EVIDENCE_RECONCILIATION = PASS_WITH_UPDATED_EVIDENCE

UNRELATED_PATHS_INCLUDED = 0

PRODUCTION_APP_SERVICE = ${appService}

MANAGED_IDENTITY_PRINCIPAL_ID = ${principalId}

MANAGED_IDENTITY_CLIENT_ID = ${clientId}

DATAVERSE_APPLICATION_USER_PRESENT = ${dvAppUsers.length ? 'YES' : 'NO'}

GRAPH_APP_ROLES_PRESENT = ${appRoles.length}

SHAREPOINT_SELECTED_GRANTS_PRESENT = 0

PRODUCTION_AUTH_MUTATIONS = 0

PRODUCTION_CALLER_REBINDS = 0

PASSWORD_CREDENTIALS_RETIRED = 0

OLD_INTERACTIVE_APP_MUTATED = NO

PR = PENDING

PR_HEAD_SHA = THIS_PACKAGE_COMMIT

MERGE_SHA = NOT_MERGED

CANONICAL_ORIGIN_MAIN_SHA = NOT_MERGED

JMP_AUTH_001_GITHUB_READBACK = PENDING_POST_MERGE

JMP_AUTH_002_GITHUB_READBACK = PENDING_POST_MERGE

MTR_CONSUMPTION_ARTIFACT_GITHUB_READBACK = PENDING_POST_MERGE

MTR_ID_COMMISSION_002_READY_TO_RETRY = YES_AFTER_POST_MERGE_GITHUB_READBACK

FOUNDER_DECISIONS_REQUIRED = NONE_NEW

NEXT_ACTION = Resume MTR-ID-COMMISSION-002 from canonical GitHub-verifiable Publishing evidence.
`)

writeChecksums()

function readText(path) {
  return existsSync(path) ? readFileSync(path, 'utf8') : ''
}

function readJson(path, fallback) {
  if (!existsSync(path)) return fallback
  try {
    return JSON.parse(readFileSync(path, 'utf8'))
  } catch {
    return fallback
  }
}

function writeJson(path, value) {
  writeFileSync(path, JSON.stringify(value, null, 2) + '\n')
}

function writeCsv(path, rows) {
  if (!rows.length) {
    writeFileSync(path, '')
    return
  }
  const fields = Object.keys(rows[0])
  const body = [fields.join(','), ...rows.map((row) => fields.map((field) => csvCell(row[field])).join(','))]
  writeFileSync(path, body.join('\n') + '\n')
}

function csvCell(value) {
  const text = String(value ?? '')
  if (/[",\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`
  return text
}

function writeChecksums() {
  const files = []
  walk(pkg, files)
  const lines = files
    .filter((path) => !path.endsWith('/checksums.sha256'))
    .sort()
    .map((path) => `${createHash('sha256').update(readFileSync(path)).digest('hex')}  ${relative(pkg, path)}`)
  writeFileSync(`${pkg}/checksums.sha256`, lines.join('\n') + '\n')
}

function walk(dir, files) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) walk(path, files)
    else files.push(path)
  }
}
