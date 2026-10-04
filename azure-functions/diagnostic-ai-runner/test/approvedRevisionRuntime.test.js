"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { runApprovedRevision, enabled } = require("../src/editorial/approvedRevisionRuntime");
const { policy, validateInput } = require("../src/editorial/approvedRevisionAuthority");
const { hash } = require("../src/editorial/approvedRevisionDocument");
const { processQueuedTargetedEditorialExecution } = require("../src/editorial/targetedEditorialExecutionQueue");
const env = { JM1_APPROVED_EDITORIAL_REVISION_ENABLED: "true", JM1_APPROVED_EDITORIAL_REVISION_TASK_ID: policy.taskId };
const input = { revisionTaskId: policy.taskId, executionMode: "EXECUTE" };
const { binding, evidence: evidenceFixture } = require("./fixtures/approvedRevisionSkill");
const evidence = evidenceFixture();

function harness() {
  const data = new Map(), effects = [], counters = { produce: 0 };
  let busy = false;
  const store = {
    read: async (k) => data.has(k) ? JSON.parse(data.get(k).toString()) : null,
    readBytes: async (k) => data.get(k) || null,
    async putBytes(k, b) { if (data.has(k)) assert.deepEqual(data.get(k), b); else data.set(k, b); },
    async put(k, v) { return store.putBytes(k, Buffer.from(JSON.stringify(v))); },
    async withClaim(fn) {
      if (busy) return { ok: true, status: "BUSY" };
      busy = true;
      try { return await fn({ assertOwned: async () => {}, state: async (v) => data.set("state.json", Buffer.from(JSON.stringify(v))) }); }
      finally { busy = false; }
    }
  };
  const deps = { env, store, client: {}, graph: async () => { throw new Error("unapproved Graph call"); },
    readAuthority: async () => ({ sourceBuffer: Buffer.from("source"), fingerprint: "authority-1", snapshot: { sources: {}, editorialAuthority: binding() } }),
    produce: async () => { counters.produce++; return { review: Buffer.from("review"), clean: Buffer.from("clean"), evidence }; },
    persistVariant: async (variant, bytes) => { if (!effects.includes(variant)) effects.push(variant); return { variant, sha256: hash(bytes) }; },
    verifyReceipt: async (receipt) => { assert.equal(receipt.outputs.length, 2); assert.equal(receipt.authorApproved, false); }
  };
  return { data, effects, counters, deps, store };
}

test("enablement is default-off and fixed-task only; input cannot carry a plan or source override", async () => {
  assert.equal(enabled({}), false);
  assert.equal(enabled({ ...env, JM1_APPROVED_EDITORIAL_REVISION_TASK_ID: "other" }), false);
  assert.equal(enabled(env), true);
  assert.throws(() => validateInput({ ...input, edits: [] }), /NOT_AUTHORIZED/);
  assert.throws(() => validateInput({ ...input, revisionTaskId: "other" }), /NOT_AUTHORIZED/);
  const h = harness();
  assert.equal((await runApprovedRevision(input, { ...h.deps, env: {} })).status, "DISABLED");
  assert.equal(h.data.size, 0);
});

test("durable receipt survives restart and duplicate queue dispatch without regenerating or duplicating output", async () => {
  const h = harness();
  const first = await runApprovedRevision(input, h.deps);
  assert.equal(first.status, "AWAITING_VISUAL_QA");
  assert.equal(first.receipt.taskCompleted, false);
  assert.deepEqual(first.receipt.editorialAuthority, binding());
  assert.equal(first.receipt.planSha256, hash(JSON.stringify(evidence.plan)));
  const message = { kind: "APPROVED_EDITORIAL_REVISION", version: 1, revisionTaskId: policy.taskId };
  const replay = await processQueuedTargetedEditorialExecution(message, { runApprovedRevision: (i) => runApprovedRevision(i, { ...h.deps }) });
  assert.equal(replay.status, "IDEMPOTENT");
  assert.equal(h.counters.produce, 1);
  assert.deepEqual(h.effects, ["review", "clean"]);
  await assert.rejects(processQueuedTargetedEditorialExecution({ ...message, sourceBuffer: "replacement" }), { safeCode: "REVISION_QUEUE_INVALID" });
});

test("crash after generation envelope or first file is recovered forward using original bytes", async () => {
  for (const partial of [false, true]) {
    const h = harness();
    await h.store.put("generated.json", { review: Buffer.from("review").toString("base64"), clean: Buffer.from("clean").toString("base64"),
      evidence });
    if (partial) await h.store.putBytes("review.docx", Buffer.from("review"));
    assert.equal((await runApprovedRevision(input, h.deps)).status, "AWAITING_VISUAL_QA");
    assert.equal(h.counters.produce, 0);
  }
});

