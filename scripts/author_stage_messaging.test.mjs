#!/usr/bin/env node

import { readFileSync } from 'node:fs'

const contextSource = readFileSync('lib/server/author-portal-context.ts', 'utf8')
const statusSource = readFileSync('lib/server/author-portal-status.ts', 'utf8')
const workspaceSource = readFileSync('app/author/_components/AuthorPortalWorkspace.tsx', 'utf8')

const expectations = [
  {
    name: 'author read model exposes separate active-stage fields',
    ok:
      contextSource.includes('currentStage?: string') &&
      contextSource.includes('currentStageStatus?: string') &&
      contextSource.includes("currentOwner?: 'Author' | 'Publisher' | 'System'") &&
      contextSource.includes('authorActionRequired?: boolean') &&
      contextSource.includes('currentActivity?: string') &&
      contextSource.includes('nextStep?: string') &&
      contextSource.includes('activePackage?: AuthorPortalArtifact[]') &&
      contextSource.includes('completedPackages?: Array<'),
  },
  {
    name: 'Proofreading has a canonical workspace state and public label',
    ok:
      statusSource.includes("| 'proofreading'") &&
      contextSource.includes("return 'proofreading'") &&
      contextSource.includes("return `${stageLabel || 'Proofreading'} —") &&
      contextSource.includes("if (normalized === 'proofread' || normalized === 'proofreading') return 'Proofreading'"),
  },
  {
    name: 'publisher-owned Proofreading uses active-stage activity instead of package text',
    ok:
      contextSource.includes('stageOwnedMessaging') &&
      contextSource.includes("row.workspaceState === 'copyediting' || row.workspaceState === 'proofreading'") &&
      contextSource.includes('!flags.authorActionAvailable') &&
      contextSource.includes('The publishing team is proofreading your approved Volume I manuscript.'),
  },
  {
    name: 'The Intentional Leader Proofreading next step is distinct from current activity',
    ok:
      contextSource.includes(
        'We will complete internal quality review and send your proofreading package when it is ready for your review.',
      ) &&
      contextSource.includes('normalizeWorkspaceText(summary) === normalizeWorkspaceText(nextAction)'),
  },
  {
    name: 'completed packages are not active artifacts',
    ok:
      contextSource.includes('const activeArtifacts = authorActionAvailable ? row.artifacts : []') &&
      contextSource.includes('completedPackages: buildCompletedPackageHistory(row)') &&
      contextSource.includes("row.workspaceState === 'proofreading'") &&
      contextSource.includes("? 'Copyediting'") &&
      workspaceSource.includes('Completed packages') &&
      workspaceSource.includes('Package components'),
  },
  {
    name: 'author workspace shows no author action for publisher-owned work',
    ok:
      workspaceSource.includes('selectedProject.authorActionRequired === false') &&
      workspaceSource.includes('No action is required from you at this time.'),
  },
  {
    name: 'current activity and next step render from separate fields',
    ok:
      workspaceSource.includes('selectedProject.currentActivity || selectedProject.summary') &&
      workspaceSource.includes('selectedProject.nextStep || selectedProject.nextActionLabel'),
  },
  {
    name: 'Copyediting review package text is no longer a Proofreading default',
    ok:
      !contextSource.includes(
        "case 'proofreading':\\n      return row.authorDecisionOutstanding\\n        ? 'Your Volume I copyediting review package",
      ),
  },
]

const failures = expectations.filter((expectation) => !expectation.ok)

if (failures.length) {
  console.error(JSON.stringify({ ok: false, failures: failures.map((failure) => failure.name) }, null, 2))
  process.exit(1)
}

console.log(JSON.stringify({ ok: true, checked: expectations.map((expectation) => expectation.name) }, null, 2))
