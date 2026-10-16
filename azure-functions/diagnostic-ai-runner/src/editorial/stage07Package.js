"use strict";
const { createHash } = require("node:crypto");
const sha = bytes => createHash("sha256").update(bytes).digest("hex");
const hold = code => { const error = new Error(code); error.safeCode = code; throw error; };
async function assemble({ source, working, plan, tasks, results, original, planSha256, approvedClosure=false }) {
  const edits = tasks.filter(t => t.pass === "EDIT").map(t => results.get(t.id));
  if (tasks.some(t => !results.has(t.id))) hold("STAGE07_PACKAGE_INCOMPLETE");
  const memoEntries = edits.map(e => ({ taskId: e.taskId, ...require("./stage07MemoRecovery").recover(e.output) }));
  const blocking = tasks.filter(t => t.pass === "CONSISTENCY_SECTION" || t.pass === "FINAL_SYNTHESIS")
    .flatMap(t => results.get(t.id).output.blockingFindings || []);
  const originalParagraphs = plan.editing.paragraphs.map(p => working.text.slice(p.start, p.end));
  let proposed = edits.flatMap(e => e.output.paragraphs);
  if (proposed.length !== originalParagraphs.length || proposed.some((p, i) => p.index !== i)) hold("STAGE07_PACKAGE_COVERAGE_HOLD");
  const corrections=approvedClosure?require("./stage07ApprovedCorrections").apply(source,originalParagraphs,proposed):null;
  if(corrections)proposed=corrections.proposed;
  const disposition=corrections?require("./stage07ApprovedCorrections").findings(tasks,results,corrections.rule):null;
  if(disposition?disposition.unresolved.length:blocking.length)hold("STAGE07_EDITORIAL_CONSISTENCY_HOLD");
  const changes = proposed.filter((p, i) => p.text !== originalParagraphs[i]);
  const { typographicQuotes } = require("./stage07SourceRestoration");
  // Typography alone does not demonstrate completed substantive editorial work.
  if (!changes.some(p => typographicQuotes(p.text) !== typographicQuotes(originalParagraphs[p.index])) && !corrections?.rule.reviewedUnchangedAccepted) hold("STAGE07_UNCHANGED_COMPONENT_REVIEW_REQUIRED");
  if (sha(original) !== source.sourceSha256) hold("STAGE07_PACKAGE_SOURCE_HASH_MISMATCH");
  const documents = await require("./stage07Documents").buildDocuments(original, working.provenance.name, originalParagraphs, proposed.map(p => p.text));
  const coverage = { sourceSha256: source.sourceSha256, sourceTextSha256: source.sourceTextSha256, planSha256,
    correctionAuthority:corrections?.record.authority,
    paragraphs: plan.editing.paragraphs.map((p, i) => ({ ...p, proposedSha256: sha(proposed[i].text), changed: proposed[i].text !== originalParagraphs[i],destination:proposed[i].text?"READER_PROSE":"EDITORIAL_RECORD" })),
    receipts: tasks.map(t => ({ taskId: t.id, receiptPath: results.get(t.id).receiptPath, outputSha256: results.get(t.id).outputSha256 })) };
  const normalized=t=>approvedClosure?require("./stage07ApprovedCorrections").recoverLedger(results.get(t.id).output):results.get(t.id).output;
  const questions = [...new Set(tasks.flatMap(t => normalized(t).questions || []))];
  const ledgers = tasks.filter(t => t.pass.endsWith("SYNTHESIS")).map(t => ({ taskId: t.id, ...normalized(t) }));
  const planningFindings = tasks.filter(t => t.pass.startsWith("PLAN_")).map(t => ({ taskId: t.id,
    findings: results.get(t.id).output.blockingFindings || [] }));
  const memoParagraphs = approvedClosure ? [source.title, "Stage 07 editorial review",
    "Publisher-approved correction package. Originals, model receipts and historical findings are preserved. This is not factual publication clearance or Stage 08 authorization.",
    changes.length?`${changes.length} paragraphs changed or relocated under the attached coverage record.`:"Reviewed unchanged disposition; no invented changes. Disclosed source limitations remain.",
    ...ledgers.filter(l=>l.taskId.includes("/FINAL_SYNTHESIS/")).slice(-1).map(l=>l.ledger),
    "Resolution supplement superseding historical findings",...disposition.resolved.map(x=>`${x.text}\nResolution: ${x.resolution}`),
    "The complete segment reviews and prior findings remain in editorial-memo.json. Approved source corrections and relocated text are in editorial-change-record.json."] : [source.title, working.provenance.name, "Stage 07 editorial review - proposed changes, not author approval",
    "Planning observations (preserved history; final consistency review determines unresolved defects)",
    ...planningFindings.flatMap(p => p.findings.map(f => `${p.taskId}: ${f}`)),
    ...ledgers.flatMap(l => [l.taskId, l.ledger]), ...memoEntries.flatMap(e => [e.taskId, e.memo])].filter(Boolean);
  const questionParagraphs = [source.title, working.provenance.name, "Author questions", ...(questions.length ? questions : ["No additional questions recorded by this review."])];
  const memoDocument = await require("./stage07Documents").buildDocuments(Buffer.from(memoParagraphs.join("\n\n")), "memo.md", memoParagraphs, memoParagraphs);
  const questionsDocument = await require("./stage07Documents").buildDocuments(Buffer.from(questionParagraphs.join("\n\n")), "questions.md", questionParagraphs, questionParagraphs);
  const files = { "proposed-edited.docx": documents.edited, "author-review.docx": documents.review,
    "editorial-memo.docx": memoDocument.edited, "author-questions.docx": questionsDocument.edited,
    "editorial-memo.json": Buffer.from(JSON.stringify({ title: source.title, componentName: working.provenance.name, planningFindings, ledgers, edits: memoEntries }, null, 2)),
    "author-questions.json": Buffer.from(JSON.stringify({ title: source.title, questions }, null, 2)),
    "source-coverage.json": Buffer.from(JSON.stringify(coverage, null, 2)) };
  if(corrections){
    files["editorial-change-record.json"]=Buffer.from(JSON.stringify({...corrections.record,findings:disposition},null,2));
    const appendix=[source.title,"Editorial appendix","Preserved source material relocated or corrected by Publisher authority. Not reader-facing prose.",
      ...corrections.record.changes.flatMap(c=>[`Source paragraph ${c.index}: ${c.reason}`,c.sourceText])];
    files["editorial-appendix.docx"]=(await require("./stage07Documents").buildDocuments(Buffer.from(appendix.join("\n\n")),"appendix.md",appendix,appendix)).edited;
  }
  return { files, manifest: { titleId: source.titleId, componentSha256: source.sourceSha256, planSha256,
    paragraphCount: proposed.length, changedParagraphs: changes.length, status: "DOCUMENT_RENDERING_REVIEW_REQUIRED",
    stage07Complete: false, stage08: "NOT_STARTED",
    correctionAuthority:corrections?.record.authority,reviewedUnchanged:!changes.length,
    files: Object.entries(files).map(([name, bytes]) => ({ name, bytes: bytes.length, sha256: sha(bytes) })) } };
}
module.exports = { assemble };
