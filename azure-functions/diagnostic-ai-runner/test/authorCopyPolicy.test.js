"use strict";

const { describe, test } = require("node:test");
const assert = require("node:assert/strict");
const { AUTHOR_COPY_POLICY, getComplimentaryCopies } = require("../src/agreement/authorCopyPolicy");

describe("AUTHOR_COPY_POLICY", () => {
  test("returns the governed Starter complimentary-copy policy", () => {
    assert.deepEqual(getComplimentaryCopies("JMP-PKG-STARTER"), { paperback: 5, hardcover: 0, ebook: 1 });
  });

  test("returns the governed Professional complimentary-copy policy", () => {
    assert.deepEqual(getComplimentaryCopies("JMP-PKG-PRO"), { paperback: 10, hardcover: 2, ebook: 1 });
  });

  test("returns the governed Premier complimentary-copy policy", () => {
    assert.deepEqual(getComplimentaryCopies("JMP-PKG-PREMIER"), { paperback: 15, hardcover: 5, ebook: 1 });
  });

  test("returns the governed JM Signature traditional-track complimentary-copy policy", () => {
    assert.deepEqual(getComplimentaryCopies("JMP-PKG-SIGNATURE"), { paperback: 15, hardcover: 5, ebook: 1 });
  });

  test("keeps Premier package and JM Signature track identities distinct", () => {
    assert.notEqual(AUTHOR_COPY_POLICY["JMP-PKG-PREMIER"], AUTHOR_COPY_POLICY["JMP-PKG-SIGNATURE"]);
    assert.deepEqual(AUTHOR_COPY_POLICY["JMP-PKG-PREMIER"], AUTHOR_COPY_POLICY["JMP-PKG-SIGNATURE"]);
  });
});
