"use strict";

const {
  CAPABILITY_ID,
  CAPABILITY_VERSION,
  IDENTITY,
  REGISTRY_VERSION,
  createCommercialEligibilityCapability
} = require("./commercialEligibilityClassification");
const { createCommercialEligibilityDataverseReader } = require("./commercialEligibilityDataverseReader");
const { createCommercialEligibilityAuditStore } = require("./commercialEligibilityAuditStore");

function clean(value) {
  return typeof value === "string" ? value.trim() : "";
}

function ensureEnabled() {
  if (clean(process.env.JM1_AGENTIC_COMMERCIAL_ELIGIBILITY_A2_ENABLED).toLowerCase() !== "true") {
    throw Object.assign(new Error("Production A2 binding is disabled."), { safeCode: "A2_BINDING_DISABLED" });
  }
}

function createCommercialEligibilityProductionBinding(options = {}) {
  const readState = options.readState || createCommercialEligibilityDataverseReader(options.dataverse);
  const audit = options.audit || createCommercialEligibilityAuditStore(options.storage);
  const clock = options.clock || (() => new Date().toISOString());

  async function prepare(input = {}) {
    ensureEnabled();
    const state = await readState({ opportunityId: input.opportunityId, titleId: input.titleId });
    const traces = [];
    const capability = createCommercialEligibilityCapability({ auditSink: async (trace) => traces.push(trace), clock });
    const result = await capability.prepare({ state, currentStateVersion: state.AUTHORITATIVE_STATE_VERSION, requestedEffect: input.requestedEffect });
    const envelope = {
      schemaVersion: "JM1-AGENTIC-004A-AUDIT-v1",
      event: "COMMERCIAL_ELIGIBILITY_PREPARED",
      storedAt: clock(),
      identity: IDENTITY,
      workBinding: { opportunityId: input.opportunityId, titleId: input.titleId },
      authoritativeState: state,
      prepared: result.PREPARED_CLASSIFICATION,
      effectDecision: result.EFFECT_DECISION,
      trace: traces[0],
      reviewStatus: "PENDING",
      businessEffects: 0
    };
    const persisted = await audit.savePreparation(envelope);
    return { ...persisted.value, idempotentReplay: !persisted.created, auditReference: persisted.blobName };
  }

  async function review(input = {}) {
    ensureEnabled();
    const existing = await audit.readPreparation(input.classificationId);
    const current = await readState(existing.workBinding);
    const preparedExpiresAt = Date.parse(existing.authoritativeState?.STATE_EXPIRES_AT || "");
    const preparedExpired = Number.isFinite(preparedExpiresAt) && preparedExpiresAt <= Date.parse(clock());
    const reviewStateVersion = preparedExpired
      ? `${current.AUTHORITATIVE_STATE_VERSION}:PREPARATION_EXPIRED`
      : current.AUTHORITATIVE_STATE_VERSION;
    const traces = [];
    const capability = createCommercialEligibilityCapability({ auditSink: async (trace) => traces.push(trace), clock });
    const reviewResult = await capability.review({
      prepared: existing.prepared,
      currentStateVersion: reviewStateVersion,
      decision: input.decision,
      reviewer: input.reviewer,
      reviewedAt: clock(),
      correction: input.correction,
      reason: input.reason
    });
    const envelope = {
      schemaVersion: "JM1-AGENTIC-004A-REVIEW-v1",
      event: "COMMERCIAL_ELIGIBILITY_REVIEWED",
      storedAt: clock(),
      classificationId: existing.prepared.CLASSIFICATION_ID,
      workBinding: existing.workBinding,
      preparedStateVersion: existing.prepared.INPUT_STATE_REFERENCE,
      currentStateVersion: reviewStateVersion,
      preparedExpired,
      review: reviewResult,
      trace: traces[0],
      downstreamEffectAuthority: "NONE",
      businessEffects: 0
    };
    const persisted = await audit.saveReview(envelope);
    return { ...persisted.value, idempotentReplay: !persisted.created, auditReference: persisted.blobName };
  }

  async function supervision() {
    ensureEnabled();
    const records = await audit.list(200);
    const reviewsByClassification = new Map();
    for (const item of records) {
      const record = item.record || {};
      if (record.event !== "COMMERCIAL_ELIGIBILITY_REVIEWED" || !record.classificationId) continue;
      const current = reviewsByClassification.get(record.classificationId);
      if (!current || String(record.storedAt) > String(current.record?.storedAt)) reviewsByClassification.set(record.classificationId, item);
    }
    const classifications = records
      .filter((item) => item.record?.event === "COMMERCIAL_ELIGIBILITY_PREPARED")
      .map((item) => {
        const prepared = item.record.prepared || {};
        const latestReview = reviewsByClassification.get(prepared.CLASSIFICATION_ID)?.record || null;
        return {
          CLASSIFICATION_ID: prepared.CLASSIFICATION_ID,
          WORK_ID: prepared.WORK_ID,
          TITLE_ID: prepared.TITLE_ID,
          CLASSIFICATION: prepared.CLASSIFICATION,
          CLASSIFICATION_CONFIDENCE: prepared.CLASSIFICATION_CONFIDENCE,
          INPUT_STATE_REFERENCE: prepared.INPUT_STATE_REFERENCE,
          EVIDENCE_REFERENCES: prepared.EVIDENCE_REFERENCES,
          MISSING_EVIDENCE: prepared.MISSING_EVIDENCE,
          EXCEPTION_CLASS: prepared.EXCEPTION_CLASS,
          PREPARED_AT: item.record.storedAt,
          REVIEW_STATUS: latestReview?.review?.REVIEW_STATUS || "PENDING",
          REVIEW_ACTION: latestReview?.review?.REVIEW_ACTION || null,
          REVIEWER: latestReview?.review?.REVIEWER || null,
          REVIEWED_AT: latestReview?.review?.REVIEWED_AT || null,
          HUMAN_CORRECTION: latestReview?.review?.HUMAN_CORRECTION || null,
          FINAL_REVIEWED_CLASSIFICATION: latestReview?.review?.FINAL_REVIEWED_CLASSIFICATION || null,
          STALE_STATUS: latestReview?.review?.STALE_STATUS || "NOT_REVIEWED",
          ERROR: null,
          UNAUTHORIZED_EFFECTS: item.record.effectDecision ? [item.record.effectDecision] : [],
          BUSINESS_EFFECTS: 0
        };
      });
    return {
      CAPABILITY_ID,
      CAPABILITY_VERSION,
      REGISTRY_VERSION,
      IDENTITY,
      ACTIVE_AUTONOMY_LEVEL: "A2",
      ACTIVE_EFFECT_CLASSES: ["READ", "PREPARE"],
      DOWNSTREAM_EFFECT_AUTHORITY: "NONE",
      AUDIT_DURABILITY: "PRODUCTION_BOUND",
      records,
      classifications
    };
  }

  return { prepare, review, supervision };
}

module.exports = { createCommercialEligibilityProductionBinding };
