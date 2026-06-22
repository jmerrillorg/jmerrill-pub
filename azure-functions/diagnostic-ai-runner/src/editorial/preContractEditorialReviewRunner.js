"use strict";

/**
 * Pre-contract editorial review runner.
 *
 * Manual standard: J Merrill Publishing performs editorial review as soon
 * as the manuscript is received — that review determines fit, package
 * support, and recommended imprint BEFORE the contract is prepared. The
 * pipeline must perform this review itself, not wait for a human to
 * manually pick an imprint by default.
 *
 * Default behavior: for non-Signature candidates, the pipeline recommends
 * AND locks the imprint automatically. Human review is required only when
 * a title is a JM Signature candidate (or the imprint cannot be
 * confidently determined from structured signals — this module never
 * guesses an imprint from genre text alone; ambiguous cases are routed to
 * human decision, the same as Signature candidates).
 *
 * Entirely deterministic and rule-based — no AI/model call exists in this
 * module. This is a deliberate design choice: the imprint decision is
 * legally/brand consequential, and a rules-based, fully auditable engine
 * is safer here than another AI inference step.
 *
 * Never logs or stores manuscript text. The manuscript is downloaded via
 * the existing, already-governed fetchAndExtractManuscript path solely to
 * obtain the word count; the extracted content is discarded immediately
 * after the count is read and is never included in any return value or
 * Dataverse write.
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

const GATE_NAME = "JM1_PRE_CONTRACT_EDITORIAL_REVIEW_RUN_ENABLED";
const DIAGNOSTIC_ENTITY_SET = "jm1pub_editorialdiagnostics";
const EXECUTION_LOG_ENTITY_SET = "jm1_executionlogs";
const EVENT_TYPE = "PRE_CONTRACT_EDITORIAL_REVIEW_PERFORMED";
const AGENT_MODEL_NAME = "pre-contract-editorial-review-runner";

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
  IMPRINT_AMBIGUOUS: "IMPRINT_AMBIGUOUS"
});

const IMPRINT_CONFIDENCE = Object.freeze({ HIGH: "HIGH", MEDIUM: "MEDIUM" });

// Narrow, explicit keyword sets only — never a broad/implicit genre guess.
// "Self-Help" alone deliberately matches neither list: it is genuinely
// ambiguous between the faith/pastoral imprint and the general-trade
// imprint without manuscript-content-level signal this module does not
// have access to (and will not infer).
const FAITH_PASTORAL_KEYWORDS = Object.freeze([
  "faith", "christian", "devotional", "testimony", "ministry",
  "spiritual", "pastoral", "gospel", "scripture", "biblical"
]);
const GENERAL_TRADE_KEYWORDS = Object.freeze([
  "business", "how-to", "howto", "reference", "career", "finance", "leadership", "marketing"
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
  return { ok: false, code: "PRE_CONTRACT_EDITORIAL_REVIEW_RUN_BLOCKED", reason, ...extra };
}

function genreMatchesAny(genreText, keywords) {
  const lower = normalizeString(genreText).toLowerCase();
  if (!lower) return false;
  return keywords.some((k) => lower.includes(k));
}

/**
 * Pure imprint-determination rule engine. No I/O, no manuscript content.
 *
 * @param {{
 *   workType: number|null,
 *   genreConfirmed: string|null,
 *   signatureReviewRequiredSignal: boolean
 * }} input
 * @returns {{
 *   outcome: string,
 *   recommendedImprint: number|null,
 *   recommendedImprintLabel: string|null,
 *   confidence: string|null,
 *   autoLock: boolean,
 *   requiresHumanDecision: boolean,
 *   rationale: string[]
 * }}
 */
