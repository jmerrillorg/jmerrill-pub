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
  }),
  Object.freeze({
    titleId: "pieces-of-me-all-over-the-place",
    title: "Pieces of Me All Over the Place",
    authorName: "Ashanti Flemister",
    imprint: "JM Works",
    genre: "Memoir",
    isbnPaperback: "978-1-950719-68-6",
    isbnHardcover: "",
    isbnEbook: "978-1-950719-67-9",
    isbnAudiobook: "",
    formats: ["Paperback", "eBook"],
    relationshipState: "Active Author",
    workspaceMode: "Published Author Workspace",
    currentStage: "Published / Post-Distribution Author Relationship",
    adoptionSource: "Legacy JMP Import"
  }),
  Object.freeze({
    titleId: "melodies-from-heaven",
    title: "Melodies From Heaven",
    authorName: "Baily Cunningham",
    imprint: "JM Verse",
    genre: "Faith",
    isbnPaperback: "978-1-950719-74-7",
    isbnHardcover: "",
    isbnEbook: "978-1-950719-73-0",
    isbnAudiobook: "",
    formats: ["Paperback", "eBook"],
    relationshipState: "Active Author",
    workspaceMode: "Published Author Workspace",
    currentStage: "Published / Post-Distribution Author Relationship",
    adoptionSource: "Legacy JMP Import"
  }),
  Object.freeze({
    titleId: "support-beyond-the-cycle",
    title: "Support Beyond the Cycle",
    authorName: "Brandyn McElroy",
    imprint: "JM Works",
    genre: "Self-Help",
    isbnPaperback: "978-1-950719-96-9",
    isbnHardcover: "",
    isbnEbook: "978-1-950719-95-2",
    isbnAudiobook: "",
    formats: ["Paperback", "eBook"],
    relationshipState: "Active Author",
    workspaceMode: "Published Author Workspace",
    currentStage: "Published / Post-Distribution Author Relationship",
    adoptionSource: "Legacy JMP Import"
  }),
  Object.freeze({
    titleId: "speech-therapy-works",
    title: "Speech Therapy Works!",
    authorName: "Cynthia Sloan",
    imprint: "JM Little",
    genre: "Children's",
    isbnPaperback: "978-1-950719-56-3",
    isbnHardcover: "",
    isbnEbook: "978-1-950719-55-6",
    isbnAudiobook: "",
    formats: ["Paperback", "eBook"],
    relationshipState: "Active Author",
    workspaceMode: "Published Author Workspace",
    currentStage: "Published / Post-Distribution Author Relationship",
    adoptionSource: "Legacy JMP Import"
  }),
  Object.freeze({
    titleId: "come-out-of-hiding",
    title: "Come Out of Hiding",
    authorName: "Christina Chislom",
    imprint: "J Merrill Publishing",
    genre: "Faith",
    isbnPaperback: "",
    isbnHardcover: "",
    isbnEbook: "978-1-950719-26-6",
    isbnAudiobook: "",
    formats: ["eBook"],
    relationshipState: "Active Author",
    workspaceMode: "Published Author Workspace",
    currentStage: "Published / Post-Distribution Author Relationship",
    adoptionSource: "Legacy JMP Import"
  }),
  Object.freeze({
    titleId: "she",
    title: "SHE",
    authorName: "Darlene Carson",
    imprint: "JM Verse",
    genre: "Inspirational",
    isbnPaperback: "978-1-950719-90-7",
    isbnHardcover: "",
    isbnEbook: "978-1-950719-89-1",
    isbnAudiobook: "",
    formats: ["Paperback", "eBook"],
    relationshipState: "Active Author",
    workspaceMode: "Published Author Workspace",
    currentStage: "Published / Post-Distribution Author Relationship",
    adoptionSource: "Legacy JMP Import"
  }),
  Object.freeze({
    titleId: "words-of-a-troubled-soul",
    title: "Words of A Troubled Soul",
    authorName: "David Williams",
    imprint: "JM Verse",
    genre: "Poetry",
    isbnPaperback: "978-1-954414-56-3",
    isbnHardcover: "978-1-961475-02-1",
    isbnEbook: "978-1-954414-55-6",
    isbnAudiobook: "",
    formats: ["Paperback", "Hardcover", "eBook"],
    relationshipState: "Active Author",
    workspaceMode: "Published Author Workspace",
    currentStage: "Published / Post-Distribution Author Relationship",
    adoptionSource: "Legacy JMP Import"
  }),
  Object.freeze({
    titleId: "warrior-s-breed",
    title: "Warrior's Breed",
    authorName: "Dean Wilson",
    imprint: "J Merrill Publishing",
    genre: "Faith",
    isbnPaperback: "978-1-954414-66-2",
    isbnHardcover: "",
    isbnEbook: "978-1-954414-65-5",
    isbnAudiobook: "",
    formats: ["Paperback", "eBook"],
    relationshipState: "Active Author",
    workspaceMode: "Published Author Workspace",
    currentStage: "Published / Post-Distribution Author Relationship",
    adoptionSource: "Legacy JMP Import"
  }),
  Object.freeze({
    titleId: "life-after-detour",
    title: "Life after Detour",
    authorName: "Deanna Jones",
    imprint: "JM Works",
    genre: "Memoir",
    isbnPaperback: "978-1-950719-38-9",
    isbnHardcover: "",
    isbnEbook: "978-1-950719-39-6",
    isbnAudiobook: "",
    formats: ["Paperback", "eBook"],
    relationshipState: "Active Author",
    workspaceMode: "Published Author Workspace",
    currentStage: "Published / Post-Distribution Author Relationship",
    adoptionSource: "Legacy JMP Import"
  }),
  Object.freeze({
    titleId: "27-days-to-overcoming-depression",
    title: "27 Days to Overcoming Depression",
    authorName: "Donjia Walls",
    imprint: "JM Works",
    genre: "Self-Help",
    isbnPaperback: "978-1-961475-36-6",
    isbnHardcover: "",
    isbnEbook: "",
    isbnAudiobook: "",
    formats: ["Paperback"],
    relationshipState: "Active Author",
    workspaceMode: "Published Author Workspace",
    currentStage: "Published / Post-Distribution Author Relationship",
    adoptionSource: "Legacy JMP Import"
  })
]);

