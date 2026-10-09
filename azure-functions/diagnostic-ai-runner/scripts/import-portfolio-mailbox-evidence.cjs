"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { validateEvidenceImport } = require("../src/mail/portfolioMailboxEvidenceImport");

const [source, destination] = process.argv.slice(2);
if (!source || !destination) throw new Error("Usage: node scripts/import-portfolio-mailbox-evidence.cjs <downloaded-run-directory> <new-evidence-directory>");
const load = (name) => JSON.parse(fs.readFileSync(path.join(source, name), "utf8"));
const manifest = load("manifest.json");
const document = load("mail-events.json");
const coverage = load("folder-coverage.json");
const receipt = validateEvidenceImport(manifest, document, coverage);
// Never overwrite the 342-row baseline or an earlier imported run.
fs.mkdirSync(destination, { recursive: false });
fs.writeFileSync(path.join(destination, "mail-events.jsonl"), document.events.map((event) => JSON.stringify(event)).join("\n") + "\n", { flag: "wx" });
fs.writeFileSync(path.join(destination, "exceptions.json"), JSON.stringify({ conflicts: document.conflicts,
  unresolvedTitleEvents: document.events.filter((event) => !event.titleId || !event.authorId).map((event) => ({
    graphMessageId: event.graphMessageId, sourceMailbox: event.sourceMailbox, internetMessageId: event.internetMessageId
  })) }, null, 2), { flag: "wx" });
fs.writeFileSync(path.join(destination, "import-receipt.json"), JSON.stringify({ ...receipt, sourceDirectory: path.resolve(source), manifest }, null, 2), { flag: "wx" });
console.log(JSON.stringify(receipt));
