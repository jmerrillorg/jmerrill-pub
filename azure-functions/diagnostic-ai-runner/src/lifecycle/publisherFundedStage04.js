"use strict";
const b = require("./newSubmissionStage03Budget");
const policy = require("./publisherFundedPolicy");
const offers = require("./publisherFundedOffer");
const internal = require("./jackieInternalTitlePolicy");
const stage01 = require("./newSubmissionStage01");
const stage02 = require("./newSubmissionStage02");
const fresh = require("./freshTitleIntake");
const mail = require("./publisherFundedStage04Mail");
const { processTitleCommissioningStep } = require("./titleCommissioningIntakeWorker");
const PREFIX = "publisher-funded/stage04";
const MODES = ["SUBMISSION_04_PREFLIGHT", "SUBMISSION_04_SEND", "SUBMISSION_04_READBACK", "SUBMISSION_04_RECONCILE"];
const BROAD = ["JM1_TITLE_COMMISSIONING_REVIEW_ENABLED", "JM1_PUBLISHING_STAGE_RUNTIME_ENABLED", "JM1_PUBLISHING_WAIT_RUNTIME_ENABLED"];
function deny(code) { throw Object.assign(new Error(code), { safeCode: code }); }
function enabled(env, titleId) {
  return env.JM1_NEW_SUBMISSION_STAGE04_ENABLED === "true" &&
    (env.JM1_NEW_SUBMISSION_STAGE04_TITLE_IDS || "").split(",").includes(titleId);
}
async function bytes(container, path) {
  const blob = container.getBlockBlobClient(path), props = await blob.getProperties();
  if (!props.etag) deny("STAGE04_UNVERSIONED_AUTHORITY");
  return blob.downloadToBuffer(0, undefined, { conditions: { ifMatch: props.etag } });
}
async function load(titleId, deps) {
  const env = deps.env || process.env, container = deps.containerClient;
  const ref = env.JM1_NEW_SUBMISSION_STAGE04_MANIFEST;
  if (!ref?.startsWith(`${PREFIX}/authority/`) || !/^[a-f0-9]{64}$/.test(env.JM1_NEW_SUBMISSION_STAGE04_MANIFEST_SHA256 || "")) deny("STAGE04_MANIFEST_UNBOUND");
  const bound = await b.read(container, ref), manifest = bound.value;
  if (b.sha(bound.bytes) !== env.JM1_NEW_SUBMISSION_STAGE04_MANIFEST_SHA256 || manifest.schemaVersion !== 1 ||
      manifest.authorEmail !== mail.AUTHOR || manifest.sendAuthority !== "DIRECT_PUBLISHER_STAGE04_DELIVERY_AUTHORIZATION" ||
      manifest.titleIds.length !== 5 || JSON.stringify([...manifest.titleIds].sort()) !== JSON.stringify(Object.keys(internal.TITLES).sort()) ||
      !manifest.titleIds.includes(titleId)) deny("STAGE04_MANIFEST_AUTHORITY_DENIED");
  const acceptance = (await b.read(container, manifest.publisherAcceptanceReference)).value;
  const fundedPolicy = (await b.read(container, manifest.policyReference)).value;
  const selection = (await b.read(container, manifest.selectionReference)).value;
  const title = policy.validateFunding(fundedPolicy, selection, titleId, acceptance);
  const entry = manifest.offers.find(x => x.titleId === titleId);
  if (!entry || manifest.offers.filter(x => x.titleId === titleId).length !== 1) deny("STAGE04_OFFER_UNBOUND");
  const offer = (await b.read(container, entry.reference)).value;
  offers.validate(offer, fundedPolicy, selection, titleId, acceptance, offer.baseAgreement);
  if (entry.offerSha256 !== offer.offerSha256) deny("STAGE04_OFFER_VERSION_MISMATCH");
  const accepted = await b.read(container, title.acceptanceReceiptReference);
  if (b.sha(accepted.bytes) !== title.acceptanceReceiptSha256 || accepted.value.titleId !== titleId ||
      accepted.value.status !== "VALIDATED_ASSESSMENT_PACKAGE" ||
      JSON.stringify(accepted.value.outputs.map(x => x.sharePointOutput)) !== JSON.stringify(title.components.map(x => x.assessment))) deny("STAGE04_STAGE03_ACCEPTANCE_CHANGED");
  const original = await b.read(container, title.originalReceiptReference);
  if (b.sha(original.bytes) !== accepted.value.originalReceiptSha256 || original.value.titleId !== titleId) deny("STAGE04_STAGE03_RECEIPT_CHANGED");
  const fingerprint = original.value.sourceFingerprint;
  const receipt01 = (await b.read(container, `new-submission-stage01/${titleId}/${fingerprint}/receipt.json`)).value;
  if (receipt01.titleId !== titleId || receipt01.contactId !== internal.CONTACT || receipt01.status !== "COMPLETED" ||
      receipt01.email.delivered !== true || !receipt01.intakeId) deny("STAGE04_STAGE01_BINDING_CHANGED");
  const baseBytes = await bytes(container, manifest.baseAgreementReference);
  if (b.sha(baseBytes) !== offers.BASE.sha256) deny("STAGE04_BASE_AGREEMENT_CHANGED");
  return { manifest, title: entry.title, offer, accepted: accepted.value, baseBytes,
    intakeReference: `JMP-INT-202610-${fingerprint.slice(0, 16).toUpperCase()}`, sourceFingerprint: fingerprint,
    prefix: `${PREFIX}/${titleId}/${offer.offerSha256}`, approvedOn: manifest.approvedOn };
}
async function prepare(bundle, deps) {
  const path = `${bundle.prefix}/package.json`, existing = await b.optional(deps.containerClient, path);
  if (existing) {
    await stage02.verifyOutput(existing.value.review, deps);
    if (existing.value.offerSha256 !== bundle.offer.offerSha256 ||
        JSON.stringify(existing.value.email) !== JSON.stringify(await mail.payload(bundle, existing.value.review, bundle.baseBytes, bundle.approvedOn, existing.value.presentationVersion || 1))) deny("STAGE04_PREPARED_PACKAGE_CHANGED");
    return existing.value;
  }
  for (const component of bundle.offer.components) await stage02.verifyOutput(component.assessment, deps);
  const source = bundle.offer.components[0].assessment;
  const item = await deps.graph(`drives/${encodeURIComponent(fresh.driveId)}/items/${encodeURIComponent(source.itemId)}`);
  if (!item.parentReference?.id || item.parentReference.driveId !== fresh.driveId) deny("STAGE04_REVIEW_FOLDER_UNBOUND");
  const folder = { id: item.parentReference.id, path: source.path.slice(0, source.path.lastIndexOf("/")) };
  const copy = mail.render(bundle.title, bundle.offer);
  const review = await stage02.persistFile(folder, `${copy.reference}-Stage04-Offer.md`, Buffer.from(copy.review), "text/markdown; charset=utf-8", deps);
  const value = { titleId: bundle.offer.titleId, offerSha256: bundle.offer.offerSha256, review,
    offerVersion: bundle.offer.version, presentationVersion: 2,
    email: await mail.payload(bundle, review, bundle.baseBytes, bundle.approvedOn) };
  return (await b.immutable(deps.containerClient, path, value)).value;
}
async function executeSend(input, deps) {
  const bundle = await load(input.titleId, deps);
  if (bundle.offer.offerSha256 !== input.bindingHash) deny("STAGE04_OFFER_VERSION_MISMATCH");
  const prepared = await prepare(bundle, deps);
  const prior = await b.optional(deps.containerClient, `${bundle.prefix}/send.json`);
  if (prior) return { receipt: prior.value };
  const sent = await (deps.sendOffer || mail.send)(prepared.email, deps);
  if (!sent.providerMessageId || !sent.communicationRecordId || !Number.isFinite(Date.parse(sent.sentAt))) deny("STAGE04_SEND_RECEIPT_INCOMPLETE");
  const receipt = { schemaVersion: 1, titleId: input.titleId, offerSha256: input.bindingHash,
    status: "PROVIDER_ACCEPTED", generated: true, sent: true, delivered: false,
    authorElection: "NOT_CAPTURED", stage05: "NOT_STARTED", ...sent,
    reference: `${bundle.prefix}/send.json`, review: prepared.review };
  return { receipt: (await b.immutable(deps.containerClient, receipt.reference, receipt)).value };
}
async function readback(bundle, deps) {
  const read = async name => (await b.optional(deps.containerClient, `${bundle.prefix}/${name}.json`))?.value || null;
  const [sent, delivered, state, monitor] = await Promise.all([read("send"), read("delivery"), read("response"), read("monitor")]);
  return { titleId: bundle.offer.titleId, title: bundle.title, offerSha256: bundle.offer.offerSha256,
    offerVersion: bundle.offer.version, send: sent, delivery: delivered, response: state, monitor,
    stage04: state?.decision === "ACCEPT" ? "COMPLETED_AUTHOR_ACCEPTED" : state?.decision === "DECLINE" ? "COMPLETED_AUTHOR_DECLINED"
      : state?.decision === "HOLD" ? "WAITING_AUTHOR_HOLD" : delivered ? "WAITING_AUTHOR_ELECTION" : sent ? "WAITING_DELIVERY" : "NOT_SENT",
    stage05: state?.decision === "ACCEPT" ? "PENDING_AGREEMENT_EXECUTION_AND_NEXT_WORK_BUDGET" : "NOT_STARTED",
    authorFeeCents: 0, paymentDisposition: "NOT_APPLICABLE_PUBLISHER_FUNDED", paymentCreated: false,
    stage05Complete: false, effects: 0 };
}
async function reconcile(bundle, deps) {
  const container = deps.containerClient;
  const sent = (await b.optional(container, `${bundle.prefix}/send.json`))?.value;
  if (!sent) return readback(bundle, deps);
  const lock = container.getBlockBlobClient(`${bundle.prefix}/monitor-lock.json`);
  try { await lock.uploadData(Buffer.from("{}"), { conditions: { ifNoneMatch: "*" } }); }
  catch (e) { if (![409, 412].includes(e.statusCode)) throw e; }
  const lease = lock.getBlobLeaseClient();
  try { await lease.acquireLease(60); } catch (e) { if ([409, 412].includes(e.statusCode)) return { ...(await readback(bundle, deps)), monitorClaim: "IN_FLIGHT" }; throw e; }
  let leaseLost = false;
  const renewal = setInterval(() => lease.renewLease().catch(() => { leaseLost = true; }), 20000);
  const assertClaim = () => { if (leaseLost) deny("STAGE04_MONITOR_CLAIM_LOST"); };
  const save = async (name, value) => {
    assertClaim();
    const current = await b.optional(container, `${bundle.prefix}/${name}.json`);
    return container.getBlockBlobClient(`${bundle.prefix}/${name}.json`).uploadData(Buffer.from(JSON.stringify(value)), {
      conditions: current ? { ifMatch: current.etag } : { ifNoneMatch: "*" }, blobHTTPHeaders: { blobContentType: "application/json" } });
  };
  try {
    const prior = (await b.optional(container, `${bundle.prefix}/monitor.json`))?.value;
    const internalPolicy = require("./publisherFundedInternalMail").POLICY;
    if (Date.now() >= Date.parse(internalPolicy.expiresAt)) {
      const priorResponse = (await b.optional(container, `${bundle.prefix}/response.json`))?.value;
      const source = priorResponse?.sourceReference && (await b.optional(container, priorResponse.sourceReference))?.value;
      if (source?.authentication?.method === "TENANT_VERIFIED_INTERNAL_MAILBOX") {
        return { ...(await readback(bundle, deps)), authenticationReviewRequired: "INTERNAL_MAIL_POLICY_EXPIRED" };
      }
    }
    if (prior?.status === "HELD") {
      const policy = require("./publisherFundedInternalMail").POLICY;
      const recoveryReference = `${bundle.prefix}/recoveries/${policy.version}.json`;
      if (prior.code !== "STAGE04_MAIL_READ_FAILED" || prior.providerStatus !== 403 ||
          prior.providerCode !== "ErrorAccessDenied" || prior.mailReadScope !== "AUTHOR" ||
          Date.now() >= Date.parse(policy.expiresAt) || await b.optional(container, recoveryReference)) return readback(bundle, deps);
      const proof = await (deps.verifyDelivery || mail.delivery)(sent, bundle, deps);
      if (proof?.replyAuthentication?.method !== "TENANT_VERIFIED_INTERNAL_MAILBOX") return readback(bundle, deps);
      assertClaim();
      await b.immutable(container, recoveryReference, { prior, policyVersion: policy.version,
        titleId: bundle.offer.titleId, offerSha256: bundle.offer.offerSha256,
        proofMessageId: proof.replyInternetMessageId, sendRepeated: false });
      await b.immutable(container, `${bundle.prefix}/delivery.json`, proof);
    } else if (prior?.nextAttemptAt && Date.parse(prior.nextAttemptAt) > Date.now()) return readback(bundle, deps);
    let delivered = (await b.optional(container, `${bundle.prefix}/delivery.json`))?.value;
    if (!delivered) {
      delivered = await (deps.verifyDelivery || mail.delivery)(sent, bundle, deps);
      if (!delivered) throw Object.assign(new Error("STAGE04_DELIVERY_PENDING"), { safeCode: "STAGE04_DELIVERY_PENDING", statusCode: 503 });
      assertClaim();
      await b.immutable(container, `${bundle.prefix}/delivery.json`, delivered);
    }
    const messages = await (deps.readReplies || mail.replies)(delivered, deps);
    const decisions = [];
    const seen = new Map();
    for (const message of messages.sort((a, c) => Date.parse(a.receivedDateTime) - Date.parse(c.receivedDateTime))) {
      const result = mail.classify(message, bundle.offer, delivered);
      if (result.reason === "IDENTITY_OR_EXACT_OFFER_THREAD_MISMATCH") continue;
      const identity = JSON.stringify(result);
      if (seen.has(message.internetMessageId)) {
        if (seen.get(message.internetMessageId) !== identity) deny("STAGE04_RESPONSE_REPLAY_CONFLICT");
        continue;
      }
      seen.set(message.internetMessageId, identity);
      const reference = `${bundle.prefix}/responses/${b.sha(message.internetMessageId)}.json`;
      const observation = { ...result, graphMessageId: message.id, internetMessageId: message.internetMessageId,
        receivedAt: message.receivedDateTime, titleId: bundle.offer.titleId, offerSha256: bundle.offer.offerSha256, reference };
      assertClaim();
      const old = await b.optional(container, reference);
      if (old && JSON.stringify(old.value) !== JSON.stringify(observation)) deny("STAGE04_RESPONSE_REPLAY_CONFLICT");
      await b.immutable(container, reference, observation);
      decisions.push(observation);
    }
    const previous = (await b.optional(container, `${bundle.prefix}/response.json`))?.value;
    if (decisions.length) {
      const terminal = decisions.filter(x => ["ACCEPT", "DECLINE"].includes(x.decision));
      const last = decisions.at(-1);
      const conflict = new Set(terminal.map(x => x.decision)).size > 1 ||
        (previous && ["ACCEPT", "DECLINE"].includes(previous.decision) && last.decision !== previous.decision);
      const response = { titleId: bundle.offer.titleId, offerSha256: bundle.offer.offerSha256,
        decision: conflict ? null : last.decision,
        status: conflict ? "CONFLICT_REQUIRES_AUTHOR_REVIEW" : last.decision ? "AUTHOR_ELECTION_CAPTURED" : "AUTHOR_TEXT_REQUIRES_REVIEW",
        sourceReference: last.reference, sourceMessageId: last.internetMessageId, receivedAt: last.receivedAt,
        authorContactId: bundle.offer.authorContactId, actorCapacity: "AUTHOR", stage05Complete: false };
      await save("response", response);
    }
    await save("monitor", { status: "ACTIVE", checkedAt: new Date().toISOString(), failures: 0,
      observedReplies: decisions.length, titleId: bundle.offer.titleId, offerSha256: bundle.offer.offerSha256 });
    return readback(bundle, deps);
  } catch (error) {
    const prior = (await b.optional(container, `${bundle.prefix}/monitor.json`))?.value;
    const failures = (prior?.failures || 0) + 1;
    const code = /^STAGE04_[A-Z0-9_]+$/.test(error.safeCode || "") ? error.safeCode : "STAGE04_MONITOR_DEPENDENCY_FAILED";
    await save("monitor", { status: failures >= 5 ? "HELD" : "RETRY_PENDING", failures, code,
      providerStatus: error.statusCode || null, providerCode: error.providerCode || null, mailReadScope: error.mailReadScope || null,
      checkedAt: new Date().toISOString(), nextAttemptAt: new Date(Date.now() + Math.min(3600000, 60000 * 2 ** failures)).toISOString(),
      titleId: bundle.offer.titleId, offerSha256: bundle.offer.offerSha256 });
    throw Object.assign(new Error(code), { safeCode: code, statusCode: error.statusCode });
  } finally { clearInterval(renewal); await lease.releaseLease().catch(() => {}); }
}
async function handler(body, deps = {}) {
  const env = deps.env || process.env;
  if (!MODES.includes(body.mode) || !Object.hasOwn(internal.TITLES, body.titleId || "") ||
      Object.keys(body).some(k => !["titleId", "mode"].includes(k))) return { status: 400, jsonBody: { code: "STAGE04_SCOPE_DENIED" } };
  const mutation = ["SUBMISSION_04_SEND", "SUBMISSION_04_RECONCILE"].includes(body.mode);
  if (BROAD.some(k => env[k] !== "false") || mutation && !enabled(env, body.titleId)) return { status: 403, jsonBody: { code: "STAGE04_DISABLED" } };
  try {
    const context = await stage01.native(deps);
    if ((await context.containerClient.getProperties()).blobPublicAccess) deny("STAGE04_PRIVATE_STORAGE_REQUIRED");
    const bundle = await load(body.titleId, context);
    if (body.mode === "SUBMISSION_04_SEND") {
      const result = await processTitleCommissioningStep({ titleId: body.titleId, bindingHash: bundle.offer.offerSha256 }, {
        ...context, readScope: async titleId => ({ enabled: enabled(env, titleId), revoked: false, titleId, mode: "JACKIE_TITLE_INTERNAL_COMMISSIONING" }) }, {
        namespace: `${PREFIX}/send-executions`, executionSuffix: "", plan: input => ({ ...input, executionId: `stage04-offer:${input.bindingHash}` }),
        execute: executeSend, validate: result => result.receipt?.sent === true,
        reference: () => `${bundle.prefix}/send.json`, completionEffects: () => ({ authorElection: "NOT_CAPTURED", stage05: "NOT_STARTED" }) });
      if (result.status !== "COMPLETED") return { status: 202, jsonBody: { execution: result, ...(await readback(bundle, context)) } };
      return { status: 200, jsonBody: { execution: result, ...(await reconcile(bundle, context)) } };
    }
    return { status: 200, jsonBody: body.mode === "SUBMISSION_04_RECONCILE" ? await reconcile(bundle, context) : await readback(bundle, context) };
  } catch (error) {
    return { status: 409, jsonBody: { code: /^(STAGE04|COMMISSIONING)_/.test(error.safeCode || "") ? error.safeCode : "STAGE04_DEPENDENCY_FAILED",
      providerStatus: error.statusCode || null, titleId: body.titleId, stage05Complete: false } };
  }
}
async function monitor(deps = {}) {
  const env = deps.env || process.env;
  if (env.JM1_NEW_SUBMISSION_STAGE04_ENABLED !== "true") return [];
  const results = [];
  for (const titleId of Object.keys(internal.TITLES).filter(id => enabled(env, id))) {
    try {
      const context = await stage01.native(deps);
      const bundle = await load(titleId, context);
      const execution = await b.optional(context.containerClient, `${PREFIX}/send-executions/${titleId}/${bundle.offer.offerSha256}.json`);
      const mode = execution ? "SUBMISSION_04_SEND" : "SUBMISSION_04_RECONCILE";
      const result = await handler({ titleId, mode }, context);
      results.push({ titleId, status: result.status, stage04: result.jsonBody.stage04 || null,
        execution: result.jsonBody.execution?.status || null, code: result.jsonBody.code || null });
    } catch (error) {
      results.push({ titleId, status: 409, code: /^STAGE04_[A-Z0-9_]+$/.test(error.safeCode || "") ? error.safeCode : "STAGE04_MONITOR_DEPENDENCY_FAILED" });
    }
  }
  return results;
}
module.exports = { PREFIX, MODES, load, prepare, executeSend, handler, reconcile, readback, monitor, enabled };
