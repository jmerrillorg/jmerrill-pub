#!/usr/bin/env node

import { execFileSync } from 'node:child_process'
import process from 'node:process'

const CORE_URL = (process.env.DATAVERSE_RESOURCE_URL || 'https://jm1hq.crm.dynamics.com').replace(/\/+$/, '')
const API_BASE = `${CORE_URL}/api/data/v9.2`
const SOLUTION_UNIQUE_NAME = process.env.PROGRAM003_SOLUTION_UNIQUE_NAME || 'JM1_Publishing'
const LCID = 1033

const GLOBAL_OPTION_SETS = [
  optionSet('jm1pub_editorialartifacttype', 'Editorial Artifact Type', [
    'Manuscript Review Copy',
    'Editorial Review Summary',
    'Recommendation Letter',
    'Developmental Edit Package',
    'Developmental Guidance',
    'Line Edit Package',
    'Copyedit Package',
    'Style Sheet',
    'Proof Package',
    'Cover Approval Package',
    'Layout Approval Package',
    'Production Approval Package',
    'Release Approval Package',
    'Approval Evidence',
    'Publisher Review Evidence',
    'Exception Evidence',
    'Meeting Notes',
    'Revision Upload',
    'Internal Notes Package',
  ]),
  optionSet('jm1pub_editorialartifactvisibility', 'Editorial Artifact Visibility', [
    'Author Facing',
    'Internal Only',
    'Publisher Only',
    'Shared Controlled',
  ]),
  optionSet('jm1pub_editorialartifactstatus', 'Editorial Artifact Status', [
    'Draft',
    'Ready for Review',
    'Delivered',
    'Approved',
    'Returned',
    'Superseded',
    'Archived',
  ]),
  optionSet('jm1pub_editorialgatedomain', 'Editorial Gate Domain', [
    'Editorial',
    'Production',
    'Publication',
  ]),
  optionSet('jm1pub_editorialgatecode', 'Editorial Gate Code', [
    'A1 Editorial Review Acceptance',
    'A2 Developmental Completion',
    'A3 Line Editing Completion',
    'A4 Copyediting Completion',
    'A5 Proofreading Completion',
    'A6 Cover Design Approval',
    'A7 Interior Layout Approval',
    'A8 Production Approval',
    'A9 Distribution Release Approval',
  ]),
  optionSet('jm1pub_editorialgatestatus', 'Editorial Gate Status', [
    'Not Ready',
    'Ready for Author Review',
    'Awaiting Author Response',
    'Approved',
    'Returned for Revision',
    'Held',
    'Publisher Override',
    'Cancelled',
  ]),
  optionSet('jm1pub_editorialdecision', 'Editorial Decision', [
    'Approve',
    'Request Revision',
    'Request Clarification',
    'Hold',
    'Decline',
    'Override Approved',
  ]),
  optionSet('jm1pub_editorialexceptiontype', 'Editorial Exception Type', [
    'Rights Issue',
    'Legal Risk',
    'Ethics Issue',
    'Sensitivity Review',
    'Plagiarism Attribution Concern',
    'Missing Evidence',
    'Missing Author Response',
    'Voice Preservation Conflict',
    'Publisher Review Required',
    'Co-Development Path',
    'Repository Link Failure',
    'PAM Linkage Failure',
    'Other',
  ]),
  optionSet('jm1pub_editorialexceptionseverity', 'Editorial Exception Severity', [
    'Low',
    'Moderate',
    'High',
    'Critical',
  ]),
  optionSet('jm1pub_editorialexceptionstatus', 'Editorial Exception Status', [
    'Open',
    'Investigating',
    'Awaiting Publisher',
    'Awaiting Author',
    'Resolved',
    'Closed',
  ]),
  optionSet('jm1pub_editorialsummarytype', 'Editorial Summary Type', [
    'Author Safe Current',
    'Author Safe Historical',
    'Internal Operational',
    'Publisher Review',
  ]),
  optionSet('jm1pub_editorialsummarystatus', 'Editorial Summary Status', [
    'Draft',
    'Ready',
    'Published to Workspace',
    'Superseded',
  ]),
  optionSet('jm1pub_editorialhealthstatus', 'Editorial Health Status', [
    'Healthy',
    'Watch',
    'At Risk',
    'Blocked',
  ]),
]

