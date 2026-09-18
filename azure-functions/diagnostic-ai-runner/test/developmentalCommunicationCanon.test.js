"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const {
  DEVELOPMENTAL_REVIEW_PACKAGE_TEMPLATE,
  materializeAttachments,
  sendCadenceAuthorReviewPackage
} = require("../src/editorial/editorialCadenceAuthorPackageSender");

const titleId = "fd577d2b-01a0-f111-b8dc-000d3a14673b";
const stageId = "0f587d2b-01a0-f111-b8dc-000d3a14673b";
const gateId = "0cf8a1d7-04a0-f111-b8dc-00224820105b";
const contactId = "5bb796dc-cd95-f111-8076-7c1e525b15c2";
const packageId = `pkg-${stageId}-developmental-editing-v2`;

function artifact(role, overrides = {}) {
  const manuscript = role === "editedManuscript";
  return {
    jm1pub_editorialartifactid: manuscript ? "13393cd5-04a0-f111-b8dc-000d3a14673b" : "review-artifact-indomitable",
    jm1pub_editorialartifactname: manuscript
      ? "Developmentally Edited Manuscript - Developmental Editing - Indomitable"
      : "Developmental Review Instructions - Developmental Editing - Indomitable",
    jm1pub_filename: manuscript ? "Indomitable - Edited Manuscript.docx" : "Indomitable - Editorial Review.pdf",
    jm1pub_versionlabel: "v2",
    jm1pub_artifactstatus: 196650002,
    jm1pub_visibility: 196650000,
    "jm1pub_visibility@OData.Community.Display.V1.FormattedValue": "Author Facing",
    jm1pub_repositorydriveid: "drive",
    jm1pub_repositoryitemid: manuscript ? "manuscript" : "review",
    jm1pub_iscurrentapproved: true,
    _jm1pub_titleid_value: titleId,
    _jm1pub_editorialstageid_value: stageId,
    ...overrides
  };
}

function input(artifacts) {
  return {
    titleId,
    titleName: "Indomitable",
    authorName: "Quanisha Dockery",
    title: { jm1pub_titleid: titleId },
    stage: {
      jm1pub_editorialstageid: stageId,
      _jm1pub_titleid_value: titleId,
      _jm1pub_contactid_value: contactId,
      jm1pub_intakereference: "JMP-INT-202608-0AOS7L",
      jm1pub_publishingintakereference: "JMP-INT-202608-0AOS7L",
      jm1pub_internaloperationalsummary: "QA READY_INTERNAL"
    },
    gate: {
      jm1pub_editorialapprovalgateid: gateId,
      _jm1pub_titleid_value: titleId,
      _jm1pub_editorialstageid_value: stageId
    },
    contact: { contactid: contactId, emailaddress1: "quanisha@example.com" },
    schedule: { stageCode: "DEVELOPMENTAL_EDITING" },
    packageInfo: { packageId },
    completionLog: { jm1_actiondescription: "QA READY_INTERNAL" },
    artifacts
  };
}

const downloadArtifact = async (row) => row.jm1pub_repositoryitemid === "manuscript"
  ? Buffer.from("PK word/document.xml governed manuscript")
  : Buffer.from("%PDF-1.7 governed author review");

test("exact Indomitable review-only replay fails closed and makes no relay call", async () => {
  let relayCalls = 0;
  await assert.rejects(
    sendCadenceAuthorReviewPackage(input([artifact("reviewInstructions")]), {
      downloadArtifact,
      sendRelay: async () => { relayCalls += 1; }
    }),
    /REQUIRED_ATTACHMENT_MISSING:editedManuscript/
  );
  assert.equal(relayCalls, 0);
});

test("system renderer creates conversational Indomitable copy from a complete governed package", async () => {
  let payload;
  const result = await sendCadenceAuthorReviewPackage(input([
    artifact("editedManuscript"),
    artifact("reviewInstructions")
  ]), {
    downloadArtifact,
    sendRelay: async (value) => {
      payload = value;
      return { status: "DRY_RUN_ACCEPTED" };
    }
  });

  assert.equal(result.status, "DRY_RUN_ACCEPTED");
  assert.equal(payload.templateName, DEVELOPMENTAL_REVIEW_PACKAGE_TEMPLATE);
  assert.equal(payload.artifactManifest.devPackageComplete, true);
  assert.equal(payload.artifactManifest.versionParity, "PASS");
  assert.deepEqual(payload.attachments.map((item) => item.role).sort(), ["editedManuscript", "reviewInstructions"]);
  assert.doesNotMatch(`${payload.body}\n${payload.htmlBody}`, /Why you are receiving this|What has been completed|What's attached|What we need from you|How to respond|What happens next/i);
  assert.match(payload.body, /We've attached .*Edited Manuscript.* together with .*Editorial Review/i);
  assert.match(payload.body, /^Good day Quanisha,/);
  assert.equal(payload.replyTo, "publishing@jmerrill.one");
  assert.deepEqual(payload.cc, ["publishing@jmerrill.one"]);
});

test("Developmental package rejects wrong title binding and version drift", async () => {
  await assert.rejects(
    materializeAttachments({
      stageCode: "DEVELOPMENTAL_EDITING",
      titleName: "Indomitable",
      titleId,
      stageId,
      packageInfo: { packageId },
      artifacts: [artifact("editedManuscript", { _jm1pub_titleid_value: "wrong-title" }), artifact("reviewInstructions")]
    }, { downloadArtifact }),
    /ATTACHMENT_TITLE_BINDING_MISMATCH:editedManuscript/
  );

  await assert.rejects(
    materializeAttachments({
      stageCode: "DEVELOPMENTAL_EDITING",
      titleName: "Indomitable",
      titleId,
      stageId,
      packageInfo: { packageId },
      artifacts: [artifact("editedManuscript", { jm1pub_versionlabel: "v1" }), artifact("reviewInstructions")]
    }, { downloadArtifact }),
    /ATTACHMENT_VERSION_PARITY_FAILED:editedManuscript/
  );
});