function determineImprintRecommendation(input = {}) {
  const workType = isPlainObject(input) ? input.workType ?? null : null;
  const genreConfirmed = isPlainObject(input) ? normalizeString(input.genreConfirmed) : "";
  const signatureSignal = isPlainObject(input) ? input.signatureReviewRequiredSignal === true : false;

  if (signatureSignal) {
    return {
      outcome: IMPRINT_OUTCOME.SIGNATURE_CANDIDATE,
      recommendedImprint: null,
      recommendedImprintLabel: null,
      confidence: null,
      autoLock: false,
      requiresHumanDecision: true,
      rationale: ["Existing signatureReviewRequired signal is true — routed to human review, not auto-locked."]
    };
  }

  if (workType === MANUSCRIPT_WORK_TYPE.CHILDRENS_PICTURE_BOOK) {
    return {
      outcome: IMPRINT_OUTCOME.AUTO_RECOMMENDED,
      recommendedImprint: RECOMMENDED_IMPRINT.JM_LITTLE,
      recommendedImprintLabel: RECOMMENDED_IMPRINT_LABELS[RECOMMENDED_IMPRINT.JM_LITTLE],
      confidence: IMPRINT_CONFIDENCE.HIGH,
      autoLock: true,
      requiresHumanDecision: false,
      rationale: ["Manuscript work type is Children's Picture Book — JM Little is the unambiguous imprint."]
    };
  }

  if (workType === MANUSCRIPT_WORK_TYPE.POETRY_COLLECTION) {
    return {
      outcome: IMPRINT_OUTCOME.AUTO_RECOMMENDED,
      recommendedImprint: RECOMMENDED_IMPRINT.JM_VERSE,
      recommendedImprintLabel: RECOMMENDED_IMPRINT_LABELS[RECOMMENDED_IMPRINT.JM_VERSE],
      confidence: IMPRINT_CONFIDENCE.HIGH,
      autoLock: true,
      requiresHumanDecision: false,
      rationale: ["Manuscript work type is Poetry Collection — JM Verse is the unambiguous imprint."]
    };
  }

  if (workType === MANUSCRIPT_WORK_TYPE.DEVOTIONAL) {
    return {
      outcome: IMPRINT_OUTCOME.AUTO_RECOMMENDED,
      recommendedImprint: RECOMMENDED_IMPRINT.J_MERRILL_PUBLISHING,
      recommendedImprintLabel: RECOMMENDED_IMPRINT_LABELS[RECOMMENDED_IMPRINT.J_MERRILL_PUBLISHING],
      confidence: IMPRINT_CONFIDENCE.HIGH,
      autoLock: true,
      requiresHumanDecision: false,
      rationale: ["Manuscript work type is Devotional — J Merrill Publishing (flagship/faith imprint) is the unambiguous imprint."]
    };
  }

  if (genreMatchesAny(genreConfirmed, FAITH_PASTORAL_KEYWORDS)) {
    return {
      outcome: IMPRINT_OUTCOME.AUTO_RECOMMENDED,
      recommendedImprint: RECOMMENDED_IMPRINT.J_MERRILL_PUBLISHING,
      recommendedImprintLabel: RECOMMENDED_IMPRINT_LABELS[RECOMMENDED_IMPRINT.J_MERRILL_PUBLISHING],
      confidence: IMPRINT_CONFIDENCE.MEDIUM,
      autoLock: true,
      requiresHumanDecision: false,
      rationale: [`Genre "${genreConfirmed}" matches a faith/pastoral keyword — J Merrill Publishing recommended.`]
    };
  }

  if (genreMatchesAny(genreConfirmed, GENERAL_TRADE_KEYWORDS)) {
    return {
      outcome: IMPRINT_OUTCOME.AUTO_RECOMMENDED,
      recommendedImprint: RECOMMENDED_IMPRINT.JM_WORKS,
      recommendedImprintLabel: RECOMMENDED_IMPRINT_LABELS[RECOMMENDED_IMPRINT.JM_WORKS],
      confidence: IMPRINT_CONFIDENCE.MEDIUM,
      autoLock: true,
      requiresHumanDecision: false,
      rationale: [`Genre "${genreConfirmed}" matches a general-trade keyword — JM Works recommended.`]
    };
  }

  // Deliberately does NOT guess between J Merrill Publishing and JM Works
  // (or any other imprint) from genre text alone (e.g. "Self-Help" matches
  // neither faith/pastoral nor general-trade keyword lists explicitly,
  // and is genuinely ambiguous without manuscript-content-level signal).
  return {
    outcome: IMPRINT_OUTCOME.IMPRINT_AMBIGUOUS,
    recommendedImprint: null,
    recommendedImprintLabel: null,
    confidence: null,
    autoLock: false,
    requiresHumanDecision: true,
    rationale: [
      `Work type/genre ("${genreConfirmed || "unset"}") does not match a defined structural or keyword rule — ` +
        "imprint cannot be confidently auto-determined. Routed to human decision rather than guessed."
    ]
  };
}

/**
 * Pure composer — combines word-count/package-fit validation with the
 * imprint determination into one overall pre-contract review result. No
 * I/O, no manuscript content.
 */
function composePreContractEditorialReview(input = {}) {
  const wordCountResult = verifyManuscriptWordCount({
    selectedPackageCode: input.selectedPackageCode,
    officialManuscriptWordCount: input.officialManuscriptWordCount,
    intakeEstimatedWordCount: input.intakeEstimatedWordCount ?? null
  });

  const imprintResult = determineImprintRecommendation({
    workType: input.workType ?? null,
    genreConfirmed: input.genreConfirmed ?? null,
    signatureReviewRequiredSignal: input.signatureReviewRequiredSignal === true
  });

  const fitConfirmed = wordCountResult.ok && wordCountResult.withinPackageScope !== false;
  const readyForAutoLock = fitConfirmed && imprintResult.autoLock === true && imprintResult.recommendedImprint != null;
  const requiresHumanDecision = !fitConfirmed || imprintResult.requiresHumanDecision === true;

  return {
    wordCountResult,
    imprintResult,
    fitConfirmed,
    readyForAutoLock,
    requiresHumanDecision
  };
}

