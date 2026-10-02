"use strict";
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { attributeCommunicationCopies } = require("../src/mail/portfolioCommunicationAttribution");
const provider = "11111111-1111-4111-8111-111111111111";
const message = { internetMessageId: `<202609210902.${provider.replaceAll("-", "")}-copy@microsoft.com>`,
  fromAddress: "publishing@email.jmerrill.one", to: ["author@example.org"], receivedAt: "2026-09-21T09:02:42Z" };
const log = { jm1_executionlogid: "log", jm1_actiontype: "AUTHOR_COMMUNICATION_INTENT_SENT", jm1_sourceentity: "jm1pub_title", jm1_sourcerecordid: "title",
  jm1_actiondescription: `DELIVERY_STATE=SENT; providerMessageId=${provider}; communicationRecordId=${provider}; recipient=author@example.org; sentAt=2026-09-21T09:02:37Z; DATAVERSE_RECORD=PASS; ACS_DELIVERY=PASS;` };
const authority = { titles: [{ jm1pub_titleid: "title", _jm1_primaryauthor_value: "contact" }],
  contacts: [{ contactid: "contact", emailaddress1: "author@example.org" }], logs: [log] };
test("exact provider copy binds recorded title and recipient without granting response authority", () => {
  const [result] = attributeCommunicationCopies([message], authority);
  assert.equal(result.binding.titleId, "title");
  assert.equal(result.authorDecisionAuthority, false);
  assert.equal(result.providerDeliveryReverified, false);
});
test("sender, recipient, timestamp and existing title disagreements cannot acquire a binding", () => {
  for (const alteration of [{ fromAddress: "attacker@example.org" }, { to: ["other@example.org"] },
    { receivedAt: "2026-09-25T00:00:00Z" }, { titleId: "other" }, { authorId: "other" },
    { communicationRecordId: "other" }, { providerMessageId: "other" }, { correlationStatus: "CONFLICT_HELD" }]) {
    assert.equal(attributeCommunicationCopies([{ ...message, ...alteration }], authority)[0].binding, undefined);
  }
});
test("conflicting or incomplete source logs poison a provider ID, regardless of ordering", () => {
  for (const logs of [[log, { ...log, jm1_sourcerecordid: "other" }], [{ ...log, jm1_sourcerecordid: "other" }, log]]) {
    assert.equal(attributeCommunicationCopies([message], { ...authority, logs })[0].status, "AUTHORITY_CONFLICT_OR_INCOMPLETE");
  }
});
