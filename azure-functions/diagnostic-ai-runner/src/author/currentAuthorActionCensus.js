"use strict";

const { addEasternCalendarDays } = require("./authorFollowupPolicy");
const { projectLegacyEditorialAction } = require("./currentAuthorActionProjection");

const MAX_TITLES = 500;
const MAX_STAGES = 500;

function byKey(rows, key) {
  const grouped = new Map();
  for (const row of rows) {
    const id = String(row[key] || "").toLowerCase();
    if (!id) continue;
    grouped.set(id, [...(grouped.get(id) || []), row]);
  }
  return grouped;
}

function field(description, name) {
  return String(description || "").match(new RegExp(`(?:^|[; ])${name}=([^; ]+)`, "i"))?.[1] || "";
}

async function loadStageEvidence(client, stage) {
  const stageId = stage.jm1pub_editorialstageid;
  const titleId = stage._jm1pub_titleid_value;
  const gates = await client.list("jm1pub_editorialapprovalgates", {
    $select: "jm1pub_editorialapprovalgateid,jm1pub_gatestatus,jm1pub_authordecision,jm1pub_authordecisionon,_jm1pub_titleid_value,_jm1pub_editorialstageid_value,_jm1pub_deliverableartifactid_value",
    $filter: `_jm1pub_editorialstageid_value eq ${stageId}`,
    $top: "10"
  });
  if (gates.length >= 10) return { gates, truncated: true };
  const artifacts = await client.list("jm1pub_editorialartifacts", {
    $select: "jm1pub_editorialartifactid,jm1pub_sha256,_jm1pub_titleid_value,_jm1pub_editorialstageid_value",
    $filter: `_jm1pub_editorialstageid_value eq ${stageId}`,
    $top: "100"
  });
  if (artifacts.length >= 100) return { gates, artifacts, truncated: true };
  const sendEvents = await client.list("jm1_executionlogs", {
    $select: "jm1_executionlogid,jm1_actiontype,jm1_actiondescription,jm1_sourcerecordid,createdon",
    $filter: `jm1_sourcerecordid eq '${stageId}' and jm1_actiontype eq 'PACKAGE_CADENCE_RELEASE_AUTHOR_PACKAGE_SENT'`,
    $top: "100"
  });
  const intentEvents = await client.list("jm1_executionlogs", {
    $select: "jm1_executionlogid,jm1_actiontype,jm1_actiondescription,jm1_sourcerecordid,createdon",
    $filter: `jm1_sourcerecordid eq '${titleId}' and jm1_actiontype eq 'AUTHOR_COMMUNICATION_INTENT_SENT'`,
    $top: "100"
  });
  const gateIds = gates.map((gate) => gate.jm1pub_editorialapprovalgateid);
  const responseEvents = gateIds.length ? await client.list("jm1_executionlogs", {
    $select: "jm1_executionlogid,jm1_actiontype,jm1_sourcerecordid,createdon",
    $filter: `(${gateIds.map((gateId) => `jm1_sourcerecordid eq '${gateId}'`).join(" or ")}) and ` +
      "(jm1_actiontype eq 'AUTHOR_RESPONSE_CAPTURED' or jm1_actiontype eq 'AUTHOR_RESPONSE_INBOUND_CORRELATED')",
    $top: "100"
  }) : [];
  return { gates, artifacts, sendEvents, intentEvents, responseEvents,
    truncated: sendEvents.length >= 100 || intentEvents.length >= 100 || responseEvents.length >= 100 };
}

async function scanCurrentAuthorActions(client, deps = {}) {
  const [titles, stages] = await Promise.all([
    client.list("jm1pub_titles", {
      $select: "jm1pub_titleid,jm1pub_titlename,_jm1_primaryauthor_value,_jm1_author_value,jm1_canonicalauthorcontactreference,jm1_canonicalstatus,statecode",
      $filter: "statecode eq 0", $top: String(MAX_TITLES)
    }),
    client.list("jm1pub_editorialstages", {
      $select: "jm1pub_editorialstageid,_jm1pub_titleid_value,_jm1pub_contactid_value,jm1pub_stagesequence,jm1pub_stagestatus,jm1pub_stagetype,jm1pub_intakereference,jm1pub_publishingintakereference,createdon,modifiedon",
      $top: String(MAX_STAGES)
    })
  ]);
  if (titles.length >= MAX_TITLES || stages.length >= MAX_STAGES) {
    throw new Error("AUTHOR_ACTION_CENSUS_PAGINATION_LIMIT");
  }
  const stagesByTitle = byKey(stages, "_jm1pub_titleid_value");
  const projections = [];
  for (const title of titles) {
    const titleStages = stagesByTitle.get(title.jm1pub_titleid.toLowerCase()) || [];
    const current = [...titleStages].sort((a, b) => Number(b.jm1pub_stagesequence || 0) - Number(a.jm1pub_stagesequence || 0))[0];
    let evidence = {};
    if (current?._jm1pub_titleid_value && Number(current.jm1pub_stagestatus) === 100000002) {
      evidence = await loadStageEvidence(client, current);
      if (evidence.truncated) {
        projections.push({ titleId: title.jm1pub_titleid, nextActionOwner: "AMBIGUOUS",
          reason: "EVIDENCE_SET_TRUNCATED" });
        continue;
      }
      const send = evidence.sendEvents?.[0];
      const providerId = field(send?.jm1_actiondescription, "providerMessageId");
      const intent = evidence.intentEvents?.find((row) =>
        field(row.jm1_actiondescription, "providerMessageId").toLowerCase() === providerId.toLowerCase());
      const requestedAt = field(intent?.jm1_actiondescription, "sentAt") || send?.createdon;
      if (requestedAt && Number.isFinite(Date.parse(requestedAt))) {
        evidence.authorizedDueAt = addEasternCalendarDays(new Date(requestedAt), 7).toISOString();
        evidence.dueAuthority = "AUTHOR_REVIEW_RESPONSE_PERIOD_CALENDAR_DAYS_V1";
      }
      evidence.responseSearch = deps.responseSearch && send
        ? await deps.responseSearch({ title, stage: current, ...evidence })
        : { complete: false, candidateMessageIds: [] };
      if (evidence.responseSearch?.complete && evidence.responseSearch.deliveredAt &&
          Number.isFinite(Date.parse(evidence.responseSearch.deliveredAt))) {
        evidence.authorizedDueAt = addEasternCalendarDays(new Date(evidence.responseSearch.deliveredAt), 7).toISOString();
      }
    }
    projections.push(projectLegacyEditorialAction({ title, stages: titleStages, ...evidence }));
  }
  const reviewCandidates = projections.filter((row) => row.nextActionOwner === "AMBIGUOUS" &&
    (stagesByTitle.get(row.titleId.toLowerCase()) || []).some((stage) =>
      Number(stage.jm1pub_stagestatus) === 100000002))
    .map((row) => ({ titleId: row.titleId, stageId: row.stageId || null, reason: row.reason }));
  return {
    activeTitlesScanned: titles.length,
    authorDependenciesFound: projections.filter((row) => row.nextActionOwner === "AUTHOR").length,
    ambiguousDependencies: projections.filter((row) => row.nextActionOwner === "AMBIGUOUS").length,
    classifications: Object.fromEntries(["AUTHOR", "JM_PUBLISHING", "NONE", "AMBIGUOUS"].map((owner) =>
      [owner, projections.filter((row) => row.nextActionOwner === owner).length])),
    reviewCandidates,
    projections
  };
}

module.exports = { loadStageEvidence, scanCurrentAuthorActions };
