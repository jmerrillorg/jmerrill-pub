"use strict";

/**
 * Controlled commissioning processor for The Intentional Leader author response.
 *
 * Scope:
 * - Reads only the publishing@jmerrill.one mailbox thread for the allowlisted
 *   Editorial Recommendation Letter.
 * - Classifies Professional vs Starter package selection.
 * - Writes safe Dataverse execution-log evidence.
 * - Sends the pre-contract Author Workspace invitation through the existing
 *   ACS author-response provider only after the caller confirms that the
 *   author-specific portal access record has already been configured.
 *
 * It never creates payment links, invoices, contracts, SignNow packets,
 * Opportunities, production work, distribution submissions, royalties, or
 * Business Central postings.
 */

const { app } = require("@azure/functions");
const { readPublishingMailboxReply } = require("../mail/publishingMailboxReader");
const { classifyPackageReply } = require("../mail/publishingPackageReplyClassifier");
const { sendConfiguredAuthorResponse } = require("../author/authorResponseSendProviderConfig");
const { persistAuthorResponseSendLog } = require("../author/authorResponseSendPersister");
const { getDataverseToken } = require("../dataverse/authorDraftPersistenceClient");
const {
  AGENT_NAME,
  BAND_LEVEL,
  EXECUTION_STATUS,
  SOURCE_ENTITY
} = require("../dataverse/metadataWriter");
const { INTERNAL_VISIBILITY_MAILBOX } = require("../author/authorResponseDraftBuilder");

const DIAGNOSTIC_ID = "18cb5c53-6076-f111-ab0f-000d3a9eacee";
const INTAKE_REFERENCE_CODE = "JMP-INT-202607-0W5PTQ";
const SUBJECT_CONTAINS = "Editorial Recommendation Letter for The Intentional Leader";
const AFTER_ISO = "2026-07-04T19:05:00Z";
const PROJECT_TITLE = "The Intentional Leader";
const WORKSPACE_URL = "https://jmerrill.pub/author/portal";
const EXECUTION_LOG_ENTITY_SET = "jm1_executionlogs";

const EVENT_TYPE = Object.freeze({
  AUTHOR_RESPONSE_RECEIVED: "AUTHOR_RESPONSE_RECEIVED",
  PACKAGE_SELECTED: "PACKAGE_SELECTED",
  WORKSPACE_INVITATION_SENT: "WORKSPACE_INVITATION_SENT"
});

function safeTrim(value) {
  return typeof value === "string" ? value.trim() : "";
}

function verifyRunnerKey(request) {
  const expected = process.env.JM1_DIAGNOSTIC_RUNNER_KEY;
  const actual = request.headers.get("x-jm1-diagnostic-runner-key");
  return Boolean(expected && actual && actual === expected);
}

function unauthorized() {
  return { status: 401, jsonBody: { status: "error", code: "UNAUTHORIZED" } };
}

function blocked(reason, extra = {}) {
  return {
    ok: false,
    code: "INTENTIONAL_LEADER_AUTHOR_RESPONSE_BLOCKED",
    reason,
    diagnosticId: DIAGNOSTIC_ID,
    intakeReferenceCode: INTAKE_REFERENCE_CODE,
    ...extra
  };
}

function validTemporaryAccessCode(value) {
  const code = safeTrim(value);
  return /^[A-Z0-9-]{12,80}$/.test(code) && !/JMP-PKG-|Stripe|SignNow|invoice|payment/i.test(code);
}

async function dataverseGet(path, token) {
  const apiBase = process.env.DATAVERSE_WEB_API_BASE_URL;
  if (!apiBase) throw Object.assign(new Error("Dataverse API base missing"), { safeCode: "DATAVERSE_CONFIG_MISSING" });

  const response = await fetch(`${apiBase.replace(/\/$/, "")}/${path}`, {
    method: "GET",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Accept": "application/json",
      "OData-MaxVersion": "4.0",
      "OData-Version": "4.0"
    }
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw Object.assign(new Error(`Dataverse GET failed: HTTP ${response.status}`), {
      safeCode: "DATAVERSE_READ_FAILED",
      httpStatus: response.status
    });
  }
  return body;
}

async function dataversePatch(entitySet, id, payload, token) {
  const apiBase = process.env.DATAVERSE_WEB_API_BASE_URL;
  if (!apiBase) throw Object.assign(new Error("Dataverse API base missing"), { safeCode: "DATAVERSE_CONFIG_MISSING" });

  const response = await fetch(`${apiBase.replace(/\/$/, "")}/${entitySet}(${id})`, {
    method: "PATCH",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
      "OData-MaxVersion": "4.0",
      "OData-Version": "4.0",
      "Prefer": "return=representation"
    },
    body: JSON.stringify(payload)
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw Object.assign(new Error(`Dataverse PATCH failed: HTTP ${response.status}`), {
      safeCode: "DATAVERSE_WRITE_FAILED",
      httpStatus: response.status
    });
  }
  return body;
}

