"use strict";

const { getDataverseToken } = require("../dataverse/authorDraftPersistenceClient");
const { classifyDataverseWriteError } = require("../author/milestone6OpportunityWriter");
const { AGENT_NAME, BAND_LEVEL, EXECUTION_STATUS, SOURCE_ENTITY } = require("../dataverse/metadataWriter");

const OP000_ADOPTION_GATE_NAME = "JM1_OP000_ADOPTION_ENABLED";
const EXECUTION_LOG_ENTITY_SET = "jm1_executionlogs";
const OP000_AGENT_MODEL = "program-002-op000-track-a-adoption";

const TRACK_A_PILOT = Object.freeze({
  title: "Establishing Glory: The Library",
  intakeReferenceCode: "JMP-INT-202606-UFYG60",
  diagnosticId: "64e387e0-7e6a-f111-a826-00224820105b",
  opportunityId: "2653fca9-eacd-4c44-b3ed-1764dd5d35aa",
  opportunityName: "Publishing Intake - Establishing Glory: The Library",
  manuscriptFilename: "240711 Establishing Glory.docx",
  manuscriptSha256: "b337a17a27c0c7108302ca7f671c26d788ce289fc3b9ffab6b12e09e23e87e31",
  manuscriptWordCount: 48232,
  selectedPackageCode: "JMP-PKG-PRO",
  selectedPackageName: "Professional Publishing Package",
  currentStage: "Production Pipeline / Commissioning Hold",
  relationshipState: "Active Author",
  workspaceMode: "Active Author Workspace"
});

const HISTORICAL_EVENTS = Object.freeze([
  ["OP000_ADOPTION_STARTED", "OP-000 Track A adoption started for an active in-flight publishing title."],
  ["OP000_IMPORTED_INTO_PROGRAM_002", "Existing active publishing title imported into PROGRAM-002 without restarting the lifecycle."],
  ["OP000_EDITORIAL_CERTIFIED", "Prior editorial diagnostic and review evidence certified from INT-PUB-005 commissioning records."],
  ["OP000_PACKAGE_CERTIFIED", "Existing package recommendation and business-source evidence certified."],
  ["OP000_OPPORTUNITY_LINKED", "Existing Opportunity linked; no duplicate Opportunity created."],
  ["OP000_WORKSPACE_LINKED", "Existing workspace expected for reuse; OP-000 does not duplicate the SharePoint workspace."],
  ["OP000_AGREEMENT_PAYMENT_CERTIFIED", "Existing agreement/payment readiness evidence certified where present; no new payment or agreement action performed."],
  ["OP000_PRODUCTION_READINESS_CERTIFIED", "Existing production-readiness evidence certified; production work not restarted."],
  ["OP000_DISTRIBUTION_READINESS_CERTIFIED", "Existing distribution-readiness evidence certified; no retailer submission performed."],
  ["OP000_IMPRINT_LOCKED", "Imprint classification certified and locked outside the JM Signature exception path."],
  ["OP000_RELATIONSHIP_STATE_ASSIGNED", "Relationship State and Workspace Mode assigned for active-author continuation."],
  ["OP000_ADOPTION_CERTIFIED", "OP-000 Track A pilot adoption certified for the commissioning title."]
]);

function normalizeString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeTitle(value) {
  return normalizeString(value).replace(/\s+/g, " ").toLowerCase();
}

function isGateOpen() {
  return normalizeString(process.env[OP000_ADOPTION_GATE_NAME]).toLowerCase() === "true";
}

function isAuthorizedTrackAPilot(input) {
  return (
    normalizeTitle(input?.title) === normalizeTitle(TRACK_A_PILOT.title) &&
    normalizeString(input?.diagnosticId).toLowerCase() === TRACK_A_PILOT.diagnosticId.toLowerCase() &&
    normalizeString(input?.intakeReferenceCode).toUpperCase() === TRACK_A_PILOT.intakeReferenceCode &&
    normalizeString(input?.opportunityId).toLowerCase() === TRACK_A_PILOT.opportunityId.toLowerCase()
  );
}

