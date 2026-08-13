#!/usr/bin/env node

import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const publisher = readFileSync('lib/server/publisher-operating-center.ts', 'utf8')
const client = readFileSync('app/publisher/_components/PublisherOperatingCenterClient.tsx', 'utf8')
const continuation = readFileSync('azure-functions/diagnostic-ai-runner/src/author/packageSelectionCommercialContinuation.js', 'utf8')
const continuationFunction = readFileSync('azure-functions/diagnostic-ai-runner/src/functions/runPackageSelectionCommercialContinuation.js', 'utf8')
const functionIndex = readFileSync('azure-functions/diagnostic-ai-runner/src/index.js', 'utf8')

test('Stage 0 happy path is autonomous and genuine exception gates remain publisher-owned', () => {
  assert.match(publisher, /function stage0RequiresJackieGate/)
  assert.match(publisher, /if \(!diagnostic \|\| !input\.hasManuscript\) return false/)
  assert.match(publisher, /diagnostic\.jm1pub_legalflag === true/)
  assert.match(publisher, /diagnostic\.jm1pub_rightsconcernflag === true/)
  assert.match(publisher, /diagnostic\.jm1pub_hardstopflag === true/)
  assert.match(publisher, /diagnostic\.jm1pub_ethicsflag === true/)
  assert.match(publisher, /diagnostic\.jm1pub_brandmisalignmentflag === true/)
  assert.match(publisher, /diagnostic\.jm1pub_secondaryauthorizationrequired === true/)
  assert.match(publisher, /diagnostic\.jm1pub_signaturereviewrequired === true/)
  assert.match(publisher, /diagnostic\.jm1_diagnosticrequireshumanreview === true && Boolean/)
  assert.match(publisher, /currentBlocker === 'Editorial Review automation pending'[\s\S]+hasContact && hasManuscript[\s\S]+\? 'system'/)
})

test('missing source material is an author/source dependency, not a generic Jackie gate', () => {
  assert.match(publisher, /Source manuscript\/material evidence is missing/)
  assert.match(publisher, /currentBlocker === 'Source manuscript\/material evidence is missing'[\s\S]+\? 'author'/)
  const missingSourceBranch = publisher.slice(
    publisher.indexOf("currentBlocker === 'Source manuscript/material evidence is missing'"),
    publisher.indexOf("authorizedActions.some", publisher.indexOf("currentBlocker === 'Source manuscript/material evidence is missing'")),
  )
  assert.doesNotMatch(missingSourceBranch, /\? 'publisher'/)
})

test('Operating Center starts with Intake and does not create an Inquiry swimlane', () => {
  assert.match(publisher, /defineStage\('intake', 'Intake', 10/)
  assert.match(publisher, /Intake exists from a governed inquiry event/)
  assert.doesNotMatch(publisher, /defineStage\('inquiry'/i)
  assert.doesNotMatch(publisher, /'Inquiry', 10/)
})

test('deep links require one exact owning card and fail visibly on unknown or mismatched identifiers', () => {
  assert.match(client, /matchesEveryProvidedIdentifier/)
  assert.match(client, /deepLinked\.length === 1/)
  assert.match(client, /Requested action could not be resolved\./)
  assert.match(client, /No fallback title was opened\./)
  assert.doesNotMatch(client, /match\(card\.titleId, requestedTitleId\) \|\|/)
  assert.doesNotMatch(client, /return titleCards\.find\(\(card\) => card\.key === selectedTitleKey\) \|\| titleCards\[0\]/)
})

test('package-selection commercial continuation is reusable and not title allowlisted', () => {
  assert.match(functionIndex, /runPackageSelectionCommercialContinuation/)
  assert.match(continuationFunction, /run-package-selection-commercial-continuation/)
  assert.match(continuation, /JM1_PACKAGE_SELECTION_COMMERCIAL_CONTINUATION_ENABLED/)
  assert.match(continuation, /PACKAGE_SELECTED/)
  assert.match(continuation, /jm1pub_intaketrackingid/)
  assert.match(continuation, /DUPLICATE_OPPORTUNITY_CANDIDATES/)
  assert.match(continuation, /jm1_Opportunity@odata\.bind/)
  assert.match(continuation, /jm1pub_Opportunity@odata\.bind/)
  assert.doesNotMatch(continuation, /Til Death|Intentional Leader|Quanishia|AUTHORIZED_DIAGNOSTIC_ID|AUTHORIZED_INTAKE_REFERENCE_CODE/)
})

test('multi-asset commissioning remains independent by identity and forbids broad title-specific workarounds', () => {
  assert.match(continuation, /diagnosticId/)
  assert.match(continuation, /intakeReferenceCode/)
  assert.match(continuation, /contactId/)
  assert.match(continuation, /leadId/)
  assert.match(continuation, /selectedPackageCode/)
  assert.match(continuation, /createsDuplicateOpportunity: false/)
  assert.match(continuation, /sendsAuthorEmail: false/)
})
