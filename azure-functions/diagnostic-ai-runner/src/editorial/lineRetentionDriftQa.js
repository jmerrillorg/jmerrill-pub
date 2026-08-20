"use strict";

function normalizeString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeForCompare(text) {
  return normalizeString(text)
    .normalize("NFKC")
    .replace(/[“”]/g, "\"")
    .replace(/[‘’]/g, "'")
    .replace(/[–—]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

function words(text) {
  return normalizeForCompare(text).split(/\s+/).filter(Boolean);
}

function paragraphs(text) {
  return normalizeString(text)
    .replace(/\r\n/g, "\n")
    .split(/\n{2,}/)
    .map((item) => normalizeForCompare(item))
    .filter(Boolean);
}

function headings(text) {
  return paragraphs(text).filter((paragraph) => {
    const wordCount = words(paragraph).length;
    if (wordCount > 14) return false;
    return /^(chapter|part|section|book|prologue|epilogue)\b/i.test(paragraph) || /^[A-Z0-9\s:'"-]{3,80}$/.test(paragraph);
  });
}

function sectionMarkers(text) {
  return paragraphs(text).filter((paragraph) => /^(chapter|part|section|book|prologue|epilogue)\b/i.test(paragraph));
}

function levenshteinDistance(a, b) {
  const left = normalizeForCompare(a);
  const right = normalizeForCompare(b);
  if (left === right) return 0;
  if (!left.length) return right.length;
  if (!right.length) return left.length;
  let previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let i = 1; i <= left.length; i += 1) {
    const current = [i];
    for (let j = 1; j <= right.length; j += 1) {
      const cost = left[i - 1] === right[j - 1] ? 0 : 1;
      current[j] = Math.min(
        current[j - 1] + 1,
        previous[j] + 1,
        previous[j - 1] + cost
      );
    }
    previous = current;
  }
  return previous[right.length];
}

function representativeText(text) {
  const value = normalizeForCompare(text);
  if (value.length <= 4500) return value;
  const middleStart = Math.max(0, Math.floor(value.length / 2) - 750);
  return [
    value.slice(0, 1500),
    value.slice(middleStart, middleStart + 1500),
    value.slice(-1500)
  ].join(" ");
}

function percent(value) {
  return Math.round(value * 100) / 100;
}

function firstSamples(list, limit = 5) {
  return list.slice(0, limit).map((item) => item.slice(0, 180));
}

function lineScopeViolations(sourceText, editedText, metrics) {
  const violations = [];
  const source = normalizeForCompare(sourceText).toLowerCase();
  const edited = normalizeForCompare(editedText).toLowerCase();
  if (!edited) violations.push("LINE_EDITED_MANUSCRIPT_MISSING");
  if (metrics.netWordRetentionPercent < 95) violations.push("LINE_NET_WORD_RETENTION_BELOW_95_PERCENT");
  if (metrics.outputExpansionPercent > 15) violations.push("LINE_SUBSTANTIVE_ADDITION_RISK");
  if (metrics.paragraphRetentionPercent < 95) violations.push("LINE_STRUCTURAL_RETENTION_BELOW_95_PERCENT");
  if (metrics.sectionRetentionPercent < 100) violations.push("LINE_SECTION_RETENTION_BELOW_100_PERCENT");
  if (metrics.rewriteMagnitudePercent > 45) violations.push("LINE_REWRITE_MAGNITUDE_EXCESSIVE");
  if (/\b(summary|summarized version|condensed version|outline of|in short)\b/i.test(edited) && !/\b(summary|summarized version|condensed version|outline of|in short)\b/i.test(source)) {
    violations.push("LINE_SUMMARIZATION_DRIFT");
  }
  if (/\b(new chapter|new section|additional argument|new argument|invented)\b/i.test(edited) && !/\b(new chapter|new section|additional argument|new argument|invented)\b/i.test(source)) {
    violations.push("LINE_SUBSTANTIVE_INVENTION_RISK");
  }
  return violations;
}

function buildLineRetentionDriftQa({ sourceText, editedText }) {
  const sourceWords = words(sourceText);
  const outputWords = words(editedText);
  const sourceParagraphs = paragraphs(sourceText);
  const outputParagraphs = paragraphs(editedText);
  const sourceHeadings = headings(sourceText);
  const outputHeadings = headings(editedText);
  const sourceSections = sectionMarkers(sourceText);
  const outputSections = sectionMarkers(editedText);
  const sourceChars = normalizeForCompare(sourceText).length;
  const outputChars = normalizeForCompare(editedText).length;
  const sourceRewriteSample = representativeText(sourceText);
  const outputRewriteSample = representativeText(editedText);
  const distance = levenshteinDistance(sourceRewriteSample, outputRewriteSample);
  const rewriteSampleCharacters = sourceRewriteSample.length;
  const metrics = {
    sourceWords: sourceWords.length,
    outputWords: outputWords.length,
    sourceCharacters: sourceChars,
    outputCharacters: outputChars,
    sourceParagraphs: sourceParagraphs.length,
    outputParagraphs: outputParagraphs.length,
    sourceHeadings: sourceHeadings.length,
    outputHeadings: outputHeadings.length,
    sourceSections: sourceSections.length,
    outputSections: outputSections.length,
    addedWords: Math.max(0, outputWords.length - sourceWords.length),
    deletedWords: Math.max(0, sourceWords.length - outputWords.length),
    addedCharacters: Math.max(0, outputChars - sourceChars),
    deletedCharacters: Math.max(0, sourceChars - outputChars),
    netWordDelta: outputWords.length - sourceWords.length,
    netCharacterDelta: outputChars - sourceChars,
    changedCharacters: distance,
    rewriteSampleCharacters,
    rewriteMagnitudePercent: rewriteSampleCharacters ? percent(distance / rewriteSampleCharacters * 100) : 100,
    measuredRetentionPercent: sourceWords.length ? percent(outputWords.length / sourceWords.length * 100) : 0,
    netWordRetentionPercent: sourceWords.length ? percent(Math.min(outputWords.length, sourceWords.length) / sourceWords.length * 100) : 0,
    netCharacterRetentionPercent: sourceChars ? percent(Math.min(outputChars, sourceChars) / sourceChars * 100) : 0,
    outputExpansionPercent: sourceWords.length ? percent(Math.max(0, outputWords.length - sourceWords.length) / sourceWords.length * 100) : 0,
    structuralRetentionPercent: sourceParagraphs.length ? percent(Math.min(outputParagraphs.length, sourceParagraphs.length) / sourceParagraphs.length * 100) : 0,
    paragraphRetentionPercent: sourceParagraphs.length ? percent(Math.min(outputParagraphs.length, sourceParagraphs.length) / sourceParagraphs.length * 100) : 0,
    headingRetentionPercent: sourceHeadings.length ? percent(Math.min(outputHeadings.length, sourceHeadings.length) / sourceHeadings.length * 100) : 100,
    sectionRetentionPercent: sourceSections.length ? percent(Math.min(outputSections.length, sourceSections.length) / sourceSections.length * 100) : 100
  };
  const violations = lineScopeViolations(sourceText, editedText, metrics);
  return {
    ok: violations.length === 0,
    algorithm: "JMP_LINE_STAGE_AWARE_RETENTION_DRIFT_v1",
    metrics,
    violations,
    voiceDrift: violations.includes("LINE_REWRITE_MAGNITUDE_EXCESSIVE") ? "REVIEW_REQUIRED" : "PASS",
    stageScopeCompliance: violations.length ? "FAIL" : "PASS",
    samples: {
      sourceOpening: firstSamples(sourceParagraphs, 2),
      outputOpening: firstSamples(outputParagraphs, 2),
      sourceMiddle: firstSamples(sourceParagraphs.slice(Math.floor(sourceParagraphs.length / 2)), 2),
      outputMiddle: firstSamples(outputParagraphs.slice(Math.floor(outputParagraphs.length / 2)), 2),
      sourceLate: firstSamples(sourceParagraphs.slice(-2), 2),
      outputLate: firstSamples(outputParagraphs.slice(-2), 2)
    }
  };
}

module.exports = {
  buildLineRetentionDriftQa,
  normalizeForCompare,
  words,
  paragraphs,
  headings,
  sectionMarkers,
  levenshteinDistance
};
