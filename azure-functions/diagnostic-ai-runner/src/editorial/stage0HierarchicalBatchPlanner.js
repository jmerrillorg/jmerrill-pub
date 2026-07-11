"use strict";

const { estimateTokenCount } = require("./stage0HierarchicalSegmentation");

const DEFAULT_INPUT_TOKEN_CEILING = 24000;
const DEFAULT_OUTPUT_TOKEN_RESERVE = 2400;
const DEFAULT_MAX_RETRIES = 2;

function getRoutingConfig() {
  return {
    inputTokenCeiling: Number(process.env.JM1_STAGE0_SECTION_INPUT_TOKEN_CEILING || DEFAULT_INPUT_TOKEN_CEILING),
    outputTokenReserve: Number(process.env.JM1_STAGE0_SECTION_OUTPUT_TOKEN_RESERVE || DEFAULT_OUTPUT_TOKEN_RESERVE),
    maxRetries: Number(process.env.JM1_STAGE0_SECTION_MAX_RETRIES || DEFAULT_MAX_RETRIES)
  };
}

function splitIntoBatchesForMonth(monthKey, monthSegments, config) {
  const batches = [];
  let current = [];
  let currentTokens = 0;
  let batchIndex = 1;

  for (const segment of monthSegments) {
    const nextTokens = currentTokens + segment.estimatedTokenCount;
    if (current.length > 0 && nextTokens > config.inputTokenCeiling) {
      batches.push({
        batchId: `BATCH-${monthKey.toUpperCase()}-${String(batchIndex).padStart(2, "0")}`,
        month: monthKey,
        quarter: current[0].quarter,
        segmentIds: current.map((item) => item.segmentId),
        entryDates: current.map((item) => item.entryDate),
        estimatedInputTokens: currentTokens,
        outputReserveTokens: config.outputTokenReserve,
        analysisStatus: "PENDING",
        maxRetries: config.maxRetries
      });
      current = [];
      currentTokens = 0;
      batchIndex += 1;
    }

    current.push(segment);
    currentTokens += segment.estimatedTokenCount;
  }

  if (current.length > 0) {
    batches.push({
      batchId: `BATCH-${monthKey.toUpperCase()}-${String(batchIndex).padStart(2, "0")}`,
      month: monthKey,
      quarter: current[0].quarter,
      segmentIds: current.map((item) => item.segmentId),
      entryDates: current.map((item) => item.entryDate),
      estimatedInputTokens: currentTokens,
      outputReserveTokens: config.outputTokenReserve,
      analysisStatus: "PENDING",
      maxRetries: config.maxRetries
    });
  }

  return batches;
}

function buildAnalysisPlan(segments, config = getRoutingConfig()) {
  const byMonth = new Map();
  for (const segment of segments) {
    const monthKey = String(segment.month || "").toLowerCase();
    if (!byMonth.has(monthKey)) byMonth.set(monthKey, []);
    byMonth.get(monthKey).push(segment);
  }

  const batches = [];
  for (const [monthKey, monthSegments] of byMonth.entries()) {
    monthSegments.sort((a, b) => a.entryOrdinal - b.entryOrdinal);
    batches.push(...splitIntoBatchesForMonth(monthKey, monthSegments, config));
  }

  const estimatedInputTokens = batches.reduce((sum, batch) => sum + batch.estimatedInputTokens, 0);
  const estimatedOutputTokens = batches.length * config.outputTokenReserve;

  return {
    config,
    batchCount: batches.length,
    estimatedInputTokens,
    estimatedOutputTokens,
    estimatedModelCalls: batches.length + 2,
    batches
  };
}

function estimateCost(plan, pricing = {}) {
  const inputPer1k = Number(pricing.inputPer1k || process.env.JM1_STAGE0_ESTIMATED_INPUT_COST_PER_1K || 0);
  const outputPer1k = Number(pricing.outputPer1k || process.env.JM1_STAGE0_ESTIMATED_OUTPUT_COST_PER_1K || 0);

  if (!inputPer1k && !outputPer1k) {
    return null;
  }

  return Number(
    (
      (plan.estimatedInputTokens / 1000) * inputPer1k +
      (plan.estimatedOutputTokens / 1000) * outputPer1k
    ).toFixed(4)
  );
}

function estimateDuration(plan, msPerCall = Number(process.env.JM1_STAGE0_ESTIMATED_MS_PER_CALL || 5000)) {
  return plan.estimatedModelCalls * msPerCall;
}

function assertCostCeiling(plan, estimatedCostUsd) {
  const ceiling = Number(process.env.JM1_STAGE0_COST_CEILING_USD || 0);
  if (!ceiling || estimatedCostUsd == null) {
    return { allowed: true, ceilingUsd: ceiling || null };
  }

  return {
    allowed: estimatedCostUsd <= ceiling,
    ceilingUsd: ceiling
  };
}

function buildSafeExcerptReference(segment) {
  return `${segment.entryDate}${segment.entryTitle ? ` — ${segment.entryTitle}` : ""}`;
}

module.exports = {
  DEFAULT_INPUT_TOKEN_CEILING,
  buildAnalysisPlan,
  assertCostCeiling,
  buildSafeExcerptReference,
  estimateCost,
  estimateDuration,
  getRoutingConfig
};
