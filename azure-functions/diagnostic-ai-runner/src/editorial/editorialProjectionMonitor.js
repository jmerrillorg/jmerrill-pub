"use strict";

const { createDataverseClient, requireDataverseConfig, graphRequest, findExecutionLog, writeLog } = require("./editorialExecutionRuntime");
const { reconcileDeliveredReviewStage } = require("./editorialCadenceReleaseConsumer");
const { reconcileDevelopmentalWorkspace } = require("./developmentalWorkspaceReconciliation");

const clean = (v) => String(v || "").trim();
const guid = (v) => /^[a-f0-9-]{36}$/i.test(clean(v));

function exactDelivery(logs, stageId, gateId) {
  return logs.find((log) => log.jm1_actiontype === "PACKAGE_CADENCE_RELEASE_AUTHOR_PACKAGE_SENT" &&
    clean(log.jm1_sourcerecordid) === stageId &&
    /DELIVERY_STATUS=SENT(?:;|$)/.test(clean(log.jm1_actiondescription)) &&
    new RegExp(`(?:^|[; ])gate=${gateId}(?:;| |$)`, "i").test(clean(log.jm1_actiondescription)));
}

async function inspectWorkspace(graph, driveId, itemId) {
  if (!driveId || !itemId) return { status: "UNPROVEN" };
  const get = (id) => graph(`drives/${encodeURIComponent(driveId)}/items/${encodeURIComponent(id)}?$select=id,name,folder,parentReference`);
  let item = await get(itemId);
  if (clean(item?.id) !== itemId) return { status: "UNPROVEN" };
  let child = null;
  for (let depth = 0; depth < 6 && item; depth += 1) {
    if (item.folder && ["06 - Onboarding", "07 - Developmental Editing"].includes(clean(item.name))) {
      const pipeline = item.parentReference?.id ? await get(item.parentReference.id) : null;
      if (clean(pipeline?.name) !== "01_Pipeline_A-Z" || !pipeline?.folder || !child?.folder) {
        return { status: "UNPROVEN" };
      }
      return { status: "PROVEN", stage: clean(item.name), folderId: clean(child.id) };
    }
    const parentId = clean(item.parentReference?.id);
    if (!parentId) break;
    child = item;
    item = await get(parentId);
  }
  return { status: "UNPROVEN" };
}

