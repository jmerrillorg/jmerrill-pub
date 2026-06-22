"use strict";

const { describe, test } = require("node:test");
const assert = require("node:assert/strict");
const { computeSha256 } = require("../src/agreement/templateHasher");

describe("computeSha256", () => {
  test("produces the known SHA-256 digest for an empty buffer", () => {
    assert.equal(computeSha256(Buffer.from("")), "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855");
  });

  test("produces the known SHA-256 digest for a simple string buffer", () => {
    assert.equal(computeSha256(Buffer.from("hello")), "2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824");
  });

  test("is deterministic — the same content always hashes the same", () => {
    const a = computeSha256(Buffer.from("Establishing Glory"));
    const b = computeSha256(Buffer.from("Establishing Glory"));
    assert.equal(a, b);
  });

  test("different content produces different hashes", () => {
    const a = computeSha256(Buffer.from("content A"));
    const b = computeSha256(Buffer.from("content B"));
    assert.notEqual(a, b);
  });

  test("returns a 64-character lowercase hex string", () => {
    const hash = computeSha256(Buffer.from("test"));
    assert.equal(hash.length, 64);
    assert.match(hash, /^[0-9a-f]{64}$/);
  });
});
