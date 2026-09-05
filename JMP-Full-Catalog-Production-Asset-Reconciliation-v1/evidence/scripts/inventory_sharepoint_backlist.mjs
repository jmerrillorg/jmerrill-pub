#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const DRIVE_ID = "b!mA37NWi8UEKdDYwH1o5AJNWKIBAoAPBIn_pxeBKSSDVm9PH59uWnQpr1oD4m79se";
const ROOT_PATH = "08_Backlist";
const PRODUCTION_ROOTS = ["08_Backlist", "10_Backlist-Consolidated", "07_Archive", "Archive/Active Projects", "02_Active-Pipeline", "01_Pre-Pipeline"];
const GRAPH = "https://graph.microsoft.com/v1.0";
const packageRoot = path.resolve("JMP-Full-Catalog-Production-Asset-Reconciliation-v1");
const outDir = path.join(packageRoot, "evidence", "sharepoint");
const catalogDir = path.resolve(
  "JMP-PUBLISHING-CATALOG-CANONICAL-RECONCILIATION-2026-09-05/evidence/reconciliation",
);

function graphToken() {
  return execFileSync(
    "az",
    ["account", "get-access-token", "--resource-type", "ms-graph", "--query", "accessToken", "-o", "tsv"],
    { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] },
  ).trim();
}

async function graphGet(token, url) {
  for (let attempt = 0; attempt < 7; attempt += 1) {
    const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (response.ok) return response.json();
    if (response.status !== 429 && response.status < 500) {
      throw new Error(`Graph ${response.status} for ${new URL(url).pathname}`);
    }
    const retryAfter = Number(response.headers.get("retry-after"));
    const delayMs = Number.isFinite(retryAfter) ? retryAfter * 1000 : Math.min(30_000, 1000 * (2 ** attempt));
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }
  throw new Error(`Graph retry budget exhausted for ${new URL(url).pathname}`);
}

async function graphCollection(token, url) {
  const values = [];
  let next = url;
  while (next) {
    const page = await graphGet(token, next);
    values.push(...(page.value ?? []));
    next = page["@odata.nextLink"];
  }
  return values;
}

function parseCsv(text) {
  const rows = [];
  let row = [], field = "", quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (quoted && char === '"' && text[index + 1] === '"') { field += '"'; index += 1; }
    else if (char === '"') quoted = !quoted;
    else if (char === "," && !quoted) { row.push(field); field = ""; }
    else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && text[index + 1] === "\n") index += 1;
      row.push(field); field = "";
      if (row.some((value) => value !== "")) rows.push(row);
      row = [];
    } else field += char;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  const [headers, ...data] = rows;
  return data.map((values) => Object.fromEntries(headers.map((header, i) => [header, values[i] ?? ""])));
}

const normalize = (value) => value
  .normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
  .replace(/\b(jr|sr|ii|iii|iv)\b/g, " ").replace(/[^a-z0-9]+/g, " ").trim();
const personKey = (value) => normalize(value).split(" ").filter(Boolean).sort().join(" ");

function assetType(name, relativePath) {
  const text = normalize(`${relativePath} ${name}`);
  const extension = path.extname(name).toLowerCase();
  if (/author (photo|portrait|headshot)|headshot|portrait/.test(text) && /\.(jpe?g|png|tiff?|webp)$/i.test(extension)) return "AUTHOR_PHOTO";
  if (/cover/.test(text)) {
    if (/source|working|draft|template/.test(text) || /\.(psd|ai|indd|cdr)$/i.test(extension)) return "COVER_SOURCE";
    if (/ebook|kindle|front/.test(text)) return "COVER_FRONT";
    if (/print|wrap|paperback|hardcover/.test(text)) return "COVER_PRINT_WRAP";
    return "COVER_OTHER";
  }
  if (/interior|typeset|layout|book block/.test(text) || /\.epub$/i.test(extension)) {
    if (/source|working|draft/.test(text) || /\.(indd|idml|qxp|vellum(content)?)$/i.test(extension)) return "INTERIOR_SOURCE";
    return "INTERIOR_FINAL";
  }
  if (/manuscript|edited|proofread/.test(text) || /\.(docx?|rtf)$/i.test(extension)) return "MANUSCRIPT";
  if (/metadata|isbn|bowker|onix/.test(text) || /\.(csv|xlsx?)$/i.test(extension)) return "METADATA";
  if (/distribution|kdp|ingram|lsi|coresource|acx/.test(text)) return "DISTRIBUTION_PROOF";
  if (/marketing|promo|social|launch|press kit/.test(text)) return "PROMOTIONAL";
  if (/\.(jpe?g|png|tiff?|webp)$/i.test(extension)) return "IMAGE_OTHER";
  if (/\.pdf$/i.test(extension)) return "PDF_OTHER";
  return "OTHER";
}

