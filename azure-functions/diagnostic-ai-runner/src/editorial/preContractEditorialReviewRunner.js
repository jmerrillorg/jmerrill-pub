"use strict";

/**
 * Pre-contract editorial review runner.
 *
 * Manual standard: J Merrill Publishing performs editorial review as soon
 * as the manuscript is received — that review considers the manuscript
 * ITSELF, not only intake/genre metadata, and determines fit, package
 * support, and recommended imprint BEFORE the contract is prepared. The
 * recommended imprint is locked by default unless the title is a JM
 * Signature candidate or a defined exception.
 *
 * Revision note: an earlier version of this runner determined the
 * imprint from structured metadata (genre text, manuscript work type)
 * alone and routed anything that didn't match a narrow keyword rule to
 * human review as "ambiguous" — even when the manuscript itself was
 * available and unread. That is too conservative: the system has access
 * to the manuscript and must read it before declaring ambiguity. This
 * version performs a governed, content-aware review (see
 * manuscriptEditorialReviewProvider.js) using the actual manuscript text
 * whenever no pre-existing Signature signal already exists. Metadata
 * (genre, work type) is passed to the reviewer as CONTEXT only — it is
 * never the sole basis for the imprint decision.
 *
 * Safety boundaries preserved from the prior version:
 *   - Manuscript content is downloaded via the existing, already-governed
 *     fetchAndExtractManuscript path. It is used to (a) read the official
 *     word count and (b) build the one-time prompt sent to the content
 *     review provider, then discarded immediately — never logged, never
 *     stored, never returned, never included in any Dataverse write.
 *   - The AI provider call is tool-forced (see
 *     manuscriptEditorialReviewProvider.js) — the model cannot return
 *     freeform text, only a structured, schema-validated, no-quotation-
 *     validated result. Raw model HTTP response bodies are never stored.
 *   - Execution-log evidence stores only the validated-safe summary/risk
 *     labels, the decision, and the confidence — never raw manuscript
 *     text, never raw model output, never a full manuscript excerpt.
 *   - This run never writes to the Opportunity, never generates an
 *     agreement, never sends anything author-facing, never creates a
 *     payment link, never starts production.
 */

const { fetchAndExtractManuscript } = require("../extraction/pilotContentExtractor");
const { verifyManuscriptWordCount } = require("../author/manuscriptWordCountVerification");
const {
  patchDataverseRecord,
  getDataverseToken
} = require("../dataverse/authorDraftPersistenceClient");
const { DIAGNOSTIC_ID_PATTERN, INTAKE_REFERENCE_PATTERN } = require("../queue/diagnosticQueueSelector");
const { AGENT_NAME, BAND_LEVEL, EXECUTION_STATUS, SOURCE_ENTITY } = require("../dataverse/metadataWriter");
const { classifyDataverseWriteError } = require("../author/milestone6OpportunityWriter");
const { DIAGNOSTIC_STATUS, RECOMMENDED_IMPRINT, RECOMMENDED_IMPRINT_LABELS } = require("./preContractEditorialReviewGate");
const editorialReviewProvider = require("./manuscriptEditorialReviewProvider");
const { validateEditorialReviewSchema } = require("./manuscriptEditorialReviewSchemaValidator");
const { validateNoQuotation } = require("../validation/noQuotationValidator");

const GATE_NAME = "JM1_PRE_CONTRACT_EDITORIAL_REVIEW_RUN_ENABLED";
const DIAGNOSTIC_ENTITY_SET = "jm1pub_editorialdiagnostics";
const EXECUTION_LOG_ENTITY_SET = "jm1_executionlogs";
const EVENT_TYPE = "PRE_CONTRACT_EDITORIAL_REVIEW_PERFORMED";
const AGENT_MODEL_NAME = "pre-contract-editorial-review-runner";

// Below this, an AI-recommended imprint is not auto-locked — routed to
// human review instead, even when fitDecision is GOOD_FIT.
const IMPRINT_CONFIDENCE_AUTOLOCK_THRESHOLD = 0.6;
const IMPRINT_CONFIDENCE_HIGH_THRESHOLD = 0.8;

// Confirmed against live Dataverse picklist metadata for
// jm1pub_editorialdiagnostic.jm1pub_worktype (and the identical option
// set on jm1_publishingintake.jm1_manuscripttype), 2026-06-21.
const MANUSCRIPT_WORK_TYPE = Object.freeze({
  FULL_LENGTH_BOOK: 196650000,
  NOVELLA: 196650001,
  CHILDRENS_PICTURE_BOOK: 196650002,
  POETRY_COLLECTION: 196650003,
  DEVOTIONAL: 196650004,
  WORKBOOK_JOURNAL: 196650005,
  SHORT_STORY_COLLECTION: 196650006,
  OTHER: 196650007
});

