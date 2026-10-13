"use strict";
const test = require("node:test"), assert = require("node:assert/strict");
const { read, handler } = require("../src/distribution/sourceReader");
const env = { JM1_DIAGNOSTIC_RUNNER_KEY: "secret", JM1_DISTRIBUTOR_SOURCE_READER_ENABLED: "true", JM1_DISTRIBUTOR_COLLECTION_MONTH: "2026-10" };
function fixture() {
  const file = { id: "A".repeat(32), name: "LSI POD Wholesale Comp Report 2026.xls", size: 3, eTag: "v1", createdDateTime: "2026-10-01T00:00:00Z" };
  const calls = [], deps = { env, credential: { getToken: async () => ({ token: "token" }) }, fetch: async (url, options) => {
    calls.push({ url: String(url), options });
    if (String(url).endsWith("/children")) return Response.json({ value: [file] });
    if (String(url).startsWith("https://jmerrillfoundation.sharepoint.com/")) return new Response("abc");
    return Response.json({ ...file, "@microsoft.graph.downloadUrl": "https://jmerrillfoundation.sharepoint.com/download" });
  } }; return { file, calls, deps };
}
test("reader denies absent authentication and defaults disabled", async () => {
  const request = { headers: new Headers(), json: async () => ({}) };
  assert.equal((await handler(request, { env })).status, 401);
  request.headers.set("x-jm1-diagnostic-runner-key", "secret");
  assert.equal((await handler(request, { env: { ...env, JM1_DISTRIBUTOR_SOURCE_READER_ENABLED: "false" } })).status, 503);
});
test("reader rejects arbitrary URLs, mutations, months and nonmember items", async () => {
  const f = fixture();
  for (const body of [{ mode: "DELETE", month: "2026-10" }, { mode: "ARCHIVE_LIST", month: "2026-10", url: "https://evil.test" }, { mode: "ARCHIVE_LIST", month: "2026-09" }]) await assert.rejects(read(body, f.deps));
  assert.equal(f.calls.length, 0);
  await assert.rejects(read({ mode: "SOURCE_READ", month: "2026-10", itemId: "B".repeat(32) }, f.deps), /NOT_IN_ARCHIVE/);
});
test("reader verifies source membership and ETags without sending Graph token to download", async () => {
  const f = fixture(), result = await read({ mode: "SOURCE_READ", month: "2026-10", itemId: f.file.id }, f.deps);
  assert.equal(result.bytes, Buffer.from("abc").toString("base64")); assert.equal(result.mutations, 0);
  assert.equal(f.calls[2].options.headers, undefined); assert.equal(f.calls[2].options.redirect, "error");
  assert.equal(result.file["@microsoft.graph.downloadUrl"], undefined);
});
test("reader preserves exact denial request ID and refuses changed custody", async () => {
  const f = fixture();
  await assert.rejects(read({ mode: "ARCHIVE_LIST", month: "2026-10" }, { ...f.deps, fetch: async () => new Response("", { status: 403, headers: { "request-id": "exact-request" } }) }), e => e.message === "DISTRIBUTOR_SHAREPOINT_HTTP_403" && e.requestId === "exact-request");
  const original = f.deps.fetch; f.deps.fetch = async (url, options) => { const r = await original(url, options); if (f.calls.length === 4) return Response.json({ eTag: "v2" }); return r; };
  await assert.rejects(read({ mode: "SOURCE_READ", month: "2026-10", itemId: f.file.id }, f.deps), /SOURCE_CHANGED/);
});
test("pagination cannot cross origins and raw download cannot redirect", async () => {
  const f = fixture();
  await assert.rejects(read({ mode: "ARCHIVE_LIST", month: "2026-10" }, { ...f.deps, fetch: async () => Response.json({ value: [], "@odata.nextLink": "https://other.test/" }) }), /PAGINATION_INVALID/);
  const original = f.deps.fetch; f.deps.fetch = async (url, options) => String(url).includes("/items/") ? Response.json({ ...f.file, "@microsoft.graph.downloadUrl": "https://other.test/" }) : original(url, options);
  await assert.rejects(read({ mode: "SOURCE_READ", month: "2026-10", itemId: f.file.id }, f.deps), /DOWNLOAD_HOST_DENIED/);
});
