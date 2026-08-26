const POLICY_ID = "JM1-ACS-SENDER-IDENTITY-v1";
const HUMAN_FIRST_POLICY_ID = "JM1-HUMAN-FIRST-WHY-FIRST-v1";

const REGISTRY = Object.freeze({
  JM1: profile({
    brand: "JM1",
    acsFrom: "one@email.jmerrill.one",
    replyTo: "one@jmerrill.one",
    replyMailboxAuthority: "info@jmerrill.one",
    replyAddressType: "ALIAS",
    inboundProcessingMailbox: "info@jmerrill.one",
    ccRequired: false,
    ccAddress: null,
    organizationDisplayName: "J Merrill One",
    signatureName: "J Merrill One",
    publicContactIdentity: "one@jmerrill.one",
    website: "jmerrill.one",
    riskPolicy: "ENTERPRISE"
  }),
  JMP: profile({
    brand: "JMP",
    acsFrom: "publishing@email.jmerrill.one",
    replyTo: "publishing@jmerrill.one",
    replyMailboxAuthority: "publishing@jmerrill.one",
    replyAddressType: "MAILBOX",
    inboundProcessingMailbox: "publishing@jmerrill.one",
    ccRequired: true,
    ccAddress: "publishing@jmerrill.one",
    organizationDisplayName: "J Merrill Publishing",
    signatureName: "The Publishing Team",
    publicContactIdentity: "publishing@jmerrill.one",
    website: "jmerrill.pub",
    footerRules: ["Helping Authors Help Themselves."],
    riskPolicy: "PUBLISHING"
  }),
  JMF: profile({
    brand: "JMF",
    acsFrom: "financial@email.jmerrill.one",
    replyTo: "financial@jmerrill.one",
    replyMailboxAuthority: "financial@jmerrill.one",
    replyAddressType: "MAILBOX",
    inboundProcessingMailbox: "financial@jmerrill.one",
    ccRequired: false,
    ccAddress: null,
    organizationDisplayName: "J Merrill Financial",
    signatureName: "J Merrill Financial",
    publicContactIdentity: "financial@jmerrill.one",
    website: "jmerrill.financial",
    riskPolicy: "FINANCIAL"
  }),
  JMFN: profile({
    brand: "JMFN",
    acsFrom: "foundation@email.jmerrill.one",
    replyTo: "foundation@jmerrill.one",
    replyMailboxAuthority: "foundation@jmerrill.one",
    replyAddressType: "MAILBOX",
    inboundProcessingMailbox: "foundation@jmerrill.one",
    ccRequired: false,
    ccAddress: null,
    organizationDisplayName: "J Merrill Foundation",
    signatureName: "J Merrill Foundation",
    publicContactIdentity: "foundation@jmerrill.one",
    website: "jmerrillfoundation.org",
    riskPolicy: "FOUNDATION"
  }),
  JMPRODUCTIONS: profile({
    brand: "JMPRODUCTIONS",
    acsFrom: "productions@email.jmerrill.one",
    replyTo: "productions@jmerrill.one",
    replyMailboxAuthority: "productions@jmerrill.one",
    replyAddressType: "MAILBOX",
    inboundProcessingMailbox: "productions@jmerrill.one",
    ccRequired: false,
    ccAddress: null,
    organizationDisplayName: "J Merrill Productions",
    signatureName: "J Merrill Productions",
    publicContactIdentity: "productions@jmerrill.one",
    website: "jmerrill.productions",
    riskPolicy: "PRODUCTIONS"
  })
});

function profile(input) {
  return Object.freeze({
    policyId: POLICY_ID,
    humanFirstPolicyId: HUMAN_FIRST_POLICY_ID,
    ...input
  });
}

function normalizeBrand(brand) {
  return String(brand || "").trim().toUpperCase();
}

function normalizeAddress(value) {
  return String(value || "").trim().toLowerCase();
}

function getSenderProfile(brand) {
  const normalized = normalizeBrand(brand);
  if (!normalized) return { ok: false, reason: "ACS_BRAND_REQUIRED" };
  if (normalized === "AIC") return { ok: false, reason: "AIC_SENDER_IDENTITY_FOUNDER_DECISION_REQUIRED" };
  const profile = REGISTRY[normalized];
  if (!profile) return { ok: false, reason: "ACS_BRAND_UNKNOWN" };
  return { ok: true, profile };
}

function resolveSenderProfile(brand) {
  const result = getSenderProfile(brand);
  if (!result.ok) {
    throw Object.assign(new Error("ACS sender brand is not configured."), { safeCode: result.reason });
  }
  return result.profile;
}

function validateSenderForBrand({ brand, from }) {
  const result = getSenderProfile(brand);
  if (!result.ok) return result;
  if (normalizeAddress(from) !== result.profile.acsFrom) {
    return { ok: false, reason: "ACS_BRAND_SENDER_MISMATCH", expected: result.profile.acsFrom, actual: normalizeAddress(from), profile: result.profile };
  }
  return { ok: true, profile: result.profile };
}

function validateReplyToForBrand({ brand, replyTo }) {
  const result = getSenderProfile(brand);
  if (!result.ok) return result;
  if (normalizeAddress(replyTo) !== result.profile.replyTo) {
    return { ok: false, reason: "ACS_REPLY_TO_MISMATCH", expected: result.profile.replyTo, actual: normalizeAddress(replyTo), profile: result.profile };
  }
  return { ok: true, profile: result.profile };
}

function validateMessageIdentity({ brand, from, replyTo, cc = [] }) {
  const sender = validateSenderForBrand({ brand, from });
  if (!sender.ok) return sender;
  const reply = validateReplyToForBrand({ brand, replyTo });
  if (!reply.ok) return reply;
  const ccAddresses = Array.isArray(cc) ? cc.map(normalizeAddress).filter(Boolean) : [normalizeAddress(cc)].filter(Boolean);
  if (sender.profile.ccRequired && !ccAddresses.includes(sender.profile.ccAddress)) {
    return { ok: false, reason: "ACS_CC_ARCHIVE_MISSING", expected: sender.profile.ccAddress, profile: sender.profile };
  }
  return { ok: true, profile: sender.profile };
}

function validateSignatureBlock({ brand, text }) {
  const result = getSenderProfile(brand);
  if (!result.ok) return result;
  const content = String(text || "");
  const signature = result.profile.signatureName;
  const count = signature ? content.split(signature).length - 1 : 0;
  if (count > 1) return { ok: false, reason: "ACS_DUPLICATE_SIGNATURE_BLOCKED", profile: result.profile };
  return { ok: true, profile: result.profile };
}

function listSenderProfiles() {
  return Object.values(REGISTRY);
}

module.exports = {
  HUMAN_FIRST_POLICY_ID,
  POLICY_ID,
  getSenderProfile,
  listSenderProfiles,
  resolveSenderProfile,
  validateMessageIdentity,
  validateReplyToForBrand,
  validateSenderForBrand,
  validateSignatureBlock
};
