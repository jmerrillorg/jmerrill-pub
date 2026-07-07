#!/usr/bin/env node

import { writeFileSync, mkdirSync } from 'node:fs';

const apiBase =
  process.env.DATAVERSE_WEB_API_BASE_URL ||
  'https://org52409ff2.crm.dynamics.com/api/data/v9.2';
const token = process.env.DATAVERSE_ACCESS_TOKEN;
const solutionUniqueName = process.env.IS009_SOLUTION_UNIQUE_NAME || 'JM1_PAM_AssetRegistry';
const solutionFriendlyName = process.env.IS009_SOLUTION_FRIENDLY_NAME || 'JM1 PAM Asset Registry';
const publisherSourceSolution = process.env.IS009_PUBLISHER_SOURCE_SOLUTION || 'JM1_Publishing';
const evidencePath =
  process.env.IS009_DEPLOY_EVIDENCE ||
  'docs/implementation/evidence/IS-009/is009-schema-deployment-evidence.json';

if (!token) {
  throw new Error('DATAVERSE_ACCESS_TOKEN is required.');
}

const actions = [];

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
          ...(options.headers || {}),
        },
      });
      break;
    } catch (error) {
      if (attempt === 3) throw error;
      await new Promise((resolve) => setTimeout(resolve, attempt * 5000));
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

async function getSolution(uniqueName) {
  const result = await request(
    `/solutions?$select=solutionid,uniquename,friendlyname,_publisherid_value&$filter=uniquename eq '${uniqueName}'`,
  );
  return result.value[0] || null;
}

async function ensureSolution() {
  const existing = await getSolution(solutionUniqueName);
  if (existing) {
    actions.push({ type: 'solution', name: solutionUniqueName, status: 'exists' });
    return existing;
  }

  const publisherSource = await getSolution(publisherSourceSolution);
  if (!publisherSource?._publisherid_value) {
    throw new Error(`Publisher source solution ${publisherSourceSolution} was not found.`);
  }

  await request('/solutions', {
    method: 'POST',
    body: JSON.stringify({
      uniquename: solutionUniqueName,
      friendlyname: solutionFriendlyName,
      version: '1.0.0.0',
      'publisherid@odata.bind': `/publishers(${publisherSource._publisherid_value})`,
    }),
  });

  actions.push({ type: 'solution', name: solutionUniqueName, status: 'created' });
  return getSolution(solutionUniqueName);
}

async function getEntity(logicalName) {
  try {
    return await request(
      `/EntityDefinitions(LogicalName='${logicalName}')?$select=MetadataId,LogicalName,SchemaName,EntitySetName`,
    );
  } catch (error) {
    if (String(error.message).includes('404')) return null;
    throw error;
  }
}

async function getAttribute(entityLogicalName, attributeLogicalName) {
  try {
    return await request(
      `/EntityDefinitions(LogicalName='${entityLogicalName}')/Attributes(LogicalName='${attributeLogicalName}')?$select=MetadataId,LogicalName,SchemaName,AttributeType`,
    );
  } catch (error) {
    if (String(error.message).includes('404')) return null;
    throw error;
  }
}

async function addSolutionComponent(componentType, componentId, name) {
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
    actions.push({ type: 'solution-component', name, componentType, status: 'added' });
  } catch (error) {
    actions.push({
      type: 'solution-component',
      name,
      componentType,
      status: 'deferred',
      reason: String(error.message).slice(0, 500),
    });
  }
}

async function ensureEntity({
  logicalName,
  schemaName,
  displayName,
  pluralName,
  description,
  primaryNameSchemaName,
}) {
  const existing = await getEntity(logicalName);
  if (existing) {
    actions.push({ type: 'table', name: logicalName, status: 'exists' });
    return existing;
  }

  await request('/EntityDefinitions', {
    method: 'POST',
    body: JSON.stringify({
      '@odata.type': 'Microsoft.Dynamics.CRM.EntityMetadata',
      SchemaName: schemaName,
      DisplayName: label(displayName),
      DisplayCollectionName: label(pluralName),
      Description: label(description),
      OwnershipType: 'UserOwned',
      IsActivity: false,
      HasActivities: false,
      HasNotes: true,
      Attributes: [
        {
          '@odata.type': 'Microsoft.Dynamics.CRM.StringAttributeMetadata',
          SchemaName: primaryNameSchemaName,
          DisplayName: label('Name'),
          RequiredLevel: required('ApplicationRequired'),
          MaxLength: 200,
          FormatName: { Value: 'Text' },
          IsPrimaryName: true,
        },
      ],
    }),
  });

  const created = await waitForEntity(logicalName);
  actions.push({ type: 'table', name: logicalName, status: 'created' });
  await addSolutionComponent(1, created.MetadataId, logicalName);
  return created;
}

