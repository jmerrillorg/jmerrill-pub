"use strict";

const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const test = require("node:test");
const {
  AUTHORITY,
  acknowledgmentCopy,
  executeIyorwueseMapContinuity
} = require("../../src/mail/inbound/iyorwueseMapContinuity");

function fixture({ existingArtifact = null, intentStatus = "RESERVED" } = {}) {
  const bytes = Buffer.from("preserved map bytes");
  const attachment = {
    attachmentEventId: AUTHORITY.attachmentEventId,
    messageEventId: AUTHORITY.messageEventId,
    graphAttachmentId: "graph-attachment",
    originalFilename: AUTHORITY.filename,
    sha256: AUTHORITY.sha256,
    titleId: AUTHORITY.titleId,
    placementStatus: "PLACED"
  };
  const updates = [];
  const creates = [];
  const graphCalls = [];
  const store = {
    async findMessageByEventId() {
      return {
        inboundMessageEventId: AUTHORITY.messageEventId,
        authorId: AUTHORITY.authorId,
        titleId: AUTHORITY.titleId,
        engagementId: AUTHORITY.engagementId,
        correlationEvidence: "FOUNDER_CURRENT_WORK_AUTHORITY",
        receivedAt: "2026-09-19T20:53:15Z"
      };
    },
    async findAttachmentByEventId() { return attachment; },
    async readSourceAttachment() { return bytes; },
    async updateAttachment(value) { updates.push(value); }
  };
  const client = {
    async list(entitySet, query) {
      if (entitySet === "jm1pub_titles") return [{ jm1pub_titleid: AUTHORITY.titleId, jm1pub_authorname: AUTHORITY.authorName }];
      if (entitySet === "jm1pub_editorialstages") return [{ jm1pub_editorialstageid: AUTHORITY.developmentalStageId, _jm1pub_titleid_value: AUTHORITY.titleId, _jm1pub_contactid_value: AUTHORITY.authorId }];
      if (entitySet === "contacts") return [{ contactid: AUTHORITY.authorId, fullname: AUTHORITY.authorName, emailaddress1: AUTHORITY.recipient }];
      if (entitySet === "jm1pub_editorialartifacts" && query.$filter.includes("a40b070b")) return [{ jm1pub_editorialartifactid: "anchor" }];
      if (entitySet === "jm1pub_editorialartifacts") return existingArtifact ? [existingArtifact] : [];
      return [];
    },
    async create(entitySet, payload) {
      creates.push({ entitySet, payload });
      return entitySet === "jm1pub_editorialartifacts" ? "map-artifact" : "execution-log";
    }
  };
  async function request(path, options = {}) {
    graphCalls.push({ path, options });
    if (path.includes("items/manuscript?")) return { id: "manuscript", parentReference: { id: "title-root" } };
    if (path.includes("title-root:/Production%20Assets?")) throw Object.assign(new Error("missing"), { status: 404, safeCode: "GRAPH_ITEM_NOT_FOUND" });
    if (path.endsWith("title-root/children")) return { id: "production-assets", webUrl: "https://sharepoint/Production%20Assets" };
    if (path.includes("production-assets:/IMG-20250322-WA0009.jpg?")) throw Object.assign(new Error("missing"), { status: 404, safeCode: "GRAPH_ITEM_NOT_FOUND" });
    if (path.includes("production-assets:/IMG-20250322-WA0009.jpg:/content")) return { id: "map-item", name: AUTHORITY.filename, size: bytes.length, webUrl: "https://sharepoint/Production%20Assets/IMG-20250322-WA0009.jpg" };
    if (path === "existing/content") return bytes;
    throw new Error(`Unexpected graph path: ${path}`);
  }
  const resolveSourceGraphItem = async (artifact) => artifact.jm1pub_editorialartifactid === "anchor"
    ? { driveId: "drive", item: { parentReference: { id: "manuscript" } }, contentPath: "anchor/content" }
    : { driveId: "drive", item: { id: "map-item", name: AUTHORITY.filename, size: bytes.length, webUrl: existingArtifact.jm1pub_repositorypath }, contentPath: "existing/content" };
  const sends = [];
  return {
    deps: {
      store,
      client,
      graphRequest: request,
      resolveSourceGraphItem,
      sha256: () => AUTHORITY.sha256,
      reserveCommunicationIntent: async () => ({ status: intentStatus, semanticIdempotencyKey: "communication:test", communicationRecordId: "intent-record", sentAt: "2026-09-21T12:00:00Z" }),
      markCommunicationSent: async () => ({ sentRecordId: "sent-record" }),
      markCommunicationFailed: async () => ({ failureRecordId: "failed-record" }),
      sendConfiguredAuthorResponse: async (input) => {
        sends.push(input);
        return { ok: true, authorEmailStatus: "AUTHOR_RESPONSE_SENT", providerMessageId: "provider-message" };
      }
    },
    updates,
    creates,
    graphCalls,
    sends
  };
}

