"use strict";

const { BlobServiceClient } = require("@azure/storage-blob");
const { ManagedIdentityCredential } = require("@azure/identity");

const REQUIRED = [
  "targetSiteRead", "targetLibraryList", "targetFileMetadataRead",
  "targetFileContentRead", "unrelatedSiteReadDenied", "tenantWideSiteEnumerationDenied",
];

function validateAuthorityProbe(state, now = Date.now()) {
  const observed = Date.parse(state?.observedAt);
  if (state?.schemaVersion !== "1.0.0" || !Number.isFinite(observed) ||
      observed > now + 60_000 || now - observed > 10 * 60_000 ||
      REQUIRED.some((name) => state.states?.[name] !== "PASS")) {
    throw new Error("SHADOW_EFFECTIVE_AUTHORITY_UNVERIFIED");
  }
  return true;
}

async function readAuthorityProbe({ accountName, clientId }) {
  const service = new BlobServiceClient(
    `https://${accountName}.blob.core.windows.net`, new ManagedIdentityCredential(clientId),
  );
  const blob = service.getContainerClient("shadow-ledger").getBlobClient("health/latest.json");
  const download = await blob.download();
  const chunks = [];
  for await (const chunk of download.readableStreamBody) chunks.push(chunk);
  const bytes = Buffer.concat(chunks);
  if (bytes.length > 8192) throw new Error("SHADOW_EFFECTIVE_AUTHORITY_OVERSIZE");
  return validateAuthorityProbe(JSON.parse(bytes.toString("utf8")));
}

module.exports = { REQUIRED, validateAuthorityProbe, readAuthorityProbe };
