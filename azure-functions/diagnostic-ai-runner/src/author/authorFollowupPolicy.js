"use strict";

const { createHash } = require("node:crypto");

const CADENCE_DAYS = Object.freeze({
  INFORMATIONAL: Object.freeze([0, 7, 14]),
  STANDARD_ACTION: Object.freeze([0, 3, 7, 14]),
  PRODUCTION_BLOCKING: Object.freeze([0, 2, 5, 7]),
  LAUNCH_CRITICAL: Object.freeze([0, 1, 3, 5])
});

const STAGE_DEFAULTS = Object.freeze({
  "01_INQUIRY": "INFORMATIONAL",
  "02_INTAKE": "INFORMATIONAL",
  "03_EDITORIAL_REVIEW": "STANDARD_ACTION",
  "04_AUTHOR_DECISION": "STANDARD_ACTION",
  "05_AGREEMENT_PAYMENT": "COMMERCIAL",
  "06_ONBOARDING": "STANDARD_ACTION",
  "07_DEVELOPMENTAL_EDITING": "STANDARD_ACTION",
  "08_LINE_EDITING": "STANDARD_ACTION",
  "09_COPYEDITING": "STANDARD_ACTION",
  "10_PROOFREADING": "PRODUCTION_BLOCKING",
  "11_INTERIOR_LAYOUT": "PRODUCTION_BLOCKING",
  "12_COVER_DESIGN": "PRODUCTION_BLOCKING",
  "13_PRODUCTION": "PRODUCTION_BLOCKING",
  "14_DISTRIBUTION": "LAUNCH_CRITICAL",
  "15_PUBLICATION": "LAUNCH_CRITICAL",
  "16_POST_PUBLICATION": "INFORMATIONAL"
});

const ACTION_CLASSES = Object.freeze({
  OPTIONAL_MATERIAL: "INFORMATIONAL",
  OPTIONAL_QUESTIONNAIRE: "INFORMATIONAL",
  EDITORIAL_REVIEW: "STANDARD_ACTION",
  DEVELOPMENTAL_EDIT_REVIEW: "STANDARD_ACTION",
  LINE_EDIT_REVIEW: "STANDARD_ACTION",
  COPYEDIT_REVIEW: "STANDARD_ACTION",
  PROOFREAD_REVIEW: "PRODUCTION_BLOCKING",
  AUTHOR_DECISION: "STANDARD_ACTION",
  ONBOARDING_SUBMISSION: "STANDARD_ACTION",
  INTERIOR_PROOF_APPROVAL: "PRODUCTION_BLOCKING",
  COVER_APPROVAL: "PRODUCTION_BLOCKING",
  FINAL_MANUSCRIPT_APPROVAL: "PRODUCTION_BLOCKING",
  PRODUCTION_PROOF_APPROVAL: "PRODUCTION_BLOCKING",
  FINAL_RELEASE_APPROVAL: "LAUNCH_CRITICAL",
  DISTRIBUTION_APPROVAL: "LAUNCH_CRITICAL",
  PAYMENT: "COMMERCIAL",
  AGREEMENT_SIGNATURE: "COMMERCIAL"
});

const STAGE_ACTIONS = Object.freeze({
  "01_INQUIRY": ["OPTIONAL_MATERIAL", "OPTIONAL_QUESTIONNAIRE"],
  "02_INTAKE": ["OPTIONAL_MATERIAL", "OPTIONAL_QUESTIONNAIRE"],
  "03_EDITORIAL_REVIEW": ["EDITORIAL_REVIEW", "OPTIONAL_MATERIAL"],
  "04_AUTHOR_DECISION": ["AUTHOR_DECISION"],
  "05_AGREEMENT_PAYMENT": ["PAYMENT", "AGREEMENT_SIGNATURE"],
  "06_ONBOARDING": ["ONBOARDING_SUBMISSION", "OPTIONAL_MATERIAL"],
  "07_DEVELOPMENTAL_EDITING": ["DEVELOPMENTAL_EDIT_REVIEW", "OPTIONAL_MATERIAL"],
  "08_LINE_EDITING": ["LINE_EDIT_REVIEW", "OPTIONAL_MATERIAL"],
  "09_COPYEDITING": ["COPYEDIT_REVIEW", "OPTIONAL_MATERIAL"],
  "10_PROOFREADING": ["PROOFREAD_REVIEW"],
  "11_INTERIOR_LAYOUT": ["INTERIOR_PROOF_APPROVAL"],
  "12_COVER_DESIGN": ["COVER_APPROVAL"],
  "13_PRODUCTION": ["FINAL_MANUSCRIPT_APPROVAL", "PRODUCTION_PROOF_APPROVAL"],
  "14_DISTRIBUTION": ["DISTRIBUTION_APPROVAL"],
  "15_PUBLICATION": ["FINAL_RELEASE_APPROVAL"],
  "16_POST_PUBLICATION": ["OPTIONAL_MATERIAL", "OPTIONAL_QUESTIONNAIRE"]
});

