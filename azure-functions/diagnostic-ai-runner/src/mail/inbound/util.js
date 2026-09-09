"use strict";

const crypto = require("node:crypto");

function normalizeString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeLower(value) {
  return normalizeString(value).toLowerCase();
}

function normalizeEmail(value) {
  return normalizeLower(value);
}

function arrayOfStrings(value) {
  return Array.isArray(value) ? value.map(normalizeString).filter(Boolean) : [];
}

function safeJson(value) {
  return JSON.stringify(value, Object.keys(value || {}).sort());
}

function sha256Hex(input) {
  const buffer = Buffer.isBuffer(input) ? input : Buffer.from(String(input || ""), "utf8");
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

function stableId(prefix, parts) {
  return `${prefix}_${sha256Hex(parts.map((p) => normalizeString(p)).join("|")).slice(0, 32)}`;
}

function extensionFromName(filename) {
  const clean = normalizeLower(filename);
  const idx = clean.lastIndexOf(".");
  return idx >= 0 ? clean.slice(idx + 1) : "";
}

function headerValue(headers, name) {
  const target = normalizeLower(name);
  const found = Array.isArray(headers)
    ? headers.find((h) => normalizeLower(h.name) === target)
    : null;
  return normalizeString(found?.value) || null;
}

function addresses(recipients) {
  return Array.isArray(recipients)
    ? recipients.map((r) => normalizeEmail(r?.emailAddress?.address)).filter(Boolean)
    : [];
}

function redactBodyForEvidence(body) {
  const content = normalizeString(body?.content || body);
  if (!content) return "";
  return content.slice(0, 5000);
}

module.exports = {
  normalizeString,
  normalizeLower,
  normalizeEmail,
  arrayOfStrings,
  safeJson,
  sha256Hex,
  stableId,
  extensionFromName,
  headerValue,
  addresses,
  redactBodyForEvidence
};
