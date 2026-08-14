import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import assert from 'node:assert/strict'

const stage0 = readFileSync('azure-functions/diagnostic-ai-runner/src/functions/runStage0Diagnostic.js', 'utf8')
const promptReader = readFileSync('azure-functions/diagnostic-ai-runner/src/dataverse/promptTemplateReader.js', 'utf8')
const routeRegistry = readFileSync('azure-functions/diagnostic-ai-runner/src/model/governedRouteRegistry.js', 'utf8')

test('Stage 0 executor does not hard-code the OpenAI fallback deployment as a business routing decision', () => {
  assert.doesNotMatch(stage0, /jm1-pub-diagnostic-primary/)
  assert.doesNotMatch(stage0, /gpt-4o-mini/)
  assert.match(stage0, /modelDeploymentAlias:\s*promptResolution\.modelDeploymentAlias/)
})

test('Stage 0 prompt reader normalizes stale fallback aliases to the canonical primary route alias', () => {
  assert.match(promptReader, /STAGE0_CANONICAL_PRIMARY_MODEL_DEPLOYMENT_ALIAS\s*=\s*"jm1-editorial-devline-primary"/)
  assert.match(promptReader, /STAGE0_APPROVED_FALLBACK_MODEL_DEPLOYMENT_ALIAS\s*=\s*"jm1-pub-diagnostic-primary"/)
  assert.match(promptReader, /STAGE0_PROMPT_TEMPLATE_REFERENCED_APPROVED_FALLBACK_ALIAS/)
})

test('governed route registry keeps Claude primary and OpenAI fallback distinct', () => {
  assert.match(routeRegistry, /"jm1-editorial-devline-primary"/)
  assert.match(routeRegistry, /provider:\s*PROVIDERS\.MICROSOFT_FOUNDRY_CLAUDE/)
  assert.match(routeRegistry, /fallbackDeploymentAlias:\s*"jm1-pub-diagnostic-primary"/)
  assert.match(routeRegistry, /provider:\s*PROVIDERS\.AZURE_OPENAI/)
})
