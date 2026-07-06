"use strict";

const assert = require("node:assert/strict");
const { describe, it, beforeEach, afterEach } = require("node:test");

const {
  OP000_TRACK_B_GATE_NAME,
  TRACK_B_ADOPTION_CANDIDATES,
  TRACK_B_PILOT,
  HISTORICAL_EVENTS,
  resolveTrackBCandidate,
  isAuthorizedTrackBPilot,
  classifyTrackBImprint,
  buildTrackBAdoptionPacket,
  buildExecutionLogPayload,
  runTrackBAdoption
} = require("../src/adoption/op000TrackBAdoption");

const REQUIRED_LOG_FIELDS = Object.freeze([
  "jm1_name",
  "jm1_actiondescription",
  "jm1_actiontype",
  "jm1_agentname",
  "jm1_agentmodel",
  "jm1_bandlevel",
  "jm1_executionstatus",
  "jm1_startedon",
  "jm1_completedon",
  "jm1_sourceentity",
  "jm1_sourcerecordid"
]);

describe("OP-000 Track B adoption", () => {
  const priorGate = process.env[OP000_TRACK_B_GATE_NAME];
  const priorApiBase = process.env.DATAVERSE_WEB_API_BASE_URL;
  const priorResourceUrl = process.env.DATAVERSE_RESOURCE_URL;

  beforeEach(() => {
    delete process.env[OP000_TRACK_B_GATE_NAME];
    process.env.DATAVERSE_WEB_API_BASE_URL = "https://example.crm.dynamics.com/api/data/v9.2/";
    process.env.DATAVERSE_RESOURCE_URL = "https://example.crm.dynamics.com";
  });

  afterEach(() => {
    if (priorGate == null) delete process.env[OP000_TRACK_B_GATE_NAME];
    else process.env[OP000_TRACK_B_GATE_NAME] = priorGate;

    if (priorApiBase == null) delete process.env.DATAVERSE_WEB_API_BASE_URL;
    else process.env.DATAVERSE_WEB_API_BASE_URL = priorApiBase;

    if (priorResourceUrl == null) delete process.env.DATAVERSE_RESOURCE_URL;
    else process.env.DATAVERSE_RESOURCE_URL = priorResourceUrl;
  });

  it("authorizes only allowlisted Track B adoption records", () => {
    assert.equal(isAuthorizedTrackBPilot(TRACK_B_PILOT), true);
    assert.equal(isAuthorizedTrackBPilot(TRACK_B_ADOPTION_CANDIDATES[1]), true);
    assert.equal(resolveTrackBCandidate(TRACK_B_ADOPTION_CANDIDATES[1]).title, "According to Mark");

    assert.equal(
      isAuthorizedTrackBPilot({
        ...TRACK_B_PILOT,
        titleId: "a-portrait-of-paradise"
      }),
      false
    );

    assert.equal(
      isAuthorizedTrackBPilot({
        ...TRACK_B_PILOT,
        authorName: "Derrick Johnson"
      }),
      false
    );
  });

  it("builds an adoption packet for the selected allowlisted title", () => {
    const packet = buildTrackBAdoptionPacket({
      ...TRACK_B_ADOPTION_CANDIDATES[1],
      completedAt: "2026-07-06T12:00:00.000Z"
    });

    assert.equal(packet.record.title, "According to Mark");
    assert.equal(packet.record.authorName, "Alice V Pryor");
    assert.equal(packet.imprint.lockStatus, "Locked");
    assert.equal(packet.existingEvidence.catalog.isbns.hardcover, "978-1-961475-00-7");
  });

  it("locks the existing non-Signature imprint without inventing genre data", () => {
    const imprint = classifyTrackBImprint(TRACK_B_PILOT);

    assert.equal(imprint.imprint, "J Merrill Publishing");
    assert.equal(imprint.lockStatus, "Locked");
    assert.equal(imprint.jmSignatureCandidate, false);
    assert.ok(imprint.confidence < 0.8);
    assert.match(imprint.basis.join(" "), /genre is blank/i);
  });

  it("keeps JM Signature on the exception path", () => {
    const imprint = classifyTrackBImprint({ ...TRACK_B_PILOT, imprint: "JM Signature" });

    assert.equal(imprint.lockStatus, "Publisher Review Pending");
    assert.equal(imprint.jmSignatureCandidate, true);
  });

  it("builds a published author workspace packet with no live side effects", () => {
    const packet = buildTrackBAdoptionPacket({ completedAt: "2026-07-06T12:00:00.000Z" });

    assert.equal(packet.track, "Track B - Published Author Workspace Adoption");
    assert.equal(packet.record.title, "100 Wisdom Lessons for Life and Living");
    assert.equal(packet.relationship.state, "Active Author");
    assert.equal(packet.relationship.workspaceMode, "Published Author Workspace");
    assert.deepEqual(packet.workspace.modules, [
      "Dashboard",
      "My Books",
      "Contracts",
      "Files",
      "Marketing Assets",
      "Author Success",
      "Support",
      "New Title Submission"
    ]);
    assert.equal(packet.liveActions.createsContact, false);
    assert.equal(packet.liveActions.createsLead, false);
    assert.equal(packet.liveActions.createsOpportunity, false);
    assert.equal(packet.liveActions.createsContract, false);
    assert.equal(packet.liveActions.createsPayment, false);
    assert.equal(packet.liveActions.createsRoyaltyPayment, false);
    assert.equal(packet.liveActions.movesWorkspace, false);
    assert.equal(packet.liveActions.sendsEmail, false);
    assert.equal(packet.executionHistory.length, HISTORICAL_EVENTS.length);
  });

  it("records the Enterprise Author Map without treating SignNow or Stripe as required", () => {
    const packet = buildTrackBAdoptionPacket({ completedAt: "2026-07-06T12:00:00.000Z" });

    assert.equal(packet.enterpriseAuthorMap.relationshipState, "Active Author");
    assert.equal(packet.enterpriseAuthorMap.workspaceMode, "Published Author Workspace");
    assert.equal(packet.enterpriseAuthorMap.stripeStatus, "Stripe Migration Required unless an existing Connect account is confirmed.");
    assert.match(packet.enterpriseAuthorMap.contracts, /Reuse\/link historical contract/i);
  });

  it("builds safe execution-log payloads only", () => {
    const packet = buildTrackBAdoptionPacket({ completedAt: "2026-07-06T12:00:00.000Z" });
    const payload = buildExecutionLogPayload(packet.executionHistory[0], packet, packet.certifiedAt);
    const keys = Object.keys(payload).sort();

    assert.deepEqual(keys, [...REQUIRED_LOG_FIELDS].sort());
    assert.equal(payload.jm1_actiontype, "OP000_TRACK_B_ADOPTION_STARTED");
    assert.equal(payload.jm1_sourcerecordid, TRACK_B_PILOT.titleId);
    assert.doesNotMatch(JSON.stringify(payload), /requestpayload|responsepayload|bank|tax|royalty statement|secret|token|header/i);
  });

  it("fails closed when the Track B gate is not open", async () => {
    const result = await runTrackBAdoption(TRACK_B_PILOT, {
      getToken: async () => "token",
      postExecutionLogRecord: async () => ({ id: "should-not-write" })
    });

    assert.equal(result.ok, false);
    assert.equal(result.reason, "GATE_CLOSED");
    assert.equal(result.packet.record.title, TRACK_B_PILOT.title);
  });

  it("writes exactly one execution-log row per prepared event when gated", async () => {
    process.env[OP000_TRACK_B_GATE_NAME] = "true";

    const writes = [];
    const result = await runTrackBAdoption(
      { ...TRACK_B_PILOT, completedAt: "2026-07-06T12:00:00.000Z" },
      {
        getToken: async () => "token",
        postExecutionLogRecord: async (_apiBase, token, payload) => {
          assert.equal(token, "token");
          writes.push(payload);
          return { id: `log-${writes.length}` };
        }
      }
    );

    assert.equal(result.ok, true);
    assert.equal(result.code, "OP000_TRACK_B_ADOPTION_CERTIFIED");
    assert.equal(writes.length, HISTORICAL_EVENTS.length);
    assert.deepEqual(
      writes.map((payload) => payload.jm1_actiontype),
      HISTORICAL_EVENTS.map(([eventType]) => eventType)
    );
    assert.equal(result.executionLogs.every((log) => log.created), true);
  });

  it("writes the selected allowlisted title when gated", async () => {
    process.env[OP000_TRACK_B_GATE_NAME] = "true";

    const writes = [];
    const result = await runTrackBAdoption(
      { ...TRACK_B_ADOPTION_CANDIDATES[1], completedAt: "2026-07-06T12:00:00.000Z" },
      {
        getToken: async () => "token",
        postExecutionLogRecord: async (_apiBase, _token, payload) => {
          writes.push(payload);
          return { id: `alice-${writes.length}` };
        }
      }
    );

    assert.equal(result.ok, true);
    assert.equal(result.packet.record.title, "According to Mark");
    assert.equal(writes.length, HISTORICAL_EVENTS.length);
    assert.equal(writes.every((payload) => payload.jm1_sourcerecordid === "according-to-mark"), true);
  });
});
