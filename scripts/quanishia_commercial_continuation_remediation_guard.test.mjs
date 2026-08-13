#!/usr/bin/env node

import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const stage0 = readFileSync('azure-functions/diagnostic-ai-runner/src/functions/runStage0Diagnostic.js', 'utf8')
const azureProvider = readFileSync('azure-functions/diagnostic-ai-runner/src/model/providers/azureOpenAiProvider.js', 'utf8')
const diagnosticReader = readFileSync('azure-functions/diagnostic-ai-runner/src/dataverse/diagnosticRecordReader.js', 'utf8')
const continuation = readFileSync('azure-functions/diagnostic-ai-runner/src/author/packageSelectionCommercialContinuation.js', 'utf8')
const onboardingPage = readFileSync('app/author/_components/AuthorSetupForm.tsx', 'utf8')
const authorWorkspace = readFileSync('app/author/_components/AuthorPortalWorkspace.tsx', 'utf8')
const authorPortalContext = readFileSync('lib/server/author-portal-context.ts', 'utf8')
const authorPortalAccess = readFileSync('lib/server/author-portal-access.ts', 'utf8')
const onboardingRoute = readFileSync('app/api/author/onboarding/route.ts', 'utf8')
const onboardingOptions = readFileSync('lib/publishing/onboarding-production-options.ts', 'utf8')

test('Stage 0 real-manuscript prompt is compatible with Azure JSON-object fallback', () => {
  assert.match(stage0, /Return one valid JSON object only\./)
  assert.match(stage0, /jm1_diagnosticoutputsummary, jm1_diagnosticriskflags, jm1_confidence, jm1_requireshumanreview/)
  assert.match(azureProvider, /providerMessage/)
  assert.equal(azureProvider.includes('`AZURE_OPENAI_HTTP_${httpStatus}: ${providerMessage}`'), true)
})

test('numeric Dataverse manuscript asset status is preserved for source-correlation readback', () => {
  assert.match(diagnosticReader, /typeof rawAssetStatus === "number" \? String\(rawAssetStatus\)/)
})

test('Opportunity continuation reports create-step Dataverse failures and parses OData-EntityId', () => {
  assert.match(continuation, /step: "opportunity:create"/)
  assert.match(continuation, /dvMessage/)
  assert.match(continuation, /OData-EntityId/)
  assert.match(continuation, /opportunities\\\(\(\[0-9a-f-\]\{36\}\)\\\)/)
})

test('author onboarding includes governed package-aware format selection', () => {
  assert.match(onboardingPage, /governedFormatSelectionOptions/)
  assert.match(onboardingPage, /additionalFormatInterestOptions/)
  assert.match(onboardingPage, /Choose Your Publishing Formats/)
  assert.match(onboardingPage, /No format is selected for you/)
  assert.doesNotMatch(onboardingPage, /defaultValue:\s*['"]starter_included_paperback_ebook['"]/)
  assert.doesNotMatch(onboardingPage, /defaultValue:\s*['"]paperback_ebook['"]/)
  assert.match(onboardingRoute, /resolveGovernedFormatSelection/)
  assert.match(onboardingRoute, /selectedProductForms/)
  assert.match(onboardingRoute, /selectedIncludedProductForms/)
  assert.match(onboardingRoute, /selectedAddOnProductForms/)
  assert.match(onboardingRoute, /selectedSeparateAuthorizationProductForms/)
  assert.match(onboardingRoute, /selectionBlockers/)
  assert.match(onboardingRoute, /formatDownstreamDrivers/)
})

test('Author Workspace surfaces awaiting format selection as a dedicated live task', () => {
  assert.match(authorWorkspace, /Choose Your Publishing Formats/)
  assert.match(authorWorkspace, /Starter Package includes two edition slots/)
  assert.match(authorWorkspace, /context\.tasks\.formatSelectionRequired/)
  assert.match(authorPortalContext, /jm1_m6agreementpreparationstatus/)
  assert.match(authorPortalContext, /agreementPreparationStatusInternal/)
  assert.match(authorPortalAccess, /formatSelectionRequired/)
  assert.match(authorPortalAccess, /awaiting_format_selection/)
})

test('Starter format semantics use elected edition slots instead of inferred defaults', () => {
  assert.match(onboardingOptions, /JMP-PKG-STARTER/)
  assert.match(onboardingOptions, /packageIncludedSlotLimit:\s*2/)
  assert.match(onboardingOptions, /selectedIncludedProductForms/)
  assert.match(onboardingOptions, /includedProductForms[\s\S]+slice\(0, pkg\.packageIncludedSlotLimit\)/)
  assert.doesNotMatch(onboardingOptions, /starter_included_paperback_ebook/)
  assert.doesNotMatch(onboardingOptions, /selected\.key === 'needs_recommendation' \? \['PF-01'\]/)
  assert.match(onboardingOptions, /AVAILABLE_ADD_ON/)
  assert.match(onboardingOptions, /REQUIRES_SEPARATE_AUTHORIZATION/)
  assert.match(onboardingOptions, /NOT_APPLICABLE/)
  assert.match(onboardingOptions, /AUTHOR_FORMAT_RECOMMENDATION_REQUIRED/)
  assert.match(onboardingOptions, /isbnRequirements/)
  assert.match(onboardingOptions, /compCopyEntitlement/)
})
