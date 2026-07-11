"use strict";

const HOUSE_BASELINE_TRANSLATION = "KJV";

function buildScriptureAuthorityPolicy(input = {}) {
  return {
    houseBaselineTranslation: HOUSE_BASELINE_TRANSLATION,
    translation: input.translation || HOUSE_BASELINE_TRANSLATION,
    rightsReviewRequired: Boolean(input.translation && input.translation !== HOUSE_BASELINE_TRANSLATION),
    italicPreservationRequired: true,
    formattingContext: input.formattingContext || "plain_text",
    verificationRequired: true,
    publisherDirectionRequired: Boolean(input.translation && input.translation !== HOUSE_BASELINE_TRANSLATION)
  };
}

module.exports = {
  HOUSE_BASELINE_TRANSLATION,
  buildScriptureAuthorityPolicy
};
