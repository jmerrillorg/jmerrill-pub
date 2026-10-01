"use strict";

const { createHash } = require("node:crypto");
const { PRODUCT_FORM_REGISTRY } = require("./productionPipelineV2Doctrine");

const STAGE_ID = "13_PRODUCTION";
const CHANGE_EVENT = "CANONICAL_PRODUCTION_EVIDENCE_CHANGED";
const READY_EVENT = "STAGE_13_PRODUCTION_PREFLIGHT_READY";
const GUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SHA256 = /^[a-f0-9]{64}$/i;
const ARTIFACT_ROLES = Object.freeze({
  "PF-01": ["PRINT_INTERIOR", "PAPERBACK_FULL_WRAP_COVER"],
  "PF-02": ["HARDCOVER_COMPATIBLE_INTERIOR", "HARDCOVER_SPECIFIC_COVER"],
  "PF-03": ["STANDARD_REFLOWABLE_EPUB_3", "EBOOK_COVER"],
  "PF-05": ["SEPARATELY_DESIGNED_INTERIOR", "EDITION_SPECIFIC_COVER"],
  "PF-06": ["COMPLEX_ACCESSIBILITY_EDITION", "EDITION_SPECIFIC_COVER"]
});

function value(input) {
  return typeof input === "string" ? input.trim() : "";
}

function isCurrent(record) {
  return record && record.current === true && value(record.evidenceId) && value(record.version);
}

function validIsbn13(input) {
  const isbn = value(input).replace(/[- ]/g, "");
  if (!/^\d{13}$/.test(isbn)) return false;
  const sum = [...isbn.slice(0, 12)].reduce((total, digit, index) => total + Number(digit) * (index % 2 ? 3 : 1), 0);
  return (10 - (sum % 10)) % 10 === Number(isbn[12]);
}

function evaluateStage13Preflight(snapshot) {
  const blockers = new Set();
  const titleId = value(snapshot?.titleId);
  const authorId = value(snapshot?.authorId);
  const revision = value(snapshot?.sourceRevision);
  const entitlements = snapshot?.entitlements;
  const artifacts = Array.isArray(snapshot?.artifacts) ? snapshot.artifacts : [];
  const identifiers = Array.isArray(snapshot?.identifiers) ? snapshot.identifiers : [];
  const metadata = Array.isArray(snapshot?.retailMetadata) ? snapshot.retailMetadata : [];
  const rights = Array.isArray(snapshot?.rights) ? snapshot.rights : [];
  const formatResults = [];
  const usedIsbns = new Map();
  const proof = snapshot?.proofArtifact;
  const approval = snapshot?.proofApproval;

  if (!GUID.test(titleId)) blockers.add("TITLE_ID_INVALID");
  if (!GUID.test(authorId)) blockers.add("AUTHOR_ID_INVALID");
  if (snapshot?.stageId !== STAGE_ID) blockers.add("STAGE_13_NOT_CURRENT");
  if (!revision || !value(snapshot?.sourceReadAt) || !Number.isFinite(Date.parse(snapshot.sourceReadAt))) blockers.add("CANONICAL_SNAPSHOT_NOT_VERSIONED");
  if (!Array.isArray(entitlements) || entitlements.length === 0) blockers.add("ENTITLEMENTS_NOT_RESOLVED");
  if (snapshot?.entitlementsComplete !== true) blockers.add("ENTITLEMENTS_NOT_CERTIFIED_COMPLETE");
  if (!isCurrent(proof) || proof.titleId !== titleId || proof.authorId !== authorId ||
      !SHA256.test(value(proof.checksum)) || proof.qaStatus !== "PASS" ||
      !isCurrent(approval) || approval.titleId !== titleId || approval.authorId !== authorId ||
      approval.status !== "APPROVED" || approval.artifactId !== proof.artifactId ||
      approval.version !== proof.version || approval.checksum !== proof.checksum) {
    blockers.add("EXACT_PROOF_APPROVAL_MISSING");
  }

  const seenFormats = new Set();
  for (const entitlement of Array.isArray(entitlements) ? entitlements : []) {
    const format = value(entitlement?.productFormCode);
    const missing = new Set();
    if (!format || seenFormats.has(format)) {
      blockers.add("ENTITLEMENT_FORMAT_DUPLICATE_OR_INVALID");
      continue;
    }
    seenFormats.add(format);
    if (entitlement?.titleId !== titleId || entitlement?.authorId !== authorId || !isCurrent(entitlement) || entitlement.status !== "AUTHORIZED") {
      missing.add("ENTITLEMENT_AUTHORITY");
    }
    if (!PRODUCT_FORM_REGISTRY[format]) missing.add("PRODUCT_FORM_NOT_REGISTERED");
    const roles = ARTIFACT_ROLES[format];
    if (!roles) missing.add("FORMAT_PRODUCTION_CONTRACT_NOT_IMPLEMENTED");

    const formatRights = rights.filter((record) => record?.productFormCode === format && record?.titleId === titleId);
    if (formatRights.length !== 1 || !isCurrent(formatRights[0]) || formatRights[0].authorId !== authorId || formatRights[0].status !== "CLEARED" || !value(formatRights[0].territories)) {
      missing.add("RIGHTS_AUTHORITY");
    }

    const formatIds = identifiers.filter((record) => record?.productFormCode === format && record?.titleId === titleId);
    if (formatIds.length !== 1 || !isCurrent(formatIds[0]) || formatIds[0].authorId !== authorId || !validIsbn13(formatIds[0].isbn13) || !value(formatIds[0].sourceAuthority)) {
      missing.add("ISBN_AUTHORITY");
    } else {
      const isbn = formatIds[0].isbn13.replace(/[- ]/g, "");
      if (usedIsbns.has(isbn) && usedIsbns.get(isbn) !== format) missing.add("CROSS_FORMAT_ISBN_REUSE");
      usedIsbns.set(isbn, format);
    }

    const formatMetadata = metadata.filter((record) => record?.productFormCode === format && record?.titleId === titleId);
    if (formatMetadata.length !== 1 || !isCurrent(formatMetadata[0]) || formatMetadata[0].authorId !== authorId || formatMetadata[0].status !== "READY" ||
      !value(formatMetadata[0].title) || !value(formatMetadata[0].authorByline) || !value(formatMetadata[0].description) ||
      !value(formatMetadata[0].language) || !value(formatMetadata[0].currency) ||
      !Number.isFinite(formatMetadata[0].price) || formatMetadata[0].price < 0 ||
      !Array.isArray(formatMetadata[0].subjects) || formatMetadata[0].subjects.length === 0 ||
      value(formatMetadata[0].isbn13).replace(/[- ]/g, "") !== value(formatIds[0]?.isbn13).replace(/[- ]/g, "")) {
      missing.add("RETAIL_METADATA");
    }

    for (const role of roles || []) {
      const matches = artifacts.filter((artifact) => artifact?.productFormCode === format && artifact?.role === role && artifact?.titleId === titleId && artifact?.authorId === authorId && artifact?.current === true);
      if (matches.length !== 1 || !isCurrent(matches[0]) || !SHA256.test(value(matches[0].checksum)) ||
        !value(matches[0].repositoryPath).includes("/JM1-PUB/01_Pipeline_A-Z/") ||
        matches[0].qaStatus !== "PASS" || !value(matches[0].qaEvidenceId) || matches[0].qaChecksum !== matches[0].checksum ||
        matches[0].approvalStatus !== "APPROVED" || !value(matches[0].approvalEvidenceId) || matches[0].approvedChecksum !== matches[0].checksum) {
        missing.add(`ARTIFACT_${role}`);
      }
    }
    const qa = entitlement?.qa;
    if (!isCurrent(qa) || qa.status !== "PASS" || qa.titleId !== titleId || qa.productFormCode !== format) missing.add("FORMAT_QA");
    if (entitlement?.distributionAuthority !== "PASS") missing.add("DISTRIBUTION_AUTHORITY");
    for (const item of missing) blockers.add(`${format}:${item}`);
    formatResults.push({ productFormCode: format, ready: missing.size === 0, blockers: [...missing].sort() });
  }

  return {
    ready: blockers.size === 0,
    stageId: STAGE_ID,
    titleId,
    authorId,
    sourceRevision: revision,
    formatResults,
    blockers: [...blockers].sort()
  };
}

