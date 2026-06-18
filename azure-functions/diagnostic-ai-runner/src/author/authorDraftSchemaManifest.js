"use strict";

/**
 * Required Dataverse schema manifest for internal author-response drafts.
 *
 * This manifest documents the columns that must exist before live author-draft
 * persistence can be enabled. It does not create columns, write data, send
 * email, create Opportunities, activate Flow D, run diagnostics, or open gates.
 */

const {
  TABLE_LOGICAL_NAME,
  ENTITY_SET,
  ROW_IDENTITY,
  AUTHOR_DRAFT_FIELD_MAP,
  AUTHOR_DRAFT_SAFE_VALUES,
  AUTHOR_DRAFT_UNMAPPED_UNSAFE_FIELDS
} = require("./authorDraftFieldMap");

const SCHEMA_STATUS = "CONFIRMED_CREATED_PUBLISHED";

const AUTHOR_DRAFT_SCHEMA_FIELDS = Object.freeze([
  {
    payloadField: "draftSubject",
    logicalName: AUTHOR_DRAFT_FIELD_MAP.draftSubject,
    displayName: "Author Draft Subject",
    expectedType: "Text",
    confirmedCreated: true
  },
  {
    payloadField: "draftBody",
    logicalName: AUTHOR_DRAFT_FIELD_MAP.draftBody,
    displayName: "Author Draft Body",
    expectedType: "Multiline Text",
    confirmedCreated: true
  },
  {
    payloadField: "templateName",
    logicalName: AUTHOR_DRAFT_FIELD_MAP.draftTemplate,
    displayName: "Author Draft Template",
    expectedType: "Text or Choice",
    confirmedCreated: true,
    allowedValue: AUTHOR_DRAFT_SAFE_VALUES.templateName
  },
  {
    payloadField: "sendStatus",
    logicalName: AUTHOR_DRAFT_FIELD_MAP.draftSendStatus,
    displayName: "Author Draft Send Status",
    expectedType: "Choice or Text",
    confirmedCreated: true,
    allowedValue: AUTHOR_DRAFT_SAFE_VALUES.sendStatus
  },
  {
    payloadField: "approvalStatus",
    logicalName: AUTHOR_DRAFT_FIELD_MAP.draftApprovalStatus,
    displayName: "Author Draft Approval Status",
    expectedType: "Choice or Text",
    confirmedCreated: true,
    allowedValue: AUTHOR_DRAFT_SAFE_VALUES.approvalStatus
  },
  {
    payloadField: "internalVisibilityMailbox",
    logicalName: AUTHOR_DRAFT_FIELD_MAP.internalVisibilityMailbox,
    displayName: "Author Visibility Mailbox",
    expectedType: "Text",
    confirmedCreated: true,
    requiredValue: AUTHOR_DRAFT_SAFE_VALUES.internalVisibilityMailbox
  },
  {
    payloadField: "futureSendRequiresInternalCopy",
    logicalName: AUTHOR_DRAFT_FIELD_MAP.futureSendRequiresInternalCopy,
    displayName: "Author Future Send Requires Internal Copy",
    expectedType: "Yes/No",
    confirmedCreated: true,
    requiredValue: AUTHOR_DRAFT_SAFE_VALUES.futureSendRequiresInternalCopy
  },
  {
    payloadField: "futureSendRequiresDataverseLog",
    logicalName: AUTHOR_DRAFT_FIELD_MAP.futureSendRequiresDataverseLog,
    displayName: "Author Future Send Requires Dataverse Log",
    expectedType: "Yes/No",
    confirmedCreated: true,
    requiredValue: AUTHOR_DRAFT_SAFE_VALUES.futureSendRequiresDataverseLog
  },
  {
    payloadField: "preparedAt",
    logicalName: AUTHOR_DRAFT_FIELD_MAP.draftPreparedAt,
    displayName: "Author Draft Prepared On",
    expectedType: "Date/Time",
    confirmedCreated: true
  },
  {
    payloadField: "preparedBy",
    logicalName: AUTHOR_DRAFT_FIELD_MAP.draftPreparedBy,
    displayName: "Author Draft Prepared By",
    expectedType: "Text or Lookup/User reference",
    confirmedCreated: true
  },
  {
    payloadField: "approvedBy",
    logicalName: AUTHOR_DRAFT_FIELD_MAP.draftApprovedBy,
    displayName: "Author Draft Approved By",
    expectedType: "Text or Lookup/User reference",
    confirmedCreated: true
  },
  {
    payloadField: "approvedOn",
    logicalName: AUTHOR_DRAFT_FIELD_MAP.draftApprovedOn,
    displayName: "Author Draft Approved On",
    expectedType: "Date/Time",
    confirmedCreated: true
  },
  {
    payloadField: "approvalNotes",
    logicalName: AUTHOR_DRAFT_FIELD_MAP.draftApprovalNotes,
    displayName: "Author Draft Approval Notes",
    expectedType: "Multiline Text",
    confirmedCreated: true
  }
]);

const AUTHOR_DRAFT_SCHEMA_MANIFEST = Object.freeze({
  status: SCHEMA_STATUS,
  tableLogicalName: TABLE_LOGICAL_NAME,
  entitySet: ENTITY_SET,
  rowIdentity: ROW_IDENTITY,
  fields: AUTHOR_DRAFT_SCHEMA_FIELDS,
  safeValues: AUTHOR_DRAFT_SAFE_VALUES,
  unsafeFieldsExcluded: AUTHOR_DRAFT_UNMAPPED_UNSAFE_FIELDS,
  liveWritesEnabled: true,
  liveWritesScope: "INTERNAL_DRAFT_ONLY_EXPLICIT_CALL",
  solutionUniqueName: "JM1_Publishing",
  sendsEmail: false,
  createsOpportunity: false,
  activatesFlowD: false,
  runsDiagnostics: false,
  opensExecutionGate: false
});

module.exports = {
  SCHEMA_STATUS,
  AUTHOR_DRAFT_SCHEMA_FIELDS,
  AUTHOR_DRAFT_SCHEMA_MANIFEST
};