test("transient registration failure persists backoff and retry uses readback instead of regenerating", async () => {
  const h = harness();
  const save = h.deps.persistVariant;
  h.deps.persistVariant = async (v, b) => {
    await save(v, b);
    throw Object.assign(new Error("provider timeout"), { status: 503 });
  };
  const first = await runApprovedRevision(input, h.deps);
  assert.equal(first.status, "RETRY_WAIT");
  assert.equal((await runApprovedRevision(input, h.deps)).status, "BACKOFF");
  const state = await h.store.read("state.json");
  h.data.set("state.json", Buffer.from(JSON.stringify({ ...state, nextAttemptAt: "2020-01-01T00:00:00Z" })));
  h.deps.persistVariant = save;
  assert.equal((await runApprovedRevision(input, h.deps)).status, "AWAITING_VISUAL_QA");
  assert.equal(h.counters.produce, 1);
  assert.deepEqual(h.effects, ["review", "clean"]);
});

test("changed approval fails closed before any file write and remains held on replay", async () => {
  const h = harness();
  let reads = 0;
  h.deps.readAuthority = async () => ({ sourceBuffer: Buffer.from("source"), fingerprint: ++reads === 1 ? "one" : "changed", snapshot: { editorialAuthority: binding() } });
  const first = await runApprovedRevision(input, h.deps);
  assert.equal(first.status, "HELD_AUTHORITY");
  assert.equal(first.code, "REVISION_AUTHORITY_CHANGED_BEFORE_PUBLICATION");
  assert.deepEqual(h.effects, []);
  assert.equal((await runApprovedRevision(input, h.deps)).status, "HELD_AUTHORITY");
});

test("five transient attempts exhaust durably and cannot silently reset on the next timer", async () => {
  const h = harness();
  h.deps.persistVariant = async () => { throw Object.assign(new Error("unavailable"), { status: 503 }); };
  for (let attempt = 1; attempt <= 5; attempt++) {
    const result = await runApprovedRevision(input, h.deps);
    assert.equal(result.attempt, attempt);
    assert.equal(result.status, attempt === 5 ? "RETRY_EXHAUSTED" : "RETRY_WAIT");
    if (attempt < 5) {
      assert.equal((await runApprovedRevision(input, h.deps)).status, "BACKOFF");
      const state = await h.store.read("state.json");
      h.data.set("state.json", Buffer.from(JSON.stringify({ ...state, nextAttemptAt: "2020-01-01T00:00:00Z" })));
    }
  }
  assert.equal((await runApprovedRevision(input, h.deps)).status, "RETRY_EXHAUSTED");
  assert.equal(h.counters.produce, 1); assert.deepEqual(h.effects, []);
  assert.equal([...h.data.keys()].filter((k) => k.startsWith("failure-")).length, 5);
});

test("altered persisted source or recipe evidence is held before external persistence", async () => {
  for (const change of [{ sourceSha256: "different" }, { recipe: "different" }, { checkboxInsertions: 9 }]) {
    const h = harness();
    await h.store.putBytes("review.docx", Buffer.from("review"));
    await h.store.putBytes("clean.docx", Buffer.from("clean"));
    await h.store.put("output-manifest.json", { ...evidence, ...change });
    const result = await runApprovedRevision(input, h.deps);
    assert.equal(result.status, "HELD_AUTHORITY");
    assert.equal(result.code, "REVISION_STORED_OUTPUT_MISMATCH");
    assert.equal(h.counters.produce, 0); assert.deepEqual(h.effects, []);
  }
});

test("concurrent owner attempts serialize, and disablement still permits read-only receipt access", async () => {
  const h = harness();
  let release;
  const gate = new Promise((r) => { release = r; });
  const produce = h.deps.produce;
  h.deps.produce = async () => { await gate; return produce(); };
  const first = runApprovedRevision(input, h.deps);
  await new Promise((r) => setImmediate(r));
  assert.equal((await runApprovedRevision(input, h.deps)).status, "BUSY");
  release(); await first;
  assert.equal((await runApprovedRevision({ ...input, executionMode: "READBACK" }, { ...h.deps, env: {} })).status, "IDEMPOTENT");
});

test("recovery refuses old generic output evidence and altered custom skill plan before external writes", async () => {
  for (const mutate of [
    (e) => { delete e.plan; },
    (e) => { e.editorialAuthority.version = "stale"; },
    (e) => { e.plan.edits[4].proposedText = "replacement"; },
    (e) => { e.planSha256 = "different"; }
  ]) {
    const h = harness(), e = structuredClone(evidence); mutate(e);
    await h.store.put("generated.json", { review: Buffer.from("review").toString("base64"), clean: Buffer.from("clean").toString("base64"), evidence: e });
    const result = await runApprovedRevision(input, h.deps);
    assert.equal(result.status, "HELD_AUTHORITY");
    assert.deepEqual(h.effects, []); assert.equal(h.counters.produce, 0);
  }
});
