"use strict";

const { getDataverseToken } = require("../dataverse/authorDraftPersistenceClient");
const { classifyDataverseWriteError } = require("../author/milestone6OpportunityWriter");
const { AGENT_NAME, BAND_LEVEL, EXECUTION_STATUS } = require("../dataverse/metadataWriter");

const OP000_TRACK_B_GATE_NAME = "JM1_OP000_TRACK_B_ADOPTION_ENABLED";
const EXECUTION_LOG_ENTITY_SET = "jm1_executionlogs";
const OP000_TRACK_B_AGENT_MODEL = "program-002-op000-track-b-published-author-adoption";
const TRACK_B_SOURCE_ENTITY = "catalog_title";

const TRACK_B_ADOPTION_CANDIDATES = Object.freeze([
  Object.freeze({
    titleId: "100-wisdom-lessons-for-life-and-living",
    title: "100 Wisdom Lessons for Life and Living",
    authorName: "J. Derrick Johnson",
    imprint: "J Merrill Publishing",
    genre: "",
    isbnPaperback: "978-1-961475-57-1",
    isbnHardcover: "978-1-961475-58-8",
    isbnEbook: "978-1-961475-59-5",
    isbnAudiobook: "978-1-961475-60-1",
    formats: ["Paperback", "Hardcover", "eBook", "Audiobook"],
    relationshipState: "Active Author",
    workspaceMode: "Published Author Workspace",
    currentStage: "Published / Post-Distribution Author Relationship",
    adoptionSource: "Legacy JMP Import"
  }),
  Object.freeze({
    titleId: "according-to-mark",
    title: "According to Mark",
    authorName: "Alice V Pryor",
    imprint: "J Merrill Publishing",
    genre: "Faith",
    isbnPaperback: "978-1-954414-54-9",
    isbnHardcover: "978-1-961475-00-7",
    isbnEbook: "978-1-954414-53-2",
    isbnAudiobook: "",
    formats: ["Paperback", "Hardcover", "eBook"],
    relationshipState: "Active Author",
    workspaceMode: "Published Author Workspace",
    currentStage: "Published / Post-Distribution Author Relationship",
    adoptionSource: "Legacy JMP Import"
  })
]);

const TRACK_B_PILOT = TRACK_B_ADOPTION_CANDIDATES[0];

const HISTORICAL_EVENTS = Object.freeze([
  ["OP000_TRACK_B_ADOPTION_STARTED", "OP-000 Track B adoption started for a published author/title."],
  ["OP000_PUBLISHED_TITLE_IMPORTED", "Published title imported into PROGRAM-002 coverage without restarting the lifecycle."],
  ["OP000_AUTHOR_IDENTITY_REVIEWED", "Author identity reviewed for Contact matching; no duplicate Contact may be created by this runner."],
  ["OP000_RELATIONSHIP_STATE_ASSIGNED", "Relationship State certified as Active Author for published-title adoption."],
  ["OP000_PUBLISHED_AUTHOR_WORKSPACE_MODE_ASSIGNED", "Workspace Mode certified as Published Author Workspace."],
  ["OP000_MY_BOOKS_READY", "Published title prepared for My Books display using existing catalog ISBN metadata."],
  ["OP000_CONTRACT_REUSE_REQUIRED", "Historical contracts must be linked/reused; no regeneration or re-signature requested."],
  ["OP000_ROYALTY_MIGRATION_STATUS_FLAGGED", "Royalty payment method is not migrated; Stripe Migration Required until existing method is confirmed."],
  ["OP000_EDITORIAL_COMPLETED_LEGACY", "Editorial completion certified from legacy published-title status."],
  ["OP000_COVER_APPROVED_LEGACY", "Cover approval certified from legacy published-title status."],
  ["OP000_PRODUCTION_COMPLETED_LEGACY", "Production completion certified from legacy published-title status."],
  ["OP000_DISTRIBUTION_COMPLETED_LEGACY", "Distribution completion certified from multi-format published catalog evidence."],
  ["OP000_IMPRINT_LOCKED", "Existing non-Signature imprint accepted and locked as-is because catalog genre is blank."],
  ["OP000_CATALOG_HYGIENE_REVIEWED", "Direct catalog hygiene reviewed for the pilot title; no enterprise-wide cleanup started."],
  ["OP000_TRACK_B_ADOPTION_CERTIFIED", "OP-000 Track B pilot adoption certified for the published author workspace method."]
]);

