#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const execute = process.argv.includes("--execute");
const resource = (process.env.DATAVERSE_ENVIRONMENT_URL || "https://jm1hq.crm.dynamics.com").replace(/\/$/, "");
const api = `${resource}/api/data/v9.2`;
const root = path.resolve("JMP-Full-Catalog-Production-Asset-Reconciliation-v1");
const token = execFileSync("az", ["account", "get-access-token", "--resource", resource, "--query", "accessToken", "-o", "tsv"], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
const headers = { Authorization: `Bearer ${token}`, Accept: "application/json", "Content-Type": "application/json" };
const stableGuid = (value) => { const hex = createHash("sha256").update(value).digest("hex").slice(0, 32).split(""); hex[12] = "5"; hex[16] = ["8", "9", "a", "b"][Number.parseInt(hex[16], 16) % 4]; return `${hex.slice(0, 8).join("")}-${hex.slice(8, 12).join("")}-${hex.slice(12, 16).join("")}-${hex.slice(16, 20).join("")}-${hex.slice(20).join("")}`; };
async function request(endpoint, options = {}) { const response = await fetch(`${api}${endpoint}`, { ...options, headers }); const text = await response.text(); if (!response.ok) throw new Error(`${response.status} ${endpoint}: ${text.slice(0, 500)}`); return text ? JSON.parse(text) : {}; }

const registry = JSON.parse(await readFile(path.join(root, "evidence", "sharepoint", "production-asset-registry-staging.json"), "utf8"));
const primaries = registry.filter((asset) => asset.assetState === "GOVERNED_PRIMARY" && asset.sha256);
const current = await request("/jm1pub_productionassets?$select=jm1pub_productionassetid,jm1pub_sha256&$filter=jm1pub_assetstate%20eq%20'GOVERNED_PRIMARY'&$top=500");
const hashById = new Map((current.value ?? []).map((row) => [row.jm1pub_productionassetid, row.jm1pub_sha256 ?? ""]));
const operations = primaries.map((asset) => { const id = stableGuid(asset.productionAssetKey); return { id, sha256: asset.sha256, action: hashById.get(id) === asset.sha256 ? "NO_OP" : "UPDATE" }; });
if (execute) for (const operation of operations.filter((item) => item.action === "UPDATE")) await request(`/jm1pub_productionassets(${operation.id})`, { method: "PATCH", body: JSON.stringify({ jm1pub_sha256: operation.sha256 }) });
const result = { generatedAt: new Date().toISOString(), mode: execute ? "EXECUTE" : "DRY_RUN", counts: { total: operations.length, updates: operations.filter((item) => item.action === "UPDATE").length, noOps: operations.filter((item) => item.action === "NO_OP").length }, operations };
const output = path.join(root, "evidence", "dataverse", `primary-hash-${execute ? (result.counts.updates ? "promotion" : "replay") : "dry-run"}.json`); await mkdir(path.dirname(output), { recursive: true }); await writeFile(output, `${JSON.stringify(result, null, 2)}\n`);
console.log(JSON.stringify(result.counts, null, 2));
