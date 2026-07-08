#!/usr/bin/env node

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const apiBase =
  process.env.DATAVERSE_WEB_API_BASE_URL ||
  'https://org52409ff2.crm.dynamics.com/api/data/v9.2';
const token = process.env.DATAVERSE_ACCESS_TOKEN;
const stagingPath = process.env.IS009_STAGING_PATH || 'data/is009-publishing-asset-staging.json';
const evidencePath =
  process.env.IS009_IMPORT_EVIDENCE ||
  'docs/implementation/evidence/IS-009/is009-registry-import-evidence.json';
const progressEvery = Number(process.env.IS009_PROGRESS_EVERY || '25');

if (!token) throw new Error('DATAVERSE_ACCESS_TOKEN is required.');

const now = new Date().toISOString();
const staging = JSON.parse(readFileSync(stagingPath, 'utf8'));

const OPTION = {
  titleRegistryStatus: {
    Staged: 100000001,
    'Partially Reconciled': 100000002,
    Reconciled: 100000003,
    Exception: 100000004,
  },
  assetFormat: {
    Paperback: 100000000,
    Hardcover: 100000001,
    eBook: 100000002,
    Audiobook: 100000003,
    'Large Print': 100000004,
    Workbook: 100000005,
    Other: 100000006,
  },
  assetStatus: {
    Staged: 100000000,
    'In Production': 100000001,
    Live: 100000002,
    Backlist: 100000003,
    Retired: 100000004,
    Exception: 100000005,
  },
  metadataStatus: {
    Incomplete: 100000000,
    Complete: 100000001,
    Verified: 100000002,
    Exception: 100000003,
  },
  distributionStatus: {
    Draft: 100000000,
    Active: 100000001,
    Suspended: 100000002,
    Retired: 100000003,
    Unknown: 100000004,
  },
  assetHealthStatus: {
    Healthy: 100000000,
    'Needs Review': 100000001,
    Incomplete: 100000002,
    Blocked: 100000003,
  },
  assetConfidenceStatus: {
    High: 100000000,
    Good: 100000001,
    Medium: 100000002,
    Low: 100000003,
    'Reconciliation Required': 100000004,
  },
  authorEvidenceStatus: {
    Confirmed: 100000000,
    'Unknown / Pending Reconciliation': 100000001,
    'Conflicting Evidence': 100000002,
  },
  marketplace: {
    'Ingram Content': 100000000,
    'Amazon KDP': 100000001,
    ACX: 100000002,
    'Apple Books': 100000003,
    'Barnes & Noble': 100000004,
    Kobo: 100000005,
    'Google Play': 100000006,
    Other: 100000007,
  },
  marketplaceStatus: {
    Live: 100000000,
    Pending: 100000001,
    Suspended: 100000002,
    'Not Listed': 100000003,
    Unknown: 100000004,
    Exception: 100000005,
  },
  marketplaceIdentifierStatus: {
    Confirmed: 100000000,
    'Pending Identification': 100000001,
    'Conflicting Evidence': 100000002,
  },
  bandLevel: {
    System: 100000000,
    Automation: 100000001,
    Human: 100000002,
    'External Provider': 100000003,
  },
  executionStatus: {
    Pending: 100000000,
    Succeeded: 100000001,
    Failed: 100000002,
    Skipped: 100000003,
    'Manual Review Required': 100000004,
  },
};

const evidence = {
  generatedAt: now,
  apiBase,
  stagingGeneratedAt: staging.generatedAt,
  counts: {
    titlesCreated: 0,
    titlesReused: 0,
    titlesUpdated: 0,
    assetsCreated: 0,
    assetsReused: 0,
    marketplacesCreated: 0,
    marketplacesReused: 0,
    executionLogsCreated: 0,
  },
  duplicatePrevention: {
    assetKeysSeen: 0,
    duplicateAssetKeysSkipped: 0,
    marketplaceKeysSeen: 0,
    duplicateMarketplaceKeysSkipped: 0,
  },
  reconciliation: {
    assetsRequiringReconciliation: 0,
    marketplacesRequiringReconciliation: 0,
    reasons: {},
  },
  samples: {
    assetsCreated: [],
    marketplacesCreated: [],
    reconciliation: [],
  },
};

