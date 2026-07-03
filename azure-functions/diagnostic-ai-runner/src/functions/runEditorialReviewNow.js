"use strict";

/**
 * Governed internal action: Run Editorial Review Now.
 *
 * This is the run-control surface for PROGRAM-002. It evaluates the
 * caller-supplied Dataverse readiness snapshot, prevents duplicate runs,
 * and dispatches the JM Editorial Doctrine runner from the intake/title/
 * manuscript context before package selection. Standard, no-exception
 * results are allowed to send the author recommendation under the
 * publisher-certified automation doctrine; exception results never send.
 */

const { app } = require("@azure/functions");
const { getDataverseToken } = require("../dataverse/authorDraftPersistenceClient");
const { runPrePackageEditorialReview } = require("../editorial/preContractEditorialReviewRunner");
const { preparePublisherRecommendationDraft } = require("../editorial/publisherRecommendationReview");
const { sendConfiguredAuthorResponse } = require("../author/authorResponseSendProviderConfig");
const { persistAuthorResponseSendLog } = require("../author/authorResponseSendPersister");
const {
  REVIEW_RUN_STATUS,
  evaluateRunNowRequest
} = require("../editorial/editorialReviewRunControl");

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

function toAutomaticSendApproval({ draftResult }) {
  const view = draftResult.view;
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
    approvedBy: "publisher-certified-automation",
    approvedOn: new Date().toISOString(),
    futureSendRequiresInternalCopy: true,
    futureSendRequiresDataverseLog: true
  };
}

function createExecutionLogDataverseClient() {
  return {
    async createRecord(entitySet, payload) {
      const apiBase = process.env.DATAVERSE_WEB_API_BASE_URL;
      const resourceUrl = process.env.DATAVERSE_RESOURCE_URL;
      if (!apiBase || !resourceUrl) {
        throw Object.assign(new Error("Dataverse API base URL missing"), {
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
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw Object.assign(new Error(`Dataverse create failed: HTTP ${response.status}`), {
          safeCode: "DATAVERSE_WRITE_FAILED",
          httpStatus: response.status
        });
      }
      return { id: body.jm1_executionlogid || null };
    }
  };
}

app.http("run-editorial-review-now", {
  methods: ["POST"],
  authLevel: "anonymous",
  route: "run-editorial-review-now",
  handler: async (request, context) => {
    if (!verifyRunnerKey(request)) {
      context.warn("Run Editorial Review Now rejected: invalid or missing runner key.");
      return unauthorized();
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return { status: 400, jsonBody: { status: "error", code: "INVALID_JSON" } };
    }

    if (body.confirmRunNow !== true) {
      return { status: 400, jsonBody: { status: "error", code: "CONFIRM_RUN_NOW_REQUIRED" } };
    }

    const readinessRecord = body.readinessRecord || body;
    const runNow = evaluateRunNowRequest(readinessRecord);
    if (!runNow.accepted) {
      return {
        status: 422,
        jsonBody: {
          status: "blocked",
          code: "EDITORIAL_REVIEW_NOT_READY",
          runControlStatus: runNow.status,
          reason: runNow.reason,
          readiness: runNow.readiness
        }
      };
    }

    const diagnosticId = safeTrim(body.diagnosticId || readinessRecord.diagnosticId);
    const intakeReferenceCode = safeTrim(body.intakeReferenceCode || readinessRecord.intakeReferenceCode);
    const opportunityId = safeTrim(body.opportunityId);

    const result = await runPrePackageEditorialReview({
      diagnosticId,
      intakeReferenceCode,
      opportunityId
    });

    context.info(
      `Run Editorial Review Now attempted; diagnosticId=${diagnosticId}; ok=${result.ok}; code=${result.code || result.reason}`
    );

    if (!result.ok) {
      return {
        status: 422,
        jsonBody: {
          ...result,
          runControlStatus: REVIEW_RUN_STATUS.HOLD_EXCEPTION,
          authorRecommendationSent: false
        }
      };
    }

    if (result.publisherReviewRequired === true) {
      return {
        status: 202,
        jsonBody: {
          ...result,
          runControlStatus: REVIEW_RUN_STATUS.PUBLISHER_REVIEW_REQUIRED,
          authorRecommendationSent: false
        }
      };
    }

    const draftResult = await preparePublisherRecommendationDraft(
      { diagnosticId, intakeReferenceCode },
      { getToken: getDataverseToken }
    );
    if (!draftResult.ok) {
      return {
        status: 422,
        jsonBody: {
          ...result,
          ok: false,
          code: "EDITORIAL_REVIEW_RECOMMENDATION_DRAFT_BLOCKED",
          reason: draftResult.reason || draftResult.code || "DRAFT_PREPARATION_FAILED",
          runControlStatus: REVIEW_RUN_STATUS.HOLD_EXCEPTION,
          authorRecommendationSent: false
        }
      };
    }

    const sendApproval = toAutomaticSendApproval({ draftResult });
    const sendResult = await sendConfiguredAuthorResponse({ input: { sendApproval } });
    context.info(
      `Run Editorial Review standard recommendation send attempted; diagnosticId=${diagnosticId}; ok=${sendResult.ok}; code=${sendResult.code || sendResult.reason}; providerCalled=${sendResult.providerCalled === true}`
    );

    if (!sendResult.ok || sendResult.deliveryStatus !== "AUTHOR_RESPONSE_SENT") {
      return {
        status: 422,
        jsonBody: {
          ...result,
          ok: false,
          code: "EDITORIAL_REVIEW_RECOMMENDATION_SEND_BLOCKED",
          reason: sendResult.reason || sendResult.code || "AUTHOR_RESPONSE_SEND_FAILED",
          deliveryStatus: sendResult.deliveryStatus || null,
          runControlStatus: REVIEW_RUN_STATUS.HOLD_EXCEPTION,
          authorRecommendationSent: false
        }
      };
    }

    const sendLog = await persistAuthorResponseSendLog({
      sendApproval,
      deliveryResult: sendResult,
      providerName: sendResult.providerName,
      providerMessageId: sendResult.providerMessageId
    }, createExecutionLogDataverseClient());

    return {
      status: 202,
      jsonBody: {
        ...result,
        code: sendLog.ok ? "EDITORIAL_REVIEW_RECOMMENDATION_SENT" : "EDITORIAL_REVIEW_RECOMMENDATION_SENT_WITH_LOG_WARNING",
        deliveryStatus: sendResult.deliveryStatus,
        internalVisibilityStatus: sendResult.internalVisibilityStatus || null,
        dataverseSendLogStatus: sendLog.dataverseSendLogStatus || sendLog.reason || null,
        providerMessageId: sendResult.providerMessageId || null,
        runControlStatus: REVIEW_RUN_STATUS.AWAITING_AUTHOR_RESPONSE,
        authorRecommendationSent: true
      }
    };
  }
});

module.exports = {};
