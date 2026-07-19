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
      contextSource.includes('currentOperationalActivity?: string') &&
      contextSource.includes('operationalActivityCode?: string') &&
      contextSource.includes("currentOwner?: 'Author' | 'Publisher' | 'System'") &&
      contextSource.includes("awaitingParty?: 'Publisher' | 'Author' | 'Printer'") &&
      contextSource.includes('authorActionRequired?: boolean') &&
      contextSource.includes('authorActionDescription?: string') &&
      contextSource.includes('currentActivity?: string') &&
      contextSource.includes('nextOperationalActivity?: string') &&
      contextSource.includes('nextStep?: string') &&
      contextSource.includes('expectedAuthorEvent?: string') &&
      contextSource.includes('activePackage?: AuthorPortalArtifact[]') &&
      contextSource.includes('completedPackages?: Array<') &&
      contextSource.includes('completedMilestones?: AuthorPortalJourneyMilestone[]') &&
      contextSource.includes('currentMilestones?: AuthorPortalJourneyMilestone[]') &&
      contextSource.includes('upcomingMilestones?: AuthorPortalJourneyMilestone[]') &&
      contextSource.includes('blockingIssue?: string') &&
      contextSource.includes('lastUpdated?: string'),
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
      contextSource.includes('const packageReadyNotificationPending = isPackageReadyNotificationPending(row)') &&
      contextSource.includes('const activeArtifacts = authorActionAvailable ? row.artifacts : []') &&
      contextSource.includes('completedPackages: buildCompletedPackageHistory(row)') &&
      contextSource.includes('activePackage: activeArtifacts') &&
      contextSource.includes('currentMilestones: milestones.filter') &&
      contextSource.includes('upcomingMilestones: milestones.filter') &&
      contextSource.includes("row.workspaceState === 'proofreading'") &&
      contextSource.includes("? 'Copyediting'") &&
      contextSource.includes('Developmental Editing Review Package') &&
      contextSource.includes('Line Editing Review Package') &&
      contextSource.includes('Copyediting Review Package') &&
      workspaceSource.includes('Completed packages') &&
      workspaceSource.includes('Active package'),
  },
  {
    name: 'Proofreading package ready without notification is not an active author response task',
    ok:
      contextSource.includes('notificationCompleted') &&
      contextSource.includes('function isPackageReadyNotificationPending') &&
      contextSource.includes("return 'Notification Pending'") &&
      contextSource.includes('The publishing team has completed your proofreading package and is preparing the review notification.') &&
      contextSource.includes('We will email you when the package is officially released for review.') &&
      contextSource.includes('PROOFREADING_PACKAGE_NOTIFICATION_PENDING') &&
      contextSource.includes('Proofreading package prepared; author notification pending.'),
  },
  {
    name: 'notification-pending packages expose separate hidden package states',
    ok:
      contextSource.includes('packagePreparationState?:') &&
      contextSource.includes('packageReleaseState?:') &&
      contextSource.includes('notificationState?:') &&
      contextSource.includes('authorAccessState?:') &&
      contextSource.includes('authorGateState?:') &&
      contextSource.includes('function resolvePackageVisibilityState') &&
      contextSource.includes("authorAccessState: authorActionAvailable ? ('AVAILABLE' as const) : ('HIDDEN' as const)") &&
      contextSource.includes("authorGateState: authorActionAvailable ? ('OPEN' as const) : ('CLOSED' as const)"),
  },
  {
    name: 'author workspace shows no author action for publisher-owned work',
    ok:
      workspaceSource.includes('selectedProject.authorActionDescription') &&
      workspaceSource.includes('No action is required from you at this time.'),
  },
  {
    name: 'current activity and next step render from separate fields',
    ok:
      workspaceSource.includes('selectedProject.currentOperationalActivity || selectedProject.currentActivity || selectedProject.summary') &&
      workspaceSource.includes('selectedProject.nextOperationalActivity || selectedProject.nextStep || selectedProject.nextActionLabel'),
  },
  {
    name: 'author workspace labels the operational surface as publishing journey',
    ok:
      workspaceSource.includes('Your Publishing Journey') &&
      workspaceSource.includes('Current Stage') &&
      workspaceSource.includes('Awaiting') &&
      workspaceSource.includes('Author Action') &&
      workspaceSource.includes('Publishing journey') &&
      workspaceSource.includes('Current activities') &&
      workspaceSource.includes('Upcoming milestones') &&
      workspaceSource.includes('Last Updated'),
  },
  {
    name: 'operational read model defines stage-aware conflict prevention',
    ok:
      contextSource.includes('sanitizeOperationalActivity') &&
      contextSource.includes('sanitizeOperationalNextStep') &&
      contextSource.includes('shouldSuppressPackageTextForActiveStage') &&
      contextSource.includes('detectOperationalMessageConflict') &&
      contextSource.includes('Notification is not complete, so author-review language was suppressed.') &&
      contextSource.includes('Author package visibility conflicted with a closed author gate.') &&
      contextSource.includes('Stale completed-package language was suppressed from the active stage.'),
  },
  {
    name: 'operational model supports cover/interior concurrency without replacing the primary stage',
    ok:
      contextSource.includes("label === 'Cover Design'") &&
      contextSource.includes('Creative brief and concept development may proceed alongside Proofreading.') &&
      contextSource.includes("label === 'Interior Layout'") &&
      contextSource.includes('Interior layout begins after the final manuscript is approved for production.') &&
      contextSource.includes("normalizeWorkspaceText(row.stageLabel).includes('cover')") &&
      contextSource.includes("normalizeWorkspaceText(row.stageLabel).includes('interior')"),
  },
  {
    name: 'stage-aware messaging covers production, distribution, published, and governed hold states',
    ok:
      contextSource.includes('The publishing team is preparing your approved manuscript for interior layout.') &&
      contextSource.includes('The publishing team is developing the creative direction for your cover.') &&
      contextSource.includes('The publishing team is preparing distribution validation and release steps.') &&
      contextSource.includes('This title is published and available as part of your author portfolio.') &&
      contextSource.includes('This title is on hold while the publishing team resolves the current blocker.'),
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
