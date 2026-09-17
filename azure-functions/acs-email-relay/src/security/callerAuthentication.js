"use strict";

const { timingSafeEqual } = require("node:crypto");
const {
  authorizeCallerForBrand,
  findCallerByObjectId,
  getLegacyCaller
} = require("../policy/callerRegistry");

function getHeader(request, name) {
  if (!request || !request.headers || typeof request.headers.get !== "function") return "";
  return String(request.headers.get(name) || "").trim();
}

function decodeClientPrincipal(value) {
  if (!value) return null;
  try {
    const parsed = JSON.parse(Buffer.from(value, "base64").toString("utf8"));
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch (_error) {
    return null;
  }
}

function claimValue(principal, types) {
  const claims = Array.isArray(principal?.claims) ? principal.claims : [];
  const normalizedTypes = types.map((type) => type.toLowerCase());
  const match = claims.find((claim) => normalizedTypes.includes(String(claim?.typ || "").toLowerCase()));
  return String(match?.val || "").trim();
}

function constantTimeEqual(actual, expected) {
  const actualBuffer = Buffer.from(String(actual || ""));
  const expectedBuffer = Buffer.from(String(expected || ""));
  return actualBuffer.length === expectedBuffer.length && timingSafeEqual(actualBuffer, expectedBuffer);
}

function authenticateWorkload(request) {
  const encodedPrincipal = getHeader(request, "x-ms-client-principal");
  const principal = decodeClientPrincipal(encodedPrincipal);
  if (!principal) return { ok: false, reason: encodedPrincipal ? "CALLER_PRINCIPAL_INVALID" : "CALLER_PRINCIPAL_MISSING" };

  const headerPrincipalId = getHeader(request, "x-ms-client-principal-id");
  const claimPrincipalId = claimValue(principal, [
    "oid",
    "http://schemas.microsoft.com/identity/claims/objectidentifier"
  ]);
  const principalId = headerPrincipalId || claimPrincipalId;
  if (!principalId || (headerPrincipalId && claimPrincipalId && headerPrincipalId.toLowerCase() !== claimPrincipalId.toLowerCase())) {
    return { ok: false, reason: "CALLER_PRINCIPAL_INVALID" };
  }

  const caller = findCallerByObjectId(principalId);
  if (!caller) return { ok: false, reason: "UNKNOWN_CALLER", principalId };
  return { ok: true, caller, authModel: "ENTRA_WORKLOAD_IDENTITY", principalId };
}

function authenticateLegacyKey(request) {
  const expected = process.env.JM1_RELAY_API_KEY;
  const actual = getHeader(request, "x-jm1-relay-key");
  if (!expected || !actual || !constantTimeEqual(actual, expected)) return { ok: false, reason: "ANONYMOUS_OR_INVALID_CALLER" };
  const caller = getLegacyCaller();
  if (!caller) return { ok: false, reason: "LEGACY_CALLER_NOT_REGISTERED" };
  return { ok: true, caller, authModel: "LEGACY_SHARED_KEY", principalId: null };
}

function authenticateCaller(request) {
  const hasPlatformPrincipal = Boolean(getHeader(request, "x-ms-client-principal") || getHeader(request, "x-ms-client-principal-id"));
  return hasPlatformPrincipal ? authenticateWorkload(request) : authenticateLegacyKey(request);
}

function authenticateAndAuthorize(request, brand) {
  const authentication = authenticateCaller(request);
  if (!authentication.ok) return authentication;
  const authorization = authorizeCallerForBrand(authentication.caller, brand);
  if (!authorization.ok) return { ...authorization, authModel: authentication.authModel };
  return {
    ok: true,
    caller: authentication.caller,
    authModel: authentication.authModel,
    principalId: authentication.principalId,
    brand: authorization.brand
  };
}

module.exports = {
  authenticateAndAuthorize,
  authenticateCaller,
  decodeClientPrincipal
};
