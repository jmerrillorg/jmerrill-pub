"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { policy, readApprovedRevisionAuthority } = require("../src/editorial/approvedRevisionAuthority");
const { hash } = require("../src/editorial/approvedRevisionDocument");
const { JACKIE_CANONICAL_AUTHOR_CONTACT_ID } = require("../src/author/jackieTitleSystemCommissioningPolicy");

function fixture() {
  const p = structuredClone(policy), source = Buffer.from("synthetic manuscript bytes");
  p.contactId = JACKIE_CANONICAL_AUTHOR_CONTACT_ID;
  p.sourceSha256 = hash(source);
  const decision = { decision: "APPROVED_STAGE07_REVISION_INSTRUCTIONS_ONLY", taskId: p.taskId, titleId: p.titleId,
    stageId: p.stageId, publisherUserId: p.publisherId, artifactId: p.deliveredArtifactId, artifactSha256: p.deliveredSha256,
    originUserMessage: p.approvalMessageId, criteria: ["bounded synthetic instruction"], sourceEventId: "existing-source-event" };
  p.criteriaSha256 = hash(JSON.stringify(decision.criteria)); p.dispositionSha256 = hash(JSON.stringify(decision));
  const task = { jm1_publishingtaskid: p.taskId, jm1_iscompleted: false, statecode: 0, _ownerid_value: p.publisherId };
  const disposition = { jm1_executionlogid: p.dispositionId, jm1_actiondescription: JSON.stringify(decision),
    jm1_actiontype: "PUBLISHER_STAGE07_REVISION_DISPOSITION", _ownerid_value: p.publisherId, "@odata.etag": "d1" };
  const stage = { jm1pub_editorialstageid: p.stageId, statecode: 0, _jm1pub_titleid_value: p.titleId, _jm1pub_contactid_value: p.contactId,
    jm1pub_stagetype: 100000001, jm1pub_stagestatus: 100000002, jm1pub_governingstyleguide: "JMP-SG-CMOS" };
  const original = { jm1pub_editorialartifactid: p.sourceArtifactId, statecode: 0, jm1pub_artifactstatus: 196650003, _jm1pub_titleid_value: p.titleId, jm1pub_iscurrentapproved: true,
    jm1pub_sha256: p.sourceSha256, jm1pub_versionlabel: p.sourceVersion, jm1pub_repositorydriveid: p.driveId, jm1pub_repositoryitemid: p.registeredSourceItemId };
  const delivered = { jm1pub_editorialartifactid: p.deliveredArtifactId, _jm1pub_titleid_value: p.titleId,
    _jm1pub_editorialstageid_value: p.stageId, jm1pub_sha256: p.deliveredSha256 };
  const roles = ["titleStyleSheet", "voiceProfile", "titleRulings"];
  const names = ["Project style sheet", "Voice profile", "Author revision rulings"];
  const types = [196650007, 196650018, 196650013];
  const authorities = roles.map((r, i) => {
    const content = `Synthetic governed ${r}`;
    p.titleAuthorities[r].sha256 = hash(content);
    return { jm1pub_editorialartifactid: p.titleAuthorities[r].id, jm1pub_editorialartifactname: names[i], jm1pub_artifacttype: types[i],
      jm1pub_artifactstatus: 196650001, jm1pub_iscurrentapproved: false, jm1pub_versionlabel: "v1", jm1pub_sha256: hash(content),
      jm1pub_repositorydriveid: p.driveId, jm1pub_repositoryitemid: r,
      jm1pub_repositorypath: `https://tenant.sharepoint.com/01_Pipeline_A-Z/title/${r}.md`,
      _jm1pub_titleid_value: p.titleId, _jm1pub_editorialstageid_value: p.stageId, content };
  });
  const gates = p.authorGateIds.map((id) => ({ jm1pub_editorialapprovalgateid: id, _jm1pub_titleid_value: p.titleId,
    _jm1pub_editorialstageid_value: p.stageId, jm1pub_authordecision: null, jm1pub_nextstageauthorized: false }));
  const records = {
    jm1_publishingtasks: [task], jm1_executionlogs: [disposition], jm1pub_editorialstages: [stage],
    jm1pub_titles: [{ jm1pub_titleid: p.titleId, jm1pub_titlename: "Synthetic Title", statecode: 0,
      _jm1_primaryauthor_value: p.contactId, _jm1_author_value: p.contactId,
      jm1_canonicalauthorcontactreference: `contact:${p.contactId}` }],
    contacts: [{ contactid: p.contactId, statecode: 0 }], systemusers: [{ systemuserid: p.publisherId, isdisabled: false }],
    jm1pub_editorialapprovalgates: gates, jm1pub_editorialartifacts: [original, delivered, ...authorities]
  };
  const canonicalPath = p.workspacePath + p.canonicalSourceRelativePath;
  const metadata = { id: p.canonicalSourceItemId, name: canonicalPath.split("/").pop(), file: {}, eTag: "item1",
    parentReference: { driveId: p.driveId, path: `/drives/${p.driveId}/root:${canonicalPath.slice(0, canonicalPath.lastIndexOf("/"))}` } };
  const deps = { policy: p, client: { list: async (set, query) => {
    const match = /^(\w+id) eq ([a-f0-9-]+)$/.exec(query.$filter);
    return match ? records[set].filter((r) => r[match[1]] === match[2]) : authorities;
  } }, readSkillFile: async (name) => fs.readFileSync(path.resolve(__dirname, "../../../docs/implementation/canon-cache/jm1-publishing-editorial", name)),
    verifyKnowledgeBlob: async () => ({ reachable: true, hashMatched: true, content: "global guide", calculatedSha256: hash("global guide") }),
    graph: async (uri) => {
      if (!uri.endsWith("/content")) return structuredClone(metadata);
      if (uri.includes(p.canonicalSourceItemId) || uri.includes(p.registeredSourceItemId)) return source;
      return Buffer.from(authorities.find((a) => uri.includes(a.jm1pub_repositoryitemid)).content);
    }
  };
  return { p, deps, records, metadata, task, disposition, stage, gates, authorities };
}
const input = { revisionTaskId: policy.taskId, executionMode: "DRY_RUN" };