async function runEditorialProjectionMonitor(deps = {}) {
  const client = deps.client || createDataverseClient(requireDataverseConfig(), deps);
  const graph = deps.graph || graphRequest;
  const logWriter = deps.writeLog || writeLog;
  const autoReconcile = deps.autoReconcile === true;
  const [stages, gates] = await Promise.all([
    client.list("jm1pub_editorialstages", { $select: "jm1pub_editorialstageid,jm1pub_stagetype,jm1pub_stagesequence,jm1pub_stagestatus,_jm1pub_titleid_value", $top: "100" }),
    client.list("jm1pub_editorialapprovalgates", {
      $select: "jm1pub_editorialapprovalgateid,jm1pub_gatestatus,jm1pub_authordecision,jm1pub_authordecisionon,_jm1pub_titleid_value,_jm1pub_editorialstageid_value,_jm1pub_deliverableartifactid_value",
      $filter: "jm1pub_gatestatus eq 196650002", $top: "100"
    })
  ]);
  const exceptions = [];
  const remediated = [];
  if (stages.length >= 100 || gates.length >= 100) {
    exceptions.push({ titleId: "CENSUS", stageId: "CENSUS", gateId: "CENSUS",
      classification: "AMBIGUOUS", reason: "PROJECTION_CENSUS_PAGINATION_REQUIRED" });
  }
  for (const gate of gates) {
    const gateId = clean(gate.jm1pub_editorialapprovalgateid);
    const stageId = clean(gate._jm1pub_editorialstageid_value);
    const titleId = clean(gate._jm1pub_titleid_value);
    if (!guid(gateId) || !guid(stageId) || !guid(titleId)) {
      exceptions.push({ titleId, stageId, gateId, classification: "AMBIGUOUS", reason: "GATE_IDENTITY_UNPROVEN" });
      continue;
    }
    const stage = stages.find((row) => clean(row.jm1pub_editorialstageid) === stageId && clean(row._jm1pub_titleid_value) === titleId);
    if (!stage) {
      exceptions.push({ titleId, stageId, gateId, classification: "AMBIGUOUS", reason: "PENDING_GATE_STAGE_NOT_IN_CENSUS" });
      continue;
    }
    if (gate.jm1pub_authordecision || gate.jm1pub_authordecisionon) {
      exceptions.push({ titleId, stageId, gateId, classification: "AMBIGUOUS", reason: "PENDING_GATE_HAS_AUTHOR_DECISION" });
      continue;
    }
    const logs = await client.list("jm1_executionlogs", {
      $select: "jm1_executionlogid,jm1_actiontype,jm1_actiondescription,jm1_sourcerecordid",
      $filter: `jm1_actiontype eq 'PACKAGE_CADENCE_RELEASE_AUTHOR_PACKAGE_SENT' and jm1_sourcerecordid eq '${stageId}'`,
      $orderby: "createdon desc", $top: "20"
    });
    const sent = exactDelivery(logs, stageId, gateId);
    if (!sent) continue;
    const later = stages.some((row) => clean(row._jm1pub_titleid_value) === titleId &&
      Number(row.jm1pub_stagesequence) > Number(stage.jm1pub_stagesequence));
    if (later) continue;
    if (Number(stage.jm1pub_stagestatus) === 100000001) {
      let result = null;
      if (autoReconcile) {
        try { result = await reconcileDeliveredReviewStage(client, stage, sent); }
        catch (error) { result = { status: "HELD", reason: error?.safeCode || "STAGE_RECONCILIATION_FAILED" }; }
      }
      const item = { titleId, stageId, gateId, classification: "SYSTEM_ACTIONABLE", reason: "DELIVERED_STAGE_STATUS_LAG", deliveryLogId: sent.jm1_executionlogid };
      if (result?.status === "RECONCILED") remediated.push({ ...item, auditId: result.logId });
      else exceptions.push({ ...item, remediation: result?.reason || result?.status || "NOT_ATTEMPTED" });
    } else if (Number(stage.jm1pub_stagestatus) !== 100000002) {
      exceptions.push({ titleId, stageId, gateId, classification: "AMBIGUOUS", reason: "DELIVERED_GATE_STAGE_CONFLICT", deliveryLogId: sent.jm1_executionlogid });
    }
    if (Number(stage.jm1pub_stagetype) !== 100000001) continue;
    const artifactId = clean(gate._jm1pub_deliverableartifactid_value);
    if (!guid(artifactId)) continue;
    const artifact = (await client.list("jm1pub_editorialartifacts", {
      $select: "jm1pub_editorialartifactid,jm1pub_repositorydriveid,jm1pub_repositoryitemid,_jm1pub_titleid_value,_jm1pub_editorialstageid_value",
      $filter: `jm1pub_editorialartifactid eq ${artifactId}`, $top: "1"
    }))[0];
    if (clean(artifact?._jm1pub_titleid_value) !== titleId || clean(artifact?._jm1pub_editorialstageid_value) !== stageId) {
      exceptions.push({ titleId, stageId, gateId, classification: "AMBIGUOUS", reason: "DELIVERED_ARTIFACT_BINDING_UNPROVEN" });
      continue;
    }
    try {
      const workspace = await inspectWorkspace(graph, clean(artifact.jm1pub_repositorydriveid), clean(artifact.jm1pub_repositoryitemid));
      if (workspace.status !== "PROVEN") {
        exceptions.push({ titleId, stageId, gateId, classification: "AMBIGUOUS", reason: "WORKSPACE_ANCESTRY_UNPROVEN" });
      } else if (workspace.stage === "06 - Onboarding") {
        const result = autoReconcile ? await reconcileDevelopmentalWorkspace({ client, graph, writeLog: logWriter,
          stage, sent }, deps) : null;
        const item = { titleId, stageId, gateId, classification: "SYSTEM_ACTIONABLE", reason: "DELIVERED_WORKSPACE_STAGE_LAG", folderId: workspace.folderId };
        if (result?.status === "RECONCILED") remediated.push({ ...item, auditId: result.auditId });
        else exceptions.push({ ...item, remediation: result?.reason || "NOT_ATTEMPTED" });
      } else if (workspace.stage !== "07 - Developmental Editing") {
        exceptions.push({ titleId, stageId, gateId, classification: "AMBIGUOUS", reason: "DELIVERED_WORKSPACE_STAGE_CONFLICT", folderId: workspace.folderId });
      }
    } catch (error) {
      exceptions.push({ titleId, stageId, gateId, classification: "AMBIGUOUS", reason: error?.safeCode || "WORKSPACE_READ_FAILED" });
    }
  }
  let newAlerts = 0;
  for (const item of exceptions) {
    const idempotencyKey = `editorial-projection-exception:${item.titleId}:${item.stageId}:${item.gateId}:${item.reason}`;
    if (await findExecutionLog(client, "EDITORIAL_PROJECTION_EXCEPTION", idempotencyKey)) continue;
    await logWriter(client, { name: `EDITORIAL_PROJECTION_EXCEPTION - ${item.reason}`,
      actionType: "EDITORIAL_PROJECTION_EXCEPTION",
      description: `classification=${item.classification}; reason=${item.reason}; titleId=${item.titleId}; stageId=${item.stageId}; gateId=${item.gateId}; deliveryLogId=${item.deliveryLogId || "NONE"}; folderId=${item.folderId || "NONE"}; reconciliationId=${idempotencyKey}; result=OPEN; timestamp=${new Date().toISOString()}; releaseSha=${process.env.JM1_RELEASE_SHA || "UNAVAILABLE"}; businessEffects=0.`,
      sourceEntity: "jm1pub_title", sourceRecordId: item.titleId });
    newAlerts += 1;
  }
  return { status: exceptions.length ? "EXCEPTIONS" : remediated.length ? "RECONCILED" : "HEALTHY", stagesExamined: stages.length,
    gatesExamined: gates.length, exceptions, remediated, newAlerts, authorCommunications: 0 };
}

module.exports = { exactDelivery, inspectWorkspace, runEditorialProjectionMonitor };