function readinessKey(result) {
  return createHash("sha256").update(JSON.stringify({ stageId: STAGE_ID, titleId: result.titleId, sourceRevision: result.sourceRevision })).digest("hex");
}

async function onCanonicalProductionEvidenceChanged(event, { loadSnapshot, publishIfAbsent } = {}) {
  if (event?.eventType !== CHANGE_EVENT || !GUID.test(value(event.titleId)) || !value(event.sourceRevision)) {
    return { status: "IGNORED_INVALID_EVENT", published: false };
  }
  if (typeof loadSnapshot !== "function" || typeof publishIfAbsent !== "function") throw new TypeError("Canonical reader and atomic idempotent publisher are required");
  const snapshot = await loadSnapshot(event.titleId);
  if (snapshot?.titleId !== event.titleId || snapshot?.sourceRevision !== event.sourceRevision) {
    return { status: "STALE_OR_CROSS_TITLE_EVENT", published: false };
  }
  const preflight = evaluateStage13Preflight(snapshot);
  if (!preflight.ready) return { status: "PREFLIGHT_BLOCKED", published: false, preflight };
  const readinessEvent = {
    eventType: READY_EVENT,
    titleId: preflight.titleId,
    authorId: preflight.authorId,
    stageId: STAGE_ID,
    sourceRevision: preflight.sourceRevision,
    productFormCodes: preflight.formatResults.map((item) => item.productFormCode).sort(),
    idempotencyKey: readinessKey(preflight)
  };
  const result = await publishIfAbsent(readinessEvent);
  if (result?.persisted !== true && result?.duplicate !== true) throw new Error("STAGE_13_READY_EVENT_NOT_DURABLE");
  return { status: result.duplicate ? "ALREADY_PUBLISHED" : "READY_EVENT_PUBLISHED", published: !result.duplicate, preflight, readinessEvent };
}

module.exports = { STAGE_ID, CHANGE_EVENT, READY_EVENT, evaluateStage13Preflight, onCanonicalProductionEvidenceChanged, validIsbn13 };
