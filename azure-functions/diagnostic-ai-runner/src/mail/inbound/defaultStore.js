"use strict";

const { BlobInboundEvidenceStore } = require("./blobEvidenceStore");
const { InMemoryInboundEvidenceStore } = require("./evidenceStore");

let singleton = null;

function createDefaultInboundEvidenceStore() {
  if (singleton) return singleton;
  const mode = String(process.env.JM1_PUBLISHING_INBOUND_EVIDENCE_STORE || "memory").toLowerCase();
  singleton = mode === "blob"
    ? new BlobInboundEvidenceStore()
    : new InMemoryInboundEvidenceStore();
  return singleton;
}

function resetDefaultInboundEvidenceStoreForTests() {
  singleton = null;
}

module.exports = {
  createDefaultInboundEvidenceStore,
  resetDefaultInboundEvidenceStoreForTests
};
