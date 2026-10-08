"use strict";

const policy = require("../../config/whole-stage07-approved-revision.json");
const { hash, fail } = require("./approvedRevisionDocument");
const { readVerifiedSkill, bindSkill } = require("./approvedRevisionSkill");
const { readExistingTitleAuthorities, readExistingGlobalStyleGuide } = require("./productionTitleAuthorityReader");
const { jackieTitleCommissioningBlocker } = require("../author/jackieTitleSystemCommissioningPolicy");

const OWNER = "PUBLISHING_APPROVED_EDITORIAL_REVISION_V1";
const approvedPolicy = policy;
function validateInput(input) {
  if (!input || Object.keys(input).some((k) => !["revisionTaskId", "executionMode"].includes(k)) || input.revisionTaskId !== policy.taskId ||
      !["DRY_RUN", "EXECUTE", "EXECUTE_ASYNC", "READBACK"].includes(input.executionMode)) fail("REVISION_REQUEST_NOT_AUTHORIZED");
  return policy;
}
async function exact(client, set, key, id) {
  const rows = await client.list(set, { $filter: `${key} eq ${id}`, $top: "2" });
  if (!Array.isArray(rows) || rows.length !== 1 || rows[0][key] !== id) fail("REVISION_EXACT_RECORD_REQUIRED");
  return rows[0];
}
function metadataPath(item) {
  const parent = item?.parentReference?.path;
  if (typeof parent !== "string" || !parent.includes("root:")) fail("REVISION_ITEM_PATH_UNPROVEN");
  return `${decodeURIComponent(parent.slice(parent.indexOf("root:") + 5))}/${item.name}`;
}

