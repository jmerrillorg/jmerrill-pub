"use strict";
const fs = require("node:fs");
const path = require("node:path");
const { createHash } = require("node:crypto");
const { reconcilePortfolioContactReference } = require("../src/mail/portfolioContactReference");

const [titleFile, contactFile, profileFile, outputDirectory] = process.argv.slice(2);
if (!titleFile || !contactFile || !profileFile || !outputDirectory) {
  throw new Error("Usage: node reconcile-portfolio-contact-references.js titles.json contacts.json profiles.json NEW_OUTPUT_DIRECTORY");
}
const sources = [titleFile, contactFile, profileFile].map(file => {
  const bytes = fs.readFileSync(file);
  const rows = JSON.parse(bytes);
  if (!Array.isArray(rows)) throw new Error("Expected a complete collection array: " + file);
  return { file: path.resolve(file), sha256: createHash("sha256").update(bytes).digest("hex"), rows };
});
for (const [index, key] of ["jm1pub_titleid", "contactid", "jm1_authorprofileid"].entries()) {
  const ids = sources[index].rows.map(row => row[key]?.toLowerCase());
  if (ids.some(id => !id) || new Set(ids).size !== ids.length) throw new Error("Missing or duplicate source IDs: " + key);
}
const [titles, contacts, profiles] = sources.map(source => source.rows);
const rows = titles.map(title => reconcilePortfolioContactReference(title, contacts, profiles));
const summary = {
  titleRows: rows.length,
  sourceContactRows: contacts.length,
  sourceProfileRows: profiles.length,
  contactBoundTitleRows: rows.filter(row => row.contactBound).length,
  distinctReferencedContactIds: new Set(rows.flatMap(row => row.referencedContactIds)).size,
  missingContactIds: [...new Set(rows.flatMap(row => row.missingContactIds))],
  fieldParity: rows.reduce((counts, row) => ({ ...counts, [row.fieldParity]: (counts[row.fieldParity] || 0) + 1 }), {}),
  sourceCoverageCertified: false,
  businessIdentityCertified: false,
  productionMutations: 0,
};
// Source receipts must separately establish pagination and coverage; joins cannot do that.
fs.mkdirSync(outputDirectory);
fs.writeFileSync(path.join(outputDirectory, "contact-sweep.json"), JSON.stringify(rows, null, 2));
fs.writeFileSync(path.join(outputDirectory, "summary.json"), JSON.stringify(summary, null, 2));
fs.writeFileSync(path.join(outputDirectory, "sources.json"), JSON.stringify(sources.map(({ rows, ...source }) => ({ ...source, count: rows.length })), null, 2));
console.log(JSON.stringify(summary));