const DAY_MS = 24 * 60 * 60 * 1000;
const EASTERN_PARTS = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/New_York",
  year: "numeric", month: "2-digit", day: "2-digit",
  hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23"
});

function normalize(value) {
  return String(value || "").trim().toLowerCase();
}

function validDate(value) {
  if (value === null || value === undefined || value === "") return null;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date : null;
}

function easternParts(date) {
  return Object.fromEntries(EASTERN_PARTS.formatToParts(date)
    .filter((part) => part.type !== "literal")
    .map((part) => [part.type, Number(part.value)]));
}

function easternCalendarDay(date) {
  const parts = easternParts(date);
  return Date.UTC(parts.year, parts.month - 1, parts.day) / DAY_MS;
}

function addEasternCalendarDays(date, days) {
  const parts = easternParts(date);
  const target = Date.UTC(parts.year, parts.month - 1, parts.day + days,
    parts.hour, parts.minute, parts.second, date.getUTCMilliseconds());
  let candidate = target;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const actual = easternParts(new Date(candidate));
    const local = Date.UTC(actual.year, actual.month - 1, actual.day,
      actual.hour, actual.minute, actual.second, date.getUTCMilliseconds());
    const correction = target - local;
    candidate += correction;
    if (!correction) break;
  }
  return new Date(candidate);
}

function dedupeKey(request, position) {
  const identity = [
    request.titleId,
    request.engagementId,
    request.authorId,
    request.stageId,
    request.actionType,
    request.actionRequestId,
    request.requestedAt,
    position
  ].map(normalize);
  if (identity.some((part) => !part)) return null;
  return `author-followup:v1:${createHash("sha256").update(JSON.stringify(identity)).digest("hex")}`;
}

function matchingQualifiedResponse(request, responses = [], now = new Date()) {
  return responses.some((response) =>
    response.qualified === true &&
    normalize(response.actionRequestId) === normalize(request.actionRequestId) &&
    normalize(response.titleId) === normalize(request.titleId) &&
    normalize(response.engagementId) === normalize(request.engagementId) &&
    normalize(response.authorId) === normalize(request.authorId) &&
    normalize(response.stageId) === normalize(request.stageId) &&
    validDate(response.receivedAt)?.getTime() >= validDate(request.requestedAt)?.getTime() &&
    validDate(response.receivedAt)?.getTime() <= now.getTime()
  );
}

