"use strict";

const { validatePublishingWait } = require("./publishingWaitContract");

const CONTAINER = "jm1-publishing-stage-runtime";
const GUID = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;

function fail(code) {
  throw Object.assign(new Error(code), { safeCode: code });
}

function blobName(waitId) {
  if (!GUID.test(waitId || "")) fail("PUBLISHING_WAIT_ID_INVALID");
  return `waits/${waitId.toLowerCase()}.json`;
}

function createPublishingWaitStore(deps = {}) {
  let container = deps.containerClient;
  if (!container) {
    if (!process.env.AzureWebJobsStorage) fail("PUBLISHING_WAIT_STORAGE_MISSING");
    const { BlobServiceClient } = require("@azure/storage-blob");
    container = BlobServiceClient.fromConnectionString(process.env.AzureWebJobsStorage)
      .getContainerClient(CONTAINER);
  }
  return {
    async *list() {
      for await (const blob of container.listBlobsFlat({ prefix: "waits/" })) {
        const match = /^waits\/([0-9a-f-]{36})\.json$/.exec(blob.name);
        if (!match) continue;
        const snapshot = await this.read(match[1]);
        if (snapshot.value) yield snapshot;
      }
    },
    async read(waitId) {
      const blob = container.getBlockBlobClient(blobName(waitId));
      try {
        const properties = await blob.getProperties();
        const bytes = await blob.downloadToBuffer(0, undefined, { conditions: { ifMatch: properties.etag } });
        const value = JSON.parse(bytes.toString("utf8"));
        validatePublishingWait(value);
        if (value.waitId.toLowerCase() !== waitId.toLowerCase()) fail("PUBLISHING_WAIT_STORE_ID_MISMATCH");
        return { value, etag: properties.etag };
      } catch (error) {
        if (error?.statusCode === 404 || error?.code === "BlobNotFound") return { value: null, etag: null };
        throw error;
      }
    },
    async compareAndSwap(waitId, etag, value) {
      validatePublishingWait(value);
      if (value.waitId.toLowerCase() !== waitId.toLowerCase()) fail("PUBLISHING_WAIT_STORE_ID_MISMATCH");
      const blob = container.getBlockBlobClient(blobName(waitId));
      try {
        await blob.uploadData(Buffer.from(JSON.stringify(value)), {
          blobHTTPHeaders: { blobContentType: "application/json" },
          conditions: etag ? { ifMatch: etag } : { ifNoneMatch: "*" }
        });
        return true;
      } catch (error) {
        if ([409, 412].includes(error?.statusCode) ||
            ["BlobAlreadyExists", "ConditionNotMet"].includes(error?.code)) return false;
        throw error;
      }
    }
  };
}

module.exports = { blobName, createPublishingWaitStore };
