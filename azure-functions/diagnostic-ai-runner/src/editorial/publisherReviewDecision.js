"use strict";

/**
 * Publisher review packet + Publisher Review Decision recorder.
 *
 * When the content-aware pre-contract editorial review (see
 * preContractEditorialReviewRunner.js) routes a title to human review —
 * for Signature candidacy, a rights/disclosure risk, low confidence, or
 * any other non-auto-lock reason — a human Publisher decision is
 * required before agreement preparation can resume. This module builds
 * the safe internal packet a Publisher reviews, and records the
 * resulting decision.
 *
 * Identity/capacity rule: for the controlled record, the same individual
 * (Jackie Smith Jr.) is both the Author and the Publisher/CEO. Every
 * function in this module records the decision explicitly as a
 * PUBLISHER REVIEW DECISION — distinct from, and never to be confused
 * with, an author-side approval. The execution-log evidence always
 * states the capacity explicitly.
 *
 * Safety boundaries:
 *   - The packet is assembled ONLY from data already produced by the
 *     pre-contract review (safe, schema-validated, no-quotation-
 *     validated characterizations and numeric scores) — it never reads
 *     the manuscript itself and never contains raw manuscript text.
 *   - The Publisher's decision is a human input — this module never
 *     infers or guesses an imprint; the caller (the human Publisher,
 *     via whatever interface relays their decision) must supply the
 *     recommended imprint explicitly when approving or redirecting.
 *   - Never sends anything author-facing. Never generates an agreement.
 *     Never touches the Opportunity.
 */

const {
  patchDataverseRecord,
  getDataverseToken
} = require("../dataverse/authorDraftPersistenceClient");
const { DIAGNOSTIC_ID_PATTERN, INTAKE_REFERENCE_PATTERN } = require("../queue/diagnosticQueueSelector");
const { AGENT_NAME, BAND_LEVEL, EXECUTION_STATUS, SOURCE_ENTITY } = require("../dataverse/metadataWriter");
const { classifyDataverseWriteError } = require("../author/milestone6OpportunityWriter");
const {
  DIAGNOSTIC_STATUS,
  JACKIE_DECISION,
  HUMAN_DECISION,
  RECOMMENDED_IMPRINT,
  RECOMMENDED_IMPRINT_LABELS
} = require("./preContractEditorialReviewGate");

const GATE_NAME = "JM1_PUBLISHER_REVIEW_DECISION_ENABLED";
const DIAGNOSTIC_ENTITY_SET = "jm1pub_editorialdiagnostics";
const EXECUTION_LOG_ENTITY_SET = "jm1_executionlogs";
const EVENT_TYPE = "PUBLISHER_REVIEW_DECISION_RECORDED";
const AGENT_MODEL_NAME = "publisher-review-decision";

// The five fixed publishing decision options a Publisher may choose
// from. This list is always presented in full on every packet — it is
// not generated or guessed per-record.
const PUBLISHER_DECISION_OPTION = Object.freeze({
  APPROVE_PROCEED: "APPROVE_PROCEED",
  REQUIRE_REVISION: "REQUIRE_REVISION",
  ROUTE_TO_ANOTHER_IMPRINT: "ROUTE_TO_ANOTHER_IMPRINT",
  DECLINE_OR_DEFER: "DECLINE_OR_DEFER",
  ESCALATE: "ESCALATE"
});

const PUBLISHER_DECISION_OPTION_LABEL = Object.freeze({
  [PUBLISHER_DECISION_OPTION.APPROVE_PROCEED]: "Approve to proceed under J Merrill Publishing",
  [PUBLISHER_DECISION_OPTION.REQUIRE_REVISION]: "Require manuscript revision before contract",
  [PUBLISHER_DECISION_OPTION.ROUTE_TO_ANOTHER_IMPRINT]: "Route to another imprint",
  [PUBLISHER_DECISION_OPTION.DECLINE_OR_DEFER]: "Decline or defer",
  [PUBLISHER_DECISION_OPTION.ESCALATE]: "Escalate for additional review"
});

const OPTIONS_REQUIRING_IMPRINT = Object.freeze([
  PUBLISHER_DECISION_OPTION.APPROVE_PROCEED,
  PUBLISHER_DECISION_OPTION.ROUTE_TO_ANOTHER_IMPRINT
]);

function normalizeString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function isPlainObject(value) {
  return value != null && typeof value === "object" && !Array.isArray(value);
}

function isGateOpen() {
  return normalizeString(process.env[GATE_NAME]).toLowerCase() === "true";
}

function blocked(reason, extra = {}) {
  return { ok: false, code: "PUBLISHER_REVIEW_DECISION_BLOCKED", reason, ...extra };
}

