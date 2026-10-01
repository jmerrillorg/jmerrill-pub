"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const { AUTHORITY } = require("../src/production/coverAuthorityBundle");
const {
  STATES,
  prepareCreativeBrief,
  generateConceptSet,
  prepareReviewPackage,
  reviewConceptSet
} = require("../src/production/coverDesignRuntime");

const TITLE_ID = "91c5e1ef-2980-f111-ab0f-7c1e525b15c2";
const AUTHOR_ID = "d60b4f5c-f823-4a84-ae3e-115428cff204";
const EVIDENCE_ID = "be13a019-8468-4ee7-b0ea-9e7b9305a49b";
const EXECUTION_ID = "df8f7a54-2c12-45be-ad19-dcf2a123fa24";

function title(overrides = {}) {
  return {
    titleId: TITLE_ID,
    authorId: AUTHOR_ID,
    title: "Before You Were Born",
    subtitle: "Discovering God's Plan for Your Life",
    authorDisplay: "Sean Arron Crowley",
    package: "STARTER",
    genre: "Christian living",
    audience: "Adult Christian readers",
    positioning: "Faith-forward reflection on purpose and vocation",
    bookDescription: "A reflective guide to considering purpose through a Christian lens.",
    titleThemes: ["purpose", "faith", "belonging"],
    imprint: "J Merrill Publishing",
    trimSize: "6 x 9",
    pageCount: 102,
    formatEntitlements: ["Paperback", "eBook"],
    isbn: { paperback: "9781961475861", ebook: "9781961475878" },
    marketContext: "Christian living and inspirational nonfiction",
    titleRulings: ["No hardcover", "No LCCN"],
    prohibitedVisuals: ["fabricated endorsement badges"],
    preferences: [],
    approvedBrandAssets: [],
    authorityEvidenceId: EVIDENCE_ID,
    sourceAuthority: "DATAVERSE",
    authorityVersion: "BYWB-IDENTIFIER-BINDING-2026-09-15",
    ...overrides
  };
}

function authorityCandidates(overrides = {}) {
  const source = title(overrides);
  return Object.keys(AUTHORITY).map((field) => ({
    field, value: source[field], titleId: source.titleId, sourceType: AUTHORITY[field][0],
    sourceId: `governed-${field}`, sourceVersion: "current-v1", current: true,
    authorityClass: "PUBLISHER_APPROVED", lastVerified: new Date().toISOString(),
    ...(["pageCount", "approvedBrandAssets"].includes(field) ? { sourceChecksum: "a".repeat(64) } : {})
  }));
}

function snapshot(bundle, executionId) {
  return { titleId: bundle.titleId, executionId, authoritySha256: bundle.sha256, snapshotId: "b".repeat(64) };
}

test("cover brief binds title, format entitlement, and source authority", () => {
  const result = prepareCreativeBrief(title());
  assert.equal(result.ok, true);
  assert.equal(result.brief.titleId, TITLE_ID);
  assert.match(result.brief.briefId, /^[a-f0-9]{64}$/);
  assert.equal(result.brief.subtitle, "Discovering God's Plan for Your Life");
  assert.equal(result.brief.authorDisplay, "Sean Arron Crowley");
  assert.deepEqual(result.brief.formats, ["EBOOK", "PAPERBACK"]);
  assert.equal(result.brief.paperback.pageCount, 102);
  assert.equal(result.brief.formats.includes("HARDCOVER"), false);
});

test("cover preparation fails closed on incomplete or ambiguous authority", () => {
  const result = prepareCreativeBrief(title({ authorId: "", marketContext: "", isbn: { paperback: "" } }));
  assert.equal(result.ok, false);
  assert.equal(result.code, "COVER_AUTHORITY_INCOMPLETE");
  assert.ok(result.missing.includes("authorId"));
  assert.ok(result.missing.includes("marketContext"));
  assert.ok(result.missing.includes("paperbackIsbn"));
});