async function waitForEntity(logicalName) {
  for (let i = 0; i < 30; i += 1) {
    const entity = await getEntity(logicalName);
    if (entity) return entity;
    await new Promise((resolve) => setTimeout(resolve, 3000));
  }
  throw new Error(`Timed out waiting for entity ${logicalName}`);
}

async function ensureAttribute(entityLogicalName, attribute) {
  const logicalName = attribute.logicalName;
  const existing = await getAttribute(entityLogicalName, logicalName);
  if (existing) {
    actions.push({ type: 'field', table: entityLogicalName, name: logicalName, status: 'exists' });
    return existing;
  }

  await request(`/EntityDefinitions(LogicalName='${entityLogicalName}')/Attributes`, {
    method: 'POST',
    body: JSON.stringify(attribute.metadata),
  });

  const created = await waitForAttribute(entityLogicalName, logicalName);
  actions.push({ type: 'field', table: entityLogicalName, name: logicalName, status: 'created' });
  await addSolutionComponent(2, created.MetadataId, `${entityLogicalName}.${logicalName}`);
  return created;
}

async function waitForAttribute(entityLogicalName, attributeLogicalName) {
  for (let i = 0; i < 30; i += 1) {
    const attribute = await getAttribute(entityLogicalName, attributeLogicalName);
    if (attribute) return attribute;
    await new Promise((resolve) => setTimeout(resolve, 3000));
  }
  throw new Error(`Timed out waiting for field ${entityLogicalName}.${attributeLogicalName}`);
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

function boolField(schemaName, displayName) {
  return {
    '@odata.type': 'Microsoft.Dynamics.CRM.BooleanAttributeMetadata',
    SchemaName: schemaName,
    DisplayName: label(displayName),
    RequiredLevel: required('None'),
    OptionSet: {
      TrueOption: option('Yes', 1),
      FalseOption: option('No', 0),
    },
  };
}

function dateTimeField(schemaName, displayName, behavior = 'UserLocal') {
  return {
    '@odata.type': 'Microsoft.Dynamics.CRM.DateTimeAttributeMetadata',
    SchemaName: schemaName,
    DisplayName: label(displayName),
    RequiredLevel: required('None'),
    Format: 'DateAndTime',
    DateTimeBehavior: { Value: behavior },
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

function decimalField(schemaName, displayName, precision = 2) {
  return {
    '@odata.type': 'Microsoft.Dynamics.CRM.DecimalAttributeMetadata',
    SchemaName: schemaName,
    DisplayName: label(displayName),
    RequiredLevel: required('None'),
    MinValue: 0,
    MaxValue: 1000000000,
    Precision: precision,
  };
}

function integerField(schemaName, displayName) {
  return {
    '@odata.type': 'Microsoft.Dynamics.CRM.IntegerAttributeMetadata',
    SchemaName: schemaName,
    DisplayName: label(displayName),
    RequiredLevel: required('None'),
    MinValue: 0,
    MaxValue: 100,
    Format: 'None',
  };
}

function moneyField(schemaName, displayName) {
  return {
    '@odata.type': 'Microsoft.Dynamics.CRM.MoneyAttributeMetadata',
    SchemaName: schemaName,
    DisplayName: label(displayName),
    RequiredLevel: required('None'),
    MinValue: 0,
    MaxValue: 1000000000,
    PrecisionSource: 2,
  };
}

function picklistField(schemaName, displayName, labels, req = 'None') {
  return {
    '@odata.type': 'Microsoft.Dynamics.CRM.PicklistAttributeMetadata',
    SchemaName: schemaName,
    DisplayName: label(displayName),
    RequiredLevel: required(req),
    OptionSet: {
      '@odata.type': 'Microsoft.Dynamics.CRM.OptionSetMetadata',
      IsGlobal: false,
      OptionSetType: 'Picklist',
      Options: labels.map((item, index) => option(item, 100000000 + index)),
    },
  };
}

async function ensureLookup({
  referencingEntity,
  referencedEntity,
  schemaName,
  displayName,
  relationshipSchemaName,
  requiredLevel = 'None',
}) {
  const logicalName = schemaName.toLowerCase();
  const existing = await getAttribute(referencingEntity, logicalName);
  if (existing) {
    actions.push({ type: 'lookup', table: referencingEntity, name: logicalName, status: 'exists' });
    return existing;
  }

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
        RequiredLevel: required(requiredLevel),
      },
    }),
  });

  const created = await waitForAttribute(referencingEntity, logicalName);
  actions.push({ type: 'lookup', table: referencingEntity, name: logicalName, status: 'created' });
  return created;
}

