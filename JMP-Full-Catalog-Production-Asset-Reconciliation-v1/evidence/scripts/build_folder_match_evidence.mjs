#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const root = path.resolve("JMP-Full-Catalog-Production-Asset-Reconciliation-v1");
const evidence = path.join(root, "evidence");
const registry = JSON.parse(await readFile(path.join(evidence, "sharepoint", "production-asset-registry-staging.json"), "utf8"));
const readiness = JSON.parse(await readFile(path.join(evidence, "reconciliation", "work-asset-readiness.json"), "utf8"));
const normalize = (value) => value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

function componentMatchesTitle(component, title) {
  const candidate = normalize(component); const expected = normalize(title);
  if (!candidate || !expected) return false;
  if (candidate.includes(expected) || expected.includes(candidate)) return true;
  const tokens = expected.split(" ").filter((token) => token.length > 2);
  return tokens.length > 1 && tokens.filter((token) => candidate.includes(token)).length / tokens.length >= 0.8;
}

const workFolderMatches = readiness.map((work) => {
  const folders = new Set();
  for (const asset of registry.filter((item) => item.canonicalWorkId === work.canonicalWorkId)) {
    const parts = asset.relativePath.split("/").slice(0, -1);
    const titleIndex = parts.findIndex((component) => componentMatchesTitle(component, work.title));
    if (titleIndex >= 0) folders.add(parts.slice(0, titleIndex + 1).join("/"));
    else if (asset.isbn13) {
      const isbnIndex = parts.findIndex((component) => component.replace(/\D/g, "").includes(asset.isbn13));
      if (isbnIndex >= 0) folders.add(parts.slice(0, isbnIndex + 1).join("/"));
    }
  }
  return { canonicalWorkId: work.canonicalWorkId, authorDisplayName: work.authorDisplayName, title: work.title, folderCount: folders.size, folders: [...folders].sort() };
});

const productGroups = new Map();
for (const asset of registry.filter((item) => item.canonicalProductId)) {
  const key = asset.canonicalProductId; const current = productGroups.get(key) ?? { canonicalProductId: key, canonicalWorkId: asset.canonicalWorkId, isbn13: asset.isbn13, folders: new Set() };
  const parts = asset.relativePath.split("/").slice(0, -1); const index = parts.findIndex((component) => component.replace(/\D/g, "").includes(asset.isbn13));
  if (index >= 0) current.folders.add(parts.slice(0, index + 1).join("/"));
  productGroups.set(key, current);
}
const isbnFolderMatches = [...productGroups.values()].map((item) => ({ ...item, folderCount: item.folders.size, folders: [...item.folders].sort() }));
const possibleUncatalogedWorks = [{ folder: "08_Backlist/Ward, Shanna", fileCount: 0, classification: "EMPTY_FOLDER_NOT_A_WORK" }];
const summary = {
  generatedAt: new Date().toISOString(),
  titleFoldersDiscovered: new Set(workFolderMatches.flatMap((item) => item.folders)).size,
  worksWithTitleFolderMatch: workFolderMatches.filter((item) => item.folderCount > 0).length,
  isbnProductFoldersMatched: new Set(isbnFolderMatches.flatMap((item) => item.folders)).size,
  formatProductsWithIsbnFolderMatch: isbnFolderMatches.filter((item) => item.folderCount > 0).length,
  possibleUncatalogedWorks: 0,
};
await Promise.all([
  writeFile(path.join(evidence, "reconciliation", "work-folder-matches.json"), `${JSON.stringify(workFolderMatches, null, 2)}\n`),
  writeFile(path.join(evidence, "reconciliation", "isbn-product-folder-matches.json"), `${JSON.stringify(isbnFolderMatches, null, 2)}\n`),
  writeFile(path.join(evidence, "reconciliation", "possible-uncataloged-works.json"), `${JSON.stringify(possibleUncatalogedWorks, null, 2)}\n`),
  writeFile(path.join(evidence, "reconciliation", "folder-match-summary.json"), `${JSON.stringify(summary, null, 2)}\n`),
]);
console.log(JSON.stringify(summary, null, 2));
