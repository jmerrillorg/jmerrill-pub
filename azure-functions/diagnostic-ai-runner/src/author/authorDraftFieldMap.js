"use strict";

/**
 * Dataverse field map for internal author-response drafts.
 *
 * These logical names define the required schema target for safe draft
 * persistence. They do not send email, create send events, create
 * Opportunities, activate Flow D, run diagnostics, or open execution gates.
 */

const {
  TEMPLATE_NAME,
  INTERNAL_VISIBILITY_MAILBOX,
  DRAFT_STATUS,
  DRAFT_APPROVAL_STATUS
} = require("./authorResponseDraftBuilder");

const TABLE_LOGICAL_NAME = "jm1pub_editorialdiagnostic";
const ENTITY_SET = "jm1pub_editorialdiagnostics";
const ROW_IDENTITY = "jm1pub_editorialdiagnosticid";

const AUTHOR_DRAFT_FIELD_MAP = Object.freeze({
  draftSubject: "jm1_authordraftsubject",
  draftBody: "jm1_authordraftbody",
  draftTemplate: "jm1_authordrafttemplate",
  draftSendStatus: "jm1_authordraftsendstatus",
  draftApprovalStatus: "jm1_authordraftapprovalstatus",
  internalVisibilityMailbox: "jm1_authorvisibilitymailbox",
  futureSendRequiresInternalCopy: "jm1_authorfuturesendrequiresinternalcopy",
  futureSendRequiresDataverseLog: "jm1_authorfuturesendrequiresdataverselog",
  draftPreparedAt: "jm1_authordraftpreparedon",
  draftPreparedBy: "jm1_authordraftpreparedby",
  draftApprovedBy: "jm1_authordraftapprovedby",
  draftApprovedOn: "jm1_authordraftapprovedon",
  draftApprovalNotes: "jm1_authordraftapprovalnotes"
});

const AUTHOR_DRAFT_SAFE_VALUES = Object.freeze({
  templateName: TEMPLATE_NAME,
  sendStatus: DRAFT_STATUS,
  approvalStatus: DRAFT_APPROVAL_STATUS,
  internalVisibilityMailbox: INTERNAL_VISIBILITY_MAILBOX,
  futureSendRequiresInternalCopy: true,
  futureSendRequiresDataverseLog: true
});

const AUTHOR_DRAFT_UNMAPPED_UNSAFE_FIELDS = Object.freeze([
  "manuscriptText",
  "manuscriptContent",
  "extractedManuscriptContent",
  "extractedContent",
  "promptBody",
  "rawPrompt",
  "rawModelOutput",
  "rawModelResponse",
  "sendNow",
  "sendImmediately",
  "sentAt",
  "emailSent",
  "mailSent",
  "deliveryStatus",
  "mailProviderMessageId",
  "messageId",
  "operationId",
  "opportunityId",
  "opportunityPayload",
  "opportunityCreate",
  "createOpportunity",
  "flowDTrigger",
  "activateFlowD",
  "flowDActivation",
  "headers",
  "tokens",
  "apiKey",
  "secret"
]);

module.exports = {
  TABLE_LOGICAL_NAME,
  ENTITY_SET,
  ROW_IDENTITY,
  AUTHOR_DRAFT_FIELD_MAP,
  AUTHOR_DRAFT_SAFE_VALUES,
  AUTHOR_DRAFT_UNMAPPED_UNSAFE_FIELDS
};