function log(message) {
  console.error(`[is009-core-import] ${message}`);
}

function clean(value) {
  if (value === null || value === undefined) return '';
  return String(value).trim().replace(/\s+/g, ' ');
}

function escapeOData(value) {
  return clean(value).replace(/'/g, "''");
}

function query(params) {
  return new URLSearchParams(params).toString();
}

function clamp(value, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

async function request(path, options = {}) {
  let response;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      response = await fetch(`${apiBase}${path}`, {
        ...options,
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
          'Content-Type': 'application/json',
          'OData-MaxVersion': '4.0',
          'OData-Version': '4.0',
          Prefer: 'return=representation',
          ...(options.headers || {}),
        },
      });
      break;
    } catch (error) {
      if (attempt === 3) throw error;
      await new Promise((resolve) => setTimeout(resolve, attempt * 3000));
    }
  }
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`${options.method || 'GET'} ${path} failed: ${response.status} ${body}`);
  }
  if (response.status === 204) return null;
  const text = await response.text();
  return text ? JSON.parse(text) : null;
}

function firstValue(result) {
  return result?.value?.[0] || null;
}

async function findTitleByName(title) {
  const params = query({
    $select: 'jm1pub_titleid,jm1pub_titlename',
    $top: '1',
    $filter: `jm1pub_titlename eq '${escapeOData(title)}'`,
  });
  return firstValue(
    await request(`/jm1pub_titles?${params}`),
  );
}

async function createTitle(candidate) {
  const record = {
    jm1pub_titlename: candidate.title,
    jm1pub_assetregistrystatus: OPTION.titleRegistryStatus.Staged,
    jm1pub_assetregistrylastverifiedon: now,
  };
  return request('/jm1pub_titles', {
    method: 'POST',
    body: JSON.stringify(record),
  });
}

async function patchTitle(id) {
  await request(`/jm1pub_titles(${id})`, {
    method: 'PATCH',
    body: JSON.stringify({
      jm1pub_assetregistrystatus: OPTION.titleRegistryStatus.Staged,
      jm1pub_assetregistrylastverifiedon: now,
    }),
    headers: { Prefer: 'return=minimal' },
  });
}

async function findAssetByNormalizedIsbn(isbn) {
  if (!isbn) return null;
  const params = query({
    $select: 'jm1pub_publishingassetid,jm1pub_name,jm1pub_normalizedisbn',
    $top: '1',
    $filter: `jm1pub_normalizedisbn eq '${escapeOData(isbn)}'`,
  });
  return firstValue(
    await request(`/jm1pub_publishingassets?${params}`),
  );
}

async function findAssetByName(name) {
  const params = query({
    $select: 'jm1pub_publishingassetid,jm1pub_name,jm1pub_normalizedisbn',
    $top: '1',
    $filter: `jm1pub_name eq '${escapeOData(name)}'`,
  });
  return firstValue(
    await request(`/jm1pub_publishingassets?${params}`),
  );
}

async function findMarketplaceByName(name) {
  const params = query({
    $select: 'jm1pub_assetmarketplaceid,jm1pub_name',
    $top: '1',
    $filter: `jm1pub_name eq '${escapeOData(name)}'`,
  });
  return firstValue(
    await request(`/jm1pub_assetmarketplaces?${params}`),
  );
}

function healthStatusFromScore(score) {
  if (score >= 95) return OPTION.assetHealthStatus.Healthy;
  if (score >= 85) return OPTION.assetHealthStatus.Healthy;
  if (score >= 70) return OPTION.assetHealthStatus['Needs Review'];
  return OPTION.assetHealthStatus.Blocked;
}

function confidenceStatusFromScore(score, reconciliationRequired) {
  if (reconciliationRequired) return OPTION.assetConfidenceStatus['Reconciliation Required'];
  if (score >= 95) return OPTION.assetConfidenceStatus.High;
  if (score >= 85) return OPTION.assetConfidenceStatus.Good;
  if (score >= 70) return OPTION.assetConfidenceStatus.Medium;
  return OPTION.assetConfidenceStatus.Low;
}

