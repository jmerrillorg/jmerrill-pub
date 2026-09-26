"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { htmlProjectionHashes, textProjectionHash } = require("../../src/mail/inbound/mailboxBodyProjection");
const { verifyMailboxCopy } = require("../../src/mail/inbound/serviceRunner");

test("HTML mailbox projection preserves all visible content and tolerates transport whitespace only", async () => {
  const html = '<html><head><style>p { color: red; }</style></head><body><div style="display:none">Preview</div><p>Good day, Author,</p><p>Received $519.76. Balance $1,559.23.</p><p>J Merrill Publishing</p></body></html>';
  const hashes = htmlProjectionHashes(html);
  const visible = 'Good day, Author,\r\n\r\nReceived $519.76. Balance $1,559.23.\r\nJ Merrill Publishing';
  assert.ok(hashes.includes(textProjectionHash(visible)));
  assert.ok(hashes.includes(textProjectionHash(`Preview ${visible}`)));
  const service = { subject: "Your account", recipient: "author@example.com", sentAt: "2026-09-26T12:00:00Z", htmlBodyProjectionHashes: hashes };
  const message = { id: "copy-1", subject: service.subject, from: { emailAddress: { address: "publishing@email.jmerrill.one" } },
    toRecipients: [{ emailAddress: { address: service.recipient } }], ccRecipients: [{ emailAddress: { address: "publishing@jmerrill.one" } }],
    body: { content: visible } };
  const graphClient = { listInboxMessagesSince: async () => ({ value: [message] }) };
  assert.equal((await verifyMailboxCopy(graphClient, service)).status, "PASS");
  message.body.content = visible.replace("$1,559.23", "$1,819.11");
  assert.equal((await verifyMailboxCopy(graphClient, service)).status, "PENDING");
  message.body.content = `${visible}\nUnapproved additional terms.`;
  assert.equal((await verifyMailboxCopy(graphClient, service)).status, "PENDING");
});
