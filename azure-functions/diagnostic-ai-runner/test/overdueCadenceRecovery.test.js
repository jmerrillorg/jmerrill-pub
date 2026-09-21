"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { createHash } = require("node:crypto");
const { RECOVERY_COHORT, isCanonicalPipelineItem, releaseProvenPreDeliveryReservations, repairCohortAuthority, roleForArtifact } = require("../src/editorial/overdueCadenceRecovery");

function sha(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

test("recognizes only the two required Developmental package roles", () => {
  assert.equal(roleForArtifact({ jm1pub_filename: "Book-Developmentally-Edited-Manuscript.docx" }), "editedManuscript");
  assert.equal(roleForArtifact({ jm1pub_editorialartifactname: "Developmental Review Instructions - Book" }), "reviewInstructions");
  assert.equal(roleForArtifact({ jm1pub_filename: "Package-Manifest.json" }), null);
});

test("uses the Graph parent path when an Office web URL is a Doc.aspx link", () => {
  assert.equal(isCanonicalPipelineItem({ parentReference: { path: "/drives/drive/root:/01_Pipeline_A-Z/07 - Developmental Editing/Book" } }, "https://sharepoint/_layouts/15/Doc.aspx?sourcedoc=id"), true);
  assert.equal(isCanonicalPipelineItem({ parentReference: { path: "/drives/drive/root:/01_Pre-Pipeline/00_Inquiry/Book" } }, "https://sharepoint/_layouts/15/Doc.aspx?sourcedoc=id"), false);
});

test("repairs exact cohort authority only after checksum and binding proof", async () => {
  const authority = RECOVERY_COHORT[0];
  const manuscript = Buffer.from("manuscript-bytes");
  const instructions = Buffer.from("review instructions");
  const patches = [];
  const client = {
    async list(entity, query) {
      if (entity === "jm1pub_titles") return [{ jm1pub_titleid: authority.titleId, jm1pub_titlename: authority.titleName, jm1pub_authorname: authority.authorName }];
      if (entity === "jm1pub_editorialstages") return [{ jm1pub_editorialstageid: authority.stageId, _jm1pub_titleid_value: authority.titleId, _jm1pub_contactid_value: authority.contactId }];
      if (entity === "contacts") return [{ contactid: authority.contactId, fullname: authority.authorName, emailaddress1: authority.recipient }];
      if (entity === "jm1pub_editorialapprovalgates") return [{ jm1pub_editorialapprovalgateid: authority.gateId, _jm1pub_titleid_value: authority.titleId, _jm1pub_editorialstageid_value: authority.stageId }];
      if (entity === "jm1pub_editorialartifacts") return [
        { jm1pub_editorialartifactid: "artifact-manuscript", jm1pub_editorialartifactname: "Developmentally Edited Manuscript", jm1pub_filename: "Edited.docx", jm1pub_sha256: sha(manuscript), jm1pub_repositorypath: "https://sharepoint/01_Pipeline_A-Z/07/file.docx", _jm1pub_titleid_value: authority.titleId, _jm1pub_editorialstageid_value: authority.stageId },
        { jm1pub_editorialartifactid: "artifact-instructions", jm1pub_editorialartifactname: "Developmental Review Instructions", jm1pub_filename: "Review.txt", jm1pub_sha256: sha(instructions), jm1pub_repositorypath: "https://sharepoint/01_Pipeline_A-Z/07/review.txt", _jm1pub_titleid_value: authority.titleId, _jm1pub_editorialstageid_value: authority.stageId }
      ];
      if (entity === "jm1_executionlogs" && query.$filter.includes("EDITORIAL_PACKAGE_HANDOFF_COMPLETED")) return [{ jm1_actiondescription: "QA READY_INTERNAL" }];
      if (entity === "jm1_executionlogs") return [];
      throw new Error(`unexpected entity ${entity}`);
    },
    async patch(entity, id, body) { patches.push({ entity, id, body }); },
    async create() { return "repair-log"; }
  };
  const result = await repairCohortAuthority(authority, client, {
    resolveSourceGraphItem: async (artifact) => ({
      driveId: "drive",
      item: { id: artifact.jm1pub_editorialartifactid, name: artifact.jm1pub_filename, webUrl: artifact.jm1pub_repositorypath },
      contentPath: artifact.jm1pub_editorialartifactid
    }),
    graphRequest: async (path) => path === "artifact-manuscript" ? manuscript : instructions
  });
  assert.equal(result.artifacts.length, 2);
  assert.equal(result.artifacts.every((item) => item.checksumParity === "PASS"), true);
  assert.equal(patches.filter((item) => item.entity === "jm1pub_editorialartifacts").length, 2);
  assert.equal(patches.some((item) => item.entity === "jm1pub_editorialstages" && item.body.jm1pub_intakereference === authority.intakeReference), true);
});

test("reconciles a SharePoint-persisted DOCX checksum only with exact item provenance", async () => {
  const authority = RECOVERY_COHORT[0];
  const persisted = Buffer.from("persisted-office-bytes");
  const patches = [];
  const artifact = {
    jm1pub_editorialartifactid: "artifact-manuscript",
    jm1pub_editorialartifactname: "Developmentally Edited Manuscript",
    jm1pub_filename: "Edited.docx",
    jm1pub_filesizebytes: persisted.length,
    jm1pub_sha256: sha(Buffer.from("pre-upload-office-bytes")),
    jm1pub_correlationid: "TARGETED-exact-run",
    jm1pub_repositorypath: "https://sharepoint/01_Pipeline_A-Z/07/Edited.docx",
    _jm1pub_titleid_value: authority.titleId,
    _jm1pub_editorialstageid_value: authority.stageId
  };
  const instructions = Buffer.from("review instructions");
  const client = {
    async list(entity, query) {
      if (entity === "jm1pub_titles") return [{ jm1pub_titleid: authority.titleId, jm1pub_titlename: authority.titleName, jm1pub_authorname: authority.authorName }];
      if (entity === "jm1pub_editorialstages") return [{ jm1pub_editorialstageid: authority.stageId, _jm1pub_titleid_value: authority.titleId, _jm1pub_contactid_value: authority.contactId }];
      if (entity === "contacts") return [{ contactid: authority.contactId, fullname: authority.authorName, emailaddress1: authority.recipient }];
      if (entity === "jm1pub_editorialapprovalgates") return [{ jm1pub_editorialapprovalgateid: authority.gateId, _jm1pub_titleid_value: authority.titleId, _jm1pub_editorialstageid_value: authority.stageId }];
      if (entity === "jm1pub_editorialartifacts") return [
        artifact,
        { jm1pub_editorialartifactid: "artifact-instructions", jm1pub_editorialartifactname: "Developmental Review Instructions", jm1pub_filename: "Review.txt", jm1pub_filesizebytes: instructions.length, jm1pub_sha256: sha(instructions), jm1pub_correlationid: "TARGETED-exact-run", jm1pub_repositorypath: "https://sharepoint/01_Pipeline_A-Z/07/Review.txt", _jm1pub_titleid_value: authority.titleId, _jm1pub_editorialstageid_value: authority.stageId }
      ];
      if (entity === "jm1_executionlogs" && query.$filter.includes("EDITORIAL_PACKAGE_HANDOFF_COMPLETED")) return [{ jm1_actiondescription: "QA READY_INTERNAL" }];
      if (entity === "jm1_executionlogs") return [];
      throw new Error(`unexpected entity ${entity}`);
    },
    async patch(entity, id, body) { patches.push({ entity, id, body }); },
    async create() { return "repair-log"; }
  };
  const result = await repairCohortAuthority(authority, client, {
    resolveSourceGraphItem: async (candidate) => ({
      driveId: "drive",
      item: { id: candidate.jm1pub_editorialartifactid, name: candidate.jm1pub_filename, size: candidate.jm1pub_filesizebytes, webUrl: candidate.jm1pub_repositorypath },
      contentPath: candidate.jm1pub_editorialartifactid
    }),
    graphRequest: async (path) => path === "artifact-manuscript" ? persisted : instructions
  });
  const manuscript = result.artifacts.find((item) => item.role === "editedManuscript");
  assert.equal(manuscript.checksumAuthority, "SHAREPOINT_PERSISTED_OFFICE_BYTES_RECONCILED");
  assert.equal(manuscript.checksum, sha(persisted));
  assert.equal(patches.some((item) => item.id === "artifact-manuscript" && item.body.jm1pub_sha256 === sha(persisted)), true);
});

test("releases only a reservation with exact deterministic pre-delivery denial proof", async () => {
  const authority = RECOVERY_COHORT[0];
  const created = [];
  const repaired = [{
    key: authority.key,
    title: authority.titleName,
    recipient: authority.recipient,
    stageId: authority.stageId,
    artifacts: [
      { role: "editedManuscript", checksum: "a".repeat(64) },
      { role: "reviewInstructions", checksum: "b".repeat(64) }
    ]
  }];
  const client = {
    async list(entity, query) {
      if (query.$filter.includes("AUTHOR_COMMUNICATION_INTENT_RESERVED")) {
        return [{ jm1_executionlogid: "reservation", jm1_actiontype: "AUTHOR_COMMUNICATION_INTENT_RESERVED", jm1_actiondescription: query.$filter.match(/communication:v1:[0-9a-f]+/)?.[0] || "" }];
      }
      if (query.$filter.includes("PACKAGE_CADENCE_RELEASE_SEND_BLOCKED")) {
        return [{ jm1_executionlogid: "denial", jm1_actiontype: "PACKAGE_CADENCE_RELEASE_SEND_BLOCKED" }];
      }
      return [];
    },
    async create(entity, body) { created.push({ entity, body }); return "failure"; }
  };

  const result = await releaseProvenPreDeliveryReservations(repaired, client);
  assert.equal(result.length, 1);
  assert.equal(result[0].denialLogId, "denial");
  assert.equal(created[0].body.jm1_actiontype, "AUTHOR_COMMUNICATION_INTENT_FAILED");
});