function scoreAsset(asset, marketplaceRows) {
  const reasons = [];
  let health = 100;
  let confidence = 100;

  if (!asset.normalizedIsbn) {
    health -= 10;
    confidence -= 15;
    reasons.push('Missing ISBN');
  }
  if (!asset.authors?.length) {
    health -= 10;
    confidence -= 25;
    reasons.push('Author evidence unknown / pending reconciliation');
  }
  if (!asset.assetFormat) {
    health -= 10;
    confidence -= 10;
    reasons.push('Missing format');
  }
  if (!marketplaceRows.length) {
    health -= 10;
    reasons.push('No marketplace presence staged');
  }
  if (marketplaceRows.some((row) => !row.marketplaceIdentifier)) {
    health -= 5;
    confidence -= 10;
    reasons.push('Marketplace identifier pending');
  }

  const reconciliationRequired = reasons.length > 0;
  return {
    healthScore: clamp(health),
    confidenceScore: clamp(confidence),
    reconciliationRequired,
    reconciliationReason: reasons.join('; '),
    authorEvidenceStatus: asset.authors?.length
      ? OPTION.authorEvidenceStatus.Confirmed
      : OPTION.authorEvidenceStatus['Unknown / Pending Reconciliation'],
  };
}

function formatValue(format) {
  return OPTION.assetFormat[format] ?? OPTION.assetFormat.Other;
}

function marketplaceValue(name) {
  const text = clean(name);
  if (text.includes('Amazon')) return OPTION.marketplace['Amazon KDP'];
  if (text.includes('ACX')) return OPTION.marketplace.ACX;
  if (text.includes('CoreSource')) return OPTION.marketplace.Other;
  if (text.includes('Ingram') || text.includes('Registry') || text.includes('Link')) {
    return OPTION.marketplace['Ingram Content'];
  }
  return OPTION.marketplace[text] ?? OPTION.marketplace.Other;
}

function marketplaceStatusValue(status) {
  const text = clean(status);
  return OPTION.marketplaceStatus[text] ?? OPTION.marketplaceStatus.Unknown;
}

function distributionStatusValue(status) {
  const text = clean(status);
  return OPTION.distributionStatus[text] ?? OPTION.distributionStatus.Unknown;
}

function metadataStatusValue(status) {
  const text = clean(status);
  return OPTION.metadataStatus[text] ?? OPTION.metadataStatus.Incomplete;
}

function assetName(asset) {
  const parts = [asset.title, asset.editionLabel || 'Standard Edition', asset.assetFormat];
  if (asset.normalizedIsbn) parts.push(asset.normalizedIsbn);
  return parts.filter(Boolean).join(' - ').slice(0, 190);
}

function marketplaceName(row, asset) {
  return [asset.title, row.marketplace, row.marketplaceIdentifier || 'Pending ID']
    .filter(Boolean)
    .join(' - ')
    .slice(0, 190);
}

function addReason(reason) {
  if (!reason) return;
  evidence.reconciliation.reasons[reason] = (evidence.reconciliation.reasons[reason] || 0) + 1;
}

async function createExecutionLog(actionType, description, sourceEntity = 'is009_registry_import') {
  await request('/jm1_executionlogs', {
    method: 'POST',
    body: JSON.stringify({
      jm1_name: actionType,
      jm1_actiontype: actionType,
      jm1_actiondescription: description,
      jm1_agentname: 'Cody Prime',
      jm1_startedon: now,
      jm1_completedon: new Date().toISOString(),
      jm1_sourceentity: sourceEntity,
      jm1_sourcerecordid: 'PAM-001/IS-009',
    }),
  });
  evidence.counts.executionLogsCreated += 1;
}

const titleIdByKey = new Map();
let processedTitles = 0;
for (const title of staging.titleCandidates) {
  if (!title.title) continue;
  const existing = await findTitleByName(title.title);
  if (existing) {
    evidence.counts.titlesReused += 1;
    titleIdByKey.set(title.normalizedTitle, existing.jm1pub_titleid);
    await patchTitle(existing.jm1pub_titleid);
    evidence.counts.titlesUpdated += 1;
  } else {
    const created = await createTitle(title);
    evidence.counts.titlesCreated += 1;
    titleIdByKey.set(title.normalizedTitle, created.jm1pub_titleid);
  }
  processedTitles += 1;
  if (processedTitles % progressEvery === 0) {
    log(`titles processed: ${processedTitles}/${staging.titleCandidates.length}`);
  }
}