/**
 * Pure assembler — builds the safe internal Publisher Review packet from
 * data already produced by the pre-contract editorial review run. Never
 * reads the manuscript. Never contains raw manuscript text — only the
 * already-safe characterizations and numeric scores the review already
 * produced and validated.
 *
 * @param {{
 *   opportunityId: string, diagnosticId: string, title: string,
 *   authorName: string|null, authorEmail: string|null,
 *   selectedPackageCode: string, paymentOption: string|null,
 *   officialManuscriptWordCount: number, packageFitConfirmed: boolean,
 *   internalScorecard: object, fitDecision: string,
 *   humanReviewReason: string, editorialRiskFlags: string,
 *   editorialFitSummary: string
 * }} input
 * @returns {object} the packet
 */
function buildPublisherReviewPacket(input = {}) {
  const f = isPlainObject(input) ? input : {};
  const scorecard = f.internalScorecard || {};

  return {
    controlledRecord: {
      opportunityId: f.opportunityId || null,
      diagnosticId: f.diagnosticId || null,
      title: f.title || null,
      authorName: f.authorName || null,
      authorEmail: f.authorEmail || null,
      selectedPackageCode: f.selectedPackageCode || null,
      paymentOption: f.paymentOption || null
    },
    editorialReviewOutcome: {
      officialManuscriptWordCount: f.officialManuscriptWordCount ?? null,
      wordCountSource: "MANUSCRIPT_FILE",
      packageFitConfirmed: f.packageFitConfirmed === true,
      overallScore: scorecard.overallScore ?? null,
      scoreCategories: {
        manuscriptFit: scorecard.manuscriptFit ?? null,
        packageFit: scorecard.packageFit ?? null,
        imprintFit: scorecard.imprintFit ?? null,
        editorialReadiness: scorecard.editorialReadiness ?? null,
        productionComplexity: scorecard.productionComplexity ?? null,
        audienceMarketClarity: scorecard.audienceMarketClarity ?? null,
        faithMissionAlignment: scorecard.faithMissionAlignment ?? null
      },
      fitDecision: f.fitDecision || null,
      humanReviewReason: f.humanReviewReason || null,
      fitSummary: f.editorialFitSummary || null
    },
    contentRiskSummary: {
      riskFlags: f.editorialRiskFlags || "None identified",
      note: "Characterization only — no manuscript excerpts included. The full manuscript is available at its source location for direct Publisher review if needed; this packet contains only the AI review's already-validated, no-quotation-checked safe summary."
    },
    publishingDecisionOptions: Object.values(PUBLISHER_DECISION_OPTION).map((option) => ({
      option,
      label: PUBLISHER_DECISION_OPTION_LABEL[option],
      requiresRecommendedImprint: OPTIONS_REQUIRING_IMPRINT.includes(option)
    })),
    imprintDecisionField: {
      instructions: "If approving or routing to another imprint, the Publisher must specify the imprint explicitly — the system does not infer or guess this.",
      availableImprints: Object.entries(RECOMMENDED_IMPRINT_LABELS).map(([code, label]) => ({ code: Number(code), label }))
    },
    agreementReadiness: {
      status: "BLOCKED_HUMAN_REVIEW_REQUIRED",
      note: "Agreement generation remains blocked until a Publisher Review Decision is recorded for this record."
    },
    decisionCapacityNotice: "This packet requires a decision from Jackie Smith Jr. acting in PUBLISHER/CEO capacity — not an author-side approval. The recorded decision will be logged explicitly as a Publisher Review Decision."
  };
}

/**
 * Pure mapper — converts a chosen publishing decision option (plus, when
 * required, a human-supplied recommended imprint) into the Dataverse
 * field values to write. Pure — no I/O.
 */
