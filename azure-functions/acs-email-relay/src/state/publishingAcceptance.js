"use strict";
const { communicationAcceptance } = require("../generated/communications/publishing-communication-acceptance");

async function resolvePublishingAcceptance(entity, ledger, deps = {}) {
  if (entity.brand !== "JMP") return {};
  if (!entity.mailboxVerifiedAt) {
    let nativeMessage = null;
    let runtimeFailure = "";
    const url = (deps.env || process.env).JM1_PUBLISHING_ACCEPTANCE_VERIFIER_URL;
    const key = (deps.env || process.env).JM1_RELAY_API_KEY;
    if (url && key) {
      try {
        const response = await (deps.fetchImpl || fetch)(url, { method: "POST",
          headers: { "Content-Type": "application/json", "x-jm1-relay-key": key },
          body: JSON.stringify({ communicationId: entity.jm1MessageId }), signal: AbortSignal.timeout(20000) });
        const proof = await response.json();
        if (response.ok) {
          nativeMessage = proof.nativeMessage || null;
        } else runtimeFailure = proof.code || "NATIVE_VERIFIER_REJECTED";
      } catch { runtimeFailure = "NATIVE_VERIFIER_UNAVAILABLE"; }
    } else runtimeFailure = "NATIVE_VERIFIER_CONFIG_MISSING";
    if (entity.verificationRequired) entity = await ledger.recordVerification(entity, nativeMessage, undefined, runtimeFailure);
  }
  return { ...communicationAcceptance(entity), verificationRuntimeFailure: entity.verificationRuntimeFailure || "" };
}
module.exports = { resolvePublishingAcceptance };
