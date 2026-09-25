"use strict";

const RATE_VERSION = "AZURE-RETAIL-GPT4OMINI-0718-2026-09-23-UB";
const INPUT_USD_PER_MILLION = 0.165;
const OUTPUT_USD_PER_MILLION = 0.66;
const MAX_OUTPUT_TOKENS = 500;

function cents(inputTokens, outputTokens) {
  if (!Number.isSafeInteger(inputTokens) || inputTokens < 0 ||
      !Number.isSafeInteger(outputTokens) || outputTokens < 0 ||
      outputTokens > MAX_OUTPUT_TOKENS) {
    throw new Error("SHADOW_COST_USAGE_INVALID");
  }
  const dollars = (inputTokens * INPUT_USD_PER_MILLION +
    outputTokens * OUTPUT_USD_PER_MILLION) / 1_000_000;
  const rounded = Math.ceil(dollars * 100);
  if (!Number.isSafeInteger(rounded) || rounded < 0) throw new Error("SHADOW_COST_OVERFLOW");
  return rounded;
}

function projectMaximumCost(input) {
  if (!input || typeof input.approvedExcerpt !== "string" ||
      input.approvedExcerpt.length < 1 || input.approvedExcerpt.length > 12000) {
    throw new Error("SHADOW_COST_INPUT_INVALID");
  }
  const maxInputTokens = 4 * input.approvedExcerpt.length + 1000;
  return Math.max(1, cents(maxInputTokens, MAX_OUTPUT_TOKENS));
}

function actualCostCents(tokenCounts) {
  return cents(tokenCounts?.input, tokenCounts?.output);
}

module.exports = { RATE_VERSION, MAX_OUTPUT_TOKENS, projectMaximumCost, actualCostCents };
