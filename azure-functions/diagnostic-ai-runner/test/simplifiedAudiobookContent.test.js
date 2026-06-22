"use strict";

const { describe, test } = require("node:test");
const assert = require("node:assert/strict");
const { buildSimplifiedAudiobookSection, NARRATION_PATH } = require("../src/agreement/simplifiedAudiobookContent");

describe("buildSimplifiedAudiobookSection — audiobook included (Professional Package)", () => {
  test("AI narration is the primary election with no additional fee", () => {
    const result = buildSimplifiedAudiobookSection({ packageCode: "JMP-PKG-PRO", audiobookIncludedInPackage: true });
    assert.equal(result.primaryElection, NARRATION_PATH.AI_INCLUDED);
    assert.ok(result.primaryElectionLabel.toLowerCase().includes("ai narration"));
    assert.ok(result.feeNote.includes("no additional $699 fee"));
  });

  test("human narration, royalty share, and distribution-only appear only as alternate paths", () => {
    const result = buildSimplifiedAudiobookSection({ packageCode: "JMP-PKG-PRO", audiobookIncludedInPackage: true });
    const paths = result.alternatePaths.map((p) => p.path);
    assert.ok(paths.includes(NARRATION_PATH.HUMAN_NARRATION_ADDON));
    assert.ok(paths.includes(NARRATION_PATH.ROYALTY_SHARE_ADDON));
    assert.ok(paths.includes(NARRATION_PATH.DISTRIBUTION_ONLY_ADDON));
    for (const path of result.alternatePaths) {
      assert.ok(path.whenApplicable.length > 0);
    }
  });

  test("preserves the legal audiobook authorization substance", () => {
    const result = buildSimplifiedAudiobookSection({ packageCode: "JMP-PKG-PRO", audiobookIncludedInPackage: true });
    const lower = result.legalAuthorizationNote.toLowerCase();
    assert.ok(lower.includes("authorizes"));
    assert.ok(lower.includes("distribut"));
  });
});

describe("buildSimplifiedAudiobookSection — audiobook not included", () => {
  test("has no primary election and notes the add-on availability instead", () => {
    const result = buildSimplifiedAudiobookSection({ packageCode: "JMP-PKG-STARTER", audiobookIncludedInPackage: false });
    assert.equal(result.primaryElection, null);
    assert.ok(result.feeNote.toLowerCase().includes("not included"));
  });
});
