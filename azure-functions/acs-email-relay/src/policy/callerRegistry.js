"use strict";

const CALLER_REGISTRY_VERSION = "JM1-RELAY-CALLERS-v1.1.0";

const BRAND_ALIASES = Object.freeze({
  PUBLISHING: "JMP",
  FINANCIAL: "JMF",
  FOUNDATION: "JMFN",
  PRODUCTIONS: "JMPRODUCTIONS"
});

const CALLERS = Object.freeze([
  caller({
    callerId: "publishing-web-prod",
    identity: {
      type: "ENTRA_WORKLOAD_IDENTITY",
      objectId: "ce363f5a-94f3-4ea9-9ba3-061404fca098"
    },
    application: "J Merrill Publishing production web runtime",
    canonicalRepo: "jmerrillorg/jmerrill-pub",
    authorizedBrands: ["JMP"],
    authorizedTemplates: ["*"],
    status: "ACTIVE",
    lastProven: null
  }),
  caller({
    callerId: "publishing-diagnostic-runner-prod",
    identity: {
      type: "ENTRA_WORKLOAD_IDENTITY",
      objectId: "e8c51a80-bdb0-46fa-b398-9109719d6427"
    },
    application: "J Merrill Publishing diagnostic and editorial runtime",
    canonicalRepo: "jmerrillorg/jmerrill-pub",
    authorizedBrands: ["JMP"],
    authorizedTemplates: ["PUBLISHING.PAYMENT_ELECTION_REQUIRED"],
    status: "ACTIVE",
    lastProven: null
  }),
  caller({
    callerId: "publishing-legacy-shared-relay-key",
    identity: {
      type: "LEGACY_SHARED_KEY",
      credentialSetting: "JM1_RELAY_API_KEY"
    },
    application: "Known Publishing relay consumers pending JM1-COMMS-002A adoption",
    canonicalRepo: "jmerrillorg/jmerrill-pub",
    authorizedBrands: ["JMP"],
    authorizedTemplates: ["*"],
    status: "LEGACY_COMPATIBILITY",
    lastProven: null
  })
]);

function caller(value) {
  return Object.freeze({
    registryVersion: CALLER_REGISTRY_VERSION,
    ...value,
    authorizedBrands: Object.freeze(value.authorizedBrands.map(normalizeBrand)),
    authorizedTemplates: Object.freeze((value.authorizedTemplates || []).map(normalizeTemplate))
  });
}

function normalizeTemplate(value) {
  return String(value || "").trim().toUpperCase().replace(/[\s-]+/g, "_");
}

function normalizeBrand(value) {
  const normalized = String(value || "").trim().toUpperCase().replace(/[\s-]+/g, "_");
  return BRAND_ALIASES[normalized] || normalized;
}

function findCallerByObjectId(objectId) {
  const normalized = String(objectId || "").trim().toLowerCase();
  if (!normalized) return null;
  return CALLERS.find((entry) => entry.identity.type === "ENTRA_WORKLOAD_IDENTITY"
    && entry.identity.objectId.toLowerCase() === normalized) || null;
}

function getLegacyCaller() {
  return CALLERS.find((entry) => entry.identity.type === "LEGACY_SHARED_KEY") || null;
}

function authorizeCallerForBrand(callerRecord, brand) {
  const normalizedBrand = normalizeBrand(brand);
  if (!callerRecord) return { ok: false, reason: "UNKNOWN_CALLER" };
  if (callerRecord.status !== "ACTIVE" && callerRecord.status !== "LEGACY_COMPATIBILITY") {
    return { ok: false, reason: "CALLER_INACTIVE" };
  }
  if (!callerRecord.authorizedBrands.includes(normalizedBrand)) {
    return { ok: false, reason: "CALLER_BRAND_NOT_AUTHORIZED", brand: normalizedBrand };
  }
  return { ok: true, caller: callerRecord, brand: normalizedBrand };
}

function authorizeCallerForTemplate(callerRecord, templateId) {
  if (!callerRecord) return { ok: false, reason: "UNKNOWN_CALLER" };
  const normalizedTemplate = normalizeTemplate(templateId);
  if (!normalizedTemplate) return { ok: false, reason: "TEMPLATE_ID_REQUIRED" };
  if (!callerRecord.authorizedTemplates.includes("*") && !callerRecord.authorizedTemplates.includes(normalizedTemplate)) {
    return { ok: false, reason: "CALLER_TEMPLATE_NOT_AUTHORIZED", templateId: normalizedTemplate };
  }
  return { ok: true, caller: callerRecord, templateId: normalizedTemplate };
}

function listCallers() {
  return [...CALLERS];
}

module.exports = {
  CALLER_REGISTRY_VERSION,
  authorizeCallerForBrand,
  authorizeCallerForTemplate,
  findCallerByObjectId,
  getLegacyCaller,
  listCallers,
  normalizeBrand
};
