"use strict";

const { createHash } = require("node:crypto");
const { inflateSync } = require("node:zlib");

const SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const SHA256 = /^[a-f0-9]{64}$/i;
const MAX_PNG_BYTES = 50 * 1024 * 1024;
const MAX_PIXELS = 16 * 1024 * 1024;

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function checkedPng(bytes, expectedWidth, expectedHeight) {
  if (!Buffer.isBuffer(bytes) || bytes.length > MAX_PNG_BYTES ||
      !bytes.subarray(0, 8).equals(SIGNATURE)) throw new Error("COVER_REVIEW_PNG_INVALID");
  const chunks = [];
  const compressed = [];
  let offset = 8;
  let width;
  let height;
  let colorType;
  let ended = false;
  let seenData = false;
  while (offset + 12 <= bytes.length) {
    const length = bytes.readUInt32BE(offset);
    const end = offset + 12 + length;
    if (end > bytes.length) throw new Error("COVER_REVIEW_PNG_INVALID");
    const name = bytes.toString("ascii", offset + 4, offset + 8);
    const chunk = bytes.subarray(offset, end);
    if (!/^[A-Za-z]{4}$/.test(name) || crc32(chunk.subarray(4, -4)) !== bytes.readUInt32BE(end - 4)) {
      throw new Error("COVER_REVIEW_PNG_INVALID");
    }
    if (offset === 8) {
      if (name !== "IHDR" || length !== 13) throw new Error("COVER_REVIEW_PNG_INVALID");
      width = bytes.readUInt32BE(offset + 8);
      height = bytes.readUInt32BE(offset + 12);
      const depth = bytes[offset + 16];
      colorType = bytes[offset + 17];
      if (width < 1024 || height < 1024 || width * height > MAX_PIXELS ||
          depth !== 8 || ![2, 6].includes(colorType) ||
          bytes[offset + 18] !== 0 || bytes[offset + 19] !== 0 || bytes[offset + 20] !== 0) {
        throw new Error("COVER_REVIEW_PNG_UNSUPPORTED");
      }
    } else if (name === "IDAT") {
      if (ended) throw new Error("COVER_REVIEW_PNG_INVALID");
      compressed.push(bytes.subarray(offset + 8, end - 4));
      chunks.push(chunk);
      seenData = true;
    } else if (name === "IEND") {
      if (length !== 0 || !seenData || end !== bytes.length) throw new Error("COVER_REVIEW_PNG_INVALID");
      chunks.push(chunk);
      ended = true;
      break;
    } else if (name === "IHDR") {
      throw new Error("COVER_REVIEW_PNG_INVALID");
    } else if (name[0] === name[0].toUpperCase()) {
      throw new Error("COVER_REVIEW_PNG_UNSUPPORTED");
    } else if (name === "tRNS") {
      throw new Error("COVER_REVIEW_PNG_UNSUPPORTED");
    }
    if (name === "IHDR") chunks.push(chunk);
    offset = end;
  }
  if (!ended || width !== expectedWidth || height !== expectedHeight) {
    throw new Error("COVER_REVIEW_PNG_DIMENSIONS_INVALID");
  }
  const stride = width * (colorType === 6 ? 4 : 3);
  const expectedLength = (stride + 1) * height;
  let pixels;
  try {
    pixels = inflateSync(Buffer.concat(compressed), { maxOutputLength: expectedLength + 1 });
  } catch {
    throw new Error("COVER_REVIEW_PNG_INVALID");
  }
  if (pixels.length !== expectedLength) throw new Error("COVER_REVIEW_PNG_INVALID");
  for (let row = 0; row < height; row++) {
    if (pixels[row * (stride + 1)] > 4) throw new Error("COVER_REVIEW_PNG_INVALID");
  }
  return Buffer.concat([SIGNATURE, ...chunks]);
}

