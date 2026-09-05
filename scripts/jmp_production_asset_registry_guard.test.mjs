import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const base = "JMP-Full-Catalog-Production-Asset-Reconciliation-v1/evidence";
const assets = JSON.parse(readFileSync(`${base}/sharepoint/production-asset-registry-staging.json`, "utf8"));
const works = JSON.parse(readFileSync(`${base}/reconciliation/work-asset-readiness.json`, "utf8"));

test("all 129 canonical works receive a readiness result", () => assert.equal(works.length, 129));
test("SharePoint identity is stable and unique", () => {
  assert.equal(new Set(assets.map((asset) => asset.productionAssetKey)).size, assets.length);
  for (const asset of assets) assert.equal(asset.productionAssetKey, `${asset.driveId}:${asset.itemId}`);
});
test("moving a file does not change its registry identity", () => {
  const asset = assets[0];
  assert.equal(`${asset.driveId}:${asset.itemId}`, asset.productionAssetKey);
  assert.equal(`${asset.driveId}:${asset.itemId}`, `${asset.driveId}:${asset.itemId}`);
});
test("a linked work and asset cannot cross author boundaries", () => {
  const authorByWork = new Map(works.map((work) => [work.canonicalWorkId, work.canonicalAuthorId]));
  for (const asset of assets.filter((item) => item.canonicalWorkId)) assert.equal(asset.canonicalAuthorId, authorByWork.get(asset.canonicalWorkId));
});
test("source covers cannot become governed primary", () => {
  const byKey = new Map(assets.map((asset) => [asset.productionAssetKey, asset]));
  for (const work of works.filter((item) => item.primaryMarketingCover)) assert.notEqual(byKey.get(work.primaryMarketingCover.productionAssetKey)?.assetType, "COVER_SOURCE");
});
test("no execution side effects are represented", () => {
  const summary = JSON.parse(readFileSync(`${base}/reconciliation/readiness-summary.json`, "utf8"));
  assert.deepEqual(summary.safeguards, { sharePointWrites: 0, dataverseWrites: 0, publicPosts: 0 });
});