const ENTITIES = [
  entity('jm1pub_editorialartifact', 'Editorial Artifact', 'Editorial Artifacts', 'OrganizationOwned'),
  entity('jm1pub_editorialapprovalgate', 'Editorial Approval Gate', 'Editorial Approval Gates', 'OrganizationOwned'),
  entity('jm1pub_editorialsummary', 'Editorial Summary', 'Editorial Summaries', 'OrganizationOwned'),
  entity('jm1pub_editorialexception', 'Editorial Exception', 'Editorial Exceptions', 'OrganizationOwned'),
]

const ATTRIBUTE_PLANS = {
  jm1pub_editorialstage: [
    whole('jm1pub_stagesequence', 'Stage Sequence'),
    text('jm1pub_correlationid', 'Correlation ID', 100),
    text('jm1pub_governingstyleguide', 'Governing Style Guide', 100),
    memo('jm1pub_overlayprofile', 'Overlay Profile', 500),
    bool('jm1pub_exceptionpresent', 'Exception Present'),
    bool('jm1pub_publisherreviewrequired', 'Publisher Review Required'),
    bool('jm1pub_codevelopmentpath', 'Co-Development Path'),
    whole('jm1pub_currentartifactcount', 'Current Artifact Count'),
    whole('jm1pub_currentgatecount', 'Current Gate Count'),
    whole('jm1pub_openexceptioncount', 'Open Exception Count'),
    choice('jm1pub_healthstatus', 'Health Status', 'jm1pub_editorialhealthstatus'),
    memo('jm1pub_authorsafesummary', 'Author Safe Summary', 4000),
    memo('jm1pub_internaloperationalsummary', 'Internal Operational Summary', 4000),
  ],
  jm1pub_editorialartifact: [
    choice('jm1pub_artifacttype', 'Artifact Type', 'jm1pub_editorialartifacttype'),
    choice('jm1pub_visibility', 'Visibility', 'jm1pub_editorialartifactvisibility'),
    choice('jm1pub_artifactstatus', 'Artifact Status', 'jm1pub_editorialartifactstatus'),
    bool('jm1pub_iscurrentapproved', 'Current Approved Artifact'),
    text('jm1pub_repositorysiteid', 'Repository Site ID', 200),
    text('jm1pub_repositorydriveid', 'Repository Drive ID', 200),
    text('jm1pub_repositoryitemid', 'Repository Item ID', 200),
    text('jm1pub_repositorypath', 'Repository Path', 500),
    text('jm1pub_filename', 'File Name', 255),
    text('jm1pub_fileextension', 'File Extension', 20),
    bigint('jm1pub_filesizebytes', 'File Size Bytes'),
    text('jm1pub_sha256', 'SHA256', 64),
    text('jm1pub_versionlabel', 'Version Label', 100),
    datetime('jm1pub_deliveredon', 'Delivered On'),
    datetime('jm1pub_approvedon', 'Approved On'),
    datetime('jm1pub_supersededon', 'Superseded On'),
    datetime('jm1pub_authorvisiblefrom', 'Author Visible From'),
    memo('jm1pub_notes', 'Notes', 2000),
    text('jm1pub_correlationid', 'Correlation ID', 100),
  ],
  jm1pub_editorialapprovalgate: [
    choice('jm1pub_gatedomain', 'Gate Domain', 'jm1pub_editorialgatedomain'),
    choice('jm1pub_gatecode', 'Gate Code', 'jm1pub_editorialgatecode'),
    choice('jm1pub_gatestatus', 'Gate Status', 'jm1pub_editorialgatestatus'),
    choice('jm1pub_authordecision', 'Author Decision', 'jm1pub_editorialdecision'),
    datetime('jm1pub_authordecisionon', 'Author Decision On'),
    text('jm1pub_authordecisionsource', 'Author Decision Source', 100),
    memo('jm1pub_authorresponsesummary', 'Author Response Summary', 2000),
    bool('jm1pub_nextstageauthorized', 'Next Stage Authorized'),
    datetime('jm1pub_nextstageauthorizedon', 'Next Stage Authorized On'),
    bool('jm1pub_publishoverrideapplied', 'Publisher Override Applied'),
    memo('jm1pub_publishoverridereason', 'Publisher Override Reason', 2000),
    datetime('jm1pub_publishoverrideon', 'Publisher Override On'),
    datetime('jm1pub_awaitingsince', 'Awaiting Since'),
    text('jm1pub_correlationid', 'Correlation ID', 100),
  ],
  jm1pub_editorialsummary: [
    choice('jm1pub_summarytype', 'Summary Type', 'jm1pub_editorialsummarytype'),
    choice('jm1pub_summarystatus', 'Summary Status', 'jm1pub_editorialsummarystatus'),
    text('jm1pub_summaryheadline', 'Summary Headline', 200),
    memo('jm1pub_summarybody', 'Summary Body', 4000),
    text('jm1pub_nextactionlabel', 'Next Action Label', 200),
    datetime('jm1pub_nextactiondueon', 'Next Action Due On'),
    datetime('jm1pub_publishedtoworkspaceon', 'Published to Workspace On'),
    bool('jm1pub_approvedbyhuman', 'Approved By Human'),
    datetime('jm1pub_approvedon', 'Approved On'),
    text('jm1pub_correlationid', 'Correlation ID', 100),
  ],
  jm1pub_editorialexception: [
    choice('jm1pub_exceptiontype', 'Exception Type', 'jm1pub_editorialexceptiontype'),
    choice('jm1pub_severity', 'Severity', 'jm1pub_editorialexceptionseverity'),
    choice('jm1pub_status', 'Status', 'jm1pub_editorialexceptionstatus'),
    datetime('jm1pub_openedon', 'Opened On'),
    bool('jm1pub_publisherreviewrequired', 'Publisher Review Required'),
    bool('jm1pub_authorresponserequired', 'Author Response Required'),
    memo('jm1pub_exceptionsummary', 'Exception Summary', 4000),
    memo('jm1pub_resolutionsummary', 'Resolution Summary', 4000),
    datetime('jm1pub_resolvedon', 'Resolved On'),
    datetime('jm1pub_closedon', 'Closed On'),
    text('jm1pub_correlationid', 'Correlation ID', 100),
  ],
}

