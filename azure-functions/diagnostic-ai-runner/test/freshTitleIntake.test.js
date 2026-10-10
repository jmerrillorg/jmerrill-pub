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
for (const variant of ["single-source", "multipart", "multipart-timeout", "hidden-owner-conflict"]) test(`${variant} fresh owner persistence and replay`, async () => {
  const multipart = variant.startsWith("multipart");
  const blobs = new Map(), rows = new Map(); let creates = 0, version = 0;
  let interrupted = false, clock = new Date("2026-10-10T05:00:00.000Z");
  const missing = () => Object.assign(new Error("missing"), { statusCode: 404 });
  const conflict = () => Object.assign(new Error("conflict"), { statusCode: 412 });
  const containerClient = { createIfNotExists: async () => {}, getBlockBlobClient: path => ({
    getProperties: async () => { if (!blobs.has(path)) throw missing(); return { etag: blobs.get(path).etag }; },
    downloadToBuffer: async (_a, _b, options) => { const row = blobs.get(path); if (!row) throw missing();
      if (row.etag !== options.conditions.ifMatch) throw conflict(); return row.bytes; },
    uploadData: async (bytes, options) => { const row = blobs.get(path);
      if (options.conditions.ifNoneMatch && row || options.conditions.ifMatch && row?.etag !== options.conditions.ifMatch) throw conflict();
      const etag = String(++version); blobs.set(path, { bytes: Buffer.from(bytes), etag });
      if (variant === "multipart-timeout" && path.endsWith("/components/second-item.docx") && !interrupted) {
        interrupted = true;
        throw Object.assign(new Error("lost successful upload response"), { code: "ETIMEDOUT" });
      }
      return { etag }; }
  }) };
  const client = { first: async (set, query) => rows.get(`${set}:${query.$filter.split(" eq ")[1]}`),
    list: async set => set.includes("/Keys") ? [{ KeyAttributes: ["jmpv2_canonicaltitleid"], EntityKeyIndexStatus: "Active" }] : set === "jmpv2_stagedefinitions" ? [
      { jmpv2_stagecode: "01_INQUIRY", jmpv2_validnextstagecode: "02_INTAKE" },
      { jmpv2_stagecode: "02_INTAKE", jmpv2_validnextstagecode: "03_EDITORIAL_REVIEW" }
    ] : [...rows].filter(([key]) => key.startsWith(`${set}:`)).map(([, row]) => row),
    create: async (set, payload) => { const pk = { jmpv2_lifecycleinstances: "jmpv2_lifecycleinstanceid",
      jmpv2_stageinstances: "jmpv2_stageinstanceid", jmpv2_publishingengagements: "jmpv2_publishingengagementid" }[set];
      if (variant === "hidden-owner-conflict" && set === "jmpv2_publishingengagements") throw conflict();
      rows.set(`${set}:${payload[pk]}`, { ...payload, _ownerid_value: fresh.RUNTIME_OWNER_ID }); creates++; }
  };
  const contact = require("../src/author/jackieTitleSystemCommissioningPolicy").JACKIE_CANONICAL_AUTHOR_CONTACT_ID;
  const bytes = Buffer.from("Synthetic original. No author content."), sha256 = require("node:crypto").createHash("sha256").update(bytes).digest("hex");
  const input = { title: { jm1pub_titleid: titleId, _jm1_primaryauthor_value: contact }, revision: 2,
    source: { reference: "sharepoint:fixture", version: "1", sha256, role: "RECEIVED_ORIGINAL" },
    historyReference: "dataverse:preserved", authorityReference: "human:fixture", handoff: { state: "READY", reference: "human:fixture" },
    sourceCustody: { driveId: "fixture-drive", itemId: "fixture-item", eTag: "fixture-etag", bytes: bytes.length,
      path: "/01_Pipeline_A-Z/02 - Intake/fixture/_Original/source.md", sha256 } };
  let components;
  if (multipart) {
    input.title.jm1pub_titleid = "e797232b-da7a-f111-ab0f-00224820105b";
    input.sourceComponents = [input.sourceCustody, { ...input.sourceCustody, itemId: "second-item",
      path: "/01_Pipeline_A-Z/02 - Intake/fixture/_Original/continued.docx" }];
    const collection = require("../src/lifecycle/freshSourceCollection").bindSourceCollection(input.sourceComponents);
    input.source.sha256 = collection.custodyHash;
    input.source.reference = `sharepoint:collection:${collection.custodyHash}`;
    input.source.version = collection.custodyHash;
    components = input.sourceComponents.map(custody => ({ custody, bytes }));
  }
  const fixtureTitleId = input.title.jm1pub_titleid;
  const deps = { client, containerClient, now: () => clock,
    readFreshSource: async () => ({ input, bytes, components, identity: { contactId: contact }, titleName: "Synthetic fixture" }) };
  let first = await fresh.processFreshTitleIntake(fixtureTitleId, deps);
  if (variant === "hidden-owner-conflict") {
    assert.equal(first.status, "HELD");
    assert.equal(creates, 0);
    assert.equal([...blobs.keys()].some(path => path.startsWith("commissioning-fresh-results/") || path.startsWith("stages/")), false);
    assert.deepEqual(await fresh.processFreshTitleIntake(fixtureTitleId, { ...deps }), first);
    return;
  }
  if (variant === "multipart-timeout") {
    assert.equal(first.status, "RETRY_PENDING");
    assert.equal(creates, 1);
    const original = new Map([...blobs].filter(([path]) => path.includes("/components/")));
    assert.equal(original.size, 2);
    clock = new Date("2026-10-10T05:02:00.000Z");
    first = await fresh.processFreshTitleIntake(fixtureTitleId, { ...deps });
    for (const [path, saved] of original) assert.deepEqual(blobs.get(path), saved);
  }
  assert.equal(first.status, "COMPLETED"); assert.equal(creates, 4);
  const journals = [...blobs].filter(([path]) => path.startsWith("stages/")).map(([, row]) => JSON.parse(row.bytes));
  assert.equal(journals.length, 2); assert.equal(journals.every(row => row.phase === "COMPLETED" && row.events.length === 3), true);
  assert.deepEqual(await fresh.processFreshTitleIntake(fixtureTitleId, { ...deps }), first); assert.equal(creates, 4);
  await fresh.execute(input, deps, { startedAt: "2026-10-10T05:00:00.000Z" }); assert.equal(creates, 4);
  assert.equal([...blobs].filter(([path]) => multipart ? path.includes("/components/") : path.endsWith("original.md")).length, multipart ? 2 : 1);
  if (multipart) {
    const receipt = JSON.parse([...blobs].find(([path]) => path.endsWith("/receipt.json"))[1].bytes);
    assert.equal(receipt.downstreamGate, "SOURCE_COMPONENT_ORDER_AUTHORITY_REQUIRED");
    assert.equal(receipt.concatenationAuthorized, false);
    const stable = { ...input.sourceComponents[1] };
    input.sourceComponents[1].eTag = "changed";
    await assert.rejects(fresh.processFreshTitleIntake(fixtureTitleId, deps), /ORIGINAL_SOURCE_CUSTODY_REQUIRED/);
    input.sourceComponents[1] = stable;
    assert.equal(creates, 4);
  }
});
test("canonical conflict safety requires active exact-title uniqueness, not guessed metadata", async () => {
  for (const keys of [[], [{ KeyAttributes: ["jmpv2_canonicaltitleid"], EntityKeyIndexStatus: "Pending" }],
    [{ KeyAttributes: ["jmpv2_canonicaltitleid", "ownerid"], EntityKeyIndexStatus: "Active" }]]) {
    await assert.rejects(fresh.verifyCanonicalTitleKey({ list: async () => keys }), /UNIQUENESS_UNPROVEN/);
  }
});
test("fresh canonical replay verifies actual row owner without assigning or sharing", async () => {
  const payload = { itemid: "00000000-0000-5000-a000-000000000001" };
  const client = { first: async () => ({ ...payload, _ownerid_value: "other-owner" }), create: () => assert.fail("no mutation") };
  await assert.rejects(fresh.createExact(client, "items", "itemid", payload, fresh.RUNTIME_OWNER_ID), /CANONICAL_OWNER_CONFLICT/);
});
