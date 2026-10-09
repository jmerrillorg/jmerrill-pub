"use strict";

const { createHash } = require("node:crypto");
const GUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
function deny(code) { throw Object.assign(new Error(code), { safeCode: code }); }

// Scope is owner-maintained runtime authority, never an invocation assertion.
function createTitleCommissioningRuntimeReaders(deps = {}) {
  if (typeof deps.containerClient?.getBlockBlobClient !== "function") {
    deny("COMMISSIONING_SCOPE_STORE_NOT_BOUND");
  }
  return {
    async verifyReceivedSource(title, artifact, scope) {
      const received = require("./titleCommissioningReceivedSources");
      const policy = received.policyForTitle(title?.jm1pub_titleid);
      if (!policy || scope.sourceRole !== "RECEIVED_ORIGINAL" || scope.controllingSourceArtifactId !== received.sourceArtifactId(policy)) return false;
      return received.verifySourceRegistration(policy, artifact, deps);
    },
    async readScope(titleId) {
      if (!GUID.test(titleId || "")) deny("COMMISSIONING_SCOPE_TITLE_INVALID");
      const blob = deps.containerClient.getBlockBlobClient(`commissioning-scopes/${titleId.toLowerCase()}.json`);
      const properties = await blob.getProperties();
      if (!properties.etag) deny("COMMISSIONING_SCOPE_VERSION_MISSING");
      const bytes = await blob.downloadToBuffer(0, undefined, { conditions: { ifMatch: properties.etag } });
      let scope;
      try { scope = JSON.parse(bytes.toString("utf8")); }
      catch { deny("COMMISSIONING_SCOPE_INVALID"); }
      if (scope.schemaVersion !== 1 || scope.titleId !== titleId ||
          typeof scope.authorityReference !== "string" || !scope.authorityReference.trim() ||
          typeof scope.version !== "string" || !scope.version.trim()) deny("COMMISSIONING_SCOPE_PROVENANCE_INVALID");
      return { ...scope, version: `${scope.version}:${properties.etag}` };
    },
    async verifyArtifactBytes(artifact, expectedSha256) {
      if (!/^[a-f0-9]{64}$/i.test(expectedSha256 || "")) return false;
      const bytes = typeof deps.downloadArtifact === "function"
        ? await deps.downloadArtifact(artifact)
        : await require("../editorial/productionTitleAuthorityReader").graphBytes(artifact, {
          ...deps,
          credential: deps.credential || new (require("@azure/identity").ManagedIdentityCredential)(),
          fetchImpl: async (url, options) => {
            let response;
            try {
              response = await (deps.fetchImpl || fetch)(url, { ...options, signal: AbortSignal.timeout(30000) });
            } catch (error) {
              if (["TimeoutError", "AbortError"].includes(error?.name)) deny("COMMISSIONING_DEPENDENCY_UNAVAILABLE");
              throw error;
            }
            if ([408, 429, 500, 502, 503, 504].includes(response.status)) {
              throw Object.assign(new Error("COMMISSIONING_DEPENDENCY_UNAVAILABLE"), {
                safeCode: "COMMISSIONING_DEPENDENCY_UNAVAILABLE", statusCode: response.status
              });
            }
            return response;
          }
        });
      return Buffer.isBuffer(bytes) && createHash("sha256").update(bytes).digest("hex") === expectedSha256.toLowerCase();
    }
  };
}

module.exports = { createTitleCommissioningRuntimeReaders };
