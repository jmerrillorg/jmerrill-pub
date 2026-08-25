"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const {
  BLEED_INCHES,
  buildFullWrapSpec,
  calculateSpineWidth,
  executeFullWrapPreparation,
  validateFullWrapInputs
} = require("../src/production/fullWrapExecutor");

const TASK_ID = "6dd4bddc-07a0-f111-b8dc-000d3a14673b";
const TITLE_ID = "e797232b-da7a-f111-ab0f-00224820105b";

function completeInput(overrides = {}) {
  return {
    taskId: TASK_ID,
    titleId: TITLE_ID,
    title: "The Intentional Leader, Volume I",
    author: "Jackie Smith Jr",
    trimSize: "6 x 9",
    paperStock: "55_CREAM",
    pageCount: 393,
    isbn: "9780000000000",
    barcode: "barcode://9780000000000",
    imprint: "J Merrill Publishing",
    distributionPath: "IngramSpark",
    backCoverCopy: "A governed back-cover description approved for full-wrap preparation.",
    sourceAssets: [
      {
        type: "FRONT_COVER",
        location: "sharepoint://cover/front.png",
        sha256: "a".repeat(64),
        authority: "Cover concept approval"
      },
      {
        type: "INTERIOR_PROOF",
        location: "sharepoint://interior/proof.pdf",
        sha256: "b".repeat(64),
        authority: "Final pagination proof"
      }
    ],
    confirmFullWrapExecution: true,
    ...overrides
  };
}

test("Full Wrap validation fails closed when production dimensions and barcode authority are missing", () => {
  const result = validateFullWrapInputs({
    taskId: TASK_ID,
    titleId: TITLE_ID,
    title: "The Intentional Leader",
    author: "Jackie Smith Jr",
    imprint: "J Merrill Publishing",
    sourceAssets: [{ type: "FRONT_COVER", location: "sharepoint://front.png" }]
  });

  assert.equal(result.ok, false);
  assert.deepEqual(result.missing.sort(), [
    "BACK_COVER_COPY",
    "BARCODE",
    "DISTRIBUTION_PATH",
    "FINAL_PAGE_COUNT",
    "INTERIOR_PROOF_ASSET",
    "ISBN",
    "PAPER_STOCK",
    "TRIM_SIZE"
  ].sort());
});

test("Full Wrap geometry uses final page count, trim, paper profile, and bleed", () => {
  const spine = calculateSpineWidth({ pageCount: 393, paperStock: "55 lb cream" });

  assert.equal(spine.inches, 0.9825);
  assert.equal(spine.paperProfile.key, "55_CREAM");

  const result = buildFullWrapSpec(completeInput());
  assert.equal(result.ok, true);
  assert.equal(result.spec.dimensions.bleedInches, BLEED_INCHES);
  assert.equal(result.spec.dimensions.fullWrapWidthInches, 13.2325);
  assert.equal(result.spec.dimensions.fullWrapHeightInches, 9.25);
  assert.match(result.checksum, /^[0-9a-f]{64}$/);
});

test("Full Wrap spec preserves source asset lineage and does not imply release", () => {
  const result = buildFullWrapSpec(completeInput());

  assert.equal(result.spec.sourceAssets.length, 2);
  assert.equal(result.spec.sourceAssets[0].sha256, "a".repeat(64));
  assert.match(result.spec.constraints.join(" "), /Do not advance release/);
  assert.match(result.spec.constraints.join(" "), /Preserve source/);
});

test("Full Wrap execution logs blocked missing input without advancing lifecycle", async () => {
  const writes = [];
  const result = await executeFullWrapPreparation({
    taskId: TASK_ID,
    confirmFullWrapExecution: true
  }, {
    gateOpen: true,
    apiBase: "https://example.crm.dynamics.com/api/data/v9.2",
    resourceUrl: "https://example.crm.dynamics.com",
    getToken: async () => "token",
    hydrateFromTask: async () => ({
      taskId: TASK_ID,
      titleId: TITLE_ID,
      title: "The Intentional Leader",
      author: "Jackie Smith Jr",
      pageCount: 393,
      imprint: "J Merrill Publishing"
    }),
    dataverseRequest: async (_api, _token, path, options = {}) => {
      if (options.method === "POST") {
        writes.push({ path, body: options.body });
        return { body: { jm1_executionlogid: "blocked-log-id" } };
      }
      return { body: { value: [] } };
    }
  });

  assert.equal(result.ok, false);
  assert.equal(result.code, "FULL_WRAP_EXECUTION_BLOCKED");
  assert.equal(result.executionLogId, "blocked-log-id");
  assert.equal(writes.length, 1);
  assert.equal(result.liveActions?.advancedLifecycle, false);
  assert.equal(result.liveActions?.sentAuthorCommunication, false);
});

test("Full Wrap preparation blocks when confirmation is absent", async () => {
  const result = await executeFullWrapPreparation(completeInput({ confirmFullWrapExecution: false }), {
    gateOpen: true
  });

  assert.equal(result.ok, false);
  assert.equal(result.reason, "CONFIRMATION_REQUIRED");
});
