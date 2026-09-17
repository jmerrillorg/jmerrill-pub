"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const {
  CALLER_REGISTRY_VERSION,
  authorizeCallerForBrand,
  authorizeCallerForTemplate,
  findCallerByObjectId,
  getLegacyCaller,
  listCallers
} = require("../src/policy/callerRegistry");
const { authenticateCaller } = require("../src/security/callerAuthentication");

function request(headers = {}) {
  const normalized = new Map(Object.entries(headers).map(([key, value]) => [key.toLowerCase(), value]));
  return { headers: { get: (name) => normalized.get(String(name).toLowerCase()) || null } };
}

function principalHeader(objectId) {
  return Buffer.from(JSON.stringify({
    auth_typ: "aad",
    claims: [{ typ: "oid", val: objectId }]
  })).toString("base64");
}

test("caller registry is versioned and contains no implicit all-brand grant", () => {
  assert.equal(CALLER_REGISTRY_VERSION, "JM1-RELAY-CALLERS-v1.1.0");
  assert.ok(listCallers().length >= 3);
  assert.equal(listCallers().some((caller) => caller.authorizedBrands.includes("ALL_BRANDS")), false);
});

test("Publishing workload identity is attributable and limited to Publishing", () => {
  const objectId = "ce363f5a-94f3-4ea9-9ba3-061404fca098";
  const result = authenticateCaller(request({
    "x-ms-client-principal-id": objectId,
    "x-ms-client-principal": principalHeader(objectId)
  }));
  assert.equal(result.ok, true);
  assert.equal(result.caller.callerId, "publishing-web-prod");
  assert.equal(result.authModel, "ENTRA_WORKLOAD_IDENTITY");
  assert.equal(authorizeCallerForBrand(result.caller, "PUBLISHING").ok, true);
  assert.equal(authorizeCallerForBrand(result.caller, "FINANCIAL").reason, "CALLER_BRAND_NOT_AUTHORIZED");
});

test("unknown workload identity is denied and cannot fall back to a shared key", () => {
  process.env.JM1_RELAY_API_KEY = "legacy-key";
  const objectId = "00000000-0000-0000-0000-000000000001";
  const result = authenticateCaller(request({
    "x-ms-client-principal-id": objectId,
    "x-ms-client-principal": principalHeader(objectId),
    "x-jm1-relay-key": "legacy-key"
  }));
  assert.equal(result.ok, false);
  assert.equal(result.reason, "UNKNOWN_CALLER");
});

test("anonymous and malformed principals are denied", () => {
  delete process.env.JM1_RELAY_API_KEY;
  assert.equal(authenticateCaller(request()).reason, "ANONYMOUS_OR_INVALID_CALLER");
  assert.equal(authenticateCaller(request({ "x-ms-client-principal": "not-base64-json" })).reason, "CALLER_PRINCIPAL_INVALID");
});

test("legacy shared key remains an explicit Publishing-only compatibility caller", () => {
  process.env.JM1_RELAY_API_KEY = "legacy-key";
  const result = authenticateCaller(request({ "x-jm1-relay-key": "legacy-key" }));
  assert.equal(result.ok, true);
  assert.equal(result.caller, getLegacyCaller());
  assert.equal(result.caller.status, "LEGACY_COMPATIBILITY");
  assert.equal(authorizeCallerForBrand(result.caller, "JMP").ok, true);
  assert.equal(authorizeCallerForBrand(result.caller, "JMFN").reason, "CALLER_BRAND_NOT_AUTHORIZED");
});

test("registry lookup rejects missing and unknown object IDs", () => {
  assert.equal(findCallerByObjectId(""), null);
  assert.equal(findCallerByObjectId("00000000-0000-0000-0000-000000000002"), null);
});

test("diagnostic runner is limited to the payment-election template namespace", () => {
  const runner = findCallerByObjectId("e8c51a80-bdb0-46fa-b398-9109719d6427");
  assert.equal(authorizeCallerForTemplate(runner, "PUBLISHING.PAYMENT_ELECTION_REQUIRED").ok, true);
  assert.equal(authorizeCallerForTemplate(runner, "PUBLISHING.UNRELATED_MESSAGE").reason, "CALLER_TEMPLATE_NOT_AUTHORIZED");
});