function mapPublisherDecisionToFields(option, { recommendedImprint = null, lockImprint = true } = {}) {
  switch (option) {
    case PUBLISHER_DECISION_OPTION.APPROVE_PROCEED:
      return {
        jackieDecision: JACKIE_DECISION.APPROVED,
        humanDecision: HUMAN_DECISION.ACCEPTED,
        diagnosticStatus: DIAGNOSTIC_STATUS.JACKIE_APPROVED,
        recommendedImprint,
        imprintLocked: lockImprint !== false
      };
    case PUBLISHER_DECISION_OPTION.ROUTE_TO_ANOTHER_IMPRINT:
      return {
        jackieDecision: JACKIE_DECISION.REDIRECTED,
        humanDecision: HUMAN_DECISION.MODIFIED,
        diagnosticStatus: DIAGNOSTIC_STATUS.JACKIE_APPROVED,
        recommendedImprint,
        imprintLocked: lockImprint !== false
      };
    case PUBLISHER_DECISION_OPTION.REQUIRE_REVISION:
      return {
        jackieDecision: JACKIE_DECISION.REDIRECTED,
        humanDecision: HUMAN_DECISION.DEFERRED,
        diagnosticStatus: DIAGNOSTIC_STATUS.AWAITING_JACKIE_REVIEW,
        recommendedImprint: null,
        imprintLocked: false
      };
    case PUBLISHER_DECISION_OPTION.DECLINE_OR_DEFER:
      return {
        jackieDecision: JACKIE_DECISION.DECLINED,
        humanDecision: HUMAN_DECISION.REJECTED,
        diagnosticStatus: DIAGNOSTIC_STATUS.DECLINED,
        recommendedImprint: null,
        imprintLocked: false
      };
    case PUBLISHER_DECISION_OPTION.ESCALATE:
      return {
        jackieDecision: null,
        humanDecision: HUMAN_DECISION.ESCALATED,
        diagnosticStatus: DIAGNOSTIC_STATUS.AWAITING_JACKIE_REVIEW,
        recommendedImprint: null,
        imprintLocked: false
      };
    default:
      return null;
  }
}