const RELATIONSHIPS = [
  rel('jm1pub_editorialstage', 'jm1pub_publishingasset', 'jm1pub_publishingassetid', 'jm1pub_PublishingAsset_EditorialStages', 'Publishing Asset'),
  rel('jm1pub_editorialstage', 'jm1pub_title', 'jm1pub_titleid', 'jm1pub_Title_EditorialStages', 'Title'),
  rel('jm1pub_editorialstage', 'contact', 'jm1pub_contactid', 'jm1pub_Contact_EditorialStages', 'Author Contact'),
  rel('jm1pub_editorialstage', 'jm1pub_contract', 'jm1pub_contractid', 'jm1pub_Contract_EditorialStages', 'Contract'),
  rel('jm1pub_editorialstage', 'systemuser', 'jm1pub_assignededitorid', 'jm1pub_SystemUser_EditorialStageAssignedEditor', 'Assigned Editor'),
  rel('jm1pub_editorialstage', 'team', 'jm1pub_assignedteamid', 'jm1pub_Team_EditorialStageAssignedTeam', 'Assigned Team'),

  rel('jm1pub_editorialartifact', 'jm1pub_publishingasset', 'jm1pub_publishingassetid', 'jm1pub_PublishingAsset_EditorialArtifacts', 'Publishing Asset'),
  rel('jm1pub_editorialartifact', 'jm1pub_title', 'jm1pub_titleid', 'jm1pub_Title_EditorialArtifacts', 'Title'),
  rel('jm1pub_editorialartifact', 'jm1pub_editorialstage', 'jm1pub_editorialstageid', 'jm1pub_EditorialStage_Artifacts', 'Editorial Stage'),
  rel('jm1pub_editorialartifact', 'jm1pub_editorialapprovalgate', 'jm1pub_editorialapprovalgateid', 'jm1pub_EditorialApprovalGate_Artifacts', 'Approval Gate'),

  rel('jm1pub_editorialapprovalgate', 'jm1pub_publishingasset', 'jm1pub_publishingassetid', 'jm1pub_PublishingAsset_EditorialApprovalGates', 'Publishing Asset'),
  rel('jm1pub_editorialapprovalgate', 'jm1pub_title', 'jm1pub_titleid', 'jm1pub_Title_EditorialApprovalGates', 'Title'),
  rel('jm1pub_editorialapprovalgate', 'jm1pub_editorialstage', 'jm1pub_editorialstageid', 'jm1pub_EditorialStage_ApprovalGates', 'Editorial Stage'),
  rel('jm1pub_editorialapprovalgate', 'jm1pub_editorialartifact', 'jm1pub_deliverableartifactid', 'jm1pub_EditorialArtifact_DeliverableApprovalGates', 'Deliverable Artifact'),
  rel('jm1pub_editorialapprovalgate', 'jm1pub_editorialartifact', 'jm1pub_approvalevidenceartifactid', 'jm1pub_EditorialArtifact_ApprovalEvidenceGates', 'Approval Evidence Artifact'),
  rel('jm1pub_editorialapprovalgate', 'systemuser', 'jm1pub_publishoverridebyid', 'jm1pub_SystemUser_EditorialGatePublisherOverride', 'Publisher Override By'),

  rel('jm1pub_editorialsummary', 'jm1pub_publishingasset', 'jm1pub_publishingassetid', 'jm1pub_PublishingAsset_EditorialSummaries', 'Publishing Asset'),
  rel('jm1pub_editorialsummary', 'jm1pub_title', 'jm1pub_titleid', 'jm1pub_Title_EditorialSummaries', 'Title'),
  rel('jm1pub_editorialsummary', 'jm1pub_editorialstage', 'jm1pub_editorialstageid', 'jm1pub_EditorialStage_Summaries', 'Editorial Stage'),
  rel('jm1pub_editorialsummary', 'jm1pub_editorialapprovalgate', 'jm1pub_editorialapprovalgateid', 'jm1pub_EditorialApprovalGate_Summaries', 'Approval Gate'),
  rel('jm1pub_editorialsummary', 'systemuser', 'jm1pub_approvedbyid', 'jm1pub_SystemUser_EditorialSummaryApprovedBy', 'Approved By'),
  rel('jm1pub_editorialsummary', 'jm1pub_editorialartifact', 'jm1pub_sourceartifactid', 'jm1pub_EditorialArtifact_SourceSummaries', 'Source Artifact'),

  rel('jm1pub_editorialexception', 'jm1pub_publishingasset', 'jm1pub_publishingassetid', 'jm1pub_PublishingAsset_EditorialExceptions', 'Publishing Asset'),
  rel('jm1pub_editorialexception', 'jm1pub_title', 'jm1pub_titleid', 'jm1pub_Title_EditorialExceptions', 'Title'),
  rel('jm1pub_editorialexception', 'jm1pub_editorialstage', 'jm1pub_editorialstageid', 'jm1pub_EditorialStage_Exceptions', 'Editorial Stage'),
  rel('jm1pub_editorialexception', 'jm1pub_editorialapprovalgate', 'jm1pub_editorialapprovalgateid', 'jm1pub_EditorialApprovalGate_Exceptions', 'Approval Gate'),
  rel('jm1pub_editorialexception', 'systemuser', 'jm1pub_openedbyid', 'jm1pub_SystemUser_EditorialExceptionOpenedBy', 'Opened By'),
  rel('jm1pub_editorialexception', 'systemuser', 'jm1pub_assignedownerid', 'jm1pub_SystemUser_EditorialExceptionAssignedOwner', 'Assigned Owner'),
  rel('jm1pub_editorialexception', 'jm1pub_editorialartifact', 'jm1pub_resolutionartifactid', 'jm1pub_EditorialArtifact_ResolutionExceptions', 'Resolution Artifact'),
]

