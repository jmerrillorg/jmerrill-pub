#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const execute = process.argv.includes("--execute");
const resource = (process.env.DATAVERSE_ENVIRONMENT_URL || "https://jm1hq.crm.dynamics.com").replace(/\/$/, "");
const api = `${resource}/api/data/v9.2`;
const entitySet = "jm1pub_productionassets";
const root = path.resolve("JMP-Full-Catalog-Production-Asset-Reconciliation-v1");
const evidenceDir = path.join(root, "evidence", "dataverse");
const token = execFileSync("az", ["account", "get-access-token", "--resource", resource, "--query", "accessToken", "-o", "tsv"], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
const headers = { Authorization: `Bearer ${token}`, Accept: "application/json", "Content-Type": "application/json", "OData-MaxVersion": "4.0", "OData-Version": "4.0" };

function stableGuid(value) {
  const hex = createHash("sha256").update(value).digest("hex").slice(0, 32).split("");
  hex[12] = "5"; hex[16] = ["8", "9", "a", "b"][Number.parseInt(hex[16], 16) % 4];
  return `${hex.slice(0, 8).join("")}-${hex.slice(8, 12).join("")}-${hex.slice(12, 16).join("")}-${hex.slice(16, 20).join("")}-${hex.slice(20).join("")}`;
}

async function request(url, options = {}) {
  for (let attempt = 0; attempt < 7; attempt += 1) {
    const response = await fetch(url.startsWith("http") ? url : `${api}${url}`, { ...options, headers: { ...headers, ...(options.headers || {}) } });
    if (response.ok) return response;
    const text = await response.text();
    if (response.status !== 429 && response.status < 500) throw new Error(`${options.method || "GET"} ${new URL(response.url).pathname}: ${response.status} ${text.slice(0, 600)}`);
    const retryAfter = Number(response.headers.get("retry-after"));
    await new Promise((resolvePromise) => setTimeout(resolvePromise, Number.isFinite(retryAfter) ? retryAfter * 1000 : Math.min(30000, 1000 * 2 ** attempt)));
  }
  throw new Error(`Dataverse retry budget exhausted: ${url}`);
}

async function currentIds() {
  const ids = new Set(); let url = `${api}/${entitySet}?$select=jm1pub_productionassetid`;
  while (url) { const response = await request(url, { headers: { Prefer: "odata.maxpagesize=5000" } }); const page = await response.json(); for (const row of page.value ?? []) ids.add(row.jm1pub_productionassetid); url = page["@odata.nextLink"] ?? ""; }
  return ids;
}

const assets = JSON.parse(await readFile(path.join(root, "evidence", "sharepoint", "production-asset-registry-staging.json"), "utf8"));
const existing = await currentIds();
const operations = assets.map((asset) => {
  const id = stableGuid(asset.productionAssetKey);
  return {
    id,
    action: existing.has(id) ? "NO_OP" : "CREATE",
    payload: {
      jm1pub_name: `${asset.workTitle || asset.authorDisplayName || "Unresolved"} - ${asset.fileName}`.slice(0, 300),
      jm1pub_stablekey: asset.productionAssetKey,
      jm1pub_driveid: asset.driveId,
      jm1pub_itemid: asset.itemId,
      jm1pub_weburl: asset.webUrl,
      jm1pub_relativepath: asset.relativePath,
      jm1pub_filename: asset.fileName,
      jm1pub_mimetype: asset.mimeType || null,
      jm1pub_size: asset.size,
      jm1pub_lastmodified: asset.lastModifiedDateTime,
      jm1pub_assettype: asset.assetType,
      jm1pub_assetstate: asset.assetState,
      jm1pub_canonicalauthorid: asset.canonicalAuthorId || null,
      jm1pub_canonicalworkid: asset.canonicalWorkId || null,
      jm1pub_canonicalproductid: asset.canonicalProductId || null,
      jm1pub_matchbasis: asset.matchBasis,
      jm1pub_sha256: asset.sha256 || null,
    },
  };
});
const prewrite = { generatedAt: new Date().toISOString(), mode: execute ? "EXECUTE" : "DRY_RUN", environment: resource, counts: { total: operations.length, creates: operations.filter((operation) => operation.action === "CREATE").length, existing: operations.filter((operation) => operation.action !== "CREATE").length, deletes: 0 }, safeguards: { fileCopies: 0, sharePointWrites: 0, publicPosts: 0 } };
const runLabel = existing.size === 0 ? "initial" : "replay";
await mkdir(evidenceDir, { recursive: true });
await writeFile(path.join(evidenceDir, `production-asset-promotion-${runLabel}-prewrite.json`), `${JSON.stringify(prewrite, null, 2)}\n`);

const results = [];
if (execute) {
  const writes = operations.filter((operation) => operation.action === "CREATE");
  let cursor = 0;
  async function worker() {
    while (cursor < writes.length) {
      const index = cursor; cursor += 1; const operation = writes[index];
      try {
        const response = await request(`/${entitySet}(${operation.id})`, { method: "PATCH", headers: { "If-None-Match": "*" }, body: JSON.stringify(operation.payload) });
        results[index] = { sequence: index + 1, id: operation.id, plannedAction: operation.action, status: "SUCCESS", responseStatus: response.status };
      } catch (error) {
        results[index] = { sequence: index + 1, id: operation.id, plannedAction: operation.action, status: "ERROR", error: String(error.message || error) };
      }
    }
  }
  await Promise.all(Array.from({ length: 16 }, () => worker()));
  await writeFile(path.join(evidenceDir, `production-asset-promotion-${runLabel}-write-log.json`), `${JSON.stringify(results, null, 2)}\n`);
  const errors = results.filter((result) => result.status === "ERROR");
  if (errors.length) throw new Error(`${errors.length} production asset writes failed; see write log`);
}
console.log(JSON.stringify({ ...prewrite.counts, mode: prewrite.mode, writesCompleted: results.filter((result) => result.status === "SUCCESS").length }, null, 2));