async function publish() {
  await request('/PublishAllXml', { method: 'POST', body: JSON.stringify({}) });
  actions.push({ type: 'publish', status: 'completed' });
}

await ensureSolution();

await ensureEntity({
  logicalName: 'jm1pub_contract',
  schemaName: 'jm1pub_Contract',
  displayName: 'Contract',
  pluralName: 'Contracts',
  description: 'Canonical publishing agreement / contract basis for JM1 Publishing.',
  primaryNameSchemaName: 'jm1pub_ContractName',
});

await ensureEntity({
  logicalName: 'jm1_executionlog',
  schemaName: 'jm1_ExecutionLog',
  displayName: 'Execution Log',
  pluralName: 'Execution Logs',
  description: 'Canonical execution proof and audit event layer.',
  primaryNameSchemaName: 'jm1_Name',
});

await ensureEntity({
  logicalName: 'jm1pub_publishingasset',
  schemaName: 'jm1pub_PublishingAsset',
  displayName: 'Publishing Asset',
  pluralName: 'Publishing Assets',
  description: 'Format / edition / ISBN-bearing asset for a publishing title.',
  primaryNameSchemaName: 'jm1pub_Name',
});

await ensureEntity({
  logicalName: 'jm1pub_assetmarketplace',
  schemaName: 'jm1pub_AssetMarketplace',
  displayName: 'Asset Marketplace',
  pluralName: 'Asset Marketplaces',
  description: 'Marketplace or distribution presence for a publishing asset.',
  primaryNameSchemaName: 'jm1pub_Name',
});

for (const field of [
  ['jm1pub_contracttype', picklistField('jm1pub_ContractType', 'Contract Type', ['Publishing Agreement', 'Amendment', 'Addendum', 'Other'])],
  ['jm1pub_status', picklistField('jm1pub_Status', 'Status', ['Draft', 'Ready to Send', 'Sent', 'Signed', 'Active', 'Voided', 'Exception'])],
  ['jm1pub_docurl', stringField('jm1pub_DocUrl', 'Document URL', 1000)],
  ['jm1pub_esignprovider', picklistField('jm1pub_EsignProvider', 'E-Sign Provider', ['SignNow', 'Other'])],
  ['jm1pub_agreementsenton', dateTimeField('jm1pub_AgreementSentOn', 'Agreement Sent On')],
  ['jm1pub_signeddate', dateTimeField('jm1pub_SignedDate', 'Signed Date')],
  ['jm1pub_provideragreementid', stringField('jm1pub_ProviderAgreementId', 'Provider Agreement ID', 200)],
  ['jm1pub_providerinviteid', stringField('jm1pub_ProviderInviteId', 'Provider Invite ID', 200)],
  ['jm1pub_providerstatus', stringField('jm1pub_ProviderStatus', 'Provider Status', 200)],
  ['jm1pub_templateversionreference', stringField('jm1pub_TemplateVersionReference', 'Template Version Reference', 200)],
  ['jm1pub_selectedpackagecode', stringField('jm1pub_SelectedPackageCode', 'Selected Package Code', 100)],
  ['jm1pub_standardpackageprice', moneyField('jm1pub_StandardPackagePrice', 'Standard Package Price')],
  ['jm1pub_commissioningtransactionamount', moneyField('jm1pub_CommissioningTransactionAmount', 'Commissioning Transaction Amount')],
  ['jm1pub_paymentpath', stringField('jm1pub_PaymentPath', 'Payment Path', 200)],
  ['jm1pub_royaltypercent', decimalField('jm1pub_RoyaltyPercent', 'Royalty Percent', 2)],
]) {
  await ensureAttribute('jm1pub_contract', { logicalName: field[0], metadata: field[1] });
}

await ensureLookup({
  referencingEntity: 'jm1pub_contract',
  referencedEntity: 'jm1pub_title',
  schemaName: 'jm1pub_Title',
  displayName: 'Title',
  relationshipSchemaName: 'jm1pub_title_contract',
});

