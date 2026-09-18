"use strict";

const OBJECTIVE = "Read authoritative Publishing title state and identify the next certified work candidate while creating no business effect and escalating all consequential decisions.";
const IDENTITY = "func-jm1-diagnostic-ai-runner/system-assigned";
const ALLOWED_CAPABILITIES = Object.freeze([
  "PUBLISHING.INSPECT_TITLE_STATE",
  "PUBLISHING.DISCOVER_NEXT_WORK"
]);
const KNOWN_EFFECT_CAPABILITIES = Object.freeze([
  "PUBLISHING.PAYMENT_ELECTION_REQUIRED",
  "PUBLISHING.RECORD_ROYALTY_MAPPING_DECISION"
]);

const RAW_SYSTEM_PREFIXES = Object.freeze([
  "DATAVERSE.",
  "GRAPH.",
  "ACS.",
  "STRIPE.",
  "PROVIDER.",
  "POWER_AUTOMATE.",
  "SQL.",
  "FILESYSTEM.",
  "BROWSER."
]);

class AgentPolicyError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = "AgentPolicyError";
    this.code = code;
    this.details = details;
  }
}

function authorizeCapability({ capabilityId, identity, objective }) {
  if (identity !== IDENTITY) {
    throw new AgentPolicyError("AUTHORITY_MISMATCH", "The caller identity is not authorized for this Publishing agent policy.");
  }
  if (objective !== OBJECTIVE) {
    throw new AgentPolicyError("POLICY_DENIED", "The requested objective is outside the bounded Publishing read-only objective.");
  }
  if (RAW_SYSTEM_PREFIXES.some((prefix) => capabilityId.startsWith(prefix))) {
    throw new AgentPolicyError("POLICY_DENIED", "Raw system access is not an agent capability.", { capabilityId });
  }
  if (!ALLOWED_CAPABILITIES.includes(capabilityId)) {
    const code = KNOWN_EFFECT_CAPABILITIES.includes(capabilityId)
      ? "EFFECT_CAPABILITY_NOT_AUTHORIZED"
      : "DENIED_UNREGISTERED_CAPABILITY";
    throw new AgentPolicyError(code, "The capability is not present in the Publishing read-only allowlist.", { capabilityId });
  }
  return { authorized: true, capabilityId, effectClass: "READ" };
}

module.exports = {
  AgentPolicyError,
  ALLOWED_CAPABILITIES,
  IDENTITY,
  KNOWN_EFFECT_CAPABILITIES,
  OBJECTIVE,
  authorizeCapability
};