async function dataverseCreate(entitySet, payload, token) {
  const apiBase = process.env.DATAVERSE_WEB_API_BASE_URL;
  if (!apiBase) throw Object.assign(new Error("Dataverse API base missing"), { safeCode: "DATAVERSE_CONFIG_MISSING" });

  const response = await fetch(`${apiBase.replace(/\/$/, "")}/${entitySet}`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
      "OData-MaxVersion": "4.0",
      "OData-Version": "4.0",
      "Prefer": "return=representation"
    },
    body: JSON.stringify(payload)
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw Object.assign(new Error(`Dataverse POST failed: HTTP ${response.status}`), {
      safeCode: "DATAVERSE_WRITE_FAILED",
      httpStatus: response.status
    });
  }
  return body;
}

function createDataverseCreateClient(token) {
  return {
    async createRecord(entitySet, payload) {
      const result = await dataverseCreate(entitySet, payload, token);
      return { id: result.jm1_executionlogid || result.id || null };
    }
  };
}

async function readAuthorContext(token) {
  const diagnostic = await dataverseGet(
    `jm1pub_editorialdiagnostics(${DIAGNOSTIC_ID})?$select=jm1pub_name,jm1pub_recommendedpackage,jm1_m6alternatepackagecode,_jm1pub_publishingintake_value,_jm1pub_authorcontact_value`,
    token
  );
  const intakeId = diagnostic._jm1pub_publishingintake_value;
  const contactId = diagnostic._jm1pub_authorcontact_value;
  if (!intakeId || !contactId) {
    throw Object.assign(new Error("Diagnostic is missing intake/contact linkage"), { safeCode: "DIAGNOSTIC_CONTEXT_INCOMPLETE" });
  }

  const intake = await dataverseGet(
    `jm1_publishingintakes(${intakeId})?$select=jm1_intakereferencecode,jm1_projecttitle,jm1_sharepointworkspaceurl,jm1_workspacestatus`,
    token
  );
  const contact = await dataverseGet(
    `contacts(${contactId})?$select=fullname,firstname,emailaddress1`,
    token
  );
  if (safeTrim(intake.jm1_intakereferencecode).toUpperCase() !== INTAKE_REFERENCE_CODE) {
    throw Object.assign(new Error("Intake reference mismatch"), { safeCode: "INTAKE_REFERENCE_MISMATCH" });
  }

  return { diagnostic, intake, contact, intakeId, contactId };
}

function buildExecutionLogPayload({
  eventType,
  classification,
  selectedPackage,
  authorEmail,
  receivedDateTime,
  completedAt
}) {
  const description = [
    `${eventType} for intake ${INTAKE_REFERENCE_CODE}.`,
    `Project ${PROJECT_TITLE}.`,
    `Classification ${classification || "none"}.`,
    selectedPackage ? `Selected package ${selectedPackage.name} (${selectedPackage.code}) at ${selectedPackage.price}.` : "No package selected.",
    receivedDateTime ? `Reply received ${receivedDateTime}.` : null,
    authorEmail ? `Author email ${authorEmail}.` : null,
    "Workflow status moved to Workspace Ready / Pre-Contract when package selection is present.",
    "No raw email body, manuscript text, prompt body, raw model output, headers, tokens, secrets, payment links, Stripe, invoices, SignNow links, contracts, Opportunity creation, Business Central posting, royalty action, production, distribution, launch, marketing, or workspace movement occurred."
  ].filter(Boolean).join(" ");

  return {
    jm1_name: `${eventType}-${DIAGNOSTIC_ID}`,
    jm1_actiondescription: description.slice(0, 1000),
    jm1_actiontype: eventType,
    jm1_agentname: AGENT_NAME,
    jm1_agentmodel: "intentional-leader-author-response-processor",
    jm1_bandlevel: BAND_LEVEL.BAND_1,
    jm1_executionstatus: EXECUTION_STATUS.SUCCESS,
    jm1_startedon: completedAt,
    jm1_completedon: completedAt,
    jm1_sourceentity: SOURCE_ENTITY,
    jm1_sourcerecordid: DIAGNOSTIC_ID
  };
}

