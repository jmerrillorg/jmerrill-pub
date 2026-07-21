"use strict";

const {
  allowedMimeForRole,
  createDataverseClient,
  createPackageManifestArtifact,
  findExecutionLog,
  findSourceArtifact,
  normalizeStageCode,
  packageDeliveryPolicy,
  packageRoleForOutput,
  requiredPackageRoles,
  requireDataverseConfig,
  writeLog
} = require("./editorialExecutionRuntime");

const POLICY_VERSION = "policy-v1";
const QA_ACTION_TYPES = ["EDITORIAL_OUTPUT_QA_COMPLETED", "ACTIVE_EDITORIAL_QA_COMPLETED"];

function normalizeString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function escapeODataText(value) {
  return normalizeString(value).replace(/'/g, "''");
}

function inferContentType(artifact) {
  const filename = normalizeString(artifact.jm1pub_filename).toLowerCase();
  const extension = normalizeString(artifact.jm1pub_fileextension).toLowerCase();
  if (extension === "docx" || filename.endsWith(".docx")) {
    return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  }
  if (extension === "pdf" || filename.endsWith(".pdf")) return "application/pdf";
  if (extension === "json" || filename.endsWith(".json")) return "application/json";
  if (extension === "txt" || filename.endsWith(".txt")) return "text/plain";
  return "text/markdown";
}

function outputNameFromArtifact(artifactName) {
  return normalizeString(artifactName).split(" - ")[0] || normalizeString(artifactName);
}

function toOutput(artifact) {
  return {
    outputName: outputNameFromArtifact(artifact.jm1pub_editorialartifactname),
    artifactId: artifact.jm1pub_editorialartifactid,
    itemId: artifact.jm1pub_repositoryitemid,
    filename: artifact.jm1pub_filename,
    extension: artifact.jm1pub_fileextension,
    contentType: inferContentType(artifact),
    size: artifact.jm1pub_filesizebytes,
    sha256: artifact.jm1pub_sha256
  };
}

function newestByRole(artifacts) {
  const selected = new Map();
  for (const artifact of artifacts) {
    const output = toOutput(artifact);
    const role = packageRoleForOutput(output.outputName);
    if (!role) continue;
    const existing = selected.get(role);
    if (!existing || new Date(artifact.modifiedon || artifact.createdon || 0) > new Date(existing.modifiedon || existing.createdon || 0)) {
      selected.set(role, { ...artifact, output, role });
    }
  }
  return [...selected.values()].map((item) => item.output);
}

function deliverableForStage(stageCode, outputs) {
  const preferredRole =
    stageCode === "DEVELOPMENTAL_EDITING"
      ? "editedManuscript"
      : stageCode === "PROOFREADING"
        ? "proofreadManuscript"
        : "assessment";
  return outputs.find((output) => packageRoleForOutput(output.outputName) === preferredRole) || outputs[0] || null;
}

async function listQaCompletedLogs(client, maxOutputs) {
  const filters = QA_ACTION_TYPES.map((actionType) => `jm1_actiontype eq '${actionType}'`).join(" or ");
  return client.list("jm1_executionlogs", {
    $select: "jm1_executionlogid,jm1_actiontype,jm1_actiondescription,jm1_sourcerecordid,createdon",
    $filter: `(${filters})`,
    $orderby: "createdon desc",
    $top: String(maxOutputs)
  });
}

async function getStage(client, stageId) {
  const rows = await client.list("jm1pub_editorialstages", {
    $select:
      "jm1pub_editorialstageid,jm1pub_name,jm1pub_stagetype,jm1pub_stagestatus,jm1pub_internaloperationalsummary,jm1pub_authorsafesummary,_jm1pub_titleid_value,_jm1pub_publishingassetid_value,createdon,modifiedon",
    $filter: `jm1pub_editorialstageid eq ${stageId}`,
    $top: "1"
  });
  return rows[0] || null;
}

async function listStageArtifacts(client, stage) {
  return client.list("jm1pub_editorialartifacts", {
    $select:
      "jm1pub_editorialartifactid,jm1pub_editorialartifactname,jm1pub_filename,jm1pub_fileextension,jm1pub_filesizebytes,jm1pub_repositorydriveid,jm1pub_repositoryitemid,jm1pub_repositorypath,jm1pub_sha256,jm1pub_artifactstatus,jm1pub_visibility,createdon,modifiedon,_jm1pub_titleid_value,_jm1pub_editorialstageid_value",
    $filter:
      `_jm1pub_titleid_value eq ${stage._jm1pub_titleid_value} and ` +
      `_jm1pub_editorialstageid_value eq ${stage.jm1pub_editorialstageid}`,
    $orderby: "modifiedon desc",
    $top: "50"
  });
}

async function blockHandoff(client, stage, reason, correlationId, idempotencyKey) {
  const existing = await findExecutionLog(client, "EDITORIAL_PACKAGE_HANDOFF_BLOCKED", idempotencyKey);
  if (existing) return { status: "BLOCKED", reason, idempotent: true, logId: existing.jm1_executionlogid };
  await client.patch("jm1pub_editorialstages", stage.jm1pub_editorialstageid, {
    jm1pub_internaloperationalsummary:
      `PACKAGE_PREPARATION: Editorial-to-Package handoff blocked: ${reason}. Correlation ${correlationId}.`,
    jm1pub_authorsafesummary: "Editorial work is in progress internally. No author action is required at this time."
  });
  const logId = await writeLog(client, {
    name: `EDITORIAL_PACKAGE_HANDOFF_BLOCKED - ${stage.jm1pub_name}`,
    actionType: "EDITORIAL_PACKAGE_HANDOFF_BLOCKED",
    failed: true,
    description: `${reason}. Correlation ${correlationId}. Idempotency ${idempotencyKey}.`,
    sourceEntity: "jm1pub_editorialstage",
    sourceRecordId: stage.jm1pub_editorialstageid
  });
  return { status: "BLOCKED", reason, idempotent: false, logId };
}

async function processQaLog(client, qaLog, correlationId) {
  const stageId = normalizeString(qaLog.jm1_sourcerecordid);
  if (!stageId) return { status: "SKIPPED", reason: "QA_LOG_WITHOUT_STAGE" };
  const stage = await getStage(client, stageId);
  if (!stage) return { status: "SKIPPED", reason: "STAGE_NOT_FOUND", stageId };
  const stageCode = normalizeStageCode(stage);
  const requiredRoles = requiredPackageRoles(stageCode);
  if (!requiredRoles.length) return { status: "SKIPPED", reason: "PACKAGE_POLICY_NOT_CONFIGURED", stageId, stageCode };

  const sourceArtifact = await findSourceArtifact(client, stage);
  if (!sourceArtifact) {
    return blockHandoff(
      client,
      stage,
      "EDITORIAL_PACKAGE_HANDOFF_BLOCKED — SOURCE_ARTIFACT_MISSING",
      correlationId,
      `editorial-package-handoff:block:${stageId}:${stageCode}:source-missing`
    );
  }

  const artifacts = await listStageArtifacts(client, stage);
  const outputs = newestByRole(artifacts);
  const deliverable = deliverableForStage(stageCode, outputs);
  const deliverableChecksum = normalizeString(deliverable?.sha256);
  const idempotencyKey =
    `editorial-package-handoff:${stage._jm1pub_titleid_value}:${stageId}:` +
    `${normalizeString(deliverable?.artifactId) || "missing-deliverable"}:${deliverableChecksum || "checksum-missing"}:${POLICY_VERSION}`;

  const completed = await findExecutionLog(client, "EDITORIAL_PACKAGE_HANDOFF_COMPLETED", idempotencyKey);
  if (completed) {
    return { status: "IDEMPOTENT", stageId, stageCode, logId: completed.jm1_executionlogid, idempotencyKey };
  }

  await writeLog(client, {
    name: `EDITORIAL_PACKAGE_HANDOFF_STARTED - ${stage.jm1pub_name}`,
    actionType: "EDITORIAL_PACKAGE_HANDOFF_STARTED",
    description:
      `Editorial-to-Package handoff started for ${stageCode}. QA log ${qaLog.jm1_executionlogid}. Correlation ${correlationId}. Idempotency ${idempotencyKey}.`,
    sourceEntity: "jm1pub_editorialstage",
    sourceRecordId: stageId
  });

  if (!deliverable) {
    return blockHandoff(client, stage, "EDITORIAL_PACKAGE_HANDOFF_BLOCKED — DELIVERABLE_ARTIFACT_MISSING", correlationId, idempotencyKey);
  }
  if (!deliverableChecksum) {
    return blockHandoff(client, stage, "EDITORIAL_PACKAGE_HANDOFF_BLOCKED — DELIVERABLE_CHECKSUM_MISSING", correlationId, idempotencyKey);
  }

  const missing = [];
  const invalid = [];
  for (const role of requiredRoles) {
    const output = outputs.find((item) => packageRoleForOutput(item.outputName) === role);
    if (!output) {
      missing.push(role);
      continue;
    }
    const allowed = allowedMimeForRole(role);
    if (allowed.length && !allowed.includes(output.contentType)) invalid.push(`${role}:${output.contentType}`);
    if (!normalizeString(output.sha256)) missing.push(`${role}:checksum`);
  }
  if (missing.length) {
    return blockHandoff(
      client,
      stage,
      `EDITORIAL_PACKAGE_HANDOFF_BLOCKED — REQUIRED_STAGE_ARTIFACT_MISSING:${missing.join(",")}`,
      correlationId,
      idempotencyKey
    );
  }
  if (invalid.length) {
    return blockHandoff(
      client,
      stage,
      `EDITORIAL_PACKAGE_HANDOFF_BLOCKED — INVALID_STAGE_ARTIFACT_TYPE:${invalid.join(",")}`,
      correlationId,
      idempotencyKey
    );
  }

  await writeLog(client, {
    name: `EDITORIAL_OUTPUT_PACKAGE_ELIGIBLE - ${stage.jm1pub_name}`,
    actionType: "EDITORIAL_OUTPUT_PACKAGE_ELIGIBLE",
    description:
      `QA-complete editorial output is package-eligible. Deliverable ${deliverable.artifactId}; checksum ${deliverableChecksum}; required roles ${requiredRoles.join(", ")}. Correlation ${correlationId}. Idempotency ${idempotencyKey}.`,
    sourceEntity: "jm1pub_editorialstage",
    sourceRecordId: stageId
  });
  await writeLog(client, {
    name: `EDITORIAL_OUTPUT_PACKAGE_CLAIMED - ${stage.jm1pub_name}`,
    actionType: "EDITORIAL_OUTPUT_PACKAGE_CLAIMED",
    description:
      `JM1 Automation claimed package handoff for deliverable ${deliverable.artifactId}. Correlation ${correlationId}. Idempotency ${idempotencyKey}.`,
    sourceEntity: "jm1pub_editorialstage",
    sourceRecordId: stageId
  });

  const packageVersion = stageCode === "DEVELOPMENTAL_EDITING" ? "v2" : "v1";
  if (packageVersion !== "v1") {
    await writeLog(client, {
      name: `PACKAGE_REASSEMBLED_AFTER_QA_FAILURE - ${stage.jm1pub_name}`,
      actionType: "PACKAGE_REASSEMBLED_AFTER_QA_FAILURE",
      description:
        `Prior package evidence retained; governed ${packageVersion} reassembly uses deliverable ${deliverable.artifactId} checksum ${deliverableChecksum}. Correlation ${correlationId}. Idempotency ${idempotencyKey}.`,
      sourceEntity: "jm1pub_editorialstage",
      sourceRecordId: stageId
    });
  }

  const packageResult = await createPackageManifestArtifact(client, stage, stageCode, sourceArtifact, outputs, correlationId, {
    packageVersion,
    retryReason: packageVersion === "v1" ? "" : "Corrected package-grade editorial output after prior package QA failure."
  });

  if (!packageResult.skipped) {
    await writeLog(client, {
      name: `PACKAGE_MANIFEST_REGENERATED - ${stage.jm1pub_name}`,
      actionType: "PACKAGE_MANIFEST_REGENERATED",
      description:
        `Manifest regenerated for ${packageResult.packageId}; manifest artifact ${packageResult.manifestArtifactId}; package checksum ${packageResult.packageChecksum}. Correlation ${correlationId}. Idempotency ${idempotencyKey}.`,
      sourceEntity: "jm1pub_editorialstage",
      sourceRecordId: stageId
    });
  }

  const delivery = packageDeliveryPolicy(stageCode);
  await client.patch("jm1pub_editorialstages", stageId, {
    jm1pub_internaloperationalsummary:
      `PACKAGE_PREPARATION: Editorial-to-Package handoff completed for ${packageResult.packageId}; manifest ${packageResult.manifestArtifactId}; package checksum ${packageResult.packageChecksum}; QA ${packageResult.qaStatus}; cadence ${packageResult.cadenceStatus}; next action ${delivery.nextGovernedAction}.`,
    jm1pub_authorsafesummary: delivery.audience === "AUTHOR"
      ? "Editorial work is in package preparation. No new author action is required until the package is released."
      : "Editorial work is in publisher review. No author action is required at this time."
  });

  const completedLogId = await writeLog(client, {
    name: `EDITORIAL_PACKAGE_HANDOFF_COMPLETED - ${stage.jm1pub_name}`,
    actionType: "EDITORIAL_PACKAGE_HANDOFF_COMPLETED",
    description:
      `Package handoff completed. Package ${packageResult.packageId}; version ${packageResult.packageVersion}; manifest ${packageResult.manifestArtifactId}; QA ${packageResult.qaStatus}; cadence ${packageResult.cadenceStatus}; notification ${packageResult.notificationPolicy}; workspace ${packageResult.workspaceVisibility}. Correlation ${correlationId}. Idempotency ${idempotencyKey}.`,
    sourceEntity: "jm1pub_editorialstage",
    sourceRecordId: stageId
  });

  return {
    status: "COMPLETED",
    stageId,
    stageCode,
    deliverableArtifactId: deliverable.artifactId,
    deliverableChecksum,
    packageResult,
    completedLogId,
    idempotencyKey
  };
}

async function runEditorialPackageHandoffConsumer(options = {}, deps = {}) {
  const client = deps.client || createDataverseClient(requireDataverseConfig(), deps);
  const correlationId = options.correlationId || `EDITORIAL-PACKAGE-HANDOFF-${new Date().toISOString()}`;
  const maxOutputs = Math.min(Math.max(Number(options.maxOutputs || process.env.JM1_EDITORIAL_PACKAGE_HANDOFF_MAX_OUTPUTS || 20), 1), 50);
  const qaLogs = deps.qaLogs || (await listQaCompletedLogs(client, maxOutputs));
  const results = [];
  for (const qaLog of qaLogs) {
    results.push(await processQaLog(client, qaLog, correlationId));
  }
  await writeLog(client, {
    name: "EDITORIAL_PACKAGE_HANDOFF_HEALTH_REFRESHED",
    actionType: "EDITORIAL_PACKAGE_HANDOFF_HEALTH_REFRESHED",
    description:
      `Editorial-to-Package handoff health refreshed. QA logs examined ${qaLogs.length}; completed ${results.filter((item) => item.status === "COMPLETED").length}; idempotent ${results.filter((item) => item.status === "IDEMPOTENT").length}; blocked ${results.filter((item) => item.status === "BLOCKED").length}. Correlation ${correlationId}.`,
    sourceEntity: "jm1_editorial_package_handoff_runtime",
    sourceRecordId: correlationId
  });
  return {
    ok: true,
    correlationId,
    examined: qaLogs.length,
    completed: results.filter((item) => item.status === "COMPLETED").length,
    idempotent: results.filter((item) => item.status === "IDEMPOTENT").length,
    blocked: results.filter((item) => item.status === "BLOCKED").length,
    results
  };
}

module.exports = {
  POLICY_VERSION,
  QA_ACTION_TYPES,
  deliverableForStage,
  inferContentType,
  newestByRole,
  outputNameFromArtifact,
  runEditorialPackageHandoffConsumer,
  toOutput
};
