"use strict";

const { selectStyleGuides } = require("./editorialGuideSelector");
const { resolveModelRoute } = require("./editorialModelRoutingRegistry");
const { assembleGovernedEditorialPrompt } = require("./editorialPromptAssembly");
const { extractSegments } = require("./stage0HierarchicalSegmentation");
const {
  buildAnalysisPlan,
  assertCostCeiling,
  estimateCost,
  estimateDuration
} = require("./stage0HierarchicalBatchPlanner");
const { validateSectionAnalysisOutput } = require("./stage0StructuredFindingsValidator");
const { buildLedgerEntries } = require("./stage0FindingsLedger");
const { buildMonthlySyntheses, buildQuarterlySyntheses } = require("./stage0Synthesis");
const { validateDiagnosticOutputSchema } = require("../validation/diagnosticOutputSchemaValidator");
const { validateNoQuotation } = require("../validation/noQuotationValidator");

function buildSectionPrompt({ batch, batchSegments, guideSelection, modelResolution, titleContext }) {
  return assembleGovernedEditorialPrompt({
    transaction: "editorial_diagnostic",
    titleContext,
    guideSelection,
    modelResolution,
    promptKey: "jm1-prompt-pub-stage0-hierarchical-section",
    promptVersion: "PUB-STAGE0-HIERARCHICAL-SECTION-V1",
    structuredOutputSchema: {
      type: "object",
      required: ["batchId", "segmentIdsReviewed", "entriesReviewed", "findings", "confidence", "unresolvedQuestions"],
      properties: {
        batchId: { type: "string" },
        segmentIdsReviewed: { type: "array", items: { type: "string" } },
        entriesReviewed: { type: "array", items: { type: "string" } },
        findings: {
          type: "array",
          items: {
            type: "object",
            required: ["findingCategory", "conciseFinding", "sourceSegmentIds", "sourceEntryDates", "severity", "confidence", "recommendedTreatment"],
            properties: {
              findingCategory: { type: "string" },
              conciseFinding: { type: "string" },
              sourceSegmentIds: { type: "array", items: { type: "string" } },
              sourceEntryDates: { type: "array", items: { type: "string" } },
              severity: { type: "string" },
              confidence: { type: "number" },
              recommendedTreatment: { type: "string" },
              unresolvedQuestions: { type: "array", items: { type: "string" } }
            }
          }
        },
        confidence: { type: "number" },
        unresolvedQuestions: { type: "array", items: { type: "string" } }
      }
    }
  });
}

function buildSectionPromptBody({ assembled, batch, batchSegments }) {
  return [
    assembled.promptBody,
    "",
    "SECTION ANALYSIS BOUNDARY",
    `Batch ID: ${batch.batchId}`,
    `Month: ${batch.month}`,
    `Quarter: ${batch.quarter}`,
    "",
    "ENTRIES TO REVIEW",
    ...batchSegments.map((segment) => [
      `SEGMENT ${segment.segmentId}`,
      `Entry Date: ${segment.entryDate}`,
      `Title: ${segment.entryTitle || "Untitled"}`,
      `Scripture: ${segment.scriptureReference || "None detected"}`,
      segment.content
    ].join("\n")),
    "",
    "OUTPUT RULES",
    "Only return structured JSON.",
    "Any finding without sourceSegmentIds and sourceEntryDates must be omitted.",
    "Do not invent evidence not present in these entries."
  ].join("\n\n");
}