test("materializes the preserved map, binds canonical tracking, and sends one ACS acknowledgment", async () => {
  const fx = fixture();
  const result = await executeIyorwueseMapContinuity({ executeAuthorizedContinuation: true }, fx.deps);
  assert.equal(result.titleBinding, "PASS");
  assert.equal(result.sofaliaMapBound, "YES");
  assert.equal(result.checksumParity, "PASS");
  assert.equal(result.acknowledgmentSent, "YES");
  assert.equal(result.titleWaitState, "WAITING_ON_AUTHOR_EXACT_VERSION_REVIEW");
  assert.equal(fx.sends.length, 1);
  assert.equal(fx.sends[0].input.sendApproval.diagnosticId, AUTHORITY.developmentalStageId);
  assert.equal(fx.sends[0].input.sendApproval.authorEmail, AUTHORITY.recipient);
  assert.deepEqual(fx.sends[0].input.cc, ["publishing@jmerrill.one"]);
  const artifact = fx.creates.find((entry) => entry.entitySet === "jm1pub_editorialartifacts").payload;
  assert.equal(artifact.jm1pub_sha256, AUTHORITY.sha256);
  assert.match(artifact.jm1pub_notes, /SOFALIA_MAP_BLOCKING=NO/);
  assert.equal(fx.updates[0].assetRole, AUTHORITY.assetRole);
});

test("replay reuses the checksum-bound artifact and does not resend the acknowledgment", async () => {
  const existingArtifact = {
    jm1pub_editorialartifactid: "existing-map-artifact",
    jm1pub_filename: AUTHORITY.filename,
    jm1pub_sha256: AUTHORITY.sha256,
    jm1pub_repositorypath: "https://sharepoint/Production%20Assets/IMG-20250322-WA0009.jpg"
  };
  const fx = fixture({ existingArtifact, intentStatus: "ALREADY_DELIVERED" });
  const result = await executeIyorwueseMapContinuity({ executeAuthorizedContinuation: true }, fx.deps);
  assert.equal(result.idempotentAssetBinding, true);
  assert.equal(result.acknowledgmentSent, "YES");
  assert.equal(result.duplicateAcknowledgment, "NO");
  assert.equal(fx.sends.length, 0);
  assert.equal(fx.creates.some((entry) => entry.entitySet === "jm1pub_editorialartifacts"), false);
});

test("acknowledgment copy is conversational and preserves the manuscript-review gate", () => {
  const copy = acknowledgmentCopy();
  assert.match(copy.body, /Thank you for sending/);
  assert.match(copy.body, /current manuscript review remains unchanged/);
  assert.doesNotMatch(copy.body, /What's attached|What we need from you|What happens next/);
});

test("production entrypoint registers the bounded continuation route", () => {
  const entrypoint = readFileSync("src/index.js", "utf8");
  const route = readFileSync("src/functions/runIyorwueseMapContinuity.js", "utf8");
  assert.match(entrypoint, /runIyorwueseMapContinuity/);
  assert.match(route, /publishing\/inbound\/iyorwuese-map-continuity/);
  assert.match(route, /JM1_DIAGNOSTIC_RUNNER_KEY/);
});