async function main() {
  const token = getBearerToken(CORE_URL)

  console.log(`Activating PROGRAM-003 schema in ${CORE_URL}`)
  console.log(`Using solution: ${SOLUTION_UNIQUE_NAME}`)

  for (const set of GLOBAL_OPTION_SETS) {
    await ensureGlobalOptionSet(token, set)
  }

  for (const plan of ENTITIES) {
    await ensureEntity(token, plan)
  }

  for (const [entityName, attributes] of Object.entries(ATTRIBUTE_PLANS)) {
    for (const attribute of attributes) {
      await ensureAttribute(token, entityName, attribute)
    }
  }

  for (const relationship of RELATIONSHIPS) {
    await ensureRelationship(token, relationship)
  }

  await publishAll(token)
  console.log('PROGRAM-003 schema activation complete.')
}

function optionSet(name, displayName, labels) {
  return {
    name,
    payload: {
      '@odata.type': 'Microsoft.Dynamics.CRM.OptionSetMetadata',
      Name: name,
      OptionSetType: 'Picklist',
      DisplayName: label(displayName),
      Description: label(displayName),
      Options: labels.map((value) => ({
        Label: label(value),
      })),
    },
  }
}

function entity(logicalName, displayName, pluralName, ownershipType) {
  return {
    logicalName,
    displayName,
    pluralName,
    payload: {
      '@odata.type': 'Microsoft.Dynamics.CRM.EntityMetadata',
      SchemaName: toSchema(logicalName),
      DisplayName: label(displayName),
      DisplayCollectionName: label(pluralName),
      Description: label(displayName),
      OwnershipType: ownershipType,
      HasActivities: false,
      HasNotes: false,
      IsActivity: false,
      Attributes: [
        {
          '@odata.type': 'Microsoft.Dynamics.CRM.StringAttributeMetadata',
          AttributeType: 'String',
          AttributeTypeName: { Value: 'StringType' },
          SchemaName: `${toSchema(logicalName)}Name`,
          DisplayName: label('Name'),
          Description: label(`${displayName} name`),
          RequiredLevel: requiredLevel('None'),
          MaxLength: 200,
          FormatName: { Value: 'Text' },
          IsPrimaryName: true,
        },
      ],
    },
  }
}

