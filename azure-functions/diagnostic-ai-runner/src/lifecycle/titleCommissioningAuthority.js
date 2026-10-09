"use strict";

const { readJackieCommissioningIdentity } = require("../author/jackieCommissioningIdentityReader");
const GUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function deny(code) { throw Object.assign(new Error(code), { safeCode: code }); }

// Revalidates continuing technical scope; it never requests a new human
// approval or treats an approval flag as byte-level artifact verification.
async function readTitleCommissioningAuthority(input, deps = {}) {
  const titleId = input?.title?.jm1pub_titleid;
  if (!GUID.test(titleId || "") || typeof deps.client?.first !== "function" ||
      typeof deps.verifyArtifactBytes !== "function" || typeof deps.readScope !== "function") {
    deny("COMMISSIONING_AUTHORITY_READER_NOT_BOUND");
  }
  const scope = await deps.readScope(titleId);
  if (scope?.enabled !== true || scope.revoked === true || scope.titleId !== titleId ||
      typeof scope.version !== "string" || !scope.version.trim() ||
      scope.mode !== "JACKIE_TITLE_INTERNAL_COMMISSIONING") deny("COMMISSIONING_SCOPE_NOT_CURRENT");
  const title = await deps.client.first("jm1pub_titles", { $filter: `jm1pub_titleid eq ${titleId}` });
  if (title?.jm1pub_titleid !== titleId) deny("COMMISSIONING_AUTHOR_AUTHORITY_CHANGED");
  const identityProof = await readJackieCommissioningIdentity(title, scope, deps.client);
  if (!identityProof) deny("COMMISSIONING_AUTHOR_AUTHORITY_CHANGED");
  const sourceId = /^dataverse:jm1pub_editorialartifact:([a-f0-9-]{36})$/i.exec(input.source?.reference || "")?.[1];
  if (!GUID.test(sourceId || "")) deny("COMMISSIONING_SOURCE_REFERENCE_INVALID");
  const sourceRole = input.source.role || "APPROVED_CONTROLLING";
  if (!["RECEIVED_ORIGINAL", "APPROVED_CONTROLLING"].includes(sourceRole) ||
      (scope.sourceRole || "APPROVED_CONTROLLING") !== sourceRole) deny("COMMISSIONING_SOURCE_ROLE_MISMATCH");
  if (scope.controllingSourceArtifactId !== sourceId || !Array.isArray(scope.retainedArtifactIds) ||
      !Array.isArray(input.retainedArtifacts || []) ||
      JSON.stringify([...scope.retainedArtifactIds].sort()) !==
        JSON.stringify((input.retainedArtifacts || []).map(item => item.artifactId).sort())) {
    deny("COMMISSIONING_ARTIFACT_ROLE_SCOPE_MISMATCH");
  }
  const bindings = [{ artifactId: sourceId, version: input.source.version, sha256: input.source.sha256, role: "CONTROLLING_SOURCE" },
    ...(input.retainedArtifacts || []).map(item => ({ ...item, role: "RETAINED_WORK" }))];
  const artifacts = [];
  let sourceMedia;
  for (const binding of bindings) {
    if (!GUID.test(binding.artifactId || "")) deny("COMMISSIONING_ARTIFACT_REFERENCE_INVALID");
    if (binding.role === "RETAINED_WORK" && binding.reference !== `dataverse:jm1pub_editorialartifact:${binding.artifactId}`) {
      deny("COMMISSIONING_ARTIFACT_REFERENCE_INVALID");
    }
    const artifact = await deps.client.first("jm1pub_editorialartifacts", {
      $filter: `jm1pub_editorialartifactid eq ${binding.artifactId}`
    });
    if (artifact?.jm1pub_editorialartifactid !== binding.artifactId ||
        artifact._jm1pub_titleid_value !== titleId || artifact.statecode !== 0 ||
        String(artifact.versionnumber) !== binding.version || artifact.jm1pub_sha256 !== binding.sha256 ||
        (binding.role === "CONTROLLING_SOURCE" &&
          (sourceRole === "APPROVED_CONTROLLING" ? artifact.jm1pub_iscurrentapproved !== true || artifact.jm1pub_supersededon
            : artifact.jm1pub_iscurrentapproved !== false || artifact.jm1pub_supersededon))) {
      deny("COMMISSIONING_ARTIFACT_AUTHORITY_CHANGED");
    }
    if (await deps.verifyArtifactBytes(artifact, binding.sha256) !== true) deny("COMMISSIONING_ARTIFACT_BYTES_UNVERIFIED");
    if (binding.role === "CONTROLLING_SOURCE" && sourceRole === "RECEIVED_ORIGINAL" &&
        (typeof deps.verifyReceivedSource !== "function" || await deps.verifyReceivedSource(title, artifact, scope) !== true)) {
      deny("COMMISSIONING_RECEIVED_SOURCE_PROVENANCE_UNVERIFIED");
    }
    if (binding.role === "CONTROLLING_SOURCE") sourceMedia = { repositoryPath: artifact.jm1pub_repositorypath || "" };
    artifacts.push({ artifactId: binding.artifactId, version: binding.version, sha256: binding.sha256, role: binding.role });
  }
  return { title, identityProof, artifacts, sourceMedia, scopeVersion: scope.version, current: true };
}

module.exports = { readTitleCommissioningAuthority };
