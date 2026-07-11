"use strict";

const { createHash } = require("node:crypto");

function compact(value) {
  return typeof value === "string" ? value.trim() : "";
}

function buildPromptSections({ transaction, titleContext, guideSelection, modelResolution, structuredOutputSchema }) {
  const guidePrimers = [
    guideSelection.selectedPrimaryGuide,
    ...(guideSelection.secondaryGuides || []),
    ...(guideSelection.selectedCompanionGuides || [])
  ]
    .filter(Boolean)
    .map((guide) => `- ${guide.officialName} (${guide.id}${guide.version ? ` v${guide.version}` : ""}): ${guide.promptPrimer}`);

  return [
    `EDITORIAL TRANSACTION\n${transaction}`,
    `TITLE CONTEXT\nTitle: ${compact(titleContext.title)}\nPublishing Asset: ${compact(titleContext.publishingAssetId)}\nStage: ${compact(titleContext.editorialStage)}\nImprint: ${compact(titleContext.imprint)}\nGenre: ${compact(titleContext.genre)}\nAudience: ${compact(titleContext.audience)}`,
    `GOVERNING GUIDES\n${guidePrimers.join("\n")}`,
    "EDITORIAL-STAGE BOUNDARIES\nDo not contact the author, close gates, advance stages, or overwrite prior human editorial work. Significant rewrites require human review.",
    "AUTHOR-VOICE PROTECTION\nPreserve cultural voice, spiritual voice, poetic voice, regional expression, rhetorical style, intentional grammar or dialect, and title-specific terminology. Distinguish error from intentional style; query uncertainty rather than flattening it.",
    `STRUCTURED OUTPUT SCHEMA\n${JSON.stringify(structuredOutputSchema || {}, null, 2)}`,
    "PROHIBITED ACTIONS\nNo autonomous approval. No author-facing release. No contract changes. No production release. No style-canon mutation.",
    `HUMAN REVIEW REQUIREMENT\n${guideSelection.humanReviewRequired || (modelResolution && modelResolution.route && modelResolution.route.humanReviewRequired) ? "Required" : "Not specified"}`
  ].join("\n\n");
}

function assembleGovernedEditorialPrompt(params) {
  const promptBody = buildPromptSections(params);
  const promptHash = createHash("sha256").update(promptBody).digest("hex");

  return {
    promptBody,
    promptHash,
    metadata: {
      transaction: params.transaction,
      promptPolicyVersion: params.promptPolicyVersion || "EDITORIAL-PROMPT-ASSEMBLY-V1",
      title: compact(params.titleContext?.title),
      publishingAssetId: compact(params.titleContext?.publishingAssetId),
      promptKey: compact(params.promptKey),
      promptVersion: compact(params.promptVersion),
      modelProvider: params.modelResolution?.selectedModel?.provider || null,
      modelDeployment: params.modelResolution?.selectedModel?.deploymentAlias || null,
      selectedGuideIds: params.guideSelection?.styleGuideIds || [],
      selectedCompanionGuideIds: params.guideSelection?.companionGuideIds || [],
      humanReviewRequired: Boolean(params.guideSelection?.humanReviewRequired || params.modelResolution?.route?.humanReviewRequired)
    }
  };
}

module.exports = {
  assembleGovernedEditorialPrompt,
  buildPromptSections
};
