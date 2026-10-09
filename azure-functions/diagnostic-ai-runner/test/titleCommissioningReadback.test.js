"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { titleCommissioningReadback: read } = require("../src/lifecycle/titleCommissioningReadback");
const { ownerBinding } = require("../src/lifecycle/titleCommissioningOwnerBindings");
const { planTitleCommissioningRun } = require("../src/lifecycle/titleCommissioningRun");
const titleId = "f1908dc9-5775-f111-ab0f-6045bdd69435";
function fixture() {
  const binding = ownerBinding(titleId); const plan = planTitleCommissioningRun(binding.request);
  const artifacts = [{ artifactId: binding.scope.controllingSourceArtifactId, ...binding.request.source }, ...binding.request.retainedArtifacts]
    .map(a => ({ jm1pub_editorialartifactid: a.artifactId, _jm1pub_titleid_value: titleId, statecode: 0,
      versionnumber: Number(a.version), jm1pub_sha256: a.sha256, jm1pub_iscurrentapproved: true }));
  const records = new Map();
  const deps = {
    client: { first: async (entity, query) => entity === "jm1pub_titles" ? binding.request.title : artifacts.find(a => query.$filter.includes(a.jm1pub_editorialartifactid)) },
    readers: { readScope: async () => binding.scope, verifyArtifactBytes: async () => true },
    containerClient: { getBlockBlobClient: path => ({
      getProperties: async () => { if (!records.has(path)) throw Object.assign(new Error("absent"), { statusCode: 404 }); return { etag: "fixture-etag" }; },
      downloadToBuffer: async (_a, _b, options) => { assert.equal(options.conditions.ifMatch, "fixture-etag"); return Buffer.from(JSON.stringify(records.get(path))); },
      uploadData: async () => { assert.fail("readback cannot write"); }
    }) }
  };
  return { deps, records, plan };
}
test("scope-denied readback never accesses storage or author data", async () => {
  for (const body of [{ mode: "COMMISSIONING_INTAKE_READ_ONLY", titleId: "other" }, { mode: "COMMISSIONING_INTAKE_READ_ONLY", titleId, execute: true }]) {
    assert.equal((await read(body)).status, 400);
  }
});
test("native readback returns exact metadata and zero effects", async () => {
  const x = fixture(); const identity = { titleId, executionId: x.plan.executionId, bindingHash: x.plan.bindingHash };
  x.records.set(`commissioning-executions/${titleId}/${x.plan.bindingHash}.json`, { ...identity, status: "COMPLETED", attempts: 1 });
  x.records.set(`commissioning-intake/${titleId}/${x.plan.bindingHash}.json`, { ...identity, status: "INTAKE_MATERIALS_VERIFIED", productionStageChanged: false, source: ownerBinding(titleId).request.source });
  const result = await read({ mode: "COMMISSIONING_INTAKE_READ_ONLY", titleId }, x.deps);
  assert.equal(result.status, 200); assert.equal(result.jsonBody.effects, 0); assert.equal(result.jsonBody.nativeAuthorityAndBytes, "PASS");
  assert.equal(result.jsonBody.execution.status, "COMPLETED"); assert.equal(result.jsonBody.receipt.productionStageChanged, false);
});
test("cross-title stored receipt is denied, never projected as complete", async () => {
  const x = fixture(); x.records.set(`commissioning-intake/${titleId}/${x.plan.bindingHash}.json`, { titleId: "other", executionId: x.plan.executionId, bindingHash: x.plan.bindingHash });
  await assert.rejects(read({ mode: "COMMISSIONING_INTAKE_READ_ONLY", titleId }, x.deps), /IDENTITY_CONFLICT/);
});
