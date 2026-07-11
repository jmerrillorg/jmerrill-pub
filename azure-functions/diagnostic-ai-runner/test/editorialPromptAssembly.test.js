"use strict";

const { describe, test } = require("node:test");
const assert = require("node:assert/strict");

const { selectStyleGuides } = require("../src/editorial/editorialGuideSelector");
const { resolveModelRoute } = require("../src/editorial/editorialModelRoutingRegistry");
const { assembleGovernedEditorialPrompt } = require("../src/editorial/editorialPromptAssembly");

describe("editorial prompt assembly", () => {
  test("assembles only the selected guides and returns a stable hash", () => {
    const guideSelection = selectStyleGuides({
      imprint: "J_MERRILL_PUBLISHING",
      manuscriptType: "trade_nonfiction",
      genre: "devotional",
      editorialStage: "developmental_editing"
    });
    const modelResolution = resolveModelRoute("developmental_editing", {
      deployedAliases: ["jm1-pub-diagnostic-primary"]
    });

    const assembled = assembleGovernedEditorialPrompt({
      transaction: "developmental_editing",
      titleContext: {
        title: "The Intentional Leader",
        publishingAssetId: "c9dc862e-da7a-f111-ab0f-000d3a14673b",
        editorialStage: "Developmental Editing",
        imprint: "J_MERRILL_PUBLISHING",
        genre: "Devotional",
        audience: "Adult"
      },
      guideSelection,
      modelResolution,
      promptKey: "jm1-prompt-pub-developmental-routing",
      promptVersion: "PUB-DEVELOPMENTAL-ROUTING-V1",
      structuredOutputSchema: {
        type: "object",
        properties: {
          structuralInsight: { type: "string" }
        }
      }
    });

    assert.ok(assembled.promptHash);
    assert.ok(assembled.promptBody.includes("Chicago Manual of Style"));
    assert.ok(assembled.promptBody.includes("JMP Developmental Editing — Reference"));
    assert.ok(assembled.promptBody.includes("JMP Editorial Overlays — Faith & Inspirational"));
    assert.equal(assembled.metadata.selectedGuideIds.includes("JMP-SG-APA"), false);
  });
});
