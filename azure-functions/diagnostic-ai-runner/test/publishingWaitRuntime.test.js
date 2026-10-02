"use strict";
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { runWaitReconciliation } = require("../src/functions/runPublishingWaitRuntime");
const { createPublishingWaitRuntime } = require("../src/lifecycle/publishingWaitRuntime");
const { validateWaitSignal } = require("../src/lifecycle/publishingWaitSignal");

test("queue contract uses raw JSON matching the deployed host encoding", () => {
  assert.equal(require("../host.json").extensions.queues.messageEncoding, "none");
  const wire = '{"schemaVersion":1,"eventType":"WAIT_RESOLVED","waitId":"00000001-1111-4111-8111-111111111111","sourceEventId":"resolved_' + "a".repeat(64) + '","owner":"jmerrillorg/jmerrill-pub","evidenceReference":"proof:<source>&version=1"}';
  assert.doesNotThrow(() => validateWaitSignal(JSON.parse(wire)));
});

test("producer outage is observable and does not suppress existing wait reconciliation", async () => {
  let scanned = false, published;
  const runtime = {
    produceAuthorWaits: async () => { throw new Error("private provider response"); },
    store: { async *list() { scanned = true; } },
    publishHealth: async (results, failures) => (published = { results, failures })
  };
  await runWaitReconciliation(runtime);
  assert.equal(scanned, true);
  assert.deepEqual(published.failures, [{ code: "PUBLISHING_WAIT_PRODUCER_FAILED" }]);
  assert.equal(JSON.stringify(published).includes("private"), false);
});

test("one gate source failure does not suppress other scoped gates", async () => {
  const titleId = "00000002-1111-4111-8111-111111111111";
  const previous = [process.env.JM1_PUBLISHING_WAIT_RUNTIME_ENABLED, process.env.JM1_PUBLISHING_WAIT_TITLE_IDS];
  process.env.JM1_PUBLISHING_WAIT_RUNTIME_ENABLED = "true";
  process.env.JM1_PUBLISHING_WAIT_TITLE_IDS = titleId;
  let reads = 0;
  try {
    const runtime = createPublishingWaitRuntime({
      client: { list: async () => [1, 2].map(n => ({ jm1pub_editorialapprovalgateid: `gate${n}`, _jm1pub_titleid_value: titleId })),
        first: async () => { reads++; if (reads === 1) throw new Error("source outage"); return null; } },
      inbound: { listPrefix: async () => [] }, graph: {}, store: {}, projection: {}
    });
    const result = await runtime.produceAuthorWaits();
    assert.equal(reads, 2);
    assert.equal(result.failures.length, 1);
    assert.equal(result.failures[0].gateId, "gate1");
  } finally {
    for (const [i, key] of ["JM1_PUBLISHING_WAIT_RUNTIME_ENABLED", "JM1_PUBLISHING_WAIT_TITLE_IDS"].entries()) {
      if (previous[i] === undefined) delete process.env[key]; else process.env[key] = previous[i];
    }
  }
});
