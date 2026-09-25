"use strict";

const { BlobServiceClient } = require("@azure/storage-blob");
const { ManagedIdentityCredential } = require("@azure/identity");

const CONTAINER = "shadow-permission-state";
const BLOB = "current.json";
const MAX_AGE_MS = 30 * 60 * 1000;

function validatePermissionState(state, expected, now = Date.now()) {
  if (state?.schemaVersion !== "1.0.0" || state.status !== "PASS" ||
      !expected.appId || !expected.siteId || !expected.grantId ||
      state.runtimeAppId !== expected.appId || state.targetSiteId !== expected.siteId ||
      state.grantId !== expected.grantId || state.role !== "read" ||
      state.tenantWideSharePointAccess !== false || state.unrelatedSiteGrants !== 0) {
    throw new Error("SHADOW_PERMISSION_STATE_UNVERIFIED");
  }
  const observed = Date.parse(state.observedAt);
  if (!Number.isFinite(observed) || observed > now + 60_000 || now - observed > MAX_AGE_MS) {
    throw new Error("SHADOW_PERMISSION_STATE_STALE");
  }
  return true;
}

async function readPermissionState({ accountName, clientId, expected }) {
  if (!/^[a-z0-9]{3,24}$/.test(accountName || "") || !clientId) {
    throw new Error("SHADOW_PERMISSION_STATE_CONFIG_MISSING");
  }
  const service = new BlobServiceClient(
    `https://${accountName}.blob.core.windows.net`, new ManagedIdentityCredential(clientId),
  );
  const blob = service.getContainerClient(CONTAINER).getBlobClient(BLOB);
  const download = await blob.download();
  const chunks = [];
  for await (const chunk of download.readableStreamBody) chunks.push(chunk);
  const bytes = Buffer.concat(chunks);
  if (bytes.length > 8192) throw new Error("SHADOW_PERMISSION_STATE_OVERSIZE");
  return validatePermissionState(JSON.parse(bytes.toString("utf8")), expected);
}

module.exports = { CONTAINER, BLOB, MAX_AGE_MS, validatePermissionState, readPermissionState };
