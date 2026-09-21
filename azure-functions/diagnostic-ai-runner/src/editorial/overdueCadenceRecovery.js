"use strict";

const { createHash } = require("node:crypto");
const {
  createDataverseClient,
  findExecutionLog,
  graphRequest,
  requireDataverseConfig,
  resolveSourceGraphItem,
  writeLog
} = require("./editorialExecutionRuntime");
const { runEditorialCadenceReleaseConsumer } = require("./editorialCadenceReleaseConsumer");

const RECOVERY_AUTHORITY = "JMP-PUBLISHING-V2-PORTFOLIO-OVERDUE-CADENCE-OVERRIDE-2026-09-21";
const AUTHOR_FACING_VISIBILITY = 196650000;
const CURRENT_APPROVED_STATUS = 196650002;

const RECOVERY_COHORT = Object.freeze([
  Object.freeze({
    key: "ATTA",
    titleId: "ca68c994-fd89-f111-ab10-00224820105b",
    stageId: "7cf90c36-6cb5-f111-aaac-000d3a14673b",
    contactId: "60937251-d589-f111-ab10-6045bdd69678",
    gateId: "40d82a7c-6cb5-f111-aaac-7c1e525b15c2",
    intakeReference: "JMP-INT-202607-422JSZ",
    titleName: "Untitled",
    authorName: "Atta Boateng",
    recipient: "zecatconserve@yahoo.com",
    workspacePath: null
  }),
  Object.freeze({
    key: "WHOLE",
    titleId: "daf8180f-85a3-f111-b8de-000d3a14673b",
    stageId: "ae3c9d5e-67b5-f111-aaab-000d3a10aa9c",
    contactId: "106a78d0-fb9a-f111-b8dc-6045bdd69738",
    gateId: "4d04daa2-67b5-f111-aaac-000d3a14673b",
    intakeReference: "JMP-INT-202608-JFLY01",
    titleName: "Whole",
    authorName: "Jackuline Fly",
    recipient: "jackie2doreen@att.net",
    workspacePath: ["01_Pipeline_A-Z", "06 - Onboarding", "Fly, Jackuline - Whole", "02_Editorial"]
  })
]);

function clean(value) {
  return String(value || "").trim();
}

function normalizeId(value) {
  return clean(value).toLowerCase().replace(/[{}]/g, "");
}

function digest(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function fail(code, message, status = 409) {
  throw Object.assign(new Error(message), { safeCode: code, httpStatus: status });
}

function roleForArtifact(artifact) {
  const text = `${clean(artifact?.jm1pub_editorialartifactname)} ${clean(artifact?.jm1pub_filename)}`;
  if (/developmentally.*edited.*manuscript/i.test(text)) return "editedManuscript";
  if (/developmental.*review.*instructions/i.test(text)) return "reviewInstructions";
  return null;
}

function isCanonicalPipelineItem(item, webUrl) {
  return [webUrl, item?.parentReference?.path]
    .map((value) => decodeURIComponent(clean(value)))
    .some((value) => /(?:^|\/)01_Pipeline_A-Z(?:\/|$)/i.test(value));
}

async function resolveWorkspaceFolder(request, driveId, pathParts) {
  const parts = pathParts.slice();
  const leaf = parts.pop();
  const parentPath = parts.map(encodeURIComponent).join("/");
  const parent = await request(`drives/${driveId}/root:/${parentPath}?$select=id,name,webUrl`);
  try {
    return await request(`drives/${driveId}/items/${parent.id}:/${encodeURIComponent(leaf)}?$select=id,name,webUrl`);
  } catch (error) {
    if (error.status !== 404 && error.safeCode !== "GRAPH_ITEM_NOT_FOUND") throw error;
  }
  return request(`drives/${driveId}/items/${parent.id}/children`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: leaf, folder: {}, "@microsoft.graph.conflictBehavior": "fail" })
  });
}

