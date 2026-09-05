#!/usr/bin/env node

import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { access, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const root = path.resolve("JMP-Full-Catalog-Production-Asset-Reconciliation-v1");
const registryPath = path.join(root, "evidence", "sharepoint", "production-asset-registry-staging.json");
const localDriveRoot = "/Users/jmerrillone/Library/CloudStorage/OneDrive-JMerrillFoundation,Inc/JM1-PUB";
const registry = JSON.parse(await readFile(registryPath, "utf8"));
const primaries = registry.filter((asset) => asset.assetState === "GOVERNED_PRIMARY");

async function sha256(filePath) {
  await access(filePath);
  return new Promise((resolve, reject) => {
    const hash = createHash("sha256");
    createReadStream(filePath).on("data", (chunk) => hash.update(chunk)).on("error", reject).on("end", () => resolve(hash.digest("hex")));
  });
}

const results = [];
for (const asset of primaries) {
  const localPath = path.join(localDriveRoot, asset.relativePath);
  try {
    asset.sha256 = await sha256(localPath);
    results.push({ productionAssetKey: asset.productionAssetKey, itemId: asset.itemId, relativePath: asset.relativePath, sha256: asset.sha256, state: "CAPTURED" });
  } catch (error) {
    results.push({ productionAssetKey: asset.productionAssetKey, itemId: asset.itemId, relativePath: asset.relativePath, sha256: null, state: "UNAVAILABLE", reason: String(error.code || error.message || error) });
  }
}
await Promise.all([
  writeFile(registryPath, `${JSON.stringify(registry, null, 2)}\n`),
  writeFile(path.join(root, "evidence", "reconciliation", "exact-media-hashes.json"), `${JSON.stringify(results, null, 2)}\n`),
]);
console.log(JSON.stringify({ selectedPrimaryAssets: primaries.length, captured: results.filter((result) => result.state === "CAPTURED").length, unavailable: results.filter((result) => result.state !== "CAPTURED").length }, null, 2));
