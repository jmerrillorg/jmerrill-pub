"use strict";

const assert = require("node:assert/strict");
const { createHash } = require("node:crypto");
const test = require("node:test");
const { createCoverSafetyAssessment } = require("../src/production/coverSafetyAssessment");

const bytes = Buffer.from("fixture image bytes");
const sha256 = createHash("sha256").update(bytes).digest("hex");
const titleId = "91c5e1ef-2980-f111-ab0f-7c1e525b15c2";
const categories = ["Hate", "SelfHarm", "Sexual", "Violence"];

function fixture(scores) {
  let stored;
  const assess = createCoverSafetyAssessment({ endpoint: "https://ais-jm1-foundry.cognitiveservices.azure.com" }, {
    credential: { getToken: async () => ({ token: "fixture" }) },
    fetch: async (_url, request) => {
      assert.equal(JSON.parse(request.body).image.content, bytes.toString("base64"));
      return { ok: true, json: async () => ({ categoriesAnalysis: scores }) };
    },
    persistEvidence: async (record) => {
      stored = record;
      return { ...record, evidenceId: "evidence-1" };
    }
  });
  return { assess, getStored: () => stored };
}

test("zero-severity image has durable safety evidence", async () => {
  const { assess, getStored } = fixture(categories.map((category) => ({ category, severity: 0 })));
  assert.deepEqual(await assess({ bytes, sha256, titleId }), { passed: true, evidenceId: "evidence-1" });
  assert.equal(getStored().imageSha256, sha256);
});

test("flagged or incomplete scores never pass", async () => {
  const flagged = fixture(categories.map((category) => ({ category, severity: category === "Violence" ? 2 : 0 })));
  assert.equal((await flagged.assess({ bytes, sha256, titleId })).passed, false);
  const incomplete = fixture([{ category: "Hate", severity: 0 }]);
  await assert.rejects(incomplete.assess({ bytes, sha256, titleId }), /COVER_SAFETY_RESULT_INVALID/);
});

test("invalid image identity and endpoint fail closed", async () => {
  const { assess } = fixture(categories.map((category) => ({ category, severity: 0 })));
  await assert.rejects(assess({ bytes, sha256: "a".repeat(64), titleId }), /COVER_SAFETY_INPUT_INVALID/);
  assert.throws(() => createCoverSafetyAssessment({ endpoint: "http://localhost" }, { persistEvidence: async () => {} }),
    /COVER_SAFETY_ENDPOINT_INVALID/);
});