function text(logicalName, displayName, maxLength) {
  return {
    logicalName,
    payload: {
      '@odata.type': 'Microsoft.Dynamics.CRM.StringAttributeMetadata',
      AttributeType: 'String',
      AttributeTypeName: { Value: 'StringType' },
      SchemaName: toSchema(logicalName),
      DisplayName: label(displayName),
      Description: label(displayName),
      RequiredLevel: requiredLevel('None'),
      MaxLength: maxLength,
      FormatName: { Value: 'Text' },
    },
  }
}

function memo(logicalName, displayName, maxLength) {
  return {
    logicalName,
    payload: {
      '@odata.type': 'Microsoft.Dynamics.CRM.MemoAttributeMetadata',
      AttributeType: 'Memo',
      AttributeTypeName: { Value: 'MemoType' },
      SchemaName: toSchema(logicalName),
      DisplayName: label(displayName),
      Description: label(displayName),
      RequiredLevel: requiredLevel('None'),
      MaxLength: maxLength,
      Format: 'TextArea',
    },
  }
}

function datetime(logicalName, displayName) {
  return {
    logicalName,
    payload: {
      '@odata.type': 'Microsoft.Dynamics.CRM.DateTimeAttributeMetadata',
      AttributeType: 'DateTime',
      AttributeTypeName: { Value: 'DateTimeType' },
      SchemaName: toSchema(logicalName),
      DisplayName: label(displayName),
      Description: label(displayName),
      RequiredLevel: requiredLevel('None'),
      Format: 'DateAndTime',
      ImeMode: 'Auto',
    },
  }
}

function bool(logicalName, displayName) {
  return {
    logicalName,
    payload: {
      '@odata.type': 'Microsoft.Dynamics.CRM.BooleanAttributeMetadata',
      AttributeType: 'Boolean',
      AttributeTypeName: { Value: 'BooleanType' },
      SchemaName: toSchema(logicalName),
      DisplayName: label(displayName),
      Description: label(displayName),
      RequiredLevel: requiredLevel('None'),
      OptionSet: {
        FalseOption: { Label: label('No') },
        TrueOption: { Label: label('Yes') },
      },
    },
  }
}

