"use strict";

const { digest } = require("./coverAuthorityBundle");

const GUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SHA256 = /^[a-f0-9]{64}$/i;
const RULE_VERSION = "COVER-INTERNAL-CATEGORY-1";
const SOURCE_TYPES = new Set(["CONTROLLING_MANUSCRIPT", "EDITORIAL_REVIEW", "TITLE_POSITIONING_DRAFT", "RETAIL_METADATA_DRAFT"]);

// This is a deliberately narrow creative-working label, not a BISAC classifier.
function classify(text) {
  const normalized = String(text || "").toLowerCase();
  const christian = /\b(christ|christian|scripture|biblical)\b/.test(normalized);
  const spiritual = /\b(faith|god|spiritual|purpose|obedience)\b/.test(normalized);
  const nonfiction = /\b(reflection|encouragement|life|calling|character)\b/.test(normalized);
  return christian && spiritual && nonfiction ? "Christian Living / Spiritual Growth" : null;
}

function deriveInternalCoverCategory(titleId, evidence, options = {}) {
  const verifiedAt = options.now || new Date().toISOString();
  if (!GUID.test(titleId) || !Number.isFinite(Date.parse(verifiedAt)) || !Array.isArray(evidence)) {
    return { ok: false, code: "COVER_INTERNAL_CATEGORY_INPUT_INVALID" };
  }
  const sources = evidence.filter((item) => item && item.titleId === titleId && item.current === true &&
    SOURCE_TYPES.has(item.sourceType) && typeof item.sourceId === "string" && item.sourceId.length > 0 &&
    typeof item.sourceVersion === "string" && item.sourceVersion.length > 0 &&
    SHA256.test(item.sourceChecksum || "") && typeof item.text === "string" &&
    item.text.trim().length > 0 && Number.isFinite(Date.parse(item.lastVerified)) &&
    Math.abs(Date.parse(verifiedAt) - Date.parse(item.lastVerified)) <= 15 * 60 * 1000);
  if (!sources.length) return { ok: false, code: "COVER_INTERNAL_CATEGORY_EVIDENCE_MISSING" };
  const classifications = sources.map((source) => ({ source, category: classify(source.text) })).filter((item) => item.category);
  if (!classifications.length) return { ok: false, code: "COVER_INTERNAL_CATEGORY_UNRESOLVED" };
  const categories = new Set(classifications.map((item) => item.category));
  if (categories.size !== 1) return { ok: false, code: "COVER_INTERNAL_CATEGORY_CONFLICT" };
  const chosen = classifications.map((item) => item.source).sort((a, b) => a.sourceId.localeCompare(b.sourceId));
  const value = classifications[0].category;
  const sourceIds = chosen.map((item) => item.sourceId);
  const sourceVersions = chosen.map((item) => item.sourceVersion);
  const sourceChecksums = chosen.map((item) => item.sourceChecksum);
  const sourceId = digest({ titleId, value, sourceIds, sourceVersions, sourceChecksums, rule: RULE_VERSION });
  return { ok: true, candidate: {
    field: "genre", value, titleId, sourceType: "SYSTEM_DERIVED_INTERNAL_COVER_CATEGORY",
    authorityClass: "SYSTEM_DERIVED_GOVERNED_INTERNAL", sourceId, sourceVersion: RULE_VERSION,
    sourceChecksum: sourceId, sourceIds, sourceVersions, sourceChecksums,
    derivationRule: RULE_VERSION, confidence: chosen.some((item) => item.sourceType === "CONTROLLING_MANUSCRIPT") ? 0.9 : 0.75,
    current: true, lastVerified: verifiedAt
  } };
}

module.exports = { RULE_VERSION, classify, deriveInternalCoverCategory };