const marketplacesByAssetKey = new Map();
for (const row of staging.assetMarketplaceCandidates) {
  const rows = marketplacesByAssetKey.get(row.assetKey) || [];
  rows.push(row);
  marketplacesByAssetKey.set(row.assetKey, rows);
}

const assetIdByKey = new Map();
const seenAssetKeys = new Set();
let processedAssets = 0;

for (const asset of staging.publishingAssetCandidates) {
  const titleId = titleIdByKey.get(asset.titleKey);
  if (!titleId) continue;
  const name = assetName(asset);
  const duplicateKey = [
    asset.titleKey,
    asset.editionLabel || 'standard',
    asset.assetFormat || 'Other',
    asset.normalizedIsbn || name,
  ].join('|');
  evidence.duplicatePrevention.assetKeysSeen += 1;
  if (seenAssetKeys.has(duplicateKey)) {
    evidence.duplicatePrevention.duplicateAssetKeysSkipped += 1;
    continue;
  }
  seenAssetKeys.add(duplicateKey);

  const existing = (await findAssetByNormalizedIsbn(asset.normalizedIsbn)) || (await findAssetByName(name));
  if (existing) {
    evidence.counts.assetsReused += 1;
    assetIdByKey.set(asset.assetKey, existing.jm1pub_publishingassetid);
    continue;
  }

  const marketplaceRows = marketplacesByAssetKey.get(asset.assetKey) || [];
  const score = scoreAsset(asset, marketplaceRows);
  if (score.reconciliationRequired) {
    evidence.reconciliation.assetsRequiringReconciliation += 1;
    addReason(score.reconciliationReason);
    if (evidence.samples.reconciliation.length < 25) {
      evidence.samples.reconciliation.push({ type: 'asset', key: asset.assetKey, reason: score.reconciliationReason });
    }
  }

  const record = {
    jm1pub_name: name,
    'jm1pub_TitleId@odata.bind': `/jm1pub_titles(${titleId})`,
    jm1pub_assetformat: formatValue(asset.assetFormat),
    jm1pub_editionlabel: asset.editionLabel || 'Standard Edition',
    jm1pub_iscurrentedition: true,
    jm1pub_isbn13: asset.isbn13 || null,
    jm1pub_normalizedisbn: asset.normalizedIsbn || null,
    jm1pub_asin: asset.asin || null,
    jm1pub_acxproductid: asset.acxProductId || null,
    jm1pub_lsiid: asset.lsiId || null,
    jm1pub_coresourceid: asset.coreSourceId || null,
    jm1pub_retailprice: asset.retailPrice,
    jm1pub_currency: 'USD',
    jm1pub_distributionstatus: distributionStatusValue(asset.distributionStatus),
    jm1pub_assetstatus: OPTION.assetStatus.Staged,
    jm1pub_metadatastatus: metadataStatusValue(asset.metadataStatus),
    jm1pub_evidencesource: (asset.evidenceSources || []).join('; ').slice(0, 200),
    jm1pub_lastverifiedon: now,
    jm1pub_assethealthscore: score.healthScore,
    jm1pub_assethealthstatus: healthStatusFromScore(score.healthScore),
    jm1pub_assetconfidencescore: score.confidenceScore,
    jm1pub_assetconfidencestatus: confidenceStatusFromScore(score.confidenceScore, score.reconciliationRequired),
    jm1pub_authorevidencestatus: score.authorEvidenceStatus,
    jm1pub_reconciliationrequired: score.reconciliationRequired,
    jm1pub_reconciliationreason: score.reconciliationReason || null,
    jm1pub_exceptionreason: (asset.exceptionFlags || []).join('; ') || null,
  };

  const created = await request('/jm1pub_publishingassets', {
    method: 'POST',
    body: JSON.stringify(record),
  });
  evidence.counts.assetsCreated += 1;
  assetIdByKey.set(asset.assetKey, created.jm1pub_publishingassetid);
  if (evidence.samples.assetsCreated.length < 10) {
    evidence.samples.assetsCreated.push({ name, id: created.jm1pub_publishingassetid });
  }
  processedAssets += 1;
  if (processedAssets % progressEvery === 0) {
    log(`assets processed: ${processedAssets}/${staging.publishingAssetCandidates.length}`);
  }
}

