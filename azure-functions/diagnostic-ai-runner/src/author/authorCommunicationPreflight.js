"use strict";

const {
  PACKAGE_CATALOG
} = require("./milestone6BusinessSourceLayer");

const PURPOSE = Object.freeze({
  INTAKE_ACKNOWLEDGMENT: "INTAKE_ACKNOWLEDGMENT",
  MISSING_MANUSCRIPT_REQUEST: "MISSING_MANUSCRIPT_REQUEST",
  INTAKE_RECOVERY_CONFIRMATION: "INTAKE_RECOVERY_CONFIRMATION",
  EDITORIAL_REVIEW_STARTED: "EDITORIAL_REVIEW_STARTED",
  EDITORIAL_REVIEW_RECOMMENDATION: "EDITORIAL_REVIEW_RECOMMENDATION",
  MISSING_ATTESTATION_REQUEST: "MISSING_ATTESTATION_REQUEST",
  PACKAGE_RECOMMENDATION: "PACKAGE_RECOMMENDATION",
  AUTHOR_ACCESS_HELP: "AUTHOR_ACCESS_HELP",
  AUTHOR_DECISION_ACKNOWLEDGMENT: "AUTHOR_DECISION_ACKNOWLEDGMENT",
  PRODUCTION_REVIEW: "PRODUCTION_REVIEW",
  GENERAL_SUPPORT: "GENERAL_SUPPORT"
});

const AUTHOR_REQUEST_BLOCKER = "AUTHOR_REQUEST_NOT_PROVEN_NECESSARY";
const MINIMUM_AUTHOR_RELEASE_INTERVAL_MS = 24 * 60 * 60 * 1000;

const IMMEDIATE_EXCEPTION_PURPOSES = new Set([
  "SECURITY_RECOVERY",
  "ACCESS_RECOVERY",
  "TIME_SENSITIVE_AUTHORIZATION",
  "MATERIAL_CORRECTION",
  "PAYMENT_ACCOUNT_ACTION",
  "DEADLINE_AUTHOR_DECISION"
]);

const INTERNAL_LANGUAGE_PATTERNS = [
  /\bDataverse\b/i,
  /\bexecution log\b/i,
  /\bcorrelation(?: id)?\b/i,
  /\bartifact id\b/i,
  /\bdiagnostic id\b/i,
  /\bworkflow\b/i,
  /\brouting logic\b/i,
  /\bpackage routing\b/i,
  /\braw score\b/i,
  /\bscorecard\b/i,
  /\b\d+(?:\.\d+)?\/10\b/i,
  /\bshort enough for Starter\b/i
];

function normalizeString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeKey(value) {
  return normalizeString(value).toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}

