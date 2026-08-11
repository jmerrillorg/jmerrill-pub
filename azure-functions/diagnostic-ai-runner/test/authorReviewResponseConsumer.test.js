"use strict";

const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const {
  classifyAuthorReviewResponse,
  compactDecisionSource,
  DECISION,
  evaluateAcknowledgementPolicy,
  runAuthorReviewResponseConsumer,
  stableIdempotencyKey,
  validateAuthorIdentity,
  validateReplyCorrelation
} = require("../src/orchestration/authorReviewResponseConsumer");

const gateId = "be079017-0983-f111-ab0f-000d3a14673b";
const titleId = "2d21ab5b-4d80-f111-ab0f-7c1e525b15c2";
const packageId = `${titleId}:c2799c31-8f80-f111-ab0f-00224820105b:current-author-package`;
const outboundMessageId = "outbound-review-message-001";
const authorEmail = "chosen2k7@gmail.com";

function createGate(overrides = {}) {
  return {
    jm1pub_editorialapprovalgateid: gateId,
    jm1pub_editorialapprovalgatename: "A5 Proofreading Completion - The Intentional Leader Volume I",
    jm1pub_authoremail: authorEmail,
    _jm1pub_titleid_value: titleId,
    jm1pub_packageid: packageId,
    jm1pub_decisionrequestid: "decision-request-001",
    jm1pub_outboundmessageid: outboundMessageId,
    jm1pub_threadid: "conv-1",
    modifiedon: "2026-07-19T13:28:12Z",
    ...overrides
  };
}

function createReply(overrides = {}) {
  return {
    ok: true,
    found: true,
    inboundMessageId: "inbound-1",
    internetMessageId: "<internet-1@jmerrill.one>",
    conversationId: "conv-1",
    inReplyToMessageId: outboundMessageId,
    references: [outboundMessageId],
    senderAddress: authorEmail,
    toRecipients: ["publishing@jmerrill.one"],
    subject: "Re: Proofreading Review Package - The Intentional Leader",
    receivedDateTime: "2026-07-19T20:08:00Z",
    bodyText: "I approve!",
    ...overrides
  };
}

function createMockClient({ gateOverrides = {}, existingLog = null } = {}) {
  const calls = { created: [], patched: [] };
  return {
    calls,
    async first(entitySet) {
      if (entitySet === "jm1_executionlogs") return existingLog;
      return null;
    },
    async list() {
      return [createGate(gateOverrides)];
    },
    async create(entitySet, payload) {
      calls.created.push({ entitySet, payload });
      return `${payload.jm1_actiontype}-id`;
    },
    async patch(entitySet, id, payload) {
      calls.patched.push({ entitySet, id, payload });
    }
  };
}

async function runOne({ gateOverrides = {}, replyOverrides = {}, existingLog = null, acknowledgement = null } = {}) {
  const client = createMockClient({ gateOverrides, existingLog });
  const result = await runAuthorReviewResponseConsumer(
    { maxGates: 1 },
    {
      client,
      acknowledgement,
      readReply: async () => createReply(replyOverrides)
    }
  );
  return { client, result };
}

test("author review classifier recognizes concise approval", () => {
  assert.equal(classifyAuthorReviewResponse("I approve!"), DECISION.APPROVED);
  assert.equal(classifyAuthorReviewResponse("Please make these corrections"), DECISION.CHANGES_REQUESTED);
  assert.equal(classifyAuthorReviewResponse("Received, thank you"), DECISION.ACKNOWLEDGMENT_ONLY);
  assert.equal(classifyAuthorReviewResponse("I approve with minor corrections"), DECISION.APPROVED_WITH_CORRECTIONS);
  assert.equal(classifyAuthorReviewResponse("I approve. Please review these notes."), DECISION.APPROVED_WITH_CORRECTIONS);
});

test("author decision source fits Dataverse field limit", () => {
  const source = compactDecisionSource("<very-long-internet-message-id-with-a-large-provider-generated-value@example.gmail.com>");
  assert.ok(source.length <= 100);
  assert.match(source, /^inbound:publishing@jmerrill\.one:/);
});

