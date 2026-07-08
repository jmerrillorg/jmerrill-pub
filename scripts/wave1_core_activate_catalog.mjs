#!/usr/bin/env node

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const apiBase =
  process.env.DATAVERSE_WEB_API_BASE_URL ||
  'https://jm1hq.crm.dynamics.com/api/data/v9.2';
const token = process.env.DATAVERSE_ACCESS_TOKEN;
const registerPath =
  process.env.OE001_REGISTER_PATH ||
  'data/oe001-publisher-master-imprint-register-full.json';
const evidencePath =
  process.env.WAVE1_CATALOG_EVIDENCE ||
  'docs/implementation/evidence/WAVE-1/wave1-core-catalog-activation.json';

if (!token) throw new Error('DATAVERSE_ACCESS_TOKEN is required.');

const register = JSON.parse(readFileSync(registerPath, 'utf8'));
const registerRows = (register.rows || []).filter((row) => row.status === 'PUBLISHER_CERTIFIED');
const now = new Date().toISOString();
const solutionUniqueName = process.env.WAVE1_SOLUTION_UNIQUE_NAME || 'JM1_Wave1_CoreActivation';
const publisherSourceSolution = process.env.WAVE1_PUBLISHER_SOURCE_SOLUTION || 'JM1_Publishing_Core';

const PUBLIC_STATUS = {
  Draft: 100000000,
  Public: 100000001,
  Hidden: 100000002,
  Retired: 100000003,
};

const IMPRINT = {
  'J Merrill Publishing': 100000000,
  'JM Works': 100000001,
  'JM Little': 100000002,
  'JM Verse': 100000003,
  'JM Signature': 100000004,
};

const evidence = {
  generatedAt: now,
  apiBase,
  source: register.source,
  counts: {
    registerRows: registerRows.length,
    titleFieldsCreated: 0,
    titleFieldsExisting: 0,
    contactFieldsCreated: 0,
    contactFieldsExisting: 0,
    lookupsCreated: 0,
    lookupsExisting: 0,
    titlesCreated: 0,
    titlesUpdated: 0,
    titlesHidden: 0,
  },
  samples: {
    created: [],
    updated: [],
    hidden: [],
  },
};

function log(message) {
  console.error(`[wave1-core-catalog] ${message}`);
}

function label(value) {
  return {
    LocalizedLabels: [{ Label: value, LanguageCode: 1033 }],
    UserLocalizedLabel: { Label: value, LanguageCode: 1033 },
  };
}

function required(value = 'None') {
  return {
    Value: value,
    CanBeChanged: true,
    ManagedPropertyLogicalName: 'canmodifyrequirementlevelsettings',
  };
}

function option(labelText, value) {
  return { Value: value, Label: label(labelText) };
}

function stringField(schemaName, displayName, maxLength = 200, req = 'None') {
  return {
    '@odata.type': 'Microsoft.Dynamics.CRM.StringAttributeMetadata',
    SchemaName: schemaName,
    DisplayName: label(displayName),
    RequiredLevel: required(req),
    MaxLength: maxLength,
    FormatName: { Value: 'Text' },
  };
}

function memoField(schemaName, displayName) {
  return {
    '@odata.type': 'Microsoft.Dynamics.CRM.MemoAttributeMetadata',
    SchemaName: schemaName,
    DisplayName: label(displayName),
    RequiredLevel: required('None'),
    MaxLength: 4000,
    FormatName: { Value: 'TextArea' },
  };
}

function integerField(schemaName, displayName) {
  return {
    '@odata.type': 'Microsoft.Dynamics.CRM.IntegerAttributeMetadata',
    SchemaName: schemaName,
    DisplayName: label(displayName),
    RequiredLevel: required('None'),
    MinValue: 0,
    MaxValue: 9999,
    Format: 'None',
  };
}

function dateOnlyField(schemaName, displayName) {
  return {
    '@odata.type': 'Microsoft.Dynamics.CRM.DateTimeAttributeMetadata',
    SchemaName: schemaName,
    DisplayName: label(displayName),
    RequiredLevel: required('None'),
    Format: 'DateOnly',
    DateTimeBehavior: { Value: 'DateOnly' },
  };
}

