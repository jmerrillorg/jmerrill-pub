import { execFileSync } from 'node:child_process'
const azPath = process.env.JM1_AZ_CLI || '/Volumes/UsersExternal/JM1-PRIME/tooling/bin/az'
const az = args => execFileSync(azPath, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] }).trim()
const anchor = JSON.parse(az(['monitor', 'scheduled-query', 'show', '-g', 'rg-jm1-ai',
  '-n', 'jm1-publishing-payment-timer-failure', '-o', 'json']))
if (anchor.scopes.length !== 1 || !anchor.scopes[0].endsWith('/func-jm1-diagnostic-ai-runner')
    || !anchor.actions.actionGroups.length || !anchor.enabled) throw new Error('Governed monitor authority unavailable')
const query = "traces | where timestamp > ago(15m) | where message has_any ('PUBLISHING_ACCEPTANCE_MATERIAL_FAILURE', 'PUBLISHING_ACCEPTANCE_RUNTIME_FAILURE')"
const name = 'jm1-publishing-communication-acceptance-failure'
if (process.argv.includes('--apply')) {
  az(['monitor', 'scheduled-query', 'create', '-g', 'rg-jm1-ai', '-n', name,
    '--scopes', ...anchor.scopes, '--action-groups', ...anchor.actions.actionGroups,
    '--condition', 'count acceptanceFailure > 0', '--condition-query', `acceptanceFailure=${query}`,
    '--evaluation-frequency', '5m', '--window-size', '15m', '--severity', '1',
    '--description', 'Publishing communication acceptance: expired mailbox verification or runtime failure. No resend authority.',
    '--tags', 'owner=jmerrill-pub', 'packet=JMP-COMMUNICATION-CANON-REGRESSION-001-C1', '-o', 'none'])
}
console.log(JSON.stringify({ name, query, scopes: anchor.scopes, actionGroups: anchor.actions.actionGroups,
  applied: process.argv.includes('--apply'), normalPendingAlerts: false }))