const MANUSCRIPT_WORK_TYPE_LABELS = Object.freeze({
  [MANUSCRIPT_WORK_TYPE.FULL_LENGTH_BOOK]: "Full-length Book",
  [MANUSCRIPT_WORK_TYPE.NOVELLA]: "Novella",
  [MANUSCRIPT_WORK_TYPE.CHILDRENS_PICTURE_BOOK]: "Children's Picture Book",
  [MANUSCRIPT_WORK_TYPE.POETRY_COLLECTION]: "Poetry Collection",
  [MANUSCRIPT_WORK_TYPE.DEVOTIONAL]: "Devotional",
  [MANUSCRIPT_WORK_TYPE.WORKBOOK_JOURNAL]: "Workbook / Journal",
  [MANUSCRIPT_WORK_TYPE.SHORT_STORY_COLLECTION]: "Short Story Collection",
  [MANUSCRIPT_WORK_TYPE.OTHER]: "Other"
});

// Confirmed against live Dataverse picklist metadata for
// jm1pub_editorialdiagnostic.jm1pub_recommendedpackage, 2026-06-21.
const RECOMMENDED_PACKAGE = Object.freeze({
  STARTER: 196650000,
  PROFESSIONAL: 196650001,
  SIGNATURE_PACKAGE: 196650002,
  JM_PRESTIGE_STANDARD: 196650003,
  JM_PRESTIGE_PREMIUM: 196650004,
  EDITORIAL_EVALUATION_ONLY: 196650005,
  EDITORIAL_SERVICES_ONLY: 196650006,
  DISTRIBUTION_ONLY: 196650007,
  DECLINE: 196650008
});

const PACKAGE_CODE_TO_RECOMMENDED_PACKAGE = Object.freeze({
  "JMP-PKG-STARTER": RECOMMENDED_PACKAGE.STARTER,
  "JMP-PKG-PRO": RECOMMENDED_PACKAGE.PROFESSIONAL,
  "JMP-PKG-SIGNATURE": RECOMMENDED_PACKAGE.SIGNATURE_PACKAGE
});

const IMPRINT_OUTCOME = Object.freeze({
  SIGNATURE_CANDIDATE: "SIGNATURE_CANDIDATE",
  AUTO_RECOMMENDED: "AUTO_RECOMMENDED",
  IMPRINT_AMBIGUOUS: "IMPRINT_AMBIGUOUS",
  NEEDS_HUMAN_REVIEW: "NEEDS_HUMAN_REVIEW"
});

const IMPRINT_CONFIDENCE = Object.freeze({ HIGH: "HIGH", MEDIUM: "MEDIUM" });

const HUMAN_REVIEW_REASON = Object.freeze({
  SIGNATURE_SIGNAL_PREEXISTING: "SIGNATURE_SIGNAL_PREEXISTING",
  SIGNATURE_CANDIDATE_DETECTED: "SIGNATURE_CANDIDATE_DETECTED",
  LOW_CONFIDENCE: "LOW_CONFIDENCE",
  RIGHTS_OR_DISCLOSURE_RISK: "RIGHTS_OR_DISCLOSURE_RISK",
  NOT_A_FIT_OR_RISK_FLAGGED: "NOT_A_FIT_OR_RISK_FLAGGED",
  AMBIGUOUS_AFTER_CONTENT_REVIEW: "AMBIGUOUS_AFTER_CONTENT_REVIEW",
  AI_REVIEW_TECHNICAL_FAILURE: "AI_REVIEW_TECHNICAL_FAILURE",
  PACKAGE_MISMATCH: "PACKAGE_MISMATCH"
});

// Maps the model's string imprint code to the numeric Dataverse picklist
// value. SIGNATURE_CANDIDATE and AMBIGUOUS deliberately have no numeric
// mapping — neither is ever written to jm1pub_recommendedimprint.
const AI_IMPRINT_CODE_TO_RECOMMENDED_IMPRINT = Object.freeze({
  [editorialReviewProvider.IMPRINT_CODE.J_MERRILL_PUBLISHING]: RECOMMENDED_IMPRINT.J_MERRILL_PUBLISHING,
  [editorialReviewProvider.IMPRINT_CODE.JM_WORKS]: RECOMMENDED_IMPRINT.JM_WORKS,
  [editorialReviewProvider.IMPRINT_CODE.JM_LITTLE]: RECOMMENDED_IMPRINT.JM_LITTLE,
  [editorialReviewProvider.IMPRINT_CODE.JM_VERSE]: RECOMMENDED_IMPRINT.JM_VERSE
});

const AGREEMENT_READINESS_STATUS = Object.freeze({
  READY_FOR_AGREEMENT: "READY_FOR_AGREEMENT",
  BLOCKED_HUMAN_REVIEW_REQUIRED: "BLOCKED_HUMAN_REVIEW_REQUIRED",
  BLOCKED_PACKAGE_MISMATCH: "BLOCKED_PACKAGE_MISMATCH"
});

