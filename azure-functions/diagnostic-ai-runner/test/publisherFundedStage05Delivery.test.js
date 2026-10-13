"use strict";
const test = require("node:test"), assert = require("node:assert/strict");
const b = require("../src/lifecycle/newSubmissionStage03Budget");
const stage04 = require("../src/lifecycle/publisherFundedStage04");
const stage05 = require("../src/lifecycle/publisherFundedStage05");
const mail = require("../src/lifecycle/publisherFundedStage04Mail");
const titleId = Object.keys(require("../src/lifecycle/jackieInternalTitlePolicy").TITLES)[0];

function fixture() {
  const offerSha256 = "a".repeat(64), bytes = Buffer.from("isolated attachment fixture");
  const prefix = `publisher-funded/stage05/${titleId}/${offerSha256}/replacement-v2`;
  const records = new Map([[`${prefix}/admin-send.json`, Buffer.from(JSON.stringify({
    agreementSha256: b.sha(bytes), subject: "Fixture administration", sent: {
      providerMessageId: "12345678-1234-1234-1234-123456789abc", sentAt: "2026-10-13T12:00:00.000Z" } }))]]);
  const containerClient = { getBlockBlobClient: path => ({
    async getProperties() { if (!records.has(path)) throw { statusCode: 404 }; return { etag: "fixture" }; },
    async downloadToBuffer() { if (!records.has(path)) throw { statusCode: 404 }; return records.get(path); },
    async uploadData(value) { if (records.has(path)) throw { statusCode: 412 }; records.set(path, value); },
  }) };
  const message = { id: "immutable-fixture", internetMessageId: "<202610131200.12345678123412341234123456789abc-fixture@microsoft.com>",
    subject: "Fixture administration", from: { emailAddress: { address: mail.FROM } },
    toRecipients: [{ emailAddress: { address: mail.MAILBOX } }], hasAttachments: true,
    receivedDateTime: "2026-10-13T12:00:01.000Z" };
  const attachments = { value: [{ "@odata.type": "#microsoft.graph.fileAttachment", id: "attachment-fixture",
    contentBytes: bytes.toString("base64") }] };
  let reads = 0;
  return { offerSha256, records, prefix, message, attachments, reads: () => reads, deps: {
    containerClient, mailGraph: async path => { reads++; return path.endsWith("/attachments") ? attachments : { value: [message] }; },
  } };
}
test("admin delivery requires exact recipient message and attachment bytes; replay uses durable receipt", async t => {
  const original = stage04.load;
  t.after(() => { stage04.load = original; });
  const f = fixture(); stage04.load = async () => ({ offer: { offerSha256: f.offerSha256 } });
  const first = await stage05.delivery(titleId, f.deps);
  assert.equal(first.delivered, true);
  assert.equal(first.stage05Complete, false);
  assert.equal(first.attachmentId, "attachment-fixture");
  const reads = f.reads();
  assert.deepEqual(await stage05.delivery(titleId, f.deps), first);
  assert.equal(f.reads(), reads);
});
test("wrong attachment bytes, recipient, or incomplete attachment page cannot prove delivery", async t => {
  const original = stage04.load;
  t.after(() => { stage04.load = original; });
  for (const alter of [f => { f.attachments.value[0].contentBytes = Buffer.from("wrong").toString("base64"); },
    f => { f.message.toRecipients[0].emailAddress.address = "other@example.invalid"; },
    f => { f.attachments["@odata.nextLink"] = "https://graph.microsoft.com/next"; }]) {
    const f = fixture(); stage04.load = async () => ({ offer: { offerSha256: f.offerSha256 } }); alter(f);
    await assert.rejects(stage05.delivery(titleId, f.deps));
    assert.equal(f.records.has(`${f.prefix}/admin-delivery.json`), false);
  }
});
