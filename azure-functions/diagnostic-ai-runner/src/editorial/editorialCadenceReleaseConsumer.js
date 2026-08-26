"use strict";

const {
  createDataverseClient,
  findExecutionLog,
  requireDataverseConfig,
  writeLog
} = require("./editorialExecutionRuntime");
const {
  PUBLISHING_MAILBOX,
  readPublishingMailboxDeliveryEvidence,
  readPublishingMailboxReply
} = require("../mail/publishingMailboxReader");
const { classifyAuthorReviewResponse, DECISION } = require("../orchestration/authorReviewResponseConsumer");
const {
  sendCadenceAuthorReviewPackage,
  validateDueSendInput
} = require("./editorialCadenceAuthorPackageSender");

const POLICY_VERSION = "JMP Editorial Cadence Doctrine v1.0";
const CONSUMER_VERSION = "editorial-cadence-release-consumer:v1.0.0";

const STAGE_BASELINE_BUSINESS_DAYS = {
  EDITORIAL_REVIEW: 2,
  DEVELOPMENTAL_EDITING: 5,
  LINE_EDITING: 5,
  COPYEDITING: 4,
  PROOFREADING: 3,
  INTERIOR_LAYOUT: 3,
  COVER_DESIGN: 5,
  PRODUCTION_PROOF: 3
};

const SENT_ACTION_TYPES = [
  "PUBLISHING_DISPATCH_OPERATIONALLY_CERTIFIED",
  "PUBLISHING_DISPATCH_AUTHOR_PACKAGE_DELIVERED",
  "FIVE_TITLE_EXECUTIVE_RECOVERY_DELIVERED",
  "AUTHOR_PACKAGE_NOTIFICATION_TRANSACTION_COMPLETED",
  "PACKAGE_CADENCE_RELEASE_AUTHOR_PACKAGE_SENT"
];

function normalizeString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function isGuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(normalizeString(value));
}

