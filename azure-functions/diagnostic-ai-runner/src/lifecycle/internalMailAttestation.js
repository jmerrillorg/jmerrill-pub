"use strict";
const { createHash } = require("node:crypto");
const PATH = "security/internal-mail/active-attestation.json";
const MAX_AGE_MS = 24 * 60 * 60 * 1000;
const identity = Object.freeze({
  tenantId: "352d075e-8e17-4169-9f8e-22e6946ce66d",
  applicationId: "dc8d1429-8c1b-473b-83ca-f9545fad8074",
  mailbox: "publishing@jmerrill.one", mailboxId: "8a519ced-ddf5-4d1d-92ce-66a79de23ed4",
  author: "jackie@jmerrill.one", authorMailboxId: "9586f34b-b5f3-437b-bc64-3e44d2518427"
});
function validate(record, now = Date.now()) {
  if (!record || record.schemaVersion !== 1 || record.method !== "AUTHORIZED_EXCHANGE_ADMIN_READBACK" ||
      Object.entries(identity).some(([key,value]) => record[key] !== value)) throw Error("INTERNAL_MAIL_ATTESTATION_IDENTITY_INVALID");
  const start = Date.parse(record.checkedAt), end = Date.parse(record.expiresAt);
  if (!Number.isFinite(start) || !Number.isFinite(end) || start > now || end <= now || end <= start || end-start > MAX_AGE_MS)
    throw Error("INTERNAL_MAIL_ATTESTATION_EXPIRED_OR_INVALID");
  const { trust, identities } = record.evidence || {};
  if (!trust || !identities || !/^[a-f0-9]{64}$/.test(trust.sha256 || "") || !/^[a-f0-9]{64}$/.test(identities.sha256 || "") ||
      trust.value?.status !== "TRUST_READ_COMPLETE" || identities.value?.status !== "IDENTITY_READ_COMPLETE" ||
      !Array.isArray(trust.value.connectors) || trust.value.connectors.length || !Array.isArray(trust.value.rules) ||
      trust.value.rules.some(r => r.State !== "Disabled" || r.SetHeaderName || r.SetHeaderValue || r.RemoveHeader))
    throw Error("INTERNAL_MAIL_ATTESTATION_TRUST_INVALID");
  for (const evidence of [trust, identities]) {
    const time = Date.parse(evidence.recordedAt);
    if (!Number.isFinite(time) || time > start || start-time > 15*60*1000 ||
        createHash("sha256").update(JSON.stringify(evidence.value)).digest("hex") !== evidence.sha256)
      throw Error("INTERNAL_MAIL_ATTESTATION_EVIDENCE_INVALID");
  }
  const boxes = identities.value.mailboxes, scopes = identities.value.rbac, access=identities.value.applicationAccess;
  if (!Array.isArray(boxes) || !Array.isArray(scopes) || !Array.isArray(access)) throw Error("INTERNAL_MAIL_ATTESTATION_SCOPE_INVALID");
  for (const [address,id,allowed] of [[identity.mailbox,identity.mailboxId,true],[identity.author,identity.authorMailboxId,false]]) {
    const found = boxes.filter(x => x.PrimarySmtpAddress === address);
    const scope = scopes.filter(x => x.Mailbox === address);
    const aad=access.filter(x=>x.MailboxId===id&&x.AppId===identity.applicationId);
    if (found.length !== 1 || found[0].ExternalDirectoryObjectId !== id || scope.length !== 1 ||
        !Array.isArray(scope[0].Result) || scope[0].Result.length !== 1 ||
        scope[0].Result[0].RoleName !== "Application Mail.Read" ||
        scope[0].Result[0].AllowedResourceScope !== "JM1-Publishing-Inbound-UAT-Mailbox" ||
        String(scope[0].Result[0].InScope).toLowerCase() !== String(allowed) ||
        aad.length!==1 || aad[0].AccessCheckResult!==(allowed?"Granted":"Denied"))
      throw Error("INTERNAL_MAIL_ATTESTATION_SCOPE_INVALID");
  }
  return Object.freeze({...identity, checkedAt:record.checkedAt, expiresAt:record.expiresAt,
    version:`JMP-INTERNAL-MAIL-${createHash("sha256").update(JSON.stringify(record)).digest("hex")}`});
}
async function load(containerClient) {
  if (!containerClient) throw Error("INTERNAL_MAIL_ATTESTATION_STORAGE_REQUIRED");
  if ((await containerClient.getProperties()).blobPublicAccess) throw Error("INTERNAL_MAIL_ATTESTATION_STORAGE_NOT_PRIVATE");
  const blob=containerClient.getBlockBlobClient(PATH);
  try {
    const props=await blob.getProperties();
    if (props.contentLength > 65536) throw Error("INTERNAL_MAIL_ATTESTATION_SIZE_INVALID");
    return validate(JSON.parse((await blob.downloadToBuffer(0,undefined,{conditions:{ifMatch:props.etag}})).toString()));
  } catch(e) {
    if(e.statusCode===404)throw Error("INTERNAL_MAIL_ATTESTATION_MISSING");
    throw e;
  }
}
module.exports={PATH,MAX_AGE_MS,identity,validate,load};
