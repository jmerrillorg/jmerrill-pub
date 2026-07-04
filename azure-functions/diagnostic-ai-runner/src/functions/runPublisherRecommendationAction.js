"use strict";

const { app } = require("@azure/functions");
const { getDataverseToken } = require("../dataverse/authorDraftPersistenceClient");
const { patchDataverseRecord } = require("../dataverse/authorDraftPersistenceClient");
const {
  buildPublisherRecommendationReview,
  preparePublisherRecommendationDraft
} = require("../editorial/publisherRecommendationReview");
const { sendConfiguredAuthorResponse } = require("../author/authorResponseSendProviderConfig");
const { persistAuthorResponseSendLog } = require("../author/authorResponseSendPersister");
const {
  buildAuthorDraftApprovalUpdate,
  AUTHOR_DRAFT_APPROVAL_DECISION
} = require("../author/authorDraftApprovalDecisionModel");
const { ENTITY_SET } = require("../author/authorDraftFieldMap");
const {
  AGENT_NAME,
  BAND_LEVEL,
  EXECUTION_STATUS,
  SOURCE_ENTITY
} = require("../dataverse/metadataWriter");

const ACTION = Object.freeze({
  APPROVE_SEND: "APPROVE_SEND_RECOMMENDATION",
  OVERRIDE: "OVERRIDE_RECOMMENDATION",
  HOLD: "HOLD_NEEDS_REVIEW",
  RESEND_WHY_FIRST: "RESEND_WHY_FIRST_RECOMMENDATION"
});

const EXECUTION_LOG_ENTITY_SET = "jm1_executionlogs";
const RESEND_EVENT = Object.freeze({
  SUPERSEDED: "AUTHOR_RECOMMENDATION_SUPERSEDED",
  REPLACEMENT_SENT: "AUTHOR_RECOMMENDATION_REPLACEMENT_SENT"
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
  return { ok: false, code: "PUBLISHER_RECOMMENDATION_ACTION_BLOCKED", reason, ...extra };
}

function toSendApproval({ view, approvedBy, templateName = null }) {
  return {
    diagnosticId: view.diagnosticId,
    intakeReferenceCode: view.intakeReferenceCode,
    authorEmail: view.author.email,
    authorName: view.author.name,
    projectTitle: view.project.title,
    internalVisibilityMailbox: view.authorFacingRecommendationDraft.internalVisibilityMailbox,
    draftSubject: view.authorFacingRecommendationDraft.subject,
    draftBody: view.authorFacingRecommendationDraft.body,
    templateName: templateName || view.authorFacingRecommendationDraft.templateName,
    decision: "APPROVE_AUTHOR_SEND",
    sendApproved: true,
    approvedBy,
    approvedOn: new Date().toISOString(),
    futureSendRequiresInternalCopy: true,
    futureSendRequiresDataverseLog: true
  };
}

function toApprovalDecision(action) {
  if (action === ACTION.APPROVE_SEND) return AUTHOR_DRAFT_APPROVAL_DECISION.APPROVE_FOR_SEND_PREPARATION;
  if (action === ACTION.OVERRIDE) return AUTHOR_DRAFT_APPROVAL_DECISION.NEEDS_DRAFT_REVISION;
  return AUTHOR_DRAFT_APPROVAL_DECISION.HOLD_DRAFT_REVIEW;
}

function buildApprovalInput({ action, draftResult, approvedBy, reviewerNotes }) {
  return {
    diagnosticId: draftResult.view.diagnosticId,
    intakeReferenceCode: draftResult.view.intakeReferenceCode,
    currentApprovalStatus: draftResult.draft.approvalStatus,
    currentSendStatus: draftResult.draft.sendStatus,
    decision: toApprovalDecision(action),
    reviewerId: approvedBy,
    reviewerNotes: safeTrim(reviewerNotes),
    internalVisibilityMailbox: draftResult.draft.internalVisibilityMailbox,
    futureSendRequiresInternalCopy: true,
    futureSendRequiresDataverseLog: true,
    metadata: {
      correlationId: draftResult.view.executionLog?.id || draftResult.view.diagnosticId
    }
  };
}

async function persistApprovalDecision({ diagnosticId, approvalUpdate, token }) {
  const apiBase = process.env.DATAVERSE_WEB_API_BASE_URL;
  if (!apiBase) {
    throw Object.assign(new Error("Dataverse API base URL missing"), {
      safeCode: "DATAVERSE_CONFIG_MISSING"
    });
  }
  return patchDataverseRecord(apiBase, token, ENTITY_SET, diagnosticId, approvalUpdate.dataverseUpdatePayload);
}

function createDataverseCreateClient() {
  return {
    async createRecord(entitySet, payload) {
      const apiBase = process.env.DATAVERSE_WEB_API_BASE_URL;
      const resourceUrl = process.env.DATAVERSE_RESOURCE_URL;
      if (!apiBase || !resourceUrl) {
        throw Object.assign(new Error("Dataverse configuration missing"), {
          safeCode: "DATAVERSE_CONFIG_MISSING"
        });
      }
      const token = await getDataverseToken(resourceUrl);
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
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw Object.assign(new Error(`Dataverse create failed: HTTP ${response.status}`), {
          safeCode: "DATAVERSE_WRITE_FAILED",
          httpStatus: response.status
        });
      }
      return { id: result.jm1_executionlogid || result.id || null };
    }
  };
}

