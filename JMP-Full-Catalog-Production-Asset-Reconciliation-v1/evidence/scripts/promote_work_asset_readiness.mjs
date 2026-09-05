#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const execute = process.argv.includes("--execute");
const resource = (process.env.DATAVERSE_ENVIRONMENT_URL || "https://jm1hq.crm.dynamics.com").replace(/\/$/, "");
const api = `${resource}/api/data/v9.2`;
const root = path.resolve("JMP-Full-Catalog-Production-Asset-Reconciliation-v1");
const out = path.join(root, "evidence", "dataverse");
const token = execFileSync("az", ["account", "get-access-token", "--resource", resource, "--query", "accessToken", "-o", "tsv"], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
const headers = { Authorization: `Bearer ${token}`, Accept: "application/json", "Content-Type": "application/json", "OData-MaxVersion": "4.0", "OData-Version": "4.0" };
async function request(endpoint, options = {}) { const response = await fetch(`${api}${endpoint}`, { ...options, headers }); const text = await response.text(); if (!response.ok) throw new Error(`${response.status} ${endpoint}: ${text.slice(0, 600)}`); return text ? JSON.parse(text) : null; }

const readiness = JSON.parse(await readFile(path.join(root, "evidence", "reconciliation", "work-asset-readiness.json"), "utf8"));
const current = new Map(); let url = `${api}/jm1pub_titles?$select=jm1pub_titleid,jm1pub_assetregistrystatus,jm1pub_assetregistrylastverifiedon`;
while (url) { const response = await fetch(url, { headers: { ...headers, Prefer: "odata.maxpagesize=5000" } }); if (!response.ok) throw new Error(`Title readback failed: ${response.status}`); const page = await response.json(); for (const row of page.value ?? []) current.set(row.jm1pub_titleid, row); url = page["@odata.nextLink"] ?? ""; }
const values = { READY: 100000003, PARTIAL: 100000002, AMBIGUOUS: 100000002, MISSING: 100000004 };
const verifiedAt = new Date().toISOString();
const operations = readiness.map((work) => {
  const expected = values[work.readinessState]; const actual = current.get(work.canonicalWorkId)?.jm1pub_assetregistrystatus;
  return { canonicalWorkId: work.canonicalWorkId, title: work.title, readinessState: work.readinessState, expected, actual, action: actual === expected ? "NO_OP" : "UPDATE" };
});
const results = [];
if (execute) for (const operation of operations.filter((item) => item.action === "UPDATE")) {
  await request(`/jm1pub_titles(${operation.canonicalWorkId})`, { method: "PATCH", body: JSON.stringify({ jm1pub_assetregistrystatus: operation.expected, jm1pub_assetregistrylastverifiedon: verifiedAt }) });
  results.push({ canonicalWorkId: operation.canonicalWorkId, status: "SUCCESS" });
}
await mkdir(out, { recursive: true });
await writeFile(path.join(out, `work-readiness-${execute ? "promotion" : "dry-run"}.json`), `${JSON.stringify({ generatedAt: verifiedAt, mode: execute ? "EXECUTE" : "DRY_RUN", counts: { total: operations.length, updates: operations.filter((item) => item.action === "UPDATE").length, noOps: operations.filter((item) => item.action === "NO_OP").length, deletes: 0 }, operations, results }, null, 2)}\n`);
console.log(JSON.stringify({ mode: execute ? "EXECUTE" : "DRY_RUN", total: operations.length, updates: operations.filter((item) => item.action === "UPDATE").length, noOps: operations.filter((item) => item.action === "NO_OP").length, writesCompleted: results.length }, null, 2));
