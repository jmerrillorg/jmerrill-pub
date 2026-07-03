"use strict";

const { app } = require("@azure/functions");
const { getDataverseToken } = require("../dataverse/authorDraftPersistenceClient");
const {
  buildPublisherRecommendationReview,
  preparePublisherRecommendationDraft
} = require("../editorial/publisherRecommendationReview");

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

function safeViewResponse(result) {
  if (!result.ok) return result;
  return {
    ok: true,
    code: result.code,
    view: result.view,
    draft: result.draft || null,
    persistence: result.persistence ? {
      persisted: result.persistence.persisted,
      code: result.persistence.code || null,
      reason: result.persistence.reason || null,
      dataverseRecordId: result.persistence.dataverseRecordId || null,
      sendStatus: result.persistence.sendStatus || null,
      approvalStatus: result.persistence.approvalStatus || null,
      persistedAt: result.persistence.persistedAt || null
    } : null
  };
}

app.http("get-publisher-recommendation-review", {
  methods: ["POST"],
  authLevel: "anonymous",
  route: "get-publisher-recommendation-review",
  handler: async (request, context) => {
    if (!verifyRunnerKey(request)) {
      context.warn("Publisher recommendation review rejected: invalid or missing runner key.");
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
    const prepareDraft = body.prepareDraft === true;

    const deps = { getToken: getDataverseToken };
    const result = prepareDraft
      ? await preparePublisherRecommendationDraft({ diagnosticId, intakeReferenceCode }, deps)
      : await buildPublisherRecommendationReview({ diagnosticId, intakeReferenceCode }, deps);

    context.info(
      `Publisher recommendation review requested; diagnosticId=${diagnosticId}; ok=${result.ok}; code=${result.code || result.reason}; prepareDraft=${prepareDraft}`
    );

    return {
      status: result.ok ? 200 : 422,
      jsonBody: safeViewResponse(result)
    };
  }
});

module.exports = {};