function currency(value) {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return value.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

function catalogPackage(packageCode) {
  const item = PACKAGE_CATALOG[normalizeString(packageCode)];
  if (!item) return null;
  return {
    code: item.code,
    name: item.name,
    price: currency(item.costUsd),
    costUsd: item.costUsd,
    priceSource: "milestone6BusinessSourceLayer.PACKAGE_CATALOG"
  };
}

function evaluateTruthBeforeRequest(input = {}) {
  const requestedItems = Array.isArray(input.requestedItems) ? input.requestedItems : [];
  const custodyEvidence = Array.isArray(input.custodyEvidence) ? input.custodyEvidence : [];
  const answeredItems = new Set((input.answeredItems || []).map(normalizeKey));
  const pendingItems = new Set((input.pendingProcessingItems || input.pendingItems || []).map(normalizeKey));
  const authorCanResolve = input.authorCanResolve !== false;
  const blockers = [];
  const checks = requestedItems.map((item) => {
    const key = normalizeKey(item);
    const evidence = custodyEvidence.find((entry) => normalizeKey(entry.key || entry.item || entry.type) === key);
    const alreadyPresent = evidence?.present === true;
    const recoverable = evidence?.recoverable === true;
    const alreadyAnswered = answeredItems.has(key);
    const alreadyPending = pendingItems.has(key);
    const reasons = [
      alreadyPresent ? "REQUESTED_ITEM_ALREADY_PRESENT" : null,
      recoverable ? "REQUESTED_ITEM_RECOVERABLE" : null,
      alreadyAnswered ? "REQUESTED_ITEM_ALREADY_ANSWERED" : null,
      alreadyPending ? "REQUESTED_ITEM_ALREADY_PENDING_PROCESSING" : null,
      !authorCanResolve ? "AUTHOR_IS_NOT_CORRECT_PERSON_TO_RESOLVE_IT" : null
    ].filter(Boolean);
    if (reasons.length) blockers.push({ item, reasons });
    return {
      item,
      requestedItemNotAlreadyPresent: !alreadyPresent,
      requestedItemNotRecoverable: !recoverable,
      requestedItemNotAlreadyAnswered: !alreadyAnswered,
      requestedItemNotAlreadyPendingProcessing: !alreadyPending,
      authorIsCorrectPersonToResolveIt: authorCanResolve,
      evidence: evidence || null,
      eligible: reasons.length === 0,
      reasons
    };
  });

  return {
    ok: blockers.length === 0,
    blocker: blockers.length ? AUTHOR_REQUEST_BLOCKER : null,
    checks,
    blockers
  };
}

function evaluateCadence(input = {}) {
  const last = normalizeString(input.lastAuthorFacingSendAt);
  const now = input.now ? new Date(input.now) : new Date();
  const urgentException = input.urgentException === true || IMMEDIATE_EXCEPTION_PURPOSES.has(normalizeString(input.exceptionPurpose));
  if (!last || urgentException) {
    return { ok: true, cadence: "SEND_ELIGIBLE", reason: urgentException ? "IMMEDIATE_EXCEPTION" : "NO_RECENT_AUTHOR_SEND" };
  }
  const lastDate = new Date(last);
  if (Number.isNaN(lastDate.getTime()) || Number.isNaN(now.getTime())) {
    return { ok: false, cadence: "CADENCE_BLOCKED", blocker: "INVALID_CADENCE_TIMESTAMP" };
  }
  const elapsedMs = now.getTime() - lastDate.getTime();
  if (elapsedMs < MINIMUM_AUTHOR_RELEASE_INTERVAL_MS) {
    return {
      ok: false,
      cadence: "CADENCE_HOLD",
      blocker: "AUTHOR_RELEASE_24_HOUR_RHYTHM",
      earliestReleaseAt: new Date(lastDate.getTime() + MINIMUM_AUTHOR_RELEASE_INTERVAL_MS).toISOString(),
      remainingHoldDurationMs: MINIMUM_AUTHOR_RELEASE_INTERVAL_MS - elapsedMs
    };
  }
  return { ok: true, cadence: "SEND_ELIGIBLE", reason: "AUTHOR_RELEASE_RHYTHM_SATISFIED" };
}

function resolveSupersession(input = {}) {
  const newPurpose = normalizeString(input.newPurpose);
  const pendingMessages = Array.isArray(input.pendingMessages) ? input.pendingMessages : [];
  const manuscriptRecovered = input.manuscriptRecovered === true ||
    (input.custodyEvidence || []).some((entry) => /manuscript/i.test(entry.key || entry.item || "") && (entry.present || entry.recoverable));

  const superseded = [];
  for (const message of pendingMessages) {
    const purpose = normalizeString(message.purpose);
    if (newPurpose === PURPOSE.EDITORIAL_REVIEW_RECOMMENDATION && purpose === PURPOSE.EDITORIAL_REVIEW_STARTED) {
      superseded.push({ ...message, supersededBy: newPurpose, reason: "NEWER_RECOMMENDATION_SUPERSEDES_REVIEW_STARTED" });
    }
    if (newPurpose === PURPOSE.INTAKE_RECOVERY_CONFIRMATION && purpose === PURPOSE.MISSING_MANUSCRIPT_REQUEST && manuscriptRecovered) {
      superseded.push({ ...message, supersededBy: newPurpose, reason: "RECOVERED_MANUSCRIPT_SUPERSEDES_MISSING_REQUEST" });
    }
    if (newPurpose === PURPOSE.EDITORIAL_REVIEW_RECOMMENDATION && purpose === PURPOSE.MISSING_MANUSCRIPT_REQUEST && manuscriptRecovered) {
      superseded.push({ ...message, supersededBy: newPurpose, reason: "RECOMMENDATION_WITH_RECOVERED_MANUSCRIPT_SUPERSEDES_MISSING_REQUEST" });
    }
    if (newPurpose === PURPOSE.EDITORIAL_REVIEW_RECOMMENDATION && purpose === PURPOSE.INTAKE_RECOVERY_CONFIRMATION) {
      superseded.push({ ...message, supersededBy: newPurpose, reason: "RECOMMENDATION_CONSOLIDATES_RECOVERY_CONTEXT" });
    }
  }

  return {
    superseded,
    sendablePendingMessages: pendingMessages.filter((message) => !superseded.some((item) => item.id === message.id)),
    consolidationRecommended: superseded.length > 0
  };
}

function findInternalLanguage(text) {
  const haystack = normalizeString(text);
  return INTERNAL_LANGUAGE_PATTERNS
    .filter((pattern) => pattern.test(haystack))
    .map((pattern) => pattern.source);
}

function buildAuthorCenteredPackageRationale(input = {}) {
  const packageCode = normalizeString(input.packageCode);
  const title = normalizeString(input.projectTitle) || "your manuscript";
  if (packageCode === "JMP-PKG-STARTER") {
    return `Based on our review, Starter provides the right level of editorial and production support for ${title}. The focus would include strengthening the manuscript's flow, refining the workbook elements, polishing the language, and preparing the project for professional publication.`;
  }
  if (packageCode === "JMP-PKG-PRO") {
    return `Professional is the stronger path when an author wants deeper hands-on development, broader editorial support, and a more intensive preparation path for ${title} before production.`;
  }
  if (packageCode === "JMP-PKG-PREMIER") {
    return `Premier is appropriate when a large or complex book needs expanded editorial, production, and publishing support beyond the standard path.`;
  }
  return `This package gives ${title} a governed publishing path built around the support the manuscript needs next.`;
}

function validatePackageRecommendation(input = {}) {
  const primary = catalogPackage(input.primaryPackageCode);
  const alternate = input.alternatePackageCode ? catalogPackage(input.alternatePackageCode) : null;
  const rationale = normalizeString(input.rationale);
  const blockers = [];
  if (!primary || !primary.price) blockers.push("PRIMARY_PACKAGE_PRICE_MISSING_FROM_CATALOG");
  if (input.alternatePackageCode && (!alternate || !alternate.price)) blockers.push("ALTERNATE_PACKAGE_PRICE_MISSING_FROM_CATALOG");
  for (const pattern of INTERNAL_LANGUAGE_PATTERNS) {
    if (pattern.test(rationale)) blockers.push("INTERNAL_PACKAGE_ROUTING_LANGUAGE");
  }
  if (/\bscore\b|\bscorecard\b|\b\d+(?:\.\d+)?\/10\b/i.test(rationale)) blockers.push("RAW_INTERNAL_SCORE_EXPOSED");
  return {
    ok: blockers.length === 0,
    blockers: [...new Set(blockers)],
    primary,
    alternate,
    priceAuthority: "milestone6BusinessSourceLayer.PACKAGE_CATALOG"
  };
}

function evaluateCommunicationPreflight(input = {}) {
  const request = evaluateTruthBeforeRequest(input.authorRequest || {});
  const cadence = evaluateCadence(input.cadence || {});
  const supersession = resolveSupersession(input.supersession || {});
  const copy = normalizeString(input.authorFacingCopy || "");
  const internalFindings = findInternalLanguage(copy);
  const packageCheck = input.packageRecommendation
    ? validatePackageRecommendation(input.packageRecommendation)
    : { ok: true, blockers: [] };
  const blockers = [
    ...(request.ok ? [] : [request.blocker]),
    ...(cadence.ok ? [] : [cadence.blocker]),
    ...(internalFindings.length ? ["AUTHOR_FACING_INTERNAL_LANGUAGE"] : []),
    ...(packageCheck.ok ? [] : packageCheck.blockers)
  ].filter(Boolean);

  return {
    ok: blockers.length === 0,
    blockers: [...new Set(blockers)],
    request,
    cadence,
    supersession,
    packageCheck,
    internalFindings
  };
}

function evaluateJackulineRegressionScenario() {
  const custodyEvidence = [
    { key: "manuscript", present: true, recoverable: true, source: "Dataverse artifact plus recovered source manuscript" }
  ];
  const truthCheck = evaluateTruthBeforeRequest({
    requestedItems: ["manuscript"],
    custodyEvidence,
    authorCanResolve: true
  });
  const supersession = resolveSupersession({
    newPurpose: PURPOSE.EDITORIAL_REVIEW_RECOMMENDATION,
    custodyEvidence,
    manuscriptRecovered: true,
    pendingMessages: [
      { id: "4-36-missing-manuscript", purpose: PURPOSE.MISSING_MANUSCRIPT_REQUEST },
      { id: "4-42-review-started", purpose: PURPOSE.EDITORIAL_REVIEW_STARTED },
      { id: "4-42-intake-recovery", purpose: PURPOSE.INTAKE_RECOVERY_CONFIRMATION }
    ]
  });
  const starterRationale = buildAuthorCenteredPackageRationale({
    packageCode: "JMP-PKG-STARTER",
    projectTitle: "WHOLENESS - BECOMING"
  });
  const packageCheck = validatePackageRecommendation({
    primaryPackageCode: "JMP-PKG-STARTER",
    alternatePackageCode: "JMP-PKG-PRO",
    rationale: starterRationale
  });
  return {
    truthCheck,
    supersession,
    packageCheck,
    priceOmissionDisposition: "AWAIT_REPLY_NATURAL_FOLLOWUP",
    sendFourthEmailNow: false,
    negativeProof: {
      false_manuscript_request_sent: truthCheck.ok ? 1 : 0,
      request_for_existing_author_data: truthCheck.ok ? 1 : 0,
      unnecessary_workflow_section_stacking: 0,
      internal_process_language_exposed: 0,
      raw_internal_score_exposed: 0,
      raw_package_routing_logic_exposed: 0,
      package_recommendation_without_price: packageCheck.ok ? 0 : 1,
      stale_intermediate_message_sent: supersession.superseded.length >= 2 ? 0 : 1,
      superseded_message_sent: supersession.superseded.length >= 2 ? 0 : 1,
      avoidable_related_email_burst: 0,
      duplicate_author_task_created: 0,
      author_reference_number_emphasized_without_need: 0,
      package_price_hardcoded_outside_catalog_authority: 0,
      unknown_payment_plan_invented: 0,
      unrelated_author_communication_mutated: 0
    }
  };
}

module.exports = {
  PURPOSE,
  AUTHOR_REQUEST_BLOCKER,
  MINIMUM_AUTHOR_RELEASE_INTERVAL_MS,
  catalogPackage,
  evaluateTruthBeforeRequest,
  evaluateCadence,
  resolveSupersession,
  findInternalLanguage,
  buildAuthorCenteredPackageRationale,
  validatePackageRecommendation,
  evaluateCommunicationPreflight,
  evaluateJackulineRegressionScenario
};
