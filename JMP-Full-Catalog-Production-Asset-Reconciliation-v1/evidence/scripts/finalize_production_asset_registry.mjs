#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const root = path.resolve("JMP-Full-Catalog-Production-Asset-Reconciliation-v1");
const evidence = path.join(root, "evidence");
const catalog = path.resolve("JMP-PUBLISHING-CATALOG-CANONICAL-RECONCILIATION-2026-09-05/evidence/reconciliation");

function parseCsv(text) {
  const rows = []; let row = [], field = "", quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (quoted && char === '"' && text[i + 1] === '"') { field += '"'; i += 1; }
    else if (char === '"') quoted = !quoted;
    else if (char === "," && !quoted) { row.push(field); field = ""; }
    else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && text[i + 1] === "\n") i += 1;
      row.push(field); field = ""; if (row.some(Boolean)) rows.push(row); row = [];
    } else field += char;
  }
  const [headers, ...data] = rows;
  return data.map((values) => Object.fromEntries(headers.map((header, i) => [header, values[i] ?? ""])));
}

const [authors, works, products, registry] = await Promise.all([
  readFile(path.join(catalog, "authors.csv"), "utf8").then(parseCsv),
  readFile(path.join(catalog, "works.csv"), "utf8").then(parseCsv),
  readFile(path.join(catalog, "format-products.csv"), "utf8").then(parseCsv),
  readFile(path.join(evidence, "sharepoint", "production-asset-registry-staging.json"), "utf8").then(JSON.parse),
]);

const productsByWork = new Map();
for (const product of products) {
  const rows = productsByWork.get(product.canonicalWorkId) ?? []; rows.push(product); productsByWork.set(product.canonicalWorkId, rows);
}
const assetsByWork = new Map();
for (const asset of registry) {
  if (!asset.canonicalWorkId) continue;
  const rows = assetsByWork.get(asset.canonicalWorkId) ?? []; rows.push(asset); assetsByWork.set(asset.canonicalWorkId, rows);
}

function coverScore(asset, workProducts) {
  if (!asset.assetType.startsWith("COVER_")) return -Infinity;
  const text = `${asset.relativePath} ${asset.fileName}`.toLowerCase();
  let score = { COVER_FRONT: 60, COVER_OTHER: 40, COVER_PRINT_WRAP: 30, COVER_SOURCE: -100 }[asset.assetType] ?? 0;
  if (/\.(png|jpe?g|webp|tiff?)$/i.test(asset.fileName)) score += 20;
  if (/(^|[_ -])fc\.(png|jpe?g|webp)$/i.test(asset.fileName)) score += 55;
  if (/\.pdf$/i.test(asset.fileName)) score -= 20;
  if (/full.?cover|back\.|spine\.|case\.|coverpdf\.pdf/i.test(asset.fileName)) score -= 35;
  if (/perfect|approved|final|amazon|kindle|front/.test(text)) score += 25;
  if (/draft|working|source|template|mockup/.test(text)) score -= 60;
  if (/07_archive|archive\/|historical/.test(text)) score -= 10;
  if (workProducts.some((product) => product.isbn13 && text.replace(/\D/g, "").includes(product.isbn13))) score += 50;
  return score;
}

const workReadiness = [];
for (const work of works) {
  const assets = assetsByWork.get(work.canonicalWorkId) ?? [];
  const scored = assets.map((asset) => ({ asset, score: coverScore(asset, productsByWork.get(work.canonicalWorkId) ?? []) })).filter(({ score }) => Number.isFinite(score)).sort((a, b) => b.score - a.score || a.asset.itemId.localeCompare(b.asset.itemId));
  const topScore = scored[0]?.score;
  const top = scored.filter((candidate) => candidate.score === topScore && topScore > 0);
  const primary = top.length === 1 ? top[0].asset : null;
  for (const asset of assets) {
    if (asset.itemId === primary?.itemId) asset.assetState = "GOVERNED_PRIMARY";
    else if (asset.assetType.startsWith("COVER_")) asset.assetState = /07_archive|archive\//i.test(asset.relativePath) ? "HISTORICAL" : "GOVERNED_ALTERNATE";
    else if (asset.assetType === "DISTRIBUTION_PROOF") asset.assetState = "DISTRIBUTION_PROOF";
    else if (asset.assetType === "PROMOTIONAL") asset.assetState = "PROMOTIONAL";
    else if (asset.assetType.endsWith("SOURCE") || asset.assetType === "MANUSCRIPT") asset.assetState = "SOURCE_ONLY";
    else asset.assetState = "UNRESOLVED";
  }
  const readinessState = !assets.length ? "MISSING" : top.length > 1 ? "AMBIGUOUS" : primary ? "READY" : "PARTIAL";
  workReadiness.push({
    canonicalWorkId: work.canonicalWorkId,
    canonicalAuthorId: work.canonicalAuthorId,
    authorDisplayName: work.authorDisplayName,
    title: work.title,
    lifecycleDetail: work.lifecycleDetail,
    marketingAuthorityState: work.marketingAuthorityState,
    readinessState,
    matchedAssetCount: assets.length,
    coverCandidateCount: scored.length,
    primaryMarketingCover: primary ? { productionAssetKey: primary.productionAssetKey, driveId: primary.driveId, itemId: primary.itemId, webUrl: primary.webUrl, relativePath: primary.relativePath } : null,
    ambiguity: top.length > 1 ? top.map(({ asset }) => ({ itemId: asset.itemId, webUrl: asset.webUrl, relativePath: asset.relativePath })) : [],
  });
}

