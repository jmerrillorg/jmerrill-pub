"use strict";

const { createHash } = require("node:crypto");
const { BlobServiceClient } = require("@azure/storage-blob");
const { ManagedIdentityCredential } = require("@azure/identity");

const ACCOUNT_URL = "https://stjm1diagrunner.blob.core.windows.net";
const CONTAINER = "jm1-publishing-stage-runtime";
const INDEX_SHA256 = "855f1854681cc755d06254e728c8367aacc38acfb6637b1d54b2172986345451";
const MAX_BYTES = 256 * 1024;
// Fixed evidence scope, not a general-purpose storage browser or execution route.
const RECEIPTS = Object.freeze([
  ["0e127af9-fcb3-5671-a0fa-e4af63c307d1", "CHAD-INDEPENDENT-20261019-V2", "cd535c2219f42e7e87c29326d6858648cea4f8d4a7c1ba7e30a917f2f76b9872", "89ebb57926a9bb02ec87c0c99c436e4570f5bf8c1e10a9996fbab7c45e06855a"],
  ["a69b9dfa-bb7b-f111-ab0f-7c1e525b15c2", "LW-APPROVED-FEBRUARY-20261019-V6", "2fb6748ba7501f4913f62c1e0e7ad82f410f1212a609352af9372e10031362bb", "9b5258f90c1fe47af8f877c4a9f7f0e056549bb1dfeaaefcadea61af90a92082"],
  ["e797232b-da7a-f111-ab0f-00224820105b", "INTENTIONAL-INDEPENDENT-20261019-V2", "b415a48f915996008c81d4d2ddb05c14c7d1834c1c6bb0b3acd5ef49f7617114", "363388a9fd21bb5bc06244bde8367c583c9f8a86c97601ff735921330fb8de93"],
  ["f1908dc9-5775-f111-ab0f-6045bdd69435", "GLORY-RELATIONSHIP-BRIDGES-20261019-V1", "edc9eb936a27ccef954c5a83838c3a481da7e365d185568cc31a7b0f351754b5", "8189e851902c35088a14d75dffa87a9a7b59e4c44a647fc8222c10d921131199"],
  ["f79006b7-f595-f111-8076-00224820105b", "TIL-SELECTIVE-PROPOSALS-20261019-V1", "3a91bd052082c3b3f387b5dd3067c3079b2df23e0f5212d2ecb31aab301142a2", "a3905eba49105b15f8ff470d4a628207587fee9b8c9f8d1ecaa60ce4370d5c36"],
].flatMap(([title, action, reply, execution]) => [
  `editorial-actions/stage07/${title}/${action}/send.json`,
  `editorial-actions/stage07/author-decisions/${title}/${reply}/decision.json`,
  `editorial-actions/stage07/author-decisions/${title}/${reply}/result.json`,
  `editorial-actions/stage07/author-decisions/executions/${title}/${execution}.json`,
]).sort());

function nativeContainer() {
  return new BlobServiceClient(ACCOUNT_URL, new ManagedIdentityCredential()).getContainerClient(CONTAINER);
}

async function exportStage07Receipts(container = nativeContainer()) {
  const properties = await container.getProperties();
  if (properties.blobPublicAccess) throw new Error("PRIVATE_STORAGE_REQUIRED");
  const rows = [];
  for (const name of RECEIPTS) {
    const blob = container.getBlobClient(name);
    const before = await blob.getProperties();
    if (!before.etag || !Number.isSafeInteger(before.contentLength) || before.contentLength < 1 || before.contentLength > MAX_BYTES) {
      throw new Error("INVALID_RECEIPT_SIZE_OR_ETAG");
    }
    const bytes = await blob.downloadToBuffer(0, before.contentLength, { conditions: { ifMatch: before.etag } });
    if (bytes.length !== before.contentLength) throw new Error("INCOMPLETE_RECEIPT");
    rows.push({ name, etag: before.etag, lastModified: before.lastModified,
      byteLength: bytes.length, sha256: createHash("sha256").update(bytes).digest("hex"),
      bytesBase64: bytes.toString("base64") });
  }
  return { schemaVersion: 1, readOnly: true, provenanceIndexSha256: INDEX_SHA256,
    capturedAt: new Date().toISOString(), container: CONTAINER, count: rows.length, rows };
}

module.exports = { exportStage07Receipts, RECEIPTS, MAX_BYTES, CONTAINER, ACCOUNT_URL, INDEX_SHA256 };
