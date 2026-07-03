"use strict";

const { app } = require("@azure/functions");
const { getDataverseToken } = require("../dataverse/authorDraftPersistenceClient");
const { patchDataverseRecord } = require("../dataverse/authorDraftPersistenceClient");
const {
  buildPublisherRecommendationReview,
  preparePublisherRecommendationDraft
} = require("../editorial/publisherRecommendationReview");
const { sendConfiguredAuthorResponse } = require("../author/authorResponseSendProviderConfig");
const {
  buildAuthorDraftApprovalUpdate,
  AUTHOR_DRAFT_APPROVAL_DECISION
} = require("../author/authorDraftApprovalDecisionModel");
const { ENTITY_SET } = require("../author/authorDraftFieldMap");

const ACTION = Object.freeze({
  APPROVE_SEND: "APPROVE_SEND_RECOMMENDATION",
  OVERRIDE: "OVERRIDE_RECOMMENDATION",
  HOLD: "HOLD_NEEDS_REVIEW"
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

function toSendApproval({ view, approvedBy }) {
  return {
    diagnosticId: view.diagnosticId,
    intakeReferenceCode: view.intakeReferenceCode,
    authorEmail: view.author.email,
    authorName: view.author.name,
    projectTitle: view.project.title,
    internalVisibilityMailbox: view.authorFacingRecommendationDraft.internalVisibilityMailbox,
    draftSubject: view.authorFacingRecommendationDraft.subject,
    draftBody: view.authorFacingRecommendationDraft.body,
    templateName: view.authorFacingRecommendationDraft.templateName,
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
        providerMessageId: sendResult.providerMessageId || null,
        authorRecommendationSent: sendResult.deliveryStatus === "AUTHOR_RESPONSE_SENT"
      }
    };
  }
});

module.exports = {};
