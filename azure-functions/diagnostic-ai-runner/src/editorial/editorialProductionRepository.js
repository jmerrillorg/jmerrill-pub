"use strict";

const crypto = require("node:crypto");
const { graphBytes } = require("./productionTitleAuthorityReader");

const GUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SHA256 = /^[a-f0-9]{64}$/i;
const ARTIFACT_SELECT = [
  "jm1pub_editorialartifactid", "jm1pub_editorialartifactname", "jm1pub_artifactstatus",
  "jm1pub_iscurrentapproved", "jm1pub_versionlabel", "jm1pub_sha256",
  "jm1pub_repositorydriveid", "jm1pub_repositoryitemid", "jm1pub_repositorypath",
  "_jm1pub_titleid_value", "_jm1pub_editorialstageid_value", "modifiedon"
].join(",");

function fail(code) {
  throw Object.assign(new Error(code), { safeCode: code });
}

function createEditorialProductionRepository({ titleId, stageId, shadowOnly = false } = {}, deps = {}) {
  if (!GUID.test(titleId || "") || !GUID.test(stageId || "") || typeof deps.client?.list !== "function") {
    fail("EDITORIAL_PRODUCTION_REPOSITORY_BINDING_REQUIRED");
  }
  const sourceBytes = new Map();

  async function exactRow(id) {
    if (!GUID.test(id || "")) fail("EDITORIAL_PRODUCTION_ARTIFACT_ID_INVALID");
    const rows = await deps.client.list("jm1pub_editorialartifacts", {
      $select: ARTIFACT_SELECT,
      $filter: `jm1pub_editorialartifactid eq ${id}`,
      $top: "2"
    });
    if (!Array.isArray(rows) || rows.length !== 1 ||
        rows[0].jm1pub_editorialartifactid?.toLowerCase() !== id.toLowerCase()) {
      fail("EDITORIAL_PRODUCTION_ARTIFACT_NOT_UNIQUE");
    }
    return rows[0];
  }

  async function verifiedBytes(row) {
    if (!SHA256.test(row.jm1pub_sha256 || "") || !row.jm1pub_repositorydriveid ||
        !row.jm1pub_repositoryitemid || !row.jm1pub_versionlabel) {
      fail("EDITORIAL_PRODUCTION_ARTIFACT_SOURCE_INCOMPLETE");
    }
    if (row._jm1pub_titleid_value) {
      let path;
      try {
        path = decodeURIComponent(row.jm1pub_repositorypath || "");
      } catch {
        fail("EDITORIAL_PRODUCTION_ARTIFACT_PATH_INVALID");
      }
      if (!path.includes("/01_Pipeline_A-Z/")) fail("EDITORIAL_PRODUCTION_ARTIFACT_PATH_NONCANONICAL");
    }
    const bytes = await graphBytes(row, deps);
    if (!Buffer.isBuffer(bytes) ||
        crypto.createHash("sha256").update(bytes).digest("hex") !== row.jm1pub_sha256.toLowerCase()) {
      fail("EDITORIAL_PRODUCTION_ARTIFACT_CHECKSUM_MISMATCH");
    }
    return bytes;
  }

  async function readSourceArtifact(id) {
    const row = await exactRow(id);
    if (row._jm1pub_titleid_value?.toLowerCase() !== titleId.toLowerCase() ||
        row.jm1pub_iscurrentapproved !== true || row.jm1pub_artifactstatus !== 196650003) {
      fail("EDITORIAL_PRODUCTION_CONTROLLING_SOURCE_NOT_APPROVED");
    }
    const bytes = await verifiedBytes(row);
    sourceBytes.set(id.toLowerCase(), bytes);
    return {
      id, titleId, currentApproved: true, sha256: row.jm1pub_sha256.toLowerCase(),
      sourceVersion: row.jm1pub_versionlabel
    };
  }

  async function downloadSourceArtifact(record) {
    const bytes = sourceBytes.get(record?.id?.toLowerCase());
    if (record?.titleId === titleId && Buffer.isBuffer(bytes) &&
        crypto.createHash("sha256").update(bytes).digest("hex") === record.sha256) {
      return bytes;
    }
    fail("EDITORIAL_PRODUCTION_CONTROLLING_SOURCE_UNBOUND");
  }

  async function readAuthoritySource(id) {
    const row = await exactRow(id);
    const approved = row.jm1pub_iscurrentapproved === true && row.jm1pub_artifactstatus === 196650003;
    const reviewReady = shadowOnly && row.jm1pub_iscurrentapproved !== true &&
      row.jm1pub_artifactstatus === 196650001;
    if (!approved && !reviewReady) fail("EDITORIAL_PRODUCTION_AUTHORITY_NOT_APPROVED");
    const rowTitle = row._jm1pub_titleid_value;
    const rowStage = row._jm1pub_editorialstageid_value;
    if (rowTitle && rowTitle.toLowerCase() !== titleId.toLowerCase()) {
      fail("EDITORIAL_PRODUCTION_AUTHORITY_CROSS_TITLE");
    }
    if (rowStage && rowStage.toLowerCase() !== stageId.toLowerCase()) {
      fail("EDITORIAL_PRODUCTION_AUTHORITY_CROSS_STAGE");
    }
    const bytes = await verifiedBytes(row);
    return {
      id, version: row.jm1pub_versionlabel, content: bytes.toString("utf8"),
      sha256: row.jm1pub_sha256.toLowerCase(), lastVerified: deps.verificationTimestamp || new Date().toISOString(),
      approved, reviewReady: !approved && reviewReady, current: true,
      sourceSystem: "SHAREPOINT",
      scope: rowTitle ? "TITLE" : rowStage ? "STAGE" : "GLOBAL",
      ...(rowTitle ? { titleId: rowTitle } : {}),
      ...(rowStage ? { stageId: rowStage } : {})
    };
  }

  return { client: deps.client, readSourceArtifact, downloadSourceArtifact, readAuthoritySource,
    downloadArtifact: deps.downloadArtifact, credential: deps.credential, fetchImpl: deps.fetchImpl };
}

module.exports = { createEditorialProductionRepository };