function normalizeString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeTitle(value) {
  return normalizeString(value).replace(/\s+/g, " ").toLowerCase();
}

function isGateOpen() {
  return normalizeString(process.env[OP000_TRACK_B_GATE_NAME]).toLowerCase() === "true";
}

function isAuthorizedTrackBPilot(input) {
  return Boolean(resolveTrackBCandidate(input));
}

function resolveTrackBCandidate(input) {
  return (
    TRACK_B_ADOPTION_CANDIDATES.find(
      (candidate) =>
        normalizeTitle(input?.title) === normalizeTitle(candidate.title) &&
        normalizeString(input?.titleId).toLowerCase() === candidate.titleId &&
        normalizeTitle(input?.authorName) === normalizeTitle(candidate.authorName)
    ) || null
  );
}

function classifyTrackBImprint(input) {
  const recordedImprint = normalizeString(input?.imprint) || TRACK_B_PILOT.imprint;
  const genre = normalizeString(input?.genre);
  const isSignature = recordedImprint.toLowerCase() === "jm signature";

  if (isSignature) {
    return {
      imprint: recordedImprint,
      confidence: 0.5,
      lockStatus: "Publisher Review Pending",
      jmSignatureCandidate: true,
      basis: [
        "Recorded imprint is JM Signature.",
        "JM Signature is invitation-only and must not auto-lock without Publisher dual authorization."
      ]
    };
  }

  return {
    imprint: recordedImprint,
    confidence: genre ? 0.82 : 0.71,
    lockStatus: "Locked",
    jmSignatureCandidate: false,
    basis: [
      `Recorded imprint: ${recordedImprint}.`,
      genre
        ? `Catalog genre signal present: ${genre}.`
        : "Catalog genre is blank; existing non-Signature imprint is accepted as the governed historical source rather than re-derived from missing data.",
      "No JM Signature exception detected."
    ]
  };
}

