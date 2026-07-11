"use strict";

function summarizeCorrectionCount(input = {}) {
  const patterns = Array.isArray(input.patterns) ? input.patterns : [];
  const correctedInstances = patterns.reduce((sum, pattern) => sum + Number(pattern.correctedInstances || 0), 0);
  const recurringPatterns = patterns.length;

  return {
    recurringPatterns,
    correctedInstances,
    preservedVoice: Boolean(input.preservedVoice),
    preservedDialect: Boolean(input.preservedDialect),
    preservedCadence: Boolean(input.preservedCadence),
    authorSafeSummary: `We corrected ${correctedInstances} mechanical instances across ${recurringPatterns} recurring editorial patterns while intentionally preserving the manuscript's voice.`
  };
}

module.exports = {
  summarizeCorrectionCount
};
