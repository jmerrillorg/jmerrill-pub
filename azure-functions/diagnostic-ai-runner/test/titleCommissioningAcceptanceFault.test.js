"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { acceptanceFaultDeps } = require("../src/lifecycle/titleCommissioningAcceptanceFault");
const { ownerBinding } = require("../src/lifecycle/titleCommissioningOwnerBindings");
const id = "f1908dc9-5775-f111-ab0f-6045bdd69435";
const exerciseId = "00000000-0000-4000-8000-000000000055";
function fixture() {
  const { request, scope } = ownerBinding(id); const saved = new Map();
  const artifacts = [{ artifactId: scope.controllingSourceArtifactId, ...request.source }, ...request.retainedArtifacts]
    .map(a => ({ jm1pub_editorialartifactid: a.artifactId, _jm1pub_titleid_value: id, statecode: 0,
      versionnumber: Number(a.version), jm1pub_sha256: a.sha256, jm1pub_iscurrentapproved: true }));
  const deps = { client: { first: async (entity, query) => entity === "jm1pub_titles" ? request.title : artifacts.find(a => query.$filter.includes(a.jm1pub_editorialartifactid)) },
    verifyArtifactBytes: async () => true, readScope: async () => scope,
    containerClient: { getBlockBlobClient: path => ({
      uploadData: async bytes => { if (saved.has(path)) throw Object.assign(new Error("exists"), { statusCode: 412 }); saved.set(path, bytes); },
      downloadToBuffer: async () => saved.get(path)
    }) } };
  return { request, deps, saved };
}
test("fault is default-off and rejects arbitrary title, exercise and mode", () => {
  const x = fixture(); assert.equal(acceptanceFaultDeps(x.request, x.deps, {}), x.deps);
  for (const env of [{ JM1_TITLE_COMMISSIONING_ACCEPTANCE_FAULT: "unknown" },
    { JM1_TITLE_COMMISSIONING_ACCEPTANCE_FAULT: "RECEIPT_WRITE_TRANSIENT", JM1_TITLE_COMMISSIONING_ACCEPTANCE_ID: "bad" }]) {
    assert.throws(() => acceptanceFaultDeps(x.request, x.deps, env), /SCOPE_DENIED/);
  }
  assert.throws(() => acceptanceFaultDeps({ title: { jm1pub_titleid: "other" } }, x.deps,
    { JM1_TITLE_COMMISSIONING_ACCEPTANCE_FAULT: "AFTER_CLAIM_PAUSE", JM1_TITLE_COMMISSIONING_ACCEPTANCE_ID: exerciseId }), /SCOPE_DENIED/);
});
test("receipt fixture preserves plan; removing control resumes same source and receipt", async () => {
  const x = fixture(); const env = { JM1_TITLE_COMMISSIONING_ACCEPTANCE_FAULT: "RECEIPT_WRITE_TRANSIENT", JM1_TITLE_COMMISSIONING_ACCEPTANCE_ID: exerciseId };
  const fault = acceptanceFaultDeps(x.request, x.deps, env);
  await assert.rejects(fault.executeIntake(x.request, fault), { statusCode: 503 });
  assert.equal([...x.saved.keys()].filter(path => path.startsWith("commissioning-plans/")).length, 1);
  assert.equal([...x.saved.keys()].filter(path => path.startsWith("commissioning-intake/")).length, 0);
  const { executeTitleCommissioningIntake } = require("../src/lifecycle/titleCommissioningIntake");
  const result = await executeTitleCommissioningIntake(x.request, acceptanceFaultDeps(x.request, x.deps, {}));
  assert.equal(result.receipt.productionStageChanged, false); assert.equal(result.receipt.status, "INTAKE_MATERIALS_VERIFIED");
  assert.equal((await executeTitleCommissioningIntake(x.request, x.deps)).duplicate, true);
  assert.equal([...x.saved.keys()].filter(path => path.startsWith("commissioning-intake/")).length, 1);
});
test("restart pause records isolated exercise before waiting and never invokes intake", async () => {
  const x = fixture(); let paused = false;
  const deps = acceptanceFaultDeps(x.request, { ...x.deps, pause: async ms => { paused = true; assert.equal(ms, 360000); } },
    { JM1_TITLE_COMMISSIONING_ACCEPTANCE_FAULT: "AFTER_CLAIM_PAUSE", JM1_TITLE_COMMISSIONING_ACCEPTANCE_ID: exerciseId });
  await assert.rejects(deps.executeIntake(x.request, deps), { statusCode: 503 });
  assert.equal(paused, true); assert.equal(x.saved.size, 1);
  assert.ok([...x.saved.keys()][0].startsWith("commissioning-acceptance/"));
});