async function readApprovedRevisionAuthority(input, deps) {
  validateInput(input);
  const policy = deps.policy || approvedPolicy;
  const skill = await readVerifiedSkill(deps.readSkillFile);
  const client = deps.client;
  const task = await exact(client, "jm1_publishingtasks", "jm1_publishingtaskid", policy.taskId);
  const disposition = await exact(client, "jm1_executionlogs", "jm1_executionlogid", policy.dispositionId);
  let decision;
  try { decision = JSON.parse(disposition.jm1_actiondescription); } catch { fail("REVISION_DISPOSITION_INVALID"); }
  if (task.jm1_iscompleted !== false || task.statecode !== 0 || task._ownerid_value !== policy.publisherId ||
      disposition.jm1_actiontype !== "PUBLISHER_STAGE07_REVISION_DISPOSITION" || disposition._ownerid_value !== policy.publisherId ||
      decision.decision !== "APPROVED_STAGE07_REVISION_INSTRUCTIONS_ONLY" || decision.taskId !== policy.taskId ||
      decision.titleId !== policy.titleId || decision.stageId !== policy.stageId || decision.publisherUserId !== policy.publisherId ||
      decision.artifactId !== policy.deliveredArtifactId || decision.artifactSha256 !== policy.deliveredSha256 ||
      hash(disposition.jm1_actiondescription) !== policy.dispositionSha256 ||
      decision.originUserMessage !== policy.approvalMessageId || hash(JSON.stringify(decision.criteria)) !== policy.criteriaSha256) {
    fail("REVISION_DISPOSITION_AUTHORITY_MISMATCH");
  }
  const publisher = await exact(client, "systemusers", "systemuserid", policy.publisherId);
  const title = await exact(client, "jm1pub_titles", "jm1pub_titleid", policy.titleId);
  if (jackieTitleCommissioningBlocker(title)) fail("JACKIE_AUTHOR_ONLY_SYSTEM_COMMISSIONING_DENIED");
  const contact = await exact(client, "contacts", "contactid", policy.contactId);
  const stage = await exact(client, "jm1pub_editorialstages", "jm1pub_editorialstageid", policy.stageId);
  if (publisher.isdisabled !== false || contact.statecode !== 0 || title.statecode !== 0 || stage.statecode !== 0 ||
      stage._jm1pub_titleid_value !== policy.titleId || stage._jm1pub_contactid_value !== policy.contactId ||
      stage.jm1pub_stagetype !== 100000001 || stage.jm1pub_stagestatus !== 100000002 || stage.jm1pub_governingstyleguide !== "JMP-SG-CMOS") {
    fail("REVISION_CURRENT_STAGE_OR_OWNER_CHANGED");
  }
  const gates = [];
  for (const id of policy.authorGateIds) {
    const gate = await exact(client, "jm1pub_editorialapprovalgates", "jm1pub_editorialapprovalgateid", id);
    if (gate._jm1pub_titleid_value !== policy.titleId || gate._jm1pub_editorialstageid_value !== policy.stageId ||
        gate.jm1pub_authordecision !== null || gate.jm1pub_nextstageauthorized !== false) fail("REVISION_AUTHOR_GATE_CHANGED");
    gates.push(gate);
  }
  const source = await exact(client, "jm1pub_editorialartifacts", "jm1pub_editorialartifactid", policy.sourceArtifactId);
  const delivered = await exact(client, "jm1pub_editorialartifacts", "jm1pub_editorialartifactid", policy.deliveredArtifactId);
  if (source._jm1pub_titleid_value !== policy.titleId || source.statecode !== 0 ||
      source.jm1pub_artifactstatus !== 196650003 || source.jm1pub_iscurrentapproved !== true ||
      source.jm1pub_sha256 !== policy.sourceSha256 || source.jm1pub_versionlabel !== policy.sourceVersion ||
      source.jm1pub_repositorydriveid !== policy.driveId || source.jm1pub_repositoryitemid !== policy.registeredSourceItemId ||
      delivered._jm1pub_titleid_value !== policy.titleId || delivered._jm1pub_editorialstageid_value !== policy.stageId ||
      delivered.jm1pub_sha256 !== policy.deliveredSha256) fail("REVISION_SOURCE_REGISTRATION_CHANGED");
  const canonical = await deps.graph(`drives/${policy.driveId}/items/${policy.canonicalSourceItemId}`);
  if (canonical.id !== policy.canonicalSourceItemId || !canonical.file || canonical.parentReference?.driveId !== policy.driveId ||
      metadataPath(canonical) !== policy.workspacePath + policy.canonicalSourceRelativePath || !canonical.eTag) {
    fail("REVISION_CANONICAL_SOURCE_LOCATION_CHANGED");
  }
  const sourceBuffer = await deps.graph(`drives/${policy.driveId}/items/${policy.canonicalSourceItemId}/content`, { responseType: "buffer" });
  const originalBuffer = await deps.graph(`drives/${policy.driveId}/items/${policy.registeredSourceItemId}/content`, { responseType: "buffer" });
  if (!Buffer.isBuffer(sourceBuffer) || !Buffer.isBuffer(originalBuffer) ||
      hash(sourceBuffer) !== policy.sourceSha256 || hash(originalBuffer) !== policy.sourceSha256) fail("REVISION_SOURCE_CUSTODY_MISMATCH");
  const canonicalAfter = await deps.graph(`drives/${policy.driveId}/items/${policy.canonicalSourceItemId}`);
  if (canonicalAfter.eTag !== canonical.eTag) fail("REVISION_SOURCE_CHANGED_DURING_READ");
  const titleAuthorities = await readExistingTitleAuthorities({ titleId: policy.titleId, stageId: policy.stageId, shadowOnly: true }, {
    client, downloadArtifact: (row) => deps.graph(`drives/${encodeURIComponent(row.jm1pub_repositorydriveid)}/items/${encodeURIComponent(row.jm1pub_repositoryitemid)}/content`, { responseType: "buffer" })
  });
  const styleGuide = await readExistingGlobalStyleGuide({ verifyKnowledgeBlob: deps.verifyKnowledgeBlob });
  for (const [label, expected] of Object.entries(policy.titleAuthorities)) {
    if (titleAuthorities[label]?.id !== expected.id || titleAuthorities[label]?.sha256 !== expected.sha256) fail("REVISION_TITLE_AUTHORITY_CHANGED");
  }
  if (skill.files["references/developmental-editing.md"].sha256 !== policy.stageCanonSha256) fail("REVISION_STAGE_CANON_CHANGED");
  const sources = {
    stageCanon: { id: policy.stageCanonPath, version: policy.stageCanonSha256, sha256: policy.stageCanonSha256 },
    styleGuide,
    ...titleAuthorities,
    // The existing author rulings are the preference authority for this bounded formatting-only task.
    // This does not manufacture a general author profile or infer any unrecorded preference.
    authorPreferences: { ...titleAuthorities.titleRulings, scope: "APPROVED_REVISION_ONLY" },
    priorAuthorDecisions: { id: policy.dispositionId, version: disposition["@odata.etag"], sha256: hash(disposition.jm1_actiondescription), sourceEventId: decision.sourceEventId, authorApproval: "NOT_GRANTED" }
  };
  const snapshot = { owner: OWNER, recipe: policy.recipeVersion, taskId: policy.taskId, dispositionId: policy.dispositionId,
    titleId: policy.titleId, stageId: policy.stageId, contactId: policy.contactId, approvalMessageId: policy.approvalMessageId,
    criteriaSha256: policy.criteriaSha256, sourceArtifactId: policy.sourceArtifactId, sourceSha256: policy.sourceSha256,
    canonicalItemId: canonical.id, canonicalItemETag: canonical.eTag, registeredSourceItemId: policy.registeredSourceItemId,
    sourceProvenance: "EXACT_BYTE_CANONICAL_COPY_OF_REGISTERED_APPROVED_SOURCE",
    sources: Object.fromEntries(Object.entries(sources).map(([k, v]) => [k, { id: v.id, version: v.version, sha256: v.sha256, scope: v.scope || null }])),
    protectedRecords: [task, disposition, stage, ...gates, source, delivered].map((r) => ({ etag: r["@odata.etag"] })),
    outputAudience: "INTERNAL_EDITORIAL", authorDeliveryEligible: false };
  snapshot.editorialAuthority = bindSkill(skill, snapshot, stage.jm1pub_governingstyleguide);
  return { sourceBuffer, snapshot, fingerprint: hash(JSON.stringify(snapshot)), titleName: title.jm1pub_titlename };
}

module.exports = { OWNER, policy, validateInput, readApprovedRevisionAuthority, exact, metadataPath };
