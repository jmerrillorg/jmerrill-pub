"use strict";
const test = require("node:test"), assert = require("node:assert/strict");
const fs = require("node:fs"), path = require("node:path");
const stage = require("../src/lifecycle/publisherFundedStage04"), mail = require("../src/lifecycle/publisherFundedStage04Mail");
const policy = require("../src/lifecycle/publisherFundedPolicy"), offers = require("../src/lifecycle/publisherFundedOffer");
const internal = require("../src/lifecycle/jackieInternalTitlePolicy"), b = require("../src/lifecycle/newSubmissionStage03Budget");
const fresh = require("../src/lifecycle/freshTitleIntake");
function fixture() {
  const blobs = new Map(), files = new Map(), versions = new Map(), leases = new Set();
  const baseBytes = fs.readFileSync(path.resolve(__dirname, "../../../Implementation HQ/01_GOVERNANCE/Agreement Templates/JMP_Publishing_Agreement_v1.3.1.docx"));
  const put = (ref, value) => { blobs.set(ref, Buffer.isBuffer(value) ? value : Buffer.from(JSON.stringify(value))); versions.set(ref, (versions.get(ref) || 0) + 1); };
  const acceptance = { actorContactId: internal.CONTACT, actorCapacity: "PUBLISHER_ONLY", packetSha256: "dfccdea117f0c126f7c5e5008e1eafcb40e614e526f6726a3c2a0b787495c202",
    reference: "publisher-acceptance", authorElection: "NOT_CAPTURED", stage05: "NOT_STARTED", gloryScope: "FOCUSED_DEVELOPMENTAL",
    gloryPresentation: "UNRESOLVED_NO_SPLIT_AUTHORIZED", intentionalComponents: "SEPARATE", chadAndMe: "NO_INVENTION", titles: [] };
  for (const [titleId, sources] of Object.entries(internal.TITLES)) {
    const components = sources.map(sourceSha256 => {
      const body = Buffer.from(`Accepted assessment ${sourceSha256}`), itemId = sourceSha256.slice(0, 16);
      const name = `${itemId}.md`, parent = "/01_Pipeline_A-Z/Fixture/_ASSESSMENT";
      const assessment = { itemId, driveId: fresh.driveId, eTag: "etag", sha256: b.sha(body), bytes: body.length, path: `${parent}/${name}`,
        webUrl: `https://jmerrillfoundation.sharepoint.com/sites/publishing/${itemId}.md` };
      files.set(itemId, { body, item: { id: itemId, name, eTag: "etag", size: body.length, file: {}, parentReference: { id: "folder", driveId: fresh.driveId, path: `/root:${parent}` } } });
      return { sourceSha256, assessmentSha256: assessment.sha256, assessment, pathway: "DEVELOPMENTAL" };
    });
    const original = { titleId, sourceFingerprint: b.sha(titleId) }, originalReceiptReference = `original/${titleId}`;
    put(originalReceiptReference, original);
    const accepted = { titleId, status: "VALIDATED_ASSESSMENT_PACKAGE", originalReceiptSha256: b.sha(JSON.stringify(original)), outputs: components.map(c => ({ sharePointOutput: c.assessment })) };
    const acceptanceReceiptReference = `accepted/${titleId}`;
    put(acceptanceReceiptReference, accepted);
    put(`new-submission-stage01/${titleId}/${original.sourceFingerprint}/receipt.json`, { titleId, contactId: internal.CONTACT, status: "COMPLETED", email: { delivered: true }, intakeId: "existing" });
    acceptance.titles.push({ titleId, components, acceptanceReceiptReference, acceptanceReceiptSha256: b.sha(JSON.stringify(accepted)),
      originalReceiptReference, scopeDecision: "ACCEPTED_AS_PUBLISHER", safeguards: "ALL_STATED_PACKET_SAFEGUARDS_PRESERVED" });
  }
  put(acceptance.reference, acceptance); put("policy", policy.POLICY);
  const selection = policy.authorizeFreshTitles(acceptance); put("selection", selection); put("base.docx", baseBytes);
  const agreement = { ...offers.BASE, status: "ACTIVE_AUTHORITATIVE", reference: "registered-original", verifiedByteSha256: b.sha(baseBytes) };
  const manifest = { schemaVersion: 1, authorEmail: mail.AUTHOR, approvedOn: "2026-10-12T10:03:22Z", sendAuthority: "DIRECT_PUBLISHER_STAGE04_DELIVERY_AUTHORIZATION",
    titleIds: Object.keys(internal.TITLES), publisherAcceptanceReference: acceptance.reference, policyReference: "policy", selectionReference: "selection", baseAgreementReference: "base.docx", offers: [] };
  for (const titleId of manifest.titleIds) {
    const offer = offers.build(policy.POLICY, selection, titleId, acceptance, agreement), reference = `offer/${titleId}`;
    put(reference, offer); manifest.offers.push({ titleId, title: `Title ${titleId}`, reference, offerSha256: offer.offerSha256 });
  }
  const manifestRef = `${stage.PREFIX}/authority/fixture.json`; put(manifestRef, manifest);
  const counts = { sends: 0, files: 0 }, titleId = manifest.titleIds[0], replies = [];
  const delivered = { generated: true, sent: true, delivered: true, internetMessageId: "<original@microsoft.com>", deliveredAt: "2026-10-12T12:00:00Z" };
  const deps = { env: { JM1_NEW_SUBMISSION_STAGE04_ENABLED: "true", JM1_NEW_SUBMISSION_STAGE04_TITLE_IDS: manifest.titleIds.join(","),
    JM1_NEW_SUBMISSION_STAGE04_MANIFEST: manifestRef, JM1_NEW_SUBMISSION_STAGE04_MANIFEST_SHA256: b.sha(blobs.get(manifestRef)),
    JM1_TITLE_COMMISSIONING_REVIEW_ENABLED: "false", JM1_PUBLISHING_STAGE_RUNTIME_ENABLED: "false", JM1_PUBLISHING_WAIT_RUNTIME_ENABLED: "false" },
    request: async () => { throw Error("No Dataverse write or new inquiry permitted"); },
    sendOffer: async () => { counts.sends++; return { providerMessageId: "provider", communicationRecordId: "communication", sentAt: delivered.deliveredAt, mailboxMessageId: "cc-copy" }; },
    verifyDelivery: async () => delivered, readReplies: async () => replies,
    sourceBytes: async source => files.get(source.itemId).body,
    graph: async (request, options = {}) => {
      const name = request.includes(":/") ? decodeURIComponent(request.split(":/")[1].split(":/content")[0]) : null;
      if (options.method === "PUT") {
        counts.files++; const id = `offer-${counts.files}`;
        files.set(id, { body: Buffer.from(options.body), item: { id, name, eTag: "etag", size: options.body.length, file: {},
          webUrl: `https://jmerrillfoundation.sharepoint.com/sites/publishing/${name}`,
          parentReference: { id: "folder", driveId: fresh.driveId, path: "/root:/01_Pipeline_A-Z/Fixture/_ASSESSMENT" } } });
      }
      const found = name ? [...files.values()].find(f => f.item.name === name) : files.get(request.split("/items/")[1]);
      if (!found) throw Object.assign(Error("missing"), { statusCode: 404 }); return found.item;
    },
    containerClient: { getProperties: async () => ({}), getBlockBlobClient: ref => ({
      getProperties: async () => { if (!blobs.has(ref)) throw Object.assign(Error("missing"), { statusCode: 404 }); return { etag: String(versions.get(ref)) }; },
      downloadToBuffer: async () => blobs.get(ref),
      uploadData: async (body, options = {}) => {
        if (options.conditions?.ifNoneMatch && blobs.has(ref) || options.conditions?.ifMatch && options.conditions.ifMatch !== String(versions.get(ref))) throw Object.assign(Error("conflict"), { statusCode: 412 });
        put(ref, Buffer.from(body)); return { etag: String(versions.get(ref)) };
      },
      getBlobLeaseClient: () => ({ acquireLease: async () => { if (leases.has(ref)) throw Object.assign(Error("leased"), { statusCode: 409 }); leases.add(ref); }, renewLease: async () => {}, releaseLease: async () => leases.delete(ref) })
    }) } };
  return { titleId, deps, blobs, files, counts, replies, delivered, put, manifest };
}
function reply(x, value = "ACCEPT", id = "reply") {
  return { id, internetMessageId: `<${id}@jmerrill.one>`, receivedDateTime: "2026-10-12T12:10:00Z", from: { emailAddress: { address: mail.AUTHOR } },
    toRecipients: [{ emailAddress: { address: mail.MAILBOX } }], uniqueBody: { content: value },
    internetMessageHeaders: [{ name: "In-Reply-To", value: x.delivered.internetMessageId }, { name: "Authentication-Results", value: "mx; dmarc=pass; spf=pass; dkim=pass" }] };
}
test("readable attachments preserve exact terms, title binding and deterministic replay", async () => {
  const x = fixture(), bundle = await stage.load(x.titleId, x.deps);
  const review = { webUrl: "https://internal.example/offer.md" };
  const email = await mail.payload(bundle, review, bundle.baseBytes, bundle.approvedOn);
  assert.match(email.body, /Please review the attached offer and publishing agreement, then reply to this email with your decision\./);
  assert.ok(!email.body.includes(review.webUrl));
  assert.deepEqual(email.cc, [mail.MAILBOX]);
  assert.match(email.body, /ACCEPT, DECLINE, or HOLD/);
  assert.equal(email.attachments[0].contentType, "application/pdf");
  assert.equal(Buffer.from(email.attachments[0].contentInBase64, "base64").subarray(0, 5).toString(), "%PDF-");
  const Zip = require("jszip");
  const original = await Zip.loadAsync(bundle.baseBytes);
  const copy = await Zip.loadAsync(Buffer.from(email.attachments[1].contentInBase64, "base64"));
  const xml = await copy.file("word/document.xml").async("string");
  const { DOMParser } = require("@xmldom/xmldom");
  const ns = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
  const body = value => new DOMParser().parseFromString(value, "application/xml").getElementsByTagNameNS(ns, "body")[0];
  assert.ok(body(xml).textContent.includes(bundle.title));
  assert.ok(body(xml).textContent.includes(bundle.offer.fundedTerms.clause));
  assert.ok(body(xml).textContent.endsWith(body(await original.file("word/document.xml").async("string")).textContent));
  for (const name of Object.keys(original.files).filter(name => !original.files[name].dir && name !== "word/document.xml")) {
    assert.deepEqual(await copy.file(name).async("nodebuffer"), await original.file(name).async("nodebuffer"));
  }
  assert.deepEqual(await mail.payload(bundle, review, bundle.baseBytes, bundle.approvedOn), email);
  const legacy = await mail.payload(bundle, review, bundle.baseBytes, bundle.approvedOn, 1);
  assert.equal(legacy.attachments[0].contentType, "text/markdown");
  x.put(`${bundle.prefix}/send.json`, { providerMessageId: "already-sent" });
  const prepared = await stage.prepare(bundle, x.deps);
  x.put(`${bundle.prefix}/package.json`, { ...prepared, presentationVersion: 1,
    email: await mail.payload(bundle, prepared.review, bundle.baseBytes, bundle.approvedOn, 1) });
  assert.equal((await stage.executeSend({ titleId: x.titleId, bindingHash: bundle.offer.offerSha256 }, x.deps)).receipt.providerMessageId, "already-sent");
  assert.equal(x.counts.sends, 0);
});
test("five offers preserve sources, send once, wait for author and capture exact reply durably", async () => {
  const x = fixture(); const original = Buffer.from(x.blobs.get("publisher-acceptance"));
  for (const titleId of x.manifest.titleIds) {
    const first = await stage.handler({ titleId, mode: "SUBMISSION_04_SEND" }, x.deps);
    assert.equal(first.status, 200, JSON.stringify(first)); assert.equal(first.jsonBody.stage04, "WAITING_AUTHOR_ELECTION");
    assert.equal(first.jsonBody.stage05, "NOT_STARTED");
    const again = await stage.handler({ titleId, mode: "SUBMISSION_04_SEND" }, x.deps);
    assert.equal(again.status, 200); assert.equal(again.jsonBody.send.providerMessageId, "provider");
  }
  assert.equal(x.counts.sends, 5); assert.equal(x.counts.files, 5); assert.ok(original.equals(x.blobs.get("publisher-acceptance")));
  x.replies.push(reply(x));
  const accepted = await stage.handler({ titleId: x.titleId, mode: "SUBMISSION_04_RECONCILE" }, x.deps);
  assert.equal(accepted.jsonBody.stage04, "COMPLETED_AUTHOR_ACCEPTED");
  assert.equal(accepted.jsonBody.stage05Complete, false); assert.equal(accepted.jsonBody.paymentCreated, false);
  assert.equal(accepted.jsonBody.paymentDisposition, "NOT_APPLICABLE_PUBLISHER_FUNDED");
  const repeat = await stage.handler({ titleId: x.titleId, mode: "SUBMISSION_04_RECONCILE" }, x.deps);
  assert.deepEqual(repeat.jsonBody.response, accepted.jsonBody.response); assert.equal(x.counts.sends, 5);
  assert.equal([...x.blobs.keys()].filter(k => k.includes("/responses/")).length, 1);
});
test("publisher instruction, wrong sender, prior offer thread, quoted acceptance and auth failure cannot elect", async () => {
  const x = fixture(), bundle = await stage.load(x.titleId, x.deps);
  for (const changed of [ { from: { emailAddress: { address: mail.MAILBOX } } },
    { internetMessageHeaders: [{ name: "in-reply-to", value: "<old-offer@microsoft.com>" }] },
    { uniqueBody: { content: "Thank you\n> ACCEPT" } }, { uniqueBody: { content: "ACCEPT\nprovided you change the rights" } },
    { internetMessageHeaders: [{ name: "in-reply-to", value: x.delivered.internetMessageId }, { name: "authentication-results", value: "dmarc=fail" }] } ]) {
    assert.equal(mail.classify({ ...reply(x), ...changed }, bundle.offer, x.delivered).decision, null);
  }
  for (const choice of ["ACCEPT", "DECLINE", "HOLD"]) assert.equal(mail.classify(reply(x, choice), bundle.offer, x.delivered).decision, choice);
});
test("read-only preflight does not prepare, send or write; tampered offer and disabled scope fail closed", async () => {
  const x = fixture(); const size = x.blobs.size;
  assert.equal((await stage.handler({ titleId: x.titleId, mode: "SUBMISSION_04_PREFLIGHT" }, x.deps)).status, 200);
  assert.equal(x.blobs.size, size); assert.equal(x.counts.sends, 0);
  const offer = JSON.parse(x.blobs.get(`offer/${x.titleId}`)); offer.authorFeeCents = 10; x.put(`offer/${x.titleId}`, offer);
  assert.equal((await stage.handler({ titleId: x.titleId, mode: "SUBMISSION_04_SEND" }, x.deps)).status, 409);
  x.deps.env.JM1_NEW_SUBMISSION_STAGE04_ENABLED = "false";
  assert.equal((await stage.handler({ titleId: x.titleId, mode: "SUBMISSION_04_SEND" }, x.deps)).status, 403);
  assert.equal(x.counts.sends, 0);
});
test("send uncertainty retries same package; restart and expired claim cannot duplicate accepted delivery", async () => {
  const x = fixture(), send = x.deps.sendOffer; let calls = 0;
  x.deps.sendOffer = async (...args) => { if (++calls === 1) throw Object.assign(Error("timeout"), { statusCode: 503 }); return send(...args); };
  const first = await stage.handler({ titleId: x.titleId, mode: "SUBMISSION_04_SEND" }, x.deps);
  assert.equal(first.jsonBody.execution.status, "RETRY_PENDING");
  const key = [...x.blobs.keys()].find(k => k.includes("send-executions"));
  const waiting = JSON.parse(x.blobs.get(key)); waiting.nextAttemptAt = "2020-01-01T00:00:00Z"; x.put(key, waiting);
  const second = await stage.handler({ titleId: x.titleId, mode: "SUBMISSION_04_SEND" }, x.deps);
  assert.equal(second.status, 200); assert.equal(x.counts.files, 1); assert.equal(x.counts.sends, 1);
  x.put(key, { ...waiting, status: "CLAIMED", leaseUntil: "2020-01-01T00:00:00Z" });
  assert.equal((await stage.handler({ titleId: x.titleId, mode: "SUBMISSION_04_SEND" }, x.deps)).status, 200);
  assert.equal(x.counts.sends, 1);
});
test("delivery failure retains the sent receipt, backs off and recovers without another send", async () => {
  const x = fixture(); x.deps.verifyDelivery = async () => null;
  assert.equal((await stage.handler({ titleId: x.titleId, mode: "SUBMISSION_04_SEND" }, x.deps)).status, 409);
  const key = [...x.blobs.keys()].find(k => k.endsWith("/monitor.json"));
  assert.equal(JSON.parse(x.blobs.get(key)).status, "RETRY_PENDING");
  x.put(key, { ...JSON.parse(x.blobs.get(key)), nextAttemptAt: "2020-01-01T00:00:00Z" });
  x.deps.verifyDelivery = async () => x.delivered;
  assert.equal((await stage.handler({ titleId: x.titleId, mode: "SUBMISSION_04_RECONCILE" }, x.deps)).jsonBody.stage04, "WAITING_AUTHOR_ELECTION");
  assert.equal(x.counts.sends, 1);
});
test("scheduled recovery retries only previously started offers", async () => {
  const x = fixture();
  await stage.monitor(x.deps);
  assert.equal(x.counts.sends, 0);
  const send = x.deps.sendOffer;
  x.deps.sendOffer = async () => { throw Object.assign(Error("timeout"), { statusCode: 503 }); };
  await stage.handler({ titleId: x.titleId, mode: "SUBMISSION_04_SEND" }, x.deps);
  const key = [...x.blobs.keys()].find(k => k.includes("send-executions/"));
  x.put(key, { ...JSON.parse(x.blobs.get(key)), nextAttemptAt: "2020-01-01T00:00:00Z" });
  x.deps.sendOffer = send;
  const result = await stage.monitor(x.deps);
  assert.equal(result.find(r => r.titleId === x.titleId).stage04, "WAITING_AUTHOR_ELECTION");
  assert.equal(x.counts.sends, 1);
  await stage.monitor(x.deps);
  assert.equal(x.counts.sends, 1);
});
test("conflicting copies of one immutable response identity fail closed", async () => {
  const x = fixture();
  await stage.handler({ titleId: x.titleId, mode: "SUBMISSION_04_SEND" }, x.deps);
  x.replies.push(reply(x, "ACCEPT"), reply(x, "DECLINE"));
  const result = await stage.handler({ titleId: x.titleId, mode: "SUBMISSION_04_RECONCILE" }, x.deps);
  assert.equal(result.jsonBody.code, "STAGE04_RESPONSE_REPLAY_CONFLICT");
  assert.equal([...x.blobs.keys()].some(k => k.endsWith("/response.json")), false);
});
test("conflicting author decisions are retained and held", async () => {
  const x = fixture(); await stage.handler({ titleId: x.titleId, mode: "SUBMISSION_04_SEND" }, x.deps);
  x.replies.push(reply(x, "ACCEPT", "first"), { ...reply(x, "DECLINE", "second"), receivedDateTime: "2026-10-12T12:11:00Z" });
  const result = await stage.handler({ titleId: x.titleId, mode: "SUBMISSION_04_RECONCILE" }, x.deps);
  assert.equal(result.jsonBody.response.status, "CONFLICT_REQUIRES_AUTHOR_REVIEW");
  assert.equal(result.jsonBody.response.decision, null); assert.equal(result.jsonBody.stage05, "NOT_STARTED");
});
test("mail pagination remains within the authorized mailbox and recipient proof requires real copy", async () => {
  const deps = { mailGraph: async () => ({ value: [], "@odata.nextLink": "https://graph.microsoft.com/v1.0/users/unrelated/messages?x=1" }) };
  await assert.rejects(mail.pages(mail.MAILBOX, {}, deps), /PAGINATION_DENIED/);
  const x = fixture(), bundle = await stage.load(x.titleId, x.deps);
  const id = "a".repeat(32), message = { id: "cc", internetMessageId: `<261012120000.${id}-abc@microsoft.com>`, subject: mail.render(bundle.title, bundle.offer).subject,
    from: { emailAddress: { address: mail.FROM } }, toRecipients: [{ emailAddress: { address: mail.AUTHOR } }], ccRecipients: [{ emailAddress: { address: mail.MAILBOX } }] };
  assert.equal(await mail.delivery({ providerMessageId: id, mailboxMessageId: "cc" }, bundle,
    { mailGraph: async p => p.includes("/messages/cc?") ? message : { value: [] } }), null);
});
test("mail read failures retain sanitized provider status and scope", async () => {
  const x = fixture();
  x.deps.verifyDelivery = async () => { throw Object.assign(Error("private provider detail"), {
    safeCode: "STAGE04_MAIL_READ_FAILED", statusCode: 404, providerCode: "ErrorItemNotFound", mailReadScope: "PUBLISHING" }); };
  const result = await stage.handler({ titleId: x.titleId, mode: "SUBMISSION_04_SEND" }, x.deps);
  assert.equal(result.jsonBody.providerStatus, 404);
  const key = [...x.blobs.keys()].find(k => k.endsWith("/monitor.json"));
  const evidence = JSON.parse(x.blobs.get(key));
  assert.equal(evidence.providerCode, "ErrorItemNotFound");
  assert.equal(evidence.mailReadScope, "PUBLISHING");
  assert.equal(JSON.stringify(evidence).includes("private provider detail"), false);
});
