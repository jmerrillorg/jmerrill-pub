"use strict";
const { timingSafeEqual, createHash } = require("node:crypto");
const DRIVE = "b!mA37NWi8UEKdDYwH1o5AJNWKIBAoAPBIn_pxeBKSSDVm9PH59uWnQpr1oD4m79se";
const GRAPH = "https://graph.microsoft.com/v1.0/";
const ENTITIES = ["jm1pub_royaltylines", "jm1_royaltytransactions", "jmpv2_royaltystatements", "jmpv2_royaltypaymentevidences", "jm1_executionlogs?$filter=contains(jm1_actiontype,'ROYALTY')"];
function fail(code, response) { throw Object.assign(Error(code), { requestId: response?.headers.get("request-id") || response?.headers.get("x-ms-service-request-id") || null }); }
async function read(body, deps = {}) {
  const env = deps.env || process.env, request = deps.fetch || fetch;
  if (!body || Object.keys(body).some(k => !["mode", "month", "itemId"].includes(k)) ||
      !/^20\d{2}-(0[1-9]|1[0-2])$/.test(body.month || "") ||
      !["ARCHIVE_LIST", "SOURCE_READ", "PRIOR_LEDGER"].includes(body.mode) ||
      (body.mode === "SOURCE_READ" ? !/^[A-Z0-9]{32}$/.test(body.itemId || "") : body.itemId !== undefined)) fail("DISTRIBUTOR_READ_SCOPE_DENIED");
  if (env.JM1_DISTRIBUTOR_COLLECTION_MONTH && body.month !== env.JM1_DISTRIBUTOR_COLLECTION_MONTH) fail("DISTRIBUTOR_MONTH_OUT_OF_SCOPE");
  const credential = deps.credential || new (require("@azure/identity").ManagedIdentityCredential)();
  async function response(url, token) {
    const r = await request(url, { headers: { Authorization: `Bearer ${token}`, Prefer: "odata.maxpagesize=5000" }, redirect: "error", signal: AbortSignal.timeout(30000) });
    if (!r.ok) fail(`DISTRIBUTOR_${url.startsWith(GRAPH) ? "SHAREPOINT" : "PRIOR_LEDGER"}_HTTP_${r.status}`, r);
    return r;
  }
  async function list(base, path, token, maximum) {
    let next = base + path; const seen = new Set(), rows = [];
    while (next) {
      if (typeof next !== "string" || !next.startsWith(base) || seen.has(next) || seen.size >= 100) fail("DISTRIBUTOR_PAGINATION_INVALID");
      seen.add(next); const value = await (await response(next, token)).json();
      if (!Array.isArray(value.value)) fail("DISTRIBUTOR_SOURCE_INVALID");
      rows.push(...value.value); if (rows.length > maximum) fail("DISTRIBUTOR_SOURCE_LIMIT");
      next = value["@odata.nextLink"];
    } return rows;
  }
  if (body.mode === "PRIOR_LEDGER") {
    const base = env.DATAVERSE_WEB_API_BASE_URL?.replace(/\/$/, "") + "/";
    if (!/^https:\/\/[^/]+\.crm\d*\.dynamics\.com\/api\/data\/v9\.2\/$/.test(base)) fail("DISTRIBUTOR_DATAVERSE_UNCONFIGURED");
    const token = (await credential.getToken(`${env.DATAVERSE_RESOURCE_URL.replace(/\/$/, "")}/.default`)).token;
    const rows = {};
    for (const entity of ENTITIES) rows[entity.split("?")[0]] = await list(base, entity, token, 50000);
    return { checkedAt: new Date().toISOString(), rows, mutations: 0 };
  }
  const token = (await credential.getToken("https://graph.microsoft.com/.default")).token;
  const files = await list(GRAPH, `drives/${DRIVE}/root:/04_Financials/${body.month.replace("-", "/")}:/children`, token, 100);
  // Return only custody metadata, never Graph download URLs or unrelated properties.
  const metadata = f => ({ id: f.id, name: f.name, size: f.size, eTag: f.eTag, createdDateTime: f.createdDateTime });
  if (body.mode === "ARCHIVE_LIST") return { files: files.map(metadata), driveId: DRIVE, mutations: 0 };
  const file = files.find(f => f.id === body.itemId);
  if (!file || !/^(?:(?:LSI POD Wholesale Comp Report|Ingram eBook Wholesale Comp Report).*\.xls|KDP_Prior_Month_Royalties-.*\.xlsx)$/i.test(file.name) ||
      !Number.isSafeInteger(file.size) || file.size > 8 * 1024 * 1024 || file.size <= 0) fail("DISTRIBUTOR_SOURCE_NOT_IN_ARCHIVE");
  const source = await response(GRAPH + `drives/${DRIVE}/items/${file.id}`, token);
  const detail = await source.json(), download = new URL(detail["@microsoft.graph.downloadUrl"] || "https://invalid.invalid");
  if (download.protocol !== "https:" || download.hostname !== "jmerrillfoundation.sharepoint.com") fail("DISTRIBUTOR_DOWNLOAD_HOST_DENIED");
  const bytesResponse = await request(download, { redirect: "error", signal: AbortSignal.timeout(30000) });
  if (!bytesResponse.ok) fail(`DISTRIBUTOR_DOWNLOAD_HTTP_${bytesResponse.status}`, bytesResponse);
  const bytes = Buffer.from(await bytesResponse.arrayBuffer());
  const after = await (await response(GRAPH + `drives/${DRIVE}/items/${file.id}`, token)).json();
  if (detail.eTag !== file.eTag || after.eTag !== file.eTag || bytes.length !== file.size) fail("DISTRIBUTOR_SOURCE_CHANGED");
  return { file: metadata(file), driveId: DRIVE, sha256: createHash("sha256").update(bytes).digest("hex"), bytes: bytes.toString("base64"), mutations: 0 };
}
async function handler(request, deps = {}) {
  const env = deps.env || process.env;
  const expected = Buffer.from(env.JM1_DIAGNOSTIC_RUNNER_KEY || ""), actual = Buffer.from(request.headers.get("x-jm1-diagnostic-runner-key") || "");
  if (!expected.length || expected.length !== actual.length || !timingSafeEqual(expected, actual)) return { status: 401, jsonBody: { code: "UNAUTHORIZED" } };
  if (env.JM1_DISTRIBUTOR_SOURCE_READER_ENABLED !== "true") return { status: 503, jsonBody: { code: "DISTRIBUTOR_READER_DISABLED" } };
  try { return { status: 200, headers: { "Cache-Control": "no-store" }, jsonBody: await read(await request.json(), deps) }; }
  catch (e) { return { status: 503, jsonBody: { code: /^DISTRIBUTOR_[A-Z_0-9]+$/.test(e.message) ? e.message : "DISTRIBUTOR_READ_FAILED", requestId: e.requestId || null, mutations: 0 } }; }
}
module.exports = { read, handler, DRIVE };