test("concept runtime is idempotent and review remains a genuine human gate", async () => {
  const executions = new Map();
  let calls = 0;
  let savedRequest;
  const deps = {
    modelDeployment: "jm1-pub-cover-image-primary",
    loadTitleAuthority: async (titleId) => authorityCandidates({ titleId }),
    persistAuthoritySnapshot: async (bundle, executionId) => snapshot(bundle, executionId),
    reserveExecution: async (key) => executions.has(key)
      ? { status: "EXISTING", record: executions.get(key) }
      : { status: "ACQUIRED", executionId: EXECUTION_ID },
    completeExecution: async (key, execution) => executions.set(key, execution),
    failExecution: async () => {},
    persistGenerationRequest: async (request) => { savedRequest = request; return request; },
    generateImage: async () => {
      assert.ok(savedRequest, "request must be durable before the provider call");
      calls++;
      return {
        assetId: `asset-${calls}`,
        location: `sharepoint://cover/asset-${calls}.png`,
        sha256: String(calls).repeat(64),
        width: 1536,
        height: 2048,
        provider: "fixture",
        model: "fixture",
        modelVersion: "1",
        safetyPassed: true,
        safetyEvidenceId: `safety-${calls}`
      };
    },
    preflightConcept: async ({ generated }) => ({
      passed: true,
      evidenceId: `preflight-${generated.assetId}`,
      rationale: "Title, audience, category, and thumbnail fit were evaluated."
    })
  };
  const first = await generateConceptSet(TITLE_ID, deps);
  const replay = await generateConceptSet(TITLE_ID, deps);
  assert.equal(first.ok, true);
  assert.equal(first.state, STATES.CONCEPTS_READY);
  assert.equal(first.concepts.length, 2);
  assert.equal(savedRequest.titleId, TITLE_ID);
  assert.equal(savedRequest.modelDeployment, "jm1-pub-cover-image-primary");
  assert.equal(savedRequest.creativeBriefId, first.brief.briefId);
  assert.equal(savedRequest.authoritySnapshotId, "b".repeat(64));
  assert.equal(savedRequest.requestedVariantCount, 2);
  assert.equal(savedRequest.promptContractVersion, first.promptTemplateVersion);
  assert.equal(first.generationRequest.executionId, first.executionId);
  assert.equal(replay.replay, true);
  assert.equal(calls, 2);
  assert.equal(reviewConceptSet(first, { action: "APPROVE", assetId: "asset-1" }).code, "COVER_REVIEW_NOT_CURRENT");
  const packageRecord = await prepareReviewPackage(first, {
    composeReviewPackage: async () => ({ assetId: "review-1", location: "sharepoint://review.pdf", sha256: "a".repeat(64) }),
    preflightReviewPackage: async () => ({ passed: true, evidenceId: "review-qa-1" }),
    saveReviewPackage: async () => {}
  });
  assert.equal(packageRecord.state, STATES.AWAITING_REVIEW);
  const operator = { reviewerId: AUTHOR_ID, authenticated: true, coverReviewAuthorized: true };
  assert.equal(reviewConceptSet(packageRecord, {
    action: "APPROVE", assetId: "unknown", reviewedAt: "2026-09-30T00:00:00Z",
    briefVersion: packageRecord.briefVersion, reviewPackageSha256: packageRecord.reviewPackage.sha256
  }, operator).ok, false);
  const review = reviewConceptSet(packageRecord, {
    action: "APPROVE", assetId: "asset-1", reviewedAt: "2026-09-30T00:00:00Z",
    briefVersion: packageRecord.briefVersion, reviewPackageSha256: packageRecord.reviewPackage.sha256
  }, operator);
  assert.equal(review.state, STATES.APPROVED);
  const stale = reviewConceptSet(packageRecord, {
    action: "APPROVE", assetId: "asset-1", reviewedAt: "2026-09-30T00:00:00Z",
    briefVersion: "prior", reviewPackageSha256: packageRecord.reviewPackage.sha256
  }, operator);
  assert.equal(stale.code, "COVER_REVIEW_STALE");
});

test("same runtime accepts another title and revisions need an earlier execution", async () => {
  const second = title({
    titleId: "6bd7e606-cb8d-4aab-a07b-0463536b9869",
    title: "Another Title",
    subtitle: "A Distinct Subtitle",
    authorityVersion: "SECOND-1"
  });
  assert.equal(prepareCreativeBrief(second).ok, true);
  const result = await generateConceptSet(second.titleId, {
    modelDeployment: "jm1-pub-cover-image-primary",
    loadTitleAuthority: async () => authorityCandidates(second),
    persistAuthoritySnapshot: async (bundle, executionId) => snapshot(bundle, executionId),
    reserveExecution: async () => ({ status: "ACQUIRED", executionId: EXECUTION_ID }),
    persistGenerationRequest: async (request) => request,
    completeExecution: async () => {},
    failExecution: async () => {},
    generateImage: async () => { throw new Error("should not generate"); },
    preflightConcept: async () => ({ passed: true })
  }, { feedback: ["More contrast"] });
  assert.equal(result.code, "REVISION_PARENT_REQUIRED");
});

test("generation refuses an unbound title authority response", async () => {
  const result = await generateConceptSet(TITLE_ID, {
    loadTitleAuthority: async () => authorityCandidates({ titleId: "6bd7e606-cb8d-4aab-a07b-0463536b9869" })
  });
  assert.equal(result.code, "COVER_AUTHORITY_UNRESOLVED");
});