for (const field of [
  ['jm1_actiondescription', memoField('jm1_ActionDescription', 'Action Description')],
  ['jm1_actiontype', stringField('jm1_ActionType', 'Action Type', 200, 'ApplicationRequired')],
  ['jm1_agentname', stringField('jm1_AgentName', 'Agent Name', 200)],
  ['jm1_agentmodel', stringField('jm1_AgentModel', 'Agent Model', 200)],
  ['jm1_bandlevel', picklistField('jm1_BandLevel', 'Band Level', ['System', 'Automation', 'Human', 'External Provider'])],
  ['jm1_executionstatus', picklistField('jm1_ExecutionStatus', 'Execution Status', ['Pending', 'Succeeded', 'Failed', 'Skipped', 'Manual Review Required'])],
  ['jm1_startedon', dateTimeField('jm1_StartedOn', 'Started On')],
  ['jm1_completedon', dateTimeField('jm1_CompletedOn', 'Completed On')],
  ['jm1_sourceentity', stringField('jm1_SourceEntity', 'Source Entity', 200)],
  ['jm1_sourcerecordid', stringField('jm1_SourceRecordId', 'Source Record ID', 200)],
  ['jm1_errordetail', memoField('jm1_ErrorDetail', 'Error Detail')],
  ['jm1_approvaltimestamp', dateTimeField('jm1_ApprovalTimestamp', 'Approval Timestamp')],
]) {
  await ensureAttribute('jm1_executionlog', { logicalName: field[0], metadata: field[1] });
}

await ensureLookup({
  referencingEntity: 'jm1_executionlog',
  referencedEntity: 'systemuser',
  schemaName: 'jm1_HumanApprovedBy',
  displayName: 'Human Approved By',
  relationshipSchemaName: 'jm1_systemuser_executionlog_humanapprovedby',
});

for (const field of [
  ['jm1pub_certifiedimprint', picklistField('jm1pub_CertifiedImprint', 'Certified Imprint', ['J Merrill Publishing', 'JM Works', 'JM Little', 'JM Verse', 'JM Signature'])],
  ['jm1pub_assetregistrystatus', picklistField('jm1pub_AssetRegistryStatus', 'Asset Registry Status', ['Not Started', 'Staged', 'Partially Reconciled', 'Reconciled', 'Exception'])],
  ['jm1pub_assetregistrylastverifiedon', dateTimeField('jm1pub_AssetRegistryLastVerifiedOn', 'Asset Registry Last Verified On')],
]) {
  await ensureAttribute('jm1pub_title', { logicalName: field[0], metadata: field[1] });
}

await ensureLookup({
  referencingEntity: 'jm1pub_publishingasset',
  referencedEntity: 'jm1pub_title',
  schemaName: 'jm1pub_TitleId',
  displayName: 'Title',
  relationshipSchemaName: 'jm1pub_title_publishingasset',
  requiredLevel: 'ApplicationRequired',
});

await ensureLookup({
  referencingEntity: 'jm1pub_publishingasset',
  referencedEntity: 'jm1pub_contract',
  schemaName: 'jm1pub_ContractId',
  displayName: 'Contract',
  relationshipSchemaName: 'jm1pub_contract_publishingasset',
});

