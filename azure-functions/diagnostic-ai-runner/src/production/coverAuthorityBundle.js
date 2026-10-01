"use strict";

const { createHash } = require("node:crypto");

const GUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SHA256 = /^[a-f0-9]{64}$/i;
const MAX_READ_AGE_MS = 15 * 60 * 1000;
const AUTHORITY = Object.freeze({
  authorId: ["TITLE_AUTHOR_BINDING"],
  title: ["TITLE_RECORD"],
  subtitle: ["TITLE_RECORD"],
  authorDisplay: ["TITLE_RECORD"],
  genre: ["APPROVED_CATEGORY", "APPROVED_EDITORIAL_POSITIONING"],
  audience: ["AUTHOR_ONBOARDING", "APPROVED_EDITORIAL_POSITIONING", "SYSTEM_DERIVED_INTERNAL_CREATIVE"],
  bookDescription: ["APPROVED_RETAIL_DESCRIPTION", "APPROVED_MARKETING_DESCRIPTION", "SYSTEM_DERIVED_INTERNAL_CREATIVE"],
  positioning: ["APPROVED_EDITORIAL_POSITIONING", "SYSTEM_DERIVED_INTERNAL_CREATIVE"],
  titleThemes: ["APPROVED_EDITORIAL_POSITIONING", "SYSTEM_DERIVED_INTERNAL_CREATIVE"],
  package: ["EXECUTED_AGREEMENT", "GOVERNED_PACKAGE_ELECTION"],
  formatEntitlements: ["EXECUTED_AGREEMENT", "GOVERNED_FORMAT_ENTITLEMENT"],
  trimSize: ["AUTHOR_ONBOARDING", "CURRENT_INTERIOR_PROOF"],
  pageCount: ["CURRENT_INTERIOR_PROOF"],
  isbn: ["GOVERNED_IDENTIFIER_RECORD"],
  imprint: ["TITLE_RECORD", "APPROVED_EDITORIAL_POSITIONING"],
  marketContext: ["APPROVED_CATEGORY", "SYSTEM_DERIVED_INTERNAL_CREATIVE"],
  preferences: ["AUTHOR_PROFILE"],
  titleRulings: ["TITLE_RULING"],
  prohibitedVisuals: ["TITLE_RULING", "COVER_POLICY"],
  approvedBrandAssets: ["BRAND_ASSET_REGISTRY"]
});

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

function validValue(field, input) {
  if (field === "authorId") return typeof input === "string" && GUID.test(input);
  if (["titleThemes", "formatEntitlements", "preferences", "titleRulings", "prohibitedVisuals", "approvedBrandAssets"].includes(field)) {
    return Array.isArray(input) && (field === "titleThemes" || field === "formatEntitlements" ? input.length > 0 : true);
  }
  if (field === "pageCount") return Number.isInteger(input) && input > 0;
  if (field === "isbn") return input && typeof input === "object" && !Array.isArray(input) &&
    Object.values(input).length > 0 && Object.values(input).every((value) => typeof value === "string" && /^97[89][0-9]{10}$/.test(value));
  return typeof input === "string" && input.trim().length > 0;
}

function validAuthorityClass(item) {
  if (["APPROVED_CATEGORY", "APPROVED_EDITORIAL_POSITIONING", "APPROVED_RETAIL_DESCRIPTION",
    "APPROVED_MARKETING_DESCRIPTION", "BRAND_ASSET_REGISTRY", "TITLE_RULING"].includes(item.sourceType)) {
    return ["AUTHOR_APPROVED", "PUBLISHER_APPROVED"].includes(item.authorityClass);
  }
  if (item.sourceType === "SYSTEM_DERIVED_INTERNAL_CREATIVE") {
    return item.authorityClass === "SYSTEM_DERIVED_GOVERNED";
  }
  return ["CANONICAL_RECORD", "AUTHOR_APPROVED", "PUBLISHER_APPROVED"].includes(item.authorityClass);
}

