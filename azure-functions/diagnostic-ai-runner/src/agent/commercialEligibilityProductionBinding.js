"use strict";

const { ManagedIdentityCredential } = require("@azure/identity");

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
  if (
    clean(process.env.JM1_AGENTIC_COMMERCIAL_ELIGIBILITY_REQUIRE_DEDICATED_IDENTITY).toLowerCase() === "true" &&
    !clean(process.env.JM1_AGENTIC_COMMERCIAL_ELIGIBILITY_CLIENT_ID)
  ) {
    throw Object.assign(new Error("Dedicated A2 identity is required."), { safeCode: "A2_DEDICATED_IDENTITY_REQUIRED" });
  }
}

function createCapabilityCredential(options = {}) {
  if (options.credential) return options.credential;
  const clientId = clean(options.clientId || process.env.JM1_AGENTIC_COMMERCIAL_ELIGIBILITY_CLIENT_ID);
  return clientId ? new ManagedIdentityCredential(clientId) : null;
}

function createCommercialEligibilityProductionBinding(options = {}) {
  const credential = createCapabilityCredential(options);
  const dataverseOptions = { ...(options.dataverse || {}) };
  if (credential && !dataverseOptions.getToken) {
    dataverseOptions.getToken = async (resourceUrl) => {
      const token = await credential.getToken(`${resourceUrl}/.default`);
      if (!token?.token) throw Object.assign(new Error("Dedicated identity token acquisition failed."), { safeCode: "A2_IDENTITY_TOKEN_FAILED" });
      return token.token;
    };
  }
  const storageOptions = { ...(options.storage || {}) };
  if (credential && !storageOptions.credential) storageOptions.credential = credential;
  const readState = options.readState || createCommercialEligibilityDataverseReader(dataverseOptions);
  const audit = options.audit || createCommercialEligibilityAuditStore(storageOptions);
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
    let effectAuditReference = null;
    if (result.EFFECT_DECISION) {
      const denial = await audit.savePolicyDenial({
        schemaVersion: "JM1-AGENTIC-004A-POLICY-DENIAL-v1",
        event: "COMMERCIAL_ELIGIBILITY_EFFECT_DENIED",
        storedAt: clock(),
        classificationId: result.PREPARED_CLASSIFICATION.CLASSIFICATION_ID,
        effectDecision: result.EFFECT_DECISION,
        identity: IDENTITY,
        businessEffects: 0
      });
      effectAuditReference = denial.blobName;
    }
    return {
      ...persisted.value,
      effectDecision: result.EFFECT_DECISION,
      idempotentReplay: !persisted.created,
      auditReference: persisted.blobName,
      effectAuditReference
    };
  }

  async function review(input = {}) {
    ensureEnabled();
    const existing = await audit.readPreparation(input.classificationId);
    const current = await readState(existing.workBinding);
    const currentReadExpiresAt = Date.parse(current.STATE_EXPIRES_AT || "");
    const currentReadExpired = Number.isFinite(currentReadExpiresAt) && currentReadExpiresAt <= Date.parse(clock());
    const reviewStateVersion = currentReadExpired
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
      preparedExpired: currentReadExpired,
      currentReadExpired,
      review: reviewResult,
      trace: traces[0],
      downstreamEffectAuthority: "NONE",
      businessEffects: 0
    };
    const persisted = await audit.saveReview(envelope);
    return { ...persisted.value, idempotentReplay: !persisted.created, auditReference: persisted.blobName };
  }

  async function proveStaleReview(input = {}) {
    ensureEnabled();
    const existing = await audit.readPreparation(input.classificationId);
    const proofStateVersion = `${existing.prepared.INPUT_STATE_REFERENCE}:CONTROLLED_STALE_POLICY_PROOF`;
    const traces = [];
    const capability = createCommercialEligibilityCapability({ auditSink: async (trace) => traces.push(trace), clock });
    const result = await capability.review({
      prepared: existing.prepared,
      currentStateVersion: proofStateVersion,
      decision: "ACCEPT",
      reviewer: "policy-harness/non-human",
      reviewedAt: clock(),
      reason: "Controlled version-mismatch proof; not a human disposition."
    });
    if (result.REVIEW_STATUS !== "STALE" || result.FINAL_REVIEWED_CLASSIFICATION !== null) {
      throw Object.assign(new Error("Stale policy did not fail closed."), { safeCode: "A2_STALE_POLICY_PROOF_FAILED" });
    }
    const envelope = {
      schemaVersion: "JM1-AGENTIC-004B-STALE-PROOF-v1",
      event: "COMMERCIAL_ELIGIBILITY_STALE_POLICY_PROOF",
      storedAt: clock(),
      classificationId: existing.prepared.CLASSIFICATION_ID,
      preparedStateVersion: existing.prepared.INPUT_STATE_REFERENCE,
      proofStateVersion,
      policyHarness: "NON_HUMAN_VERSION_MISMATCH",
      result,
      trace: traces[0],
      reviewMutation: 0,
      downstreamEffectAuthority: "NONE",
      businessEffects: 0
    };
    const persisted = await audit.saveStaleProof(envelope);
    return { ...persisted.value, idempotentReplay: !persisted.created, auditReference: persisted.blobName };
  }

  async function supervision() {
    ensureEnabled();
    const records = await audit.list(200);
    const reviewsByClassification = new Map();
    const denialsByClassification = new Map();
    const staleProofsByClassification = new Map();
    for (const item of records) {
      const record = item.record || {};
      if (record.event === "COMMERCIAL_ELIGIBILITY_EFFECT_DENIED" && record.classificationId) {
        const denials = denialsByClassification.get(record.classificationId) || [];
        denials.push(record.effectDecision);
        denialsByClassification.set(record.classificationId, denials);
      }
      if (record.event === "COMMERCIAL_ELIGIBILITY_STALE_POLICY_PROOF" && record.classificationId) {
        staleProofsByClassification.set(record.classificationId, item);
      }
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
          IDENTITY: item.record.identity || prepared.IDENTITY || null,
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
          STALE_POLICY_PROOF: staleProofsByClassification.has(prepared.CLASSIFICATION_ID) ? "PASS" : "NOT_EXECUTED",
          ERROR: null,
          UNAUTHORIZED_EFFECTS: denialsByClassification.get(prepared.CLASSIFICATION_ID) || [],
          BUSINESS_EFFECTS: 0
        };
      });
    const telemetry = records.reduce((summary, item) => {
      const event = item.record?.event;
      if (event === "COMMERCIAL_ELIGIBILITY_PREPARED") summary.PRODUCTION_RUNS += 1;
      if (event === "COMMERCIAL_ELIGIBILITY_REVIEWED") {
        summary.HUMAN_REVIEWS += 1;
        if (item.record?.review?.REVIEW_ACTION === "CORRECT") summary.HUMAN_CORRECTIONS += 1;
        if (item.record?.review?.REVIEW_ACTION === "DEFER") summary.HUMAN_DEFERRALS += 1;
        if (item.record?.review?.REVIEW_STATUS === "STALE") summary.STALE_INVALIDATIONS += 1;
      }
      if (event === "COMMERCIAL_ELIGIBILITY_EFFECT_DENIED") {
        summary.POLICY_DENIALS += 1;
        summary.EFFECT_DENIALS += 1;
      }
      if (event === "COMMERCIAL_ELIGIBILITY_STALE_POLICY_PROOF") summary.STALE_INVALIDATIONS += 1;
      if (event === "COMMERCIAL_ELIGIBILITY_AUDIT_FAILURE") summary.AUDIT_FAILURES += 1;
      if (event === "COMMERCIAL_ELIGIBILITY_IDENTITY_FAILURE") summary.IDENTITY_FAILURES += 1;
      return summary;
    }, {
      PRODUCTION_RUNS: 0,
      HUMAN_REVIEWS: 0,
      HUMAN_CORRECTIONS: 0,
      HUMAN_DEFERRALS: 0,
      STALE_INVALIDATIONS: 0,
      POLICY_DENIALS: 0,
      EFFECT_DENIALS: 0,
      CLASSIFICATION_FAILURES: 0,
      AUDIT_FAILURES: 0,
      IDENTITY_FAILURES: 0
    });
    telemetry.SUCCESSFUL_CLASSIFICATIONS = classifications.filter((item) => !["INSUFFICIENT_EVIDENCE", "STALE_OR_CONFLICTING_STATE"].includes(item.CLASSIFICATION)).length;
    telemetry.INSUFFICIENT_EVIDENCE_RESULTS = classifications.filter((item) => item.CLASSIFICATION === "INSUFFICIENT_EVIDENCE").length;
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
      classifications,
      telemetry
    };
  }

  return { prepare, proveStaleReview, review, supervision };
}

module.exports = { createCapabilityCredential, createCommercialEligibilityProductionBinding };