function titleScore(candidate, work) {
  const title = normalize(work.title);
  if (!title) return 0;
  if (candidate === title) return 100;
  if (candidate.includes(title)) return 90;
  const titleTokens = new Set(title.split(" ").filter((token) => token.length > 2));
  const candidateTokens = new Set(candidate.split(" "));
  if (!titleTokens.size) return 0;
  const overlap = [...titleTokens].filter((token) => candidateTokens.has(token)).length / titleTokens.size;
  return overlap >= 0.8 ? Math.round(overlap * 80) : 0;
}

const token = graphToken();
await mkdir(outDir, { recursive: true });
const select = "$select=id,name,webUrl,lastModifiedDateTime,size,parentReference,folder,file,createdDateTime,deleted";
const root = await graphGet(token, `${GRAPH}/drives/${encodeURIComponent(DRIVE_ID)}/root:/${ROOT_PATH}?${select}`);
const deltaItems = await graphCollection(
  token,
  `${GRAPH}/drives/${encodeURIComponent(DRIVE_ID)}/root/delta?$top=200&${select}`,
);
const itemById = new Map(deltaItems.map((item) => [item.id, item]));
const items = [...itemById.values()].filter((item) => !item.deleted && item.webUrl).map((item) => {
  const pathname = decodeURIComponent(new URL(item.webUrl).pathname);
  const marker = "/Shared Documents/";
  const relativePath = pathname.includes(marker) ? pathname.slice(pathname.indexOf(marker) + marker.length) : "";
  return { ...item, relativePath, itemType: item.folder ? "FOLDER" : "FILE" };
}).filter((item) => PRODUCTION_ROOTS.some((rootPath) => item.relativePath === rootPath || item.relativePath.startsWith(`${rootPath}/`)));

const [authors, works, products] = await Promise.all([
  readFile(path.join(catalogDir, "authors.csv"), "utf8").then(parseCsv),
  readFile(path.join(catalogDir, "works.csv"), "utf8").then(parseCsv),
  readFile(path.join(catalogDir, "format-products.csv"), "utf8").then(parseCsv),
]);
const authorByPerson = new Map();
for (const author of authors) {
  for (const identity of [author.authorDisplayName, ...(author.aliases ?? "").split("|")]) {
    if (identity.trim()) authorByPerson.set(personKey(identity), author);
  }
}
const authorIdentities = [...authorByPerson.entries()].map(([key, author]) => ({ tokens: key.split(" "), author }));
const worksByAuthor = new Map();
for (const work of works) {
  const list = worksByAuthor.get(work.canonicalAuthorId) ?? [];
  list.push(work); worksByAuthor.set(work.canonicalAuthorId, list);
}
const productsByWork = new Map();
for (const product of products) {
  const list = productsByWork.get(product.canonicalWorkId) ?? [];
  list.push(product); productsByWork.set(product.canonicalWorkId, list);
}

const topFolders = items.filter((item) => item.itemType === "FOLDER" && item.relativePath.startsWith(`${ROOT_PATH}/`) && item.relativePath.split("/").length === 2);
const folderMatches = topFolders.map((folder) => {
  const author = authorByPerson.get(personKey(folder.name));
  return { folderName: folder.name, folderItemId: folder.id, canonicalAuthorId: author?.canonicalAuthorId ?? "", authorDisplayName: author?.authorDisplayName ?? "", state: author ? "MATCHED" : "UNMATCHED" };
});
const folderMatchByName = new Map(folderMatches.map((match) => [match.folderName, match]));

