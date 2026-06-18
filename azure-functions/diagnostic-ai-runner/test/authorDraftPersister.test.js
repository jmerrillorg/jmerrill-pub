"use strict";

const { describe, test } = require("node:test");
const assert = require("node:assert/strict");
const {
  persistAuthorResponseDraft,
  buildAuthorDraftRecord,
  buildDataverseUpdatePayload,
  validateAuthorDraftPayload,
  TABLE_LOGICAL_NAME,
  ENTITY_SET,
  ROW_IDENTITY,
  AUTHOR_DRAFT_FIELD_MAP,
  PERSISTENCE_ERROR_CODE,
  WRITE_ERROR_CODE
} = require("../src/author/authorDraftPersister");
const {
  buildAuthorResponseDraft,
  TEMPLATE_NAME,
  INTERNAL_VISIBILITY_MAILBOX,
  DRAFT_STATUS,
  DRAFT_APPROVAL_STATUS
} = require("../src/author/authorResponseDraftBuilder");
const { REVIEW_DECISION } = require("../src/review/humanReviewDecisionModel");
const { REVIEW_STATUS } = require("../src/review/diagnosticReviewBuilder");

const baseDraftInput = Object.freeze({
  diagnosticId: "64e387e0-7e6a-f111-a826-00224820105b",
  intakeReferenceCode: "JMP-INT-202606-UFYG60",
  reviewDecision: REVIEW_DECISION.APPROVE_FOR_AUTHOR_DRAFT,
  reviewPayload: {
    diagnosticOutputSummary: "The project shows a clear nonfiction concept with a reflective teaching voice.",
    diagnosticRiskFlags: "Positioning clarity; Editorial structure",
    confidence: 0.79,
    requiresHumanReview: true,
    reviewStatus: REVIEW_STATUS.APPROVED_FOR_AUTHOR_DRAFT
  },
  author: {
    name: "Jackie",
    email: "jackie@example.com"
  },
  project: {
    title: "TEST - Stage 0 Submission"
  },
  metadata: {
    correlationId: "INT-PUB-005-DRAFT-PERSISTENCE-TEST",
    executionId: "EXEC-DRAFT-PERSISTENCE-TEST"
  }
});

function makeDraft(overrides = {}) {
  const built = buildAuthorResponseDraft(baseDraftInput);
  assert.equal(built.ok, true);
  return {
    ...built.draft,
    ...overrides
  };
}

function makeClient(assertInput = () => {}) {
  return {
    calls: [],
    async persistAuthorDraft(input) {
      this.calls.push(input);
      assertInput(input);
      return { dataverseRecordId: input.diagnosticId };
    }
  };
}

function assertInvalid(result, reason) {
  assert.equal(result.persisted, false);
  assert.equal(result.code, PERSISTENCE_ERROR_CODE);
  assert.equal(result.reason, reason);
}

