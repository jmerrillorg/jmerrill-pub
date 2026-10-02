"use strict";

// Read-only evidence projection. This never creates delivery or author-decision authority.
const GUID = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;
function field(text, name) {
  return String(text || "").match(new RegExp(`(?:^|[; ])${name}=([^; ]+)`, "i"))?.[1] || "";
}
function attributeCommunicationCopies(messages, authority) {
  const titles = new Map(authority.titles.map(row => [row.jm1pub_titleid, row]));
  const contacts = new Map(authority.contacts.map(row => [row.contactid, row]));
  const candidates = new Map();
  for (const log of authority.logs) {
    if (log.jm1_actiontype !== "AUTHOR_COMMUNICATION_INTENT_SENT") continue;
    const provider = field(log.jm1_actiondescription, "providerMessageId").toLowerCase();
    if (!GUID.test(provider)) continue;
    const rows = candidates.get(provider.replaceAll("-", "")) || [];
    rows.push(log);
    candidates.set(provider.replaceAll("-", ""), rows);
  }
  return messages.map(message => {
    if (message.correlationStatus === "CONFLICT_HELD") return { message, status: "EXISTING_IDENTITY_CONFLICT_HELD" };
    const sender = String(message.fromAddress || message.from || "").toLowerCase();
    const match = String(message.internetMessageId || "").match(/^<\d{12}\.([0-9a-f]{32})-[^<>]+@microsoft\.com>$/i);
    if (sender !== "publishing@email.jmerrill.one" || !match) return { message, status: "NO_EXACT_PROVIDER_COPY" };
    const logs = candidates.get(match[1].toLowerCase()) || [];
    if (!logs.length) return { message, status: "NO_EXACT_COMMUNICATION_LOG" };
    const valid = logs.map(log => {
      const title = titles.get(log.jm1_sourcerecordid);
      const contact = contacts.get(title?._jm1_primaryauthor_value);
      const description = log.jm1_actiondescription;
      const recipient = field(description, "recipient").toLowerCase();
      const communicationRecordId = field(description, "communicationRecordId");
      const sentAt = field(description, "sentAt");
      const receivedAt = message.receivedAt || message.receivedDateTime;
      const observedAt = message.sentAt || message.sentDateTime || receivedAt;
      if (log.jm1_sourceentity !== "jm1pub_title" || !title || !contact || !GUID.test(communicationRecordId) ||
          field(description, "DELIVERY_STATE") !== "SENT" ||
          field(description, "DATAVERSE_RECORD") !== "PASS" || field(description, "ACS_DELIVERY") !== "PASS" ||
          !recipient || recipient !== String(contact.emailaddress1 || "").toLowerCase() ||
          !(message.to || []).some(address => String(address).toLowerCase() === recipient) ||
          !Number.isFinite(Date.parse(sentAt)) || !Number.isFinite(Date.parse(observedAt)) ||
          Math.abs(Date.parse(observedAt) - Date.parse(sentAt)) > 86400000 ||
          (message.titleId && message.titleId !== title.jm1pub_titleid) ||
          (message.authorId && message.authorId !== contact.contactid)) return null;
      return { titleId: title.jm1pub_titleid, authorId: contact.contactid, communicationRecordId,
        providerMessageId: field(description, "providerMessageId"), logId: log.jm1_executionlogid };
    });
    const tuples = new Set(valid.filter(Boolean).map(row => JSON.stringify([row.titleId, row.authorId, row.communicationRecordId])));
    if (valid.some(row => !row) || tuples.size !== 1) return { message, status: "AUTHORITY_CONFLICT_OR_INCOMPLETE", logIds: logs.map(row => row.jm1_executionlogid) };
    return { message, status: "EXACT_PROVIDER_LOG_TITLE_CONTACT_RECIPIENT_MATCH", binding: valid[0],
      sourceLogIds: valid.map(row => row.logId), authorDecisionAuthority: false, providerDeliveryReverified: false };
  });
}

module.exports = { attributeCommunicationCopies };