function escapeODataText(value) {
  return normalizeString(value).replace(/'/g, "''");
}

function normalizeStageCode(stage) {
  const primary = [stage?.jm1pub_name, stage?.["jm1pub_stagetype@OData.Community.Display.V1.FormattedValue"], stage?.jm1pub_stagetype]
    .map(normalizeString)
    .join(" ")
    .toLowerCase();
  if (primary.includes("line")) return "LINE_EDITING";
  if (primary.includes("copy")) return "COPYEDITING";
  if (primary.includes("proof")) return "PROOFREADING";
  if (primary.includes("interior") || primary.includes("layout")) return "INTERIOR_LAYOUT";
  if (primary.includes("cover")) return "COVER_DESIGN";
  if (primary.includes("developmental")) return "DEVELOPMENTAL_EDITING";
  if (primary.includes("editorial")) return "EDITORIAL_REVIEW";
  const priorCadenceStage = normalizeString(stage?.jm1pub_internaloperationalsummary).match(/(?:^|;\s*)stage\s+([A-Z_]+)/i)?.[1] || "";
  if (STAGE_BASELINE_BUSINESS_DAYS[priorCadenceStage]) return priorCadenceStage;
  return "EDITORIAL_REVIEW";
}

function addBusinessDays(value, days) {
  const date = new Date(value);
  let remaining = Math.max(0, Number(days || 0));
  while (remaining > 0) {
    date.setUTCDate(date.getUTCDate() + 1);
    const day = date.getUTCDay();
    if (day !== 0 && day !== 6) remaining -= 1;
  }
  return date.toISOString();
}

function remainingHoldDuration(scheduledReleaseAt, now) {
  const ms = new Date(scheduledReleaseAt).getTime() - new Date(now).getTime();
  if (ms <= 0) return "expired";
  const hours = Math.floor(ms / 3600000);
  const minutes = Math.round((ms % 3600000) / 60000);
  return `${hours}h ${minutes}m`;
}

function parsePackage(summary, logDescription) {
  const text = `${summary || ""} ${logDescription || ""}`;
  const packageId = text.match(/Package\s+(pkg-[^;\s]+)/i)?.[1] || text.match(/completed for\s+(pkg-[^;\s]+)/i)?.[1] || "";
  const manifestArtifactId = text.match(/manifest(?: artifact)?\s+([0-9a-f-]{36})/i)?.[1] || "";
  const packageChecksum = text.match(/package checksum\s+([a-f0-9]{64})/i)?.[1] || "";
  return { packageId, manifestArtifactId, packageChecksum };
}

async function getStage(client, stageId) {
  const rows = await client.list("jm1pub_editorialstages", {
    $select:
      "jm1pub_editorialstageid,jm1pub_name,jm1pub_stagetype,jm1pub_stagestatus,jm1pub_internaloperationalsummary,jm1pub_authorsafesummary,jm1pub_intakereference,jm1pub_publishingintakereference,_jm1pub_titleid_value,_jm1pub_contactid_value,modifiedon,createdon",
    $filter: `jm1pub_editorialstageid eq ${stageId}`,
    $top: "1"
  });
  return rows[0] || null;
}

async function getTitle(client, titleId) {
  const rows = await client.list("jm1pub_titles", {
    $select: "jm1pub_titleid,jm1pub_name,jm1pub_titlename,jm1pub_authorname,_jm1_author_value,modifiedon,createdon",
    $filter: `jm1pub_titleid eq ${titleId}`,
    $top: "1"
  });
  return rows[0] || null;
}

async function getContact(client, contactId) {
  if (!contactId) return null;
  const rows = await client.list("contacts", {
    $select: "contactid,fullname,emailaddress1",
    $filter: `contactid eq ${contactId}`,
    $top: "1"
  });
  return rows[0] || null;
}

async function listStageArtifacts(client, titleId, stageId) {
  if (!titleId) return [];
  return client.list("jm1pub_editorialartifacts", {
    $select:
      "jm1pub_editorialartifactid,jm1pub_editorialartifactname,jm1pub_filename,jm1pub_artifacttype,jm1pub_artifactstatus,jm1pub_visibility,jm1pub_sha256,jm1pub_repositorypath,jm1pub_repositorydriveid,jm1pub_repositoryitemid,jm1pub_filesizebytes,jm1pub_iscurrentapproved,jm1pub_supersededon,_jm1pub_titleid_value,_jm1pub_editorialstageid_value,createdon,modifiedon",
    $filter: `_jm1pub_titleid_value eq ${titleId} and _jm1pub_editorialstageid_value eq ${stageId}`,
    $orderby: "modifiedon desc",
    $top: "50"
  });
}

function titleName(title) {
  return normalizeString(title?.jm1pub_titlename) || normalizeString(title?.jm1pub_name) || "";
}

function stageName(stage) {
  return normalizeString(stage?.jm1pub_name) || normalizeString(stage?.jm1pub_stagetype) || "";
}

function authorEmail(stage, gate, title) {
  return [
    gate?.jm1pub_authoremail,
    gate?.jm1_authoremail,
    gate?.authorEmail,
    stage?.jm1pub_authoremail,
    title?.jm1pub_authoremail,
    title?.emailaddress1
  ].map((value) => normalizeString(value).toLowerCase()).find(Boolean) || "";
}

function authorName(stage, title, contact) {
  return normalizeString(title?.jm1pub_authorname) || normalizeString(contact?.fullname) || normalizeString(stage?.jm1pub_author) || "Author";
}

async function getCurrentGate(client, stage) {
  const rows = await client.list("jm1pub_editorialapprovalgates", {
    $select:
      "jm1pub_editorialapprovalgateid,jm1pub_editorialapprovalgatename,jm1pub_gatestatus,jm1pub_authorresponsesummary,_jm1pub_titleid_value,_jm1pub_editorialstageid_value,modifiedon,createdon",
    $filter: `_jm1pub_editorialstageid_value eq ${stage.jm1pub_editorialstageid}`,
    $orderby: "modifiedon desc",
    $top: "5"
  });
  return rows.find((gate) => Number(gate.jm1pub_gatestatus || 0) !== 196650003 && Number(gate.jm1pub_gatestatus || 0) !== 196650004) || rows[0] || null;
}

async function listCadenceLogs(client, maxSchedules) {
  return client.list("jm1_executionlogs", {
    $select: "jm1_executionlogid,jm1_actiontype,jm1_actiondescription,jm1_sourcerecordid,createdon",
    $filter: "jm1_actiontype eq 'PACKAGE_CADENCE_SCHEDULED'",
    $orderby: "createdon desc",
    $top: String(maxSchedules)
  });
}

async function packageAlreadySent(client, stageId, packageId) {
  const clauses = SENT_ACTION_TYPES.map((actionType) => `jm1_actiontype eq '${actionType}'`).join(" or ");
  const packageClause = packageId ? ` or contains(jm1_actiondescription,'${escapeODataText(packageId)}')` : "";
  const rows = await client.list("jm1_executionlogs", {
    $select: "jm1_executionlogid,jm1_actiontype,jm1_actiondescription,createdon",
    $filter: `(${clauses}) and (jm1_sourcerecordid eq '${escapeODataText(stageId)}'${packageClause})`,
    $orderby: "createdon desc",
    $top: "5"
  });
  return rows[0] || null;
}

function gateShowsDelivered(gate) {
  const summary = normalizeString(gate?.jm1pub_authorresponsesummary);
  return Number(gate?.jm1pub_gatestatus || 0) === 196650002 && /OPERATIONALLY_CERTIFIED|package sent|awaiting author response/i.test(summary);
}

function cadenceLogIsAuthorReleaseEligible(cadenceLog) {
  const text = normalizeString(cadenceLog?.jm1_actiondescription);
  if (/CADENCE_NOT_REQUIRED|NOT_REQUIRED_PUBLISHER_FACING|PUBLISHER_INTERNAL_DECISION/i.test(text)) return false;
  return true;
}

async function recordMailboxCorrelation(client, stage, title, gate, packageInfo, delivery, correlationId) {
  const idempotencyKey = [
    "editorial-cadence-release",
    "mailbox-delivered",
    stage.jm1pub_editorialstageid,
    packageInfo.packageId || "package-unknown",
    delivery.internetMessageId || delivery.inboundMessageId || "message-unknown",
    CONSUMER_VERSION
  ].join(":");
  const existing = await findExecutionLog(client, "PACKAGE_CADENCE_RELEASE_MAILBOX_DELIVERY_CORRELATED", idempotencyKey);
  const description =
    `Idempotency ${idempotencyKey}. DELIVERY_STATUS=DELIVERED; deliveredAt=${delivery.deliveredAt || delivery.receivedDateTime || "UNKNOWN"}; ` +
    `message=${delivery.internetMessageId || delivery.inboundMessageId || "UNKNOWN"}; source=${delivery.correlationSource || "PUBLISHING_MAILBOX"}; ` +
    `confidence=${delivery.correlationConfidence || "UNKNOWN"}; mailbox=${PUBLISHING_MAILBOX}; title=${titleName(title) || "UNKNOWN"}; ` +
    `gate=${gate?.jm1pub_editorialapprovalgateid || "UNKNOWN"}; package=${packageInfo.packageId || "UNKNOWN"}; ` +
    `CORRELATION_REPAIRED=TRUE; correlation=${correlationId}.`;
  await client.patch("jm1pub_editorialstages", stage.jm1pub_editorialstageid, {
    jm1pub_internaloperationalsummary: description,
    jm1pub_authorsafesummary: "Your review package has already been delivered through the governed Publishing mailbox. Please review it and reply when ready."
  });
  if (existing) return { idempotent: true, logId: existing.jm1_executionlogid, idempotencyKey };
  const logId = await writeLog(client, {
    name: `PACKAGE_CADENCE_RELEASE_MAILBOX_DELIVERY_CORRELATED - ${stage.jm1pub_name}`,
    actionType: "PACKAGE_CADENCE_RELEASE_MAILBOX_DELIVERY_CORRELATED",
    description,
    sourceEntity: "jm1pub_editorialstage",
    sourceRecordId: stage.jm1pub_editorialstageid
  });
  return { idempotent: false, logId, idempotencyKey };
}

async function recordMailboxAmbiguity(client, stage, title, packageInfo, delivery, correlationId) {
  const idempotencyKey = [
    "editorial-cadence-release",
    "mailbox-ambiguous",
    stage.jm1pub_editorialstageid,
    packageInfo.packageId || "package-unknown",
    CONSUMER_VERSION
  ].join(":");
  const existing = await findExecutionLog(client, "PACKAGE_CADENCE_RELEASE_MAILBOX_CORRELATION_AMBIGUOUS", idempotencyKey);
  if (existing) return { idempotent: true, logId: existing.jm1_executionlogid };
  const logId = await writeLog(client, {
    name: `PACKAGE_CADENCE_RELEASE_MAILBOX_CORRELATION_AMBIGUOUS - ${stage.jm1pub_name}`,
    actionType: "PACKAGE_CADENCE_RELEASE_MAILBOX_CORRELATION_AMBIGUOUS",
    failed: true,
    description:
      `Idempotency ${idempotencyKey}. Delivery evidence is ambiguous; no package will be resent. ` +
      `Title ${titleName(title) || "UNKNOWN"}; package ${packageInfo.packageId || "UNKNOWN"}; ` +
      `candidateCount=${delivery.candidateCount || "UNKNOWN"}; source=${PUBLISHING_MAILBOX}; correlation=${correlationId}.`,
    sourceEntity: "jm1pub_editorialstage",
    sourceRecordId: stage.jm1pub_editorialstageid
  });
  return { idempotent: false, logId };
}

async function recordAuthorResponseCorrelation(client, stage, gate, response, classification, correlationId) {
  const idempotencyKey = [
    "editorial-cadence-release",
    "author-response",
    stage.jm1pub_editorialstageid,
    gate?.jm1pub_editorialapprovalgateid || "gate-unknown",
    response.internetMessageId || response.inboundMessageId || "message-unknown",
    CONSUMER_VERSION
  ].join(":");
  const existing = await findExecutionLog(client, "PACKAGE_CADENCE_RELEASE_AUTHOR_RESPONSE_CORRELATED", idempotencyKey);
  if (existing) return { idempotent: true, logId: existing.jm1_executionlogid, classification };
  const logId = await writeLog(client, {
    name: `PACKAGE_CADENCE_RELEASE_AUTHOR_RESPONSE_CORRELATED - ${stage.jm1pub_name}`,
    actionType: "PACKAGE_CADENCE_RELEASE_AUTHOR_RESPONSE_CORRELATED",
    failed: classification !== DECISION.ACKNOWLEDGMENT_ONLY && classification !== DECISION.APPROVED,
    description:
      `Idempotency ${idempotencyKey}. Governed response found after delivered package; classification=${classification}; ` +
      `message=${response.internetMessageId || response.inboundMessageId || "UNKNOWN"}; received=${response.receivedDateTime || "UNKNOWN"}; ` +
      `source=${PUBLISHING_MAILBOX}; approvalFabricated=0; acknowledgmentTreatedAsApproval=${classification === DECISION.ACKNOWLEDGMENT_ONLY ? 0 : "N/A"}; ` +
      `correlation=${correlationId}.`,
    sourceEntity: "jm1pub_editorialapprovalgate",
    sourceRecordId: gate?.jm1pub_editorialapprovalgateid || stage.jm1pub_editorialstageid
  });
  return { idempotent: false, logId, classification };
}

async function correlateMailboxDelivery(client, stage, title, gate, packageInfo, schedule, correlationId, deps = {}) {
  const subjectContains = titleName(title) || stageName(stage);
  if (!subjectContains) return { status: "MAILBOX_CORRELATION_SKIPPED", reason: "SUBJECT_PROBE_UNAVAILABLE" };
  const reader = deps.readDeliveryEvidence || readPublishingMailboxDeliveryEvidence;
  const delivery = await reader(
    {
      subjectContains,
      afterIso: schedule.cadenceStartedAt,
      title: titleName(title),
      stage: normalizeStageCode(stage).replace(/_/g, " "),
      packageId: packageInfo.packageId,
      artifactId: packageInfo.manifestArtifactId,
      recipient: authorEmail(stage, gate, title)
    },
    deps
  );
  if (!delivery.ok) return { status: "MAILBOX_CORRELATION_UNAVAILABLE", reason: delivery.reason || delivery.code };
  if (delivery.ambiguous) {
    const ambiguity = await recordMailboxAmbiguity(client, stage, title, packageInfo, delivery, correlationId);
    return { status: "AMBIGUOUS_CORRELATION", delivery, ambiguity };
  }
  if (!delivery.found) return { status: "NO_MAILBOX_DELIVERY_EVIDENCE", delivery };

  const repair = await recordMailboxCorrelation(client, stage, title, gate, packageInfo, delivery, correlationId);
  const responseReader = deps.readResponseEvidence || readPublishingMailboxReply;
  const response = await responseReader(
    {
      subjectContains,
      afterIso: delivery.deliveredAt || delivery.receivedDateTime || schedule.cadenceStartedAt
    },
    deps
  );
  if (response.ok && response.found) {
    const classification = classifyAuthorReviewResponse(response.bodyText || "");
    const responseRepair = await recordAuthorResponseCorrelation(client, stage, gate, response, classification, correlationId);
    return { status: "MAILBOX_DELIVERY_REPAIRED_WITH_RESPONSE", delivery, repair, response, responseRepair, responseClassification: classification };
  }
  return { status: "MAILBOX_DELIVERY_REPAIRED", delivery, repair, response };
}

async function latestPackageCompletionLog(client, stageId) {
  const rows = await client.list("jm1_executionlogs", {
    $select: "jm1_executionlogid,jm1_actiontype,jm1_actiondescription,jm1_sourcerecordid,createdon",
    $filter: `jm1_actiontype eq 'EDITORIAL_PACKAGE_HANDOFF_COMPLETED' and jm1_sourcerecordid eq '${escapeODataText(stageId)}'`,
    $orderby: "createdon desc",
    $top: "1"
  });
  return rows[0] || null;
}

function buildSchedule(stage, cadenceLog, completionLog, now) {
  const stageCode = normalizeStageCode(stage);
  const baselineDays = STAGE_BASELINE_BUSINESS_DAYS[stageCode] || 2;
  const cadenceStartedAt = completionLog?.createdon || cadenceLog.createdon;
  const scheduledReleaseAt = addBusinessDays(cadenceStartedAt, baselineDays);
  const due = new Date(now).getTime() >= new Date(scheduledReleaseAt).getTime();
  return {
    stageCode,
    baselineDays,
    cadenceStartedAt,
    earliestReleaseAt: scheduledReleaseAt,
    scheduledReleaseAt,
    remainingHoldDuration: remainingHoldDuration(scheduledReleaseAt, now),
    due
  };
}

async function persistSchedule(client, stage, title, gate, packageInfo, schedule, correlationId) {
  const idempotencyKey = [
    "editorial-cadence-release",
    "schedule-confirmed",
    stage.jm1pub_editorialstageid,
    packageInfo.packageId || "package-unknown",
    schedule.scheduledReleaseAt,
    CONSUMER_VERSION
  ].join(":");
  const existing = await findExecutionLog(client, "PACKAGE_CADENCE_RELEASE_SCHEDULE_CONFIRMED", idempotencyKey);
  const summary =
    `CADENCE_RELEASE_RUNTIME: ${schedule.due ? "READY_FOR_RELEASE" : "CADENCE_HOLD"}; ` +
    `policy ${POLICY_VERSION}; stage ${schedule.stageCode}; cadenceStartedAt ${schedule.cadenceStartedAt}; ` +
    `earliestReleaseAt ${schedule.earliestReleaseAt}; scheduledReleaseAt ${schedule.scheduledReleaseAt}; ` +
    `remainingHoldDuration ${schedule.remainingHoldDuration}; nextAutomaticAction AUTHOR_REVIEW_PACKAGE_RELEASE_AT_CADENCE_BOUNDARY; ` +
    `package ${packageInfo.packageId || "UNKNOWN"}; manifest ${packageInfo.manifestArtifactId || "UNKNOWN"}; ` +
    `checksum ${packageInfo.packageChecksum || "UNKNOWN"}; trigger ${CONSUMER_VERSION}; correlation ${correlationId}.`;

  await client.patch("jm1pub_editorialstages", stage.jm1pub_editorialstageid, {
    jm1pub_internaloperationalsummary: summary,
    jm1pub_authorsafesummary: schedule.due
      ? "Your review package is ready for governed release. No author action is required until it is sent."
      : "Your review package is in the governed release cadence. No author action is required until it is sent."
  });

  if (!existing) {
    await writeLog(client, {
      name: `PACKAGE_CADENCE_RELEASE_SCHEDULE_CONFIRMED - ${stage.jm1pub_name}`,
      actionType: "PACKAGE_CADENCE_RELEASE_SCHEDULE_CONFIRMED",
      description:
        `Idempotency ${idempotencyKey}. Title ${title?.jm1pub_titlename || title?.jm1pub_name || "UNKNOWN"}. Gate ${gate?.jm1pub_editorialapprovalgateid || "UNKNOWN"}. ${summary}`,
      sourceEntity: "jm1pub_editorialstage",
      sourceRecordId: stage.jm1pub_editorialstageid
    });
  }

  return { idempotent: Boolean(existing), idempotencyKey };
}

async function recordDueSystemAttention(client, stage, title, packageInfo, schedule, correlationId) {
  const idempotencyKey = [
    "editorial-cadence-release",
    "due-system-attention",
    stage.jm1pub_editorialstageid,
    packageInfo.packageId || "package-unknown",
    schedule.scheduledReleaseAt,
    CONSUMER_VERSION
  ].join(":");
  const existing = await findExecutionLog(client, "PACKAGE_CADENCE_RELEASE_SYSTEM_ATTENTION_REQUIRED", idempotencyKey);
  if (existing) return { idempotent: true, logId: existing.jm1_executionlogid };
  const logId = await writeLog(client, {
    name: `PACKAGE_CADENCE_RELEASE_SYSTEM_ATTENTION_REQUIRED - ${stage.jm1pub_name}`,
    actionType: "PACKAGE_CADENCE_RELEASE_SYSTEM_ATTENTION_REQUIRED",
    failed: true,
    description:
      `Idempotency ${idempotencyKey}. Cadence boundary is due for ${title?.jm1pub_titlename || title?.jm1pub_name || "UNKNOWN"}, but no deployed cadence-send binding is available in diagnostic runner. ` +
      `This is system-owned, not Jackie-owned. Package ${packageInfo.packageId || "UNKNOWN"}; scheduledReleaseAt ${schedule.scheduledReleaseAt}; correlation ${correlationId}.`,
    sourceEntity: "jm1pub_editorialstage",
    sourceRecordId: stage.jm1pub_editorialstageid
  });
  return { idempotent: false, logId };
}

async function recordCadenceNonSendable(client, stage, title, packageInfo, schedule, reason, correlationId) {
  const idempotencyKey = [
    "editorial-cadence-release",
    "non-sendable",
    stage.jm1pub_editorialstageid,
    packageInfo.packageId || "package-unknown",
    reason,
    CONSUMER_VERSION
  ].join(":");
  const existing = await findExecutionLog(client, "PACKAGE_CADENCE_RELEASE_NON_SENDABLE_RECONCILED", idempotencyKey);
  const description =
    `Idempotency ${idempotencyKey}. CLASSIFICATION=AMBIGUOUS; title=${titleName(title) || "UNKNOWN"}; ` +
    `package=${packageInfo.packageId || "UNKNOWN"}; reason=${reason}; scheduledReleaseAt=${schedule?.scheduledReleaseAt || "N/A"}; ` +
    `no author communication sent; correlation=${correlationId}.`;
  await client.patch("jm1pub_editorialstages", stage.jm1pub_editorialstageid, {
    jm1pub_internaloperationalsummary: description,
    jm1pub_authorsafesummary: "No author package is being sent from this cadence row because the release authority is not clear. The publishing team is reviewing the record."
  });
  if (existing) return { idempotent: true, logId: existing.jm1_executionlogid, idempotencyKey };
  const logId = await writeLog(client, {
    name: `PACKAGE_CADENCE_RELEASE_NON_SENDABLE_RECONCILED - ${stage.jm1pub_name}`,
    actionType: "PACKAGE_CADENCE_RELEASE_NON_SENDABLE_RECONCILED",
    failed: true,
    description,
    sourceEntity: "jm1pub_editorialstage",
    sourceRecordId: stage.jm1pub_editorialstageid
  });
  return { idempotent: false, logId, idempotencyKey };
}

async function recordCadenceSent(client, stage, title, gate, packageInfo, schedule, sendResult, correlationId) {
  const idempotencyKey = [
    "editorial-cadence-release",
    "sent",
    stage.jm1pub_editorialstageid,
    packageInfo.packageId || "package-unknown",
    gate?.jm1pub_editorialapprovalgateid || "gate-unknown",
    CONSUMER_VERSION
  ].join(":");
  const existing = await findExecutionLog(client, "PACKAGE_CADENCE_RELEASE_AUTHOR_PACKAGE_SENT", idempotencyKey);
  if (existing) return { idempotent: true, logId: existing.jm1_executionlogid, idempotencyKey };
  const now = new Date().toISOString();
  const description =
    `Idempotency ${idempotencyKey}. CLASSIFICATION=TRUE_DUE_AND_UNSENT; DELIVERY_STATUS=SENT; ` +
    `providerMessageId=${sendResult.providerMessageId || "UNKNOWN"}; from=publishing@email.jmerrill.one; replyTo=${PUBLISHING_MAILBOX}; cc=${PUBLISHING_MAILBOX}; ` +
    `title=${titleName(title) || "UNKNOWN"}; gate=${gate?.jm1pub_editorialapprovalgateid || "UNKNOWN"}; package=${packageInfo.packageId || "UNKNOWN"}; ` +
    `scheduledReleaseAt=${schedule.scheduledReleaseAt}; attachmentCount=${sendResult.attachmentCount || 0}; ` +
    `checksums=${(sendResult.attachmentChecksums || []).join("|") || "UNKNOWN"}; correlation=${correlationId}.`;
  await Promise.all([
    client.patch("jm1pub_editorialapprovalgates", gate.jm1pub_editorialapprovalgateid, {
      jm1pub_gatestatus: 196650002,
      jm1pub_nextstageauthorized: false,
      jm1pub_awaitingsince: now,
      jm1pub_authorresponsesummary: `${stageName(stage)} package sent through governed cadence release. Awaiting author response.`,
      jm1pub_authordecisionsource: `cadence-send:${idempotencyKey}`.slice(0, 100)
    }),
    client.patch("jm1pub_editorialstages", stage.jm1pub_editorialstageid, {
      jm1pub_internaloperationalsummary: description,
      jm1pub_authorsafesummary: "Your review package has been sent through the governed Publishing mailbox. Please review it and reply when ready."
    })
  ]);
  const logId = await writeLog(client, {
    name: `PACKAGE_CADENCE_RELEASE_AUTHOR_PACKAGE_SENT - ${stage.jm1pub_name}`,
    actionType: "PACKAGE_CADENCE_RELEASE_AUTHOR_PACKAGE_SENT",
    description,
    sourceEntity: "jm1pub_editorialstage",
    sourceRecordId: stage.jm1pub_editorialstageid
  });
  return { idempotent: false, logId, idempotencyKey };
}

async function recordCadenceSendBlocked(client, stage, title, packageInfo, schedule, blockers, correlationId) {
  const reason = blockers.join("|") || "UNKNOWN";
  const idempotencyKey = [
    "editorial-cadence-release",
    "send-blocked",
    stage.jm1pub_editorialstageid,
    packageInfo.packageId || "package-unknown",
    reason,
    CONSUMER_VERSION
  ].join(":");
  const existing = await findExecutionLog(client, "PACKAGE_CADENCE_RELEASE_SEND_BLOCKED", idempotencyKey);
  const description =
    `Idempotency ${idempotencyKey}. CLASSIFICATION=AMBIGUOUS; title=${titleName(title) || "UNKNOWN"}; ` +
    `package=${packageInfo.packageId || "UNKNOWN"}; blockers=${reason}; scheduledReleaseAt=${schedule.scheduledReleaseAt}; ` +
    `no author communication sent; correlation=${correlationId}.`;
  await client.patch("jm1pub_editorialstages", stage.jm1pub_editorialstageid, {
    jm1pub_internaloperationalsummary: description,
    jm1pub_authorsafesummary: "No author package is being sent from this cadence row because required delivery information is incomplete. The publishing team is reviewing the record."
  });
  if (existing) return { idempotent: true, logId: existing.jm1_executionlogid, idempotencyKey };
  const logId = await writeLog(client, {
    name: `PACKAGE_CADENCE_RELEASE_SEND_BLOCKED - ${stage.jm1pub_name}`,
    actionType: "PACKAGE_CADENCE_RELEASE_SEND_BLOCKED",
    failed: true,
    description,
    sourceEntity: "jm1pub_editorialstage",
    sourceRecordId: stage.jm1pub_editorialstageid
  });
  return { idempotent: false, logId, idempotencyKey };
}

async function processCadenceLog(client, cadenceLog, now, correlationId, deps = {}) {
  const stageId = normalizeString(cadenceLog.jm1_sourcerecordid);
  if (!stageId) return { status: "SKIPPED", reason: "CADENCE_LOG_WITHOUT_STAGE", logId: cadenceLog.jm1_executionlogid };
  if (!isGuid(stageId)) return { status: "SKIPPED", reason: "CADENCE_LOG_SOURCE_NOT_STAGE_GUID", sourceRecordId: stageId, logId: cadenceLog.jm1_executionlogid };
  const stage = await getStage(client, stageId);
  if (!stage) return { status: "SKIPPED", reason: "STAGE_NOT_FOUND", stageId };
  const title = normalizeString(stage._jm1pub_titleid_value) ? await getTitle(client, stage._jm1pub_titleid_value) : null;
  const contact = normalizeString(stage._jm1pub_contactid_value) ? await getContact(client, stage._jm1pub_contactid_value) : null;
  const gate = await getCurrentGate(client, stage);
  const completionLog = await latestPackageCompletionLog(client, stageId);
  const packageInfo = parsePackage(stage.jm1pub_internaloperationalsummary, completionLog?.jm1_actiondescription || cadenceLog.jm1_actiondescription);
  const sent = await packageAlreadySent(client, stageId, packageInfo.packageId);
  if (sent || gateShowsDelivered(gate)) {
    return {
      status: "ALREADY_RELEASED",
      stageId,
      title: title?.jm1pub_titlename || title?.jm1pub_name || "",
      packageId: packageInfo.packageId,
      sentActionType: sent?.jm1_actiontype || "GATE_AWAITING_AUTHOR_RESPONSE"
    };
  }

  const schedule = buildSchedule(stage, cadenceLog, completionLog, now);
  if (!cadenceLogIsAuthorReleaseEligible(cadenceLog)) {
    const nonSendable = await recordCadenceNonSendable(client, stage, title, packageInfo, schedule, "CADENCE_NOT_AUTHOR_RELEASE_ELIGIBLE", correlationId);
    return { status: "AMBIGUOUS", reason: "CADENCE_NOT_AUTHOR_RELEASE_ELIGIBLE", stageId, title: titleName(title), packageId: packageInfo.packageId, schedule, nonSendable };
  }
  const persisted = await persistSchedule(client, stage, title, gate, packageInfo, schedule, correlationId);

  if (schedule.due) {
    const mailboxCorrelation = await correlateMailboxDelivery(client, stage, title, gate, packageInfo, schedule, correlationId, deps);
    if (mailboxCorrelation.status === "MAILBOX_DELIVERY_REPAIRED" || mailboxCorrelation.status === "MAILBOX_DELIVERY_REPAIRED_WITH_RESPONSE") {
      return { status: mailboxCorrelation.status, stageId, title: titleName(title), packageId: packageInfo.packageId, schedule, persisted, mailboxCorrelation };
    }
    if (mailboxCorrelation.status === "AMBIGUOUS_CORRELATION") {
      return { status: "AMBIGUOUS_CORRELATION", stageId, title: titleName(title), packageId: packageInfo.packageId, schedule, persisted, mailboxCorrelation };
    }
    if (mailboxCorrelation.status === "MAILBOX_CORRELATION_UNAVAILABLE") {
      const blockers = [mailboxCorrelation.reason || "MAILBOX_CORRELATION_UNAVAILABLE"];
      const blocked = await recordCadenceSendBlocked(client, stage, title, packageInfo, schedule, blockers, correlationId);
      return { status: "AMBIGUOUS", stageId, title: titleName(title), packageId: packageInfo.packageId, schedule, persisted, mailboxCorrelation, blocked, blockers };
    }
    const artifacts = await listStageArtifacts(client, stage._jm1pub_titleid_value, stageId);
    const validationBlockers = validateDueSendInput({
      stage,
      titleName: titleName(title),
      gate,
      contact,
      packageInfo,
      completionLog
    });
    if (validationBlockers.length > 0) {
      const blocked = await recordCadenceSendBlocked(client, stage, title, packageInfo, schedule, validationBlockers, correlationId);
      return { status: "AMBIGUOUS", stageId, title: titleName(title), packageId: packageInfo.packageId, schedule, persisted, mailboxCorrelation, blocked, blockers: validationBlockers };
    }
    const sendResult = await sendCadenceAuthorReviewPackage({
      stage,
      titleId: stage._jm1pub_titleid_value,
      titleName: titleName(title),
      authorName: authorName(stage, title, contact),
      contact,
      gate,
      packageInfo,
      completionLog,
      artifacts,
      schedule
    }, deps);
    if (sendResult.status !== "SENT") {
      const blocked = await recordCadenceSendBlocked(client, stage, title, packageInfo, schedule, sendResult.blockers || [sendResult.status || "SEND_FAILED"], correlationId);
      return { status: "AMBIGUOUS", stageId, title: titleName(title), packageId: packageInfo.packageId, schedule, persisted, mailboxCorrelation, blocked, blockers: sendResult.blockers || [sendResult.status || "SEND_FAILED"] };
    }
    const sentRecord = await recordCadenceSent(client, stage, title, gate, packageInfo, schedule, sendResult, correlationId);
    return { status: "PACKAGE_SENT", stageId, title: titleName(title), packageId: packageInfo.packageId, schedule, persisted, mailboxCorrelation, sendResult, sentRecord };
  }

  return { status: "SCHEDULED_AUTOMATIC_FUTURE", stageId, title: title?.jm1pub_titlename || title?.jm1pub_name || "", packageId: packageInfo.packageId, schedule, persisted };
}

async function runEditorialCadenceReleaseConsumer(options = {}, deps = {}) {
  const client = deps.client || createDataverseClient(requireDataverseConfig(), deps);
  const now = options.now || new Date().toISOString();
  const correlationId = options.correlationId || `EDITORIAL-CADENCE-RELEASE-${now}`;
  const maxSchedules = Math.min(Math.max(Number(options.maxSchedules || process.env.JM1_EDITORIAL_CADENCE_RELEASE_MAX_SCHEDULES || 40), 1), 100);
  const cadenceLogs = deps.cadenceLogs || (await listCadenceLogs(client, maxSchedules));
  const results = [];
  const processedStages = new Set();
  for (const cadenceLog of cadenceLogs) {
    const stageId = normalizeString(cadenceLog.jm1_sourcerecordid);
    if (stageId && processedStages.has(stageId)) continue;
    if (stageId) processedStages.add(stageId);
    results.push(await processCadenceLog(client, cadenceLog, now, correlationId, deps));
  }
  const deliveredRepaired = results.filter((item) => item.status === "MAILBOX_DELIVERY_REPAIRED" || item.status === "MAILBOX_DELIVERY_REPAIRED_WITH_RESPONSE").length;
  const responsesReconciled = results.filter((item) => item.status === "MAILBOX_DELIVERY_REPAIRED_WITH_RESPONSE").length;
  const ambiguous = results.filter((item) => item.status === "AMBIGUOUS_CORRELATION").length;
  const packageSent = results.filter((item) => item.status === "PACKAGE_SENT").length;
  const nonSendable = results.filter((item) => item.status === "AMBIGUOUS").length;
  await writeLog(client, {
    name: "EDITORIAL_CADENCE_RELEASE_HEALTH_REFRESHED",
    actionType: "EDITORIAL_CADENCE_RELEASE_HEALTH_REFRESHED",
    description:
      `Cadence release health refreshed. Schedules examined ${cadenceLogs.length}; unique ${results.length}; scheduled ${results.filter((item) => item.status === "SCHEDULED_AUTOMATIC_FUTURE").length}; due-system-attention ${results.filter((item) => item.status === "DUE_SYSTEM_ATTENTION").length}; already-released ${results.filter((item) => item.status === "ALREADY_RELEASED").length}; mailbox-delivery-repaired ${deliveredRepaired}; author-responses-reconciled ${responsesReconciled}; package-sent ${packageSent}; ambiguous ${ambiguous}; non-sendable-or-blocked ${nonSendable}. Correlation ${correlationId}.`,
    sourceEntity: "jm1_editorial_cadence_release_runtime",
    sourceRecordId: correlationId
  });
  return {
    ok: true,
    correlationId,
    examined: cadenceLogs.length,
    unique: results.length,
    scheduled: results.filter((item) => item.status === "SCHEDULED_AUTOMATIC_FUTURE").length,
    dueSystemAttention: results.filter((item) => item.status === "DUE_SYSTEM_ATTENTION").length,
    alreadyReleased: results.filter((item) => item.status === "ALREADY_RELEASED").length,
    deliveredRepaired,
    responsesReconciled,
    packageSent,
    ambiguous,
    nonSendable,
    results
  };
}

module.exports = {
  CONSUMER_VERSION,
  POLICY_VERSION,
  STAGE_BASELINE_BUSINESS_DAYS,
  addBusinessDays,
  buildSchedule,
  correlateMailboxDelivery,
  isGuid,
  normalizeStageCode,
  parsePackage,
  remainingHoldDuration,
  runEditorialCadenceReleaseConsumer
};
