"use strict";

const GUID = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;
const SHA256 = /^[0-9a-f]{64}$/i;
const WAITING_STAGE_STATUS = 100000002;
const WAITING_GATE_STATUS = 196650002;

function id(value) {
  return String(value || "").trim().toLowerCase();
}

function evidenceField(description, name) {
  const match = String(description || "").match(new RegExp(`(?:^|[; ])${name}=([^; ]+)`, "i"));
  return match?.[1] || "";
}

function projection(titleId, owner, reason, detail = {}) {
  return { titleId, nextActionOwner: owner, reason, ...detail };
}

function currentStage(stages) {
  const ordered = [...stages].sort((left, right) =>
    Number(right.jm1pub_stagesequence || 0) - Number(left.jm1pub_stagesequence || 0));
  if (!ordered.length) return { reason: "CURRENT_STAGE_MISSING" };
  if (ordered.length > 1 && Number(ordered[0].jm1pub_stagesequence) === Number(ordered[1].jm1pub_stagesequence)) {
    return { reason: "CURRENT_STAGE_SEQUENCE_AMBIGUOUS" };
  }
  const selectedModified = Date.parse(ordered[0].modifiedon || ordered[0].createdon);
  if (Number.isFinite(selectedModified) && ordered.slice(1).some((stage) =>
    stage.jm1pub_stagesequence == null && Number(stage.jm1pub_stagestatus) !== 100000008 &&
    Date.parse(stage.modifiedon || stage.createdon) >= selectedModified)) {
    return { reason: "NEWER_UNSEQUENCED_STAGE_REQUIRES_REVIEW" };
  }
  return { stage: ordered[0] };
}

function verifiedSend(send, intent, gateId, artifactChecksum) {
  const description = String(send?.jm1_actiondescription || "");
  const intentDescription = String(intent?.jm1_actiondescription || "");
  const providerId = id(evidenceField(description, "providerMessageId"));
  const checksums = evidenceField(description, "checksums").split("|");
  return send?.jm1_actiontype === "PACKAGE_CADENCE_RELEASE_AUTHOR_PACKAGE_SENT" &&
    intent?.jm1_actiontype === "AUTHOR_COMMUNICATION_INTENT_SENT" &&
    evidenceField(description, "DELIVERY_STATUS") === "SENT" &&
    id(evidenceField(description, "gate")) === gateId &&
    GUID.test(providerId) &&
    id(evidenceField(intentDescription, "providerMessageId")) === providerId &&
    checksums.some((entry) => id(entry) === `editedmanuscript:${artifactChecksum}`) &&
    /(?:^|[; ])DATAVERSE_RECORD=PASS(?:;|\.|$)/.test(intentDescription) &&
    /(?:^|[; ])ACS_DELIVERY=PASS(?:;|\.|$)/.test(intentDescription) &&
    /(?:^|[; ])PUBLISHING_MAILBOX_COPY=PASS(?:;|\.|$)/.test(intentDescription) &&
    /(?:^|[; ])ATTACHMENT_PARITY=PASS(?:;|\.|$)/.test(intentDescription);
}

