"use strict";
const { createHash } = require("node:crypto");
const { JACKIE_CANONICAL_AUTHOR_CONTACT_ID: contactId } = require("../author/jackieTitleSystemCommissioningPolicy");
const titleId = "a69b9dfa-bb7b-f111-ab0f-7c1e525b15c2";
const priorReference = "contact:a7801f4d-1d76-f111-ab0f-6045bdd69435";
const targetReference = `contact:${contactId}`;
const hash = bytes => createHash("sha256").update(bytes).digest("hex");
function fail(code) { throw Object.assign(new Error(code), { safeCode: code }); }
const first = (client, entity, field, id) => client.first(entity, { $filter: `${field} eq ${id}` });
async function readAuthority(deps) {
  const title = await first(deps.client, "jm1pub_titles", "jm1pub_titleid", titleId);
  const log = await first(deps.client, "jm1_executionlogs", "jm1_executionlogid", "2262539a-8f80-f111-ab0e-6045bdd9ab12");
  const intake = await first(deps.client, "jm1_publishingintakes", "jm1_publishingintakeid", "4320d89c-1676-f111-ab0f-6045bdd69435");
  const asset = await first(deps.client, "jm1pub_publishingassets", "jm1pub_publishingassetid", "0b30451e-be7b-f111-ab0f-7c1e525b15c2");
  const contact = await first(deps.client, "contacts", "contactid", contactId);
  const source = await first(deps.client, "jm1pub_editorialartifacts", "jm1pub_editorialartifactid", "e8b7ff2b-1c84-f111-ab0f-6045bdd69678");
  if (title?.jm1pub_titleid !== titleId || title.statecode !== 0 ||
      ![priorReference, targetReference].includes(title.jm1_canonicalauthorcontactreference) ||
      title._jm1_primaryauthor_value || title._jm1_author_value ||
      contact?.contactid !== contactId || contact.statecode !== 0 ||
      log?.jm1_executionlogid !== "2262539a-8f80-f111-ab0e-6045bdd9ab12" || log.jm1_sourcerecordid !== titleId ||
      log.jm1_actiontype !== "LONGWATCH_CLUSTER_RECONCILIATION_COMPLETED" || log.createdon !== "2026-07-15T20:56:10Z" ||
      typeof log.jm1_actiondescription !== "string" || hash(log.jm1_actiondescription) !== "3dc5be1de51f30f12880fa25500024c5389e20a750ab63aaf0ce3c457e897404" ||
      intake?.jm1_publishingintakeid !== "4320d89c-1676-f111-ab0f-6045bdd69435" || intake._jm1_linkedcontact_value !== contactId ||
      intake.jm1_intakereferencecode !== "JMP-INT-202607-6R2MPZ" || intake.statecode !== 0 ||
      !/^https:\/\/jmerrillfoundation\.sharepoint\.com\/sites\/publishing\/_layouts\/15\/Doc\.aspx\?/.test(intake.jm1_manuscripturl || "") ||
      new URL(intake.jm1_manuscripturl).searchParams.get("sourcedoc")?.toLowerCase() !== "{cb4e2c54-68ff-44f9-97d1-fb7a05774ce1}" ||
      asset?.jm1pub_publishingassetid !== "0b30451e-be7b-f111-ab0f-7c1e525b15c2" || asset._jm1pub_titleid_value !== titleId ||
      source?.jm1pub_editorialartifactid !== "e8b7ff2b-1c84-f111-ab0f-6045bdd69678" || source._jm1pub_titleid_value !== titleId ||
      source.jm1pub_repositoryitemid !== "01DF3SEQKUFRHMX73I7FCJPUP3PICXOTHB" || source.versionnumber !== 39644804 ||
      source.jm1pub_sha256 !== "d4fdcd2515c60d592ff2df0bf116c967777bef4d2eb1d3897fbe88004d42cf1a" ||
      source.statecode !== 0 || source.jm1pub_iscurrentapproved !== true || source.jm1pub_supersededon ||
      typeof deps.verifyArtifactBytes !== "function" || !await deps.verifyArtifactBytes(source, source.jm1pub_sha256)) {
    fail("COMMISSIONING_LONGWATCH_IDENTITY_AUTHORITY_CONFLICT");
  }
  if (title.jm1_canonicalauthorcontactreference === priorReference && title.versionnumber !== 50731083) {
    fail("COMMISSIONING_LONGWATCH_TITLE_PREIMAGE_CHANGED");
  }
  return { title, evidence: { executionLogId: log.jm1_executionlogid, executionDescriptionSha256: hash(log.jm1_actiondescription),
    intakeId: intake.jm1_publishingintakeid, intakeVersion: String(intake.versionnumber), assetId: asset.jm1pub_publishingassetid,
    assetVersion: String(asset.versionnumber), sourceArtifactId: source.jm1pub_editorialartifactid,
    sourceVersion: String(source.versionnumber), sourceSha256: source.jm1pub_sha256, contactId, contactVersion: String(contact.versionnumber) } };
}
function businessPreimage(title) {
  const system = new Set(["versionnumber", "modifiedon", "_modifiedby_value", "_modifiedonbehalfby_value", "@odata.etag", "@odata.context"]);
  return Object.fromEntries(Object.entries(title).filter(([key]) => !system.has(key) && key !== "jm1_canonicalauthorcontactreference").sort(([a], [b]) => a.localeCompare(b)));
}
async function reconcileIdentity(deps) {
  const guard = deps.containerClient.getBlockBlobClient(`commissioning-identity-reconciliation/${titleId}/v1/intent.json`);
  const authority = await readAuthority(deps);
  let intent;
  try { intent = JSON.parse((await guard.downloadToBuffer()).toString("utf8")); }
  catch (error) {
    if (error.statusCode !== 404) throw error;
    if (authority.title.jm1_canonicalauthorcontactreference !== priorReference) fail("COMMISSIONING_LONGWATCH_CORRECTION_NOT_ATTRIBUTED");
    intent = { titleId, field: "jm1_canonicalauthorcontactreference", before: priorReference, after: targetReference,
      beforeVersion: String(authority.title.versionnumber), etag: authority.title["@odata.etag"],
      businessPreimage: businessPreimage(authority.title), evidence: authority.evidence };
    if (!intent.etag) fail("COMMISSIONING_LONGWATCH_PREIMAGE_ETAG_MISSING");
    try { await guard.uploadData(Buffer.from(JSON.stringify(intent)), { conditions: { ifNoneMatch: "*" } }); }
    catch (error) { if (![409, 412].includes(error.statusCode)) throw error; intent = JSON.parse((await guard.downloadToBuffer()).toString("utf8")); }
  }
  if (intent.titleId !== titleId || intent.field !== "jm1_canonicalauthorcontactreference" || intent.before !== priorReference ||
      intent.after !== targetReference || intent.beforeVersion !== "50731083" ||
      JSON.stringify(intent.businessPreimage) !== JSON.stringify(businessPreimage(authority.title)) ||
      JSON.stringify(intent.evidence) !== JSON.stringify(authority.evidence)) fail("COMMISSIONING_LONGWATCH_RECONCILIATION_INTENT_CONFLICT");
  const lease = guard.getBlobLeaseClient();
  await lease.acquireLease(60);
  try {
    const current = await readAuthority(deps);
    if (JSON.stringify(businessPreimage(current.title)) !== JSON.stringify(intent.businessPreimage) ||
        JSON.stringify(current.evidence) !== JSON.stringify(intent.evidence)) fail("COMMISSIONING_LONGWATCH_RECONCILIATION_INTENT_CONFLICT");
    if (current.title.jm1_canonicalauthorcontactreference === priorReference) {
      await lease.renewLease();
      await deps.client.patchIfMatch("jm1pub_titles", titleId, { jm1_canonicalauthorcontactreference: targetReference }, intent.etag);
    }
    const after = await readAuthority(deps);
    if (after.title.jm1_canonicalauthorcontactreference !== targetReference ||
        JSON.stringify(businessPreimage(after.title)) !== JSON.stringify(intent.businessPreimage)) fail("COMMISSIONING_LONGWATCH_CORRECTION_READBACK_FAILED");
    const result = { titleId, field: intent.field, before: intent.before, after: intent.after, beforeVersion: intent.beforeVersion,
      afterVersion: String(after.title.versionnumber), evidence: intent.evidence, contactsMerged: false,
      productionStageChanged: false, authorCommunications: 0, modelCalls: 0 };
    const receipt = deps.containerClient.getBlockBlobClient(`commissioning-identity-reconciliation/${titleId}/v1/result.json`);
    const bytes = Buffer.from(JSON.stringify(result));
    try { await receipt.uploadData(bytes, { conditions: { ifNoneMatch: "*" } }); }
    catch (error) { if (![409, 412].includes(error.statusCode) || !(await receipt.downloadToBuffer()).equals(bytes)) fail("COMMISSIONING_LONGWATCH_RESULT_CONFLICT"); }
    return result;
  } finally { await lease.releaseLease(); }
}
module.exports = { titleId, readAuthority, reconcileIdentity };