function escapeHtml(input) {
  return input.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

function typography(brief) {
  const fields = ["title", "subtitle", "authorDisplay"].map((key) => {
    const value = brief?.[key];
    if (typeof value !== "string" || !value.trim() || /[\u0000-\u001f\u007f]/.test(value)) {
      throw new Error("COVER_REVIEW_TEXT_INVALID");
    }
    return value.trim().normalize("NFC");
  });
  const [title, subtitle, authorDisplay] = fields;
  // The opaque panel is 360px wide; these caps keep text readable at a 180px preview.
  const titleSize = title.length <= 34 ? 28 : 24;
  const subtitleSize = 18;
  const legible = title.length <= 52 && subtitle.length <= 80 && authorDisplay.length <= 40 &&
    ![title, subtitle, authorDisplay].some((text) => text.split(/\s+/).some((word) => word.length > 20));
  return { title, subtitle, authorDisplay, titleSize, subtitleSize, legible };
}

function composeHtml(brief, images) {
  const type = typography(brief);
  const cards = images.map(({ label, png }) => `<article class="concept"><h2>Concept ${label}</h2><div class="cover"><img src="data:image/png;base64,${png.toString("base64")}" alt="Concept ${label} artwork"><div class="type"><div class="title" style="font-size:${type.titleSize}px">${escapeHtml(type.title)}</div><div class="subtitle" style="font-size:${type.subtitleSize}px">${escapeHtml(type.subtitle)}</div><div class="byline">${escapeHtml(type.authorDisplay)}</div></div></div></article>`).join("\n");
  return Buffer.from(`<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><title>${escapeHtml(type.title)} - Cover concepts</title><style>\n*{box-sizing:border-box}body{margin:0;background:#fff;color:#111;font-family:Arial,Helvetica,sans-serif}main{max-width:1160px;margin:auto;padding:24px}h1{font-size:22px;margin:0 0 20px}h2{font-size:16px;margin:0 0 8px}.grid{display:flex;flex-wrap:wrap;gap:24px;align-items:flex-start}.concept{width:360px;break-inside:avoid}.cover{width:360px;position:relative;background:#fff}.cover img{display:block;width:100%;height:auto}.type{position:absolute;bottom:0;left:0;right:0;background:#fff;color:#111;text-align:center;padding:14px 18px 16px;min-height:138px;overflow-wrap:break-word}.title{font-weight:700;line-height:1.08}.subtitle{line-height:1.18;margin-top:7px}.byline{font-size:18px;font-weight:700;line-height:1.15;margin-top:10px}@media print{main{padding:0}.grid{gap:18px}body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}\n</style></head><body><main><h1>Cover concepts: ${escapeHtml(type.title)}</h1><div class="grid">${cards}</div></main></body></html>\n`, "utf8");
}

function createCoverReviewPackage(deps = {}) {
  if (typeof deps.fetchAssetBytes !== "function" || typeof deps.saveReviewArtifact !== "function") {
    throw new Error("COVER_REVIEW_STORAGE_NOT_CONFIGURED");
  }

  async function composeReviewPackage({ titleId, brief, concepts } = {}) {
    if (!titleId || titleId !== brief?.titleId || !Array.isArray(concepts) ||
        concepts.length < 2 || concepts.length > 3) throw new Error("COVER_REVIEW_INPUT_INVALID");
    const type = typography(brief);
    if (!type.legible) throw new Error("COVER_REVIEW_THUMBNAIL_TEXT_UNREADABLE");
    const seen = new Set();
    const images = [];
    for (const [index, concept] of concepts.entries()) {
      const label = String.fromCharCode(65 + index);
      if (concept?.label !== label || !concept.assetId || seen.has(concept.assetId) ||
          !SHA256.test(concept.sha256 || "") || !Number.isInteger(concept.width) ||
          !Number.isInteger(concept.height)) throw new Error("COVER_REVIEW_INPUT_INVALID");
      seen.add(concept.assetId);
      const bytes = await deps.fetchAssetBytes(concept);
      if (!Buffer.isBuffer(bytes) || sha256(bytes) !== concept.sha256.toLowerCase()) {
        throw new Error("COVER_REVIEW_CONCEPT_CHECKSUM_MISMATCH");
      }
      images.push({ label, png: checkedPng(bytes, concept.width, concept.height) });
    }
    const bytes = composeHtml(brief, images);
    const checksum = sha256(bytes);
    const saved = await deps.saveReviewArtifact({ titleId, bytes, sha256: checksum, contentType: "text/html; charset=utf-8" });
    if (!saved?.assetId || !saved.location || saved.sha256 !== checksum) {
      throw new Error("COVER_REVIEW_STORAGE_FAILED");
    }
    return { assetId: saved.assetId, location: saved.location, sha256: checksum, bytes };
  }

  async function preflightReviewPackage({ record, reviewPackage } = {}) {
    const bytes = reviewPackage?.bytes;
    if (!Buffer.isBuffer(bytes) || !SHA256.test(reviewPackage.sha256 || "") ||
        sha256(bytes) !== reviewPackage.sha256 || record?.state !== "CONCEPTS_READY" ||
        record.titleId !== record.brief?.titleId || !Array.isArray(record.concepts) ||
        ![2, 3].includes(record.concepts.length)) return { passed: false };
    let expected;
    try {
      expected = await composeReviewPackageContent(record, deps.fetchAssetBytes);
    } catch {
      return { passed: false };
    }
    if (!bytes.equals(expected)) return { passed: false };
    return { passed: true, evidenceId: sha256(Buffer.concat([Buffer.from("COVER_REVIEW_PREFLIGHT_V1:"), bytes])) };
  }

  return { composeReviewPackage, preflightReviewPackage };
}

async function composeReviewPackageContent(record, fetchAssetBytes) {
  const type = typography(record.brief);
  if (!type.legible) throw new Error("COVER_REVIEW_THUMBNAIL_TEXT_UNREADABLE");
  const images = [];
  for (const [index, concept] of record.concepts.entries()) {
    if (concept?.label !== String.fromCharCode(65 + index) || !SHA256.test(concept.sha256 || "")) {
      throw new Error("COVER_REVIEW_INPUT_INVALID");
    }
    const bytes = await fetchAssetBytes(concept);
    if (!Buffer.isBuffer(bytes) || sha256(bytes) !== concept.sha256.toLowerCase()) throw new Error("COVER_REVIEW_CONCEPT_CHECKSUM_MISMATCH");
    images.push({ label: concept.label, png: checkedPng(bytes, concept.width, concept.height) });
  }
  return composeHtml(record.brief, images);
}

module.exports = { createCoverReviewPackage };