function buildTrackBAdoptionPacket(input = {}) {
  const completedAt = normalizeString(input.completedAt) || new Date().toISOString();
  const candidate = resolveTrackBCandidate(input) || TRACK_B_PILOT;
  const imprint = classifyTrackBImprint(candidate);
  const contactFinding =
    candidate.titleId === TRACK_B_PILOT.titleId
      ? "Needs exact Contact confirmation; Dataverse has similar Johnson/Derrick records but no clean title-bound match in the pilot evidence."
      : "Needs exact Contact confirmation through the governed author-linking step; no duplicate Contact may be created by this runner.";

  return {
    status: "OP000_TRACK_B_ADOPTION_READY",
    track: "Track B - Published Author Workspace Adoption",
    source: "Legacy JMP catalog + published-title evidence",
    certifiedBy: "Jackie Smith Jr.",
    certifiedAt: completedAt,
    record: { ...candidate },
    relationship: {
      state: candidate.relationshipState,
      workspaceMode: candidate.workspaceMode,
      onboardingTreatment: "Do not force /join, pre-contract onboarding, agreement setup, payment setup, or Stripe onboarding for already-published authors."
    },
    imprint,
    workspace: {
      portalMode: "Published Author Workspace",
      modules: ["Dashboard", "My Books", "Contracts", "Files", "Marketing Assets", "Author Success", "Support", "New Title Submission"],
      hiddenModules: ["Pre-Contract Onboarding", "Agreement Setup", "Payment Setup"],
      sharePointBehavior: "Search for an existing author/title folder first; create a post-distribution workspace only if no existing folder is found.",
      duplicatePrevention: "Match by title ID, ISBNs, author identity, and existing folder evidence before creating anything."
    },
    enterpriseAuthorMap: {
      contact: contactFinding,
      authorStatus: "Published author; set/confirm jm1pub_isauthor only through the governed contact-linking step.",
      relationshipState: candidate.relationshipState,
      workspaceMode: candidate.workspaceMode,
      titles: [candidate.title],
      contracts: "Reuse/link historical contract if found; do not regenerate.",
      paymentMethod: "Existing royalty payment method continues until a separate Stripe migration initiative.",
      stripeStatus: "Stripe Migration Required unless an existing Connect account is confirmed.",
      sharePointWorkspace: "Search-before-create required.",
      imprint: candidate.imprint,
      executionHistory: "Historical certification events only; no claim that work happened today."
    },
    existingEvidence: {
      catalog: {
        titleId: candidate.titleId,
        title: candidate.title,
        authorName: candidate.authorName,
        imprint: candidate.imprint,
        formats: candidate.formats,
        isbns: {
          paperback: candidate.isbnPaperback,
          hardcover: candidate.isbnHardcover,
          ebook: candidate.isbnEbook,
          audiobook: candidate.isbnAudiobook
        }
      },
      dataverseReadback: {
        titleRecordFound: false,
        contractRecordFound: false,
        opportunityRecordFound: false,
        contactMatch: "Ambiguous without title-bound source; do not create duplicate Contact."
      },
      royalty: {
        paymentMigrationAction: "None",
        currentPaymentMethod: "To be confirmed from legacy royalty source",
        stripeMigrationRequired: true
      }
    },
    liveActions: {
      createsContact: false,
      createsLead: false,
      createsOpportunity: false,
      createsContract: false,
      createsPayment: false,
      createsRoyaltyPayment: false,
      movesWorkspace: false,
      sendsEmail: false,
      startsProduction: false,
      startsDistribution: false
    },
    executionHistory: HISTORICAL_EVENTS.map(([eventType, summary]) => ({
      eventType,
      summary,
      source: "Legacy JMP catalog + published-title evidence",
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
    `Author: ${packet.record.authorName}.`,
    `Title ID: ${packet.record.titleId}.`,
    `ISBN PB: ${packet.record.isbnPaperback}.`,
    `Track: ${packet.track}.`,
    `Workspace Mode: ${packet.relationship.workspaceMode}.`,
    `Source: ${event.source}.`,
    `Certified by ${event.certifiedBy}.`,
    "Historical certification only; no Contact, Lead, Opportunity, Contract, payment, royalty, workspace, distribution, production, or email action performed.",
    `Gate used: ${OP000_TRACK_B_GATE_NAME}.`
  ].join(" ");

  return {
    jm1_name: `OP000-${event.eventType}-${packet.record.titleId}`,
    jm1_actiondescription: description.slice(0, 1000),
    jm1_actiontype: event.eventType,
    jm1_agentname: AGENT_NAME,
    jm1_agentmodel: OP000_TRACK_B_AGENT_MODEL,
    jm1_bandlevel: BAND_LEVEL.BAND_1,
    jm1_executionstatus: EXECUTION_STATUS.SUCCESS,
    jm1_startedon: completedAt,
    jm1_completedon: completedAt,
    jm1_sourceentity: TRACK_B_SOURCE_ENTITY,
    jm1_sourcerecordid: packet.record.titleId
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

async function runTrackBAdoption(input = {}, deps = {}) {
  const candidate = resolveTrackBCandidate(input);
  if (!candidate) {
    return { ok: false, code: "OP000_TRACK_B_ADOPTION_BLOCKED", reason: "PILOT_RECORD_NOT_AUTHORIZED" };
  }

  const packet = buildTrackBAdoptionPacket({ ...candidate, completedAt: input.completedAt });

  if (!isGateOpen()) {
    return { ok: false, code: "OP000_TRACK_B_ADOPTION_BLOCKED", reason: "GATE_CLOSED", packet };
  }

  const apiBase = normalizeString(process.env.DATAVERSE_WEB_API_BASE_URL);
  const resourceUrl = normalizeString(process.env.DATAVERSE_RESOURCE_URL);

  if (!apiBase || !resourceUrl) {
    return { ok: false, code: "OP000_TRACK_B_ADOPTION_BLOCKED", reason: "DATAVERSE_ENV_MISSING", packet };
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
      code: "OP000_TRACK_B_ADOPTION_BLOCKED",
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
      code: "OP000_TRACK_B_ADOPTION_PARTIAL",
      reason: "EXECUTION_LOG_WRITE_FAILED",
      packet,
      executionLogs
    };
  }

  return {
    ok: true,
    code: "OP000_TRACK_B_ADOPTION_CERTIFIED",
    packet,
    executionLogs
  };
}

module.exports = {
  OP000_TRACK_B_GATE_NAME,
  TRACK_B_ADOPTION_CANDIDATES,
  TRACK_B_PILOT,
  HISTORICAL_EVENTS,
  resolveTrackBCandidate,
  isAuthorizedTrackBPilot,
  classifyTrackBImprint,
  buildTrackBAdoptionPacket,
  buildExecutionLogPayload,
  runTrackBAdoption,
  postExecutionLogRecord
};