const TRACK_B_PILOT = TRACK_B_ADOPTION_CANDIDATES[0];

const HISTORICAL_EVENTS = Object.freeze([
  ["OP000_WAVE_ADOPTION_STARTED", "OP-000 Enterprise Adoption Wave 1 adoption started for a published author/title."],
  ["OP000_AUTHOR_ADOPTED", "Published author adopted into PROGRAM-002 relationship coverage."],
  ["OP000_TITLE_ADOPTED", "Published title adopted into PROGRAM-002 title coverage without restarting the lifecycle."],
  ["OP000_WORKSPACE_LINKED_OR_CREATED", "Published Author Workspace mode certified; SharePoint workspace search/link remains governed and non-duplicative."],
  ["OP000_IMPRINT_ASSIGNED", "Existing catalog imprint assigned from Legacy JMP evidence."],
  ["OP000_IMPRINT_LOCKED", "Existing non-Signature imprint accepted and locked as-is from catalog evidence."],
  ["OP000_CONTRACT_RECONCILIATION_DEFERRED", "Historical contract status set to Signed / Exists - Location Pending Reconciliation."],
  ["OP000_STRIPE_MIGRATION_FLAGGED", "Stripe Migration Required until an existing Connect account is confirmed."],
  ["OP000_AUTHOR_WORKSPACE_CERTIFIED", "Published Author Workspace certified with My Books visibility and pre-contract onboarding hidden."],
  ["OP000_WAVE_ADOPTION_CERTIFIED", "OP-000 Enterprise Adoption Wave 1 adoption certified for this author/title."]
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
      contracts: "Signed / Exists - Location Pending Reconciliation; do not regenerate or request a new signature.",
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
        contractStatus: "Signed / Exists - Location Pending Reconciliation",
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
