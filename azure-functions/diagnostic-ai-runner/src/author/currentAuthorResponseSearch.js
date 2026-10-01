"use strict";

const { lifecycleReadback } = require("../functions/runPublishingLifecycleReadback");

function field(description, name) {
  return String(description || "").match(new RegExp(`(?:^|[; ])${name}=([^; ]+)`, "i"))?.[1] || "";
}

function evaluateMailboxResponseSearch(readback, input) {
  const body = readback?.jsonBody;
  if (readback?.status !== 200 || body?.responseSearch?.complete !== true ||
      body?.authorTitleBinding !== "PASS" || !Array.isArray(body.queries)) {
    return { complete: false, candidateMessageIds: [], reason: body?.error || "MAILBOX_READBACK_INCOMPLETE" };
  }
  const providerId = field(input.send.jm1_actiondescription, "providerMessageId").replaceAll("-", "").toLowerCase();
  if (!/^[a-f0-9]{32}$/.test(providerId)) {
    return { complete: false, candidateMessageIds: [], reason: "PROVIDER_MESSAGE_ID_UNPROVEN" };
  }
  const messages = [...new Map(body.queries.flatMap((query) => query.rows || [])
    .filter((message) => message.id)
    .map((message) => [message.id, message])).values()];
  const copies = messages.filter((message) =>
    message.from?.emailAddress?.address?.toLowerCase() === "publishing@email.jmerrill.one" &&
    new RegExp(`^<[0-9]{12}\\.${providerId}-[^<>]+@microsoft\\.com>$`, "i").test(message.internetMessageId || "") &&
    message.toRecipients?.some((recipient) => recipient.emailAddress?.address?.toLowerCase() === body.authorEmail));
  if (copies.length !== 1 || !Number.isFinite(Date.parse(copies[0].sentDateTime))) {
    return { complete: false, candidateMessageIds: [], reason: "EXACT_MAILBOX_COPY_UNPROVEN" };
  }
  const copy = copies[0];
  const addresses = new Set([body.authorEmail, ...(body.responseSearch.aliases || [])].map((value) => value.toLowerCase()));
  const titleName = String(input.titleName || "").trim().toLowerCase();
  const candidateMessageIds = messages.filter((message) =>
    addresses.has(message.from?.emailAddress?.address?.toLowerCase()) &&
    Number.isFinite(Date.parse(message.receivedDateTime)) &&
    Date.parse(message.receivedDateTime) >= Date.parse(copy.sentDateTime) &&
    (Boolean(copy.conversationId && message.conversationId === copy.conversationId) ||
      /\b(?:approv(?:e|ed|al)|corrections?|edited manuscript|editorial review|developmental)\b/i.test(message.authorReply || "") ||
      Boolean(titleName && message.subject?.toLowerCase().includes(titleName) &&
        !/\b(?:onboarding|invoice|payment|agreement|access)\b/i.test(message.subject))))
    .map((message) => message.internetMessageId || message.id);
  return { complete: true, candidateMessageIds, deliveryMessageId: copy.internetMessageId,
    deliveredAt: copy.sentDateTime };
}

function createCurrentAuthorResponseSearch(client, graphClient, deps = {}) {
  const readback = deps.lifecycleReadback || lifecycleReadback;
  return async ({ title, stage, sendEvents }) => {
    const send = sendEvents?.[0];
    const authorId = stage?._jm1pub_contactid_value;
    const after = Date.parse(send?.createdon);
    if (!send || !Number.isFinite(after)) {
      return { complete: false, candidateMessageIds: [], reason: "SEND_TIMESTAMP_UNPROVEN" };
    }
    try {
      const result = await readback({ authorId, titleId: title.jm1pub_titleid,
        afterIso: new Date(after - 86400000).toISOString(), deliverySentAtIso: send.createdon,
        includeResponseSearch: true },
      { client, graphClient });
      return evaluateMailboxResponseSearch(result, { send, titleName: title.jm1pub_titlename });
    } catch (error) {
      return { complete: false, candidateMessageIds: [], reason: error.safeCode || "MAILBOX_READBACK_FAILED" };
    }
  };
}

module.exports = { createCurrentAuthorResponseSearch, evaluateMailboxResponseSearch };