function buildRecommendationResendEventPayload({
  eventType,
  diagnosticId,
  intakeReferenceCode,
  subject,
  approvedBy,
  occurredAt = new Date().toISOString()
}) {
  return {
    jm1_name: `${eventType}-${diagnosticId}`,
    jm1_actiontype: eventType,
    jm1_actiondescription: [
      `${eventType} for intake ${intakeReferenceCode}.`,
      `Subject ${safeTrim(subject)}.`,
      `Approved by ${safeTrim(approvedBy)}.`,
      "Prior recommendation/email supersession and replacement send evidence only.",
      "Workflow remains Awaiting Author Response.",
      "No package recommendation change. No editorial review change. No Opportunity, Stripe, Business Central, royalty, payment, contract, production, distribution, launch, or marketing action occurred.",
      "No manuscript text, prompt body, raw model output, secrets, tokens, or headers stored."
    ].join(" ").slice(0, 1000),
    jm1_agentname: AGENT_NAME,
    jm1_agentmodel: "publisher-recommendation-why-first-resend",
    jm1_bandlevel: BAND_LEVEL.BAND_1,
    jm1_executionstatus: EXECUTION_STATUS.SUCCESS,
    jm1_startedon: occurredAt,
    jm1_completedon: occurredAt,
    jm1_sourceentity: SOURCE_ENTITY,
    jm1_sourcerecordid: diagnosticId
  };
}

async function persistRecommendationResendEvent(input = {}, dataverseClient = createDataverseCreateClient()) {
  const payload = buildRecommendationResendEventPayload(input);
  const result = await dataverseClient.createRecord(EXECUTION_LOG_ENTITY_SET, payload);
  return {
    ok: true,
    entitySet: EXECUTION_LOG_ENTITY_SET,
    id: safeTrim(result?.id) || null,
    eventType: input.eventType
  };
}

