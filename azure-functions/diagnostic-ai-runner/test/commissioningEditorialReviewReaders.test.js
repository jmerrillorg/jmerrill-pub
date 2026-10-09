"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs"), path = require("node:path"), { createHash } = require("node:crypto");
const { createCommissioningEditorialReviewReaders: readers } = require("../src/editorial/commissioningEditorialReviewReaders");
const { verifyReviewAuthority } = require("../src/editorial/commissioningEditorialReviewContract");
const canon = require("../config/commissioning-editorial-review-canon.json");
function fixture() {
  const content = "Approved global knowledge";
  const deps = { readReviewCanon: () => fs.readFileSync(path.resolve(__dirname, "../../..", canon.sourceRoot, canon.file)),
    verifyKnowledgeBlob: async () => ({ reachable: true, hashMatched: true, content,
      calculatedSha256: createHash("sha256").update(content).digest("hex") }),
    client: { first: async () => ({ jm1pub_titleid: "title", jm1pub_titlename: "Fixture" }), list: async () => [] }
  };
  return deps;
}
test("review reuses pinned canon and live verified knowledge; missing title context is explicit", async () => {
  const result = await readers(fixture()).readReviewAuthority("title", "a".repeat(64));
  assert.equal(verifyReviewAuthority(result, "title", "a".repeat(64)).length, 2);
  assert.deepEqual(result.missingContext, ["TITLE_STYLE_SHEET", "VOICE_PROFILE", "TITLE_RULINGS"]);
  assert.equal(result.assessmentBoundary, "INITIAL_REVIEW_ONLY_NOT_EDITING_AUTHORITY");
});
test("missing or altered canon and unverified global knowledge fail closed", async () => {
  const altered = fixture(); altered.readReviewCanon = () => Buffer.from("altered");
  await assert.rejects(readers(altered).readReviewAuthority("title", "a".repeat(64)), /CANON_UNVERIFIED/);
  const unreachable = fixture(); unreachable.verifyKnowledgeBlob = async () => ({ reachable: false });
  await assert.rejects(readers(unreachable).readReviewAuthority("title", "a".repeat(64)), /DEPENDENCY_UNAVAILABLE/);
  const mismatched = fixture(); mismatched.verifyKnowledgeBlob = async () => ({ reachable: true, hashMatched: false });
  await assert.rejects(readers(mismatched).readReviewAuthority("title", "a".repeat(64)), /GLOBAL_STYLE_GUIDE_NOT_VERIFIED/);
});
test("multiple approved title authorities and cross-title source records deny", async () => {
  const x = fixture(), row = { jm1pub_artifacttype: 196650007, statecode: 0, jm1pub_iscurrentapproved: true };
  x.client.list = async () => [row, row];
  await assert.rejects(readers(x).readReviewAuthority("title", "a".repeat(64)), /AUTHORITY_CONFLICT/);
  x.client.list = async () => [{ ...row, _jm1pub_titleid_value: "other" }];
  await assert.rejects(readers(x).readReviewAuthority("title", "a".repeat(64)), /IDENTITY_INVALID/);
});
