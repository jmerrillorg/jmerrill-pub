#!/usr/bin/env node

import { readFileSync } from 'node:fs'

const server = readFileSync('lib/server/publisher-operating-center.ts', 'utf8')
const client = readFileSync('app/publisher/_components/PublisherOperatingCenterClient.tsx', 'utf8')
const combined = `${server}\n${client}`

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
      server.includes('portfolio.map(portfolioToTodayItem)') &&
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
      server.includes("item.portfolioState !== 'published_catalog'") &&
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
    name: 'daily summary links to operational sections',
    ok:
      client.includes('waiting-jackie') &&
      client.includes('waiting-authors') &&
      client.includes('active-editorial') &&
      client.includes('production-queue') &&
      client.includes('catalog-queue') &&
      client.includes('recent-movements'),
  },
]

const failures = expectations.filter((expectation) => !expectation.ok)

if (failures.length) {
  console.error(JSON.stringify({ ok: false, failures: failures.map((failure) => failure.name) }, null, 2))
  process.exit(1)
}

console.log(JSON.stringify({ ok: true, checked: expectations.map((expectation) => expectation.name) }, null, 2))
