"use strict";

const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const test = require("node:test");
const { createEditorialProductionRepository } = require("../src/editorial/editorialProductionRepository");

const titleId = "daf8180f-85a3-f111-b8de-000d3a14673b";
const stageId = "ae3c9d5e-67b5-f111-aaab-000d3a10aa9c";
const manuscriptId = "7372744e-85a3-f111-b8de-6045bdd69678";
const rulingsId = "988442aa-f0bc-f111-aaaf-6045bdd69678";

function fixture() {
  const bytes = new Map([
    [manuscriptId, Buffer.from("governed manuscript bytes")],
    [rulingsId, Buffer.from("governed author rulings")]
  ]);
  const row = (id, status, approved) => ({
    jm1pub_editorialartifactid: id, jm1pub_artifactstatus: status,
    jm1pub_iscurrentapproved: approved, jm1pub_versionlabel: "v1.0",
    jm1pub_sha256: crypto.createHash("sha256").update(bytes.get(id)).digest("hex"),
    jm1pub_repositorydriveid: "drive", jm1pub_repositoryitemid: id,
    jm1pub_repositorypath: `https://sharepoint.example/01_Pipeline_A-Z/Whole/${id}`,
    _jm1pub_titleid_value: titleId, _jm1pub_editorialstageid_value: stageId
  });
  const rows = new Map([
    [manuscriptId, row(manuscriptId, 196650003, true)],
    [rulingsId, row(rulingsId, 196650001, false)]
  ]);
  const calls = [];
  const client = { list: async (set, query) => {
    calls.push({ set, query });
    const id = /jm1pub_editorialartifactid eq ([0-9a-f-]+)/i.exec(query.$filter)?.[1];
    return rows.has(id) ? [rows.get(id)] : [];
  } };
  const repository = createEditorialProductionRepository({ titleId, stageId, shadowOnly: true }, {
    client, downloadArtifact: async (artifact) => bytes.get(artifact.jm1pub_editorialartifactid)
  });
  return { repository, rows, bytes, calls };
}

test("reads an exact approved manuscript and a review-ready title authority from registered bytes", async () => {
  const { repository, calls } = fixture();
  const manuscript = await repository.readSourceArtifact(manuscriptId);
  assert.equal(manuscript.titleId, titleId);
  assert.equal(manuscript.currentApproved, true);
  assert.equal("bytes" in manuscript, false);
  assert.equal((await repository.downloadSourceArtifact(manuscript)).toString(), "governed manuscript bytes");
  const rulings = await repository.readAuthoritySource(rulingsId);
  assert.equal(rulings.reviewReady, true);
  assert.equal(rulings.approved, false);
  assert.equal(rulings.scope, "TITLE");
  assert.equal(rulings.content, "governed author rulings");
  assert.ok(calls.every((call) => call.set === "jm1pub_editorialartifacts" && call.query.$top === "2"));
});

test("denies missing, cross-title, changed, unapproved, and noncanonical source records", async () => {
  const { repository, rows, bytes } = fixture();
  await assert.rejects(repository.readSourceArtifact(rulingsId), /CONTROLLING_SOURCE_NOT_APPROVED/);
  rows.get(manuscriptId)._jm1pub_titleid_value = "6bd7e606-cb8d-4aab-a07b-0463536b9869";
  await assert.rejects(repository.readSourceArtifact(manuscriptId), /CONTROLLING_SOURCE_NOT_APPROVED/);
  rows.get(manuscriptId)._jm1pub_titleid_value = titleId;
  bytes.set(manuscriptId, Buffer.from("changed"));
  await assert.rejects(repository.readSourceArtifact(manuscriptId), /CHECKSUM_MISMATCH/);
  rows.get(rulingsId).jm1pub_repositorypath = "https://sharepoint.example/07_Archive/rulings.md";
  await assert.rejects(repository.readAuthoritySource(rulingsId), /PATH_NONCANONICAL/);
});

test("review-ready authority is denied outside explicit shadow mode", async () => {
  const { rows, bytes } = fixture();
  const client = { list: async (_set, query) => {
    const id = /jm1pub_editorialartifactid eq ([0-9a-f-]+)/i.exec(query.$filter)?.[1];
    return rows.has(id) ? [rows.get(id)] : [];
  } };
  const repository = createEditorialProductionRepository({ titleId, stageId }, {
    client, downloadArtifact: async (artifact) => bytes.get(artifact.jm1pub_editorialartifactid)
  });
  await assert.rejects(repository.readAuthoritySource(rulingsId), /AUTHORITY_NOT_APPROVED/);
});