function buildWorkspaceInvitation({ authorName, authorEmail, selectedPackage, temporaryAccessCode, approvedBy }) {
  const firstName = safeTrim(authorName).split(/\s+/)[0] || "there";
  const body = [
    `Good day, ${firstName},`,
    "",
    "Your Author Workspace is ready.",
    "",
    `We received your selection for the ${selectedPackage.name}. Your project is now moving into the pre-contract workspace stage.`,
    "",
    `Open your Author Workspace here: ${WORKSPACE_URL}`,
    "",
    `Temporary access code: ${temporaryAccessCode}`,
    "",
    "Please complete onboarding inside the workspace. The workspace will guide you through Author Onboarding, Financial Setup, and Royalty Setup so we can prepare the next governed steps.",
    "",
    "With appreciation,",
    "",
    "The J Merrill Publishing Team"
  ].join("\n");

  return {
    diagnosticId: DIAGNOSTIC_ID,
    intakeReferenceCode: INTAKE_REFERENCE_CODE,
    authorEmail,
    authorName,
    projectTitle: PROJECT_TITLE,
    internalVisibilityMailbox: INTERNAL_VISIBILITY_MAILBOX,
    draftSubject: `Your Author Workspace is ready - ${PROJECT_TITLE}`,
    draftBody: body,
    templateName: "AUTHOR_WORKSPACE_INVITATION_V1",
    decision: "APPROVE_AUTHOR_SEND",
    sendApproved: true,
    approvedBy,
    approvedOn: new Date().toISOString(),
    futureSendRequiresInternalCopy: true,
    futureSendRequiresDataverseLog: true
  };
}