function classifyTrackAImprint(input) {
  const title = normalizeString(input?.title) || TRACK_A_PILOT.title;
  const manuscriptWordCount = Number(input?.manuscriptWordCount || TRACK_A_PILOT.manuscriptWordCount);

  return {
    imprint: "JM Works",
    confidence: manuscriptWordCount >= 30000 ? 0.86 : 0.74,
    lockStatus: "Locked",
    jmSignatureCandidate: false,
    basis: [
      `Title: ${title}`,
      "Classification basis: active publishing project and prior INT-PUB-005 commissioning evidence.",
      "Self-Help classification routes to JM Works under the current /join imprint derivation and Stage-0 imprint rubric.",
      "JM Signature not assigned automatically; no invitation-only imprint exception detected for this Track A pilot."
    ]
  };
}

function buildTrackAAdoptionPacket(input = {}) {
  const completedAt = normalizeString(input.completedAt) || new Date().toISOString();
  const imprint = classifyTrackAImprint({
    title: TRACK_A_PILOT.title,
    manuscriptWordCount: TRACK_A_PILOT.manuscriptWordCount
  });

  return {
    status: "OP000_TRACK_A_ADOPTION_READY",
    track: "Track A - Active Pipeline Adoption",
    source: "Legacy JMP + INT-PUB-005 commissioning evidence",
    certifiedBy: "Jackie Smith Jr.",
    certifiedAt: completedAt,
    record: { ...TRACK_A_PILOT },
    relationship: {
      state: TRACK_A_PILOT.relationshipState,
      workspaceMode: TRACK_A_PILOT.workspaceMode,
      onboardingTreatment: "Do not force completed/active author back through pre-contract onboarding unless missing data is found."
    },
    imprint,
    workspace: {
      behavior: "Reuse existing Author Workspace and SharePoint workspace if present; create only missing workspace shells.",
      duplicatePrevention: "Match by Opportunity ID and intake/diagnostic identifiers, never by title-string similarity.",
      movement: "Do not move the SharePoint workspace during OP-000 adoption; preserve the last completed governance gate."
    },
    existingEvidence: {
      manuscript: {
        filename: TRACK_A_PILOT.manuscriptFilename,
        sha256: TRACK_A_PILOT.manuscriptSha256,
        wordCount: TRACK_A_PILOT.manuscriptWordCount
      },
      editorialDiagnostic: {
        diagnosticId: TRACK_A_PILOT.diagnosticId,
        acceptedRealManuscriptPilot: true,
        noQuotationValidationPassed: true
      },
      opportunity: {
        id: TRACK_A_PILOT.opportunityId,
        name: TRACK_A_PILOT.opportunityName,
        duplicateCreationAllowed: false
      },
      productionReadiness: "Certified from prior Milestone 7/7C evidence; live production remains governed by its own gates.",
      distributionReadiness: "Certified from prior Milestone 8 evidence; no retailer submission performed."
    },
    liveActions: {
      createsContact: false,
      createsLead: false,
      createsOpportunity: false,
      createsContract: false,
      createsPayment: false,
      movesWorkspace: false,
      sendsEmail: false,
      startsProduction: false,
      startsDistribution: false
    },
    executionHistory: HISTORICAL_EVENTS.map(([eventType, summary]) => ({
      eventType,
      summary,
      source: "Legacy JMP + INT-PUB-005 commissioning evidence",
      certifiedBy: "Jackie Smith Jr.",
      evidenceTimestamp: completedAt,
      historicalCertification: true
    }))
  };
}

function buildExecutionLogPayload(event, packet, completedAt) {
  const description = [
    `${event.eventType}: ${event.summary}`,
    `Title: ${packet.record.title}.`,
    `Intake: ${packet.record.intakeReferenceCode}.`,
    `Diagnostic: ${packet.record.diagnosticId}.`,
    `Opportunity: ${packet.record.opportunityId}.`,
    `Track: ${packet.track}.`,
    `Source: ${event.source}.`,
    `Certified by ${event.certifiedBy}.`,
    "Historical certification only; no Contact, Lead, Opportunity, Contract, payment, workspace, production, distribution, royalty, or email action performed.",
    `Gate used: ${OP000_ADOPTION_GATE_NAME}.`
  ].join(" ");

  return {
    jm1_name: `OP000-${event.eventType}-${packet.record.diagnosticId}`,
    jm1_actiondescription: description.slice(0, 1000),
    jm1_actiontype: event.eventType,
    jm1_agentname: AGENT_NAME,
    jm1_agentmodel: OP000_AGENT_MODEL,
    jm1_bandlevel: BAND_LEVEL.BAND_1,
    jm1_executionstatus: EXECUTION_STATUS.SUCCESS,
    jm1_startedon: completedAt,
    jm1_completedon: completedAt,
    jm1_sourceentity: SOURCE_ENTITY,
    jm1_sourcerecordid: packet.record.diagnosticId
  };
}

