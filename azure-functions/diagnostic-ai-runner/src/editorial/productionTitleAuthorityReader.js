"use strict";

const crypto = require("node:crypto");
const { DefaultAzureCredential } = require("@azure/identity");
const { verifyKnowledgeBlob } = require("../blob/knowledgeReader");
const { CANON_SOURCE } = require("./editorialStyleGuideRegistry");

const ROLES = Object.freeze({
  titleStyleSheet: { type: 196650007, name: /project style sheet/i },
  voiceProfile: { type: 196650018, name: /voice profile/i },
  titleRulings: { type: 196650013, name: /author revision rulings/i }
});

function fail(code) {
  throw Object.assign(new Error(code), { safeCode: code });
}

function normalize(value) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function roleFor(row) {
  const name = row.jm1pub_editorialartifactname || "";
  return Object.entries(ROLES).find(([, spec]) =>
    row.jm1pub_artifacttype === spec.type && spec.name.test(name))?.[0];
}

async function graphBytes(row, deps) {
  if (typeof deps.downloadArtifact === "function") return deps.downloadArtifact(row);
  const driveId = row.jm1pub_repositorydriveid;
  const itemId = row.jm1pub_repositoryitemid;
  if (!driveId || !itemId) fail("EDITORIAL_TITLE_AUTHORITY_SHAREPOINT_LOCATION_MISSING");
  const credential = deps.credential || new DefaultAzureCredential();
  const token = await credential.getToken("https://graph.microsoft.com/.default");
  if (!token?.token) fail("EDITORIAL_TITLE_AUTHORITY_GRAPH_IDENTITY_UNAVAILABLE");
  const response = await (deps.fetchImpl || fetch)(
    `https://graph.microsoft.com/v1.0/drives/${encodeURIComponent(driveId)}/items/${encodeURIComponent(itemId)}/content`,
    { headers: { Authorization: `Bearer ${token.token}` } }
  );
  if (!response.ok) fail("EDITORIAL_TITLE_AUTHORITY_SHAREPOINT_READ_FAILED");
  return Buffer.from(await response.arrayBuffer());
}

async function readExistingTitleAuthorities({ titleId, stageId, shadowOnly = false }, deps = {}) {
  if (!/^[a-f\d-]{36}$/i.test(titleId || "") || !/^[a-f\d-]{36}$/i.test(stageId || "") ||
      typeof deps.client?.list !== "function") fail("EDITORIAL_TITLE_AUTHORITY_EXACT_BINDING_REQUIRED");
  const rows = await deps.client.list("jm1pub_editorialartifacts", {
    $select: "jm1pub_editorialartifactid,jm1pub_editorialartifactname,jm1pub_artifacttype,jm1pub_artifactstatus,jm1pub_iscurrentapproved,jm1pub_versionlabel,jm1pub_sha256,jm1pub_repositorydriveid,jm1pub_repositoryitemid,jm1pub_repositorypath,_jm1pub_titleid_value,_jm1pub_editorialstageid_value,modifiedon",
    $filter: `_jm1pub_titleid_value eq ${titleId} and _jm1pub_editorialstageid_value eq ${stageId}`,
    $top: "500"
  });
  const result = {};
  for (const label of Object.keys(ROLES)) {
    const matches = rows.filter((row) => roleFor(row) === label);
    if (matches.length !== 1) fail(`EDITORIAL_TITLE_AUTHORITY_${label.toUpperCase()}_NOT_UNIQUE`);
    const row = matches[0];
    if (normalize(row._jm1pub_titleid_value) !== normalize(titleId) ||
        normalize(row._jm1pub_editorialstageid_value) !== normalize(stageId)) {
      fail(`EDITORIAL_TITLE_AUTHORITY_${label.toUpperCase()}_BINDING_MISMATCH`);
    }
    const approved = row.jm1pub_iscurrentapproved === true && row.jm1pub_artifactstatus === 196650003;
    const reviewReady = row.jm1pub_artifactstatus === 196650001 && !approved;
    if (!approved && !(shadowOnly && reviewReady)) {
      fail(`EDITORIAL_TITLE_AUTHORITY_${label.toUpperCase()}_NOT_APPROVED`);
    }
    if (!/^[a-f\d]{64}$/i.test(row.jm1pub_sha256 || "") || !row.jm1pub_versionlabel ||
        !row.jm1pub_repositorydriveid || !row.jm1pub_repositoryitemid) {
      fail(`EDITORIAL_TITLE_AUTHORITY_${label.toUpperCase()}_SOURCE_INCOMPLETE`);
    }
    let governedPath = "";
    try {
      governedPath = decodeURIComponent(row.jm1pub_repositorypath || "");
    } catch {
      fail(`EDITORIAL_TITLE_AUTHORITY_${label.toUpperCase()}_PATH_INVALID`);
    }
    if (!governedPath.includes("/01_Pipeline_A-Z/")) {
      fail(`EDITORIAL_TITLE_AUTHORITY_${label.toUpperCase()}_PATH_NONCANONICAL`);
    }
    const bytes = await graphBytes(row, deps);
    if (!Buffer.isBuffer(bytes) || crypto.createHash("sha256").update(bytes).digest("hex") !== normalize(row.jm1pub_sha256)) {
      fail(`EDITORIAL_TITLE_AUTHORITY_${label.toUpperCase()}_CHECKSUM_MISMATCH`);
    }
    result[label] = {
      id: row.jm1pub_editorialartifactid,
      version: row.jm1pub_versionlabel,
      content: bytes.toString("utf8"),
      sha256: normalize(row.jm1pub_sha256),
      lastVerified: deps.verificationTimestamp || new Date().toISOString(),
      approved,
      reviewReady,
      current: true,
      sourceSystem: "SHAREPOINT",
      scope: "TITLE",
      titleId
    };
  }
  return result;
}

async function readExistingGlobalStyleGuide(deps = {}) {
  const read = deps.verifyKnowledgeBlob || verifyKnowledgeBlob;
  const result = await read();
  if (!result?.reachable || !result.hashMatched || !result.content ||
      !/^[a-f\d]{64}$/i.test(result.calculatedSha256 || "") ||
      crypto.createHash("sha256").update(result.content, "utf8").digest("hex") !== result.calculatedSha256.toLowerCase()) {
    fail("EDITORIAL_GLOBAL_STYLE_GUIDE_NOT_VERIFIED");
  }
  return {
    id: CANON_SOURCE.documentId,
    version: CANON_SOURCE.documentId.match(/v\d+(?:\.\d+)*/)?.[0] || "CANON-LIVE",
    content: result.content,
    sha256: result.calculatedSha256.toLowerCase(),
    lastVerified: deps.verificationTimestamp || new Date().toISOString(),
    approved: true,
    current: true,
    sourceSystem: "GOVERNED_BLOB",
    scope: "GLOBAL"
  };
}

module.exports = { graphBytes, readExistingTitleAuthorities, readExistingGlobalStyleGuide };
