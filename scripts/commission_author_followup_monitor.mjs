import { execFileSync } from 'node:child_process'

const azPath = process.env.JM1_AZ_CLI || '/Volumes/UsersExternal/JM1-PRIME/tooling/bin/az'
const az = args => execFileSync(azPath, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] }).trim()
const anchor = JSON.parse(az(['monitor', 'scheduled-query', 'show', '-g', 'rg-jm1-ai',
  '-n', 'jm1-publishing-communication-acceptance-failure', '-o', 'json']))

if (anchor.scopes.length !== 1 || !anchor.scopes[0].endsWith('/func-jm1-diagnostic-ai-runner') ||
    !anchor.actions.actionGroups.length || !anchor.enabled) {
  throw new Error('Governed Publishing alert authority unavailable')
}

const name = 'jm1-publishing-author-followup-operations'
const query = "traces | where timestamp > ago(15m) | where (message has_any ('AUTHOR_FOLLOWUP_MATERIAL_FAILURE', 'AUTHOR_FOLLOWUP_DAY20_ESCALATION') or (message has 'run-author-followup-cadence' and message has 'Failed'))"

if (process.argv.includes('--apply')) {
  az(['monitor', 'scheduled-query', 'create', '-g', 'rg-jm1-ai', '-n', name,
    '--scopes', ...anchor.scopes, '--action-groups', ...anchor.actions.actionGroups,
    '--condition', "count 'authorFollowupAlert' > 0", '--condition-query', `authorFollowupAlert=${query}`,
    '--evaluation-frequency', '5m', '--window-size', '15m', '--severity', '1',
    '--description', 'Publishing author follow-up: timer, relay or mailbox failure, or Day-20 escalation.',
    '--tags', 'owner=jmerrill-pub', 'packet=JMP-AUTHOR-FOLLOWUP-CADENCE-001-CLOSEOUT-02', '-o', 'none'])
}

console.log(JSON.stringify({ name, query, scopes: anchor.scopes,
  actionGroups: anchor.actions.actionGroups, applied: process.argv.includes('--apply') }))
