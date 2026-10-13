"use strict";
const b = require("./newSubmissionStage03Budget");
const projection = require("./pipelineFolderProjection");
const validation = require("../agreement/acrobatExecutionValidation");
function deny(code) { throw Object.assign(new Error(code), { safeCode: code }); }
async function scan(titleId, deps) {
  const bundle = await require("./publisherFundedStage04").load(titleId, deps);
  const prefix = `publisher-funded/stage05/${titleId}/${bundle.offer.offerSha256}/replacement-v2`;
  const prepared = await require("./publisherFundedStage05").readPrepared(prefix, deps);
  const delivered = (await b.optional(deps.containerClient, `${prefix}/admin-delivery.json`))?.value;
  if (!prepared || !delivered?.delivered || delivered.agreementSha256 !== prepared.agreementSha256) return { titleId, status: "WAITING_ADMIN_DELIVERY" };
  const existing = (await b.optional(deps.containerClient, `${prefix}/execution.json`))?.value;
  if (existing) return { ...existing, replay: true };
  const sent = (await b.read(deps.containerClient, `${prefix}/admin-send.json`)).value;
  const root = await deps.graph(projection.path(sent.folder.id));
  if (root.parentReference?.id !== projection.FOLDERS[titleId]) deny("STAGE05_SIGNED_FOLDER_BINDING_CONFLICT");
  const listing = await deps.graph(`${projection.path(root.id)}/children?$top=100`);
  if (!Array.isArray(listing.value) || listing["@odata.nextLink"] || listing.value.length > 30) deny("STAGE05_SIGNED_FOLDER_CENSUS_INCOMPLETE");
  const candidates = [];
  if (listing.value.filter(x => x.file && /\.pdf$/i.test(x.name)).length > 4) deny("STAGE05_SIGNED_FOLDER_REVIEW_REQUIRED");
  for (const item of listing.value.filter(x => x.file && /\.pdf$/i.test(x.name))) {
    if (!item.eTag || item.size > 25 * 1024 * 1024 || item.parentReference?.id !== root.id) deny("STAGE05_SIGNED_FILE_SCOPE_CONFLICT");
    const bytes = await deps.sourceBytes({ itemId: item.id });
    const after = await deps.graph(projection.path(item.id));
    if (after.eTag !== item.eTag || bytes.length !== item.size) deny("STAGE05_SIGNED_FILE_CHANGED");
    candidates.push({ itemId: item.id, eTag: item.eTag, sha256: b.sha(bytes), bytes });
  }
  if (!candidates.length) return { titleId, status: "AWAITING_REPLACEMENT_EXECUTION", stage05Complete: false };
  const issuedBytes = await deps.containerClient.getBlockBlobClient(prepared.documentReference).downloadToBuffer();
  const matches = [], errors = new Set();
  for (const agreement of candidates) for (const audit of candidates) {
    try {
      const proof = await validation.validateExecution({ signedBytes: agreement.bytes, auditBytes: audit.bytes, issuedBytes, prepared });
      if (!matches.some(m => m.proof.executedSha256 === proof.executedSha256 && m.proof.transactionId === proof.transactionId)) matches.push({ agreement, audit, proof });
    } catch (error) { errors.add(/^STAGE05_[A-Z_]+$/.test(error.safeCode || "") ? error.safeCode : "STAGE05_EXECUTION_VALIDATION_FAILED"); }
  }
  if (matches.length !== 1) {
    const observation = { titleId, status: "EXECUTION_REVIEW_REQUIRED", stage05Complete: false,
      files: candidates.map(({ itemId, eTag, sha256 }) => ({ itemId, eTag, sha256 })), codes: [...errors].sort() };
    await b.immutable(deps.containerClient, `${prefix}/observations/${b.sha(JSON.stringify(observation))}.json`, observation);
    return observation;
  }
  const { agreement, audit, proof } = matches[0];
  for (const [kind, file] of [["executed", agreement], ["audit", audit]]) {
    const blob = deps.containerClient.getBlockBlobClient(`${prefix}/executed/${kind}-${file.sha256}.pdf`);
    try { await blob.uploadData(file.bytes, { conditions: { ifNoneMatch: "*" }, blobHTTPHeaders: { blobContentType: "application/pdf" } }); }
    catch (e) { if (![409, 412].includes(e.statusCode) || !file.bytes.equals(await blob.downloadToBuffer())) throw e; }
  }
  const result = { titleId, offerSha256: prepared.offerSha256, agreementSha256: prepared.agreementSha256,
    authorElectionReference: prepared.authorElectionReference,
    proof, sourceItems: [agreement, audit].map(({ itemId, eTag, sha256 }) => ({ itemId, eTag, sha256 })),
    status: "REPLACEMENT_EXECUTION_VERIFIED", stage05Complete: true, authorDueCents: 0,
    authorPaymentDisposition: "NOT_APPLICABLE_PUBLISHER_FUNDED", paymentCreated: false,
    stage06: "AWAITING_AUTHOR_ONBOARDING", reference: `${prefix}/execution.json` };
  await b.immutable(deps.containerClient, `${prefix}/execution.json`, result);
  return result;
}
async function monitor(supplied = {}) {
  const owner = require("./publisherFundedStage05"), env = supplied.env || process.env;
  const results = [];
  const ids = Object.keys(require("./jackieInternalTitlePolicy").TITLES);
  for (const titleId of [ids[Math.floor(Date.now() / 300000) % ids.length]]) {
    if (!owner.enabled(env, titleId)) continue;
    try {
      const deps = await require("./newSubmissionStage01").native(supplied);
      if ((await deps.containerClient.getProperties()).blobPublicAccess) deny("STAGE05_PRIVATE_STORAGE_REQUIRED");
      results.push(await scan(titleId, deps));
    } catch (error) { results.push({ titleId, status: "HELD", code: /^STAGE05_[A-Z_]+$/.test(error.safeCode || "") ? error.safeCode : "STAGE05_EXECUTION_DEPENDENCY_FAILED" }); }
  }
  return results;
}
module.exports = { scan, monitor };