// Internal scorecard category keys exposed on the runner's return value
// and execution-log evidence — distinct names from the AI tool's own
// field names so callers cannot confuse "what the model returned" with
// "the validated, structured scorecard this module produces."
const SCORECARD_CATEGORY_LABEL = Object.freeze({
  manuscriptFit: "Manuscript fit",
  packageFit: "Package fit",
  imprintFit: "Imprint fit",
  editorialReadiness: "Editorial readiness",
  productionComplexity: "Production complexity",
  audienceMarketClarity: "Audience/market clarity",
  faithMissionAlignment: "Faith/mission alignment"
});

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
  return { ok: false, code: "PRE_CONTRACT_EDITORIAL_REVIEW_RUN_BLOCKED", reason, ...extra };
}

function notAutoLockedDecision(outcome, humanReviewReason, rationale) {
  return {
    outcome,
    recommendedImprint: null,
    recommendedImprintLabel: null,
    confidence: null,
    autoLock: false,
    requiresHumanDecision: true,
    humanReviewReason,
    rationale: Array.isArray(rationale) ? rationale : [rationale]
  };
}

/**
 * Signature-signal short-circuit only. Used exclusively when the
 * Diagnostic record already carries an explicit
 * jm1pub_signaturereviewrequired=true signal — in that case content-aware
 * AI review is skipped entirely (the routing decision is already made)
 * and this function simply formalizes the resulting decision shape.
 *
 * This is NOT a metadata-only imprint determiner for the general case —
 * for every other case the runner performs a content-aware review (see
 * mapAiReviewToImprintDecision below) rather than guessing from
 * structured metadata alone.
 */
function determineImprintRecommendation(input = {}) {
  const signatureSignal = isPlainObject(input) ? input.signatureReviewRequiredSignal === true : false;
  if (signatureSignal) {
    return notAutoLockedDecision(
      IMPRINT_OUTCOME.SIGNATURE_CANDIDATE,
      HUMAN_REVIEW_REASON.SIGNATURE_SIGNAL_PREEXISTING,
      "Existing signatureReviewRequired signal is true — routed to human review, not auto-locked."
    );
  }
  return notAutoLockedDecision(
    IMPRINT_OUTCOME.NEEDS_HUMAN_REVIEW,
    HUMAN_REVIEW_REASON.AI_REVIEW_TECHNICAL_FAILURE,
    "determineImprintRecommendation was called without a pre-existing Signature signal — content-aware review is required and was not performed."
  );
}

/**
 * Maps a schema-validated, no-quotation-validated AI content review
 * output to the same imprint-decision shape used throughout this module.
 * Pure — no I/O.
 *
 * @param {object} aiOutput — validated submit_precontract_editorial_review tool output
 * @returns {{ outcome: string, recommendedImprint: number|null, recommendedImprintLabel: string|null,
 *   confidence: string|null, autoLock: boolean, requiresHumanDecision: boolean,
 *   humanReviewReason: string|null, rationale: string[], aiConfidenceScore: number,
 *   aiFitDecision: string, editorialFitSummary: string, editorialRiskFlags: string }}
 */