describe("authorDraftPersister — valid persistence", () => {
  test("valid draft payload persists successfully with mock Dataverse client", async () => {
    const client = makeClient((input) => {
      assert.equal(input.tableLogicalName, TABLE_LOGICAL_NAME);
      assert.equal(input.entitySet, ENTITY_SET);
      assert.equal(input.rowIdentity, ROW_IDENTITY);
      assert.equal(input.diagnosticId, baseDraftInput.diagnosticId);
      assert.equal(input.intakeReferenceCode, baseDraftInput.intakeReferenceCode);
      assert.deepEqual(input.fieldMap, AUTHOR_DRAFT_FIELD_MAP);
      assert.equal(input.draftRecord.templateName, TEMPLATE_NAME);
      assert.equal(input.draftRecord.sendStatus, DRAFT_STATUS);
      assert.equal(input.draftRecord.approvalStatus, DRAFT_APPROVAL_STATUS);
      assert.equal(input.draftRecord.internalVisibilityMailbox, INTERNAL_VISIBILITY_MAILBOX);
      assert.equal(input.draftRecord.futureSendRequiresInternalCopy, true);
      assert.equal(input.draftRecord.futureSendRequiresDataverseLog, true);
      assert.equal(input.dataverseUpdatePayload[AUTHOR_DRAFT_FIELD_MAP.draftSendStatus], DRAFT_STATUS);
      assert.equal(input.dataverseUpdatePayload[AUTHOR_DRAFT_FIELD_MAP.draftApprovalStatus], DRAFT_APPROVAL_STATUS);
      assert.equal(input.dataverseUpdatePayload[AUTHOR_DRAFT_FIELD_MAP.internalVisibilityMailbox], INTERNAL_VISIBILITY_MAILBOX);
      assert.equal(input.dataverseUpdatePayload[AUTHOR_DRAFT_FIELD_MAP.futureSendRequiresInternalCopy], true);
      assert.equal(input.dataverseUpdatePayload[AUTHOR_DRAFT_FIELD_MAP.futureSendRequiresDataverseLog], true);
      assert.equal(input.dataverseUpdatePayload[AUTHOR_DRAFT_FIELD_MAP.draftApprovedBy], null);
      assert.equal(input.dataverseUpdatePayload[AUTHOR_DRAFT_FIELD_MAP.draftApprovedOn], null);
    });

    const result = await persistAuthorResponseDraft({
      dataverseClient: client,
      draftPayload: makeDraft()
    });

    assert.equal(result.persisted, true);
    assert.equal(result.diagnosticId, baseDraftInput.diagnosticId);
    assert.equal(result.intakeReferenceCode, baseDraftInput.intakeReferenceCode);
    assert.equal(result.templateName, TEMPLATE_NAME);
    assert.equal(result.sendStatus, DRAFT_STATUS);
    assert.equal(result.approvalStatus, DRAFT_APPROVAL_STATUS);
    assert.equal(result.internalVisibilityMailbox, INTERNAL_VISIBILITY_MAILBOX);
    assert.equal(result.dataverseRecordId, baseDraftInput.diagnosticId);
    assert.equal(client.calls.length, 1);
  });

  test("draft subject, body, identifiers, template, and visibility rules are prepared", () => {
    const record = buildAuthorDraftRecord(makeDraft());

    assert.equal(record.diagnosticId, baseDraftInput.diagnosticId);
    assert.equal(record.intakeReferenceCode, baseDraftInput.intakeReferenceCode);
    assert.equal(record.authorEmail, "jackie@example.com");
    assert.equal(record.draftSubject, "Next step for your J Merrill Publishing submission");
    assert.ok(record.draftBody.includes("J Merrill Publishing"));
    assert.equal(record.templateName, TEMPLATE_NAME);
    assert.equal(record.sendStatus, DRAFT_STATUS);
    assert.equal(record.approvalStatus, DRAFT_APPROVAL_STATUS);
    assert.equal(record.internalVisibilityMailbox, INTERNAL_VISIBILITY_MAILBOX);
    assert.equal(record.futureSendRequiresInternalCopy, true);
    assert.equal(record.futureSendRequiresDataverseLog, true);
  });

  test("Dataverse update payload includes only confirmed safe author draft fields", () => {
    const record = buildAuthorDraftRecord(makeDraft());
    const payload = buildDataverseUpdatePayload(record);

    assert.deepEqual(Object.keys(payload).sort(), Object.values(AUTHOR_DRAFT_FIELD_MAP).sort());
    assert.equal(payload[AUTHOR_DRAFT_FIELD_MAP.draftSubject], "Next step for your J Merrill Publishing submission");
    assert.ok(payload[AUTHOR_DRAFT_FIELD_MAP.draftBody].includes("J Merrill Publishing"));
    assert.equal(payload[AUTHOR_DRAFT_FIELD_MAP.draftTemplate], TEMPLATE_NAME);
    assert.equal(payload[AUTHOR_DRAFT_FIELD_MAP.draftSendStatus], DRAFT_STATUS);
    assert.equal(payload[AUTHOR_DRAFT_FIELD_MAP.draftApprovalStatus], DRAFT_APPROVAL_STATUS);
    assert.equal(payload[AUTHOR_DRAFT_FIELD_MAP.internalVisibilityMailbox], INTERNAL_VISIBILITY_MAILBOX);
    assert.equal(payload[AUTHOR_DRAFT_FIELD_MAP.futureSendRequiresInternalCopy], true);
    assert.equal(payload[AUTHOR_DRAFT_FIELD_MAP.futureSendRequiresDataverseLog], true);
    assert.equal(payload[AUTHOR_DRAFT_FIELD_MAP.draftPreparedBy], "system/internal");
    assert.equal(payload[AUTHOR_DRAFT_FIELD_MAP.draftApprovedBy], null);
    assert.equal(payload[AUTHOR_DRAFT_FIELD_MAP.draftApprovedOn], null);
    assert.equal(payload[AUTHOR_DRAFT_FIELD_MAP.draftApprovalNotes], "Pending human approval. Draft only; no author-facing email sent.");
  });
});