async function postExecutionLogRecord(apiBase, token, payload) {
  const url = `${apiBase.replace(/\/$/, "")}/${EXECUTION_LOG_ENTITY_SET}`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
      "OData-MaxVersion": "4.0",
      "OData-Version": "4.0",
      "Prefer": "return=representation"
    },
    body: JSON.stringify(payload)
  });

  const body = await response.json().catch(() => ({}));

  if (!response.ok) {
    const code = body?.error?.code || response.status;
    const msg = body?.error?.message || `HTTP ${response.status}`;
    throw Object.assign(new Error(`Dataverse POST failed (${EXECUTION_LOG_ENTITY_SET}): ${msg}`), {
      safeCode: "DATAVERSE_WRITE_FAILED",
      httpStatus: response.status,
      dvCode: code
    });
  }

  return {
    id: normalizeString(body.jm1_executionlogid) || null,
    etag: normalizeString(body["@odata.etag"]) || null
  };
}

async function runTrackAAdoption(input = {}, deps = {}) {
  if (!isAuthorizedTrackAPilot(input)) {
    return { ok: false, code: "OP000_ADOPTION_BLOCKED", reason: "PILOT_RECORD_NOT_AUTHORIZED" };
  }

  const packet = buildTrackAAdoptionPacket(input);

  if (!isGateOpen()) {
    return { ok: false, code: "OP000_ADOPTION_BLOCKED", reason: "GATE_CLOSED", packet };
  }

  const apiBase = normalizeString(process.env.DATAVERSE_WEB_API_BASE_URL);
  const resourceUrl = normalizeString(process.env.DATAVERSE_RESOURCE_URL);

  if (!apiBase || !resourceUrl) {
    return { ok: false, code: "OP000_ADOPTION_BLOCKED", reason: "DATAVERSE_ENV_MISSING", packet };
  }

  const completedAt = packet.certifiedAt;
  const payloads = packet.executionHistory.map((event) => buildExecutionLogPayload(event, packet, completedAt));
  const resolveToken = deps.getToken || getDataverseToken;
  const postLog = deps.postExecutionLogRecord || postExecutionLogRecord;

  let token;
  try {
    token = await resolveToken(resourceUrl);
  } catch (err) {
    return {
      ok: false,
      code: "OP000_ADOPTION_BLOCKED",
      reason: err?.safeCode || "DATAVERSE_TOKEN_FAILED",
      packet
    };
  }

  const executionLogs = [];
  for (const payload of payloads) {
    try {
      const result = await postLog(apiBase, token, payload);
      executionLogs.push({ created: true, id: result.id || null, actionType: payload.jm1_actiontype });
    } catch (err) {
      executionLogs.push({
        created: false,
        id: null,
        actionType: payload.jm1_actiontype,
        error: err?.safeCode || "DATAVERSE_WRITE_FAILED",
        diagnostics: classifyDataverseWriteError(err)
      });
    }
  }

  const failedLogs = executionLogs.filter((log) => !log.created);
  if (failedLogs.length > 0) {
    return {
      ok: false,
      code: "OP000_ADOPTION_PARTIAL",
      reason: "EXECUTION_LOG_WRITE_FAILED",
      packet,
      executionLogs
    };
  }

  return {
    ok: true,
    code: "OP000_TRACK_A_ADOPTION_CERTIFIED",
    packet,
    executionLogs
  };
}

module.exports = {
  OP000_ADOPTION_GATE_NAME,
  TRACK_A_PILOT,
  HISTORICAL_EVENTS,
  isAuthorizedTrackAPilot,
  classifyTrackAImprint,
  buildTrackAAdoptionPacket,
  buildExecutionLogPayload,
  runTrackAAdoption,
  postExecutionLogRecord
};
