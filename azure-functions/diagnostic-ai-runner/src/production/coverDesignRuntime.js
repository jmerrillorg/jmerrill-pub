"use strict";

const { createHash } = require("node:crypto");
const { resolveCoverAuthorityBundle, projectCoverAuthority } = require("./coverAuthorityBundle");

const CONTRACT_VERSION = "OP-006-COVER-1.0";
const PROMPT_TEMPLATE_VERSION = "OP-006-ART-1.0";
const GUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const STATES = Object.freeze({
  BRIEF_READY: "BRIEF_READY",
  CONCEPTS_READY: "CONCEPTS_READY",
  AWAITING_REVIEW: "AWAITING_REVIEW",
  REVISION_REQUESTED: "REVISION_REQUESTED",
  APPROVED: "APPROVED",
  PRODUCTION_READY: "PRODUCTION_READY"
});

function value(input) {
  return typeof input === "string" ? input.trim() : "";
}

function textList(input) {
  return Array.isArray(input) ? input.map(value).filter(Boolean) : [];
}

function canonicalJson(input) {
  if (Array.isArray(input)) return `[${input.map(canonicalJson).join(",")}]`;
  if (input && typeof input === "object") {
    return `{${Object.keys(input).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(input[key])}`).join(",")}}`;
  }
  return JSON.stringify(input);
}

function digest(input) {
  return createHash("sha256").update(canonicalJson(input)).digest("hex");
}

function normalizeAuthority(source = {}) {
  const formats = [...new Set(textList(source.formatEntitlements).map((item) => item.toUpperCase()))].sort();
  const isbn = source.isbn || {};
  return {
    titleId: value(source.titleId),
    authorId: value(source.authorId),
    title: value(source.title),
    subtitle: value(source.subtitle),
    authorDisplay: value(source.authorDisplay),
    package: value(source.package).toUpperCase(),
    genre: value(source.genre),
    audience: value(source.audience),
    positioning: value(source.positioning),
    bookDescription: value(source.bookDescription),
    titleThemes: textList(source.titleThemes),
    imprint: value(source.imprint),
    trimSize: value(source.trimSize),
    pageCount: Number(source.pageCount),
    formatEntitlements: formats,
    isbn: { paperback: value(isbn.paperback), ebook: value(isbn.ebook) },
    marketContext: value(source.marketContext),
    titleRulings: textList(source.titleRulings),
    prohibitedVisuals: textList(source.prohibitedVisuals),
    preferences: textList(source.preferences),
    approvedBrandAssets: Array.isArray(source.approvedBrandAssets) ? source.approvedBrandAssets : [],
    authorityEvidenceId: value(source.authorityEvidenceId),
    authorityVersion: value(source.authorityVersion)
  };
}

function validateAuthority(authority) {
  const missing = [];
  for (const field of [
    "titleId", "authorId", "title", "subtitle", "authorDisplay", "package", "genre",
    "audience", "positioning", "bookDescription", "imprint", "trimSize",
    "marketContext", "authorityVersion", "authorityEvidenceId"
  ]) if (!authority[field]) missing.push(field);
  if (!GUID.test(authority.titleId)) missing.push("validTitleId");
  if (!GUID.test(authority.authorId)) missing.push("validAuthorId");
  if (!GUID.test(authority.authorityEvidenceId) && !/^[a-f0-9]{64}$/i.test(authority.authorityEvidenceId)) missing.push("validAuthorityEvidenceId");
  if (!Number.isInteger(authority.pageCount) || authority.pageCount < 1) missing.push("pageCount");
  if (authority.titleThemes.length === 0) missing.push("titleThemes");
  if (!authority.formatEntitlements.includes("PAPERBACK") && !authority.formatEntitlements.includes("EBOOK")) {
    missing.push("authorizedCoverFormat");
  }
  if (authority.formatEntitlements.includes("PAPERBACK") && !authority.isbn.paperback) missing.push("paperbackIsbn");
  if (authority.formatEntitlements.includes("EBOOK") && !authority.isbn.ebook) missing.push("ebookIsbn");
  if (authority.approvedBrandAssets.some((asset) => !value(asset.id) || !/^[a-f0-9]{64}$/i.test(value(asset.sha256)))) {
    missing.push("approvedBrandAssetIdentity");
  }
  return [...new Set(missing)];
}

function prepareCreativeBrief(source) {
  const authority = normalizeAuthority(source);
  const missing = validateAuthority(authority);
  if (missing.length) return { ok: false, code: "COVER_AUTHORITY_INCOMPLETE", missing };
  const authorityDigest = digest(authority);
  const brief = {
    contractVersion: CONTRACT_VERSION,
    titleId: authority.titleId,
    authorId: authority.authorId,
    title: authority.title,
    subtitle: authority.subtitle,
    authorDisplay: authority.authorDisplay,
    package: authority.package,
    category: authority.genre,
    audience: authority.audience,
    positioning: authority.positioning,
    description: authority.bookDescription,
    themes: authority.titleThemes,
    marketContext: authority.marketContext,
    imprint: authority.imprint,
    titleRulings: authority.titleRulings,
    prohibitedVisuals: authority.prohibitedVisuals,
    preferences: authority.preferences,
    approvedBrandAssets: authority.approvedBrandAssets,
    formats: authority.formatEntitlements,
    paperback: authority.formatEntitlements.includes("PAPERBACK") ? {
      trimSize: authority.trimSize,
      pageCount: authority.pageCount,
      isbn: authority.isbn.paperback
    } : null,
    ebook: authority.formatEntitlements.includes("EBOOK") ? { isbn: authority.isbn.ebook } : null,
    authorityVersion: authority.authorityVersion,
    authorityEvidenceId: authority.authorityEvidenceId,
    authorityDigest
  };
  return {
    ok: true,
    state: STATES.BRIEF_READY,
    brief: { ...brief, briefId: digest(brief) }
  };
}

function conceptPrompt(brief, index, feedback = []) {
  const direction = [
    "symbolic, restrained visual metaphor with a clear focal point",
    "human-centered editorial composition with a distinct silhouette",
    "typographic-led visual composition with subtle narrative detail"
  ][index];
  if (!direction) throw new Error("CONCEPT_INDEX_UNSUPPORTED");
  return [
    `Policy ${PROMPT_TEMPLATE_VERSION}. Produce original front-cover ARTWORK ONLY for a professional book cover.`,
    `Title context: ${brief.title}. Subtitle context: ${brief.subtitle}.`,
    `Category: ${brief.category}. Audience: ${brief.audience}. Positioning: ${brief.positioning}.`,
    `Book description: ${brief.description}. Themes: ${brief.themes.join("; ")}.`,
    `Market context: ${brief.marketContext}. Direction: ${direction}.`,
    `Publisher preferences: ${brief.preferences.join("; ") || "none recorded"}.`,
    `Title rulings: ${brief.titleRulings.join("; ") || "none recorded"}.`,
    `Prohibited visuals: ${brief.prohibitedVisuals.join("; ") || "none recorded"}.`,
    `Revision feedback: ${feedback.join("; ") || "first concept round"}.`,
    "No lettering, words, logos, awards, endorsements, review quotes, trademarks, or barcode in the generated image.",
    "Leave usable quiet space for publisher typesetting; preserve legibility at retail thumbnail size."
  ].join("\n");
}

function validateConceptResult(result) {
  return Boolean(
    result && value(result.assetId) && /^[a-f0-9]{64}$/i.test(value(result.sha256)) &&
    Number.isInteger(result.width) && Number.isInteger(result.height) &&
    result.width >= 1024 && result.height >= 1024 && value(result.location) &&
    result.safetyPassed === true
  );
}

async function generateConceptSet(titleId, deps, options = {}) {
  if (!GUID.test(value(titleId))) return { ok: false, code: "COVER_TITLE_ID_REQUIRED" };
  if (!deps || typeof deps.loadTitleAuthority !== "function") {
    return { ok: false, code: "COVER_TITLE_AUTHORITY_READER_NOT_CONFIGURED" };
  }
  const candidates = await deps.loadTitleAuthority(titleId);
  const resolved = resolveCoverAuthorityBundle(titleId, candidates, { executionMode: "INTERNAL_CONCEPT" });
  if (!resolved.ok) return resolved;
  if (typeof deps.reserveExecution !== "function" || typeof deps.persistAuthoritySnapshot !== "function" ||
      typeof deps.persistGenerationRequest !== "function" ||
      typeof deps.completeExecution !== "function" ||
      typeof deps.failExecution !== "function" ||
      typeof deps.generateImage !== "function" || typeof deps.preflightConcept !== "function") {
    return { ok: false, code: "COVER_RUNTIME_NOT_COMMISSIONED" };
  }
  const count = options.count === 3 ? 3 : 2;
  const feedback = textList(options.feedback);
  const revisionOf = value(options.revisionOf);
  if (feedback.length && !revisionOf) return { ok: false, code: "REVISION_PARENT_REQUIRED" };
  const key = digest({ titleId, authorityDigest: resolved.bundle.sha256, count, feedback, revisionOf, promptVersion: PROMPT_TEMPLATE_VERSION });
  const reservation = await deps.reserveExecution(key);
  if (!reservation || !["ACQUIRED", "EXISTING", "IN_PROGRESS"].includes(reservation.status)) {
    return { ok: false, code: "COVER_EXECUTION_RESERVATION_FAILED" };
  }
  if (reservation.status === "EXISTING") return { ...reservation.record, replay: true };
  if (reservation.status === "IN_PROGRESS") return { ok: false, code: "COVER_EXECUTION_IN_PROGRESS", idempotencyKey: key };
  if (!GUID.test(value(reservation.executionId))) return { ok: false, code: "COVER_EXECUTION_RESERVATION_INVALID" };
  const executionId = reservation.executionId;
  try {
    const authoritySnapshot = await deps.persistAuthoritySnapshot(resolved.bundle, executionId);
    if (!authoritySnapshot || authoritySnapshot.titleId !== titleId ||
        authoritySnapshot.executionId !== executionId ||
        authoritySnapshot.authoritySha256 !== resolved.bundle.sha256 ||
        !/^[a-f0-9]{64}$/i.test(value(authoritySnapshot.snapshotId))) {
      throw new Error("COVER_AUTHORITY_SNAPSHOT_NOT_PERSISTED");
    }
    const prepared = prepareCreativeBrief(projectCoverAuthority(resolved.bundle));
    if (!prepared.ok) throw new Error("COVER_AUTHORITY_BUNDLE_INVALID");
    const brief = prepared.brief;
    const request = {
      titleId: brief.titleId,
      authorId: brief.authorId,
      executionId,
      idempotencyKey: key,
      creativeBriefId: brief.briefId,
      creativeBriefVersion: brief.authorityDigest,
      authoritySnapshotId: authoritySnapshot.snapshotId,
      authoritySnapshotSha256: authoritySnapshot.authoritySha256,
      promptContractVersion: PROMPT_TEMPLATE_VERSION,
      modelDeployment: value(deps.modelDeployment),
      requestedVariantCount: count,
      requestedAt: new Date().toISOString(),
      revisionOf: revisionOf || null
    };
    if (!request.modelDeployment) throw new Error("COVER_IMAGE_DEPLOYMENT_NOT_CONFIGURED");
    const persisted = await deps.persistGenerationRequest(request);
    if (!persisted || persisted.executionId !== executionId || persisted.idempotencyKey !== key ||
        persisted.titleId !== brief.titleId || persisted.creativeBriefVersion !== brief.authorityDigest) {
      throw new Error("COVER_GENERATION_REQUEST_NOT_PERSISTED");
    }
    const currentCandidates = await deps.loadTitleAuthority(titleId);
    const currentAuthority = resolveCoverAuthorityBundle(titleId, currentCandidates, { executionMode: "INTERNAL_CONCEPT" });
    if (!currentAuthority.ok || currentAuthority.bundle.sha256 !== resolved.bundle.sha256) {
      throw new Error("COVER_AUTHORITY_STALE_BEFORE_GENERATION");
    }
    const concepts = [];
    for (let index = 0; index < count; index++) {
      const prompt = conceptPrompt(brief, index, feedback);
      const generated = await deps.generateImage({
        titleId: brief.titleId,
        executionId,
        prompt,
        promptTemplateVersion: PROMPT_TEMPLATE_VERSION,
        direction: index + 1
      });
      if (!validateConceptResult(generated)) throw new Error("COVER_IMAGE_RESULT_INVALID");
      const preflight = await deps.preflightConcept({ generated, brief, prompt });
      if (!preflight || preflight.passed !== true || !value(preflight.evidenceId)) {
        throw new Error("COVER_CONCEPT_PREFLIGHT_FAILED");
      }
      concepts.push({
        label: String.fromCharCode(65 + index),
        assetId: generated.assetId,
        location: generated.location,
        sha256: generated.sha256,
        width: generated.width,
        height: generated.height,
        provider: generated.provider,
        model: generated.model,
        modelVersion: generated.modelVersion,
        safetyEvidenceId: generated.safetyEvidenceId,
        preflightEvidenceId: preflight.evidenceId,
        rationale: preflight.rationale
      });
    }
    const record = {
      ok: true,
      state: STATES.CONCEPTS_READY,
      titleId: brief.titleId,
      authorId: brief.authorId,
      executionId,
      idempotencyKey: key,
      generationRequest: request,
      brief,
      briefVersion: brief.authorityDigest,
      promptTemplateVersion: PROMPT_TEMPLATE_VERSION,
      revisionOf: revisionOf || null,
      concepts,
      generatedAt: new Date().toISOString(),
      approval: null
    };
    await deps.completeExecution(key, record);
    return record;
  } catch (error) {
    const code = /^COVER_[A-Z_]+$/.test(error?.message || "") ? error.message : "COVER_GENERATION_FAILED";
    await deps.failExecution(key, { executionId, code });
    return { ok: false, code, executionId };
  }
}

async function prepareReviewPackage(record, deps) {
  if (!record || record.state !== STATES.CONCEPTS_READY || !Array.isArray(record.concepts) ||
      record.concepts.length < 2 || record.concepts.length > 3) {
    return { ok: false, code: "COVER_CONCEPT_SET_NOT_READY" };
  }
  if (!deps || typeof deps.composeReviewPackage !== "function" ||
      typeof deps.preflightReviewPackage !== "function" || typeof deps.saveReviewPackage !== "function" ||
      typeof deps.readCurrentAuthorityDigest !== "function") {
    return { ok: false, code: "COVER_REVIEW_RUNTIME_NOT_COMMISSIONED" };
  }
  const currentDigest = await deps.readCurrentAuthorityDigest(record.titleId);
  if (currentDigest !== record.briefVersion) return { ok: false, code: "COVER_REVIEW_AUTHORITY_STALE" };
  const reviewPackage = await deps.composeReviewPackage({
    titleId: record.titleId,
    brief: record.brief,
    concepts: record.concepts
  });
  if (!reviewPackage || !value(reviewPackage.assetId) ||
      !/^[a-f0-9]{64}$/i.test(value(reviewPackage.sha256)) || !value(reviewPackage.location)) {
    return { ok: false, code: "COVER_REVIEW_PACKAGE_INVALID" };
  }
  const preflight = await deps.preflightReviewPackage({ record, reviewPackage });
  if (!preflight || preflight.passed !== true || !value(preflight.evidenceId)) {
    return { ok: false, code: "COVER_REVIEW_PACKAGE_PREFLIGHT_FAILED" };
  }
  const result = {
    ...record,
    state: STATES.AWAITING_REVIEW,
    reviewPackage: {
      assetId: reviewPackage.assetId,
      sha256: reviewPackage.sha256,
      location: reviewPackage.location,
      preflightEvidenceId: preflight.evidenceId
    }
  };
  const saved = await deps.saveReviewPackage(result);
  if (!saved || saved.titleId !== result.titleId || saved.briefVersion !== result.briefVersion ||
      saved.reviewPackage?.sha256 !== result.reviewPackage.sha256 || saved.state !== STATES.AWAITING_REVIEW) {
    return { ok: false, code: "COVER_REVIEW_PACKAGE_READBACK_FAILED" };
  }
  return saved;
}

function reviewConceptSet(record, decision, operator) {
  if (!record || record.state !== STATES.AWAITING_REVIEW || !record.reviewPackage || !Array.isArray(record.concepts)) {
    return { ok: false, code: "COVER_REVIEW_NOT_CURRENT" };
  }
  if (!operator || operator.authenticated !== true || operator.coverReviewAuthorized !== true ||
      !GUID.test(value(operator.reviewerId)) || !decision || !value(decision.reviewedAt)) {
    return { ok: false, code: "HUMAN_REVIEW_AUTHORITY_REQUIRED" };
  }
  if (decision.briefVersion !== record.briefVersion ||
      decision.reviewPackageSha256 !== record.reviewPackage.sha256) {
    return { ok: false, code: "COVER_REVIEW_STALE" };
  }
  if (decision.action === "APPROVE") {
    const selected = record.concepts.find((concept) => concept.assetId === decision.assetId);
    if (!selected) return { ok: false, code: "CONCEPT_NOT_IN_CURRENT_SET" };
    return { ok: true, state: STATES.APPROVED, selectedAssetId: selected.assetId, reviewerId: operator.reviewerId, reviewedAt: decision.reviewedAt };
  }
  if (decision.action === "REQUEST_REVISION" && textList(decision.feedback).length) {
    return { ok: true, state: STATES.REVISION_REQUESTED, feedback: textList(decision.feedback), reviewerId: operator.reviewerId, reviewedAt: decision.reviewedAt };
  }
  return { ok: false, code: "COVER_REVIEW_DECISION_INVALID" };
}

module.exports = {
  CONTRACT_VERSION,
  PROMPT_TEMPLATE_VERSION,
  STATES,
  prepareCreativeBrief,
  conceptPrompt,
  generateConceptSet,
  prepareReviewPackage,
  reviewConceptSet
};
