"use strict";

const { describe, test } = require("node:test");
const assert = require("node:assert/strict");
const {
  TABLE_LOGICAL_NAME,
  ENTITY_SET,
  ROW_IDENTITY,
  AUTHOR_DRAFT_FIELD_MAP,
  AUTHOR_DRAFT_SAFE_VALUES
} = require("../src/author/authorDraftFieldMap");
const {
  SCHEMA_STATUS,
  AUTHOR_DRAFT_SCHEMA_FIELDS,
  AUTHOR_DRAFT_SCHEMA_MANIFEST
} = require("../src/author/authorDraftSchemaManifest");

describe("authorDraftSchemaManifest — target and status", () => {
  test("documents schema as confirmed with internal draft-only live writes enabled", () => {
    assert.equal(SCHEMA_STATUS, "CONFIRMED_CREATED_PUBLISHED");
    assert.equal(AUTHOR_DRAFT_SCHEMA_MANIFEST.status, SCHEMA_STATUS);
    assert.equal(AUTHOR_DRAFT_SCHEMA_MANIFEST.tableLogicalName, TABLE_LOGICAL_NAME);
    assert.equal(AUTHOR_DRAFT_SCHEMA_MANIFEST.entitySet, ENTITY_SET);
    assert.equal(AUTHOR_DRAFT_SCHEMA_MANIFEST.rowIdentity, ROW_IDENTITY);
    assert.equal(AUTHOR_DRAFT_SCHEMA_MANIFEST.tableLogicalName, "jm1pub_editorialdiagnostic");
    assert.equal(AUTHOR_DRAFT_SCHEMA_MANIFEST.entitySet, "jm1pub_editorialdiagnostics");
    assert.equal(AUTHOR_DRAFT_SCHEMA_MANIFEST.rowIdentity, "jm1pub_editorialdiagnosticid");
    assert.equal(AUTHOR_DRAFT_SCHEMA_MANIFEST.liveWritesEnabled, true);
    assert.equal(AUTHOR_DRAFT_SCHEMA_MANIFEST.liveWritesScope, "INTERNAL_DRAFT_ONLY_EXPLICIT_CALL");
    assert.equal(AUTHOR_DRAFT_SCHEMA_MANIFEST.solutionUniqueName, "JM1_Publishing");
  });
});

describe("authorDraftSchemaManifest — field coverage", () => {
  test("includes exactly the thirteen author draft logical names from the field map", () => {
    const manifestNames = AUTHOR_DRAFT_SCHEMA_FIELDS.map((field) => field.logicalName).sort();
    const mapNames = Object.values(AUTHOR_DRAFT_FIELD_MAP).sort();

    assert.equal(AUTHOR_DRAFT_SCHEMA_FIELDS.length, 13);
    assert.deepEqual(manifestNames, mapNames);
  });

  test("documents expected field types and confirmed-created status", () => {
    const byPayloadField = Object.fromEntries(AUTHOR_DRAFT_SCHEMA_FIELDS.map((field) => [field.payloadField, field]));

    assert.equal(byPayloadField.draftSubject.expectedType, "Text");
    assert.equal(byPayloadField.draftBody.expectedType, "Multiline Text");
    assert.equal(byPayloadField.templateName.expectedType, "Text or Choice");
    assert.equal(byPayloadField.sendStatus.expectedType, "Choice or Text");
    assert.equal(byPayloadField.approvalStatus.expectedType, "Choice or Text");
    assert.equal(byPayloadField.internalVisibilityMailbox.expectedType, "Text");
    assert.equal(byPayloadField.futureSendRequiresInternalCopy.expectedType, "Yes/No");
    assert.equal(byPayloadField.futureSendRequiresDataverseLog.expectedType, "Yes/No");
    assert.equal(byPayloadField.preparedAt.expectedType, "Date/Time");
    assert.equal(byPayloadField.preparedBy.expectedType, "Text or Lookup/User reference");
    assert.equal(byPayloadField.approvedBy.expectedType, "Text or Lookup/User reference");
    assert.equal(byPayloadField.approvedOn.expectedType, "Date/Time");
    assert.equal(byPayloadField.approvalNotes.expectedType, "Multiline Text");

    for (const field of AUTHOR_DRAFT_SCHEMA_FIELDS) {
      assert.equal(field.confirmedCreated, true, `${field.logicalName} must be confirmed created`);
    }
  });

  test("represents all required safe workflow values", () => {
    assert.deepEqual(AUTHOR_DRAFT_SCHEMA_MANIFEST.safeValues, AUTHOR_DRAFT_SAFE_VALUES);
    assert.equal(AUTHOR_DRAFT_SCHEMA_MANIFEST.safeValues.templateName, "INITIAL_DIAGNOSTIC_REVIEW_NEXT_STEP");
    assert.equal(AUTHOR_DRAFT_SCHEMA_MANIFEST.safeValues.sendStatus, "DRAFT_ONLY");
    assert.equal(AUTHOR_DRAFT_SCHEMA_MANIFEST.safeValues.approvalStatus, "PENDING_HUMAN_APPROVAL");
    assert.equal(AUTHOR_DRAFT_SCHEMA_MANIFEST.safeValues.internalVisibilityMailbox, "publishing@jmerrill.one");
    assert.equal(AUTHOR_DRAFT_SCHEMA_MANIFEST.safeValues.futureSendRequiresInternalCopy, true);
    assert.equal(AUTHOR_DRAFT_SCHEMA_MANIFEST.safeValues.futureSendRequiresDataverseLog, true);
  });
});

describe("authorDraftSchemaManifest — safety exclusions", () => {
  test("does not authorize send, Opportunity, Flow D, diagnostics, or gate changes", () => {
    assert.equal(AUTHOR_DRAFT_SCHEMA_MANIFEST.sendsEmail, false);
    assert.equal(AUTHOR_DRAFT_SCHEMA_MANIFEST.createsOpportunity, false);
    assert.equal(AUTHOR_DRAFT_SCHEMA_MANIFEST.activatesFlowD, false);
    assert.equal(AUTHOR_DRAFT_SCHEMA_MANIFEST.runsDiagnostics, false);
    assert.equal(AUTHOR_DRAFT_SCHEMA_MANIFEST.opensExecutionGate, false);
  });

  test("does not include unsafe schema fields", () => {
    const serialized = JSON.stringify(AUTHOR_DRAFT_SCHEMA_FIELDS).toLowerCase();

    for (const unsafeNeedle of [
      "manuscripttext",
      "manuscriptcontent",
      "extractedcontent",
      "promptbody",
      "rawmodel",
      "sendnow",
      "sentat",
      "delivery",
      "messageid",
      "opportunity",
      "flowd",
      "secret",
      "token",
      "header",
      "apikey",
      "api_key"
    ]) {
      assert.equal(serialized.includes(unsafeNeedle), false, `Unsafe schema field present: ${unsafeNeedle}`);
    }
  });
});