function whole(logicalName, displayName) {
  return {
    logicalName,
    payload: {
      '@odata.type': 'Microsoft.Dynamics.CRM.IntegerAttributeMetadata',
      AttributeType: 'Integer',
      AttributeTypeName: { Value: 'IntegerType' },
      SchemaName: toSchema(logicalName),
      DisplayName: label(displayName),
      Description: label(displayName),
      RequiredLevel: requiredLevel('None'),
      Format: 'None',
      MinValue: 0,
      MaxValue: 2147483647,
    },
  }
}

function bigint(logicalName, displayName) {
  return {
    logicalName,
    payload: {
      '@odata.type': 'Microsoft.Dynamics.CRM.BigIntAttributeMetadata',
      AttributeType: 'BigInt',
      AttributeTypeName: { Value: 'BigIntType' },
      SchemaName: toSchema(logicalName),
      DisplayName: label(displayName),
      Description: label(displayName),
      RequiredLevel: requiredLevel('None'),
    },
  }
}

function choice(logicalName, displayName, optionSetName) {
  return {
    logicalName,
    globalOptionSetName: optionSetName,
    payload: {
      '@odata.type': 'Microsoft.Dynamics.CRM.PicklistAttributeMetadata',
      AttributeType: 'Picklist',
      AttributeTypeName: { Value: 'PicklistType' },
      SourceTypeMask: 0,
      SchemaName: toSchema(logicalName),
      DisplayName: label(displayName),
      Description: label(displayName),
      RequiredLevel: requiredLevel('None'),
    },
  }
}

function rel(referencingEntity, referencedEntity, lookupLogicalName, schemaName, displayName) {
  const referencedAttribute = referencedEntity === 'contact'
    ? 'contactid'
    : referencedEntity === 'systemuser'
      ? 'systemuserid'
      : referencedEntity === 'team'
        ? 'teamid'
        : `${referencedEntity}id`
  return {
    referencingEntity,
    schemaName,
    payload: {
      '@odata.type': 'Microsoft.Dynamics.CRM.OneToManyRelationshipMetadata',
      SchemaName: schemaName,
      ReferencedEntity: referencedEntity,
      ReferencedAttribute: referencedAttribute,
      ReferencingEntity: referencingEntity,
      AssociatedMenuConfiguration: {
        Behavior: 'UseLabel',
        Group: 'Details',
        Label: label(displayName),
        Order: 10000,
        ViewId: '00000000-0000-0000-0000-000000000000',
      },
      CascadeConfiguration: {
        Assign: 'NoCascade',
        Delete: 'RemoveLink',
        Merge: 'NoCascade',
        Reparent: 'NoCascade',
        Share: 'NoCascade',
        Unshare: 'NoCascade',
        RollupView: 'NoCascade',
      },
      IsHierarchical: false,
      Lookup: {
        '@odata.type': 'Microsoft.Dynamics.CRM.LookupAttributeMetadata',
        AttributeType: 'Lookup',
        AttributeTypeName: { Value: 'LookupType' },
        SchemaName: toSchema(lookupLogicalName),
        DisplayName: label(displayName),
        Description: label(displayName),
        RequiredLevel: requiredLevel('None'),
      },
      RelationshipType: 'OneToManyRelationship',
      SecurityTypes: 'None',
    },
  }
}

async function ensureGlobalOptionSet(token, { name, payload }) {
  const found = await get(token, `/GlobalOptionSetDefinitions(Name='${name}')?$select=Name`)
  if (found.status === 200) {
    console.log(`option set exists: ${name}`)
    return
  }
  if (found.status !== 404) throw unexpected(found, `lookup option set ${name}`)
  console.log(`creating option set: ${name}`)
  await request(token, '/GlobalOptionSetDefinitions', { method: 'POST', body: payload })
}

async function ensureEntity(token, plan) {
  const found = await get(token, `/EntityDefinitions(LogicalName='${plan.logicalName}')?$select=LogicalName`)
  if (found.status === 200) {
    console.log(`entity exists: ${plan.logicalName}`)
    return
  }
  if (found.status !== 404) throw unexpected(found, `lookup entity ${plan.logicalName}`)
  console.log(`creating entity: ${plan.logicalName}`)
  await request(token, '/EntityDefinitions', { method: 'POST', body: plan.payload })
}

