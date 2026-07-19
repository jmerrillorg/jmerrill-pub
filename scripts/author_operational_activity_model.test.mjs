#!/usr/bin/env node

import { readFileSync } from 'node:fs'

const contextSource = readFileSync('lib/server/author-portal-context.ts', 'utf8')
const workspaceSource = readFileSync('app/author/_components/AuthorPortalWorkspace.tsx', 'utf8')

const requiredSnippets = [
  'AUTHOR_WORKSPACE_OPERATIONAL_ACTIVITY_MODEL_STARTED',
  'AUTHOR_WORKSPACE_STALE_PACKAGE_TEXT_REMOVED',
  'AUTHOR_WORKSPACE_STAGE_AWARE_STATUS_ACTIVATED',
  'AUTHOR_WORKSPACE_ACTIVITY_NEXT_STEP_SEPARATED',
  'AUTHOR_WORKSPACE_AWAITING_PARTY_ACTIVATED',
  'AUTHOR_WORKSPACE_PUBLISHING_JOURNEY_ACTIVATED',
  'AUTHOR_WORKSPACE_OPERATIONAL_CONFLICT_DETECTED',
  'AUTHOR_WORKSPACE_ACTIVE_PROJECT_REFRESH_COMPLETED',
  'AUTHOR_WORKSPACE_OPERATIONAL_ACTIVITY_MODEL_COMPLETED',
  'EDITORIAL_REVIEW_IN_PROGRESS',
  'DEVELOPMENTAL_EDITING_IN_PROGRESS',
  'LINE_EDITING_IN_PROGRESS',
  'COPYEDITING_IN_PROGRESS',
  'PROOFREADING_IN_PROGRESS',
  'PROOFREADING_INTERNAL_QA',
  'PROOFREADING_PACKAGE_NOTIFICATION_PENDING',
  'PROOFREADING_CORRECTIONS',
  'INTERIOR_LAYOUT_IN_PROGRESS',
  'COVER_BRIEF_IN_PROGRESS',
  'PRODUCTION_FILES_IN_PROGRESS',
  'DISTRIBUTION_SUBMISSION_IN_PROGRESS',
  'WAITING_FOR_AUTHOR_REVIEW',
  'WAITING_FOR_PUBLISHER_DECISION',
  'The publishing team is proofreading your approved Volume I manuscript.',
  'We will complete internal quality review and send your proofreading package when it is ready for your review.',
  'No action is required from you at this time.',
  'Entered the current publishing workflow at this stage.',
]

const workspaceSnippets = [
  'Your Publishing Journey',
  'Current Stage',
  'Current Activity',
  'Awaiting',
  'Author Action',
  'Next Step',
  'Active package',
  'Completed packages',
  'Publishing journey',
]

const missing = [
  ...requiredSnippets.filter((snippet) => !contextSource.includes(snippet)),
  ...workspaceSnippets.filter((snippet) => !workspaceSource.includes(snippet)),
]

if (missing.length) {
  console.error(JSON.stringify({ ok: false, missing }, null, 2))
  process.exit(1)
}

console.log(JSON.stringify({ ok: true, checked: requiredSnippets.length + workspaceSnippets.length }, null, 2))
