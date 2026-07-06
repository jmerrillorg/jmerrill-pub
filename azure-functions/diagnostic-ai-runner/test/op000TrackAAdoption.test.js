"use strict";

const assert = require("node:assert/strict");
const { describe, it, beforeEach, afterEach } = require("node:test");

const {
  OP000_ADOPTION_GATE_NAME,
  TRACK_A_PILOT,
  HISTORICAL_EVENTS,
  isAuthorizedTrackAPilot,
  classifyTrackAImprint,
  buildTrackAAdoptionPacket,
  buildExecutionLogPayload,
  runTrackAAdoption
} = require("../src/adoption/op000TrackAAdoption");

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

describe("OP-000 Track A adoption", () => {
  const priorGate = process.env[OP000_ADOPTION_GATE_NAME];
  const priorApiBase = process.env.DATAVERSE_WEB_API_BASE_URL;
  const priorResourceUrl = process.env.DATAVERSE_RESOURCE_URL;

  beforeEach(() => {
    delete process.env[OP000_ADOPTION_GATE_NAME];
    process.env.DATAVERSE_WEB_API_BASE_URL = "https://example.crm.dynamics.com/api/data/v9.2/";
    process.env.DATAVERSE_RESOURCE_URL = "https://example.crm.dynamics.com";
  });

  afterEach(() => {
    if (priorGate == null) delete process.env[OP000_ADOPTION_GATE_NAME];
    else process.env[OP000_ADOPTION_GATE_NAME] = priorGate;

    if (priorApiBase == null) delete process.env.DATAVERSE_WEB_API_BASE_URL;
    else process.env.DATAVERSE_WEB_API_BASE_URL = priorApiBase;

    if (priorResourceUrl == null) delete process.env.DATAVERSE_RESOURCE_URL;
    else process.env.DATAVERSE_RESOURCE_URL = priorResourceUrl;
  });

  it("authorizes only the Establishing Glory Track A pilot record", () => {
    assert.equal(isAuthorizedTrackAPilot(TRACK_A_PILOT), true);

    assert.equal(
      isAuthorizedTrackAPilot({
        ...TRACK_A_PILOT,
        opportunityId: "00000000-0000-0000-0000-000000000000"
      }),
      false
    );

    assert.equal(
      isAuthorizedTrackAPilot({
        ...TRACK_A_PILOT,
        title: "Establishing Glory Volume 1"
      }),
      false
    );
  });

  it("classifies imprint without auto-assigning JM Signature", () => {
    const imprint = classifyTrackAImprint(TRACK_A_PILOT);

    assert.equal(imprint.imprint, "JM Works");
    assert.equal(imprint.lockStatus, "Locked");
    assert.equal(imprint.jmSignatureCandidate, false);
    assert.ok(imprint.confidence >= 0.8);
  });

  it("builds a truthful adoption packet with no live side effects", () => {
    const packet = buildTrackAAdoptionPacket({ completedAt: "2026-07-05T12:00:00.000Z" });

    assert.equal(packet.track, "Track A - Active Pipeline Adoption");
    assert.equal(packet.record.title, "Establishing Glory: The Library");
    assert.equal(packet.record.intakeReferenceCode, "JMP-INT-202606-UFYG60");
    assert.equal(packet.relationship.state, "Active Author");
    assert.equal(packet.relationship.workspaceMode, "Active Author Workspace");
    assert.equal(packet.liveActions.createsContact, false);
    assert.equal(packet.liveActions.createsLead, false);
    assert.equal(packet.liveActions.createsOpportunity, false);
    assert.equal(packet.liveActions.createsContract, false);
    assert.equal(packet.liveActions.createsPayment, false);
    assert.equal(packet.liveActions.movesWorkspace, false);
    assert.equal(packet.liveActions.sendsEmail, false);
    assert.equal(packet.liveActions.startsProduction, false);
    assert.equal(packet.liveActions.startsDistribution, false);
    assert.equal(packet.executionHistory.length, HISTORICAL_EVENTS.length);
  });

  it("does not imply historical work happened today", () => {
    const packet = buildTrackAAdoptionPacket({ completedAt: "2026-07-05T12:00:00.000Z" });

    for (const event of packet.executionHistory) {
      assert.equal(event.historicalCertification, true);
      assert.equal(event.source, "Legacy JMP + INT-PUB-005 commissioning evidence");
      assert.equal(event.certifiedBy, "Jackie Smith Jr.");
      assert.doesNotMatch(event.summary, /created today|completed today|performed today/i);
    }
  });

  it("builds safe execution-log payloads only", () => {
    const packet = buildTrackAAdoptionPacket({ completedAt: "2026-07-05T12:00:00.000Z" });
    const payload = buildExecutionLogPayload(packet.executionHistory[0], packet, packet.certifiedAt);
    const keys = Object.keys(payload).sort();

    assert.deepEqual(keys, [...REQUIRED_LOG_FIELDS].sort());
    assert.equal(payload.jm1_actiontype, "OP000_ADOPTION_STARTED");
    assert.equal(payload.jm1_sourcerecordid, TRACK_A_PILOT.diagnosticId);
    assert.doesNotMatch(JSON.stringify(payload), /requestpayload|responsepayload|prompt|manuscript text|secret|token|header/i);
  });

  it("fails closed when the adoption gate is not open", async () => {
    const result = await runTrackAAdoption(TRACK_A_PILOT, {
      getToken: async () => "token",
      postExecutionLogRecord: async () => ({ id: "should-not-write" })
    });

    assert.equal(result.ok, false);
    assert.equal(result.reason, "GATE_CLOSED");
    assert.equal(result.packet.record.title, TRACK_A_PILOT.title);
  });

  it("writes exactly one execution-log row per prepared event when gated", async () => {
    process.env[OP000_ADOPTION_GATE_NAME] = "true";

    const writes = [];
    const result = await runTrackAAdoption(
      { ...TRACK_A_PILOT, completedAt: "2026-07-05T12:00:00.000Z" },
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
    assert.equal(result.code, "OP000_TRACK_A_ADOPTION_CERTIFIED");
    assert.equal(writes.length, HISTORICAL_EVENTS.length);
    assert.deepEqual(
      writes.map((payload) => payload.jm1_actiontype),
      HISTORICAL_EVENTS.map(([eventType]) => eventType)
    );
    assert.equal(result.executionLogs.every((log) => log.created), true);
  });
});
