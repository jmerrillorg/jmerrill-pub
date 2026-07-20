#!/usr/bin/env node

import { readFileSync } from 'node:fs'

const classifier = readFileSync('lib/server/catalog-portfolio.ts', 'utf8')
const publisher = readFileSync('lib/server/publisher-operating-center.ts', 'utf8')

const requiredPatterns = [
  '/^test\\b/i',
  '/^case [bc]\\b/i',
  '/^author_/i',
  '/^editorial_/i',
  '/^proofreading_/i',
  '/^package_/i',
]

const expectations = [
  {
    name: 'catalog classifier exposes production title contamination guard',
    ok:
      classifier.includes('isProductionTitleContaminant') &&
      classifier.includes('Production Test Contamination') &&
      requiredPatterns.every((pattern) => classifier.includes(pattern)),
  },
  {
    name: 'Publisher Today no longer presents active editorial stages as Cody bridge work',
    ok:
      publisher.includes('JM1 Editorial Execution Runtime - editorial executor') &&
      publisher.includes('JM1 Editorial Execution Runtime - Editorial Review executor') &&
      !publisher.includes('Permanent editorial execution runtime not yet commissioned for this active stage.') &&
      !publisher.includes('Permanent Editorial Review runtime not yet commissioned for this title.') &&
      !publisher.includes('Permanent Proofreading runtime not yet commissioned; current work uses controlled bridge execution.'),
  },
]

const failures = expectations.filter((expectation) => !expectation.ok)
if (failures.length) {
  console.error(JSON.stringify({ ok: false, failures: failures.map((failure) => failure.name) }, null, 2))
  process.exit(1)
}

console.log(JSON.stringify({ ok: true, checked: expectations.map((expectation) => expectation.name) }, null, 2))
