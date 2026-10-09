"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const {
  JACKIE_CANONICAL_AUTHOR_CONTACT_ID: JACKIE,
} = require("../src/author/jackieTitleSystemCommissioningPolicy");
const {
  handleJackieTitleSystemAcceptance,
} = require("../src/functions/runJackieTitleSystemAcceptance");

const OTHER = "22222222-2222-4222-8222-222222222222";
const UNKNOWN = "00000000-0000-4000-8000-000000000001";
const jackieTitle = {
  jm1pub_titleid: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  _jm1_primaryauthor_value: JACKIE,
  _jm1_author_value: JACKIE,
  jm1_canonicalauthorcontactreference: "contact:" + JACKIE,
};
const otherTitle = {
  jm1pub_titleid: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
  _jm1_primaryauthor_value: OTHER,
  _jm1_author_value: OTHER,
  jm1_canonicalauthorcontactreference: "contact:" + OTHER,
};

function makeClient(options = {}) {
  const queries = [];
  return {
    queries,
    async list(entity, query) {
      queries.push({ entity, query });
      if (entity !== "jm1pub_titles") throw new Error("unexpected list target");
      assert.equal(query.$select, "jm1pub_titleid,_jm1_primaryauthor_value,_jm1_author_value,jm1_canonicalauthorcontactreference");
      assert.equal(query.$filter, "statecode eq 0");
      assert.equal(query.$top, "500");
      return [jackieTitle, otherTitle];
    },
    async first(entity, query) {
      queries.push({ entity, query });
      if (entity !== "contacts") throw new Error("unexpected first target");
      if (query.$filter.includes(UNKNOWN) && options.unknownCollision) return { contactid: UNKNOWN };
      const id = query.$filter.match(/[a-f0-9-]{36}/i)?.[0];
      return [JACKIE, OTHER].includes(id) ? { contactid: id } : null;
    },
    create() { throw new Error("write method must not be passed to runner"); },
    patch() { throw new Error("write method must not be passed to runner"); },
  };
}

test("acceptance uses current Jackie and non-Jackie records plus fail-closed synthetic cases", async () => {
  const client = makeClient();
  const result = await handleJackieTitleSystemAcceptance(
    { headers: new Headers({ "x-jm1-diagnostic-runner-key": "test-key" }) },
    { expectedKey: "test-key", client },
  );

  assert.equal(result.status, 200);
  assert.deepEqual(result.jsonBody.cases, {
    liveJackieAuthor: true,
    liveNonJackieAuthorDenied: true,
    missingAuthorDenied: true,
    malformedAuthorDenied: true,
    conflictingAuthorsDenied: true,
    unknownAuthorDenied: true,
  });
  assert.deepEqual(result.jsonBody.effects, {
    queueWrites: 0, titleMutations: 0, stageMutations: 0, communications: 0,
  });
  assert.equal(JSON.stringify(result).includes(jackieTitle.jm1pub_titleid), false);
  assert.equal(JSON.stringify(result).includes(otherTitle.jm1pub_titleid), false);
  assert.equal(client.queries.some(({ entity }) => !["contacts", "jm1pub_titles"].includes(entity)), false);
});

test("acceptance fails closed when live examples are unavailable", async () => {
  const client = makeClient();
  client.list = async () => [];
  const result = await handleJackieTitleSystemAcceptance(
    { headers: new Headers({ "x-jm1-diagnostic-runner-key": "test-key" }) },
    { expectedKey: "test-key", client },
  );
  assert.equal(result.status, 503);
  assert.equal(result.jsonBody.error, "LIVE_AUTHORITY_EXAMPLES_UNAVAILABLE");
});

test("unknown fixture collision blocks acceptance instead of selecting another identity", async () => {
  const result = await handleJackieTitleSystemAcceptance(
    { headers: new Headers({ "x-jm1-diagnostic-runner-key": "test-key" }) },
    { expectedKey: "test-key", client: makeClient({ unknownCollision: true }) },
  );
  assert.equal(result.status, 503);
  assert.equal(result.jsonBody.error, "UNKNOWN_AUTHOR_FIXTURE_COLLISION");
});

test("HTTP handler denies missing and incorrect keys before any Dataverse read", async () => {
  let reads = 0;
  const client = { list: async () => { reads += 1; return []; }, first: async () => { reads += 1; return null; } };
  for (const value of ["", "wrong"]) {
    const result = await handleJackieTitleSystemAcceptance(
      { headers: new Headers({ "x-jm1-diagnostic-runner-key": value }) },
      { expectedKey: "correct", client },
    );
    assert.equal(result.status, 401);
  }
  assert.equal(reads, 0);
});

test("route is GET-only, key-authenticated, indexed, and Function-only in deployment paths", () => {
  const route = fs.readFileSync(path.join(__dirname, "../src/functions/runJackieTitleSystemAcceptance.js"), "utf8");
  const index = fs.readFileSync(path.join(__dirname, "../src/index.js"), "utf8");
  const functionWorkflow = fs.readFileSync(path.join(__dirname, "../../../.github/workflows/diagnostic-ai-runner.yml"), "utf8");
  const webWorkflow = fs.readFileSync(path.join(__dirname, "../../../.github/workflows/azure-app-service-premium.yml"), "utf8");

  assert.match(route, /methods:\s*\["GET"\]/);
  assert.match(route, /x-jm1-diagnostic-runner-key/);
  assert.match(route, /publishing\/authority\/jackie-title-acceptance/);
  assert.match(index, /runJackieTitleSystemAcceptance/);
  assert.match(functionWorkflow, /azure-functions\/diagnostic-ai-runner\/\*\*/);
  assert.doesNotMatch(functionWorkflow, /app\/\*\*/);
  assert.match(webWorkflow, /app\/\*\*/);
  assert.doesNotMatch(webWorkflow, /azure-functions\/diagnostic-ai-runner\/\*\*/);
});