function mapAiReviewToImprintDecision(aiOutput) {
  const code = aiOutput.jm1pub_recommendedimprintcode;
  const score = aiOutput.jm1pub_imprintconfidence;
  const fitDecision = aiOutput.jm1pub_fitdecision;
  const signatureCandidacy = aiOutput.jm1pub_signaturecandidacy === true;
  const rightsFlag = aiOutput.jm1pub_rightsdisclosureflag === true;
  const editorialFitSummary = aiOutput.jm1pub_editorialfitsummary;
  const editorialRiskFlags = aiOutput.jm1pub_editorialriskflags;

  const shared = { aiConfidenceScore: score, aiFitDecision: fitDecision, editorialFitSummary, editorialRiskFlags };

  if (signatureCandidacy || code === editorialReviewProvider.IMPRINT_CODE.SIGNATURE_CANDIDATE) {
    return {
      ...notAutoLockedDecision(
        IMPRINT_OUTCOME.SIGNATURE_CANDIDATE,
        HUMAN_REVIEW_REASON.SIGNATURE_CANDIDATE_DETECTED,
        "Content-aware review flagged possible JM Signature candidacy — routed to human Publisher review, not auto-locked."
      ),
      ...shared
    };
  }

  if (rightsFlag) {
    return {
      ...notAutoLockedDecision(
        IMPRINT_OUTCOME.NEEDS_HUMAN_REVIEW,
        HUMAN_REVIEW_REASON.RIGHTS_OR_DISCLOSURE_RISK,
        "Content-aware review flagged a rights/AI-disclosure/content-risk issue — requires human review."
      ),
      ...shared
    };
  }

  if (fitDecision !== editorialReviewProvider.FIT_DECISION.GOOD_FIT) {
    return {
      ...notAutoLockedDecision(
        IMPRINT_OUTCOME.NEEDS_HUMAN_REVIEW,
        HUMAN_REVIEW_REASON.NOT_A_FIT_OR_RISK_FLAGGED,
        `Content-aware review fit decision was ${fitDecision}, not GOOD_FIT — requires human review.`
      ),
      ...shared
    };
  }

  if (code === editorialReviewProvider.IMPRINT_CODE.AMBIGUOUS) {
    return {
      ...notAutoLockedDecision(
        IMPRINT_OUTCOME.IMPRINT_AMBIGUOUS,
        HUMAN_REVIEW_REASON.AMBIGUOUS_AFTER_CONTENT_REVIEW,
        "Content-aware review read the manuscript and still could not confidently determine an imprint — routed to human decision, not guessed."
      ),
      ...shared
    };
  }

  if (typeof score !== "number" || score < IMPRINT_CONFIDENCE_AUTOLOCK_THRESHOLD) {
    return {
      ...notAutoLockedDecision(
        IMPRINT_OUTCOME.NEEDS_HUMAN_REVIEW,
        HUMAN_REVIEW_REASON.LOW_CONFIDENCE,
        `Content-aware review confidence (${score}) is below the auto-lock threshold (${IMPRINT_CONFIDENCE_AUTOLOCK_THRESHOLD}) — requires human review.`
      ),
      ...shared
    };
  }

  const recommendedImprint = AI_IMPRINT_CODE_TO_RECOMMENDED_IMPRINT[code];
  if (recommendedImprint == null) {
    return {
      ...notAutoLockedDecision(
        IMPRINT_OUTCOME.NEEDS_HUMAN_REVIEW,
        HUMAN_REVIEW_REASON.AI_REVIEW_TECHNICAL_FAILURE,
        `Content-aware review returned an unrecognized imprint code (${code}) — requires human review.`
      ),
      ...shared
    };
  }

  return {
    outcome: IMPRINT_OUTCOME.AUTO_RECOMMENDED,
    recommendedImprint,
    recommendedImprintLabel: RECOMMENDED_IMPRINT_LABELS[recommendedImprint],
    confidence: score >= IMPRINT_CONFIDENCE_HIGH_THRESHOLD ? IMPRINT_CONFIDENCE.HIGH : IMPRINT_CONFIDENCE.MEDIUM,
    autoLock: true,
    requiresHumanDecision: false,
    humanReviewReason: null,
    rationale: [`Content-aware review recommends ${RECOMMENDED_IMPRINT_LABELS[recommendedImprint]} at confidence ${score} with fit decision GOOD_FIT — auto-locked.`],
    ...shared
  };
}

/**
 * Builds the internal-only diagnostic scorecard from a schema-validated,
 * no-quotation-validated AI review output. JMP/system use only — never
 * included in any author-facing send. Pure — no I/O.
 *
 * @param {object} aiOutput — validated submit_precontract_editorial_review tool output
 * @returns {{
 *   manuscriptFit: number, packageFit: number, imprintFit: number,
 *   editorialReadiness: number, productionComplexity: number,
 *   audienceMarketClarity: number, faithMissionAlignment: number|null,
 *   overallScore: number, riskFlags: string, signatureCandidacy: boolean,
 *   requiresHumanReview: boolean, fitSummary: string
 * }}
 */
function buildInternalDiagnosticScorecard(aiOutput) {
  const { SCORE_CATEGORY } = editorialReviewProvider;
  const categories = {
    manuscriptFit: aiOutput[SCORE_CATEGORY.MANUSCRIPT_FIT],
    packageFit: aiOutput[SCORE_CATEGORY.PACKAGE_FIT],
    imprintFit: aiOutput[SCORE_CATEGORY.IMPRINT_FIT],
    editorialReadiness: aiOutput[SCORE_CATEGORY.EDITORIAL_READINESS],
    productionComplexity: aiOutput[SCORE_CATEGORY.PRODUCTION_COMPLEXITY],
    audienceMarketClarity: aiOutput[SCORE_CATEGORY.AUDIENCE_MARKET_CLARITY],
    faithMissionAlignment: aiOutput[SCORE_CATEGORY.FAITH_MISSION_ALIGNMENT] ?? null
  };

  const presentScores = Object.values(categories).filter((v) => typeof v === "number" && !Number.isNaN(v));
  const overallScore = presentScores.length > 0
    ? Math.round((presentScores.reduce((sum, v) => sum + v, 0) / presentScores.length) * 10) / 10
    : null;

  return {
    ...categories,
    overallScore,
    riskFlags: aiOutput.jm1pub_editorialriskflags,
    signatureCandidacy: aiOutput.jm1pub_signaturecandidacy === true,
    requiresHumanReview: aiOutput.jm1pub_requireshumanreview === true,
    fitSummary: aiOutput.jm1pub_editorialfitsummary
  };
}

