"use strict";
const { gzipSync, gunzipSync } = require("node:zlib");
const { createHash } = require("node:crypto");
const SCHEMA = "JMP_ONBOARDING_GZIP_V1", FIELD_LIMIT = 2000, EXPANDED_LIMIT = 192000;
const sha = bytes => createHash("sha256").update(bytes).digest("hex");
function encode(payload) {
  const text = JSON.stringify(payload);
  if (Buffer.byteLength(text) > EXPANDED_LIMIT) throw Error("ONBOARDING_PAYLOAD_CAPACITY_EXCEEDED");
  if (text.length <= FIELD_LIMIT) return text;
  const bytes = Buffer.from(text);
  const encoded = JSON.stringify({ schema: SCHEMA, sha256: sha(bytes), bytes: bytes.length, gzip: gzipSync(bytes, { level: 9 }).toString("base64") });
  if (encoded.length > FIELD_LIMIT) throw Error("ONBOARDING_PAYLOAD_CAPACITY_EXCEEDED");
  return encoded;
}
function decode(text) {
  const value = JSON.parse(text);
  if (value?.schema !== SCHEMA) return value;
  if (!/^[a-f0-9]{64}$/.test(value.sha256 || "") || !Number.isSafeInteger(value.bytes) || value.bytes < 1 || value.bytes > EXPANDED_LIMIT ||
      typeof value.gzip !== "string" || !/^[A-Za-z0-9+/]+={0,2}$/.test(value.gzip)) throw Error("ONBOARDING_PAYLOAD_INTEGRITY_FAILED");
  const bytes = gunzipSync(Buffer.from(value.gzip, "base64"), { maxOutputLength: EXPANDED_LIMIT });
  if (bytes.length !== value.bytes || sha(bytes) !== value.sha256) throw Error("ONBOARDING_PAYLOAD_INTEGRITY_FAILED");
  return JSON.parse(bytes.toString("utf8"));
}
module.exports = { encode, decode, SCHEMA, FIELD_LIMIT, EXPANDED_LIMIT };
