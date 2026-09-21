"use strict";

const crypto = require("node:crypto");

const MODES = Object.freeze({ DRY_RUN: "DRY_RUN", EXECUTE: "EXECUTE" });
const RESOLUTION_ORDER = Object.freeze([
  "REGISTERED_CANONICAL_ARTIFACT",
  "CANONICAL_SHAREPOINT_ONEDRIVE_TITLE_WORKSPACE",
  "GOVERNED_HISTORICAL_TITLE_WORKSPACE",
  "EXECUTION_EVIDENCE_RECOVERY_SOURCES",
  "GENUINELY_MISSING"
]);

function clean(value) { return String(value || "").trim(); }
function runtime() { return require("./editorialExecutionRuntime"); }
function blocked(code, detail, extra = {}) { return { ok: false, status: "BLOCKED", code, detail, mutationsPerformed: 0, ...extra }; }
function sha256(bytes) { return crypto.createHash("sha256").update(bytes).digest("hex"); }

async function evaluateSharePointArtifactReconciliation(input = {}, deps = {}) {
  const executionMode = clean(input.executionMode).toUpperCase();
  if (!Object.values(MODES).includes(executionMode)) return blocked("EXECUTION_MODE_REQUIRED", "executionMode must be DRY_RUN or EXECUTE.");
  if (!clean(input.titleId) || !clean(input.artifactId)) return blocked("EXACT_ARTIFACT_IDENTITY_REQUIRED", "titleId and artifactId are required.");
  const editorialRuntime = deps.client && deps.graphRequest && deps.resolveSourceGraphItem ? null : runtime();
  const client = deps.client || editorialRuntime.createDataverseClient(editorialRuntime.requireDataverseConfig(), deps);
  const graph = deps.graphRequest || editorialRuntime.graphRequest;
  const resolveGraphItem = deps.resolveSourceGraphItem || editorialRuntime.resolveSourceGraphItem;
  const artifacts = await client.list("jm1pub_editorialartifacts", {
    $select: "jm1pub_editorialartifactid,jm1pub_editorialartifactname,jm1pub_filename,jm1pub_sha256,jm1pub_repositorydriveid,jm1pub_repositoryitemid,jm1pub_repositorypath,jm1pub_iscurrentapproved,_jm1pub_titleid_value,_jm1pub_editorialstageid_value,modifiedon",
    $filter: `jm1pub_editorialartifactid eq ${clean(input.artifactId)} and _jm1pub_titleid_value eq ${clean(input.titleId)}`,
    $top: "2"
  });
  if (artifacts.length !== 1) return blocked("REGISTERED_ARTIFACT_NOT_UNIQUE", "Exactly one title-bound artifact must resolve.", { resolvedCount: artifacts.length, resolutionOrder: RESOLUTION_ORDER });
  const artifact = artifacts[0];
  if (artifact.jm1pub_iscurrentapproved !== true && input.allowHistorical !== true) {
    return blocked("ARTIFACT_NOT_CURRENT_APPROVED", "Registration repair requires the current approved artifact unless governed historical reconciliation is explicit.");
  }
  const resolved = await resolveGraphItem(artifact, "ARTIFACT_RECONCILIATION");
  const bytes = await graph(resolved.contentPath);
  if (!Buffer.isBuffer(bytes)) return blocked("SHAREPOINT_CONTENT_NOT_BINARY", "The resolved SharePoint item did not return binary content.");
  const currentChecksum = sha256(bytes);
  const registeredChecksum = clean(artifact.jm1pub_sha256).toLowerCase();
  return {
    ok: true,
    status: currentChecksum === registeredChecksum ? "AUTHORITY_CURRENT" : executionMode === MODES.DRY_RUN ? "DRIFT_PROVEN" : "REPAIR_READY",
    executionMode,
    resolutionOrder: RESOLUTION_ORDER,
    authoritySource: artifact.jm1pub_repositorydriveid && artifact.jm1pub_repositoryitemid
      ? "REGISTERED_CANONICAL_ARTIFACT"
      : "CANONICAL_SHAREPOINT_ONEDRIVE_TITLE_WORKSPACE",
    artifact,
    graphIdentity: { driveId: resolved.driveId, itemId: resolved.item?.id, path: artifact.jm1pub_repositorypath, filename: resolved.item?.name || artifact.jm1pub_filename, size: bytes.length },
    registeredChecksum,
    currentChecksum,
    checksumParity: currentChecksum === registeredChecksum,
    mutationsPerformed: 0
  };
}

async function runSharePointArtifactReconciliation(input = {}, deps = {}) {
  const evaluated = await evaluateSharePointArtifactReconciliation(input, deps);
  if (!evaluated.ok || evaluated.status === "AUTHORITY_CURRENT" || evaluated.executionMode === MODES.DRY_RUN) return evaluated;
  const editorialRuntime = deps.client && deps.writeLog ? null : runtime();
  const client = deps.client || editorialRuntime.createDataverseClient(editorialRuntime.requireDataverseConfig(), deps);
  const writeLog = deps.writeLog || editorialRuntime.writeLog;
  await client.patch("jm1pub_editorialartifacts", clean(input.artifactId), {
    jm1pub_sha256: evaluated.currentChecksum,
    jm1pub_repositorydriveid: clean(evaluated.graphIdentity.driveId),
    jm1pub_repositoryitemid: clean(evaluated.graphIdentity.itemId)
  });
  const executionLogId = await writeLog(client, {
    name: `SHAREPOINT_ARTIFACT_AUTHORITY_RECONCILED - ${evaluated.graphIdentity.filename}`,
    actionType: "SHAREPOINT_ARTIFACT_AUTHORITY_RECONCILED",
    description: `titleId=${clean(input.titleId)}; artifactId=${clean(input.artifactId)}; registeredChecksum=${evaluated.registeredChecksum}; currentChecksum=${evaluated.currentChecksum}; driveId=${clean(evaluated.graphIdentity.driveId)}; itemId=${clean(evaluated.graphIdentity.itemId)}; source=${evaluated.authoritySource}. Existing bytes preserved; no artifact regenerated.`,
    sourceEntity: "jm1pub_editorialartifact",
    sourceRecordId: clean(input.artifactId)
  });
  return { ...evaluated, status: "REGISTRATION_REPAIRED", executionLogId, mutationsPerformed: 2 };
}

module.exports = { MODES, RESOLUTION_ORDER, evaluateSharePointArtifactReconciliation, runSharePointArtifactReconciliation, sha256 };