/**
 * Builds the author-facing scoring summary from a schema-validated,
 * no-quotation-validated AI review output. Contains ONLY the four
 * dedicated author-facing fields — deliberately disjoint from the
 * internal scorecard (buildInternalDiagnosticScorecard above) so the two
 * can never be confused or merged. This summary is suitable for
 * inclusion in author communication once SEPARATELY gated and sent — it
 * is not sent by this module. Pure — no I/O.
 *
 * @param {object} aiOutput — validated submit_precontract_editorial_review tool output
 * @returns {{ summary: string, strengths: string, supportNeeded: string, nextSteps: string }}
 */
function buildAuthorFacingScoringSummary(aiOutput) {
  const { AUTHOR_FACING_FIELD } = editorialReviewProvider;
  return {
    summary: aiOutput[AUTHOR_FACING_FIELD.SUMMARY],
    strengths: aiOutput[AUTHOR_FACING_FIELD.STRENGTHS],
    supportNeeded: aiOutput[AUTHOR_FACING_FIELD.SUPPORT_NEEDED],
    nextSteps: aiOutput[AUTHOR_FACING_FIELD.NEXT_STEPS]
  };
}

/**
 * Pure composer — combines word-count/package-fit validation with an
 * already-resolved imprint decision (from either the Signature-signal
 * short-circuit or a content-aware AI review) into one overall
 * pre-contract review result. No I/O, no manuscript content.
 */
