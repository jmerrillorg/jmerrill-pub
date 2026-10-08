"use strict";

const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const test = require("node:test");
const { readExistingTitleAuthorities, readExistingGlobalStyleGuide } = require("../src/editorial/productionTitleAuthorityReader");

const titleId = "daf8180f-85a3-f111-b8de-000d3a14673b";
const stageId = "ae3c9d5e-67b5-f111-aaab-000d3a10aa9c";
const definitions = [
  ["style", "Whole - Project Style Sheet v1.0", 196650007],
  ["voice", "Whole - Voice Profile v1.0", 196650018],
  ["rulings", "Whole - Author Revision Rulings v1.0", 196650013]
];

function fixture() {
  const bytes = new Map();
  const rows = definitions.map(([id, name, type]) => {
    const content = Buffer.from(`# ${name}\nExisting governed content.\n`);
    bytes.set(id, content);
    return {
      jm1pub_editorialartifactid: id,
      jm1pub_editorialartifactname: name,
      jm1pub_artifacttype: type,
      jm1pub_artifactstatus: 196650001,
      jm1pub_iscurrentapproved: false,
      jm1pub_versionlabel: "v1.0-shadow-authority-review",
      jm1pub_sha256: crypto.createHash("sha256").update(content).digest("hex"),
      jm1pub_repositorydriveid: "governed-drive",
      jm1pub_repositoryitemid: id,
      jm1pub_repositorypath: `https://sharepoint.example/JM1-PUB/01_Pipeline_A-Z/07%20-%20Developmental%20Editing/Whole/${id}.md`,
      _jm1pub_titleid_value: titleId,
      _jm1pub_editorialstageid_value: stageId
    };
  });
  const calls = [];
  const deps = {
    client: { list: async (set, query) => { calls.push({ set, query }); return rows; } },
    downloadArtifact: async (row) => bytes.get(row.jm1pub_repositoryitemid)
  };
  return { rows, bytes, deps, calls };
}

test("reuses existing title sources by governed artifact identity, without creating records", async () => {
  const { deps, calls } = fixture();
  const result = await readExistingTitleAuthorities({ titleId, stageId, shadowOnly: true }, deps);
  assert.equal(result.titleStyleSheet.id, "style");
  assert.equal(result.voiceProfile.id, "voice");
  assert.equal(result.titleRulings.id, "rulings");
  assert.equal(result.voiceProfile.approved, false);
  assert.equal(result.voiceProfile.reviewReady, true);
  assert.equal(result.voiceProfile.sourceSystem, "SHAREPOINT");
  assert.match(calls[0].query.$filter, /_jm1pub_titleid_value eq daf8180f/);
  assert.equal(calls.length, 1);
});

test("review-ready sources cannot be promoted to release authority by the reader", async () => {
  const { deps } = fixture();
  await assert.rejects(readExistingTitleAuthorities({ titleId, stageId }, deps), /NOT_APPROVED/);
});

test("missing, duplicate, cross-title, and changed sources fail closed", async () => {
  for (const mutate of [
    ({ rows }) => rows.pop(),
    ({ rows }) => rows.push({ ...rows[1], jm1pub_editorialartifactid: "duplicate" }),
    ({ rows }) => { rows[1]._jm1pub_titleid_value = "other-title"; },
    ({ bytes }) => { bytes.set("voice", Buffer.from("changed")); },
    ({ rows }) => { rows[1].jm1pub_repositorypath = "https://sharepoint.example/07_Archive/voice.md"; }
  ]) {
    const state = fixture();
    mutate(state);
    await assert.rejects(readExistingTitleAuthorities({ titleId, stageId, shadowOnly: true }, state.deps),
      /EDITORIAL_TITLE_AUTHORITY_/);
  }
});

test("global guide reuses the existing checksum-verified knowledge Blob", async () => {
  const content = "Governed knowledge.md";
  const source = await readExistingGlobalStyleGuide({ verifyKnowledgeBlob: async () => ({
    reachable: true, hashMatched: true, content,
    calculatedSha256: crypto.createHash("sha256").update(content).digest("hex")
  }) });
  assert.equal(source.id, "JM1-PUB-Editorial-Knowledge-v1.0");
  assert.equal(source.sourceSystem, "GOVERNED_BLOB");
  await assert.rejects(readExistingGlobalStyleGuide({ verifyKnowledgeBlob: async () => ({
    reachable: true, hashMatched: false, content
  }) }), /NOT_VERIFIED/);
});
