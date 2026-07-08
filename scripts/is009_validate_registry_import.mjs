#!/usr/bin/env node

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const apiBase =
  process.env.DATAVERSE_WEB_API_BASE_URL ||
  'https://org52409ff2.crm.dynamics.com/api/data/v9.2';
const token = process.env.DATAVERSE_ACCESS_TOKEN;
const evidencePath =
  process.env.IS009_VALIDATION_EVIDENCE ||
  'docs/implementation/evidence/IS-009/is009-registry-operational-validation.json';
const importEvidencePath =
  process.env.IS009_IMPORT_EVIDENCE ||
  'docs/implementation/evidence/IS-009/is009-registry-import-evidence.json';

if (!token) throw new Error('DATAVERSE_ACCESS_TOKEN is required.');

const importEvidence = JSON.parse(
  readFileSync(importEvidencePath, 'utf8'),
);

async function request(path, options = {}) {
  const response = await fetch(`${apiBase}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'OData-MaxVersion': '4.0',
      'OData-Version': '4.0',
      ...(options.headers || {}),
    },
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`${options.method || 'GET'} ${path} failed: ${response.status} ${body}`);
  }
  const text = await response.text();
  return text ? JSON.parse(text) : null;
}

async function retrieveAll(entitySet, select) {
  let path = `/${entitySet}?$select=${select}`;
  const rows = [];
  while (path) {
    const page = await request(path);
    rows.push(...(page.value || []));
    path = page['@odata.nextLink'] ? page['@odata.nextLink'].replace(apiBase, '') : '';
  }
  return rows;
}

function countBy(rows, field) {
  const counts = {};
  for (const row of rows) {
    const key = row[`${field}@OData.Community.Display.V1.FormattedValue`] || row[field] || 'Blank';
    counts[key] = (counts[key] || 0) + 1;
  }
  return Object.fromEntries(Object.entries(counts).sort(([a], [b]) => a.localeCompare(b)));
}

function duplicateCount(rows, keyFn) {
  const counts = new Map();
  for (const row of rows) {
    const key = keyFn(row);
    if (!key) continue;
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  return [...counts.entries()].filter(([, count]) => count > 1);
}

const assets = await retrieveAll(
  'jm1pub_publishingassets',
  [
    'jm1pub_publishingassetid',
    'jm1pub_name',
    'jm1pub_normalizedisbn',
    'jm1pub_editionlabel',
    'jm1pub_assetformat',
    'jm1pub_assethealthscore',
    'jm1pub_assethealthstatus',
    'jm1pub_assetconfidencescore',
    'jm1pub_assetconfidencestatus',
    'jm1pub_authorevidencestatus',
    'jm1pub_reconciliationrequired',
    'jm1pub_reconciliationreason',
  ].join(','),
);

const marketplaces = await retrieveAll(
  'jm1pub_assetmarketplaces',
  [
    'jm1pub_assetmarketplaceid',
    'jm1pub_name',
    'jm1pub_marketplace',
    'jm1pub_marketplacestatus',
    'jm1pub_marketplaceidentifier',
    'jm1pub_marketplaceidentifierstatus',
    'jm1pub_assetconfidencescore',
    'jm1pub_assetconfidencestatus',
    'jm1pub_reconciliationrequired',
    'jm1pub_reconciliationreason',
  ].join(','),
);

const logs = await retrieveAll(
  'jm1_executionlogs',
  'jm1_executionlogid,jm1_name,jm1_actiontype,jm1_executionstatus,jm1_startedon,jm1_sourceentity',
);

const pamLogs = logs.filter((row) =>
  ['PAM_REGISTRY_IMPORT_COMPLETED', 'PAM_RECONCILIATION_QUEUE_GENERATED'].includes(row.jm1_actiontype),
);

const duplicateIsbn = duplicateCount(assets, (row) => row.jm1pub_normalizedisbn);
const duplicateAssetName = duplicateCount(assets, (row) => row.jm1pub_name);
const reconciliationAssets = assets.filter((row) => row.jm1pub_reconciliationrequired);
const reconciliationMarketplaces = marketplaces.filter((row) => row.jm1pub_reconciliationrequired);
const totalAssetsHandled = (importEvidence.counts.assetsCreated || 0) + (importEvidence.counts.assetsReused || 0);
const totalMarketplacesHandled =
  (importEvidence.counts.marketplacesCreated || 0) + (importEvidence.counts.marketplacesReused || 0);

const validation = {
  generatedAt: new Date().toISOString(),
  apiBase,
  importEvidenceGeneratedAt: importEvidence.generatedAt,
  dataverse: {
    publishingAssetsRead: assets.length,
    assetMarketplacesRead: marketplaces.length,
    executionLogsRead: pamLogs.length,
  },
  importedThisRun: importEvidence.counts,
  duplicateValidation: {
    duplicatePublishingAssetNames: duplicateAssetName.length,
    duplicateNormalizedIsbnsObserved: duplicateIsbn.length,
    note: 'Duplicate ISBN observations can represent rerun/reuse or prior records; import duplicate prevention skipped duplicate staged asset keys.',
  },
  healthDistribution: countBy(assets, 'jm1pub_assethealthstatus'),
  confidenceDistribution: countBy(assets, 'jm1pub_assetconfidencestatus'),
  authorEvidenceDistribution: countBy(assets, 'jm1pub_authorevidencestatus'),
  marketplaceIdentifierDistribution: countBy(marketplaces, 'jm1pub_marketplaceidentifierstatus'),
  marketplaceConfidenceDistribution: countBy(marketplaces, 'jm1pub_assetconfidencestatus'),
  reconciliationQueue: {
    assets: reconciliationAssets.length,
    marketplaces: reconciliationMarketplaces.length,
    sampleAssets: reconciliationAssets.slice(0, 20).map((row) => ({
      id: row.jm1pub_publishingassetid,
      name: row.jm1pub_name,
      reason: row.jm1pub_reconciliationreason,
    })),
    sampleMarketplaces: reconciliationMarketplaces.slice(0, 20).map((row) => ({
      id: row.jm1pub_assetmarketplaceid,
      name: row.jm1pub_name,
      reason: row.jm1pub_reconciliationreason,
    })),
  },
  executionLogEvidence: pamLogs.map((row) => ({
    id: row.jm1_executionlogid,
    actionType: row.jm1_actiontype,
    status: row['jm1_executionstatus@OData.Community.Display.V1.FormattedValue'] || row.jm1_executionstatus,
    startedOn: row.jm1_startedon,
  })),
  operationalReadiness: {
    schema: 'READY',
    import: totalAssetsHandled >= assets.length && totalMarketplacesHandled >= marketplaces.length ? 'READY' : 'CHECK',
    reconciliation: reconciliationAssets.length || reconciliationMarketplaces.length ? 'ACTIVE_QUEUE' : 'NO_QUEUE',
    executionLogging: pamLogs.length >= 2 ? 'READY' : 'CHECK',
  },
};

mkdirSync(evidencePath.split('/').slice(0, -1).join('/'), { recursive: true });
writeFileSync(evidencePath, `${JSON.stringify(validation, null, 2)}\n`);
console.log(JSON.stringify(validation, null, 2));
