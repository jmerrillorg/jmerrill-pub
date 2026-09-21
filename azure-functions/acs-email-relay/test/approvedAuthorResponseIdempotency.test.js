"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");

const { DELIVERY_STATE } = require("../src/state/messageLedger");
const {
  approvedAuthorLedgerInput,
  executeApprovedAuthorResponse
} = require("../src/state/approvedAuthorDelivery");

function approvedValue(overrides = {}) {
  return {
    messageType: "APPROVED_AUTHOR_RESPONSE",
    diagnosticId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    intakeReferenceCode: "JMP-INT-260918-NT",
    authorEmail: "jaylonnastevette@gmail.com",
    authorName: "Jaylonna Stevette",
    projectTitle: "Naughty Tales",
    subject: "Naughty Tales Developmental Editing",
    body: "Good day Jaylonna,\n\nPlease review the attached manuscript.\n\nJ Merrill Publishing",
    htmlBody: "<!doctype html><html><body>Good day Jaylonna. J Merrill Publishing</body></html>",
    templateName: "DEVELOPMENTAL_EDITORIAL_REVIEW_READY_V2",
    templateVersion: "2.0.0",
    templateMetadata: {
      htmlSha256: "a".repeat(64),
      textSha256: "b".repeat(64),
      rendererVersion: "1.0.0",
      enterpriseStandard: "JM1 Enterprise Communication Standard v1.0"
    },
    cc: ["publishing@jmerrill.one"],
    attachments: [{
      name: "Naughty Tales - Developmentally Edited Manuscript (Clean).docx",
      role: "editedManuscript",
      sha256: "097b042aeb30e9fde1e9381201049788cf6ba3fac1866fceb3f53298619d64fa",
      contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      contentInBase64: "UEs="
    }],
    artifactManifest: {
      titleId: "a05f72d0-c27a-f111-ab0f-6045bdd69738",
      stageId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      authorContactId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc"
    },
    ...overrides
  };
}

function memoryLedger() {
  let entity;
  return {
    async reserve(input) {
      if (entity) return { kind: "REPLAY", entity };
      entity = {
        jm1MessageId: "communication-record-1",
        deliveryState: DELIVERY_STATE.RESERVED,
        idempotencyKey: input.idempotencyKey
      };
      return { kind: "RESERVED", entity };
    },
    async recordAccepted(current, providerMessageId) {
      entity = {
        ...current,
        deliveryState: DELIVERY_STATE.ACCEPTED,
        providerMessageId,
        acceptedAt: "2026-09-18T09:00:13.000Z"
      };
      return entity;
    },
    async recordFailure(current, failureClass) {
      entity = { ...current, deliveryState: DELIVERY_STATE.FAILED, failureClass };
      return entity;
    }
  };
}

test("semantic key ignores caller-provided legacy idempotency namespaces", () => {
  const first = approvedAuthorLedgerInput(approvedValue({ idempotencyKey: "naughty-tales-dev-missing-component:old" }));
  const second = approvedAuthorLedgerInput(approvedValue({ idempotencyKey: "developmental-missing-component-recovery:new" }));
  assert.equal(first.idempotencyKey, second.idempotencyKey);
  assert.match(first.idempotencyKey, /^communication:v1:[a-f0-9]{64}$/);
});

test("relay atomically accepts the first effect and returns the original delivery on replay", async () => {
  const ledger = memoryLedger();
  let sends = 0;
  const deps = {
    ledger,
    buildMessage: (value) => value,
    sendMessage: async () => {
      sends += 1;
      return "acs-original-message";
    }
  };
  const first = await executeApprovedAuthorResponse(approvedValue(), deps);
  const replay = await executeApprovedAuthorResponse(approvedValue({ idempotencyKey: "different-caller-prefix" }), deps);
  assert.equal(first.status, "SENT");
  assert.equal(first.providerStatus, "Succeeded");
  assert.deepEqual(first.observability, {
    acsDelivery: "PASS",
    publishingMailboxCopy: "PASS",
    semanticAttachmentParity: "PASS",
    evidenceClass: "ACS_SUCCEEDED_SINGLE_ENVELOPE_WITH_CANONICAL_CC"
  });
  assert.equal(replay.status, "ALREADY_DELIVERED");
  assert.equal(replay.communicationRecordId, "communication-record-1");
  assert.equal(replay.sentAt, "2026-09-18T09:00:13.000Z");
  assert.equal(replay.providerMessageId, "acs-original-message");
  assert.equal(replay.recipient, "jaylonnastevette@gmail.com");
  assert.deepEqual(replay.artifactChecksums, ["097b042aeb30e9fde1e9381201049788cf6ba3fac1866fceb3f53298619d64fa"]);
  assert.equal(sends, 1);
});

test("provider acceptance without a Succeeded delivery receipt fails observability closed", async () => {
  await assert.rejects(
    executeApprovedAuthorResponse(approvedValue(), {
      ledger: memoryLedger(),
      buildMessage: (value) => value,
      sendMessage: async () => ({ providerMessageId: "acs-pending", providerStatus: "Running" })
    }),
    (error) => error.safeCode === "ACS_DELIVERY_UNPROVEN"
  );
});

test("an unresolved reservation fails closed and never invokes ACS", async () => {
  const ledger = memoryLedger();
  await ledger.reserve(approvedAuthorLedgerInput(approvedValue()));
  let sends = 0;
  const result = await executeApprovedAuthorResponse(approvedValue(), {
    ledger,
    buildMessage: (value) => value,
    sendMessage: async () => { sends += 1; }
  });
  assert.equal(result.status, "AMBIGUOUS_SEND_STATE");
  assert.equal(sends, 0);
});

test("a transport exception preserves the reservation and makes replay ambiguous", async () => {
  const ledger = memoryLedger();
  await assert.rejects(
    executeApprovedAuthorResponse(approvedValue(), {
      ledger,
      buildMessage: (value) => value,
      sendMessage: async () => { throw new Error("connection ended before acceptance readback"); }
    }),
    /connection ended/
  );
  let replaySends = 0;
  const replay = await executeApprovedAuthorResponse(approvedValue(), {
    ledger,
    buildMessage: (value) => value,
    sendMessage: async () => { replaySends += 1; }
  });
  assert.equal(replay.status, "AMBIGUOUS_SEND_STATE");
  assert.equal(replaySends, 0);
});
