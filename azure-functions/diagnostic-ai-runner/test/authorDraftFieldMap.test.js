"use strict";

const { describe, test } = require("node:test");
const assert = require("node:assert/strict");
const {
  TABLE_LOGICAL_NAME,
  ENTITY_SET,
  ROW_IDENTITY,
  AUTHOR_DRAFT_FIELD_MAP,
  AUTHOR_DRAFT_SAFE_VALUES,
  AUTHOR_DRAFT_UNMAPPED_UNSAFE_FIELDS
} = require("../src/author/authorDraftFieldMap");
const {
  TEMPLATE_NAME,
  INTERNAL_VISIBILITY_MAILBOX,
  DRAFT_STATUS,
  DRAFT_APPROVAL_STATUS
} = require("../src/author/authorResponseDraftBuilder");

describe("authorDraftFieldMap — Dataverse target", () => {
  test("uses the approved Editorial Diagnostic table, entity set, and row identity", () => {
    assert.equal(TABLE_LOGICAL_NAME, "jm1pub_editorialdiagnostic");
    assert.equal(ENTITY_SET, "jm1pub_editorialdiagnostics");
    assert.equal(ROW_IDENTITY, "jm1pub_editorialdiagnosticid");
  });
});

describe("authorDraftFieldMap — required draft fields", () => {
  test("maps the required author draft fields", () => {
    assert.equal(AUTHOR_DRAFT_FIELD_MAP.draftSubject, "jm1_authordraftsubject");
    assert.equal(AUTHOR_DRAFT_FIELD_MAP.draftBody, "jm1_authordraftbody");
    assert.equal(AUTHOR_DRAFT_FIELD_MAP.draftTemplate, "jm1_authordrafttemplate");
    assert.equal(AUTHOR_DRAFT_FIELD_MAP.draftSendStatus, "jm1_authordraftsendstatus");
    assert.equal(AUTHOR_DRAFT_FIELD_MAP.draftApprovalStatus, "jm1_authordraftapprovalstatus");
    assert.equal(AUTHOR_DRAFT_FIELD_MAP.internalVisibilityMailbox, "jm1_authorvisibilitymailbox");
    assert.equal(AUTHOR_DRAFT_FIELD_MAP.futureSendRequiresInternalCopy, "jm1_authorfuturesendrequiresinternalcopy");
    assert.equal(AUTHOR_DRAFT_FIELD_MAP.futureSendRequiresDataverseLog, "jm1_authorfuturesendrequiresdataverselog");
    assert.equal(AUTHOR_DRAFT_FIELD_MAP.draftPreparedAt, "jm1_authordraftpreparedon");
    assert.equal(AUTHOR_DRAFT_FIELD_MAP.draftPreparedBy, "jm1_authordraftpreparedby");
    assert.equal(AUTHOR_DRAFT_FIELD_MAP.draftApprovedBy, "jm1_authordraftapprovedby");
    assert.equal(AUTHOR_DRAFT_FIELD_MAP.draftApprovedOn, "jm1_authordraftapprovedon");
    assert.equal(AUTHOR_DRAFT_FIELD_MAP.draftApprovalNotes, "jm1_authordraftapprovalnotes");
  });

  test("confirms only safe draft workflow values", () => {
    assert.equal(AUTHOR_DRAFT_SAFE_VALUES.templateName, TEMPLATE_NAME);
    assert.equal(AUTHOR_DRAFT_SAFE_VALUES.templateName, "INITIAL_DIAGNOSTIC_REVIEW_NEXT_STEP");
    assert.equal(AUTHOR_DRAFT_SAFE_VALUES.sendStatus, DRAFT_STATUS);
    assert.equal(AUTHOR_DRAFT_SAFE_VALUES.sendStatus, "DRAFT_ONLY");
    assert.equal(AUTHOR_DRAFT_SAFE_VALUES.approvalStatus, DRAFT_APPROVAL_STATUS);
    assert.equal(AUTHOR_DRAFT_SAFE_VALUES.approvalStatus, "PENDING_HUMAN_APPROVAL");
    assert.equal(AUTHOR_DRAFT_SAFE_VALUES.internalVisibilityMailbox, INTERNAL_VISIBILITY_MAILBOX);
    assert.equal(AUTHOR_DRAFT_SAFE_VALUES.internalVisibilityMailbox, "publishing@jmerrill.one");
    assert.equal(AUTHOR_DRAFT_SAFE_VALUES.futureSendRequiresInternalCopy, true);
    assert.equal(AUTHOR_DRAFT_SAFE_VALUES.futureSendRequiresDataverseLog, true);
  });
});

describe("authorDraftFieldMap — unsafe field exclusions", () => {
  test("does not map send, Opportunity, Flow D, manuscript, prompt, raw model, or secret fields", () => {
    const mappedKeys = Object.keys(AUTHOR_DRAFT_FIELD_MAP).join(" ").toLowerCase();
    const mappedValues = Object.values(AUTHOR_DRAFT_FIELD_MAP).join(" ").toLowerCase();
    const mapped = `${mappedKeys} ${mappedValues}`;

    for (const unsafeNeedle of [
      "manuscript",
      "extracted",
      "prompt",
      "rawmodel",
      "raw_model",
      "sendnow",
      "send_now",
      "sentat",
      "sent_at",
      "messagesent",
      "messageid",
      "operationid",
      "opportunity",
      "flowd",
      "secret",
      "token",
      "header",
      "apikey",
      "api_key"
    ]) {
      assert.equal(mapped.includes(unsafeNeedle), false, `Unsafe field mapped: ${unsafeNeedle}`);
    }
  });

  test("records the prohibited unmapped unsafe field families", () => {
    for (const field of [
      "manuscriptText",
      "extractedManuscriptContent",
      "promptBody",
      "rawModelResponse",
      "sendNow",
      "sentAt",
      "mailProviderMessageId",
      "opportunityPayload",
      "flowDTrigger",
      "headers",
      "tokens",
      "apiKey",
      "secret"
    ]) {
      assert.ok(AUTHOR_DRAFT_UNMAPPED_UNSAFE_FIELDS.includes(field), `Missing unsafe field: ${field}`);
    }
  });
});