function buildFinalSynthesisPrompt({ guideSelection, modelResolution, titleContext, monthlySyntheses, quarterlySyntheses, ledger }) {
  const assembled = assembleGovernedEditorialPrompt({
    transaction: "editorial_diagnostic",
    titleContext,
    guideSelection,
    modelResolution,
    promptKey: "jm1-prompt-pub-stage0-hierarchical-final",
    promptVersion: "PUB-STAGE0-HIERARCHICAL-FINAL-V1",
    structuredOutputSchema: {
      type: "object",
      required: ["jm1_diagnosticoutputsummary", "jm1_diagnosticriskflags", "jm1_confidence", "jm1_requireshumanreview"],
      properties: {
        jm1_diagnosticoutputsummary: { type: "string" },
        jm1_diagnosticriskflags: { type: "string" },
        jm1_confidence: { type: "number" },
        jm1_requireshumanreview: { type: "boolean" },
        manuscriptScope: { type: "string" },
        supportForQuarterlyStrategy: { type: "string" },
        publisherJudgmentRequired: { type: "array", items: { type: "string" } }
      }
    }
  });

  return {
    ...assembled,
    promptBody: [
      assembled.promptBody,
      "",
      "GOVERNED SYNTHESIS INPUT",
      `Ledger findings: ${ledger.length}`,
      `Monthly syntheses: ${monthlySyntheses.length}`,
      `Quarterly syntheses: ${quarterlySyntheses.length}`,
      "The manuscript currently ends on August 11. Do not claim September through December were reviewed.",
      "",
      "MONTHLY SYNTHESES",
      JSON.stringify(monthlySyntheses, null, 2),
      "",
      "QUARTERLY SYNTHESES",
      JSON.stringify(quarterlySyntheses, null, 2),
      "",
      "LEDGER SUMMARY",
      JSON.stringify(ledger.slice(0, 60), null, 2)
    ].join("\n\n")
  };
}

