"use strict";

const { createHash } = require("node:crypto");
const { JACKIE_CANONICAL_AUTHOR_CONTACT_ID: contactId } = require("../author/jackieTitleSystemCommissioningPolicy");
const { readJackieCommissioningIdentity } = require("../author/jackieCommissioningIdentityReader");
const driveId = "b!mA37NWi8UEKdDYwH1o5AJNWKIBAoAPBIn_pxeBKSSDVm9PH59uWnQpr1oD4m79se";
const hash = value => createHash("sha256").update(value).digest("hex");
function fail(code) { throw Object.assign(new Error(code), { safeCode: code }); }
function deterministicId(value) {
  const h = hash(value);
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-5${h.slice(13, 16)}-a${h.slice(17, 20)}-${h.slice(20, 32)}`;
}
const myAiWorkReference = "VELLUM_BOOK_UUID:46642F52-B290-4FC2-A707-11A812F4CDD5";
const policies = Object.freeze({
  TIL_DEATH: Object.freeze({ titleId: "f79006b7-f595-f111-8076-00224820105b", intakeId: "383b6d6c-f595-f111-8076-7c1e525b15c2",
    intakeReference: "JMP-INT-202608-3W6Q6L", correlationId: "0d083eb5-45dc-4b0d-a16a-d19ddde61785",
    titleName: "'TIL DEATH DO US PART", itemId: "01DF3SEQLS4HFC4AAJSRE2LVY7XVZTLH2Y", format: "md", bytes: 133593,
    sha256: "b030075bbda336c8dea8f7c12aaf210665fb0bbdc52da690144d7cfd3dd8bcd7",
    manifestItemId: "01DF3SEQNWJTRAEE2QM5CJ4UVF4JLI5K4D",
    manifestSha256: "d18b8ff2f967826ab1ea5a004e8addffba8816179fbc1b7e27f3906824f964c1" }),
  MY_AI: Object.freeze({ titleId: deterministicId(`JMP-JACKIE-TITLE-COMMISSIONING-20261008:${myAiWorkReference}`),
    newTitleWorkReference: myAiWorkReference, titleName: "My AI Journey", itemId: "01DF3SEQMDR2RSJEGJOVFKFGODU3225QPK",
    retainedAliasItemId: "01DF3SEQIMJ3UTBC335ND3FHJ4LOEZNNG3", format: "vellum", bytes: 271999,
    sha256: "a2cde55aadc51d96a49f7ee8a11ec16449262b34e40ca755fde30832af34bffd" })
});
function policyForTitle(titleId) { return Object.values(policies).find(p => p.titleId === titleId) || null; }
function sourceArtifactId(policy) { return deterministicId(`${policy.titleId}:${driveId}:${policy.itemId}:${policy.sha256}:RECEIVED_ORIGINAL:v1`); }
async function sourceBytes(itemId, deps) {
  return require("../editorial/productionTitleAuthorityReader").graphBytes({ jm1pub_repositorydriveid: driveId, jm1pub_repositoryitemid: itemId },
    { ...deps, credential: deps.credential || new (require("@azure/identity").ManagedIdentityCredential)(),
      fetchImpl: (url, options) => (deps.fetchImpl || fetch)(url, { ...options, signal: AbortSignal.timeout(30000) }) });
}
async function sourceMetadata(policy, deps) {
  const credential = deps.credential || new (require("@azure/identity").ManagedIdentityCredential)();
  const token = await credential.getToken("https://graph.microsoft.com/.default");
  const response = await (deps.fetchImpl || fetch)(
    `https://graph.microsoft.com/v1.0/drives/${encodeURIComponent(driveId)}/items/${encodeURIComponent(policy.itemId)}?$select=id,name,size,eTag,webUrl,parentReference,file`,
    { headers: { Authorization: `Bearer ${token.token}` }, signal: AbortSignal.timeout(30000) });
  if (!response.ok) fail("COMMISSIONING_RECEIVED_METADATA_UNAVAILABLE");
  return response.json();
}
function verifySourceMetadata(policy, metadata) {
  let url, path;
  try { url = new URL(metadata.webUrl); path = decodeURIComponent(url.pathname); } catch { fail("COMMISSIONING_RECEIVED_LOCATION_INVALID"); }
  if (metadata.id !== policy.itemId || metadata.size !== policy.bytes || !metadata.file || !metadata.eTag ||
      metadata.parentReference?.driveId !== driveId || url.protocol !== "https:" ||
      url.hostname !== "jmerrillfoundation.sharepoint.com" || url.search || url.hash ||
      !path.startsWith("/sites/publishing/") || !path.includes("/01_Pipeline_A-Z/") ||
      !decodeURIComponent(metadata.parentReference.path || "").includes("/01_Pipeline_A-Z/") ||
      path.split("/").pop() !== metadata.name) fail("COMMISSIONING_RECEIVED_LOCATION_INVALID");
  return { repositoryPath: url.href, sourceETag: metadata.eTag, sourceName: metadata.name,
    parentItemId: metadata.parentReference.id };
}
async function readReceivedSourceProof(policy, deps) {
  if (!Object.values(policies).includes(policy)) fail("COMMISSIONING_RECEIVED_POLICY_DENIED");
  const custody = verifySourceMetadata(policy, await (deps.sourceMetadata || sourceMetadata)(policy, deps));
  const source = await sourceBytes(policy.itemId, deps);
  if (!Buffer.isBuffer(source) || source.length !== policy.bytes || hash(source) !== policy.sha256) fail("COMMISSIONING_RECEIVED_SOURCE_BYTES_CHANGED");
  if (policy.intakeId) {
    const intake = await deps.client.first("jm1_publishingintakes", { $filter: `jm1_publishingintakeid eq ${policy.intakeId}` });
    if (intake?.jm1_publishingintakeid !== policy.intakeId || intake._jm1_linkedcontact_value !== contactId ||
        intake.jm1_intakereferencecode !== policy.intakeReference || intake.statecode !== 0 ||
        !Number.isSafeInteger(intake.versionnumber)) fail("COMMISSIONING_RECEIVED_INTAKE_CHANGED");
    const bytes = await sourceBytes(policy.manifestItemId, deps);
    if (!Buffer.isBuffer(bytes) || hash(bytes) !== policy.manifestSha256) fail("COMMISSIONING_RECEIVED_MANIFEST_CHANGED");
    let manifest;
    try { manifest = JSON.parse(bytes.toString("utf8")); } catch { fail("COMMISSIONING_RECEIVED_MANIFEST_INVALID"); }
    const artifact = manifest.sourceArtifact;
    if (manifest.schema !== "JM1_PUBLISHING_SOURCE_ARTIFACT_MANIFEST_V1" || manifest.intakeReference !== policy.intakeReference ||
        manifest.correlationId !== policy.correlationId || artifact?.immutable !== true || artifact.sha256 !== policy.sha256 ||
        artifact.sizeBytes !== policy.bytes || artifact.sharePointItemId !== policy.itemId || artifact.sourceFormat !== policy.format) {
      fail("COMMISSIONING_RECEIVED_MANIFEST_BINDING_INVALID");
    }
    return { ...custody, kind: "EXACT_INTAKE_IMMUTABLE_MANIFEST", intakeId: policy.intakeId, intakeVersion: String(intake.versionnumber),
      manifestItemId: policy.manifestItemId, manifestSha256: policy.manifestSha256, originalFileName: artifact.originalFileName };
  }
  const alias = await sourceBytes(policy.retainedAliasItemId, deps);
  if (!Buffer.isBuffer(alias) || hash(alias) !== policy.sha256) fail("COMMISSIONING_RECEIVED_ALIAS_CHANGED");
  const zip = await require("jszip").loadAsync(source, { checkCRC32: true });
  const metadata = zip.file("bookMetadata.plist");
  if (!metadata || metadata._data.uncompressedSize > 20000) fail("COMMISSIONING_VELLUM_METADATA_INVALID");
  const xml = await metadata.async("string");
  if (/<!ENTITY|<!DOCTYPE[^>]*\[/i.test(xml)) fail("COMMISSIONING_VELLUM_METADATA_INVALID");
  const doc = new (require("@xmldom/xmldom").DOMParser)({ errorHandler: {
    warning: () => fail("COMMISSIONING_VELLUM_METADATA_INVALID"), error: () => fail("COMMISSIONING_VELLUM_METADATA_INVALID"),
    fatalError: () => fail("COMMISSIONING_VELLUM_METADATA_INVALID") } }).parseFromString(xml, "text/xml");
  const dictionaries = doc.getElementsByTagName("dict");
  const root = dictionaries[0];
  const fields = {};
  for (let node = root?.firstChild; node; node = node.nextSibling) {
    if (node.nodeType !== 1 || node.nodeName !== "key") continue;
    let value = node.nextSibling;
    while (value && value.nodeType !== 1) value = value.nextSibling;
    if (value?.nodeName === "string") {
      if (Object.hasOwn(fields, node.textContent)) fail("COMMISSIONING_VELLUM_METADATA_INVALID");
      fields[node.textContent] = value.textContent;
    }
  }
  if (fields.bookUUID !== "46642F52-B290-4FC2-A707-11A812F4CDD5" || fields.title !== policy.titleName ||
      fields.author !== "Jackie Smith, Jr." || fields.publisher !== "J Merrill Publishing, Inc.") fail("COMMISSIONING_VELLUM_WORK_BINDING_CHANGED");
  // Name alone is not authorship proof: only this founder-scoped exact UUID,
  // independently verified source/alias hashes and live canonical Contact apply.
  const contact = await deps.client.first("contacts", { $filter: `contactid eq ${contactId}` });
  if (contact?.contactid !== contactId || contact.statecode !== 0 || !Number.isSafeInteger(contact.versionnumber)) fail("COMMISSIONING_RECEIVED_CONTACT_CHANGED");
  return { ...custody, kind: "FOUNDER_SCOPED_EXACT_VELLUM_WORK", workReference: policy.newTitleWorkReference,
    bookUUID: fields.bookUUID, originalFileName: "My AI Journey.vellum", aliasItemId: policy.retainedAliasItemId };
}
async function readSourceTitle(policy, deps) {
  const title = await deps.client.first("jm1pub_titles", { $filter: `jm1pub_titleid eq ${policy.titleId}` });
  if (!title) return null;
  if (title.statecode !== 0 || (policy.newTitleWorkReference && title.jm1_sourceauthority !== policy.newTitleWorkReference) ||
      !await readJackieCommissioningIdentity(title, { enabled: true, titleId: policy.titleId, mode: "JACKIE_TITLE_INTERNAL_COMMISSIONING" }, deps.client)) {
    fail("COMMISSIONING_RECEIVED_TITLE_CHANGED");
  }
  return title;
}
async function verifySourceRegistration(policy, row, deps) {
  if (!row || row.jm1pub_editorialartifactid !== sourceArtifactId(policy) || row._jm1pub_titleid_value !== policy.titleId ||
      row.jm1pub_repositorydriveid !== driveId || row.jm1pub_repositoryitemid !== policy.itemId || row.jm1pub_sha256 !== policy.sha256 ||
      row.jm1pub_filesizebytes !== policy.bytes || row.jm1pub_fileextension !== policy.format || row.jm1pub_iscurrentapproved !== false ||
      row.jm1pub_supersededon || row.statecode !== 0 || row.jm1pub_correlationid !== `JMP-JACKIE-TITLE-COMMISSIONING-20261008:RECEIVED:${policy.itemId}` ||
      !Number.isSafeInteger(row.versionnumber)) fail("COMMISSIONING_RECEIVED_REGISTRATION_CONFLICT");
  const proof = await (deps.readReceivedSourceProof || readReceivedSourceProof)(policy, deps);
  if (row.jm1pub_repositorypath !== proof.repositoryPath && !verifiedIntakeRelocation(policy, row.jm1pub_repositorypath, proof.repositoryPath)) {
    fail("COMMISSIONING_RECEIVED_REGISTRATION_LOCATION_CONFLICT");
  }
  return true;
}

// Founder-completed folder renames do not change the exact drive/item/bytes
// checked above. Preserve the registered historical URL and completed run.
function verifiedIntakeRelocation(policy, historical, current) {
  const names = policy === policies.TIL_DEATH
    ? ["JMP-INT-202608-3W6Q6L - Jackie Smith Jr - TIL DEATH DO US PART", "Smith, Jackie - Til Death Do Us Part"]
    : policy === policies.MY_AI ? ["2025-Smith-MyAIJourney", "Smith, Jackie - My AI Journey"] : null;
  if (!names) return false;
  try {
    const before = new URL(historical), after = new URL(current);
    const prefix = "/sites/publishing/Shared Documents/01_Pipeline_A-Z/02 - Intake/";
    if ([before, after].some(url => url.protocol !== "https:" || url.hostname !== "jmerrillfoundation.sharepoint.com" || url.port || url.search || url.hash)) return false;
    const oldPath = decodeURIComponent(before.pathname), newPath = decodeURIComponent(after.pathname);
    const oldPrefix = `${prefix}${names[0]}/`, newPrefix = `${prefix}${names[1]}/`;
    return oldPath.startsWith(oldPrefix) && newPath.startsWith(newPrefix) &&
      oldPath.slice(oldPrefix.length) === newPath.slice(newPrefix.length) &&
      !oldPath.includes("/../") && !newPath.includes("/../");
  } catch { return false; }
}
async function registerReceivedSource(policy, deps) {
  const proof = await (deps.readReceivedSourceProof || readReceivedSourceProof)(policy, deps);
  let title = await readSourceTitle(policy, deps);
  if (!title && !policy.newTitleWorkReference) fail("COMMISSIONING_RECEIVED_TITLE_MISSING");
  const assertOwned = deps.claim?.assertOwned;
  if (typeof assertOwned !== "function") fail("COMMISSIONING_REGISTRATION_CLAIM_REQUIRED");
  const id = sourceArtifactId(policy);
  let row = await deps.client.first("jm1pub_editorialartifacts", { $filter: `jm1pub_editorialartifactid eq ${id}` });
  if (row) await verifySourceRegistration(policy, row, deps);
  else {
    const candidates = await deps.client.list("jm1pub_editorialartifacts", { $filter: `jm1pub_repositoryitemid eq '${policy.itemId}'`, $top: "5000" });
    if (candidates.length) fail("COMMISSIONING_RECEIVED_EXISTING_ARTIFACT_CONFLICT");
  }
  if (!title) {
    const candidates = await deps.client.list("jm1pub_titles", { $filter: `jm1_sourceauthority eq '${policy.newTitleWorkReference}' or jm1pub_titlename eq '${policy.titleName}'`, $top: "5000" });
    if (candidates.length) fail("COMMISSIONING_NEW_WORK_CROSSWALK_REQUIRES_REVIEW");
    await assertOwned();
    try {
      await deps.client.create("jm1pub_titles", { jm1pub_titleid: policy.titleId, jm1pub_titlename: policy.titleName,
        jm1pub_name: policy.titleName, jm1pub_slug: "my-ai-journey", jm1pub_publiccatalogstatus: 100000000,
        jm1_canonicalauthorcontactreference: `contact:${contactId}`, jm1_sourceauthority: policy.newTitleWorkReference,
        jm1pub_notes: "Jackie-only internal linked commissioning; exact Vellum UUID/source custody. No release, agreement, payment, communication or stage authority." });
    } catch (error) {
      if (![409, 412].includes(error.status || error.statusCode)) throw error;
    }
    title = await readSourceTitle(policy, deps);
    if (!title) fail("COMMISSIONING_RECEIVED_TITLE_CREATE_UNCONFIRMED");
  }
  if (!row) {
    const candidates = await deps.client.list("jm1pub_editorialartifacts", { $filter: `jm1pub_repositoryitemid eq '${policy.itemId}'`, $top: "5000" });
    if (candidates.length) fail("COMMISSIONING_RECEIVED_EXISTING_ARTIFACT_CONFLICT");
    await assertOwned();
    try {
      await deps.client.create("jm1pub_editorialartifacts", { jm1pub_editorialartifactid: id,
        jm1pub_editorialartifactname: `${policy.titleName} - Received Original (not editorial approval)`,
        jm1pub_filename: proof.originalFileName, jm1pub_fileextension: policy.format, jm1pub_filesizebytes: policy.bytes,
        jm1pub_repositorydriveid: driveId, jm1pub_repositoryitemid: policy.itemId,
        jm1pub_repositorypath: proof.repositoryPath,
        jm1pub_sha256: policy.sha256, jm1pub_versionlabel: `RECEIVED_ORIGINAL:${policy.sha256}`, jm1pub_artifactstatus: 196650000,
        jm1pub_visibility: 196650001, jm1pub_iscurrentapproved: false, statecode: 0,
        jm1pub_correlationid: `JMP-JACKIE-TITLE-COMMISSIONING-20261008:RECEIVED:${policy.itemId}`,
        jm1pub_notes: `Exact received source. Proof ${JSON.stringify(proof)}. No editorial approval or stage completion.`,
        "Jm1pub_Titleid@odata.bind": `/jm1pub_titles(${policy.titleId})` });
    } catch (error) { if (![409, 412].includes(error.status || error.statusCode)) throw error; }
    row = await deps.client.first("jm1pub_editorialartifacts", { $filter: `jm1pub_editorialartifactid eq ${id}` });
  }
  await verifySourceRegistration(policy, row, deps);
  return { titleId: policy.titleId, artifactId: id, version: String(row.versionnumber), sha256: policy.sha256,
    role: "RECEIVED_ORIGINAL", editorialApproval: false, proof };
}

async function withRegistrationClaim(policy, deps, operation) {
  if (!Object.values(policies).includes(policy)) fail("COMMISSIONING_RECEIVED_POLICY_DENIED");
  const guard = deps.containerClient.getBlockBlobClient(`commissioning-registration-guards/${policy.titleId}.json`);
  const body = Buffer.from(JSON.stringify({ titleId: policy.titleId, sourceId: sourceArtifactId(policy), sha256: policy.sha256,
    role: "RECEIVED_ORIGINAL", version: 1 }));
  try { await guard.uploadData(body, { conditions: { ifNoneMatch: "*" } }); }
  catch (error) {
    if (![409, 412].includes(error.statusCode)) throw error;
    if (!(await guard.downloadToBuffer()).equals(body)) fail("COMMISSIONING_REGISTRATION_GUARD_CONFLICT");
  }
  const lease = guard.getBlobLeaseClient();
  await lease.acquireLease(60);
  try {
    const claim = { assertOwned: async () => { await lease.renewLease(); } };
    // Create-only intent survives crashes. No source contents or secrets are copied.
    const intent = deps.containerClient.getBlockBlobClient(`commissioning-registration-intents/${policy.titleId}/${policy.sha256}.json`);
    try { await intent.uploadData(body, { conditions: { ifNoneMatch: "*" } }); }
    catch (error) {
      if (![409, 412].includes(error.statusCode) || !(await intent.downloadToBuffer()).equals(body)) throw error;
    }
    const result = await operation({ ...deps, claim });
    const receipt = deps.containerClient.getBlockBlobClient(`commissioning-registration-results/${policy.titleId}/${policy.sha256}.json`);
    const bytes = Buffer.from(JSON.stringify(result));
    await claim.assertOwned();
    try { await receipt.uploadData(bytes, { conditions: { ifNoneMatch: "*" } }); }
    catch (error) {
      if (![409, 412].includes(error.statusCode) || !(await receipt.downloadToBuffer()).equals(bytes)) fail("COMMISSIONING_REGISTRATION_RESULT_CONFLICT");
    }
    return result;
  } finally { await lease.releaseLease(); }
}
module.exports = { policies, driveId, sourceArtifactId, policyForTitle, verifySourceMetadata, readReceivedSourceProof, readSourceTitle, withRegistrationClaim,
  verifySourceRegistration, registerReceivedSource };
