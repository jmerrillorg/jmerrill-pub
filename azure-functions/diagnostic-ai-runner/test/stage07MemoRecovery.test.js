"use strict";
const test = require("node:test"), assert = require("node:assert/strict");
const { recover } = require("../src/editorial/stage07MemoRecovery");
test("ordinary memos remain exact and unmodified", () => {
  assert.deepEqual(recover({ memo: "Reviewed the source." }), { memo: "Reviewed the source.", recovery: null });
});
test("explicit embedded memo is recovered without modifying original output", () => {
  const output = { memo: "placeholder", noChangeReason: 'Source reviewed.</noChangeReason>\n<parameter name="memo">Exact complete editorial memo.', paragraphs: [{ index: 0, text: "Original." }] };
  const before = JSON.stringify(output), result = recover(output);
  assert.equal(result.memo, "Exact complete editorial memo.");
  assert.equal(output.noChangeReason.slice(result.recovery.sourceOffset), result.memo);
  assert.equal(JSON.stringify(output), before);
  assert.deepEqual(recover(output), result);
});
test("missing, ambiguous, or unfinished memo stays held", () => {
  for (const output of [{ memo: "" }, { memo: "placeholder" }, { memo: "TBD", noChangeReason: "Reviewed." },
    { memo: "placeholder", noChangeReason: 'Reason.</noChangeReason>\n<parameter name="memo">placeholder' },
    { memo: "placeholder", noChangeReason: 'Reason.</noChangeReason>\n<parameter name="memo">Memo.<parameter name="questions">more' }]) {
    assert.throws(() => recover(output), /MEMO_INCOMPLETE/);
  }
});
