#!/usr/bin/env node

import { readFileSync } from 'node:fs'

const server = readFileSync('lib/server/publisher-operating-center.ts', 'utf8')
const client = readFileSync('app/publisher/_components/PublisherOperatingCenterClient.tsx', 'utf8')
const actionRoute = readFileSync('app/api/publisher/operating-center/actions/route.ts', 'utf8')
const nav = readFileSync('components/layout/NavBar.tsx', 'utf8')
const pageSection = readFileSync('components/site/PageSection.tsx', 'utf8')
const combined = `${server}\n${client}\n${actionRoute}\n${nav}`

const requiredSections = [
  'Waiting for Jackie',
  'Waiting for Authors',
  'Author Responses',
  'Active Editorial',
  'Production Queue',
  'Distribution and Catalog Queue',
  'Alerts and Failed Transitions',
  'Recently Moved Assets',
]

const forbiddenCapacityLanguage = ['Capacity Blocked', 'CAPACITY BLOCKED', 'capacity blocked', 'false capacity block']

const expectations = [
  {
    name: 'publisher snapshot exposes Publisher Today data contract',
    ok:
      server.includes('export type PublisherTodaySnapshot') &&
      server.includes('export type PublisherAuthorResponseQueueItem') &&
      server.includes('generatedAt') &&
      server.includes('publisherIdentity') &&
      server.includes('waitingForJackie: PublisherTodayItem[]') &&
      server.includes('waitingForAuthors: PublisherTodayItem[]') &&
      server.includes('activeEditorial: PublisherTodayItem[]') &&
      server.includes('productionQueue: PublisherTodayItem[]') &&
      server.includes('distributionCatalogQueue: PublisherTodayItem[]') &&
      server.includes('alerts: PublisherTodayItem[]') &&
      server.includes('recentMovements: PublisherTodayItem[]'),
  },
  {
    name: 'Publisher Today is generated from existing queues, workload, portfolio, and execution logs',
    ok:
      server.includes('function buildPublisherToday') &&
      server.includes('queue.map(queueToTodayItem)') &&
      server.includes('workload.map(workloadToTodayItem)') &&
      server.includes('filter(includePortfolioItemInDefaultToday).map(portfolioToTodayItem)') &&
      server.includes('logToMovementTodayItem'),
  },
  {
    name: 'client renders all seven required daily sections before deeper tables',
    ok:
      requiredSections.every((section) => client.includes(section)) &&
      client.indexOf('What needs attention today?') < client.indexOf('Catalog Portfolio') &&
      client.includes('TodaySection'),
  },
  {
    name: 'author responses queue exposes SLA and recovery controls',
    ok:
      server.includes('buildAuthorResponseQueue') &&
      server.includes('STALE — SLA BREACH') &&
      server.includes('authorResponseToTodayItem') &&
      client.includes('AuthorResponsesSection') &&
      server.includes('Reconcile Response') &&
      server.includes('Retry Failed Transition'),
  },
  {
    name: 'catalog queue remains exception-oriented rather than dumping all published titles into daily work',
    ok:
      server.includes("item.portfolioState === 'reconciliation_required'") &&
      server.includes("item.portfolioState === 'manual_recovery'") &&
      server.includes('includePortfolioItemInDefaultToday') &&
      server.includes("item.dependency.includes('ISBN')") &&
      client.includes('Exceptions only'),
  },
  {
    name: 'workload and production dependencies remain advisory, not capacity blocking',
    ok:
      server.includes("'resource-attention'") &&
      server.includes('Proofreading awaits author response') &&
      forbiddenCapacityLanguage.every((needle) => !combined.includes(needle)),
  },
  {
    name: 'cover internal review fails closed until review artifact is surfaced',
    ok:
      server.includes('evaluateHumanReviewReadiness') &&
      server.includes("'REVIEW ARTIFACT NOT READY'") &&
      server.includes('Prepare or register the first governed visual cover concept before Jackie internal review') &&
      server.includes('reviewer-access:verified') &&
      server.includes('do not treat the brief or evidence package as the review artifact'),
  },
  {
    name: 'daily summary links to operational sections',
    ok:
      client.includes('waiting-jackie') &&
      client.includes('waiting-authors') &&
      client.includes('active-editorial') &&
      client.includes('production-queue') &&
      client.includes('catalog-queue') &&
      client.includes('recent-movements'),
  },
  {
    name: 'publisher operating center exposes title-centric pipeline board before diagnostics',
    ok:
      server.includes('export type PublisherTitleOperatingView') &&
      server.includes('export type PublisherTitleOperatingCard') &&
      server.includes('function buildTitleOperatingView') &&
      client.includes('TitlePipelineBoard') &&
      client.includes('Process as the interface') &&
      client.indexOf('<TitlePipelineBoard') < client.indexOf('Operational queues and readbacks'),
  },
  {
    name: 'publisher operating center uses a desktop wide application shell without changing public page sections',
    ok:
      client.includes('w-full max-w-none flex-col gap-6') &&
      client.includes('w-full max-w-none px-5 py-6') &&
      pageSection.includes('mx-auto max-w-[1280px]') &&
      !pageSection.includes('max-w-none'),
  },
  {
    name: 'pipeline board derives canonical stage columns and hides test records by default',
    ok:
      server.includes('function deriveTitleOperatingStages') &&
      server.includes('canonicalStageId') &&
      client.includes('Include Test / Certification Records') &&
      client.includes("card.liveClassification === 'LIVE'") &&
      client.includes('cardsByStage'),
  },
  {
    name: 'pipeline board owns desktop horizontal navigation while preserving readable stage columns',
    ok:
      client.includes('overflow-x-auto pb-2') &&
      client.includes('auto-cols-[minmax(260px,1fr)]') &&
      client.includes('xl:grid-cols-[minmax(720px,1fr)_420px]') &&
      client.includes('2xl:grid-cols-[minmax(0,1fr)_460px]'),
  },
  {
    name: 'title detail drawer surfaces why, artifact, author state, next stage, and technical diagnostics',
    ok:
      client.includes('TitleDetailDrawer') &&
      client.includes('Current Situation') &&
      client.includes('Current Artifact') &&
      client.includes('Author State') &&
      client.includes('Next Stage') &&
      client.includes('Technical Details') &&
      client.includes('Why it is waiting'),
  },
  {
    name: 'deep links resolve exact title, intake, and diagnostic actions without wrong-title fallback',
    ok:
      client.includes("searchParams.get('titleId')") &&
      client.includes("searchParams.get('intakeId')") &&
      client.includes("searchParams.get('diagnosticId')") &&
      client.includes("searchParams.get('title')") &&
      client.includes('matchesEveryProvidedIdentifier') &&
      client.includes('deepLinked.length === 1') &&
      client.includes('selectedTitle') &&
      client.includes('Requested action could not be resolved.') &&
      client.includes('No fallback title was opened.') &&
      !client.includes('return titleCards.find((card) => card.key === selectedTitleKey) || titleCards[0]') &&
      client.includes('TitleDetailDrawer') &&
      client.includes('operatingCenterUrl') &&
      server.includes('intakeId?: string') &&
      server.includes('diagnosticId?: string'),
  },
  {
    name: 'opaque header treatment remains isolated to the global navigation',
    ok:
      nav.includes('bg-white border-b border-gray-200 shadow-sm') &&
      nav.includes('bg-[#0F1C2E] border-b border-white/10') &&
      !nav.includes('backdrop-blur') &&
      !nav.includes('/72'),
  },
  {
    name: 'Jackie-owned actions surface decision context and notification delivery',
    ok:
      server.includes('export type JackieActionRequiredNotificationEvent') &&
      server.includes("eventType: 'JACKIE_ACTION_REQUIRED'") &&
      server.includes('jackieActionNotificationForCard') &&
      server.includes('dispatchJackieActionRequiredNotification') &&
      server.includes('findJackieNotificationEvidence') &&
      server.includes('JACKIE_ACTION_REQUIRED_NOTIFICATION_SENT') &&
      server.includes('JACKIE_ACTION_REQUIRED_NOTIFICATION_FAILED') &&
      server.includes("preferredChannel: 'MICROSOFT_TEAMS'") &&
      server.includes("fallbackChannel: 'EMAIL'") &&
      server.includes("escalationChannel: 'SMS'") &&
      server.includes('idempotencyKey') &&
      actionRoute.includes("'notify_jackie_action_required'") &&
      client.includes('Jackie Decision') &&
      client.includes('Notification') &&
      client.includes('Copy direct action view') &&
      server.includes('Notify Jackie'),
  },
  {
    name: 'blocked actions explain why instead of silently disabling controls',
    ok:
      client.includes('unavailableReason') &&
      server.includes('Unavailable because') &&
      client.includes('Reason') &&
      server.includes('nextStageBlockedReason'),
  },
]

const failures = expectations.filter((expectation) => !expectation.ok)

if (failures.length) {
  console.error(JSON.stringify({ ok: false, failures: failures.map((failure) => failure.name) }, null, 2))
  process.exit(1)
}

console.log(JSON.stringify({ ok: true, checked: expectations.map((expectation) => expectation.name) }, null, 2))
