"use strict";
const { createHash } = require("node:crypto");
const POLICY = "ONBOARDING_ACCESS_SYNTHETIC_V1";
const WEBSITE = "e0e307e1-2fb0-f111-aaac-000d3a14673b", PROCESSOR = "cb6e97e5-1d6a-f111-a826-000d3a9eacee";
function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object") return Object.fromEntries(Object.keys(value).sort().map(k => [k, canonical(value[k])]));
  return value;
}
const hash = value => createHash("sha256").update(JSON.stringify(canonical(value))).digest("hex");
function configuration(env = process.env, now = Date.now()) {
  const key = env.JM1_ONBOARDING_ACCESS_ACCEPTANCE_KEY || "", expiry = Date.parse(env.JM1_ONBOARDING_ACCESS_ACCEPTANCE_EXPIRES_AT || "");
  if (!/^[a-f0-9]{32}$/.test(key) || !Number.isFinite(expiry) || expiry <= now || expiry > now + 4 * 3600000) throw Error("ONBOARDING_ACCEPTANCE_DISABLED");
  return { key, expiry };
}
function payloadFor(key) {
  return { authorName: "SYNTHETIC ACCESS ACCEPTANCE", bookTitle: `SYNTHETIC ONBOARDING ACCESS ${key}`,
    email: "onboarding-acceptance@example.invalid", rightsHolderConfirmed: false,
    shortDescription: "Internal access-boundary fixture. Not an author submission or a title. No attestations, communications, payments or stage changes.",
    governedAuthority: { policyVersion: POLICY, fixtureKey: key },
    rawFormData: { synthetic: true, fixtureKey: key, purpose: "EXACT_RECORD_READ_ACCESS_ACCEPTANCE" } };
}
function validatePayload(payload, env = process.env) {
  try { const c = configuration(env); return hash(payload) === hash(payloadFor(c.key)); } catch { return false; }
}
function submissionId(key) {
  const p = payloadFor(key), identity = [POLICY, p.email, p.bookTitle, "", hash(p.rawFormData)].join(":").toLowerCase();
  const h = createHash("sha256").update(`attempt:${identity}`).digest("hex").slice(0,32).split("");
  h[12] = "5"; h[16] = ((parseInt(h[16],16)&3)|8).toString(16);
  return `${h.slice(0,8).join("")}-${h.slice(8,12).join("")}-${h.slice(12,16).join("")}-${h.slice(16,20).join("")}-${h.slice(20).join("")}`;
}
module.exports = { POLICY, WEBSITE, PROCESSOR, configuration, payloadFor, validatePayload, submissionId, hash };
