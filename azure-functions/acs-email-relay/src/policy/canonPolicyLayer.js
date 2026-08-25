"use strict";

const PUBLISHING_COMMUNICATION_CANON = Object.freeze({
  from: "publishing@email.jmerrill.one",
  replyTo: "publishing@jmerrill.one",
  cc: "publishing@jmerrill.one",
  format: "HTML"
});

const DECISION = Object.freeze({
  ALLOW: "ALLOW",
  DENY: "DENY"
});

function normalizeString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeEmail(value) {
  return normalizeString(value).toLowerCase();
}

function asArray(value) {
  if (Array.isArray(value)) return value;
  if (value === undefined || value === null) return [];
  return [value];
}

function normalizeRecipients(value) {
  return Array.from(new Set(asArray(value).map((item) => {
    if (item && typeof item === "object") return normalizeEmail(item.address);
    return normalizeEmail(item);
  }).filter(Boolean)));
}

function decision(decisionValue, reason, extra = {}) {
  return Object.freeze({
    POLICY: "JMP-COMMUNICATION-AUTHORITY-v1.0",
    POLICY_VERSION: "1.0",
    DECISION: decisionValue,
    AUTHORITY_SOURCE: "JM1 Enterprise Communication Standard v1.0 / Microsoft-first communications evidence routing",
    SOURCE_RECORD: extra.sourceRecord || null,
    EVIDENCE: Object.freeze(extra.evidence || []),
    REASON: reason,
    OVERRIDE_ALLOWED: false,
    OVERRIDE_REQUIRED: false,
    OVERRIDE_AUTHORITY: null,
    LEGACY_ALLOWED: false,
    MUTATION_ALLOWED: decisionValue === DECISION.ALLOW,
    violationEvent: decisionValue === DECISION.ALLOW ? null : "COMMUNICATION_CANON_VIOLATION"
  });
}

function resolveCommunicationAuthority(input = {}) {
  const from = normalizeEmail(input.from || input.senderAddress);
  const replyToValue = input.replyTo || input.replyToAddress;
  const replyTo = normalizeEmail(Array.isArray(replyToValue) ? replyToValue[0]?.address || replyToValue[0] : replyToValue);
  const to = normalizeRecipients(input.to || input.recipients?.to);
  const cc = normalizeRecipients(input.cc || input.recipients?.cc);
  const bcc = normalizeRecipients(input.bcc || input.recipients?.bcc);
  const html = normalizeString(input.html || input.content?.html);
  const sourceRecord = normalizeString(input.sourceRecord || input.intakeReferenceCode || input.diagnosticId) || null;
  if (from !== PUBLISHING_COMMUNICATION_CANON.from) {
    return decision(DECISION.DENY, "Publishing author-facing sender is not canonical.", { sourceRecord, evidence: [`from=${from || "MISSING"}`] });
  }
  if (replyTo !== PUBLISHING_COMMUNICATION_CANON.replyTo) {
    return decision(DECISION.DENY, "Publishing author-facing Reply-To is not canonical.", { sourceRecord, evidence: [`replyTo=${replyTo || "MISSING"}`] });
  }
  if (!to.includes(PUBLISHING_COMMUNICATION_CANON.cc) && !cc.includes(PUBLISHING_COMMUNICATION_CANON.cc)) {
    return decision(DECISION.DENY, "Publishing visibility CC is missing.", { sourceRecord, evidence: [`cc=${cc.join(",") || "NONE"}`] });
  }
  if (bcc.includes(PUBLISHING_COMMUNICATION_CANON.cc)) {
    return decision(DECISION.DENY, "Publishing visibility copy must be CC, not BCC.", { sourceRecord });
  }
  if (!html || !/^<!doctype html>/i.test(html)) {
    return decision(DECISION.DENY, "Publishing author-facing email must include canonical HTML.", { sourceRecord });
  }
  if (from.includes("noreply") || replyTo.includes("noreply")) {
    return decision(DECISION.DENY, "NoReply author-facing Publishing communication is prohibited.", { sourceRecord });
  }
  return decision(DECISION.ALLOW, "Publishing communication authority resolved.", {
    sourceRecord,
    evidence: ["FROM/REPLY-TO/CC/HTML match Publishing communication canon."]
  });
}

function assertPolicyAllows(result) {
  if (!result || result.MUTATION_ALLOWED !== true) {
    const err = new Error(`CANON_POLICY_BLOCKED:${result?.POLICY || "UNKNOWN"}:${result?.REASON || "UNKNOWN"}`);
    err.safeCode = "CANON_POLICY_BLOCKED";
    err.policyDecision = result || null;
    throw err;
  }
  return true;
}

module.exports = {
  PUBLISHING_COMMUNICATION_CANON,
  assertPolicyAllows,
  resolveCommunicationAuthority
};