async function executeHierarchicalShadowDiagnostic({
  manuscriptArtifactId,
  manuscriptHash,
  manuscriptContent,
  callModel,
  diagnosticId,
  correlationId,
  telemetry,
  titleContext,
  promptVersion = "PUB-STAGE0-DIAGNOSTIC-V1"
}) {
  const segmentation = extractSegments({
    manuscriptArtifactId,
    manuscriptHash,
    manuscriptContent
  });

  const guideSelection = selectStyleGuides({
    imprint: titleContext.imprint,
    manuscriptType: titleContext.manuscriptType || "trade_nonfiction",
    genre: titleContext.genre,
    subgenre: titleContext.subgenre,
    audience: titleContext.audience,
    editorialStage: "editorial_diagnostic",
    format: titleContext.format
  });

  const modelResolution = resolveModelRoute("editorial_diagnostic", {
    deployedAliases: [process.env.AZURE_OPENAI_DEPLOYMENT_NAME || "jm1-pub-diagnostic-primary"]
  });

  const plan = buildAnalysisPlan(segmentation.segments);
  const estimatedCostUsd = estimateCost(plan);
  const costGate = assertCostCeiling(plan, estimatedCostUsd);
  if (!costGate.allowed) {
    return {
      ok: false,
      code: "COST_CEILING_EXCEEDED",
      segmentation,
      plan,
      estimatedCostUsd,
      costGate
    };
  }

  const ledger = [];
  const batchResults = [];
  for (const batch of plan.batches) {
    const batchSegments = segmentation.segments.filter((segment) => batch.segmentIds.includes(segment.segmentId));
    const assembled = buildSectionPrompt({
      batch,
      batchSegments,
      guideSelection,
      modelResolution,
      titleContext
    });
    const promptBody = buildSectionPromptBody({ assembled, batch, batchSegments });
    const childCorrelationId = `${correlationId}-${batch.batchId}`;
    const result = await callModel({
      contractTestMode: false,
      promptBody,
      diagnosticId,
      promptKey: assembled.metadata.promptKey,
      promptVersion: promptVersion,
      executionType: "JMP_EDITORIAL_SHADOW_DIAGNOSTIC",
      editorialTransaction: "GPAT-001",
      gpatId: "GPAT-001",
      modelDeploymentAlias: modelResolution.selectedModel.deploymentAlias,
      selectedStyleGuides: [
        ...(guideSelection.styleGuideIds || []),
        ...(guideSelection.companionGuideIds || [])
      ],
      allowFallback: true,
      telemetry: {
        ...telemetry,
        correlationId: childCorrelationId
      }
    });

    if (!result.ok) {
      return {
        ok: false,
        code: result.error || "SECTION_MODEL_CALL_FAILED",
        segmentation,
        plan,
        estimatedCostUsd,
        failedBatch: batch.batchId,
        batchResults,
        modelResolution
      };
    }

    const validated = validateSectionAnalysisOutput(result.output, new Set(batch.segmentIds));
    if (!validated.valid) {
      return {
        ok: false,
        code: "SECTION_OUTPUT_INVALID",
        segmentation,
        plan,
        estimatedCostUsd,
        failedBatch: batch.batchId,
        validationErrors: validated.errors
      };
    }

    const batchLedger = buildLedgerEntries({
      batch,
      findings: validated.findings,
      modelResolution,
      promptMetadata: assembled.metadata,
      correlationId: childCorrelationId
    });

    ledger.push(...batchLedger);
    batchResults.push({
      batchId: batch.batchId,
      correlationId: childCorrelationId,
      promptHash: assembled.promptHash,
      findingCount: batchLedger.length,
      tokenCounts: result.tokenCounts
    });
  }

  const monthlySyntheses = buildMonthlySyntheses(segmentation.segments, ledger);
  const quarterlySyntheses = buildQuarterlySyntheses(monthlySyntheses);
  const finalPrompt = buildFinalSynthesisPrompt({
    guideSelection,
    modelResolution,
    titleContext,
    monthlySyntheses,
    quarterlySyntheses,
    ledger
  });

  const finalResult = await callModel({
    contractTestMode: false,
    promptBody: finalPrompt.promptBody,
    diagnosticId,
    promptKey: finalPrompt.metadata.promptKey,
    promptVersion,
    executionType: "JMP_EDITORIAL_SHADOW_DIAGNOSTIC",
    editorialTransaction: "GPAT-001",
    gpatId: "GPAT-001",
    modelDeploymentAlias: modelResolution.selectedModel.deploymentAlias,
    selectedStyleGuides: [
      ...(guideSelection.styleGuideIds || []),
      ...(guideSelection.companionGuideIds || [])
    ],
    allowFallback: true,
    telemetry
  });

  if (!finalResult.ok) {
    return {
      ok: false,
      code: finalResult.error || "FINAL_SYNTHESIS_FAILED",
      segmentation,
      plan,
      estimatedCostUsd,
      batchResults,
      monthlySyntheses,
      quarterlySyntheses
    };
  }

  const schema = validateDiagnosticOutputSchema(finalResult.output || {});
  if (!schema.valid) {
    return {
      ok: false,
      code: "FINAL_SCHEMA_INVALID",
      segmentation,
      plan,
      estimatedCostUsd,
      schemaErrors: schema.errors
    };
  }

  const textValidation = validateNoQuotation({
    jm1_diagnosticoutputsummary: finalResult.output.jm1_diagnosticoutputsummary,
    jm1_diagnosticriskflags: finalResult.output.jm1_diagnosticriskflags
  });

  if (!textValidation.valid) {
    return {
      ok: false,
      code: "FINAL_OUTPUT_QUOTATION_VIOLATION",
      segmentation,
      plan,
      estimatedCostUsd,
      quotationViolations: textValidation.violations
    };
  }

  return {
    ok: true,
    segmentation,
    plan: {
      ...plan,
      estimatedCostUsd,
      estimatedDurationMs: estimateDuration(plan)
    },
    guideSelection,
    modelResolution,
    findingsLedger: ledger,
    monthlySyntheses,
    quarterlySyntheses,
    batchResults,
    finalPromptHash: finalPrompt.promptHash,
    finalOutput: finalResult.output,
    finalTokenCounts: finalResult.tokenCounts
  };
}

module.exports = {
  executeHierarchicalShadowDiagnostic
};
