"use strict";
const test = require("node:test"), assert = require("node:assert/strict");
const fresh = require("../src/lifecycle/freshTitleIntake");
const titleId = Object.keys(fresh.POLICIES)[0];
const env = { JM1_TITLE_COMMISSIONING_FRESH_ENABLED: "true", JM1_TITLE_COMMISSIONING_FRESH_TITLE_IDS: titleId,
  JM1_TITLE_COMMISSIONING_REVIEW_ENABLED: "false", JM1_PUBLISHING_STAGE_RUNTIME_ENABLED: "false", JM1_PUBLISHING_WAIT_RUNTIME_ENABLED: "false" };
test("fresh intake allowlist excludes external titles and paid/broad workers", () => {
  assert.equal(fresh.enabled(titleId, env), true);
  for (const changed of [{ JM1_TITLE_COMMISSIONING_REVIEW_ENABLED: "true" }, { JM1_PUBLISHING_STAGE_RUNTIME_ENABLED: "true" },
    { JM1_TITLE_COMMISSIONING_FRESH_TITLE_IDS: `${titleId},${titleId}` }, { JM1_TITLE_COMMISSIONING_FRESH_TITLE_IDS: "other" }]) {
    assert.equal(fresh.enabled(titleId, { ...env, ...changed }), false);
  }
  assert.equal(fresh.enabled("other", env), false);
});
test("disabled fresh HTTP path performs no source or storage reads", async () => {
  const result = await fresh.handler({ titleId, mode: "FRESH_INTAKE" }, { env: {}, client: { first: () => assert.fail("no read") } });
  assert.equal(result.status, 403); assert.equal(result.jsonBody.effects, 0);
});
test("canonical creation recovers by exact deterministic ID and rejects differing business fields", async () => {
  let row, creates = 0;
  const payload = { itemid: "00000000-0000-5000-a000-000000000001", status: "CLOSED" };
  const client = { first: async () => row, create: async (_set, input) => { creates++; row = { ...input }; } };
  assert.deepEqual(await fresh.createExact(client, "items", "itemid", payload), payload);
  await fresh.createExact(client, "items", "itemid", payload); assert.equal(creates, 1);
  row.status = "OPEN";
  await assert.rejects(fresh.createExact(client, "items", "itemid", payload), /CANONICAL_RECORD_CONFLICT/);
  assert.equal(creates, 1);
});
test("ambiguous provider creation is read back on replay, never given a new identity", async () => {
  let row, creates = 0;
  const payload = { itemid: "00000000-0000-5000-a000-000000000001" };
  const client = { first: async () => row, create: async (_set, input) => {
    creates++; row = { ...input }; throw Object.assign(new Error("timeout"), { code: "ETIMEDOUT" });
  } };
  await assert.rejects(fresh.createExact(client, "items", "itemid", payload), /timeout/);
  assert.deepEqual(await fresh.createExact(client, "items", "itemid", payload), payload); assert.equal(creates, 1);
});
test("fresh source authority and execution intent are required before any canonical mutation", async () => {
  await assert.rejects(fresh.execute({}, { client: { create: () => assert.fail("no write") } }), /EXECUTION_INTENT_REQUIRED/);
  await assert.rejects(fresh.readSource("other", { client: { first: () => assert.fail("no read") } }), /SOURCE_SCOPE_DENIED/);
});
test("fresh request cannot inject source or authority into the keyed owner route", async () => {
  const handler = require("../src/lifecycle/titleCommissioningSourceRegistration").sourceRegistrationHandler;
  const result = await handler({ headers: { get: () => "fixture-key" }, json: async () => ({ titleId, mode: "FRESH_INTAKE", source: "untrusted" }) },
    { env: { ...env, JM1_DIAGNOSTIC_RUNNER_KEY: "fixture-key" } });
  assert.equal(result.status, 400); assert.equal(result.jsonBody.effects, 0);
});
test("fresh owner persists new canonical intake and journal outcomes; restart repeats no creates", async () => {
  const blobs = new Map(), rows = new Map(); let creates = 0, version = 0;
  const missing = () => Object.assign(new Error("missing"), { statusCode: 404 });
  const conflict = () => Object.assign(new Error("conflict"), { statusCode: 412 });
  const containerClient = { createIfNotExists: async () => {}, getBlockBlobClient: path => ({
    getProperties: async () => { if (!blobs.has(path)) throw missing(); return { etag: blobs.get(path).etag }; },
    downloadToBuffer: async (_a, _b, options) => { const row = blobs.get(path); if (!row) throw missing();
      if (row.etag !== options.conditions.ifMatch) throw conflict(); return row.bytes; },
    uploadData: async (bytes, options) => { const row = blobs.get(path);
      if (options.conditions.ifNoneMatch && row || options.conditions.ifMatch && row?.etag !== options.conditions.ifMatch) throw conflict();
      const etag = String(++version); blobs.set(path, { bytes: Buffer.from(bytes), etag }); return { etag }; }
  }) };
  const client = { first: async (set, query) => rows.get(`${set}:${query.$filter.split(" eq ")[1]}`),
    list: async set => set === "jmpv2_stagedefinitions" ? [
      { jmpv2_stagecode: "01_INQUIRY", jmpv2_validnextstagecode: "02_INTAKE" },
      { jmpv2_stagecode: "02_INTAKE", jmpv2_validnextstagecode: "03_EDITORIAL_REVIEW" }
    ] : [...rows].filter(([key]) => key.startsWith(`${set}:`)).map(([, row]) => row),
    create: async (set, payload) => { const pk = { jmpv2_lifecycleinstances: "jmpv2_lifecycleinstanceid",
      jmpv2_stageinstances: "jmpv2_stageinstanceid", jmpv2_publishingengagements: "jmpv2_publishingengagementid" }[set];
      rows.set(`${set}:${payload[pk]}`, { ...payload }); creates++; }
  };
  const contact = require("../src/author/jackieTitleSystemCommissioningPolicy").JACKIE_CANONICAL_AUTHOR_CONTACT_ID;
  const bytes = Buffer.from("Synthetic original. No author content."), sha256 = require("node:crypto").createHash("sha256").update(bytes).digest("hex");
  const input = { title: { jm1pub_titleid: titleId, _jm1_primaryauthor_value: contact }, revision: 2,
    source: { reference: "sharepoint:fixture", version: "1", sha256, role: "RECEIVED_ORIGINAL" },
    historyReference: "dataverse:preserved", authorityReference: "human:fixture", handoff: { state: "READY", reference: "human:fixture" },
    sourceCustody: { driveId: "fixture-drive", itemId: "fixture-item", eTag: "fixture-etag", bytes: bytes.length,
      path: "/01_Pipeline_A-Z/02 - Intake/fixture/_Original/source.md", sha256 } };
  const deps = { client, containerClient, now: () => new Date("2026-10-10T05:00:00.000Z"),
    readFreshSource: async () => ({ input, bytes, identity: { contactId: contact }, titleName: "Synthetic fixture" }) };
  const first = await fresh.processFreshTitleIntake(titleId, deps);
  assert.equal(first.status, "COMPLETED"); assert.equal(creates, 4);
  const journals = [...blobs].filter(([path]) => path.startsWith("stages/")).map(([, row]) => JSON.parse(row.bytes));
  assert.equal(journals.length, 2); assert.equal(journals.every(row => row.phase === "COMPLETED" && row.events.length === 3), true);
  assert.deepEqual(await fresh.processFreshTitleIntake(titleId, { ...deps }), first); assert.equal(creates, 4);
  await fresh.execute(input, deps, { startedAt: "2026-10-10T05:00:00.000Z" }); assert.equal(creates, 4);
  assert.equal([...blobs].filter(([path]) => path.endsWith("original.md")).length, 1);
});
