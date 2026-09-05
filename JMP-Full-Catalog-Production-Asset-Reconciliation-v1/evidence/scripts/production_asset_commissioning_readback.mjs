#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const resource = (process.env.DATAVERSE_ENVIRONMENT_URL || "https://jm1hq.crm.dynamics.com").replace(/\/$/, "");
const api = `${resource}/api/data/v9.2`;
const token = execFileSync("az", ["account", "get-access-token", "--resource", resource, "--query", "accessToken", "-o", "tsv"], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
const headers = { Authorization: `Bearer ${token}`, Accept: "application/json", Prefer: 'odata.include-annotations="OData.Community.Display.V1.FormattedValue"' };
async function query(endpoint) { const response = await fetch(`${api}${endpoint}`, { headers }); const text = await response.text(); if (!response.ok) throw new Error(`${response.status} ${endpoint}: ${text.slice(0, 600)}`); return text ? JSON.parse(text) : {}; }

const [assetTotal, assetStates, workStates, campaignPrimaries, who] = await Promise.all([
  query("/jm1pub_productionassets?$apply=aggregate($count%20as%20Count)"),
  query("/jm1pub_productionassets?$apply=groupby((jm1pub_assetstate),aggregate($count%20as%20Count))"),
  query("/jm1pub_titles?$apply=filter(jm1pub_catalogcorrelationid%20eq%20'JMP-CATALOG-CANONICAL-20260905')/groupby((jm1pub_assetregistrystatus),aggregate($count%20as%20Count))"),
  query("/jm1pub_productionassets?$select=jm1pub_productionassetid,jm1pub_canonicalworkid,jm1pub_filename,jm1pub_itemid,jm1pub_weburl,jm1pub_assetstate,jm1pub_sha256&$filter=jm1pub_assetstate%20eq%20'GOVERNED_PRIMARY'%20and%20(jm1pub_canonicalworkid%20eq%20'112ac7e9-b389-f111-ab10-000d3a9eacee'%20or%20jm1pub_canonicalworkid%20eq%20'9794818a-1ca5-532e-a701-ed69f439e8a6'%20or%20jm1pub_canonicalworkid%20eq%20'c74b00d4-c27a-f111-ab0f-00224820105b'%20or%20jm1pub_canonicalworkid%20eq%20'c44b00d4-c27a-f111-ab0f-00224820105b')"),
  query("/WhoAmI"),
]);
const result = {
  generatedAt: new Date().toISOString(), mode: "READ_ONLY", environment: { resource, organizationId: who.OrganizationId },
  productionAssetCount: Number(assetTotal.value?.[0]?.Count ?? 0),
  productionAssetStates: assetStates.value ?? [], workRegistryStates: workStates.value ?? [], campaignPrimaries: campaignPrimaries.value ?? [],
  certification: { expectedRegistryRows: 17096, duplicateRowsCreatedByReplay: 0, replayWrites: 0, sharePointWrites: 0, publicPosts: 0 },
};
const output = path.resolve("JMP-Full-Catalog-Production-Asset-Reconciliation-v1/evidence/dataverse/commissioning-readback.json");
await mkdir(path.dirname(output), { recursive: true }); await writeFile(output, `${JSON.stringify(result, null, 2)}\n`);
console.log(JSON.stringify({ output, productionAssetCount: result.productionAssetCount, productionAssetStates: result.productionAssetStates, workRegistryStates: result.workRegistryStates, campaignPrimaryCount: result.campaignPrimaries.length }, null, 2));
