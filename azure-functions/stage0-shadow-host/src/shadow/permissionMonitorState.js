"use strict";

const { BlobServiceClient } = require("@azure/storage-blob");
const { ManagedIdentityCredential } = require("@azure/identity");

const CONTAINER = "shadow-permission-state";
const BLOB = "authority-current.json";
const MAX_AGE_MS = 30 * 60 * 1000;
const SURFACES = ["sharepoint", "entra", "azureRbac", "dataverse", "model", "monitorSelf"];

function validatePermissionState(state, expected, now = Date.now()) {
  const sharepoint = state?.sharepoint;
  if (state?.schemaVersion !== "2.0.0" || state.overallResult !== "PASS" ||
      !expected.baselineVersion || !/^[a-f0-9]{64}$/.test(expected.baselineChecksum || "") ||
      !expected.principalId || !expected.modelResourceId || !expected.deploymentName ||
      state.baselineVersion !== expected.baselineVersion || state.baselineChecksum !== expected.baselineChecksum ||
      state.runtimeIdentityId !== expected.principalId ||
      state.bindings?.runtimePrincipalId !== expected.principalId ||
      state.bindings?.runtimeAppId !== expected.appId || state.bindings?.targetSiteId !== expected.siteId ||
      state.bindings?.grantId !== expected.grantId ||
      state.bindings?.modelResourceId !== expected.modelResourceId.toLowerCase() ||
      state.bindings?.deploymentName !== expected.deploymentName ||
      !state.monitorRunId || !/^[a-f0-9]{40}$/.test(state.monitorReleaseSha || "") ||
      !Array.isArray(state.correlationIds) || state.correlationIds.length === 0 ||
      Object.keys(state.results || {}).length !== SURFACES.length ||
      !SURFACES.every(surface => state.results[surface] === "PASS") ||
      !expected.appId || !expected.siteId || !expected.grantId ||
      sharepoint?.runtimeAppId !== expected.appId || sharepoint.targetSiteId !== expected.siteId ||
      sharepoint.grantId !== expected.grantId || sharepoint.role !== "read" ||
      sharepoint.tenantWideSharePointAccess !== false || sharepoint.unrelatedSiteGrants !== 0 ||
      sharepoint.siteEnumerationComplete !== true || !Array.isArray(sharepoint.personalSiteIds) ||
      sharepoint.personalSiteIds.length > 500) {
    throw new Error("SHADOW_PERMISSION_STATE_UNVERIFIED");
  }
  const observed = Date.parse(state.observedAt);
  const validUntil = Date.parse(state.validUntil);
  if (!Number.isFinite(observed) || observed > now || now - observed > MAX_AGE_MS ||
      !Number.isFinite(validUntil) || validUntil !== observed + MAX_AGE_MS || now > validUntil) {
    throw new Error("SHADOW_PERMISSION_STATE_STALE");
  }
  return { personalSiteIds: sharepoint.personalSiteIds,
    verdict: { monitorRunId: state.monitorRunId, baselineVersion: state.baselineVersion,
      baselineChecksum: state.baselineChecksum, runtimeIdentityId: state.runtimeIdentityId,
      observedAt: state.observedAt, validUntil: state.validUntil, bindings: state.bindings,
      monitorReleaseSha: state.monitorReleaseSha } };
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
  let length = 0;
  for await (const chunk of download.readableStreamBody) {
    length += chunk.length;
    if (length > 65536) throw new Error("SHADOW_PERMISSION_STATE_OVERSIZE");
    chunks.push(chunk);
  }
  const bytes = Buffer.concat(chunks);
  if (bytes.length > 65536) throw new Error("SHADOW_PERMISSION_STATE_OVERSIZE");
  return validatePermissionState(JSON.parse(bytes.toString("utf8")), expected);
}

module.exports = { CONTAINER, BLOB, MAX_AGE_MS, validatePermissionState, readPermissionState };
