"use strict";
const { createHash } = require("node:crypto");
const sha = bytes => createHash("sha256").update(bytes).digest("hex");
async function assemble({ source, working, plan, tasks, results, original, planSha256 }) {
  const edits = tasks.filter(t => t.pass === "EDIT").map(t => results.get(t.id));
  if (tasks.some(t => !results.has(t.id))) throw Error("STAGE07_PACKAGE_INCOMPLETE");
  const blocking = tasks.filter(t => t.pass === "CONSISTENCY_SECTION" || t.pass === "FINAL_SYNTHESIS")
    .flatMap(t => results.get(t.id).output.blockingFindings || []);
  if (blocking.length) throw Error("STAGE07_EDITORIAL_CONSISTENCY_HOLD");
  const originalParagraphs = plan.editing.paragraphs.map(p => working.text.slice(p.start, p.end));
  const proposed = edits.flatMap(e => e.output.paragraphs);
  if (proposed.length !== originalParagraphs.length || proposed.some((p, i) => p.index !== i)) throw Error("STAGE07_PACKAGE_COVERAGE_HOLD");
  const changes = proposed.filter((p, i) => p.text !== originalParagraphs[i]);
  const { whitespace } = require("./stage07SourceRestoration");
  if (!changes.some(p => whitespace(p.text) !== whitespace(originalParagraphs[p.index]))) throw Error("STAGE07_UNCHANGED_COMPONENT_REVIEW_REQUIRED");
  if (sha(original) !== source.sourceSha256) throw Error("STAGE07_PACKAGE_SOURCE_HASH_MISMATCH");
  const documents = await require("./stage07Documents").buildDocuments(original, working.provenance.name, originalParagraphs, proposed.map(p => p.text));
  const coverage = { sourceSha256: source.sourceSha256, sourceTextSha256: source.sourceTextSha256, planSha256,
    paragraphs: plan.editing.paragraphs.map((p, i) => ({ ...p, proposedSha256: sha(proposed[i].text), changed: proposed[i].text !== originalParagraphs[i] })),
    receipts: tasks.map(t => ({ taskId: t.id, receiptPath: results.get(t.id).receiptPath, outputSha256: results.get(t.id).outputSha256 })) };
  const questions = tasks.flatMap(t => results.get(t.id).output.questions || []);
  const ledgers = tasks.filter(t => t.pass.endsWith("SYNTHESIS")).map(t => ({ taskId: t.id, ...results.get(t.id).output }));
  const planningFindings = tasks.filter(t => t.pass.startsWith("PLAN_")).map(t => ({ taskId: t.id,
    findings: results.get(t.id).output.blockingFindings || [] }));
  const memoParagraphs = [source.title, working.provenance.name, "Stage 07 editorial review - proposed changes, not author approval",
    "Planning observations (preserved history; final consistency review determines unresolved defects)",
    ...planningFindings.flatMap(p => p.findings.map(f => `${p.taskId}: ${f}`)),
    ...ledgers.flatMap(l => [l.taskId, l.ledger]), ...edits.flatMap(e => [e.taskId, e.output.memo])].filter(Boolean);
  const questionParagraphs = [source.title, working.provenance.name, "Author questions", ...(questions.length ? questions : ["No additional questions recorded by this review."])];
  const memoDocument = await require("./stage07Documents").buildDocuments(Buffer.from(memoParagraphs.join("\n\n")), "memo.md", memoParagraphs, memoParagraphs);
  const questionsDocument = await require("./stage07Documents").buildDocuments(Buffer.from(questionParagraphs.join("\n\n")), "questions.md", questionParagraphs, questionParagraphs);
  const files = { "proposed-edited.docx": documents.edited, "author-review.docx": documents.review,
    "editorial-memo.docx": memoDocument.edited, "author-questions.docx": questionsDocument.edited,
    "editorial-memo.json": Buffer.from(JSON.stringify({ title: source.title, componentName: working.provenance.name, planningFindings, ledgers, edits: edits.map(e => ({ taskId: e.taskId, memo: e.output.memo })) }, null, 2)),
    "author-questions.json": Buffer.from(JSON.stringify({ title: source.title, questions }, null, 2)),
    "source-coverage.json": Buffer.from(JSON.stringify(coverage, null, 2)) };
  return { files, manifest: { titleId: source.titleId, componentSha256: source.sourceSha256, planSha256,
    paragraphCount: proposed.length, changedParagraphs: changes.length, status: "DOCUMENT_RENDERING_REVIEW_REQUIRED",
    stage07Complete: false, stage08: "NOT_STARTED",
    files: Object.entries(files).map(([name, bytes]) => ({ name, bytes: bytes.length, sha256: sha(bytes) })) } };
}
module.exports = { assemble };