app.http("run-publisher-recommendation-action", {
  methods: ["POST"],
  authLevel: "anonymous",
  route: "run-publisher-recommendation-action",
  handler: async (request, context) => {
    if (!verifyRunnerKey(request)) {
      context.warn("Publisher recommendation action rejected: invalid or missing runner key.");
      return unauthorized();
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return { status: 400, jsonBody: { status: "error", code: "INVALID_JSON" } };
    }

    const diagnosticId = safeTrim(body.diagnosticId);
    const intakeReferenceCode = safeTrim(body.intakeReferenceCode);
    const action = safeTrim(body.action).toUpperCase();
    const approvedBy = safeTrim(body.approvedBy || body.reviewerId);
    const reviewerNotes = safeTrim(body.reviewerNotes || body.notes);
    const confirmAction = body.confirmAction === true;
    const confirmSend = body.confirmSend === true;
    const deps = { getToken: getDataverseToken };

    if (!confirmAction) {
      return { status: 400, jsonBody: { status: "error", code: "CONFIRM_PUBLISHER_RECOMMENDATION_ACTION_REQUIRED" } };
    }
    if (!Object.values(ACTION).includes(action)) {
      return { status: 400, jsonBody: { status: "error", code: "PUBLISHER_RECOMMENDATION_ACTION_UNSUPPORTED" } };
    }
    if (!approvedBy) {
      return { status: 400, jsonBody: { status: "error", code: "APPROVED_BY_MISSING" } };
    }
    if (action === ACTION.RESEND_WHY_FIRST) {
      const result = await runPublisherRecommendationAction({
        diagnosticId,
        intakeReferenceCode,
        action,
        approvedBy,
        confirmAction,
        confirmSend
      });
      return {
        status: result.ok ? 200 : 422,
        jsonBody: result
      };
    }

    const draftResult = await preparePublisherRecommendationDraft({ diagnosticId, intakeReferenceCode }, deps);
    if (!draftResult.ok) {
      return { status: 422, jsonBody: draftResult };
    }

    const approvalUpdate = buildAuthorDraftApprovalUpdate(buildApprovalInput({
      action,
      draftResult,
      approvedBy,
      reviewerNotes: reviewerNotes || (action === ACTION.OVERRIDE ? "Override requested by publisher." : "")
    }));
    if (!approvalUpdate.ok) {
      return {
        status: 422,
        jsonBody: {
          ok: false,
          code: "PUBLISHER_RECOMMENDATION_ACTION_BLOCKED",
          reason: approvalUpdate.reason,
          diagnosticId,
          intakeReferenceCode,
          authorRecommendationSent: false
        }
      };
    }

    let approvalPersistence;
    try {
      const token = await getDataverseToken(process.env.DATAVERSE_RESOURCE_URL);
      approvalPersistence = await persistApprovalDecision({ diagnosticId, approvalUpdate, token });
    } catch (err) {
      return {
        status: 422,
        jsonBody: {
          ok: false,
          code: "PUBLISHER_RECOMMENDATION_ACTION_BLOCKED",
          reason: err.safeCode || "DATAVERSE_APPROVAL_WRITE_FAILED",
          diagnosticId,
          intakeReferenceCode,
          authorRecommendationSent: false
        }
      };
    }

    if (action === ACTION.HOLD) {
      return {
        status: 200,
        jsonBody: {
          ok: true,
          code: "PUBLISHER_RECOMMENDATION_HELD_FOR_REVIEW",
          diagnosticId,
          intakeReferenceCode,
          draftStatus: draftResult.draft.sendStatus,
          approvalStatus: approvalUpdate.decisionUpdate.approvalStatus,
          approvalDecision: approvalUpdate.decisionUpdate.draftApprovalDecision,
          diagnosticRecordEtag: approvalPersistence.etag || null,
          authorRecommendationSent: false
        }
      };
    }

    if (action === ACTION.OVERRIDE) {
      return {
        status: 200,
        jsonBody: {
          ok: true,
          code: "PUBLISHER_RECOMMENDATION_OVERRIDE_DRAFT_READY",
          diagnosticId,
          intakeReferenceCode,
          draftStatus: draftResult.draft.sendStatus,
          approvalStatus: approvalUpdate.decisionUpdate.approvalStatus,
          approvalDecision: approvalUpdate.decisionUpdate.draftApprovalDecision,
          diagnosticRecordEtag: approvalPersistence.etag || null,
          authorRecommendationSent: false,
          note: "Override was recorded as needing draft revision; no author send was attempted."
        }
      };
    }

    const viewResult = await buildPublisherRecommendationReview({ diagnosticId, intakeReferenceCode }, deps);
    if (!viewResult.ok) {
      return { status: 422, jsonBody: viewResult };
    }
    const sendApproval = toSendApproval({ view: viewResult.view, approvedBy });

    if (!confirmSend) {
      return {
        status: 200,
        jsonBody: {
          ok: true,
          code: "PUBLISHER_RECOMMENDATION_APPROVED_SEND_READY",
          diagnosticId,
          intakeReferenceCode,
          sendReady: true,
          authorRecommendationSent: false,
          draftStatus: draftResult.draft.sendStatus,
          approvalStatus: approvalUpdate.decisionUpdate.approvalStatus,
          approvalDecision: approvalUpdate.decisionUpdate.draftApprovalDecision,
          diagnosticRecordEtag: approvalPersistence.etag || null,
          note: "Author send not executed because confirmSend was not true."
        }
      };
    }

    const sendResult = await sendConfiguredAuthorResponse({ input: { sendApproval } });
    context.info(
      `Publisher recommendation send attempted; diagnosticId=${diagnosticId}; ok=${sendResult.ok}; code=${sendResult.code || sendResult.reason}; providerCalled=${sendResult.providerCalled === true}`
    );

    const logResult = sendResult.ok && sendResult.deliveryStatus === "AUTHOR_RESPONSE_SENT"
      ? await persistAuthorResponseSendLog({
        sendApproval,
        deliveryResult: sendResult,
        providerName: sendResult.providerName,
        providerMessageId: sendResult.providerMessageId
      }, createDataverseCreateClient())
      : null;

    return {
      status: sendResult.ok && sendResult.deliveryStatus === "AUTHOR_RESPONSE_SENT" ? 200 : 422,
      jsonBody: {
        ok: sendResult.ok,
        code: sendResult.ok ? "PUBLISHER_RECOMMENDATION_SENT" : "PUBLISHER_RECOMMENDATION_SEND_BLOCKED",
        reason: sendResult.reason || null,
        diagnosticId,
        intakeReferenceCode,
        deliveryStatus: sendResult.deliveryStatus || null,
        internalVisibilityStatus: sendResult.internalVisibilityStatus || null,
        dataverseSendLogStatus: logResult?.dataverseSendLogStatus || logResult?.reason || null,
        providerMessageId: sendResult.providerMessageId || null,
        authorRecommendationSent: sendResult.deliveryStatus === "AUTHOR_RESPONSE_SENT"
      }
    };
  }
});