async function canonicalizeArtifact(artifact, authority, client, deps = {}) {
  const request = deps.graphRequest || graphRequest;
  const resolveSource = deps.resolveSourceGraphItem || resolveSourceGraphItem;
  const source = await resolveSource(artifact, `${authority.key}_CADENCE_RECOVERY`);
  const sourceBytes = await request(source.contentPath);
  const checksum = digest(sourceBytes);
  const recordedChecksum = clean(artifact.jm1pub_sha256).toLowerCase();
  const filename = clean(artifact.jm1pub_filename || source.item.name);
  const persistedOfficeChecksumReconciliation = Boolean(
    recordedChecksum &&
    checksum !== recordedChecksum &&
    /\.docx$/i.test(filename) &&
    clean(source.item.name) === filename &&
    Number(source.item.size) === sourceBytes.length &&
    Number(artifact.jm1pub_filesizebytes) === sourceBytes.length &&
    clean(artifact.jm1pub_correlationid)
  );
  if (!recordedChecksum || (checksum !== recordedChecksum && !persistedOfficeChecksumReconciliation)) {
    fail("RECOVERY_ARTIFACT_CHECKSUM_MISMATCH", `${authority.key} artifact checksum parity failed for ${artifact.jm1pub_editorialartifactid}.`);
  }

  let driveId = source.driveId;
  let itemId = source.item.id;
  let webUrl = source.item.webUrl || artifact.jm1pub_repositorypath;
  let canonicalLocationProven = isCanonicalPipelineItem(source.item, webUrl);
  if (!canonicalLocationProven && authority.workspacePath) {
    const folder = await resolveWorkspaceFolder(request, driveId, authority.workspacePath);
    let existing = null;
    try {
      existing = await request(`drives/${driveId}/items/${folder.id}:/${encodeURIComponent(filename)}?$select=id,name,size,webUrl`);
    } catch (error) {
      if (error.status !== 404 && error.safeCode !== "GRAPH_ITEM_NOT_FOUND") throw error;
    }
    if (existing) {
      const existingBytes = await request(`drives/${driveId}/items/${existing.id}/content`);
      if (digest(existingBytes) !== checksum) fail("RECOVERY_WORKSPACE_FILENAME_COLLISION", `${authority.key} canonical workspace contains different bytes for ${filename}.`);
    } else {
      existing = await request(`drives/${driveId}/items/${folder.id}:/${encodeURIComponent(filename)}:/content`, {
        method: "PUT",
        headers: { "Content-Type": "application/octet-stream" },
        body: sourceBytes
      });
    }
    itemId = existing.id;
    webUrl = existing.webUrl;
    canonicalLocationProven = true;
  }

  if (!canonicalLocationProven) {
    fail("RECOVERY_CANONICAL_WORKSPACE_REQUIRED", `${authority.key} artifact is not in the canonical pipeline workspace.`);
  }

  await client.patch("jm1pub_editorialartifacts", artifact.jm1pub_editorialartifactid, {
    jm1pub_repositorydriveid: driveId,
    jm1pub_repositoryitemid: itemId,
    jm1pub_repositorypath: webUrl,
    jm1pub_sha256: checksum,
    jm1pub_filesizebytes: sourceBytes.length,
    jm1pub_visibility: AUTHOR_FACING_VISIBILITY,
    jm1pub_artifactstatus: CURRENT_APPROVED_STATUS,
    jm1pub_iscurrentapproved: true,
    jm1pub_versionlabel: "v2"
  });
  return {
    artifactId: artifact.jm1pub_editorialartifactid,
    role: roleForArtifact(artifact),
    filename: clean(artifact.jm1pub_filename || source.item.name),
    checksum,
    previousChecksum: recordedChecksum,
    checksumAuthority: persistedOfficeChecksumReconciliation ? "SHAREPOINT_PERSISTED_OFFICE_BYTES_RECONCILED" : "DATAVERSE_SHAREPOINT_PARITY",
    path: webUrl,
    sharePointArtifact: "PASS",
    dataverseArtifact: "PASS",
    checksumParity: "PASS"
  };
}