function evaluateAuthorFollowup(request, state = {}, nowInput = new Date()) {
  const now = validDate(nowInput);
  const requestedAt = validDate(request?.requestedAt);
  const required = ["titleId", "engagementId", "authorId", "stageId", "actionType", "actionRequestId"];
  if (!now || !requestedAt || required.some((field) => !normalize(request?.[field])) ||
      !validDate(request?.dueAt) || request?.delivered !== true) {
    return { status: "DENIED", reason: "AUTHOR_ACTION_AUTHORITY_INCOMPLETE" };
  }
  if (validDate(request.dueAt) < requestedAt) {
    return { status: "DENIED", reason: "AUTHOR_ACTION_DUE_BEFORE_REQUEST" };
  }
  if (now < requestedAt) return { status: "NOT_DUE", reason: "ACTION_REQUEST_IN_FUTURE" };
  if (normalize(state.currentStageId) !== normalize(request.stageId)) {
    return { status: "CANCELLED", reason: "STAGE_CHANGED" };
  }
  if (!normalize(state.currentActionRequestId)) {
    return { status: "DENIED", reason: "CURRENT_ACTION_REQUEST_UNPROVEN" };
  }
  if (normalize(state.currentActionRequestId) !== normalize(request.actionRequestId)) {
    return { status: "CANCELLED", reason: "ACTION_REQUEST_SUPERSEDED" };
  }
  if (normalize(state.nextActionOwner) !== "author") {
    return { status: "DENIED", reason: "AUTHOR_DOES_NOT_OWN_NEXT_ACTION" };
  }
  if (matchingQualifiedResponse(request, state.responses, now)) {
    return { status: "CANCELLED", reason: "QUALIFYING_RESPONSE_RECEIVED" };
  }
  if (state.deliveryUnverified === true) {
    return { status: "DENIED", reason: "PREVIOUS_DELIVERY_UNVERIFIED" };
  }

  const actionType = String(request.actionType).trim().toUpperCase();
  const stageCode = String(request.stageCode).trim().toUpperCase();
  const actionClass = ACTION_CLASSES[actionType];
  if (!actionClass) return { status: "DENIED", reason: "ACTION_TYPE_UNCLASSIFIED" };
  const stageClass = STAGE_DEFAULTS[stageCode];
  if (!stageClass) return { status: "DENIED", reason: "PIPELINE_STAGE_UNCLASSIFIED" };
  if (!STAGE_ACTIONS[stageCode].includes(actionType)) {
    return { status: "DENIED", reason: "ACTION_NOT_AUTHORIZED_FOR_STAGE" };
  }
  if (actionClass === "COMMERCIAL") {
    return { status: "ROUTE_COMMERCIAL", reason: "EXISTING_GOVERNED_PAYMENT_CADENCE", cadenceClass: actionClass };
  }
  if (stageClass === "COMMERCIAL") {
    return { status: "DENIED", reason: "NONCOMMERCIAL_ACTION_IN_COMMERCIAL_STAGE_REQUIRES_AUTHORITY" };
  }
  const cadenceClass = actionClass;
  if (request.cadenceClass && request.cadenceClass !== cadenceClass) {
    return { status: "DENIED", reason: "CADENCE_CLASS_CONFLICT" };
  }

  const days = CADENCE_DAYS[cadenceClass];
  const ageDays = easternCalendarDay(now) - easternCalendarDay(requestedAt);
  const duePosition = days.filter((day) => day > 0 && addEasternCalendarDays(requestedAt, day) <= now).at(-1);
  const day20Escalation = Number.isInteger(state.elapsedBusinessDays) && state.elapsedBusinessDays >= 20;
  const releaseAtRisk = now > validDate(request.dueAt) &&
    ["PRODUCTION_BLOCKING", "LAUNCH_CRITICAL"].includes(cadenceClass);
  if (duePosition === undefined) {
    return { status: "NOT_DUE", cadenceClass, ageDays, nextFollowupAt: addEasternCalendarDays(requestedAt, days[1]).toISOString(), day20Escalation, releaseAtRisk };
  }

  const key = dedupeKey(request, duePosition);
  const sentKeys = new Set(state.sentKeys || []);
  const reservedKeys = new Set(state.reservedKeys || []);
  if (sentKeys.has(key) || reservedKeys.has(key)) {
    return { status: "SKIP_DUPLICATE", cadenceClass, ageDays, position: duePosition, idempotencyKey: key, day20Escalation, releaseAtRisk };
  }
  const later = days.find((day) => day > duePosition);
  return {
    status: "DUE",
    cadenceClass,
    ageDays,
    position: duePosition,
    idempotencyKey: key,
    nextFollowupAt: later === undefined ? null : addEasternCalendarDays(requestedAt, later).toISOString(),
    day20Escalation,
    releaseAtRisk
  };
}

module.exports = {
  ACTION_CLASSES,
  CADENCE_DAYS,
  STAGE_ACTIONS,
  addEasternCalendarDays,
  STAGE_DEFAULTS,
  dedupeKey,
  evaluateAuthorFollowup,
  matchingQualifiedResponse
};
