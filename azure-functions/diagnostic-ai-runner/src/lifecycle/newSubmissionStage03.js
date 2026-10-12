"use strict";
const b = require("./newSubmissionStage03Budget");
const fresh = require("./freshTitleIntake");
const stage01 = require("./newSubmissionStage01");
const stage02 = require("./newSubmissionStage02");
const contract = require("../editorial/commissioningEditorialReviewContract");
const provider = require("../model/providers/microsoftFoundryClaudeProvider");
const recovery = require("./gloryReviewRecoveryReaders");
const MODES = ["SUBMISSION_03_PLAN", "SUBMISSION_03_EXECUTE", "SUBMISSION_03_READBACK", "SUBMISSION_03_ACCEPT"];
const BROAD = ["JM1_TITLE_COMMISSIONING_REVIEW_ENABLED", "JM1_PUBLISHING_STAGE_RUNTIME_ENABLED", "JM1_PUBLISHING_WAIT_RUNTIME_ENABLED"];
function sections(text) {
  const matches = [...text.matchAll(/\S+/gu)];
  if (!matches.length) b.deny("STAGE03_EMPTY_SOURCE");
  // Balance long sources without increasing their planned section count or changing completed short-source bindings.
  const wordLimit = matches.length > 80000 ? Math.ceil(matches.length / Math.ceil(matches.length / 40000)) : 40000;
  const parts = []; let start = 0, first = 0;
  while (first < matches.length) {
    let last = Math.min(first + wordLimit, matches.length);
    let end = last === matches.length ? text.length : matches[last].index;
    while (end - start > 400000 && last > first + 1) { last--; end = matches[last].index; }
    if (end - start > 400000) b.deny("STAGE03_SOURCE_SECTION_TOO_LARGE");
    const content = text.slice(start, end);
    parts.push({ start, end, words: last - first, sha256: b.sha(content), text: content });
    start = end; first = last;
  }
  if (parts.map(p => p.text).join("") !== text) b.deny("STAGE03_SOURCE_COVERAGE_FAILED");
  return parts;
}
function authorityBinding(a) {
  return a.sources.map(({ verifiedAt, content, ...source }) => source);
}
function validateReport(model, source) {
  contract.validateEditorialReview(model.output);
  const report = model.output;
  if (report.intakeSummary.title !== source.title || report.intakeSummary.sourceVersion !== source.version ||
    report.intakeSummary.wordCount !== source.wordCount || report.imprintAlignment.authority !== "SUGGESTED_ONLY") b.deny("STAGE03_REPORT_SOURCE_CONTEXT_MISMATCH");
}
function rateRejected(model) {
  return model?.provider === "microsoft-foundry-claude" && model.ok === false && model.httpStatus === 429 &&
    model.output === null && !model.failureCode && /^MICROSOFT_FOUNDRY_HTTP_429:/.test(model.error || "") &&
    model.tokenCounts?.input === 0 && model.tokenCounts.output === 0 && model.tokenCounts.total === 0;
}
async function reconcileRateRejections(ledger, container, approvalSha256) {
  let changed = false;
  for (const call of ledger.calls) {
    if (call.status !== "AMBIGUOUS" || call.safeCode !== "STAGE03_ACTUAL_USAGE_UNVERIFIED") continue;
    const path = `${b.PREFIX}/candidates/${call.bindingHash}/${call.index}${call.retry ? "-retry1" : ""}.json`;
    const candidate = await b.optional(container, path);
    if (!candidate || candidate.value.bindingHash !== call.bindingHash || candidate.value.requestSha256 !== call.requestSha256 ||
        !rateRejected(candidate.value.model)) continue;
    const receipt = { callId: call.id, candidateReference: path, candidateSha256: b.sha(candidate.bytes),
      approvalSha256, priorStatus: call.status, disposition: "EXPLICIT_PROVIDER_429_REJECTION", actualMicroUsd: 0 };
    await b.immutable(container, `${b.PREFIX}/recoveries/${b.sha(call.id)}.json`, receipt);
    call.status = "REJECTED_RATE_LIMIT"; call.actualMicroUsd = 0;
    call.safeCode = "STAGE03_PROVIDER_RATE_LIMIT_REJECTED"; call.completedAt = candidate.value.receivedAt;
    changed = true;
  }
  return changed;
}
async function prepare(titleId, deps, approval) {
  const current = await fresh.readSource(titleId, deps);
  const p = stage02.plan(current);
  const prior = await stage02.receipt(p, deps);
  if (!prior) b.deny("STAGE03_ACCEPTED_STAGE02_REQUIRED");
  const reader = deps.readReviewAuthority || require("../editorial/commissioningEditorialReviewReaders")
    .createCommissioningEditorialReviewReaders(deps).readReviewAuthority;
  const components = [];
  for (const output of prior.outputs) {
    const source = await require("./newSubmissionStage03Source").consumeWorkingSource(output, deps);
    const approved = approval.sources.find(x => x.titleId === titleId && x.sourceSha256 === source.provenance.sourceSha256);
    if (!approved || approved.textSha256 !== source.provenance.textSha256 || approved.words !== source.provenance.words) b.deny("STAGE03_SOURCE_OUTSIDE_APPROVED_BATCH");
    const authority = await reader(titleId, source.provenance.sourceSha256);
    contract.verifyReviewAuthority(authority, titleId, source.provenance.sourceSha256);
    const chunks = sections(source.text);
    const binding = { titleId, fingerprint: p.fingerprint, provenance: source.provenance,
      authority: authorityBinding(authority), coverage: chunks.map(({ text, ...part }) => part),
      separateComponent: true, approvalSha256: deps.env.JM1_NEW_SUBMISSION_STAGE03_APPROVAL_SHA256 };
    const key = b.sha(JSON.stringify(binding));
    components.push({ binding, key, source, authority, chunks });
  }
  return { p, prior, components };
}
function requestPrompt(component, chunk, reports) {
  const synthesis = !chunk;
  const data = synthesis ? JSON.stringify(reports.map(r => ({ coverage: r.coverage, report: r.report }))) : chunk.text;
  const assembled = contract.assembleReviewPrompt({ titleId: component.binding.titleId,
    sourceSha256: component.source.provenance.sourceSha256, sourceVersion: component.source.provenance.eTag,
    manuscript: data, authority: component.authority });
  const prompt = JSON.parse(assembled.prompt);
  if (synthesis) {
    prompt.task = "SYNTHESIZE_FULL_COMPONENT_EDITORIAL_ASSESSMENT_ONLY";
    prompt.source.wordCount = component.source.provenance.words;
    prompt.manuscriptData = "Full source was assessed in the following exhaustive sections. This request uses section evidence, not raw manuscript.";
    prompt.sectionAssessments = reports.map(r => ({ coverage: r.coverage, report: r.report }));
    prompt.boundaries.push("Do not invent details absent from section assessments. Preserve contradictory findings and all integrity flags. Do not average away a hard stop.");
  } else if (component.chunks.length > 1) {
    prompt.task = "EDITORIAL_REVIEW_SECTION_ASSESSMENT_ONLY";
    prompt.coverage = { ...chunk, text: undefined, totalWords: component.source.provenance.words,
      totalSections: component.chunks.length };
    prompt.boundaries.push("This is one source section, not the entire manuscript. Mark cross-section conclusions pending synthesis; cite source anchors where available.");
  }
  return { prompt: JSON.stringify(prompt), source: prompt.source };
}
async function savedResult(component, index, deps) {
  return b.optional(deps.containerClient, `${b.PREFIX}/results/${component.key}/${index}.json`);
}
async function outputFolder(prepared, deps) {
  const root = `drives/${encodeURIComponent(fresh.driveId)}/items/`;
  const working = await deps.graph(root + prepared.prior.outputs[0].itemId);
  const workingFolder = await deps.graph(root + working.parentReference.id);
  const parent = workingFolder.parentReference;
  const path = decodeURIComponent(parent.path || "").split("root:")[1];
  if (!parent.id || parent.driveId !== fresh.driveId || !path?.startsWith("/01_Pipeline_A-Z/")) b.deny("STAGE03_OUTPUT_WORKSPACE_UNBOUND");
  const name = `_ASSESSMENT_STAGE03_${prepared.p.fingerprint.slice(0,16)}`;
  const target = `${root}${parent.id}:/${name}`;
  let folder;
  try { folder = await deps.graph(target); }
  catch (e) { if (e.statusCode !== 404) throw e; }
  if (!folder) {
    try { await deps.graph(`${root}${parent.id}/children`, { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, folder: {}, "@microsoft.graph.conflictBehavior": "fail" }) }); }
    catch (e) { if (![409,412].includes(e.statusCode)) throw e; }
    folder = await deps.graph(target);
  }
  if (!folder.folder || folder.name !== name || folder.parentReference?.id !== parent.id || folder.parentReference.driveId !== fresh.driveId) b.deny("STAGE03_OUTPUT_FOLDER_CONFLICT");
  return { id: folder.id, path: `${path}/${name}` };
}
async function completion(prepared, deps) {
  const finals = [];
  for (const c of prepared.components) {
    const result = await savedResult(c, c.chunks.length === 1 ? 0 : "synthesis", deps);
    if (!result || result.value.status !== "VALIDATED_ASSESSMENT") return null;
    for (const [index, chunk] of c.chunks.entries()) {
      const section = await savedResult(c, index, deps);
      if (!section || section.value.status !== "VALIDATED_ASSESSMENT" || section.value.bindingHash !== c.key ||
        section.value.reportSha256 !== b.sha(JSON.stringify(section.value.report)) ||
        JSON.stringify(section.value.coverage) !== JSON.stringify((({ text, ...p }) => p)(chunk))) b.deny("STAGE03_FINAL_COVERAGE_UNVERIFIED");
      validateReport({ output: section.value.report }, { title: c.authority.titleName,
        version: c.source.provenance.eTag, wordCount: chunk.words });
    }
    const expected = { title: c.authority.titleName, version: c.source.provenance.eTag, wordCount: c.source.provenance.words };
    validateReport({ output: result.value.report }, expected);
    if (result.value.bindingHash !== c.key || b.sha(JSON.stringify(result.value.report)) !== result.value.reportSha256) b.deny("STAGE03_SAVED_REPORT_CONFLICT");
    const renderer = require("../editorial/commissioningEditorialReviewRenderer");
    const document = renderer.renderCommissioningEditorialReview(result.value.report, {
      titleId: prepared.p.titleId, source: { reference: c.source.provenance.path,
        version: c.source.provenance.eTag, sha256: c.source.provenance.sourceSha256 },
      authority: c.binding.authority, promptSha256: result.value.promptSha256 });
    const documentReference = `${b.PREFIX}/packages/${prepared.p.titleId}/${c.key}/assessment.md`;
    const blob = deps.containerClient.getBlockBlobClient(documentReference);
    try { await blob.uploadData(Buffer.from(document), { conditions: { ifNoneMatch: "*" }, blobHTTPHeaders: { blobContentType: "text/markdown; charset=utf-8" } }); }
    catch (e) { if (![409, 412].includes(e.statusCode)) throw e; }
    const props = await blob.getProperties();
    if (!props.etag || !(await blob.downloadToBuffer(0, undefined, { conditions: { ifMatch: props.etag } })).equals(Buffer.from(document))) b.deny("STAGE03_DOCUMENT_READBACK_FAILED");
    finals.push({ component: c.source.provenance, bindingHash: c.key, coverage: c.binding.coverage,
      resultReference: result.blob.name, documentReference, documentSha256: b.sha(document), reportSha256: result.value.reportSha256 });
  }
  const folder = await outputFolder(prepared, deps);
  for (const final of finals) {
    const blob = deps.containerClient.getBlockBlobClient(final.documentReference);
    const document = await blob.downloadToBuffer();
    final.sharePointOutput = await stage02.persistFile(folder, `${final.component.sourceSha256.slice(0,16)}-Stage03-Assessment.md`,
      document, "text/markdown; charset=utf-8", deps);
  }
  const path = `${b.PREFIX}/receipts/${prepared.p.titleId}/${prepared.p.fingerprint}.json`;
  const existing = await b.optional(deps.containerClient, path);
  if (existing) {
    if (JSON.stringify(existing.value.assessments) !== JSON.stringify(finals)) b.deny("STAGE03_RECEIPT_REPLAY_CONFLICT");
    return existing.value;
  }
  const receipt = { schemaVersion: 1, titleId: prepared.p.titleId, intakeId: prepared.p.intakeId,
    sourceFingerprint: prepared.p.fingerprint, stageCode: "03_EDITORIAL_REVIEW", status: "COMPLETED_ASSESSMENT",
    completedAt: new Date().toISOString(), assessments: finals, sourceAssembly: "SEPARATE_COMPONENTS_NO_ORDER_INFERRED",
    publisherReview: "REQUIRED_BEFORE_FORWARD_ACTION", authorDecisionInferred: false, stage04: "NOT_STARTED",
    communications: 0, payments: 0, originalBytesChanged: false, reference: path };
  return (await b.immutable(deps.containerClient, path, receipt)).value;
}
async function handler(body, deps = {}) {
  const env = deps.env || process.env;
  if (!MODES.includes(body.mode) || !Object.hasOwn(fresh.POLICIES, body.titleId || "") ||
    Object.keys(body).some(k => !["titleId", "mode"].includes(k))) return { status: 400, jsonBody: { code: "STAGE03_SCOPE_DENIED" } };
  if (BROAD.some(k => env[k] !== "false") || (body.mode === "SUBMISSION_03_EXECUTE" && env.JM1_NEW_SUBMISSION_STAGE03_ENABLED !== "true"))
    return { status: 403, jsonBody: { code: "STAGE03_DISABLED", stage04: "NOT_STARTED" } };
  let lease, journal, call, acquired = false; let phase = "AUTHORITY";
  try {
    const context = await (deps.native || stage01.native)({ ...deps, env });
    const container = context.containerClient;
    if ((await container.getProperties()).blobPublicAccess) b.deny("STAGE03_PRIVATE_STORAGE_REQUIRED");
    const approval = b.validateApproval(await b.read(container, `${b.PREFIX}/approval.json`), env);
    const prepareSource = context.prepare || prepare;
    const prepared = await prepareSource(body.titleId, context, approval);
    const done = await completion(prepared, context);
    if (done) {
      const acceptanceReceipt = body.mode === "SUBMISSION_03_ACCEPT" ?
        await require("./newSubmissionStage03Acceptance").accept(done, prepared, await outputFolder(prepared, context), context) :
        (await b.optional(container, `${b.PREFIX}/acceptance/${done.titleId}/${done.sourceFingerprint}.json`))?.value || null;
      return { status: 200, jsonBody: { receipt: done, acceptanceReceipt, replay: true, modelCalls: 0, stage04: "NOT_STARTED" } };
    }
    if (body.mode !== "SUBMISSION_03_EXECUTE") return { status: 200, jsonBody: { titleId: body.titleId,
      status: "ASSESSMENT_PENDING", components: prepared.components.map(c => ({ key: c.key, provenance: c.source.provenance,
        sections: c.chunks.length, synthesis: c.chunks.length > 1 })), stage04: "NOT_STARTED", modelCalls: 0 } };
    const ledgerPath = `${b.PREFIX}/budget.json`;
    if (!await b.optional(container, ledgerPath)) {
      try { await b.immutable(container, ledgerPath, { schemaVersion: 1, approvalSha256: env.JM1_NEW_SUBMISSION_STAGE03_APPROVAL_SHA256, calls: [] }); }
      catch (e) { if (![409, 412].includes(e.statusCode)) throw e; }
    }
    journal = container.getBlockBlobClient(ledgerPath);
    lease = journal.getBlobLeaseClient();
    await lease.acquireLease(-1);
    acquired = true;
    const ledger = (await b.read(container, ledgerPath)).value;
    if (ledger.approvalSha256 !== env.JM1_NEW_SUBMISSION_STAGE03_APPROVAL_SHA256) b.deny("STAGE03_LEDGER_APPROVAL_CONFLICT");
    const writeLedger = () => journal.uploadData(Buffer.from(JSON.stringify(ledger)), {
      conditions: { leaseId: lease.leaseId }, blobHTTPHeaders: { blobContentType: "application/json" } });
    if (await reconcileRateRejections(ledger, container, ledger.approvalSha256)) await writeLedger();
    if (ledger.calls.some(c => ["IN_FLIGHT", "AMBIGUOUS"].includes(c.status))) b.deny("STAGE03_AMBIGUOUS_PROVIDER_EFFECT_HELD");
    let job;
    for (const c of prepared.components) {
      const reports = [];
      for (const [index, chunk] of c.chunks.entries()) {
        const result = await savedResult(c, index, context);
        if (!result) { job = { c, index, chunk, reports }; break; }
        if (result.value.status !== "VALIDATED_ASSESSMENT" || result.value.bindingHash !== c.key) b.deny("STAGE03_INVALID_SECTION_HELD");
        validateReport({ output: result.value.report }, { title: c.authority.titleName,
          version: c.source.provenance.eTag, wordCount: chunk.words });
        if (result.value.reportSha256 !== b.sha(JSON.stringify(result.value.report)) ||
          JSON.stringify(result.value.coverage) !== JSON.stringify((({ text, ...p }) => p)(chunk))) b.deny("STAGE03_SECTION_COVERAGE_CONFLICT");
        reports.push(result.value);
      }
      if (!job && c.chunks.length > 1 && !await savedResult(c, "synthesis", context)) job = { c, index: "synthesis", chunk: null, reports };
      if (job) break;
    }
    if (!job) b.deny("STAGE03_COMPLETION_RECONCILIATION_REQUIRED");
    const logicalCallId = `${job.c.key}:${job.index}`;
    const earlier = ledger.calls.find(c => c.id === logicalCallId);
    const retry = Boolean(earlier && ((earlier.status === "HELD_VALIDATION" && earlier.actualMicroUsd &&
      /^REVIEW_/.test(earlier.safeCode || "")) || (earlier.status === "REJECTED_RATE_LIMIT" && earlier.actualMicroUsd === 0)));
    if (earlier && !retry) b.deny("STAGE03_PAID_REQUEST_ALREADY_ATTEMPTED");
    const request = requestPrompt(job.c, job.chunk, job.reports);
    const prompt = retry ? JSON.stringify({ ...JSON.parse(request.prompt),
      previousValidationFailure: earlier.safeCode,
      retryInstruction: "Return the complete strict assessment contract and exact bound source values; never invent approval or change manuscript content." }) : request.prompt;
    const source = request.source;
    await b.immutable(container, `${b.PREFIX}/bindings/${job.c.key}.json`, { binding: job.c.binding,
      authorityContent: job.c.authority.sources.map(({ verifiedAt, ...source }) => source) });
    // The existing deployment has a shared input-token minute limit; allow it to replenish between batch requests.
    const lastCompleted = ledger.calls.at(-1)?.completedAt;
    const delay = lastCompleted ? Math.max(0, Date.parse(lastCompleted) + 65000 - Date.now()) : 0;
    if (delay > 65000 || !Number.isFinite(delay)) b.deny("STAGE03_PROVIDER_BACKOFF_INVALID");
    if (delay) await (context.wait || (ms => new Promise(resolve => setTimeout(resolve, ms))))(delay);
    phase = "NATIVE_TOKEN_COUNT";
    await (context.readDeployment || recovery.readDeployment)(context);
    const count = await (context.countRequest || recovery.countRequest)(prompt, context);
    if (count.requestSha256 !== b.sha(JSON.stringify(provider.buildRequestBody(prompt, recovery.route)))) b.deny("STAGE03_REQUEST_HASH_CHANGED");
    const held = b.reservation(count, ledger, retry);
    const callId = retry ? `${logicalCallId}:retry1` : logicalCallId;
    if (ledger.calls.some(c => c.id === callId)) b.deny("STAGE03_PAID_REQUEST_ALREADY_ATTEMPTED");
    call = { id: callId, titleId: body.titleId, bindingHash: job.c.key, index: job.index,
      status: "IN_FLIGHT", retry, ...held, requestSha256: count.requestSha256, startedAt: new Date().toISOString() };
    ledger.calls.push(call); await writeLedger();
    phase = "PAID_MODEL_REQUEST";
    const model = await (context.callModel || provider.call)({ promptBody: prompt, diagnosticId: callId, route: recovery.route });
    phase = "USAGE_AND_RESULT_CUSTODY";
    const resultPath = `${b.PREFIX}/results/${job.c.key}/${job.index}.json`;
    // Preserve returned output and usage before validation; an invalid result must never cause an automatic paid replay.
    const candidate = { bindingHash: job.c.key, promptSha256: b.sha(prompt), requestSha256: count.requestSha256,
      source, coverage: job.chunk ? (({ text, ...p }) => p)(job.chunk) : job.c.binding.coverage,
      model, receivedAt: new Date().toISOString() };
    await b.immutable(container, `${b.PREFIX}/candidates/${job.c.key}/${job.index}${retry ? "-retry1" : ""}.json`, candidate);
    try {
      if (rateRejected(model)) { call.actualMicroUsd = 0; b.deny("STAGE03_PROVIDER_RATE_LIMIT_REJECTED"); }
      call.actualMicroUsd = b.actualCost(model, held);
      if (!model.ok || model.provider !== "microsoft-foundry-claude") b.deny("STAGE03_PROVIDER_FAILURE_HELD");
      validateReport(model, source);
      if (job.index === "synthesis" && job.reports.some(r => r.report.integrityFlags.some(f => f.hardStop)) &&
        (!model.output.integrityFlags.some(f => f.hardStop) || model.output.recommendation.pathway !== "DECLINE")) b.deny("STAGE03_SYNTHESIS_HARD_STOP_LOST");
      const after = await prepareSource(body.titleId, context, approval);
      if (JSON.stringify(after.components.map(c => c.key)) !== JSON.stringify(prepared.components.map(c => c.key))) b.deny("STAGE03_AUTHORITY_CHANGED_AFTER_INFERENCE");
      const result = { status: "VALIDATED_ASSESSMENT", bindingHash: job.c.key, promptSha256: b.sha(prompt),
        coverage: candidate.coverage, report: model.output, reportSha256: b.sha(JSON.stringify(model.output)),
        tokenCounts: model.tokenCounts, actualMicroUsd: call.actualMicroUsd, callId, source };
      await b.immutable(container, resultPath, result);
      call.status = "COMPLETED";
    } catch (e) { call.status = rateRejected(model) ? "REJECTED_RATE_LIMIT" : call.actualMicroUsd ? "HELD_VALIDATION" : "AMBIGUOUS";
      call.safeCode = e.safeCode || "STAGE03_RESULT_VALIDATION_FAILED"; throw e; }
    finally { call.completedAt = new Date().toISOString(); await writeLedger(); }
    const receipt = await completion(prepared, context);
    return { status: receipt ? 200 : 202, jsonBody: { receipt, titleId: body.titleId, completedRequest: callId,
      actualBatchMicroUsd: ledger.calls.reduce((n, c) => n + (c.actualMicroUsd || 0), 0), modelCalls: 1,
      status: receipt ? "COMPLETED_ASSESSMENT" : "ASSESSMENT_IN_PROGRESS", stage04: "NOT_STARTED" } };
  } catch (e) {
    return { status: 409, jsonBody: { code: /^(STAGE03|REVIEW|COMMISSIONING)_[A-Z0-9_]+$/.test(e.safeCode || "") ? e.safeCode : "STAGE03_DEPENDENCY_FAILED",
      phase, providerStatus: e.statusCode || null, modelAttempted: Boolean(call), stage04: "NOT_STARTED",
      recovery: call ? "PRESERVE_CANDIDATE_AND_BUDGET_NO_AUTOMATIC_REPLAY" : "NO_PAID_REQUEST_ATTEMPTED" } };
  } finally { if (acquired) await lease.releaseLease(); }
}
module.exports = { MODES, sections, requestPrompt, validateReport, rateRejected, reconcileRateRejections, prepare, handler };
