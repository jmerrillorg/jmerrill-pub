"use strict";

const { createHash } = require("node:crypto");

/**
 * Computes the SHA-256 hex digest of a buffer. Pure — no I/O.
 * @param {Buffer} buffer
 * @returns {string} lowercase hex digest
 */
function computeSha256(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

module.exports = { computeSha256 };
