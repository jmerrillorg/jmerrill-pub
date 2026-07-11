"use strict";

const { createHash } = require("node:crypto");

function buildFindingId({ batchId, conciseFinding, index }) {
  return `FND-${batchId}-${createHash("sha1").update(`${index}|${conciseFinding}`).digest("hex").slice(0, 8).toUpperCase()}`;
}

function buildLedgerEntries({ batch, findings, modelResolution, promptMetadata, correlationId }) {
  return findings.map((finding, index) => ({
    findingId: buildFindingId({
      batchId: batch.batchId,
      conciseFinding: finding.conciseFinding,
      index
    }),
    batchId: batch.batchId,
    sourceSegmentIds: finding.sourceSegmentIds,
    sourceEntryDates: finding.sourceEntryDates,
    findingCategory: finding.findingCategory,
    conciseFinding: finding.conciseFinding,
    evidenceReference: Array.isArray(finding.sourceEntryDates) ? finding.sourceEntryDates.join("; ") : null,
    severity: finding.severity,
    confidence: finding.confidence,
    recommendedTreatment: finding.recommendedTreatment,
    unresolvedQuestions: Array.isArray(finding.unresolvedQuestions) ? finding.unresolvedQuestions : [],
    modelDeployment: modelResolution?.selectedModel?.deploymentAlias || null,
    modelProvider: modelResolution?.selectedModel?.provider || null,
    promptKey: promptMetadata?.promptKey || null,
    promptVersion: promptMetadata?.promptVersion || null,
    promptHash: promptMetadata?.promptHash || null,
    styleGuideIds: promptMetadata?.selectedGuideIds || [],
    companionGuideIds: promptMetadata?.selectedCompanionGuideIds || [],
    correlationId,
    reviewerStatus: "PENDING_HUMAN_REVIEW"
  }));
}

module.exports = {
  buildLedgerEntries
};
