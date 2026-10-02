"use strict";

const { createHash } = require("node:crypto");
const GUID = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/;
const KEYS = ["schemaVersion", "eventType", "waitId", "sourceEventId", "owner", "evidenceReference"];

function fail(code) { throw Object.assign(new Error(code), { safeCode: code }); }
function signalFor(wait, evidenceReference) {
  if (typeof evidenceReference !== "string" || !evidenceReference || /[\r\n]/.test(evidenceReference)) fail("WAIT_SIGNAL_EVIDENCE_INVALID");
  const waitId = wait.waitId.toLowerCase();
  return validateWaitSignal({ schemaVersion: 1, eventType: "WAIT_RESOLVED", waitId,
    sourceEventId: `resolved_${createHash("sha256").update(`${waitId}:${wait.idempotencyKey}:${evidenceReference}`).digest("hex")}`,
    owner: "jmerrillorg/jmerrill-pub", evidenceReference });
}
function validateWaitSignal(signal) {
  if (!signal || Object.keys(signal).length !== KEYS.length || KEYS.some((key) => !(key in signal)) ||
      signal.schemaVersion !== 1 || signal.eventType !== "WAIT_RESOLVED" || !GUID.test(signal.waitId || "") ||
      !/^resolved_[0-9a-f]{64}$/.test(signal.sourceEventId || "") || signal.owner !== "jmerrillorg/jmerrill-pub" ||
      typeof signal.evidenceReference !== "string" || !signal.evidenceReference || signal.evidenceReference.length > 1024 ||
      signal.evidenceReference.trim() !== signal.evidenceReference || /[\r\n]/.test(signal.evidenceReference)) fail("WAIT_SIGNAL_INVALID");
  return signal;
}
module.exports = { signalFor, validateWaitSignal };
