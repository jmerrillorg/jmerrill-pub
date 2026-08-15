#!/usr/bin/env node

import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const packageRoot = 'docs/operations/generated/CC010-EDITORIAL-PORTFOLIO-RECOVERY-2026-08-13'
const classification = readFileSync(`${packageRoot}/02-real-title-classification.csv`, 'utf8')
const state = readFileSync(`${packageRoot}/03-current-editorial-state.csv`, 'utf8')
const isolated = readFileSync(`${packageRoot}/08-test-certification-isolation.csv`, 'utf8')
const legacyPaths = readFileSync(`${packageRoot}/09-legacy-paths.csv`, 'utf8')
const waves = readFileSync(`${packageRoot}/16-commissioning-wave-candidates.md`, 'utf8')
const shared = readFileSync(`${packageRoot}/18-shared-capabilities.md`, 'utf8')
const finalState = readFileSync(`${packageRoot}/19-final-portfolio-state.md`, 'utf8')

test('The General’s Will and Last Testament is a real title and is not isolated as test data', () => {
  assert.match(classification, /The General.s Will and Last Testament/)
  assert.match(classification, /The General.s Will and Last Testament,[^,\n]*,REAL_ACTIVE/)
  assert.doesNotMatch(isolated, /The General.s Will and Last Testament/)
})

test('Quanishia source recovery remains the Stage 0 wave candidate with source-manuscript evidence', () => {
  assert.match(classification, /JMP-INT-202608-0AOS7L/)
  assert.match(classification, /Indomitable_Compiled_Batch1_2\.docx/)
  assert.match(state, /Indomitable Indomitable Escaping Witchcraft and Finding My Identity in Christ,Quanisha Dockery,REAL_ACTIVE,Stage 0 \/ Editorial Review/)
  assert.match(waves, /Wave 1 - Stage 0 \| Indomitable Indomitable Escaping Witchcraft and Finding My Identity in Christ/)
})

test('legacy title-specific execution paths are recovery-only and not normal CC-010 authority', () => {
  assert.match(legacyPaths, /five-title-executive-recovery-dispatch\.ts,RECOVERY_ONLY/)
  assert.match(legacyPaths, /runIntentionalLeaderAuthorResponse\.js,RECOVERY_ONLY/)
  assert.match(legacyPaths, /author-portal-context\.ts,SUPERSEDED_IF_NORMAL_RUNTIME/)
})

test('portfolio package documents model routing preference and Node 22 host drift', () => {
  assert.match(shared, /Stage 0 \/ Editorial Review \| Claude via Microsoft Foundry/)
  assert.match(shared, /Developmental Editing \| Claude via Microsoft Foundry/)
  assert.match(shared, /Copyediting \| OpenAI/)
  assert.match(finalState, /Function App runtime: Node\|22/)
  assert.match(finalState, /HOST_ROLLBACK_EXCEPTION_RECORDED/)
})
