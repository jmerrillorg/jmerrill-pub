"use strict";

function validateEditorialCompliance({ producingTransaction, producingModel, validatorModel, guideSelection, outputMetadata }) {
  const violations = [];
  const warnings = [];
  const voiceFlags = [];

  if (!guideSelection || !guideSelection.selectedPrimaryGuide) {
    violations.push("PRIMARY_STYLE_GUIDE_MISSING");
  }
  if (!guideSelection || guideSelection.conflicts?.length) {
    violations.push("GUIDE_CONFLICT_UNRESOLVED");
  }
  if (!outputMetadata || !outputMetadata.promptHash) {
    violations.push("PROMPT_HASH_MISSING");
  }
  if (!outputMetadata || !Array.isArray(outputMetadata.selectedGuideIds) || outputMetadata.selectedGuideIds.length === 0) {
    violations.push("GUIDE_MANIFEST_MISSING");
  }
  if (producingModel && validatorModel && producingModel === validatorModel) {
    warnings.push("VALIDATOR_NOT_INDEPENDENT_MODEL_FAMILY");
  }
  if (producingTransaction === "developmental_editing" && !outputMetadata?.voiceProtectionAcknowledged) {
    voiceFlags.push("VOICE_PROTECTION_ACKNOWLEDGEMENT_MISSING");
  }

  const complianceScore = Math.max(0, 100 - (violations.length * 25) - (warnings.length * 10) - (voiceFlags.length * 10));

  return {
    complianceScore,
    violations,
    warnings,
    authorVoiceFlags: voiceFlags,
    requiredHumanDecisions:
      violations.length > 0 || voiceFlags.length > 0
        ? ["Human editorial review required before any author-facing or production-impacting use."]
        : []
  };
}

module.exports = {
  validateEditorialCompliance
};
