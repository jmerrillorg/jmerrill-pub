"use strict";

/**
 * Schema validator for the submit_precontract_editorial_review tool output.
 * Mirrors src/validation/diagnosticOutputSchemaValidator.js — structural
 * shape/type/enum checking only. Content safety (no quoted manuscript
 * text) is enforced separately by noQuotationValidator.js.
 */

const { IMPRINT_CODE, FIT_DECISION, TEXT_FIELD_MAX_CHARS } = require("./manuscriptEditorialReviewProvider");

const REQUIRED_STRING_FIELDS = ["jm1pub_editorialfitsummary", "jm1pub_editorialriskflags"];
const REQUIRED_BOOLEAN_FIELDS = ["jm1pub_signaturecandidacy", "jm1pub_rightsdisclosureflag", "jm1pub_requireshumanreview"];

function validateEditorialReviewSchema(output) {
  const errors = [];

  if (output == null || typeof output !== "object") {
    return { valid: false, errors: ["OUTPUT_NOT_OBJECT"] };
  }

  for (const field of REQUIRED_STRING_FIELDS) {
    const value = output[field];
    if (typeof value !== "string" || value.trim().length === 0) {
      errors.push(`${field}_MISSING_OR_NOT_STRING`);
    } else if (value.length > TEXT_FIELD_MAX_CHARS) {
      errors.push(`${field}_EXCEEDS_MAX_LENGTH`);
    }
  }

  for (const field of REQUIRED_BOOLEAN_FIELDS) {
    if (typeof output[field] !== "boolean") {
      errors.push(`${field}_MISSING_OR_NOT_BOOLEAN`);
    }
  }

  if (typeof output.jm1pub_recommendedimprintcode !== "string" || !Object.values(IMPRINT_CODE).includes(output.jm1pub_recommendedimprintcode)) {
    errors.push("jm1pub_recommendedimprintcode_INVALID_ENUM");
  }

  if (typeof output.jm1pub_fitdecision !== "string" || !Object.values(FIT_DECISION).includes(output.jm1pub_fitdecision)) {
    errors.push("jm1pub_fitdecision_INVALID_ENUM");
  }

  if (typeof output.jm1pub_imprintconfidence !== "number" || Number.isNaN(output.jm1pub_imprintconfidence) ||
      output.jm1pub_imprintconfidence < 0 || output.jm1pub_imprintconfidence > 1) {
    errors.push("jm1pub_imprintconfidence_INVALID_RANGE");
  }

  return { valid: errors.length === 0, errors };
}

module.exports = { validateEditorialReviewSchema, REQUIRED_STRING_FIELDS, REQUIRED_BOOLEAN_FIELDS };