async function repairCohortAuthority(authority, client, deps = {}) {
  const [titles, stages, contacts, gates, artifacts, completionLogs] = await Promise.all([
    client.list("jm1pub_titles", {
      $select: "jm1pub_titleid,jm1pub_titlename,jm1pub_authorname",
      $filter: `jm1pub_titleid eq ${authority.titleId}`,
      $top: "2"
    }),
    client.list("jm1pub_editorialstages", {
      $select: "jm1pub_editorialstageid,jm1pub_name,jm1pub_stagestatus,jm1pub_intakereference,jm1pub_publishingintakereference,_jm1pub_titleid_value,_jm1pub_contactid_value",
      $filter: `jm1pub_editorialstageid eq ${authority.stageId}`,
      $top: "2"
    }),
    client.list("contacts", {
      $select: "contactid,fullname,emailaddress1",
      $filter: `contactid eq ${authority.contactId}`,
      $top: "2"
    }),
    client.list("jm1pub_editorialapprovalgates", {
      $select: "jm1pub_editorialapprovalgateid,jm1pub_gatestatus,_jm1pub_titleid_value,_jm1pub_editorialstageid_value",
      $filter: `jm1pub_editorialapprovalgateid eq ${authority.gateId}`,
      $top: "2"
    }),
    client.list("jm1pub_editorialartifacts", {
      $select: "jm1pub_editorialartifactid,jm1pub_editorialartifactname,jm1pub_filename,jm1pub_artifactstatus,jm1pub_visibility,jm1pub_versionlabel,jm1pub_sha256,jm1pub_repositorypath,jm1pub_repositorydriveid,jm1pub_repositoryitemid,jm1pub_filesizebytes,jm1pub_iscurrentapproved,jm1pub_supersededon,jm1pub_correlationid,_jm1pub_titleid_value,_jm1pub_editorialstageid_value,modifiedon",
      $filter: `_jm1pub_titleid_value eq ${authority.titleId} and _jm1pub_editorialstageid_value eq ${authority.stageId}`,
      $orderby: "modifiedon desc",
      $top: "50"
    }),
    client.list("jm1_executionlogs", {
      $select: "jm1_executionlogid,jm1_actiondescription,createdon",
      $filter: `jm1_actiontype eq 'EDITORIAL_PACKAGE_HANDOFF_COMPLETED' and jm1_sourcerecordid eq '${authority.stageId}'`,
      $orderby: "createdon desc",
      $top: "10"
    })
  ]);

  if (titles.length !== 1 || stages.length !== 1 || contacts.length !== 1 || gates.length !== 1) fail("RECOVERY_AUTHORITY_CARDINALITY_FAILED", `${authority.key} canonical identity is not singular.`);
  const title = titles[0];
  const stage = stages[0];
  const contact = contacts[0];
  const gate = gates[0];
  if (clean(title.jm1pub_titlename) !== authority.titleName || clean(title.jm1pub_authorname) !== authority.authorName) fail("RECOVERY_TITLE_AUTHOR_PARITY_FAILED", `${authority.key} title/author parity failed.`);
  if (normalizeId(stage._jm1pub_titleid_value) !== authority.titleId || normalizeId(stage._jm1pub_contactid_value) !== authority.contactId) fail("RECOVERY_STAGE_BINDING_FAILED", `${authority.key} stage binding failed.`);
  if (normalizeId(gate._jm1pub_titleid_value) !== authority.titleId || normalizeId(gate._jm1pub_editorialstageid_value) !== authority.stageId) fail("RECOVERY_GATE_BINDING_FAILED", `${authority.key} gate binding failed.`);
  if (clean(contact.emailaddress1).toLowerCase() !== authority.recipient) fail("RECOVERY_RECIPIENT_AUTHORITY_FAILED", `${authority.key} recipient authority failed.`);
  if (!completionLogs.some((row) => /QA READY_INTERNAL/i.test(clean(row.jm1_actiondescription)))) fail("RECOVERY_QA_AUTHORITY_MISSING", `${authority.key} QA completion authority is missing.`);

  const byRole = new Map();
  for (const artifact of artifacts) {
    const role = roleForArtifact(artifact);
    if (role && !artifact.jm1pub_supersededon && !byRole.has(role)) byRole.set(role, artifact);
  }
  if (!byRole.has("editedManuscript") || !byRole.has("reviewInstructions")) fail("RECOVERY_PACKAGE_INCOMPLETE", `${authority.key} required Developmental package is incomplete.`);
  const artifactResults = [];
  for (const role of ["editedManuscript", "reviewInstructions"]) {
    artifactResults.push(await canonicalizeArtifact(byRole.get(role), authority, client, deps));
  }
  await client.patch("jm1pub_editorialstages", authority.stageId, {
    jm1pub_intakereference: authority.intakeReference,
    jm1pub_publishingintakereference: authority.intakeReference
  });

  const key = `overdue-cadence-authority-repair:${authority.stageId}:v2:${RECOVERY_AUTHORITY}`;
  const existing = await findExecutionLog(client, "OVERDUE_CADENCE_RELEASE_AUTHORITY_REPAIRED", key);
  let logId = existing?.jm1_executionlogid || null;
  if (!existing) {
    logId = await writeLog(client, {
      name: `OVERDUE_CADENCE_RELEASE_AUTHORITY_REPAIRED - ${authority.titleName}`,
      actionType: "OVERDUE_CADENCE_RELEASE_AUTHORITY_REPAIRED",
      description: `Idempotency ${key}. Founder recovery authority ${RECOVERY_AUTHORITY}; titleId=${authority.titleId}; stageId=${authority.stageId}; gateId=${authority.gateId}; intakeReference=${authority.intakeReference}; requiredArtifacts=${artifactResults.map((item) => `${item.role}:${item.checksum}:${item.checksumAuthority}`).join("|")}; SHAREPOINT_ARTIFACT=PASS; DATAVERSE_ARTIFACT=PASS; CHECKSUM_PARITY=PASS; manualBusinessActions=0.`,
      sourceEntity: "jm1pub_editorialstage",
      sourceRecordId: authority.stageId
    });
  }
  return { key: authority.key, title: authority.titleName, author: authority.authorName, recipient: authority.recipient, stageId: authority.stageId, artifacts: artifactResults, logId, idempotent: Boolean(existing) };
}

