"use strict";

const { sentChecksums } = require("../mail/inbound/businessRouter");

const STAGE_06 = "06 - Onboarding";
const STAGE_07 = "07 - Developmental Editing";

function value(input) { return String(input || "").trim(); }
function held(reason) { return { status: "HELD", reason, effects: 0 }; }
function itemPath(driveId, itemId) {
  return `drives/${encodeURIComponent(driveId)}/items/${encodeURIComponent(itemId)}?$select=id,name,folder,parentReference,webUrl,size`;
}
async function first(client, entitySet, query) {
  return (await client.list(entitySet, { ...query, $top: "1" }))[0] || null;
}

async function reconcileDevelopmentalWorkspace(input, deps = {}) {
  const { client, graph, writeLog, stage, sent, releaseSha: suppliedReleaseSha } = { ...deps, ...input };
  const releaseSha = value(suppliedReleaseSha || process.env.JM1_RELEASE_SHA);
  const stageId = value(stage?.jm1pub_editorialstageid);
  const titleId = value(stage?._jm1pub_titleid_value);
  if (!client || !graph || !writeLog || !stageId || !titleId || !sent) return held("WORKSPACE_RECONCILIATION_INPUT_MISSING");
  if (!Number.isInteger(Number(stage.jm1pub_stagesequence)) || Number(stage.jm1pub_stagesequence) < 1) {
    return held("EDITORIAL_STAGE_SEQUENCE_UNPROVEN");
  }
  if (Number(stage.jm1pub_stagetype) !== 100000001 ||
      sent.jm1_actiontype !== "PACKAGE_CADENCE_RELEASE_AUTHOR_PACKAGE_SENT" ||
      value(sent.jm1_sourcerecordid) !== stageId ||
      !/DELIVERY_STATUS=SENT(?:;|$)/.test(value(sent.jm1_actiondescription))) return held("DEVELOPMENTAL_DELIVERY_AUTHORITY_UNPROVEN");
  const gateId = value(sent.jm1_actiondescription).match(/(?:^|[; ])gate=([a-f0-9-]{36})(?:;| |$)/i)?.[1];
  if (!gateId) return held("DELIVERED_GATE_ID_UNPROVEN");
  const gate = await first(client, "jm1pub_editorialapprovalgates", {
    $select: "jm1pub_editorialapprovalgateid,jm1pub_gatestatus,jm1pub_authordecision,jm1pub_authordecisionon,_jm1pub_titleid_value,_jm1pub_editorialstageid_value,_jm1pub_deliverableartifactid_value",
    $filter: `jm1pub_editorialapprovalgateid eq ${gateId}`
  });
  const artifactId = value(gate?._jm1pub_deliverableartifactid_value);
  if (value(gate?.jm1pub_editorialapprovalgateid) !== gateId ||
      value(gate?._jm1pub_titleid_value) !== titleId ||
      value(gate?._jm1pub_editorialstageid_value) !== stageId ||
      Number(gate?.jm1pub_gatestatus) !== 196650002 || gate?.jm1pub_authordecision || gate?.jm1pub_authordecisionon || !artifactId) {
    return held("DELIVERED_REVIEW_GATE_CHANGED");
  }
  const artifact = await first(client, "jm1pub_editorialartifacts", {
    $select: "jm1pub_editorialartifactid,jm1pub_repositorydriveid,jm1pub_repositoryitemid,jm1pub_sha256,_jm1pub_titleid_value,_jm1pub_editorialstageid_value",
    $filter: `jm1pub_editorialartifactid eq ${artifactId}`
  });
  const driveId = value(artifact?.jm1pub_repositorydriveid);
  const anchorId = value(artifact?.jm1pub_repositoryitemid);
  const checksum = value(artifact?.jm1pub_sha256).toLowerCase();
  if (value(artifact?.jm1pub_editorialartifactid) !== artifactId ||
      value(artifact?._jm1pub_titleid_value) !== titleId ||
      value(artifact?._jm1pub_editorialstageid_value) !== stageId ||
      !driveId || !anchorId || !/^[a-f0-9]{64}$/.test(checksum) || !sentChecksums(sent).includes(checksum)) {
    return held("DELIVERED_ARTIFACT_AUTHORITY_UNPROVEN");
  }
  const stages = await client.list("jm1pub_editorialstages", {
    $select: "jm1pub_editorialstageid,jm1pub_stagesequence",
    $filter: `_jm1pub_titleid_value eq ${titleId}`,
    $top: "100"
  });
  if (stages.length >= 100 || stages.some((row) => Number(row.jm1pub_stagesequence) > Number(stage.jm1pub_stagesequence))) {
    return held("LATER_EDITORIAL_STAGE_REQUIRES_WORKSPACE_REVIEW");
  }
  const artifacts = await client.list("jm1pub_editorialartifacts", {
    $select: "jm1pub_editorialartifactid,jm1pub_repositorydriveid,jm1pub_repositoryitemid,jm1pub_repositorypath,_jm1pub_titleid_value",
    $filter: `_jm1pub_titleid_value eq ${titleId}`,
    $top: "100"
  });
  if (artifacts.length >= 100 || artifacts.some((row) => value(row._jm1pub_titleid_value) !== titleId)) {
    return held("TITLE_ARTIFACT_CENSUS_INCOMPLETE");
  }
  const stalePathArtifacts = artifacts.filter((row) => {
    let decoded = value(row.jm1pub_repositorypath);
    try { decoded = decodeURIComponent(decoded); } catch { /* Invalid encoding is not path authority. */ }
    return decoded.includes(`/01_Pipeline_A-Z/${STAGE_06}/`);
  });
  if (stalePathArtifacts.some((row) => value(row.jm1pub_repositorydriveid) !== driveId ||
      !value(row.jm1pub_repositoryitemid))) return held("ARTIFACT_PATH_BINDING_UNPROVEN");
  const get = (id) => graph(itemPath(driveId, id));
  const anchor = await get(anchorId);
  const editorialFolder = await get(anchor?.parentReference?.id);
  const titleFolder = await get(editorialFolder?.parentReference?.id);
  const sourceStage = await get(titleFolder?.parentReference?.id);
  const pipeline = await get(sourceStage?.parentReference?.id);
  if (value(anchor?.id) !== anchorId || value(editorialFolder?.name) !== "02_Editorial" ||
      !titleFolder?.folder || !sourceStage?.folder || value(pipeline?.name) !== "01_Pipeline_A-Z" ||
      ![STAGE_06, STAGE_07].includes(value(sourceStage.name))) return held("WORKSPACE_ANCESTRY_UNPROVEN");
  const targetStage = await graph(`drives/${encodeURIComponent(driveId)}/items/${encodeURIComponent(pipeline.id)}:/${encodeURIComponent(STAGE_07)}?$select=id,name,folder,parentReference`);
  if (value(targetStage?.name) !== STAGE_07 || !targetStage?.folder ||
      value(targetStage?.parentReference?.id) !== value(pipeline.id)) return held("TARGET_STAGE_FOLDER_UNPROVEN");
  let moved = false;
  if (value(sourceStage.name) === STAGE_06) {
    try {
      const collision = await graph(`drives/${encodeURIComponent(driveId)}/items/${encodeURIComponent(targetStage.id)}:/${encodeURIComponent(titleFolder.name)}?$select=id,name`);
      if (collision) return held("TARGET_TITLE_FOLDER_ALREADY_EXISTS");
    } catch (error) {
      if (error.status !== 404) throw error;
    }
    if (!/^[a-f0-9]{40}$/i.test(releaseSha)) return held("RELEASE_SHA_UNAVAILABLE");
    await graph(`drives/${encodeURIComponent(driveId)}/items/${encodeURIComponent(titleFolder.id)}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ parentReference: { id: targetStage.id } })
    });
    moved = true;
  }
  const movedFolder = await get(titleFolder.id);
  if (value(movedFolder?.id) !== value(titleFolder.id) ||
      value(movedFolder?.parentReference?.id) !== value(targetStage.id)) return held("WORKSPACE_MOVE_READBACK_INCOMPLETE");
  const movedAnchor = await get(anchorId);
  if (value(movedAnchor?.id) !== anchorId) return held("DELIVERED_ARTIFACT_ID_CHANGED");
  let pathsUpdated = 0;
  for (const row of stalePathArtifacts) {
    const path = value(row.jm1pub_repositorypath);
    const current = await get(row.jm1pub_repositoryitemid);
    if (value(current?.id) !== value(row.jm1pub_repositoryitemid) || !value(current?.webUrl)) {
      return held("ARTIFACT_PATH_READBACK_INCOMPLETE");
    }
    if (path !== current.webUrl) {
      await client.patch("jm1pub_editorialartifacts", row.jm1pub_editorialartifactid, {
        jm1pub_repositorypath: current.webUrl
      });
      pathsUpdated += 1;
    }
  }
  const reconciliationId = `developmental-workspace:${titleId}:${stageId}:${gateId}:${titleFolder.id}`;
  const existing = await first(client, "jm1_executionlogs", {
    $select: "jm1_executionlogid,jm1_actiondescription",
    $filter: `jm1_actiontype eq 'DEVELOPMENTAL_WORKSPACE_RECONCILED' and contains(jm1_actiondescription,'${reconciliationId.replace(/'/g, "''")}')`
  });
  const auditId = existing?.jm1_executionlogid || await writeLog(client, {
    name: `DEVELOPMENTAL_WORKSPACE_RECONCILED - ${titleId}`,
    actionType: "DEVELOPMENTAL_WORKSPACE_RECONCILED",
    description: `titleId=${titleId}; engagementId=NONE_LEGACY_TITLE_AUTHORITY; stageId=${stageId}; gateId=${gateId}; deliveryLogId=${sent.jm1_executionlogid}; priorWorkspaceStage=${sourceStage.name}; reconciledWorkspaceStage=${STAGE_07}; folderId=${titleFolder.id}; pathsUpdated=${pathsUpdated}; reason=DELIVERED_AUTHOR_REVIEW; result=PASS; releaseSha=${releaseSha}; reconciliationId=${reconciliationId}.`,
    sourceEntity: "jm1pub_title",
    sourceRecordId: titleId
  });
  return { status: "RECONCILED", moved, titleId, stageId, gateId, folderId: titleFolder.id,
    sourceStage: sourceStage.name, targetStage: STAGE_07, pathsUpdated, auditId };
}

module.exports = { reconcileDevelopmentalWorkspace };