async function processIntentionalLeaderAuthorResponse(input = {}) {
  const confirmProcess = input.confirmProcessAuthorResponse === true;
  const confirmSend = input.confirmSend === true;
  const portalAccessConfigured = input.portalAccessConfigured === true;
  const temporaryAccessCode = safeTrim(input.temporaryAccessCode);
  const approvedBy = safeTrim(input.approvedBy || "Jackie Smith Jr.");

  if (!confirmProcess) return blocked("CONFIRM_AUTHOR_RESPONSE_PROCESSING_REQUIRED");
  if (!confirmSend) return blocked("CONFIRM_WORKSPACE_INVITATION_SEND_REQUIRED");
  if (!portalAccessConfigured) return blocked("PORTAL_ACCESS_RECORD_NOT_CONFIGURED");
  if (!validTemporaryAccessCode(temporaryAccessCode)) return blocked("TEMPORARY_ACCESS_CODE_INVALID");

  const resourceUrl = process.env.DATAVERSE_RESOURCE_URL;
  if (!resourceUrl) return blocked("DATAVERSE_CONFIG_MISSING");

  const token = await getDataverseToken(resourceUrl);
  const context = await readAuthorContext(token);
  const authorEmail = safeTrim(context.contact.emailaddress1);
  const authorName = safeTrim(context.contact.firstname || context.contact.fullname) || "Author";
  if (!authorEmail) return blocked("AUTHOR_EMAIL_MISSING");

  const reply = await readPublishingMailboxReply({
    subjectContains: SUBJECT_CONTAINS,
    afterIso: AFTER_ISO
  });
  if (!reply.ok) return blocked(reply.reason || "MAILBOX_READ_FAILED", { mailboxCode: reply.code || null });
  if (!reply.found) return blocked("AUTHOR_REPLY_NOT_FOUND", { mailboxCode: reply.code || null });

  const classified = classifyPackageReply(reply.bodyText);
  const selectedPackage = classified.selectedPackage;
  const classification = classified.classification;
  const completedAt = new Date().toISOString();

  const dataverseClient = createDataverseCreateClient(token);
  const authorResponseLog = await dataverseClient.createRecord(EXECUTION_LOG_ENTITY_SET, buildExecutionLogPayload({
    eventType: EVENT_TYPE.AUTHOR_RESPONSE_RECEIVED,
    classification,
    selectedPackage,
    authorEmail,
    receivedDateTime: reply.receivedDateTime,
    completedAt
  }));

  if (!selectedPackage) {
    return {
      ok: true,
      code: "AUTHOR_RESPONSE_RECEIVED_NO_PACKAGE_SELECTED",
      diagnosticId: DIAGNOSTIC_ID,
      intakeReferenceCode: INTAKE_REFERENCE_CODE,
      classification,
      selectedPackage: null,
      authorResponseLogCreated: Boolean(authorResponseLog.id),
      workspaceInvitationSent: false,
      statusAfterProcessing: "Author Response Needs Review"
    };
  }

  await dataversePatch("jm1pub_editorialdiagnostics", DIAGNOSTIC_ID, {
    jm1_authordraftapprovalnotes: `Author selected ${selectedPackage.name}. Workspace Ready / Pre-Contract. Reply evidence logged in jm1_executionlog.`
  }, token);
  const packageSelectedLog = await dataverseClient.createRecord(EXECUTION_LOG_ENTITY_SET, buildExecutionLogPayload({
    eventType: EVENT_TYPE.PACKAGE_SELECTED,
    classification,
    selectedPackage,
    authorEmail,
    receivedDateTime: reply.receivedDateTime,
    completedAt
  }));

  const sendApproval = buildWorkspaceInvitation({
    authorName,
    authorEmail,
    selectedPackage,
    temporaryAccessCode,
    approvedBy
  });
  const sendResult = await sendConfiguredAuthorResponse({ input: { sendApproval } });
  if (!sendResult.ok || sendResult.deliveryStatus !== "AUTHOR_RESPONSE_SENT") {
    return blocked(sendResult.reason || "WORKSPACE_INVITATION_SEND_FAILED", {
      classification,
      selectedPackage,
      authorResponseLogCreated: Boolean(authorResponseLog.id),
      packageSelectedLogCreated: Boolean(packageSelectedLog.id),
      workspaceInvitationSent: false
    });
  }

  const sendLog = await persistAuthorResponseSendLog({
    sendApproval,
    deliveryResult: sendResult,
    providerName: sendResult.providerName,
    providerMessageId: sendResult.providerMessageId
  }, dataverseClient);

  const workspaceInvitationLog = await dataverseClient.createRecord(EXECUTION_LOG_ENTITY_SET, buildExecutionLogPayload({
    eventType: EVENT_TYPE.WORKSPACE_INVITATION_SENT,
    classification,
    selectedPackage,
    authorEmail,
    receivedDateTime: reply.receivedDateTime,
    completedAt
  }));

  return {
    ok: true,
    code: "AUTHOR_RESPONSE_PROCESSED_WORKSPACE_INVITATION_SENT",
    diagnosticId: DIAGNOSTIC_ID,
    intakeReferenceCode: INTAKE_REFERENCE_CODE,
    responseInterpreted: classification,
    selectedPackage,
    senderAddress: reply.senderAddress || null,
    receivedDateTime: reply.receivedDateTime || null,
    authorResponseLogCreated: Boolean(authorResponseLog.id),
    packageSelectedLogCreated: Boolean(packageSelectedLog.id),
    workspaceInvitationLogCreated: Boolean(workspaceInvitationLog.id),
    workspaceAccessCreated: true,
    workspaceInvitationSent: true,
    deliveryStatus: sendResult.deliveryStatus,
    internalVisibilityStatus: sendResult.internalVisibilityStatus || null,
    dataverseSendLogStatus: sendLog.dataverseSendLogStatus || sendLog.reason || null,
    providerMessageIdPresent: Boolean(sendResult.providerMessageId),
    statusAfterProcessing: "Workspace Ready / Pre-Contract",
    liveActions: {
      readMailbox: true,
      sendsWorkspaceInvitation: true,
      createsPaymentLink: false,
      createsCheckoutSession: false,
      createsInvoice: false,
      sendsContract: false,
      sendsSignNowLink: false,
      touchesStripe: false,
      touchesBusinessCentral: false,
      createsRoyaltyAction: false,
      startsProduction: false,
      submitsDistribution: false,
      movesWorkspace: false
    }
  };
}

app.http("run-intentional-leader-author-response", {
  methods: ["POST"],
  authLevel: "anonymous",
  route: "run-intentional-leader-author-response",
  handler: async (request, context) => {
    if (!verifyRunnerKey(request)) {
      context.warn("Intentional Leader author response processor rejected: invalid or missing runner key.");
      return unauthorized();
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return { status: 400, jsonBody: { status: "error", code: "INVALID_JSON" } };
    }

    try {
      const result = await processIntentionalLeaderAuthorResponse(body || {});
      context.info(
        `Intentional Leader author response processing attempted; ok=${result.ok}; code=${result.code || result.reason}; classification=${result.responseInterpreted || result.classification || "none"}`
      );
      return { status: result.ok ? 200 : 422, jsonBody: result };
    } catch (err) {
      context.error(`Intentional Leader author response processing failed: ${err.safeCode || err.code || "PROCESSING_FAILED"}`);
      return {
        status: 422,
        jsonBody: blocked(err.safeCode || "PROCESSING_FAILED")
      };
    }
  }
});

module.exports = {
  processIntentionalLeaderAuthorResponse,
  buildWorkspaceInvitation,
  EVENT_TYPE
};