async function ensureAttribute(token, entityName, attribute) {
  const found = await get(
    token,
    `/EntityDefinitions(LogicalName='${entityName}')/Attributes(LogicalName='${attribute.logicalName}')?$select=LogicalName`,
  )
  if (found.status === 200) {
    console.log(`attribute exists: ${entityName}.${attribute.logicalName}`)
    return
  }
  if (found.status !== 404) throw unexpected(found, `lookup attribute ${entityName}.${attribute.logicalName}`)
  console.log(`creating attribute: ${entityName}.${attribute.logicalName}`)
  const payload = structuredClone(attribute.payload)
  if (attribute.globalOptionSetName) {
    const optionSet = await request(
      token,
      `/GlobalOptionSetDefinitions(Name='${attribute.globalOptionSetName}')?$select=MetadataId`,
      { method: 'GET' },
    )
    const metadataId = optionSet.json?.MetadataId
    if (!metadataId) {
      throw new Error(`global option set metadata missing for ${attribute.globalOptionSetName}`)
    }
    payload['GlobalOptionSet@odata.bind'] = `/GlobalOptionSetDefinitions(${metadataId})`
  }
  await request(
    token,
    `/EntityDefinitions(LogicalName='${entityName}')/Attributes`,
    { method: 'POST', body: payload },
  )
}

async function ensureRelationship(token, relationship) {
  const found = await get(
    token,
    `/RelationshipDefinitions(SchemaName='${relationship.schemaName}')?$select=SchemaName`,
  )
  if (found.status === 200) {
    console.log(`relationship exists: ${relationship.schemaName}`)
    return
  }
  if (found.status !== 404) throw unexpected(found, `lookup relationship ${relationship.schemaName}`)
  console.log(`creating relationship: ${relationship.schemaName}`)
  try {
    await request(token, '/RelationshipDefinitions', { method: 'POST', body: relationship.payload })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    if (message.includes('already exists for entity')) {
      console.log(`relationship attribute already exists, skipping: ${relationship.schemaName}`)
      return
    }
    throw error
  }
}

async function publishAll(token) {
  console.log('publishing customizations')
  await request(token, '/PublishAllXml', { method: 'POST', body: {} })
}

async function get(token, path) {
  return request(token, path, { method: 'GET', allow404: true })
}

async function request(token, path, { method, body, allow404 = false }) {
  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
      'Content-Type': 'application/json; charset=utf-8; IEEE754Compatible=true',
      'OData-MaxVersion': '4.0',
      'OData-Version': '4.0',
      'If-None-Match': 'null',
      'MSCRM.SolutionUniqueName': SOLUTION_UNIQUE_NAME,
    },
    body: body ? JSON.stringify(body) : undefined,
  })

  if (response.ok || (allow404 && response.status === 404)) {
    const text = await response.text()
    return {
      status: response.status,
      text,
      json: safeJson(text),
      headers: response.headers,
    }
  }

  const text = await response.text()
  throw new Error(`${method} ${path} failed (${response.status}): ${text}`)
}

function getBearerToken(resourceUrl) {
  return execFileSync(
    '/opt/homebrew/bin/az',
    ['account', 'get-access-token', '--resource', resourceUrl, '--query', 'accessToken', '-o', 'tsv'],
    { encoding: 'utf8' },
  ).trim()
}

function label(value) {
  return {
    '@odata.type': 'Microsoft.Dynamics.CRM.Label',
    LocalizedLabels: [
      {
        '@odata.type': 'Microsoft.Dynamics.CRM.LocalizedLabel',
        Label: value,
        LanguageCode: LCID,
      },
    ],
  }
}

function requiredLevel(value) {
  return {
    Value: value,
    CanBeChanged: true,
    ManagedPropertyLogicalName: 'canmodifyrequirementlevelsettings',
  }
}

function toSchema(logicalName) {
  return logicalName
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('_')
}

function safeJson(text) {
  if (!text) return null
  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}

function unexpected(result, action) {
  return new Error(`${action} returned ${result.status}: ${result.text}`)
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