test("authority binds seven existing sources, canonical byte provenance and preserved author hold", async () => {
  const h = fixture();
  const a = await readApprovedRevisionAuthority(input, h.deps);
  assert.equal(Object.keys(a.snapshot.sources).length, 7);
  assert.equal(a.snapshot.sources.authorPreferences.id, h.p.titleAuthorities.titleRulings.id);
  assert.equal(a.snapshot.sources.priorAuthorDecisions.id, policy.dispositionId);
  assert.equal(a.snapshot.outputAudience, "INTERNAL_EDITORIAL");
  assert.equal(a.snapshot.authorDeliveryEligible, false);
  assert.equal(a.snapshot.editorialAuthority.skill, "jm1-publishing-editorial");
  assert.equal(a.snapshot.editorialAuthority.authority.titleStyleSheet.id, h.p.titleAuthorities.titleStyleSheet.id);
  assert.equal(a.snapshot.editorialAuthority.authority.priorAuthorDecisions.sha256, h.p.dispositionSha256);
  const b = await readApprovedRevisionAuthority(input, h.deps);
  assert.equal(a.fingerprint, b.fingerprint);
});

test("configured Jackuline production title is denied by Jackie-only commissioning policy", async () => {
  const h = fixture();
  const actualAuthorId = policy.contactId;
  h.records.jm1pub_titles[0]._jm1_primaryauthor_value = actualAuthorId;
  h.records.jm1pub_titles[0]._jm1_author_value = actualAuthorId;
  h.records.jm1pub_titles[0].jm1_canonicalauthorcontactreference = `contact:${actualAuthorId}`;
  await assert.rejects(readApprovedRevisionAuthority(input, h.deps), /JACKIE_AUTHOR_ONLY_SYSTEM_COMMISSIONING_DENIED/);
});

test("changed decision, owner, title, source path, canon or existing title authority fails closed", async () => {
  const mutations = [
    (h) => { h.task._ownerid_value = "different"; },
    (h) => { h.disposition.jm1_actiondescription += " "; },
    (h) => { h.stage._jm1pub_titleid_value = "different"; },
    (h) => { h.stage.statecode = 1; },
    (h) => { h.records.jm1pub_editorialartifacts[0].statecode = 1; },
    (h) => { h.records.jm1pub_editorialartifacts[0].jm1pub_artifactstatus = 196650000; },
    (h) => { h.gates[0].jm1pub_authordecision = 196650000; },
    (h) => { h.metadata.parentReference.path = "/drives/drive/root:/07_Archive/title"; },
    (h) => { h.metadata.parentReference.driveId = "different"; },
    (h) => { h.deps.readSkillFile = async () => Buffer.from("changed"); },
    (h) => { h.stage.jm1pub_governingstyleguide = "GENERIC"; },
    (h) => { h.stage.jm1pub_stagetype = 100000002; },
    (h) => { h.authorities[0].jm1pub_sha256 = "a".repeat(64); },
    (h) => { h.authorities[2]._jm1pub_titleid_value = "different"; }
  ];
  for (const mutate of mutations) {
    const h = fixture(); mutate(h);
    await assert.rejects(readApprovedRevisionAuthority(input, h.deps));
  }
});

test("approved stage canon is packaged from the existing governed source without rewriting it", () => {
  const root = path.resolve(__dirname, "../../..");
  assert.equal(hash(fs.readFileSync(path.join(root, policy.stageCanonPath))), policy.stageCanonSha256);
  const workflow = fs.readFileSync(path.join(root, ".github/workflows/diagnostic-ai-runner.yml"), "utf8");
  assert.ok(workflow.includes("scripts/package-approved-revision-canon.js"));
  assert.ok(workflow.includes("docs/implementation/canon-cache/jm1-publishing-editorial/**"));
});