async function runPublisherRecommendationAction(input = {}, deps = {}) {
  const diagnosticId = safeTrim(input.diagnosticId);
  const intakeReferenceCode = safeTrim(input.intakeReferenceCode);
  const action = safeTrim(input.action).toUpperCase();
  const approvedBy = safeTrim(input.approvedBy || input.reviewerId);
  const confirmAction = input.confirmAction === true;
  const confirmSend = input.confirmSend === true;

  if (!confirmAction) return blocked("CONFIRM_PUBLISHER_RECOMMENDATION_ACTION_REQUIRED", { diagnosticId, intakeReferenceCode });
  if (!Object.values(ACTION).includes(action)) return blocked("PUBLISHER_RECOMMENDATION_ACTION_UNSUPPORTED", { diagnosticId, intakeReferenceCode });
  if (!approvedBy) return blocked("APPROVED_BY_MISSING", { diagnosticId, intakeReferenceCode });
  if (action !== ACTION.RESEND_WHY_FIRST) return blocked("USE_HTTP_HANDLER_FOR_LEGACY_ACTIONS", { diagnosticId, intakeReferenceCode });
  if (!confirmSend) return blocked("CONFIRM_REPLACEMENT_SEND_REQUIRED", { diagnosticId, intakeReferenceCode });

  const prepareDraft = deps.prepareDraft || preparePublisherRecommendationDraft;
  const sendResponse = deps.sendResponse || sendConfiguredAuthorResponse;
  const persistSendLog = deps.persistSendLog || persistAuthorResponseSendLog;
  const persistResendEvent = deps.persistResendEvent || persistRecommendationResendEvent;
  const dataverseClient = deps.dataverseClient || createDataverseCreateClient();

  const draftResult = await prepareDraft({ diagnosticId, intakeReferenceCode }, {
    getToken: getDataverseToken,
    ...(deps.prepareDraftDeps || {})
  });
  if (!draftResult.ok) return draftResult;

  const sendApproval = toSendApproval({
    view: draftResult.view,
    approvedBy,
    templateName: "WHY_FIRST_RECOMMENDATION_V1"
  });

  const superseded = await persistResendEvent({
    eventType: RESEND_EVENT.SUPERSEDED,
    diagnosticId,
    intakeReferenceCode,
    subject: sendApproval.draftSubject,
    approvedBy
  }, dataverseClient);

  const sendResult = await sendResponse({ input: { sendApproval } });
  if (!sendResult.ok || sendResult.deliveryStatus !== "AUTHOR_RESPONSE_SENT") {
    return {
      ok: false,
      code: "PUBLISHER_RECOMMENDATION_REPLACEMENT_SEND_BLOCKED",
      reason: sendResult.reason || sendResult.code || "AUTHOR_RESPONSE_SEND_FAILED",
      diagnosticId,
      intakeReferenceCode,
      supersededEventId: superseded.id || null,
      deliveryStatus: sendResult.deliveryStatus || null,
      authorRecommendationSent: false
    };
  }

  const sendLog = await persistSendLog({
    sendApproval,
    deliveryResult: sendResult,
    providerName: sendResult.providerName,
    providerMessageId: sendResult.providerMessageId
  }, dataverseClient);

  const replacement = await persistResendEvent({
    eventType: RESEND_EVENT.REPLACEMENT_SENT,
    diagnosticId,
    intakeReferenceCode,
    subject: sendApproval.draftSubject,
    approvedBy
  }, dataverseClient);

  return {
    ok: true,
    code: "PUBLISHER_RECOMMENDATION_REPLACEMENT_SENT",
    diagnosticId,
    intakeReferenceCode,
    subject: sendApproval.draftSubject,
    renderedBody: sendApproval.draftBody,
    deliveryStatus: sendResult.deliveryStatus,
    internalVisibilityStatus: sendResult.internalVisibilityStatus || null,
    providerMessageId: sendResult.providerMessageId || null,
    supersededEventId: superseded.id || null,
    replacementEventId: replacement.id || null,
    dataverseSendLogStatus: sendLog.dataverseSendLogStatus || sendLog.reason || null,
    authorRecommendationSent: true,
    workflowStatus: "Awaiting Author Response"
  };
}

module.exports = {
  ACTION,
  RESEND_EVENT,
  runPublisherRecommendationAction,
  buildRecommendationResendEventPayload,
  persistRecommendationResendEvent
};