async function getGraphToken(deps = {}) {
  if (deps.getGraphToken) return deps.getGraphToken();
  const { DefaultAzureCredential } = require("@azure/identity");
  const credential = new DefaultAzureCredential();
  const tokenResponse = await credential.getToken("https://graph.microsoft.com/.default");
  if (!tokenResponse || !tokenResponse.token) {
    throw Object.assign(new Error("Failed to acquire Graph token"), { safeCode: "GRAPH_TOKEN_FAILED" });
  }
  return tokenResponse.token;
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

function buildEditorialReviewExecutionLogPayload({ diagnosticId, intakeReferenceCode, opportunityId, review, completedAt }) {
  const actionDescription = [
    `Pre-contract editorial review performed by the pipeline for intake ${intakeReferenceCode}.`,
    `Opportunity ${opportunityId}. No Opportunity write occurs in this run.`,
    `Word count fit confirmed: ${review.fitConfirmed}.`,
    `Imprint outcome: ${review.imprintResult.outcome}.`,
    review.imprintResult.recommendedImprintLabel
      ? `Recommended imprint: ${review.imprintResult.recommendedImprintLabel} (confidence: ${review.imprintResult.confidence}).`
      : "No imprint auto-recommended.",
    review.readyForAutoLock ? "Imprint auto-locked by the pipeline." : "Imprint NOT auto-locked — requires human decision.",
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
 * Performs the pre-contract editorial review for the given controlled
 * record: reads existing structured fields (never manuscript text or raw
 * AI output), extracts the official manuscript word count (content
 * discarded immediately after the count is read), determines fit and
 * imprint via deterministic rules, writes the allowlisted result fields
 * back to the Diagnostic record (never the Opportunity), and writes one
 * safe execution-log evidence record.
 *
 * Requires JM1_PRE_CONTRACT_EDITORIAL_REVIEW_RUN_ENABLED="true", checked
 * fresh on every call.
 *
 * @param {{ diagnosticId: string, intakeReferenceCode: string, opportunityId: string, selectedPackageCode: string }} input
 * @param {{ getToken?: Function, getGraphToken?: Function, extractManuscript?: Function }} [deps]
 * @returns {Promise<object>}
 */
async function runPreContractEditorialReview(input = {}, deps = {}) {
  const resolveToken = deps.getToken || getDataverseToken;
  const resolveExtract = deps.extractManuscript || fetchAndExtractManuscript;

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

  // Extract the manuscript ONLY to obtain the word count. The extracted
  // content is read into `extractResult.content` here and is discarded
  // immediately below — it is never logged, stored, or included in any
  // return value or Dataverse write.
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
  extractResult.content = null; // discard immediately — never stored, logged, or returned

  const review = composePreContractEditorialReview({
    selectedPackageCode,
    officialManuscriptWordCount,
    intakeEstimatedWordCount: null,
    workType,
    genreConfirmed,
    signatureReviewRequiredSignal
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
  const executionLogPayload = buildEditorialReviewExecutionLogPayload({ diagnosticId, intakeReferenceCode, opportunityId, review, completedAt });

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
    fitConfirmed: review.fitConfirmed,
    imprintOutcome: review.imprintResult.outcome,
    recommendedImprintLabel: review.imprintResult.recommendedImprintLabel,
    imprintConfidence: review.imprintResult.confidence,
    imprintAutoLocked: review.readyForAutoLock,
    requiresHumanDecision: review.requiresHumanDecision,
    diagnosticRecordEtag: patchResult.etag,
    fieldsUpdated: Object.keys(diagnosticPayload),
    executionLog,
    gateUsed: GATE_NAME,
    liveActions: {
      readDiagnosticRecord: true,
      readIntakeRecord: workTypeSourcedFromIntakeFallback,
      readManuscriptForWordCountOnly: true,
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
  buildEditorialReviewExecutionLogPayload,
  GATE_NAME,
  MANUSCRIPT_WORK_TYPE,
  RECOMMENDED_PACKAGE,
  PACKAGE_CODE_TO_RECOMMENDED_PACKAGE,
  IMPRINT_OUTCOME,
  IMPRINT_CONFIDENCE,
  FAITH_PASTORAL_KEYWORDS,
  GENERAL_TRADE_KEYWORDS,
  EVENT_TYPE
};