function composePreContractEditorialReview(input = {}) {
  const wordCountResult = verifyManuscriptWordCount({
    selectedPackageCode: input.selectedPackageCode,
    officialManuscriptWordCount: input.officialManuscriptWordCount,
    intakeEstimatedWordCount: input.intakeEstimatedWordCount ?? null
  });

  const imprintResult = input.imprintDecision;
  const fitConfirmed = wordCountResult.ok && wordCountResult.withinPackageScope !== false;
  const readyForAutoLock = fitConfirmed && imprintResult.autoLock === true && imprintResult.recommendedImprint != null;
  const requiresHumanDecision = !fitConfirmed || imprintResult.requiresHumanDecision === true;
  const humanReviewReason = !fitConfirmed && imprintResult.autoLock === true
    ? HUMAN_REVIEW_REASON.PACKAGE_MISMATCH
    : imprintResult.humanReviewReason || null;

  const agreementReadinessStatus = readyForAutoLock
    ? AGREEMENT_READINESS_STATUS.READY_FOR_AGREEMENT
    : (humanReviewReason === HUMAN_REVIEW_REASON.PACKAGE_MISMATCH
      ? AGREEMENT_READINESS_STATUS.BLOCKED_PACKAGE_MISMATCH
      : AGREEMENT_READINESS_STATUS.BLOCKED_HUMAN_REVIEW_REQUIRED);

  return {
    wordCountResult,
    imprintResult,
    fitConfirmed,
    readyForAutoLock,
    requiresHumanDecision,
    humanReviewReason,
    agreementReadinessStatus,
    internalScorecard: input.internalScorecard ?? null,
    authorFacingSummary: input.authorFacingSummary ?? null
  };
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

function formatScorecardSummary(scorecard) {
  if (!scorecard) return null;
  const parts = Object.entries(SCORECARD_CATEGORY_LABEL)
    .filter(([key]) => scorecard[key] != null)
    .map(([key, label]) => `${label} ${scorecard[key]}/10`);
  return `Scorecard (overall ${scorecard.overallScore}/10): ${parts.join(", ")}.`;
}

function buildEditorialReviewExecutionLogPayload({ diagnosticId, intakeReferenceCode, opportunityId, review, contentAwareReviewPerformed, completedAt }) {
  const actionDescription = [
    `Pre-contract editorial review performed by the pipeline for intake ${intakeReferenceCode}.`,
    `Opportunity ${opportunityId}. No Opportunity write occurs in this run.`,
    `Content-aware manuscript review performed: ${contentAwareReviewPerformed}.`,
    `Word count fit confirmed: ${review.fitConfirmed}.`,
    `Agreement readiness: ${review.agreementReadinessStatus}.`,
    `Imprint outcome: ${review.imprintResult.outcome}.`,
    review.imprintResult.recommendedImprintLabel
      ? `Recommended imprint: ${review.imprintResult.recommendedImprintLabel} (confidence: ${review.imprintResult.confidence}).`
      : "No imprint auto-recommended.",
    review.readyForAutoLock ? "Imprint auto-locked by the pipeline." : `Imprint NOT auto-locked — requires human decision (${review.humanReviewReason}).`,
    review.imprintResult.editorialFitSummary ? `Fit summary: ${review.imprintResult.editorialFitSummary}.` : null,
    review.imprintResult.editorialRiskFlags ? `Risk flags: ${review.imprintResult.editorialRiskFlags}.` : null,
    formatScorecardSummary(review.internalScorecard),
    "Author-facing scoring summary generated and held internally pending separate send approval — not sent in this run.",
    "Word count source: MANUSCRIPT_FILE (not the /join intake estimate).",
    "No raw manuscript text, raw AI/model output, prompt body, secrets, tokens, or headers stored.",
    "No contract generated, no author-facing send, no Stripe/payment/production/distribution/launch/royalty/marketing action occurred."
  ].filter(Boolean).join(" ");

  return {
    jm1_name: `PRE-CONTRACT-EDITORIAL-REVIEW-${diagnosticId}`,
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
 * Performs the content-aware pre-contract editorial review for the given
 * controlled record: reads existing structured fields, extracts the
 * manuscript (used for both the official word count and — unless a
 * Signature signal already exists — the content-aware review prompt;
 * content is discarded immediately after use), runs the governed AI
 * content reviewer, validates its output (schema + no-quotation), maps
 * the result to an imprint decision, writes the allowlisted result
 * fields back to the Diagnostic record (never the Opportunity), and
 * writes one safe execution-log evidence record.
 *
 * Requires JM1_PRE_CONTRACT_EDITORIAL_REVIEW_RUN_ENABLED="true", checked
 * fresh on every call.
 *
 * @param {{ diagnosticId: string, intakeReferenceCode: string, opportunityId: string, selectedPackageCode: string }} input
 * @param {{ getToken?: Function, extractManuscript?: Function, reviewManuscript?: Function }} [deps]
 * @returns {Promise<object>}
 */
async function runPreContractEditorialReview(input = {}, deps = {}) {
  const resolveToken = deps.getToken || getDataverseToken;
  const resolveExtract = deps.extractManuscript || fetchAndExtractManuscript;
  const resolveReview = deps.reviewManuscript || editorialReviewProvider.call;

  if (!isPlainObject(input)) return blocked("INVALID_INPUT");

  const diagnosticId = normalizeString(input.diagnosticId);
  const intakeReferenceCode = normalizeString(input.intakeReferenceCode);
  const opportunityId = normalizeString(input.opportunityId);
  const selectedPackageCode = normalizeString(input.selectedPackageCode).toUpperCase();

  if (!diagnosticId || !DIAGNOSTIC_ID_PATTERN.test(diagnosticId)) return blocked("DIAGNOSTIC_ID_INVALID");
  if (!intakeReferenceCode || !INTAKE_REFERENCE_PATTERN.test(intakeReferenceCode)) return blocked("INTAKE_REFERENCE_CODE_INVALID");
  if (!opportunityId) return blocked("OPPORTUNITY_ID_MISSING");
  if (!selectedPackageCode) return blocked("SELECTED_PACKAGE_CODE_MISSING");

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

  // Read existing structured fields only — never the manuscript URL is
  // logged, never raw AI output fields are selected.
  let diagnosticFields;
  try {
    const selectFields = [
      "jm1pub_worktype",
      "jm1pub_genreconfirmed",
      "jm1pub_signaturereviewrequired",
      "jm1_manuscriptasseturl",
      "jm1_manuscriptfiletype",
      "_jm1pub_publishingintake_value"
    ].join(",");
    const url = `${apiBase.replace(/\/$/, "")}/${DIAGNOSTIC_ENTITY_SET}(${diagnosticId})?$select=${selectFields}`;
    const response = await fetch(url, {
      method: "GET",
      headers: { "Authorization": `Bearer ${token}`, "Accept": "application/json", "OData-MaxVersion": "4.0", "OData-Version": "4.0" }
    });
    if (!response.ok) {
      throw Object.assign(new Error(`Dataverse read failed: HTTP ${response.status}`), { safeCode: "DATAVERSE_READ_FAILED", httpStatus: response.status });
    }
    diagnosticFields = await response.json();
  } catch (err) {
    return blocked(err.safeCode || "DATAVERSE_READ_FAILED", { httpStatus: err.httpStatus || null });
  }

  let workType = diagnosticFields.jm1pub_worktype ?? null;
  const genreConfirmed = normalizeString(diagnosticFields.jm1pub_genreconfirmed) || null;
  const signatureReviewRequiredSignal = diagnosticFields.jm1pub_signaturereviewrequired === true;
  const manuscriptUrl = diagnosticFields.jm1_manuscriptasseturl;
  const fileTypeHint = diagnosticFields.jm1_manuscriptfiletype ? `.${diagnosticFields.jm1_manuscriptfiletype}` : null;
  const intakeId = diagnosticFields._jm1pub_publishingintake_value || null;

  let workTypeSourcedFromIntakeFallback = false;
  if (workType == null && intakeId) {
    try {
      const intakeUrl = `${apiBase.replace(/\/$/, "")}/jm1_publishingintakes(${intakeId})?$select=jm1_manuscripttype`;
      const intakeResponse = await fetch(intakeUrl, {
        method: "GET",
        headers: { "Authorization": `Bearer ${token}`, "Accept": "application/json", "OData-MaxVersion": "4.0", "OData-Version": "4.0" }
      });
      if (intakeResponse.ok) {
        const intakeBody = await intakeResponse.json();
        if (intakeBody.jm1_manuscripttype != null) {
          workType = intakeBody.jm1_manuscripttype;
          workTypeSourcedFromIntakeFallback = true;
        }
      }
    } catch {
      // Fallback read failure is non-fatal — workType simply remains null.
    }
  }

  if (!manuscriptUrl) {
    return blocked("MANUSCRIPT_URL_NOT_AVAILABLE");
  }

  // Extract the manuscript to obtain (a) the official word count and,
  // unless a Signature signal already exists, (b) the content used for
  // the content-aware review prompt. The extracted content is cleared
  // immediately after the prompt is built (or immediately after the
  // word count is read, if no AI call is made) — it is never logged,
  // stored, or included in any return value or Dataverse write.
  let extractResult;
  try {
    extractResult = await resolveExtract(manuscriptUrl, { fileTypeHint });
  } catch (err) {
    return blocked("MANUSCRIPT_EXTRACTION_FAILED", { detail: err.safeCode || null });
  }
  if (!extractResult.ok) {
    return blocked(`MANUSCRIPT_EXTRACTION_FAILED:${extractResult.code}`);
  }
  const officialManuscriptWordCount = extractResult.metadata.wordCount;

  let imprintDecision;
  let internalScorecard = null;
  let authorFacingSummary = null;
  let contentAwareReviewPerformed = false;

  if (signatureReviewRequiredSignal) {
    extractResult.content = null; // discard immediately — content not needed for this path
    imprintDecision = determineImprintRecommendation({ signatureReviewRequiredSignal: true });
  } else {
    contentAwareReviewPerformed = true;
    const promptBody = editorialReviewProvider.buildEditorialReviewPrompt({
      manuscriptContent: extractResult.content,
      genreConfirmed,
      workTypeLabel: MANUSCRIPT_WORK_TYPE_LABELS[workType] || null
    });
    extractResult.content = null; // discard immediately after the prompt is built — never stored, logged, or returned

    let aiCallResult;
    try {
      aiCallResult = await resolveReview({ promptBody });
    } catch (err) {
      aiCallResult = { ok: false, output: null, error: `AI_REVIEW_CALL_EXCEPTION:${err.safeCode || ""}` };
    }

    if (!aiCallResult.ok) {
      imprintDecision = notAutoLockedDecision(
        IMPRINT_OUTCOME.NEEDS_HUMAN_REVIEW,
        HUMAN_REVIEW_REASON.AI_REVIEW_TECHNICAL_FAILURE,
        `Content-aware AI review call failed (${aiCallResult.error}) — requires human review. Never auto-locked on a technical failure.`
      );
    } else {
      const schemaResult = validateEditorialReviewSchema(aiCallResult.output);
      if (!schemaResult.valid) {
        imprintDecision = notAutoLockedDecision(
          IMPRINT_OUTCOME.NEEDS_HUMAN_REVIEW,
          HUMAN_REVIEW_REASON.AI_REVIEW_TECHNICAL_FAILURE,
          `Content-aware AI review output failed schema validation (${schemaResult.errors.join(", ")}) — requires human review.`
        );
      } else {
        const { AUTHOR_FACING_FIELD } = editorialReviewProvider;
        const quotationResult = validateNoQuotation({
          jm1pub_editorialfitsummary: aiCallResult.output.jm1pub_editorialfitsummary,
          jm1pub_editorialriskflags: aiCallResult.output.jm1pub_editorialriskflags,
          [AUTHOR_FACING_FIELD.SUMMARY]: aiCallResult.output[AUTHOR_FACING_FIELD.SUMMARY],
          [AUTHOR_FACING_FIELD.STRENGTHS]: aiCallResult.output[AUTHOR_FACING_FIELD.STRENGTHS],
          [AUTHOR_FACING_FIELD.SUPPORT_NEEDED]: aiCallResult.output[AUTHOR_FACING_FIELD.SUPPORT_NEEDED],
          [AUTHOR_FACING_FIELD.NEXT_STEPS]: aiCallResult.output[AUTHOR_FACING_FIELD.NEXT_STEPS]
        });
        if (!quotationResult.valid) {
          imprintDecision = notAutoLockedDecision(
            IMPRINT_OUTCOME.NEEDS_HUMAN_REVIEW,
            HUMAN_REVIEW_REASON.AI_REVIEW_TECHNICAL_FAILURE,
            "Content-aware AI review output failed the no-quotation safety check — requires human review. Violating text is not stored."
          );
        } else {
          imprintDecision = mapAiReviewToImprintDecision(aiCallResult.output);
          internalScorecard = buildInternalDiagnosticScorecard(aiCallResult.output);
          authorFacingSummary = buildAuthorFacingScoringSummary(aiCallResult.output);
        }
      }
    }
  }

  const review = composePreContractEditorialReview({
    selectedPackageCode,
    officialManuscriptWordCount,
    intakeEstimatedWordCount: null,
    imprintDecision,
    internalScorecard,
    authorFacingSummary
  });

  // Build the allowlisted PATCH payload for the Diagnostic record only.
  const diagnosticPayload = {};
  if (review.readyForAutoLock) {
    diagnosticPayload.jm1pub_diagnosticstatus = DIAGNOSTIC_STATUS.COMPLETE;
    diagnosticPayload.jm1pub_recommendedimprint = review.imprintResult.recommendedImprint;
    diagnosticPayload.jm1pub_imprintlocked = true;
    diagnosticPayload.jm1pub_signaturereviewrequired = false;
  } else {
    diagnosticPayload.jm1pub_diagnosticstatus = DIAGNOSTIC_STATUS.AWAITING_JACKIE_REVIEW;
    diagnosticPayload.jm1pub_imprintlocked = false;
    if (review.imprintResult.outcome === IMPRINT_OUTCOME.SIGNATURE_CANDIDATE) {
      diagnosticPayload.jm1pub_signaturereviewrequired = true;
    }
  }
  if (review.fitConfirmed && selectedPackageCode in PACKAGE_CODE_TO_RECOMMENDED_PACKAGE) {
    diagnosticPayload.jm1pub_recommendedpackage = PACKAGE_CODE_TO_RECOMMENDED_PACKAGE[selectedPackageCode];
  }
  if (workTypeSourcedFromIntakeFallback && workType != null) {
    diagnosticPayload.jm1pub_worktype = workType;
  }

  let patchResult;
  try {
    patchResult = await patchDataverseRecord(apiBase, token, DIAGNOSTIC_ENTITY_SET, diagnosticId, diagnosticPayload);
  } catch (err) {
    return blocked(err.safeCode || "DATAVERSE_PATCH_FAILED", { httpStatus: err.httpStatus || null });
  }

  const completedAt = new Date().toISOString();
  const executionLogPayload = buildEditorialReviewExecutionLogPayload({
    diagnosticId, intakeReferenceCode, opportunityId, review, contentAwareReviewPerformed, completedAt
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
    code: review.readyForAutoLock ? "PRE_CONTRACT_EDITORIAL_REVIEW_AUTO_LOCKED" : "PRE_CONTRACT_EDITORIAL_REVIEW_REQUIRES_HUMAN_DECISION",
    diagnosticId,
    intakeReferenceCode,
    opportunityId,
    officialManuscriptWordCount,
    wordCountSource: "MANUSCRIPT_FILE",
    contentAwareReviewPerformed,
    fitConfirmed: review.fitConfirmed,
    imprintOutcome: review.imprintResult.outcome,
    recommendedImprintLabel: review.imprintResult.recommendedImprintLabel,
    imprintConfidence: review.imprintResult.confidence,
    aiConfidenceScore: review.imprintResult.aiConfidenceScore ?? null,
    aiFitDecision: review.imprintResult.aiFitDecision ?? null,
    editorialFitSummary: review.imprintResult.editorialFitSummary ?? null,
    editorialRiskFlags: review.imprintResult.editorialRiskFlags ?? null,
    imprintAutoLocked: review.readyForAutoLock,
    requiresHumanDecision: review.requiresHumanDecision,
    humanReviewReason: review.humanReviewReason,
    agreementReadinessStatus: review.agreementReadinessStatus,
    internalScorecard: review.internalScorecard,
    authorFacingSummary: review.authorFacingSummary,
    diagnosticRecordEtag: patchResult.etag,
    fieldsUpdated: Object.keys(diagnosticPayload),
    executionLog,
    gateUsed: GATE_NAME,
    liveActions: {
      readDiagnosticRecord: true,
      readIntakeRecord: workTypeSourcedFromIntakeFallback,
      readManuscriptForContentAwareReview: contentAwareReviewPerformed,
      readManuscriptForWordCountOnly: !contentAwareReviewPerformed,
      calledContentAwareAiReview: contentAwareReviewPerformed,
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
  runPreContractEditorialReview,
  composePreContractEditorialReview,
  determineImprintRecommendation,
  mapAiReviewToImprintDecision,
  buildInternalDiagnosticScorecard,
  buildAuthorFacingScoringSummary,
  buildEditorialReviewExecutionLogPayload,
  GATE_NAME,
  MANUSCRIPT_WORK_TYPE,
  MANUSCRIPT_WORK_TYPE_LABELS,
  RECOMMENDED_PACKAGE,
  PACKAGE_CODE_TO_RECOMMENDED_PACKAGE,
  IMPRINT_OUTCOME,
  IMPRINT_CONFIDENCE,
  HUMAN_REVIEW_REASON,
  AGREEMENT_READINESS_STATUS,
  SCORECARD_CATEGORY_LABEL,
  IMPRINT_CONFIDENCE_AUTOLOCK_THRESHOLD,
  IMPRINT_CONFIDENCE_HIGH_THRESHOLD,
  AI_IMPRINT_CODE_TO_RECOMMENDED_IMPRINT,
  EVENT_TYPE
};