function projectLegacyEditorialAction(input) {
  const title = input?.title;
  const titleId = id(title?.jm1pub_titleid);
  if (!GUID.test(titleId)) return projection(titleId, "AMBIGUOUS", "TITLE_ID_UNPROVEN");
  if (["DUPLICATE_RECORD", "PLACEHOLDER"].includes(title?.jm1_canonicalstatus)) {
    return (input.stages || []).length
      ? projection(titleId, "AMBIGUOUS", "NONCANONICAL_TITLE_HAS_STAGE")
      : projection(titleId, "NONE", "NONCANONICAL_TITLE_RECORD");
  }
  const authorId = id(title?._jm1_primaryauthor_value || title?._jm1_author_value ||
    String(title?.jm1_canonicalauthorcontactreference || "").match(/^contact:([0-9a-f-]{36})$/i)?.[1]);
  const declaredIds = [title?._jm1_primaryauthor_value, title?._jm1_author_value,
    String(title?.jm1_canonicalauthorcontactreference || "").match(/^contact:([0-9a-f-]{36})$/i)?.[1]]
    .map(id).filter(Boolean);
  if (!GUID.test(authorId) || declaredIds.some((declared) => declared !== authorId) ||
      (title?.jm1_canonicalauthorcontactreference &&
        !/^contact:[0-9a-f-]{36}$/i.test(title.jm1_canonicalauthorcontactreference))) {
    return projection(titleId, "AMBIGUOUS", "AUTHOR_IDENTITY_UNPROVEN");
  }
  const resolved = currentStage(input.stages || []);
  if (!resolved.stage) return projection(titleId, "AMBIGUOUS", resolved.reason);
  const stage = resolved.stage;
  const stageId = id(stage.jm1pub_editorialstageid);
  if (!GUID.test(stageId) || id(stage._jm1pub_titleid_value) !== titleId ||
      id(stage._jm1pub_contactid_value) !== authorId) {
    return projection(titleId, "AMBIGUOUS", "CURRENT_STAGE_IDENTITY_MISMATCH");
  }
  const base = { authorId, currentStage: stage.jm1pub_stagetype, stageId };
  if (Number(stage.jm1pub_stagestatus) !== WAITING_STAGE_STATUS) {
    return projection(titleId, "JM_PUBLISHING", "STAGE_NOT_WAITING_ON_AUTHOR", base);
  }
  if (Number(stage.jm1pub_stagetype) !== 100000001) {
    return projection(titleId, "AMBIGUOUS", "STAGE_ACTION_MAPPING_UNPROVEN", base);
  }
  const gates = (input.gates || []).filter((gate) => id(gate._jm1pub_editorialstageid_value) === stageId &&
    Number(gate.jm1pub_gatestatus) === WAITING_GATE_STATUS &&
    !gate.jm1pub_authordecision && !gate.jm1pub_authordecisionon);
  if (gates.length !== 1) return projection(titleId, "AMBIGUOUS", "CURRENT_GATE_CARDINALITY_UNPROVEN", base);
  const gate = gates[0];
  const gateId = id(gate.jm1pub_editorialapprovalgateid);
  const artifactId = id(gate._jm1pub_deliverableartifactid_value);
  const artifact = (input.artifacts || []).find((row) => id(row.jm1pub_editorialartifactid) === artifactId);
  const artifactChecksum = id(artifact?.jm1pub_sha256);
  if (!GUID.test(gateId) || id(gate._jm1pub_titleid_value) !== titleId || !GUID.test(artifactId) ||
      id(artifact?._jm1pub_titleid_value) !== titleId || id(artifact?._jm1pub_editorialstageid_value) !== stageId ||
      !SHA256.test(artifactChecksum)) {
    return projection(titleId, "AMBIGUOUS", "GATE_ARTIFACT_BINDING_UNPROVEN", base);
  }
  const captured = (input.responseEvents || []).filter((row) =>
    id(row.jm1_sourcerecordid) === gateId &&
    ["AUTHOR_RESPONSE_CAPTURED", "AUTHOR_RESPONSE_INBOUND_CORRELATED"].includes(row.jm1_actiontype));
  if (captured.length || gate.jm1pub_authordecision || gate.jm1pub_authordecisionon) {
    return projection(titleId, "JM_PUBLISHING", "AUTHOR_RESPONSE_RECEIVED", { ...base, gateId,
      currentResponseState: "RECEIVED" });
  }
  const sends = (input.sendEvents || []).filter((row) => id(row.jm1_sourcerecordid) === stageId &&
    id(evidenceField(row.jm1_actiondescription, "gate")) === gateId);
  if (sends.length !== 1) return projection(titleId, "AMBIGUOUS", "DELIVERY_CARDINALITY_UNPROVEN", { ...base, gateId });
  const providerId = id(evidenceField(sends[0].jm1_actiondescription, "providerMessageId"));
  const intents = (input.intentEvents || []).filter((row) => id(row.jm1_sourcerecordid) === titleId &&
    id(evidenceField(row.jm1_actiondescription, "providerMessageId")) === providerId);
  if (intents.length !== 1 || !verifiedSend(sends[0], intents[0], gateId, artifactChecksum)) {
    return projection(titleId, "AMBIGUOUS", "DELIVERY_OBSERVABILITY_UNPROVEN", { ...base, gateId });
  }
  if (input.responseSearch?.complete !== true) {
    return projection(titleId, "AMBIGUOUS", "CURRENT_INBOUND_SEARCH_INCOMPLETE", { ...base, gateId,
      currentDeliveryState: "VERIFIED" });
  }
  if (input.responseSearch.candidateMessageIds?.length) {
    return projection(titleId, "JM_PUBLISHING", "AUTHOR_REPLY_REQUIRES_DISPOSITION", { ...base, gateId,
      currentDeliveryState: "VERIFIED", currentResponseState: "RECEIVED_UNDISPOSITIONED" });
  }
  const requestedAt = input.responseSearch.deliveredAt ||
    evidenceField(intents[0].jm1_actiondescription, "sentAt") || sends[0].createdon;
  const dueAt = input.authorizedDueAt;
  if (!Number.isFinite(Date.parse(requestedAt)) || !Number.isFinite(Date.parse(dueAt)) ||
      Date.parse(dueAt) < Date.parse(requestedAt) || !input.dueAuthority) {
    return projection(titleId, "AMBIGUOUS", "AUTHOR_DEADLINE_AUTHORITY_UNPROVEN", { ...base, gateId,
      currentDeliveryState: "VERIFIED" });
  }
  const intakeReference = String(stage.jm1pub_publishingintakereference || stage.jm1pub_intakereference || "").trim();
  if (!/^JMP-INT-\d{6}-[A-Z0-9-]+$/i.test(intakeReference) ||
      (stage.jm1pub_publishingintakereference && stage.jm1pub_intakereference &&
        stage.jm1pub_publishingintakereference !== stage.jm1pub_intakereference)) {
    return projection(titleId, "AMBIGUOUS", "LEGACY_ENGAGEMENT_BINDING_UNPROVEN", { ...base, gateId,
      currentDeliveryState: "VERIFIED" });
  }
  return projection(titleId, "AUTHOR", "CURRENT_DELIVERED_ACTION", {
    ...base, gateId, engagementId: intakeReference,
    authorActionType: "DEVELOPMENTAL_EDIT_REVIEW", actionRequestId: gateId,
    actionRequestedAt: requestedAt, actionDueAt: dueAt, dueAuthority: input.dueAuthority,
    cadenceClass: "STANDARD_ACTION", sourceEventId: sends[0].jm1_executionlogid,
    sourceAuthority: "LEGACY_DELIVERED_EDITORIAL_PACKAGE", currentResponseState: "NONE",
    currentDeliveryState: "VERIFIED", artifactChecksum
  });
}

module.exports = { projectLegacyEditorialAction, verifiedSend };