const registry = items.filter((item) => item.itemType === "FILE").map((item) => {
  const [, authorFolder = ""] = item.relativePath.split("/");
  const directAuthorMatch = item.relativePath.startsWith(`${ROOT_PATH}/`) ? folderMatchByName.get(authorFolder) : undefined;
  const candidateText = normalize(item.relativePath);
  const candidateTokens = new Set(candidateText.split(" "));
  const inferredAuthors = authorIdentities.filter(({ tokens }) => tokens.length && tokens.every((token) => candidateTokens.has(token))).map(({ author }) => author);
  const authorIds = new Set([directAuthorMatch?.canonicalAuthorId, ...inferredAuthors.map((author) => author.canonicalAuthorId)].filter(Boolean));
  const isbnMatches = products.filter((product) => product.isbn13 && candidateText.replace(/\D/g, "").includes(product.isbn13.replace(/\D/g, "")));
  const scored = works.map((work) => ({ work, score: titleScore(candidateText, work) })).filter(({ score }) => score > 0).sort((a, b) => b.score - a.score);
  const uniqueIsbnWorks = new Set(isbnMatches.map((product) => product.canonicalWorkId));
  const work = uniqueIsbnWorks.size === 1
    ? works.find((value) => uniqueIsbnWorks.has(value.canonicalWorkId))
    : scored[0]?.score > (scored[1]?.score ?? 0) && (authorIds.has(scored[0].work.canonicalAuthorId) || scored[0].score === 100)
      ? scored[0].work
      : undefined;
  const matchedAuthor = work ? authors.find((author) => author.canonicalAuthorId === work.canonicalAuthorId) : directAuthorMatch ? authors.find((author) => author.canonicalAuthorId === directAuthorMatch.canonicalAuthorId) : inferredAuthors.length === 1 ? inferredAuthors[0] : undefined;
  const workProducts = work ? (productsByWork.get(work.canonicalWorkId) ?? []) : [];
  const product = workProducts.find((value) => value.isbn13 && candidateText.includes(value.isbn13.replace(/\D/g, "")));
  return {
    productionAssetKey: `${DRIVE_ID}:${item.id}`,
    driveId: DRIVE_ID,
    itemId: item.id,
    webUrl: item.webUrl,
    relativePath: item.relativePath,
    fileName: item.name,
    mimeType: item.file?.mimeType ?? "",
    size: item.size,
    createdDateTime: item.createdDateTime,
    lastModifiedDateTime: item.lastModifiedDateTime,
    assetType: assetType(item.name, item.relativePath),
    canonicalAuthorId: matchedAuthor?.canonicalAuthorId ?? "",
    authorDisplayName: matchedAuthor?.authorDisplayName ?? "",
    canonicalWorkId: work?.canonicalWorkId ?? "",
    workTitle: work?.title ?? "",
    canonicalProductId: product?.canonicalProductId ?? "",
    isbn13: product?.isbn13 ?? "",
    matchBasis: product ? "ISBN" : work ? "AUTHOR_AND_TITLE" : matchedAuthor ? "AUTHOR_ONLY" : "UNMATCHED_AUTHOR",
    assetState: "UNRESOLVED",
  };
});

const matchedWorkIds = new Set(registry.filter((asset) => asset.canonicalWorkId).map((asset) => asset.canonicalWorkId));
const summary = {
  generatedAt: new Date().toISOString(),
  source: { site: "Publishing Team", library: "Documents", driveId: DRIVE_ID, historicalRootItemId: root.id, productionRoots: PRODUCTION_ROOTS, historicalRootWebUrl: root.webUrl },
  mode: "READ_ONLY_METADATA",
  counts: {
    catalogAuthors: authors.length, canonicalWorks: works.length, formatProducts: products.length,
    topLevelAuthorFolders: topFolders.length, matchedAuthorFolders: folderMatches.filter((x) => x.state === "MATCHED").length,
    unmatchedAuthorFolders: folderMatches.filter((x) => x.state !== "MATCHED").length,
    folders: items.filter((item) => item.itemType === "FOLDER").length,
    files: registry.length, filesMatchedToWork: registry.filter((asset) => asset.canonicalWorkId).length,
    worksWithAtLeastOneMatchedFile: matchedWorkIds.size, worksWithoutMatchedFile: works.length - matchedWorkIds.size,
  },
  safeguards: { sharePointWrites: 0, dataverseWrites: 0, fileDownloads: 0, publicPosts: 0 },
  unmatchedAuthorFolders: folderMatches.filter((x) => x.state !== "MATCHED").map((x) => x.folderName),
};

await Promise.all([
  writeFile(path.join(outDir, "inventory-summary.json"), `${JSON.stringify(summary, null, 2)}\n`),
  writeFile(path.join(outDir, "author-folder-matches.json"), `${JSON.stringify(folderMatches, null, 2)}\n`),
  writeFile(path.join(outDir, "production-asset-registry-staging.json"), `${JSON.stringify(registry, null, 2)}\n`),
]);
console.log(JSON.stringify(summary, null, 2));