function resolveCoverAuthorityBundle(titleId, candidates, options = {}) {
  const now = options.now || new Date().toISOString();
  const nowMs = Date.parse(now);
  if (!GUID.test(titleId) || !Number.isFinite(nowMs) || !Array.isArray(candidates)) {
    return { ok: false, code: "COVER_AUTHORITY_INPUT_INVALID" };
  }
  const fields = {};
  const missing = [];
  const conflicts = [];
  for (const [field, priority] of Object.entries(AUTHORITY)) {
    const relevant = candidates.filter((item) => item.field === field && item.current === true && item.titleId === titleId &&
      priority.includes(item.sourceType) && validValue(field, item.value) && item.sourceId && item.sourceVersion &&
      validAuthorityClass(item) &&
      Number.isFinite(Date.parse(item.lastVerified)) && Math.abs(nowMs - Date.parse(item.lastVerified)) <= MAX_READ_AGE_MS &&
      (!item.sourceChecksum || SHA256.test(item.sourceChecksum)) &&
      (!["CURRENT_INTERIOR_PROOF", "BRAND_ASSET_REGISTRY"].includes(item.sourceType) || SHA256.test(item.sourceChecksum || "")));
    if (!relevant.length) {
      missing.push(field);
      continue;
    }
    const authoritative = relevant.filter((item) => ["AUTHOR_APPROVED", "PUBLISHER_APPROVED"].includes(item.authorityClass));
    if (new Set(authoritative.map((item) => canonicalJson(item.value))).size > 1) {
      conflicts.push(field);
      continue;
    }
    relevant.sort((a, b) => priority.indexOf(a.sourceType) - priority.indexOf(b.sourceType));
    const highest = relevant.filter((item) => item.sourceType === relevant[0].sourceType);
    if (new Set(highest.map((item) => canonicalJson(item.value))).size > 1) {
      conflicts.push(field);
      continue;
    }
    const selected = relevant[0];
    if (["genre", "imprint", "package", "formatEntitlements", "trimSize", "isbn"].includes(field) &&
        selected.authorityClass === "SYSTEM_DERIVED_GOVERNED") {
      missing.push(field);
      continue;
    }
    fields[field] = {
      value: selected.value,
      sourceId: selected.sourceId,
      sourceVersion: selected.sourceVersion,
      sourceType: selected.sourceType,
      authorityClass: selected.authorityClass,
      sourceChecksum: selected.sourceChecksum || null,
      lastVerified: selected.lastVerified
    };
  }
  if (missing.length || conflicts.length) return { ok: false, code: "COVER_AUTHORITY_UNRESOLVED", missing, conflicts };
  const formats = fields.formatEntitlements.value.map((item) => String(item).toUpperCase());
  if (formats.some((format) => !["PAPERBACK", "EBOOK"].includes(format)) ||
      formats.some((format) => !fields.isbn.value[format.toLowerCase()])) {
    return { ok: false, code: "COVER_FORMAT_IDENTIFIER_CONFLICT" };
  }
  const bundle = { schemaVersion: "COVER-AUTHORITY-1", titleId, fields, verifiedAt: now };
  const stableFields = Object.fromEntries(Object.entries(fields).map(([field, { lastVerified, ...record }]) => [field, record]));
  return { ok: true, bundle: { ...bundle, sha256: digest({ schemaVersion: bundle.schemaVersion, titleId, fields: stableFields }) } };
}

function projectCoverAuthority(bundle) {
  const projected = {
    titleId: bundle.titleId, sourceAuthority: "GOVERNED_COVER_BUNDLE",
    authorityVersion: bundle.sha256, authorityEvidenceId: bundle.sha256
  };
  for (const [field, record] of Object.entries(bundle.fields)) projected[field] = record.value;
  return projected;
}

module.exports = { AUTHORITY, canonicalJson, digest, resolveCoverAuthorityBundle, projectCoverAuthority };