function picklistField(schemaName, displayName, values) {
  return {
    '@odata.type': 'Microsoft.Dynamics.CRM.PicklistAttributeMetadata',
    SchemaName: schemaName,
    DisplayName: label(displayName),
    RequiredLevel: required('None'),
    OptionSet: {
      '@odata.type': 'Microsoft.Dynamics.CRM.OptionSetMetadata',
      IsGlobal: false,
      OptionSetType: 'Picklist',
      Options: values,
    },
  };
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

async function request(path, options = {}) {
  const response = await fetch(`${apiBase}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'OData-MaxVersion': '4.0',
      'OData-Version': '4.0',
      Prefer: options.method === 'POST' ? 'return=representation' : 'return=minimal',
      ...(options.headers || {}),
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`${options.method || 'GET'} ${path} failed: ${response.status} ${body}`);
  }

  if (response.status === 204) return null;
  const text = await response.text();
  return text ? JSON.parse(text) : null;
}

async function getSolution(uniqueName) {
  const result = await request(
    `/solutions?$select=solutionid,uniquename,_publisherid_value&$filter=uniquename eq '${uniqueName}'`,
  );
  return result.value[0] || null;
}

async function ensureSolution() {
  const existing = await getSolution(solutionUniqueName);
  if (existing) {
    log(`solution exists: ${solutionUniqueName}`);
    return existing;
  }
  const publisherSource = await getSolution(publisherSourceSolution);
  if (!publisherSource?._publisherid_value) {
    throw new Error(`Publisher source solution ${publisherSourceSolution} not found.`);
  }
  await request('/solutions', {
    method: 'POST',
    body: JSON.stringify({
      uniquename: solutionUniqueName,
      friendlyname: 'JM1 Wave 1 Core Activation',
      version: '1.0.0.0',
      'publisherid@odata.bind': `/publishers(${publisherSource._publisherid_value})`,
    }),
  });
  log(`solution created: ${solutionUniqueName}`);
  return getSolution(solutionUniqueName);
}

async function getAttribute(entityLogicalName, attributeLogicalName) {
  try {
    return await request(
      `/EntityDefinitions(LogicalName='${entityLogicalName}')/Attributes(LogicalName='${attributeLogicalName}')?$select=MetadataId,LogicalName,AttributeType`,
    );
  } catch (error) {
    if (String(error.message).includes('404')) return null;
    throw error;
  }
}

async function addSolutionComponent(componentType, componentId) {
  try {
    await request('/AddSolutionComponent', {
      method: 'POST',
      body: JSON.stringify({
        ComponentType: componentType,
        ComponentId: componentId,
        SolutionUniqueName: solutionUniqueName,
        AddRequiredComponents: false,
      }),
    });
  } catch {
    // Non-blocking for wave activation evidence.
  }
}

async function ensureAttribute(entityLogicalName, logicalName, metadata, bucket) {
  const existing = await getAttribute(entityLogicalName, logicalName);
  if (existing) {
    evidence.counts[bucket === 'title' ? 'titleFieldsExisting' : 'contactFieldsExisting'] += 1;
    log(`field exists: ${entityLogicalName}.${logicalName}`);
    return existing;
  }

  log(`creating field: ${entityLogicalName}.${logicalName}`);
  await request(`/EntityDefinitions(LogicalName='${entityLogicalName}')/Attributes`, {
    method: 'POST',
    body: JSON.stringify(metadata),
  });

  for (let i = 0; i < 20; i += 1) {
    const created = await getAttribute(entityLogicalName, logicalName);
    if (created) {
      evidence.counts[bucket === 'title' ? 'titleFieldsCreated' : 'contactFieldsCreated'] += 1;
      await addSolutionComponent(2, created.MetadataId);
      log(`field created: ${entityLogicalName}.${logicalName}`);
      return created;
    }
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }
  throw new Error(`Timed out waiting for ${entityLogicalName}.${logicalName}`);
}

async function ensureLookup({
  referencingEntity,
  referencedEntity,
  schemaName,
  displayName,
  relationshipSchemaName,
}) {
  const logicalName = schemaName.toLowerCase();
  const existing = await getAttribute(referencingEntity, logicalName);
  if (existing) {
    evidence.counts.lookupsExisting += 1;
    log(`lookup exists: ${referencingEntity}.${logicalName}`);
    return existing;
  }

  log(`creating lookup: ${referencingEntity}.${logicalName}`);
  await request('/RelationshipDefinitions', {
    method: 'POST',
    body: JSON.stringify({
      '@odata.type': 'Microsoft.Dynamics.CRM.OneToManyRelationshipMetadata',
      SchemaName: relationshipSchemaName,
      ReferencedEntity: referencedEntity,
      ReferencingEntity: referencingEntity,
      AssociatedMenuConfiguration: {
        Behavior: 'UseLabel',
        Group: 'Details',
        Label: label(displayName),
        Order: 10000,
      },
      CascadeConfiguration: {
        Assign: 'NoCascade',
        Delete: 'RemoveLink',
        Archive: 'RemoveLink',
        Merge: 'Cascade',
        Reparent: 'NoCascade',
        Share: 'NoCascade',
        Unshare: 'NoCascade',
        RollupView: 'NoCascade',
      },
      Lookup: {
        '@odata.type': 'Microsoft.Dynamics.CRM.LookupAttributeMetadata',
        SchemaName: schemaName,
        DisplayName: label(displayName),
        RequiredLevel: required('None'),
      },
    }),
  });

  for (let i = 0; i < 20; i += 1) {
    const created = await getAttribute(referencingEntity, logicalName);
    if (created) {
      evidence.counts.lookupsCreated += 1;
      log(`lookup created: ${referencingEntity}.${logicalName}`);
      return created;
    }
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }
  throw new Error(`Timed out waiting for lookup ${referencingEntity}.${logicalName}`);
}

async function publishAll() {
  if (process.env.WAVE1_SKIP_PUBLISH === 'true') {
    log('publish skipped by WAVE1_SKIP_PUBLISH=true');
    return;
  }
  log('publishing customizations');
  await request('/PublishAllXml', { method: 'POST', body: JSON.stringify({}) });
  log('publish completed');
}

async function getAllActiveTitles() {
  const rows = [];
  let path = `/jm1pub_titles?${query({
    $select:
      'jm1pub_titleid,jm1pub_titlename,jm1pub_slug,jm1pub_authordisplayname,jm1pub_authorname,jm1pub_publiccatalogstatus,statecode',
    $filter: 'statecode eq 0',
    $top: '5000',
  })}`;

  while (path) {
    const page = await request(path);
    rows.push(...(page.value || []));
    path = page['@odata.nextLink'] ? page['@odata.nextLink'].replace(apiBase, '') : '';
  }
  return rows;
}

async function findTitleByName(title) {
  const params = query({
    $select: 'jm1pub_titleid,jm1pub_titlename,jm1pub_slug,jm1pub_publiccatalogstatus',
    $top: '1',
    $filter: `jm1pub_titlename eq '${escapeOData(title)}'`,
  });
  const page = await request(`/jm1pub_titles?${params}`);
  return page.value?.[0] || null;
}

function mapRow(row) {
  const title = clean(row.sourceTitle || row.matchedCatalogTitle);
  const author = clean(row.sourceAuthor || row.matchedCatalogAuthor);
  const slug = clean(row.matchedCatalogId);
  return {
    title,
    author,
    slug,
    imprint: clean(row.normalizedImprint),
  };
}

async function createTitle(row) {
  return request('/jm1pub_titles', {
    method: 'POST',
    body: JSON.stringify({
      jm1pub_titlename: row.title,
      jm1pub_name: row.title,
      jm1pub_slug: row.slug,
      jm1pub_authordisplayname: row.author,
      jm1pub_authorname: row.author,
      jm1pub_certifiedimprint: IMPRINT[row.imprint],
      jm1pub_publiccatalogstatus: PUBLIC_STATUS.Public,
    }),
  });
}

async function updateTitle(id, row) {
  await request(`/jm1pub_titles(${id})`, {
    method: 'PATCH',
    body: JSON.stringify({
      jm1pub_name: row.title,
      jm1pub_slug: row.slug,
      jm1pub_authordisplayname: row.author,
      jm1pub_authorname: row.author,
      jm1pub_certifiedimprint: IMPRINT[row.imprint],
      jm1pub_publiccatalogstatus: PUBLIC_STATUS.Public,
    }),
  });
}

async function hideTitle(id) {
  await request(`/jm1pub_titles(${id})`, {
    method: 'PATCH',
    body: JSON.stringify({
      jm1pub_publiccatalogstatus: PUBLIC_STATUS.Hidden,
    }),
  });
}

await ensureSolution();

for (const [logicalName, metadata] of [
  ['jm1pub_name', stringField('jm1pub_Name', 'Catalog Title Name', 300)],
  ['jm1pub_slug', stringField('jm1pub_Slug', 'Slug', 300)],
  ['jm1pub_subtitle', stringField('jm1pub_Subtitle', 'Subtitle', 300)],
  ['jm1pub_authordisplayname', stringField('jm1pub_AuthorDisplayName', 'Author Display Name', 300)],
  ['jm1pub_authorname', stringField('jm1pub_AuthorName', 'Author Name', 300)],
  ['jm1pub_shortdescription', memoField('jm1pub_ShortDescription', 'Short Description')],
  ['jm1pub_longdescription', memoField('jm1pub_LongDescription', 'Long Description')],
  ['jm1pub_genre', stringField('jm1pub_Genre', 'Genre', 200)],
  ['jm1pub_publicationstatus', stringField('jm1pub_PublicationStatus', 'Publication Status', 100)],
  ['jm1pub_releasedate', dateOnlyField('jm1pub_ReleaseDate', 'Release Date')],
  ['jm1pub_publicationyear', integerField('jm1pub_PublicationYear', 'Publication Year')],
  ['jm1pub_series', stringField('jm1pub_Series', 'Series', 200)],
  ['jm1pub_seriesorder', integerField('jm1pub_SeriesOrder', 'Series Order')],
  [
    'jm1pub_publiccatalogstatus',
    picklistField('jm1pub_PublicCatalogStatus', 'Public Catalog Status', [
      option('Draft', PUBLIC_STATUS.Draft),
      option('Public', PUBLIC_STATUS.Public),
      option('Hidden', PUBLIC_STATUS.Hidden),
      option('Retired', PUBLIC_STATUS.Retired),
    ]),
  ],
  [
    'jm1pub_certifiedimprint',
    picklistField('jm1pub_CertifiedImprint', 'Certified Imprint', [
      option('J Merrill Publishing', IMPRINT['J Merrill Publishing']),
      option('JM Works', IMPRINT['JM Works']),
      option('JM Little', IMPRINT['JM Little']),
      option('JM Verse', IMPRINT['JM Verse']),
      option('JM Signature', IMPRINT['JM Signature']),
    ]),
  ],
]) {
  await ensureAttribute('jm1pub_title', logicalName, metadata, 'title');
}

for (const [logicalName, metadata] of [
  ['jm1pub_publicslug', stringField('jm1pub_PublicSlug', 'Public Slug', 300)],
  ['jm1pub_publicauthorbio', memoField('jm1pub_PublicAuthorBio', 'Public Author Bio')],
  ['jm1pub_authorphoto', stringField('jm1pub_AuthorPhoto', 'Author Photo', 1000)],
]) {
  await ensureAttribute('contact', logicalName, metadata, 'contact');
}

await publishAll();

const certifiedTitles = new Map();
for (const sourceRow of registerRows) {
  const row = mapRow(sourceRow);
  if (!row.title || !row.slug || !row.imprint) continue;
  certifiedTitles.set(row.title, row);
}

for (const row of certifiedTitles.values()) {
  const existing = await findTitleByName(row.title);
  if (!existing) {
    const created = await createTitle(row);
    evidence.counts.titlesCreated += 1;
    log(`title created: ${row.title}`);
    if (evidence.samples.created.length < 20) {
      evidence.samples.created.push({ id: created.jm1pub_titleid, title: row.title, slug: row.slug });
    }
  } else {
    await updateTitle(existing.jm1pub_titleid, row);
    evidence.counts.titlesUpdated += 1;
    log(`title updated: ${row.title}`);
    if (evidence.samples.updated.length < 20) {
      evidence.samples.updated.push({ id: existing.jm1pub_titleid, title: row.title, slug: row.slug });
    }
  }
}

const activeTitles = await getAllActiveTitles();
for (const row of activeTitles) {
  const title = clean(row.jm1pub_titlename);
  if (!title) continue;
  if (certifiedTitles.has(title)) continue;
  await hideTitle(row.jm1pub_titleid);
  evidence.counts.titlesHidden += 1;
  log(`title hidden from public path: ${title}`);
  if (evidence.samples.hidden.length < 20) {
    evidence.samples.hidden.push({ id: row.jm1pub_titleid, title });
  }
}

mkdirSync(evidencePath.split('/').slice(0, -1).join('/'), { recursive: true });
writeFileSync(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`);
log(`evidence written: ${evidencePath}`);
console.log(JSON.stringify(evidence, null, 2));