for (const field of [
  ['jm1pub_assetformat', picklistField('jm1pub_AssetFormat', 'Asset Format', ['Paperback', 'Hardcover', 'eBook', 'Audiobook', 'Large Print', 'Workbook', 'Other'], 'ApplicationRequired')],
  ['jm1pub_editionlabel', stringField('jm1pub_EditionLabel', 'Edition Label', 200)],
  ['jm1pub_iscurrentedition', boolField('jm1pub_IsCurrentEdition', 'Is Current Edition')],
  ['jm1pub_isbn13', stringField('jm1pub_Isbn13', 'ISBN-13', 20)],
  ['jm1pub_normalizedisbn', stringField('jm1pub_NormalizedIsbn', 'Normalized ISBN', 20)],
  ['jm1pub_asin', stringField('jm1pub_Asin', 'ASIN', 50)],
  ['jm1pub_acxproductid', stringField('jm1pub_AcxProductId', 'ACX Product ID', 100)],
  ['jm1pub_lsiid', stringField('jm1pub_LsiId', 'LSI/Ingram ID', 100)],
  ['jm1pub_coresourceid', stringField('jm1pub_CoreSourceId', 'CoreSource ID', 100)],
  ['jm1pub_publicationdate', dateOnlyField('jm1pub_PublicationDate', 'Publication Date')],
  ['jm1pub_retailprice', moneyField('jm1pub_RetailPrice', 'Retail Price')],
  ['jm1pub_currency', stringField('jm1pub_Currency', 'Currency', 3)],
  ['jm1pub_tradediscount', decimalField('jm1pub_TradeDiscount', 'Trade Discount', 2)],
  ['jm1pub_returnable', boolField('jm1pub_Returnable', 'Returnable')],
  ['jm1pub_distributionstatus', picklistField('jm1pub_DistributionStatus', 'Distribution Status', ['Draft', 'Active', 'Suspended', 'Retired', 'Unknown'])],
  ['jm1pub_assetstatus', picklistField('jm1pub_AssetStatus', 'Asset Status', ['Staged', 'In Production', 'Live', 'Backlist', 'Retired', 'Exception'])],
  ['jm1pub_metadatastatus', picklistField('jm1pub_MetadataStatus', 'Metadata Status', ['Incomplete', 'Complete', 'Verified', 'Exception'])],
  ['jm1pub_filepackagereference', stringField('jm1pub_FilePackageReference', 'File Package Reference', 1000)],
  ['jm1pub_coverfilereference', stringField('jm1pub_CoverFileReference', 'Cover File Reference', 1000)],
  ['jm1pub_interiorfilereference', stringField('jm1pub_InteriorFileReference', 'Interior File Reference', 1000)],
  ['jm1pub_audiofilereference', stringField('jm1pub_AudioFileReference', 'Audio File Reference', 1000)],
  ['jm1pub_evidencesource', stringField('jm1pub_EvidenceSource', 'Evidence Source', 200)],
  ['jm1pub_evidencepath', stringField('jm1pub_EvidencePath', 'Evidence Path', 1000)],
  ['jm1pub_lastverifiedon', dateTimeField('jm1pub_LastVerifiedOn', 'Last Verified On')],
  ['jm1pub_assethealthscore', integerField('jm1pub_AssetHealthScore', 'Asset Health Score')],
  ['jm1pub_assethealthstatus', picklistField('jm1pub_AssetHealthStatus', 'Asset Health Status', ['Healthy', 'Needs Review', 'Incomplete', 'Blocked'])],
  ['jm1pub_exceptionreason', memoField('jm1pub_ExceptionReason', 'Exception Reason')],
]) {
  await ensureAttribute('jm1pub_publishingasset', { logicalName: field[0], metadata: field[1] });
}

await ensureLookup({
  referencingEntity: 'jm1pub_assetmarketplace',
  referencedEntity: 'jm1pub_publishingasset',
  schemaName: 'jm1pub_PublishingAssetId',
  displayName: 'Publishing Asset',
  relationshipSchemaName: 'jm1pub_publishingasset_assetmarketplace',
  requiredLevel: 'ApplicationRequired',
});

for (const field of [
  ['jm1pub_marketplace', picklistField('jm1pub_Marketplace', 'Marketplace', ['Ingram Content', 'Amazon KDP', 'ACX', 'Apple Books', 'Barnes & Noble', 'Kobo', 'Google Play', 'Other'], 'ApplicationRequired')],
  ['jm1pub_marketplacestatus', picklistField('jm1pub_MarketplaceStatus', 'Marketplace Status', ['Live', 'Pending', 'Suspended', 'Not Listed', 'Unknown', 'Exception'])],
  ['jm1pub_marketplaceidentifier', stringField('jm1pub_MarketplaceIdentifier', 'Marketplace Identifier', 200)],
  ['jm1pub_listingurl', stringField('jm1pub_ListingUrl', 'Listing URL', 1000)],
  ['jm1pub_listedprice', moneyField('jm1pub_ListedPrice', 'Listed Price')],
  ['jm1pub_currency', stringField('jm1pub_Currency', 'Currency', 3)],
  ['jm1pub_lastverifiedon', dateTimeField('jm1pub_LastVerifiedOn', 'Last Verified On')],
  ['jm1pub_evidencesource', stringField('jm1pub_EvidenceSource', 'Evidence Source', 200)],
  ['jm1pub_exceptionreason', memoField('jm1pub_ExceptionReason', 'Exception Reason')],
]) {
  await ensureAttribute('jm1pub_assetmarketplace', { logicalName: field[0], metadata: field[1] });
}

await publish();

mkdirSync(evidencePath.split('/').slice(0, -1).join('/'), { recursive: true });
writeFileSync(
  evidencePath,
  `${JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      apiBase,
      solutionUniqueName,
      actions,
    },
    null,
    2,
  )}\n`,
);

console.log(JSON.stringify({ generatedAt: new Date().toISOString(), actions }, null, 2));
