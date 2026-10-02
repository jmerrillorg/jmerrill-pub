"use strict";

const { createHash } = require("node:crypto");
const SKUS = new Set(["SHORT", "STANDARD", "EXTENDED", "PREMIUM", "ANTHOLOGY"].map(s => `JMP-GHOST-${s}`));
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const HASH = /^[0-9a-f]{64}$/;
function requireValue(condition, code) {
  if (!condition) throw Object.assign(new Error(code), { safeCode: code });
}
function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object") return Object.fromEntries(Object.keys(value).sort().map(k => [k, canonical(value[k])]));
  return value;
}
function digest(value) { return createHash("sha256").update(JSON.stringify(canonical(value))).digest("hex"); }
function reference(value) { return typeof value === "string" && value.trim().length > 0; }
function documentBound(document) {
  return document && typeof document.id === "string" && document.id.length > 0 &&
    typeof document.version === "string" && document.version.length > 0 && HASH.test(document.sha256);
}
function sameIdentity(row, engagement) {
  return row && ["authorId", "contactId", "titleId"].every(k =>
    UUID.test(row[k]) && row[k].toLowerCase() === engagement[k].toLowerCase()) && row.ghostwritingEngagementId === engagement.id;
}

// Reader output only: never bind approval booleans or decisions from an HTTP request.
// This prepares an owner request, not a stage event, enrollment, send or payment.
function prepareGhostwritingCompletion(authority) {
  const { engagement: e, terms, executed, manuscript: m, acceptance: a, clearance, election } = authority || {};
  requireValue(e && UUID.test(e.id) && ["authorId", "contactId", "titleId"].every(k => UUID.test(e[k])) && SKUS.has(e.sku) &&
    Array.isArray(e.authorizedReviewerIds) && e.authorizedReviewerIds.length > 0 && e.authorizedReviewerIds.every(reference), "GHOSTWRITING_IDENTITY_INVALID");
  requireValue(terms?.status === "APPROVED" && terms.registryStatus === "ACTIVE" && documentBound(terms) &&
    reference(terms.founderApprovalId) && reference(terms.legalApprovalId) && Array.isArray(terms.applicableSkus) && terms.applicableSkus.includes(e.sku), "GHOSTWRITING_TERMS_NOT_APPROVED");
  requireValue(sameIdentity(executed, e) && executed.status === "EXECUTED" && documentBound(executed.agreement) &&
    documentBound(executed.sow) && executed.termsId === terms.id && executed.termsVersion === terms.version && executed.termsSha256 === terms.sha256,
  "GHOSTWRITING_EXECUTED_TERMS_MISMATCH");
  requireValue(sameIdentity(m, e) && documentBound(m) && m.current === true && typeof m.governedLocationId === "string" && m.governedLocationId.length > 0,
    "GHOSTWRITING_MANUSCRIPT_NOT_CURRENT");
  requireValue(sameIdentity(a, e) && typeof a.id === "string" && a.id.length > 0 && a.decision === "ACCEPT" && a.revoked === false &&
    a.manuscriptId === m.id && a.manuscriptVersion === m.version && a.manuscriptSha256 === m.sha256 &&
    typeof a.actorId === "string" && e.authorizedReviewerIds?.includes(a.actorId) &&
    typeof a.recordedAt === "string" && Number.isFinite(Date.parse(a.recordedAt)), "GHOSTWRITING_ACCEPTANCE_NOT_PROVEN");
  requireValue(sameIdentity(clearance, e) && clearance.rights === "PASS" && clearance.payment === "PASS" &&
    clearance.manuscriptSha256 === m.sha256 && clearance.termsSha256 === terms.sha256 &&
    typeof clearance.evidenceId === "string" && clearance.evidenceId.length > 0, "GHOSTWRITING_CLEARANCE_REQUIRED");
  requireValue(sameIdentity(election, e) && typeof election.id === "string" && election.id.length > 0 &&
    election.revoked === false && e.authorizedReviewerIds.includes(election.actorId) &&
    ["GHOSTWRITING_ONLY", "PUBLISHING_INTAKE"].includes(election.path), "GHOSTWRITING_PATH_ELECTION_REQUIRED");
  const destination = authority.destination;
  if (election.path === "PUBLISHING_INTAKE") {
    requireValue(sameIdentity(destination, e) && UUID.test(destination.intakeId) && destination.ownerVerified === true &&
      (destination.publishingEngagementId === null || UUID.test(destination.publishingEngagementId)), "GHOSTWRITING_INTAKE_OWNER_BINDING_REQUIRED");
  } else {
    requireValue(destination == null, "GHOSTWRITING_ONLY_CANNOT_ENROLL");
  }
  const request = {
    schemaVersion: 1,
    ghostwritingEngagementId: e.id, authorId: e.authorId.toLowerCase(), contactId: e.contactId.toLowerCase(), titleId: e.titleId.toLowerCase(),
    sku: e.sku, acceptanceId: a.id, electionId: election.id, path: election.path,
    terms: { id: terms.id, version: terms.version, sha256: terms.sha256 },
    agreement: executed.agreement, sow: executed.sow,
    manuscript: { id: m.id, version: m.version, sha256: m.sha256, governedLocationId: m.governedLocationId },
    clearanceEvidenceId: clearance.evidenceId,
    destination: destination ? { intakeId: destination.intakeId, publishingEngagementId: destination.publishingEngagementId } : null,
    owner: destination ? "PUBLISHING_INTAKE_OWNER" : "GHOSTWRITING_COMPLETION_OWNER",
    stageAdvancementAuthorized: false, publishingAgreementImplied: false
  };
  // Keep semantic identity separate from payload fingerprint: altered replay is denied.
  return { status: "PREPARED_NOT_EXECUTED", idempotencyKey: `ghostwriting-completion:${e.id.toLowerCase()}:${a.id}`,
    payloadSha256: digest(request), request };
}

async function readGhostwritingCompletion(engagementId, deps = {}) {
  requireValue(UUID.test(engagementId), "GHOSTWRITING_IDENTITY_INVALID");
  requireValue(typeof deps.readCanonicalAuthority === "function", "GHOSTWRITING_AUTHORITY_READER_REQUIRED");
  const authority = await deps.readCanonicalAuthority(engagementId);
  requireValue(authority?.engagement?.id?.toLowerCase() === engagementId.toLowerCase(), "GHOSTWRITING_READER_IDENTITY_MISMATCH");
  return prepareGhostwritingCompletion(authority);
}

function checkGhostwritingCompletionReplay(plan, persisted) {
  requireValue(plan?.status === "PREPARED_NOT_EXECUTED" && plan.payloadSha256 === digest(plan.request), "GHOSTWRITING_PLAN_TAMPERED");
  requireValue(UUID.test(plan.request?.ghostwritingEngagementId) && reference(plan.request?.acceptanceId) &&
    plan.idempotencyKey === `ghostwriting-completion:${plan.request.ghostwritingEngagementId.toLowerCase()}:${plan.request.acceptanceId}`,
  "GHOSTWRITING_PLAN_TAMPERED");
  if (!persisted) return "NEW";
  requireValue(persisted.idempotencyKey === plan.idempotencyKey && persisted.payloadSha256 === plan.payloadSha256,
    "GHOSTWRITING_ALTERED_REPLAY_DENIED");
  return "REPLAY";
}

module.exports = { prepareGhostwritingCompletion, readGhostwritingCompletion, checkGhostwritingCompletionReplay };