test("failed generation records a retryable failure without a reviewable package", async () => {
  let failed;
  const result = await generateConceptSet(TITLE_ID, {
    modelDeployment: "jm1-pub-cover-image-primary",
    loadTitleAuthority: async () => authorityCandidates(),
    persistAuthoritySnapshot: async (bundle, executionId) => snapshot(bundle, executionId),
    reserveExecution: async () => ({ status: "ACQUIRED", executionId: EXECUTION_ID }),
    persistGenerationRequest: async (request) => request,
    completeExecution: async () => { throw new Error("should not complete"); },
    failExecution: async (_key, state) => { failed = state; },
    generateImage: async () => { throw new Error("provider unavailable"); },
    preflightConcept: async () => ({ passed: true })
  });
  assert.equal(result.code, "COVER_GENERATION_FAILED");
  assert.equal(failed.code, "COVER_GENERATION_FAILED");
});

test("missing durable request storage blocks the Foundry call", async () => {
  let providerCalls = 0;
  let failure;
  const result = await generateConceptSet(TITLE_ID, {
    modelDeployment: "jm1-pub-cover-image-primary",
    loadTitleAuthority: async () => authorityCandidates(),
    persistAuthoritySnapshot: async (bundle, executionId) => snapshot(bundle, executionId),
    reserveExecution: async () => ({ status: "ACQUIRED", executionId: EXECUTION_ID }),
    persistGenerationRequest: async () => null,
    completeExecution: async () => {},
    failExecution: async (_key, state) => { failure = state; },
    generateImage: async () => { providerCalls++; },
    preflightConcept: async () => ({ passed: true })
  });
  assert.equal(result.code, "COVER_GENERATION_REQUEST_NOT_PERSISTED");
  assert.equal(failure.code, result.code);
  assert.equal(providerCalls, 0);
});

test("changed authority after request persistence blocks Foundry before an image call", async () => {
  let reads = 0;
  let providerCalls = 0;
  const result = await generateConceptSet(TITLE_ID, {
    modelDeployment: "jm1-pub-cover-image-primary",
    loadTitleAuthority: async () => authorityCandidates(reads++ === 0 ? {} : { subtitle: "Changed subtitle" }),
    persistAuthoritySnapshot: async (bundle, executionId) => snapshot(bundle, executionId),
    reserveExecution: async () => ({ status: "ACQUIRED", executionId: EXECUTION_ID }),
    persistGenerationRequest: async (request) => request,
    completeExecution: async () => {},
    failExecution: async () => {},
    generateImage: async () => { providerCalls++; },
    preflightConcept: async () => ({ passed: true })
  });
  assert.equal(result.code, "COVER_AUTHORITY_STALE_BEFORE_GENERATION");
  assert.equal(providerCalls, 0);
});

test("missing or mismatched authority snapshot blocks the brief and Foundry call", async () => {
  let providerCalls = 0;
  let requestCalls = 0;
  const result = await generateConceptSet(TITLE_ID, {
    modelDeployment: "jm1-pub-cover-image-primary",
    loadTitleAuthority: async () => authorityCandidates(),
    reserveExecution: async () => ({ status: "ACQUIRED", executionId: EXECUTION_ID }),
    persistAuthoritySnapshot: async (bundle, executionId) => ({
      ...snapshot(bundle, executionId), authoritySha256: "c".repeat(64)
    }),
    persistGenerationRequest: async () => { requestCalls++; },
    completeExecution: async () => {}, failExecution: async () => {},
    generateImage: async () => { providerCalls++; }, preflightConcept: async () => ({ passed: true })
  });
  assert.equal(result.code, "COVER_AUTHORITY_SNAPSHOT_NOT_PERSISTED");
  assert.equal(requestCalls, 0);
  assert.equal(providerCalls, 0);
});

test("missing deployment identity blocks the Foundry call", async () => {
  let providerCalls = 0;
  const result = await generateConceptSet(TITLE_ID, {
    loadTitleAuthority: async () => authorityCandidates(),
    persistAuthoritySnapshot: async (bundle, executionId) => snapshot(bundle, executionId),
    reserveExecution: async () => ({ status: "ACQUIRED", executionId: EXECUTION_ID }),
    persistGenerationRequest: async (request) => request,
    completeExecution: async () => {},
    failExecution: async () => {},
    generateImage: async () => { providerCalls++; },
    preflightConcept: async () => ({ passed: true })
  });
  assert.equal(result.code, "COVER_IMAGE_DEPLOYMENT_NOT_CONFIGURED");
  assert.equal(providerCalls, 0);
});