describe("authorDraftPersister — fail closed", () => {
  test("missing payload fails", async () => {
    const result = await persistAuthorResponseDraft({ dataverseClient: makeClient() });
    assertInvalid(result, "MISSING_DRAFT_PAYLOAD");
  });

  test("missing diagnosticId fails", async () => {
    const result = await persistAuthorResponseDraft({ dataverseClient: makeClient(), draftPayload: makeDraft({ diagnosticId: "" }) });
    assertInvalid(result, "DIAGNOSTIC_ID_INVALID");
  });

  test("missing intakeReferenceCode fails", async () => {
    const result = await persistAuthorResponseDraft({ dataverseClient: makeClient(), draftPayload: makeDraft({ intakeReferenceCode: "" }) });
    assertInvalid(result, "INTAKE_REFERENCE_CODE_INVALID");
  });

  test("missing authorEmail fails", async () => {
    const result = await persistAuthorResponseDraft({ dataverseClient: makeClient(), draftPayload: makeDraft({ authorEmail: "" }) });
    assertInvalid(result, "AUTHOR_EMAIL_MISSING");
  });

  test("missing draftSubject fails", async () => {
    const result = await persistAuthorResponseDraft({ dataverseClient: makeClient(), draftPayload: makeDraft({ draftSubject: "" }) });
    assertInvalid(result, "DRAFT_SUBJECT_MISSING");
  });

  test("missing draftBody fails", async () => {
    const result = await persistAuthorResponseDraft({ dataverseClient: makeClient(), draftPayload: makeDraft({ draftBody: "" }) });
    assertInvalid(result, "DRAFT_BODY_MISSING");
  });

  test("wrong templateName fails", async () => {
    const result = await persistAuthorResponseDraft({ dataverseClient: makeClient(), draftPayload: makeDraft({ draftTemplate: "OTHER_TEMPLATE" }) });
    assertInvalid(result, "TEMPLATE_NAME_INVALID");
  });

  test("wrong sendStatus fails", async () => {
    const result = await persistAuthorResponseDraft({ dataverseClient: makeClient(), draftPayload: makeDraft({ sendStatus: "SEND_NOW" }) });
    assertInvalid(result, "SEND_STATUS_NOT_DRAFT_ONLY");
  });

  test("wrong approvalStatus fails", async () => {
    const result = await persistAuthorResponseDraft({ dataverseClient: makeClient(), draftPayload: makeDraft({ approvalStatus: "APPROVED_TO_SEND" }) });
    assertInvalid(result, "APPROVAL_STATUS_NOT_PENDING_HUMAN_APPROVAL");
  });

  test("wrong internal visibility mailbox fails", async () => {
    const result = await persistAuthorResponseDraft({
      dataverseClient: makeClient(),
      draftPayload: makeDraft({ internalVisibilityMailbox: "publishing@jmerrill.pub" })
    });
    assertInvalid(result, "INTERNAL_VISIBILITY_MAILBOX_INVALID");
  });

  test("missing future copy/mirror requirement fails", async () => {
    const draft = makeDraft();
    draft.visibilityRule = { ...draft.visibilityRule, futureSendMustCopyOrMirror: false };
    const result = await persistAuthorResponseDraft({ dataverseClient: makeClient(), draftPayload: draft });
    assertInvalid(result, "FUTURE_INTERNAL_COPY_REQUIRED");
  });

  test("missing future Dataverse send-log requirement fails", async () => {
    const draft = makeDraft();
    draft.visibilityRule = { ...draft.visibilityRule, futureSendEventMustBeLoggedInDataverse: false };
    const result = await persistAuthorResponseDraft({ dataverseClient: makeClient(), draftPayload: draft });
    assertInvalid(result, "FUTURE_DATAVERSE_SEND_LOG_REQUIRED");
  });

  const unsafeCases = [
    ["manuscript text", { manuscriptText: "DO NOT RETURN" }],
    ["prompt body", { promptBody: "DO NOT RETURN" }],
    ["raw model response", { rawModelResponse: "DO NOT RETURN" }],
    ["send-now field", { sendNow: true }],
    ["sentAt field", { sentAt: "2026-06-18T12:00:00.000Z" }],
    ["emailSent field", { emailSent: true }],
    ["Opportunity field", { opportunityPayload: "DO NOT RETURN" }],
    ["Flow D trigger field", { flowDTrigger: true }]
  ];

  for (const [label, unsafe] of unsafeCases) {
    test(`unsafe ${label} fails`, async () => {
      const result = await persistAuthorResponseDraft({
        dataverseClient: makeClient(),
        draftPayload: makeDraft(unsafe)
      });

      assertInvalid(result, "UNSAFE_FIELD_PRESENT");
      assert.equal(JSON.stringify(result).includes("DO NOT RETURN"), false);
    });
  }

  test("missing Dataverse client fails", async () => {
    const result = await persistAuthorResponseDraft({ draftPayload: makeDraft() });
    assertInvalid(result, "DATAVERSE_CLIENT_INVALID");
  });

  test("Dataverse write rejection fails safely", async () => {
    const result = await persistAuthorResponseDraft({
      dataverseClient: {
        async persistAuthorDraft() {
          throw new Error("boom");
        }
      },
      draftPayload: makeDraft()
    });

    assert.equal(result.persisted, false);
    assert.equal(result.code, WRITE_ERROR_CODE);
    assert.equal(result.reason, "DATAVERSE_WRITE_FAILED");
  });
});

