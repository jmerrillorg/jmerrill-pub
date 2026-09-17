"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const Module = require("node:module");

function loadPreviewRoute() {
  const routes = {};
  const originalLoad = Module._load;
  Module._load = function patched(request, parent, isMain) {
    if (request === "@azure/functions") {
      return { app: { http: (name, config) => { routes[name] = config; } } };
    }
    return originalLoad.call(this, request, parent, isMain);
  };
  const modulePath = require.resolve("../src/functions/previewEnterpriseTemplate");
  delete require.cache[modulePath];
  try {
    require(modulePath);
  } finally {
    Module._load = originalLoad;
  }
  return routes["preview-enterprise-template"];
}

function workloadHeaders(objectId) {
  const principal = Buffer.from(JSON.stringify({ claims: [{ typ: "oid", val: objectId }] })).toString("base64");
  const values = new Map([
    ["x-ms-client-principal-id", objectId],
    ["x-ms-client-principal", principal]
  ]);
  return { get: (name) => values.get(String(name).toLowerCase()) || null };
}

function request(body, objectId = "ce363f5a-94f3-4ea9-9ba3-061404fca098") {
  return { headers: workloadHeaders(objectId), json: async () => body };
}

function payload() {
  return {
    brand: "PUBLISHING",
    templateId: "PUBLISHING.PAYMENT_ELECTION_REQUIRED",
    templateVersion: "1.0.0",
    templateData: {
      authorFirstName: "Avery",
      projectTitle: "A New Beginning",
      packageName: "Starter Publishing Package",
      baseAmountCents: 199900,
      options: [{ code: "FULL_PAY", paymentAmountsCents: [199900], totalBeforeTaxCents: 199900 }]
    }
  };
}

test("authenticated Publishing caller can preview without invoking transport", async () => {
  const route = loadPreviewRoute();
  const result = await route.handler(request(payload()));
  assert.equal(result.status, 200);
  assert.equal(result.jsonBody.rendered, true);
  assert.equal(result.jsonBody.noSend, true);
  assert.match(result.jsonBody.html, /^<!doctype html>/);
  assert.match(result.jsonBody.metadata.htmlSha256, /^[a-f0-9]{64}$/);
});

test("preview denies anonymous and cross-brand callers", async () => {
  const route = loadPreviewRoute();
  const anonymous = await route.handler({ headers: { get: () => null }, json: async () => payload() });
  assert.equal(anonymous.status, 401);

  const diagnosticRunnerObjectId = "e8c51a80-bdb0-46fa-b398-9109719d6427";
  const wrongBrand = await route.handler(request({ ...payload(), brand: "FINANCIAL" }, diagnosticRunnerObjectId));
  assert.equal(wrongBrand.status, 403);
});
