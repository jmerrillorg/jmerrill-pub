"use strict";

// Governed source: docs/governance/publishing/PUB-STD-Author-Copy-Policy.md
const AUTHOR_COPY_POLICY = Object.freeze({
  "JMP-PKG-STARTER": Object.freeze({ paperback: 5, hardcover: 0, ebook: 1 }),
  "JMP-PKG-PRO": Object.freeze({ paperback: 10, hardcover: 2, ebook: 1 }),
  "JMP-PKG-PREMIER": Object.freeze({ paperback: 15, hardcover: 5, ebook: 1 }),
  "JMP-PKG-SIGNATURE": Object.freeze({ paperback: 15, hardcover: 5, ebook: 1 })
});

function getComplimentaryCopies(packageCode) {
  const code = typeof packageCode === "string" ? packageCode.trim().toUpperCase() : "";
  return AUTHOR_COPY_POLICY[code] || null;
}

module.exports = {
  AUTHOR_COPY_POLICY,
  getComplimentaryCopies
};
