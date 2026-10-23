"use strict";
const { createHash } = require("node:crypto");
const custody = new WeakMap();
const HISTORICAL_POLICY = Object.freeze({
  version: "JMP-STAGE04-INTERNAL-MAIL-20261012-v1",
  tenantId: "352d075e-8e17-4169-9f8e-22e6946ce66d",
  applicationId: "dc8d1429-8c1b-473b-83ca-f9545fad8074",
  mailbox: "publishing@jmerrill.one",
  mailboxId: "8a519ced-ddf5-4d1d-92ce-66a79de23ed4",
  author: "jackie@jmerrill.one",
  authorMailboxId: "9586f34b-b5f3-437b-bc64-3e44d2518427",
  checkedAt: "2026-10-12T21:06:09.790Z",
  expiresAt: "2026-10-13T21:05:01.804Z"
});
// Fresh administrator readbacks, not an extension of the expired attestation.
const POLICY = Object.freeze({ ...HISTORICAL_POLICY,
  version: "JMP-INTERNAL-MAIL-20261019-v2",
  checkedAt: "2026-10-19T01:27:01.445Z",
  expiresAt: "2026-10-20T01:26:30.942Z",
  evidence: ["stage04-exchange-scope-2026-10-19T01-26-30-942Z.json", "stage04-exchange-scope-2026-10-19T01-27-01-445Z.json"]
});
const digest = value => createHash("sha256").update(value).digest("hex");
function one(message, name) {
  const values = (message.internetMessageHeaders || []).filter(h => h.name.toLowerCase() === name);
  return values.length === 1 ? values[0].value.trim() : null;
}
function bindCustody(message, mailbox, attestation = null) {
  if (mailbox === POLICY.mailbox) custody.set(message, { mailbox, policy:attestation });
  return message;
}
function authenticate(message, now = Date.now()) {
  const bound=custody.get(message), policy=bound?.policy;
  if (bound?.mailbox !== POLICY.mailbox || !policy || now < Date.parse(policy.checkedAt) || now >= Date.parse(policy.expiresAt)) return null;
  if (message.from?.emailAddress?.address?.toLowerCase() !== POLICY.author ||
      message.sender?.emailAddress?.address?.toLowerCase() !== POLICY.author ||
      one(message, "x-ms-exchange-organization-authas") !== "Internal" ||
      one(message, "x-ms-exchange-organization-authmechanism") !== "04") return null;
  const source = one(message, "x-ms-exchange-organization-authsource");
  const networkId = one(message, "x-ms-exchange-organization-network-message-id");
  const received = (message.internetMessageHeaders || []).filter(h => h.name.toLowerCase() === "received").map(h => h.value);
  // This bounded policy relies on a verified no-connector/no-header-rule tenant.
  // Require native mailbox custody and a complete Microsoft mailbox-origin chain,
  // not an Internal header supplied independently by a caller.
  if (!/^[a-z0-9]+\.namprd[0-9]+\.prod\.outlook\.com$/i.test(source || "") ||
      !/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(networkId || "") ||
      received.length < 2 || received.length > 8 ||
      !received.every(value => /^from [a-z0-9]+\.namprd[0-9]+\.prod\.outlook\.com\b[\s\S]*\bby [a-z0-9]+\.namprd[0-9]+\.prod\.outlook\.com\b/i.test(value)) ||
      !received.at(-1).toLowerCase().startsWith(`from ${source.toLowerCase()} `) ||
      !/\bwith mapi\b/i.test(received.at(-1)) ||
      (message.internetMessageHeaders || []).some(h => /^(resent-|x-ms-exchange-crosspremises-)/i.test(h.name) ||
        h.name.toLowerCase() === "authentication-results" && /\b(?:dmarc|dkim|spf)=(?:fail|softfail|permerror|temperror)\b/i.test(h.value))) return null;
  return { method: "TENANT_VERIFIED_INTERNAL_MAILBOX", policyVersion: policy.version,
    mailboxId: POLICY.mailboxId, authorMailboxId: POLICY.authorMailboxId,
    networkMessageId: networkId, headerSha256: digest(JSON.stringify(received)),
    dmarc: "NOT_APPLICABLE_INTERNAL", spf: "NOT_APPLICABLE_INTERNAL", dkim: "NOT_APPLICABLE_INTERNAL" };
}
module.exports = { POLICY, HISTORICAL_POLICY, bindCustody, authenticate };
