"use strict";

/**
 * Focused tests for isApprovedInternalAddress's domain/subdomain matching.
 *
 * Fixes a bug where the live configured sender (DoNotReply@email.jmerrill.one
 * — a verified ACS subdomain) was incorrectly rejected because the original
 * check required the literal "@jmerrill.one" suffix, which a subdomain
 * address can never satisfy.
 */

const { describe, test } = require("node:test");
const assert = require("node:assert/strict");
const { isApprovedInternalAddress } = require("../src/author/authorResponseSendProviderConfig");

describe("isApprovedInternalAddress — exact domain (unchanged behavior)", () => {
  test("accepts publishing@jmerrill.one", () => {
    assert.equal(isApprovedInternalAddress("publishing@jmerrill.one"), true);
  });

  test("accepts an exact-domain address case-insensitively", () => {
    assert.equal(isApprovedInternalAddress("Publishing@JMerrill.One"), true);
  });

  test("rejects publishing@jmerrill.pub", () => {
    assert.equal(isApprovedInternalAddress("publishing@jmerrill.pub"), false);
  });
});

describe("isApprovedInternalAddress — subdomain support (the fix)", () => {
  test("accepts the live configured sender DoNotReply@email.jmerrill.one", () => {
    assert.equal(isApprovedInternalAddress("DoNotReply@email.jmerrill.one"), true);
  });

  test("accepts an arbitrary single-level subdomain of jmerrill.one", () => {
    assert.equal(isApprovedInternalAddress("noreply@mail.jmerrill.one"), true);
  });

  test("accepts a multi-level subdomain of jmerrill.one", () => {
    assert.equal(isApprovedInternalAddress("noreply@a.b.jmerrill.one"), true);
  });
});

describe("isApprovedInternalAddress — forbidden domain rejection (including subdomains)", () => {
  test("rejects a subdomain of jmerrill.pub", () => {
    assert.equal(isApprovedInternalAddress("noreply@email.jmerrill.pub"), false);
  });

  test("rejects jmerrill.pub case-insensitively", () => {
    assert.equal(isApprovedInternalAddress("noreply@EMAIL.JMERRILL.PUB"), false);
  });
});

describe("isApprovedInternalAddress — lookalike domain rejection", () => {
  test("rejects a domain that merely contains jmerrill.one as a substring without a boundary", () => {
    assert.equal(isApprovedInternalAddress("attacker@notjmerrill.one"), false);
  });

  test("rejects jmerrill.one used as a prefix of a different domain", () => {
    assert.equal(isApprovedInternalAddress("attacker@jmerrill.one.evil.com"), false);
  });

  test("rejects an address with no @ at all", () => {
    assert.equal(isApprovedInternalAddress("not-an-email"), false);
  });

  test("rejects an empty or non-string value", () => {
    assert.equal(isApprovedInternalAddress(""), false);
    assert.equal(isApprovedInternalAddress(null), false);
    assert.equal(isApprovedInternalAddress(undefined), false);
  });

  test("rejects a completely unrelated domain", () => {
    assert.equal(isApprovedInternalAddress("someone@gmail.com"), false);
  });
});