describe("authorDraftPersister — safety", () => {
  test("error results do not include draft body, manuscript text, prompt body, or raw model output", async () => {
    const result = await persistAuthorResponseDraft({
      dataverseClient: makeClient(),
      draftPayload: makeDraft({
        draftBody: "AUTHOR FACING DRAFT BODY",
        manuscriptText: "SECRET MANUSCRIPT TEXT",
        promptBody: "SECRET PROMPT BODY",
        rawModelOutput: "SECRET RAW OUTPUT"
      })
    });

    const serialized = JSON.stringify(result);
    assert.equal(serialized.includes("AUTHOR FACING DRAFT BODY"), false);
    assert.equal(serialized.includes("SECRET MANUSCRIPT TEXT"), false);
    assert.equal(serialized.includes("SECRET PROMPT BODY"), false);
    assert.equal(serialized.includes("SECRET RAW OUTPUT"), false);
  });

  test("module exports no mail API, Opportunity, Flow D, diagnostic run, or production activation path", () => {
    const persister = require("../src/author/authorDraftPersister");
    const exportedNames = Object.keys(persister).join(" ").toLowerCase();

    assert.equal(exportedNames.includes("gmail"), false);
    assert.equal(exportedNames.includes("outlook"), false);
    assert.equal(exportedNames.includes("acs"), false);
    assert.equal(exportedNames.includes("sendgrid"), false);
    assert.equal(exportedNames.includes("opportunity"), false);
    assert.equal(exportedNames.includes("flowd"), false);
    assert.equal(exportedNames.includes("run"), false);
    assert.equal(exportedNames.includes("activation"), false);
  });
});
