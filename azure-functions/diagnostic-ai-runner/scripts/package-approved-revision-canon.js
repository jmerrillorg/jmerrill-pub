"use strict";
const fs = require("node:fs");
const path = require("node:path");
const { readVerifiedSkill, lock } = require("../src/editorial/approvedRevisionSkill");

async function packageCanon(repoRoot, packageRoot) {
  const bytes = new Map();
  await readVerifiedSkill((name) => {
    const value = fs.readFileSync(path.join(repoRoot, lock.sourceRoot, name));
    bytes.set(name, value);
    return value;
  });
  for (const [name, value] of bytes) {
    const dest = path.join(packageRoot, "config/jm1-publishing-editorial", name);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, value);
  }
  const review = require("../config/commissioning-editorial-review-canon.json");
  const reviewBytes = fs.readFileSync(path.join(repoRoot, review.sourceRoot, review.file));
  if (require("node:crypto").createHash("sha256").update(reviewBytes).digest("hex") !== review.sha256) {
    throw new Error("REVIEW_PACKAGED_CANON_CHECKSUM_MISMATCH");
  }
  const reviewDest = path.join(packageRoot, "config/jm1-publishing-editorial", review.file);
  fs.mkdirSync(path.dirname(reviewDest), { recursive: true });
  fs.writeFileSync(reviewDest, reviewBytes);
}
if (require.main === module) {
  if (process.argv.length !== 4) throw new Error("Repository and package paths required");
  packageCanon(process.argv[2], process.argv[3]).catch((e) => { console.error(e.safeCode || e.message); process.exitCode = 1; });
}
module.exports = { packageCanon };
