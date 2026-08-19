"use strict";

const { describe, test } = require("node:test");
const assert = require("node:assert/strict");
const {
  buildAuthorResponseSendLogRecord
} = require("../src/author/authorResponseSendPersister");
const { AUTHOR_RESPONSE_SEND_STATUS } = require("../src/author/authorResponseSendApprovalModel");
const { INTERNAL_VISIBILITY_MAILBOX } = require("../src/author/authorResponseDraftBuilder");

const DIAGNOSTIC_ID = "e71ea2ef-3b7c-f111-ab0f-6045bdd69435";
const TITLE_ID = "a69b9dfa-bb7b-f111-ab0f-7c1e525b15c2";

function baseApproval(overrides = {}) {
  return {
    diagnosticId: DIAGNOSTIC_ID,
    intakeReferenceCode: "JMP-INT-202607-LQPHEK",
    internalVisibilityMailbox: INTERNAL_VISIBILITY_MAILBOX,
    authorEmail: "author@example.com",
    draftSubject: "Subject",
    templateName: "AUTHOR_REVIEW_PACKAGE_NOTIFICATION_V1",
    templateVersion: "1.0.0",
    approvedBy: "Test Approver",
    approvedOn: "2026-08-18T21:00:00Z",
    ...overrides
  };
}

function deliveryResult() {
  return {
    deliveryStatus: AUTHOR_RESPONSE_SEND_STATUS.SENT,
    internalVisibilityStatus: AUTHOR_RESPONSE_SEND_STATUS.INTERNAL_VISIBILITY_SATISFIED,
    providerName: "acs-email",
    providerMessageId: null
  };
}

describe("authorResponseSendPersister — source entity", () => {
  test("defaults to jm1pub_editorialdiagnostic + diagnosticId when no explicit source given (unchanged prior behavior)", () => {
    const result = buildAuthorResponseSendLogRecord({
      sendApproval: baseApproval(),
      deliveryResult: deliveryResult()
    });
    assert.equal(result.ok, true);
    assert.equal(result.persistenceRecord.executionLogPayload.jm1_sourceentity, "jm1pub_editorialdiagnostic");
    assert.equal(result.persistenceRecord.executionLogPayload.jm1_sourcerecordid, DIAGNOSTIC_ID);
  });

  test("accepts an explicit allowed sourceEntity/sourceRecordId (e.g. jm1pub_title for pre-Stage0 titles)", () => {
    const result = buildAuthorResponseSendLogRecord({
      sendApproval: baseApproval({ sourceEntity: "jm1pub_title", sourceRecordId: TITLE_ID }),
      deliveryResult: deliveryResult()
    });
    assert.equal(result.ok, true);
    assert.equal(result.persistenceRecord.executionLogPayload.jm1_sourceentity, "jm1pub_title");
    assert.equal(result.persistenceRecord.executionLogPayload.jm1_sourcerecordid, TITLE_ID);
  });

  test("rejects a sourceEntity not on the allowlist", () => {
    const result = buildAuthorResponseSendLogRecord({
      sendApproval: baseApproval({ sourceEntity: "made_up_entity", sourceRecordId: TITLE_ID }),
      deliveryResult: deliveryResult()
    });
    assert.equal(result.ok, false);
    assert.equal(result.reason, "SOURCE_ENTITY_NOT_ALLOWED");
  });

  test("rejects a malformed sourceRecordId even with an allowed sourceEntity", () => {
    const result = buildAuthorResponseSendLogRecord({
      sendApproval: baseApproval({ sourceEntity: "jm1pub_title", sourceRecordId: "not-a-guid" }),
      deliveryResult: deliveryResult()
    });
    assert.equal(result.ok, false);
    assert.equal(result.reason, "SOURCE_RECORD_ID_INVALID");
  });

  test("still rejects when diagnosticId itself is invalid, regardless of explicit source fields", () => {
    const result = buildAuthorResponseSendLogRecord({
      sendApproval: baseApproval({ diagnosticId: "bad", sourceEntity: "jm1pub_title", sourceRecordId: TITLE_ID }),
      deliveryResult: deliveryResult()
    });
    assert.equal(result.ok, false);
    assert.equal(result.reason, "DIAGNOSTIC_ID_INVALID");
  });
});