async function postExecutionLogRecord(apiBase, token, payload) {
  const url = `${apiBase.replace(/\/$/, "")}/${EXECUTION_LOG_ENTITY_SET}`;
  const response = await fetch(url, {
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
    const code = body?.error?.code || response.status;
    const msg = body?.error?.message || `HTTP ${response.status}`;
    throw Object.assign(new Error(`Dataverse POST failed (${EXECUTION_LOG_ENTITY_SET}): ${msg}`), {
      safeCode: "DATAVERSE_WRITE_FAILED",
      httpStatus: response.status,
      dvCode: code
    });
  }
  return {
    id: normalizeString(body.jm1_executionlogid) || null,
    etag: normalizeString(body["@odata.etag"]) || null
  };
}

function buildPublisherDecisionExecutionLogPayload({ diagnosticId, intakeReferenceCode, opportunityId, option, fields, notes, completedAt }) {
  const actionDescription = [
    "PUBLISHER REVIEW DECISION recorded — Jackie Smith Jr. acting in PUBLISHER/CEO capacity, NOT as Author. " +
      "This is not an author-side approval.",
    `Intake ${intakeReferenceCode}, Opportunity ${opportunityId}.`,
    `Decision option: ${option} (${PUBLISHER_DECISION_OPTION_LABEL[option] || "unknown"}).`,
    fields.recommendedImprint != null
      ? `Recommended imprint set to: ${RECOMMENDED_IMPRINT_LABELS[fields.recommendedImprint] || fields.recommendedImprint}.`
      : "No imprint set by this decision.",
    `Imprint locked: ${fields.imprintLocked === true}.`,
    notes ? `Publisher notes: ${notes}.` : null,
    "No manuscript excerpts, raw AI output, or prompt text included in this record.",
    "No contract generated, no author-facing send, no Stripe/payment/production/distribution/launch/royalty/marketing action occurred."
  ].filter(Boolean).join(" ");

  return {
    jm1_name: `PUBLISHER-REVIEW-DECISION-${diagnosticId}`,
    jm1_actiondescription: actionDescription.slice(0, 1000),
    jm1_actiontype: EVENT_TYPE,
    jm1_agentname: AGENT_NAME,
    jm1_agentmodel: AGENT_MODEL_NAME,
    jm1_bandlevel: BAND_LEVEL.BAND_1,
    jm1_executionstatus: EXECUTION_STATUS.SUCCESS,
    jm1_startedon: completedAt,
    jm1_completedon: completedAt,
    jm1_sourceentity: SOURCE_ENTITY,
    jm1_sourcerecordid: diagnosticId
  };
}

/**
 * Records a Publisher Review Decision for the given controlled record.
 * Requires JM1_PUBLISHER_REVIEW_DECISION_ENABLED="true", checked fresh
 * on every call. Writes the allowlisted decision fields to the
 * Diagnostic record only (never the Opportunity), and writes one safe
 * execution-log evidence record explicitly identifying the decision as
 * a Publisher-capacity decision.
 *
 * @param {{
 *   diagnosticId: string, intakeReferenceCode: string, opportunityId?: string,
 *   decisionOption: string, recommendedImprint?: number|null,
 *   lockImprint?: boolean, notes?: string|null
 * }} input
 * @param {{ getToken?: Function }} [deps]
 * @returns {Promise<object>}
 */
async function recordPublisherReviewDecision(input = {}, deps = {}) {
  const resolveToken = deps.getToken || getDataverseToken;

  if (!isPlainObject(input)) return blocked("INVALID_INPUT");

  const diagnosticId = normalizeString(input.diagnosticId);
  const intakeReferenceCode = normalizeString(input.intakeReferenceCode);
  const opportunityId = normalizeString(input.opportunityId);
  const decisionOption = normalizeString(input.decisionOption).toUpperCase();
  const notes = normalizeString(input.notes) || null;

  if (!diagnosticId || !DIAGNOSTIC_ID_PATTERN.test(diagnosticId)) return blocked("DIAGNOSTIC_ID_INVALID");
  if (!intakeReferenceCode || !INTAKE_REFERENCE_PATTERN.test(intakeReferenceCode)) return blocked("INTAKE_REFERENCE_CODE_INVALID");
  if (!Object.values(PUBLISHER_DECISION_OPTION).includes(decisionOption)) return blocked("DECISION_OPTION_INVALID");

  const requiresImprint = OPTIONS_REQUIRING_IMPRINT.includes(decisionOption);
  const recommendedImprint = input.recommendedImprint ?? null;
  if (requiresImprint) {
    if (recommendedImprint == null || !(recommendedImprint in RECOMMENDED_IMPRINT_LABELS)) {
      return blocked("RECOMMENDED_IMPRINT_REQUIRED_FOR_THIS_OPTION");
    }
  }

  if (!isGateOpen()) return blocked("GATE_CLOSED", { gate: GATE_NAME });

  const apiBase = process.env.DATAVERSE_WEB_API_BASE_URL;
  const resourceUrl = process.env.DATAVERSE_RESOURCE_URL;
  if (!apiBase || !resourceUrl) return blocked("DATAVERSE_CONFIG_MISSING");

  let token;
  try {
    token = await resolveToken(resourceUrl);
  } catch (err) {
    return blocked(err.safeCode || "DATAVERSE_AUTH_FAILED");
  }

  const fields = mapPublisherDecisionToFields(decisionOption, {
    recommendedImprint: requiresImprint ? recommendedImprint : null,
    lockImprint: input.lockImprint !== false
  });

  const diagnosticPayload = {
    jm1pub_diagnosticstatus: fields.diagnosticStatus,
    jm1pub_humandecision: fields.humanDecision,
    jm1pub_imprintlocked: fields.imprintLocked
  };
  if (fields.jackieDecision != null) {
    diagnosticPayload.jm1pub_jackiedecision = fields.jackieDecision;
  }
  if (fields.recommendedImprint != null) {
    diagnosticPayload.jm1pub_recommendedimprint = fields.recommendedImprint;
  }

  let patchResult;
  try {
    patchResult = await patchDataverseRecord(apiBase, token, DIAGNOSTIC_ENTITY_SET, diagnosticId, diagnosticPayload);
  } catch (err) {
    return blocked(err.safeCode || "DATAVERSE_PATCH_FAILED", { httpStatus: err.httpStatus || null });
  }

  const completedAt = new Date().toISOString();
  const executionLogPayload = buildPublisherDecisionExecutionLogPayload({
    diagnosticId, intakeReferenceCode, opportunityId, option: decisionOption, fields, notes, completedAt
  });

  let executionLog;
  try {
    const result = await postExecutionLogRecord(apiBase, token, executionLogPayload);
    executionLog = { created: true, id: result.id, error: null, diagnostics: null };
  } catch (err) {
    executionLog = { created: false, id: null, error: err.safeCode || "DATAVERSE_WRITE_FAILED", diagnostics: classifyDataverseWriteError(err) };
  }

  return {
    ok: true,
    code: "PUBLISHER_REVIEW_DECISION_RECORDED",
    diagnosticId,
    intakeReferenceCode,
    opportunityId,
    decisionOption,
    decisionCapacity: "PUBLISHER",
    fieldsWritten: diagnosticPayload,
    agreementReadinessAfterDecision: (fields.imprintLocked === true && fields.recommendedImprint != null)
      ? "READY_FOR_AGREEMENT_PENDING_GATE_RECHECK"
      : "BLOCKED_HUMAN_REVIEW_REQUIRED",
    diagnosticRecordEtag: patchResult.etag,
    executionLog,
    gateUsed: GATE_NAME,
    liveActions: {
      updatedDiagnosticRecord: true,
      updatedOpportunity: false,
      generatedAgreement: false,
      sentAuthorFacingOutput: false,
      createsPaymentLink: false,
      startsProduction: false,
      activatesFlowD: false
    }
  };
}

module.exports = {
  buildPublisherReviewPacket,
  mapPublisherDecisionToFields,
  recordPublisherReviewDecision,
  buildPublisherDecisionExecutionLogPayload,
  PUBLISHER_DECISION_OPTION,
  PUBLISHER_DECISION_OPTION_LABEL,
  OPTIONS_REQUIRING_IMPRINT,
  GATE_NAME,
  EVENT_TYPE
};