const seenMarketplaceKeys = new Set();
let processedMarketplaces = 0;
for (const row of staging.assetMarketplaceCandidates) {
  const assetId = assetIdByKey.get(row.assetKey);
  if (!assetId) continue;
  evidence.duplicatePrevention.marketplaceKeysSeen += 1;
  if (seenMarketplaceKeys.has(row.marketplaceKey)) {
    evidence.duplicatePrevention.duplicateMarketplaceKeysSkipped += 1;
    continue;
  }
  seenMarketplaceKeys.add(row.marketplaceKey);

  const parentAsset = staging.publishingAssetCandidates.find((asset) => asset.assetKey === row.assetKey);
  const name = marketplaceName(row, parentAsset || { title: row.assetKey });
  const existing = await findMarketplaceByName(name);
  if (existing) {
    evidence.counts.marketplacesReused += 1;
    continue;
  }

  const reconciliationRequired = !row.marketplaceIdentifier;
  const reason = reconciliationRequired ? 'Marketplace identifier pending' : '';
  if (reconciliationRequired) {
    evidence.reconciliation.marketplacesRequiringReconciliation += 1;
    addReason(reason);
    if (evidence.samples.reconciliation.length < 25) {
      evidence.samples.reconciliation.push({ type: 'marketplace', key: row.marketplaceKey, reason });
    }
  }
  const confidenceScore = reconciliationRequired ? 80 : 95;

  const record = {
    jm1pub_name: name,
    'jm1pub_PublishingAssetId@odata.bind': `/jm1pub_publishingassets(${assetId})`,
    jm1pub_marketplace: marketplaceValue(row.marketplace),
    jm1pub_marketplacestatus: marketplaceStatusValue(row.marketplaceStatus),
    jm1pub_marketplaceidentifier: row.marketplaceIdentifier || null,
    jm1pub_listingurl: row.listingUrl || null,
    jm1pub_listedprice: row.listedPrice,
    jm1pub_currency: 'USD',
    jm1pub_lastverifiedon: now,
    jm1pub_evidencesource: (row.evidenceSources || []).join('; ').slice(0, 200),
    jm1pub_marketplaceidentifierstatus: reconciliationRequired
      ? OPTION.marketplaceIdentifierStatus['Pending Identification']
      : OPTION.marketplaceIdentifierStatus.Confirmed,
    jm1pub_assetconfidencescore: confidenceScore,
    jm1pub_assetconfidencestatus: confidenceStatusFromScore(confidenceScore, reconciliationRequired),
    jm1pub_reconciliationrequired: reconciliationRequired,
    jm1pub_reconciliationreason: reason || null,
    jm1pub_exceptionreason: (row.exceptionFlags || []).join('; ') || null,
  };

  const created = await request('/jm1pub_assetmarketplaces', {
    method: 'POST',
    body: JSON.stringify(record),
  });
  evidence.counts.marketplacesCreated += 1;
  if (evidence.samples.marketplacesCreated.length < 10) {
    evidence.samples.marketplacesCreated.push({ name, id: created.jm1pub_assetmarketplaceid });
  }
  processedMarketplaces += 1;
  if (processedMarketplaces % progressEvery === 0) {
    log(`marketplaces processed: ${processedMarketplaces}/${staging.assetMarketplaceCandidates.length}`);
  }
}

await createExecutionLog(
  'PAM_REGISTRY_IMPORT_COMPLETED',
  `Imported PAM staging candidates into JM1-Dev: ${evidence.counts.assetsCreated} assets and ${evidence.counts.marketplacesCreated} marketplace records created.`,
);
await createExecutionLog(
  'PAM_RECONCILIATION_QUEUE_GENERATED',
  `Generated reconciliation queue: ${evidence.reconciliation.assetsRequiringReconciliation} asset flags and ${evidence.reconciliation.marketplacesRequiringReconciliation} marketplace flags.`,
);

log(
  `import complete: titles created ${evidence.counts.titlesCreated}, assets created ${evidence.counts.assetsCreated}, marketplaces created ${evidence.counts.marketplacesCreated}`,
);

mkdirSync(evidencePath.split('/').slice(0, -1).join('/'), { recursive: true });
writeFileSync(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`);
console.log(JSON.stringify(evidence, null, 2));