const authorPhotoReadiness = authors.map((author) => {
  const candidates = registry.filter((asset) => asset.canonicalAuthorId === author.canonicalAuthorId && asset.assetType === "AUTHOR_PHOTO")
    .sort((a, b) => Number(/approved|primary|headshot/i.test(b.relativePath)) - Number(/approved|primary|headshot/i.test(a.relativePath)) || a.itemId.localeCompare(b.itemId));
  return { canonicalAuthorId: author.canonicalAuthorId, authorDisplayName: author.authorDisplayName, state: candidates.length === 1 ? "READY" : candidates.length ? "AMBIGUOUS" : "MISSING", candidateCount: candidates.length, primaryAuthorPhoto: candidates.length === 1 ? candidates[0].productionAssetKey : null };
});

const potentialDuplicates = [];
const duplicateGroups = new Map();
for (const asset of registry) {
  const key = `${asset.canonicalWorkId}|${asset.size}|${asset.fileName.toLowerCase()}`;
  const rows = duplicateGroups.get(key) ?? []; rows.push(asset); duplicateGroups.set(key, rows);
}
for (const [signature, assets] of duplicateGroups) if (assets.length > 1) potentialDuplicates.push({ signature, count: assets.length, assets: assets.map(({ productionAssetKey, webUrl, relativePath }) => ({ productionAssetKey, webUrl, relativePath })) });

const campaignTitles = new Set(["The Shift", "Strategies for Success", "A Portrait of Paradise", "The Conquest of Azenga"]);
const campaignProtection = workReadiness.filter((work) => campaignTitles.has(work.title));
const counts = {
  works: workReadiness.length,
  ready: workReadiness.filter((work) => work.readinessState === "READY").length,
  partial: workReadiness.filter((work) => work.readinessState === "PARTIAL").length,
  missing: workReadiness.filter((work) => work.readinessState === "MISSING").length,
  ambiguous: workReadiness.filter((work) => work.readinessState === "AMBIGUOUS").length,
  authorPhotosReady: authorPhotoReadiness.filter((author) => author.state === "READY").length,
  authorPhotosAmbiguous: authorPhotoReadiness.filter((author) => author.state === "AMBIGUOUS").length,
  authorPhotosMissing: authorPhotoReadiness.filter((author) => author.state === "MISSING").length,
  registeredFiles: registry.length,
  linkedFiles: registry.filter((asset) => asset.canonicalWorkId).length,
  potentialDuplicateGroups: potentialDuplicates.length,
};

await mkdir(path.join(evidence, "reconciliation"), { recursive: true });
await Promise.all([
  writeFile(path.join(evidence, "sharepoint", "production-asset-registry-staging.json"), `${JSON.stringify(registry, null, 2)}\n`),
  writeFile(path.join(evidence, "reconciliation", "work-asset-readiness.json"), `${JSON.stringify(workReadiness, null, 2)}\n`),
  writeFile(path.join(evidence, "reconciliation", "author-photo-readiness.json"), `${JSON.stringify(authorPhotoReadiness, null, 2)}\n`),
  writeFile(path.join(evidence, "reconciliation", "potential-duplicates.json"), `${JSON.stringify(potentialDuplicates, null, 2)}\n`),
  writeFile(path.join(evidence, "reconciliation", "campaign-protection.json"), `${JSON.stringify(campaignProtection, null, 2)}\n`),
  writeFile(path.join(evidence, "reconciliation", "readiness-summary.json"), `${JSON.stringify({ generatedAt: new Date().toISOString(), counts, safeguards: { sharePointWrites: 0, dataverseWrites: 0, publicPosts: 0 } }, null, 2)}\n`),
]);
console.log(JSON.stringify(counts, null, 2));