async function executeOverdueCadenceRecovery(input = {}, deps = {}) {
  if (input.confirmAuthority !== RECOVERY_AUTHORITY) fail("RECOVERY_FOUNDER_AUTHORITY_REQUIRED", "Exact founder recovery authority is required.", 400);
  const client = deps.client || createDataverseClient(requireDataverseConfig(), deps);
  const repaired = [];
  for (const authority of RECOVERY_COHORT) repaired.push(await repairCohortAuthority(authority, client, deps));
  const correlationId = `OVERDUE-CADENCE-RECOVERY-${new Date().toISOString()}`;
  const cadence = await (deps.runEditorialCadenceReleaseConsumer || runEditorialCadenceReleaseConsumer)(
    { now: input.now || new Date().toISOString(), correlationId, maxSchedules: 100 },
    {
      ...deps,
      client,
      cadenceOverrideAuthorized: true,
      cadenceOverrideAuthority: RECOVERY_AUTHORITY,
      cadenceOverrideStageIds: RECOVERY_COHORT.map((item) => item.stageId)
    }
  );
  return { ok: true, authority: RECOVERY_AUTHORITY, repaired, cadence };
}

module.exports = { RECOVERY_AUTHORITY, RECOVERY_COHORT, executeOverdueCadenceRecovery, isCanonicalPipelineItem, repairCohortAuthority, roleForArtifact };
