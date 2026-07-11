"use strict";

const { createHash } = require("node:crypto");

const MONTHS = Object.freeze([
  "january",
  "february",
  "march",
  "april",
  "may",
  "june",
  "july",
  "august",
  "september",
  "october",
  "november",
  "december"
]);

const MONTH_TO_QUARTER = Object.freeze({
  january: "Q1",
  february: "Q1",
  march: "Q1",
  april: "Q2",
  may: "Q2",
  june: "Q2",
  july: "Q3",
  august: "Q3",
  september: "Q3",
  october: "Q4",
  november: "Q4",
  december: "Q4"
});

const ENTRY_HEADER_REGEX = new RegExp(
  `^(${MONTHS.join("|")})\\s+(\\d{1,2})\\s*$`,
  "gim"
);

function normalizeText(text) {
  return String(text || "").replace(/\r\n/g, "\n");
}

function quarterForMonth(month) {
  return MONTH_TO_QUARTER[String(month || "").toLowerCase()] || null;
}

function estimateTokenCount(text) {
  return Math.max(1, Math.ceil(String(text || "").length / 4));
}

function canonicalizeMonth(month) {
  const normalized = String(month || "").trim().toLowerCase();
  if (!MONTHS.includes(normalized)) {
    return String(month || "").trim();
  }

  return normalized[0].toUpperCase() + normalized.slice(1);
}

function buildSegmentId({ manuscriptArtifactId, manuscriptHash, entryDate, ordinal }) {
  const digest = createHash("sha1")
    .update(`${manuscriptArtifactId}|${manuscriptHash}|${entryDate}|${ordinal}`)
    .digest("hex")
    .slice(0, 10)
    .toUpperCase();

  return `SEG-${entryDate}-${digest}`;
}

function inferEntryMetadata(entryText) {
  const lines = normalizeText(entryText)
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const dateLine = lines[0] || null;
  let entryTitle = null;
  let scriptureReference = null;

  for (let i = 1; i < lines.length; i += 1) {
    const line = lines[i];
    if (!entryTitle && line.length <= 140) {
      entryTitle = line;
      continue;
    }

    if (!scriptureReference && /[A-Za-z].*\d+:\d+/.test(line)) {
      scriptureReference = line;
      break;
    }
  }

  return {
    dateLine,
    entryTitle,
    scriptureReference
  };
}

function extractSegments({ manuscriptArtifactId, manuscriptHash, manuscriptContent }) {
  const normalized = normalizeText(manuscriptContent);
  const matches = Array.from(normalized.matchAll(ENTRY_HEADER_REGEX));
  const frontMatterEnd = matches.length > 0 ? matches[0].index : normalized.length;
  const frontMatter = normalized.slice(0, frontMatterEnd).trim();

  const segments = matches.map((match, index) => {
    const start = match.index;
    const end = index + 1 < matches.length ? matches[index + 1].index : normalized.length;
    const rawText = normalized.slice(start, end).trim();
    const monthName = canonicalizeMonth(match[1]);
    const day = String(match[2] || "").padStart(2, "0");
    const monthKey = monthName.toLowerCase();
    const entryDate = `${monthName} ${Number(match[2])}`;
    const metadata = inferEntryMetadata(rawText);
    const wordCount = rawText.trim() ? rawText.trim().split(/\s+/).length : 0;
    const charCount = rawText.length;

    return {
      manuscriptArtifactId,
      manuscriptHash,
      segmentId: buildSegmentId({
        manuscriptArtifactId,
        manuscriptHash,
        entryDate: `${monthKey}-${day}`,
        ordinal: index + 1
      }),
      entryOrdinal: index + 1,
      entryDate,
      entryTitle: metadata.entryTitle,
      scriptureReference: metadata.scriptureReference,
      month: monthName,
      quarter: quarterForMonth(monthKey),
      sourcePosition: {
        startOffset: start,
        endOffset: end
      },
      wordCount,
      charCount,
      estimatedTokenCount: estimateTokenCount(rawText),
      extractionStatus: "EXTRACTED",
      content: rawText
    };
  });

  return {
    manifest: {
      manuscriptArtifactId,
      manuscriptHash,
      entryCount: segments.length,
      frontMatterWordCount: frontMatter ? frontMatter.split(/\s+/).length : 0,
      partialYearRecognized: segments.some((segment) => segment.month === "August") &&
        !segments.some((segment) => segment.month === "September")
    },
    frontMatter,
    segments
  };
}

module.exports = {
  ENTRY_HEADER_REGEX,
  MONTHS,
  estimateTokenCount,
  extractSegments,
  quarterForMonth
};