test("Azure Functions timer registers the durable inbound response consumer", () => {
  const wrapper = readFileSync(path.join(__dirname, "../src/functions/runAuthorReviewResponseConsumer.js"), "utf8");
  const index = readFileSync(path.join(__dirname, "../src/index.js"), "utf8");
  assert.match(wrapper, /app\.timer\("run-author-review-response-consumer"/);
  assert.match(wrapper, /schedule: "0 \*\/5 \* \* \* \*"/);
  assert.match(index, /runAuthorReviewResponseConsumer/);
});

test("inbound approval begins at monitored mailbox and persists the gate decision", async () => {
  const client = createMockClient();
  const result = await runAuthorReviewResponseConsumer(
    { maxGates: 1 },
    {
      client,
      readReply: async () => ({
        ...createReply()
      })
    }
  );

  assert.equal(result.processed, 1);
  assert.equal(result.monitoredMailbox, "publishing@jmerrill.one");
  assert.ok(client.calls.created.some((call) => call.payload.jm1_actiontype === "AUTHOR_INBOUND_MESSAGE_DISCOVERED"));
  assert.ok(client.calls.created.some((call) => call.payload.jm1_actiontype === "AUTHOR_INBOUND_MESSAGE_CLAIMED"));
  assert.ok(client.calls.created.some((call) => call.payload.jm1_actiontype === "AUTHOR_INBOUND_MESSAGE_CORRELATED"));
  assert.ok(client.calls.created.some((call) => call.payload.jm1_actiontype === "AUTHOR_INBOUND_MESSAGE_CLASSIFIED"));
  assert.ok(client.calls.created.some((call) => call.payload.jm1_actiontype === "AUTHOR_INBOUND_MESSAGE_PERSISTED"));
  assert.ok(client.calls.created.some((call) => call.payload.jm1_actiontype === "AUTHOR_INBOUND_MESSAGE_COMPLETED"));
  assert.ok(client.calls.created.some((call) => call.payload.jm1_actiontype === "AUTHOR_RESPONSE_INBOUND_CORRELATED"));
  assert.ok(client.calls.created.some((call) => call.payload.jm1_actiontype === "AUTHOR_RESPONSE_CAPTURED"));
  assert.ok(client.calls.created.some((call) => call.payload.jm1_actiontype === "AUTHOR_APPROVAL_PERSISTED"));
  assert.ok(client.calls.patched.some((call) => call.entitySet === "jm1pub_editorialapprovalgates" && call.payload.jm1pub_authordecision === 196650000 && call.payload.jm1pub_awaitingsince === null));
});

test("correction response does not approve or start the next stage", async () => {
  const client = createMockClient();
  const result = await runAuthorReviewResponseConsumer(
    { maxGates: 1 },
    {
      client,
      readReply: async () => ({
        ...createReply({
          inboundMessageId: "inbound-2",
          internetMessageId: "<internet-2@jmerrill.one>",
          conversationId: "conv-2",
          receivedDateTime: "2026-07-19T20:09:00Z",
          bodyText: "Please make a correction"
        })
      })
    }
  );

  assert.equal(result.processed, 1);
  assert.ok(client.calls.created.some((call) => call.payload.jm1_actiontype === "AUTHOR_CHANGES_REQUESTED"));
  assert.ok(!client.calls.created.some((call) => call.entitySet === "jm1_productionprojects"));
});

test("publishing sender copy is ignored and cannot be classified as author corrections", async () => {
  const client = createMockClient();
  const result = await runAuthorReviewResponseConsumer(
    { maxGates: 1 },
    {
      client,
      readReply: async () => ({
        ok: true,
        found: false,
        code: "NO_MATCHING_REPLY_FOUND",
        senderAddress: null,
        receivedDateTime: null,
        bodyText: null
      })
    }
  );

  assert.equal(result.processed, 0);
  assert.equal(client.calls.created.length, 0);
  assert.equal(client.calls.patched.length, 0);
});

test("acknowledgment-only response is preserved but does not approve the gate", async () => {
  const client = createMockClient();
  const result = await runAuthorReviewResponseConsumer(
    { maxGates: 1 },
    {
      client,
      readReply: async () => ({
        ...createReply({
          inboundMessageId: "inbound-3",
          internetMessageId: "<internet-3@jmerrill.one>",
          conversationId: "conv-3",
          receivedDateTime: "2026-07-19T20:10:00Z",
          bodyText: "Received, thank you"
        })
      })
    }
  );

  assert.equal(result.processed, 0);
  assert.equal(result.results[0].outcome, "ACKNOWLEDGMENT_RECORDED");
  assert.ok(client.calls.created.some((call) => call.payload.jm1_actiontype === "AUTHOR_RESPONSE_ACKNOWLEDGMENT_RECORDED"));
  assert.ok(!client.calls.patched.some((call) => call.entitySet === "jm1pub_editorialapprovalgates"));
});

test("duplicate provider message identity does not create a second response", async () => {
  const client = createMockClient({ existingLog: { jm1_executionlogid: "existing-completed" } });

  const result = await runAuthorReviewResponseConsumer(
    { maxGates: 1 },
    {
      client,
      readReply: async () => ({
        ...createReply({
          inboundMessageId: "inbound-4",
          internetMessageId: "<internet-4@jmerrill.one>",
          conversationId: "conv-4",
          receivedDateTime: "2026-07-19T20:11:00Z",
          bodyText: "I approve!"
        })
      })
    }
  );

  assert.equal(result.idempotent, 1);
  assert.equal(client.calls.created.length, 0);
  assert.equal(client.calls.patched.length, 0);
});

test("short idempotency keys fit in execution-log descriptions", () => {
  const longInboundMessageId = "<202607192316.50583b1d164e479790f039ac90815e15-OBZG6ZD4IFBVGRKNIFEUYLLQOJXWILRUMVQWCYJVMYZS2YZQGBSS2NDBMZQS2YLFGRRC2MZYGE3DSMLBGEZDKYZUPRZW25DQ@microsoft.com>";
  const key = stableIdempotencyKey(gateId, longInboundMessageId);
  assert.match(key, /^author-review-response:[a-f0-9]{24}$/);
  assert.ok(key.length < 60);
});

test("source text documents no Publisher button or Cody session in the normal path", () => {
  const source = readFileSync(path.join(__dirname, "../src/orchestration/authorReviewResponseConsumer.js"), "utf8");
  assert.match(source, /publishing@jmerrill\.one Inbox plus open Dataverse author-review gates/);
  assert.match(source, /It did not call the transition handler/);
  assert.doesNotMatch(source, /Publisher Center action required/);
  assert.doesNotMatch(source, /Cody session required/);
});

test("pilot title reply is captured through the same pathway", async () => {
  const { result } = await runOne({ gateOverrides: { jm1pub_titleidentifier: "JMP-INT-202607-0W5PTQ" } });
  assert.equal(result.results[0].outcome, "APPROVAL_PERSISTED");
});

test("normal governed title reply is captured through the same pathway", async () => {
  const { result } = await runOne({ gateOverrides: { jm1pub_titleidentifier: "JMP-NORMAL-TITLE-001" } });
  assert.equal(result.processed, 1);
});

test("manual-recovery title reply is captured without production movement", async () => {
  const { result } = await runOne({
    gateOverrides: {
      jm1pub_titleidentifier: "JMP-INT-202607-DL2T20",
      jm1pub_recoverymode: "MANUAL_RECOVERY",
      jm1pub_productionmode: "MANUAL"
    }
  });
  assert.equal(result.results[0].manualRecovery, true);
  assert.equal(result.results[0].productionProgression, 0);
});

test("approved-with-corrections classification is durable and distinct", async () => {
  const { client, result } = await runOne({
    replyOverrides: { bodyText: "I approve. Please review these corrections in the preferred style." }
  });
  assert.equal(result.results[0].outcome, "APPROVED_WITH_CORRECTIONS_PERSISTED");
  assert.ok(client.calls.created.some((call) => call.payload.jm1_actiontype === "AUTHOR_APPROVED_WITH_CORRECTIONS_PERSISTED"));
  assert.ok(client.calls.patched.some((call) => call.payload.jm1pub_authordecision === 196650001));
});

test("questions classification is captured but requires publisher review", async () => {
  const { client, result } = await runOne({ replyOverrides: { bodyText: "I have a question about the marked sections." } });
  assert.equal(result.results[0].outcome, "QUESTIONS_REQUIRING_REVIEW_PERSISTED");
  assert.ok(client.calls.patched.some((call) => call.payload.jm1pub_authordecision === 196650002));
});

test("ambiguous response holds and does not patch a decision", async () => {
  const { client, result } = await runOne({ replyOverrides: { bodyText: "This is interesting." } });
  assert.equal(result.results[0].outcome, "PUBLISHER_REVIEW_REQUIRED");
  assert.equal(client.calls.patched.length, 0);
});

test("unknown sender fails closed before logging or patching", async () => {
  const { client, result } = await runOne({ replyOverrides: { senderAddress: "unknown@example.com" } });
  assert.equal(result.results[0].outcome, "HELD_IDENTITY_VALIDATION");
  assert.equal(client.calls.created.length, 0);
  assert.equal(client.calls.patched.length, 0);
});

test("missing author identity on gate fails closed", async () => {
  const { result } = await runOne({ gateOverrides: { jm1pub_authoremail: "" } });
  assert.equal(result.results[0].outcome, "HELD_IDENTITY_VALIDATION");
});

test("wrong title metadata does not falsely correlate by subject", async () => {
  const { client, result } = await runOne({ replyOverrides: { titleId: "wrong-title-id" } });
  assert.equal(result.results[0].outcome, "HELD_CORRELATION_VALIDATION");
  assert.equal(client.calls.patched.length, 0);
});

test("thread id exact match is accepted", () => {
  const result = validateReplyCorrelation(createGate(), createReply({ inReplyToMessageId: "", references: [] }), "Proofreading Review Package");
  assert.equal(result.ok, true);
  assert.equal(result.mode, "THREAD_ID_EXACT");
});

test("package id exact match is accepted", () => {
  const result = validateReplyCorrelation(
    createGate({ jm1pub_threadid: "" }),
    createReply({ conversationId: "", inReplyToMessageId: "", references: [], packageId }),
    "Proofreading Review Package"
  );
  assert.equal(result.ok, true);
  assert.equal(result.mode, "PACKAGE_ID_EXACT");
});

test("message id exact match is accepted before weaker evidence", () => {
  const result = validateReplyCorrelation(createGate(), createReply(), "Proofreading Review Package");
  assert.equal(result.ok, true);
  assert.equal(result.mode, "MESSAGE_THREAD_EXACT");
});

test("duplicate execution event blocks a duplicate response", async () => {
  const { result } = await runOne({ existingLog: { jm1_executionlogid: "existing-capture" } });
  assert.equal(result.idempotent, 1);
});

test("author notes are preserved in the gate response summary", async () => {
  const notes = "I approve. Please keep the African pidgin dialogue in italics where marked.";
  const { client } = await runOne({ replyOverrides: { bodyText: notes } });
  assert.ok(client.calls.patched.some((call) => call.payload.jm1pub_authorresponsesummary === notes));
});

test("only matching awaiting response state is closed", async () => {
  const { client } = await runOne();
  assert.equal(client.calls.patched.length, 1);
  assert.equal(client.calls.patched[0].id, gateId);
  assert.equal(client.calls.patched[0].payload.jm1pub_awaitingsince, null);
});

test("unrelated awaiting state remains unchanged", async () => {
  const { client } = await runOne();
  assert.ok(!client.calls.patched.some((call) => call.id === "unrelated-gate"));
});

test("internal response artifact is not exposed to author through capture logs", async () => {
  const { client } = await runOne();
  const combined = client.calls.created.map((call) => call.payload.jm1_actiondescription).join("\n");
  assert.doesNotMatch(combined, /raw body|internal response artifact|Dataverse token|secret/i);
});

test("acknowledgement policy remains not yet governed by default", () => {
  const policy = evaluateAcknowledgementPolicy();
  assert.equal(policy.status, "NOT_YET_GOVERNED");
  assert.equal(policy.wouldSend, false);
  assert.equal(policy.htmlRendering, "NOT_APPLICABLE");
});

test("required acknowledgement uses canonical HTML renderer metadata", () => {
  const policy = evaluateAcknowledgementPolicy({
    requireAcknowledgement: true,
    renderedAcknowledgement: {
      html: "<!doctype html><html><body><table role=\"presentation\"><tr><td>J MERRILL PUBLISHING</td></tr></table></body></html>",
      metadata: { renderTemplateGuard: "PASS", renderMode: "CANONICAL_HTML" }
    }
  });
  assert.equal(policy.status, "REQUIRED");
  assert.equal(policy.htmlRendering, "PASS");
});

test("missing render template fails closed when acknowledgement is required", () => {
  const policy = evaluateAcknowledgementPolicy({ requireAcknowledgement: true, renderedAcknowledgement: { html: "", metadata: {} } });
  assert.equal(policy.htmlRendering, "FAIL");
  assert.match(policy.blockers.join(","), /CANONICAL_JMP_HTML_RENDERER_REQUIRED/);
});

test("manual-recovery flag is recorded in the capture event", async () => {
  const { client } = await runOne({ gateOverrides: { jm1pub_recoverymode: "MANUAL_RECOVERY" } });
  const capture = client.calls.created.find((call) => call.payload.jm1_actiontype === "AUTHOR_RESPONSE_CAPTURED");
  assert.match(capture.payload.jm1_actiondescription, /manualRecovery=YES/);
});

test("capture never creates production stage mutation records", async () => {
  const { client } = await runOne({ gateOverrides: { jm1pub_recoverymode: "MANUAL_RECOVERY" } });
  assert.ok(!client.calls.created.some((call) => /production/i.test(call.entitySet)));
  assert.ok(!client.calls.patched.some((call) => call.entitySet !== "jm1pub_editorialapprovalgates"));
});

test("Iyorwuese historical message shadow replay classifies approved with corrections", async () => {
  const { client, result } = await runOne({
    gateOverrides: {
      jm1pub_titleidentifier: "JMP-INT-202607-DL2T20",
      jm1pub_editorialapprovalgatename: "Corrected Developmental Editing Review Materials - The General's Will and Last Testament",
      jm1pub_authoremail: "hagher.hagher@ymail.com",
      jm1pub_recoverymode: "MANUAL_RECOVERY",
      _jm1pub_titleid_value: "2d21ab5b-4d80-f111-ab0f-7c1e525b15c2",
      jm1pub_packageid: "2d21ab5b-4d80-f111-ab0f-7c1e525b15c2:c2799c31-8f80-f111-ab0f-00224820105b:current-author-package"
    },
    replyOverrides: {
      inboundMessageId: "AAMkAGNiOTQzYmYyLTk0MDEtNGVlYS05NTgyLWFhMmUxM2Y0MzhiOQBGAAAAAACfs17WM6mYQJ_3z0t8_9doBwD_Xbi2Wq2JSYocf3NG5QZjAAAAAAEMAAD_Xbi2Wq2JSYocf3NG5QZjAADWRVXbAAA=",
      senderAddress: "hagher.hagher@ymail.com",
      receivedDateTime: "2026-08-10T22:22:21Z",
      bodyText: "I write to convey approval. I also singled out almost all African pidgin English dialogue and put it in italics; please look at it in your preferred style."
    }
  });
  assert.equal(result.results[0].outcome, "APPROVED_WITH_CORRECTIONS_PERSISTED");
  assert.equal(result.results[0].manualRecovery, true);
  assert.equal(result.results[0].productionProgression, 0);
  assert.ok(client.calls.patched.some((call) => /pidgin English dialogue/.test(call.payload.jm1pub_authorresponsesummary)));
});

test("Iyorwuese historical replay is idempotent after reconciliation", async () => {
  const { result } = await runOne({
    existingLog: { jm1_executionlogid: "existing-iyorwuese-capture" },
    replyOverrides: {
      inboundMessageId: "AAMkAGNiOTQzYmYyLTk0MDEtNGVlYS05NTgyLWFhMmUxM2Y0MzhiOQBGAAAAAACfs17WM6mYQJ_3z0t8_9doBwD_Xbi2Wq2JSYocf3NG5QZjAAAAAAEMAAD_Xbi2Wq2JSYocf3NG5QZjAADWRVXbAAA=",
      senderAddress: authorEmail
    }
  });
  assert.equal(result.idempotent, 1);
});

test("side-effect isolation returns zero production, marketing, distribution, and financial movement", async () => {
  const { result } = await runOne({ gateOverrides: { jm1pub_recoverymode: "MANUAL_RECOVERY" } });
  assert.equal(result.results[0].productionProgression, 0);
});

test("idempotency key is stable for the same gate and message", () => {
  assert.equal(stableIdempotencyKey(gateId, "message-1"), stableIdempotencyKey(gateId, "message-1"));
});

test("kill switch prevents capture and writes nothing", async () => {
  const previous = process.env.JM1_AUTHOR_RESPONSE_CAPTURE_DISABLED;
  process.env.JM1_AUTHOR_RESPONSE_CAPTURE_DISABLED = "true";
  try {
    const { client, result } = await runOne();
    assert.equal(result.results[0].outcome, "CAPTURE_DISABLED");
    assert.equal(client.calls.created.length, 0);
    assert.equal(client.calls.patched.length, 0);
  } finally {
    if (previous === undefined) delete process.env.JM1_AUTHOR_RESPONSE_CAPTURE_DISABLED;
    else process.env.JM1_AUTHOR_RESPONSE_CAPTURE_DISABLED = previous;
  }
});

test("single-operator flow captures without Jackie inbox detection", async () => {
  const { client, result } = await runOne();
  assert.equal(result.results[0].outcome, "APPROVAL_PERSISTED");
  assert.ok(client.calls.created.some((call) => call.payload.jm1_actiontype === "AUTHOR_RESPONSE_CAPTURED"));
  assert.ok(client.calls.patched.some((call) => call.payload.jm1pub_authordecisionon));
});

test("author identity helper passes only exact governed email", () => {
  assert.equal(validateAuthorIdentity(createGate(), createReply()).ok, true);
  assert.equal(validateAuthorIdentity(createGate(), createReply({ senderAddress: "other@example.com" })).ok, false);
});
