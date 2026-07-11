"use strict";

const REQUIRED_FINDING_KEYS = Object.freeze([
  "findingCategory",
  "conciseFinding",
  "sourceSegmentIds",
  "sourceEntryDates",
  "severity",
  "confidence",
  "recommendedTreatment"
]);

function normalizeArray(value) {
  return Array.isArray(value) ? value.filter(Boolean) : [];
}

function validateSectionAnalysisOutput(output, validSegmentIds) {
  const errors = [];
  const findings = normalizeArray(output?.findings);

  if (!Array.isArray(output?.segmentIdsReviewed) || output.segmentIdsReviewed.length === 0) {
    errors.push("segmentIdsReviewed: required non-empty array");
  }

  findings.forEach((finding, index) => {
    for (const key of REQUIRED_FINDING_KEYS) {
      if (
        finding[key] == null ||
        (Array.isArray(finding[key]) && finding[key].length === 0) ||
        (typeof finding[key] === "string" && !finding[key].trim())
      ) {
        errors.push(`findings[${index}].${key}: required`);
      }
    }

    for (const segmentId of normalizeArray(finding.sourceSegmentIds)) {
      if (!validSegmentIds.has(segmentId)) {
        errors.push(`findings[${index}].sourceSegmentIds: unsupported reference ${segmentId}`);
      }
    }
  });

  return {
    valid: errors.length === 0,
    errors,
    findings
  };
}

module.exports = {
  REQUIRED_FINDING_KEYS,
  validateSectionAnalysisOutput
};
