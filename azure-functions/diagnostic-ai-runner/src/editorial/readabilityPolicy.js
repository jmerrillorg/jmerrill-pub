"use strict";

const READABILITY_METHODS = Object.freeze(["lexile", "grade_level", "custom_provider"]);

function buildReadabilityAssessment(input = {}) {
  return {
    readabilityMethod: READABILITY_METHODS.includes(input.readabilityMethod) ? input.readabilityMethod : "grade_level",
    readabilityProvider: input.readabilityProvider || null,
    score: input.score ?? null,
    assessedOn: input.assessedOn || null,
    vocabularyRulings: Array.isArray(input.vocabularyRulings) ? input.vocabularyRulings : []
  };
}

module.exports = {
  READABILITY_METHODS,
  buildReadabilityAssessment
};
