"use strict";
const { app } = require("@azure/functions");
const { createDataverseClient } = require("../orchestration/authorReviewResponseConsumer");
const { PublishingMailboxGraphClient } = require("../mail/inbound/graphClient");
const { authorReplyText } = require("../mail/inbound/replyText");
const { renderPublishingServiceCorrespondence } = require("../generated/communications/jm1-enterprise-communication-renderer");
const GUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;
function field(description, name) {
  return String(description || "").match(new RegExp(`(?:^|[; ])${name}=([^; ]+)`, "i"))?.[1] || "";
}

async function lifecycleReadback(body, deps) {
  const authorId = String(body.authorId || "").toLowerCase();
  const titleId = String(body.titleId || "").toLowerCase();
  if (!GUID.test(authorId) || !GUID.test(titleId)) return { status: 400, jsonBody: { error: "IMMUTABLE_IDENTITY_REQUIRED", effects: 0 } };
  const contact = await deps.client.first("contacts", { $select: "contactid,fullname,emailaddress1,emailaddress2,emailaddress3", $filter: `contactid eq ${authorId}` });
  const title = await deps.client.first("jm1pub_titles", { $select: "jm1pub_titleid,jm1pub_titlename,_jm1_primaryauthor_value", $filter: `jm1pub_titleid eq ${titleId}` });
  if (contact?.contactid !== authorId || title?.jm1pub_titleid !== titleId || title?._jm1_primaryauthor_value !== authorId || !contact.emailaddress1) {
    return { status: 409, jsonBody: { error: "AUTHOR_TITLE_AUTHORITY_DENIED", effects: 0 } };
  }
  const after = new Date(body.afterIso);
  if (!Number.isFinite(after.getTime()) || Date.now() - after.getTime() > 90 * 86400000 || after.getTime() > Date.now()) {
    return { status: 400, jsonBody: { error: "BOUNDED_READ_WINDOW_REQUIRED", effects: 0 } };
  }
  if (body.includeSystemCensus === true && Date.now() - after.getTime() > 7 * 86400000) {
    return { status: 400, jsonBody: { error: "RECENT_SYSTEM_CENSUS_WINDOW_REQUIRED", effects: 0 } };
  }
  const email = contact.emailaddress1.toLowerCase().replace(/'/g, "''");
  const literalTitle = title.jm1pub_titlename.replace(/'/g, "''");
  const deliveryTime = body.includeResponseSearch === true ? new Date(body.deliverySentAtIso) : null;
  if (deliveryTime && (!Number.isFinite(deliveryTime.getTime()) ||
      deliveryTime.getTime() < after.getTime() || deliveryTime.getTime() > Date.now())) {
    return { status: 400, jsonBody: { error: "BOUNDED_DELIVERY_TIME_REQUIRED", effects: 0 } };
  }
  const deliveryStart = deliveryTime && new Date(deliveryTime.getTime() - 86400000).toISOString();
  const deliveryEnd = deliveryTime && new Date(Math.min(Date.now(), deliveryTime.getTime() + 86400000)).toISOString();
  const filters = [
    `receivedDateTime ge ${after.toISOString()} and from/emailAddress/address eq '${email}'`,
    deliveryTime
      ? `receivedDateTime ge ${deliveryStart} and receivedDateTime le ${deliveryEnd} and from/emailAddress/address eq 'publishing@email.jmerrill.one'`
      : `receivedDateTime ge ${after.toISOString()} and contains(subject,'${literalTitle}')`,
  ];
  if (body.includeSystemCensus === true) filters.push(
    `receivedDateTime ge ${after.toISOString()} and from/emailAddress/address eq 'publishing@email.jmerrill.one'`);
  const queries = [];
  async function readFilter(filter) {
    const rows = [];
    let next = `/users/publishing@jmerrill.one/messages?${new URLSearchParams({ $filter: filter, $top: "100", $select: "id,subject,from,toRecipients,ccRecipients,receivedDateTime,sentDateTime,body,conversationId,internetMessageId,hasAttachments" })}`;
    for (let page = 0; next && page < 10; page++) {
      const pageUrl = new URL(next.startsWith("/users/") ? `/v1.0${next}` : next, "https://graph.microsoft.com");
      if (pageUrl.origin !== "https://graph.microsoft.com" ||
          decodeURIComponent(pageUrl.pathname) !== "/v1.0/users/publishing@jmerrill.one/messages") {
        throw new Error("MAILBOX_PAGINATION_SCOPE_DENIED");
      }
      const response = await deps.graphClient.request("GET", pageUrl.pathname.replace(/^\/v1\.0/, "") + pageUrl.search, null, { Prefer: 'outlook.body-content-type="text"' });
      rows.push(...response.value);
      next = response["@odata.nextLink"] || null;
    }
    return { filter, complete: !next, rows: rows.map(message => ({ ...message, authorReply: authorReplyText(message) })) };
  }
  for (const filter of filters) queries.push(await readFilter(filter));
  const responseSearch = { requested: body.includeResponseSearch === true, complete: null,
    aliases: [], unverifiedAliasLeads: [], threadCount: 0, identityChanges: 0 };
  if (responseSearch.requested) {
    const registeredAlternates = [...new Set([contact.emailaddress2, contact.emailaddress3]
      .map(value => String(value || "").trim().toLowerCase()).filter(value => value && value !== email))];
    const identityEvidence = registeredAlternates.length ? await deps.client.list("jm1_executionlogs", {
      $select: "jm1_executionlogid,jm1_actiondescription,jm1_sourceentity,jm1_sourcerecordid,createdon",
      $filter: `jm1_sourcerecordid eq '${authorId}' and jm1_actiontype eq 'AUTHOR_EMAIL_IDENTITY_VERIFIED'`,
      $top: "100",
    }) : [];
    const verifiedAlternates = registeredAlternates.filter(address => identityEvidence.some(record =>
      record.jm1_sourceentity === "contact" && record.jm1_sourcerecordid?.toLowerCase() === authorId &&
      field(record.jm1_actiondescription, "address").toLowerCase() === address &&
      field(record.jm1_actiondescription, "status") === "VERIFIED" &&
      field(record.jm1_actiondescription, "verificationMethod") === "PRIMARY_EMAIL_EXPLICIT_STATEMENT" &&
      Boolean(field(record.jm1_actiondescription, "sourceMessageId")) &&
      Number.isFinite(Date.parse(field(record.jm1_actiondescription, "verifiedAt")))));
    responseSearch.aliases = verifiedAlternates;
    // Alternate addresses are search leads from the author's new text, not
    // verified account identities or permission to change the recipient.
    const authorMessages = queries[0].rows.filter(message =>
      message.from?.emailAddress?.address?.toLowerCase() === contact.emailaddress1.toLowerCase());
    const aliases = new Set(registeredAlternates.filter(address => !verifiedAlternates.includes(address)));
    for (const message of authorMessages) {
      const reply = authorReplyText(message);
      if (!/\b(?:email|address|correspondence)\b/i.test(reply)) continue;
      for (const match of reply.matchAll(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi)) {
        const address = match[0].toLowerCase();
        if (address !== contact.emailaddress1.toLowerCase() && !verifiedAlternates.includes(address) &&
            !address.endsWith("@jmerrill.one") &&
            !address.endsWith("@email.jmerrill.one")) aliases.add(address);
      }
    }
    const threads = [...new Set(queries[1].rows.filter(message =>
      ["publishing@email.jmerrill.one", "publishing@jmerrill.one"].includes(message.from?.emailAddress?.address?.toLowerCase()) &&
      message.toRecipients?.some(recipient => recipient.emailAddress?.address?.toLowerCase() === contact.emailaddress1.toLowerCase()))
      .map(message => message.conversationId).filter(Boolean))];
    if (aliases.size + verifiedAlternates.length > 5 || threads.length > 50 || identityEvidence.length >= 100) {
      responseSearch.complete = false;
      responseSearch.reason = "RESPONSE_SEARCH_SCOPE_LIMIT";
    } else {
      responseSearch.unverifiedAliasLeads = [...aliases];
      responseSearch.threadCount = threads.length;
      for (const address of [...verifiedAlternates, ...aliases]) queries.push(await readFilter(
        `receivedDateTime ge ${after.toISOString()} and from/emailAddress/address eq '${address.replace(/'/g, "''")}'`));
      for (const thread of threads) queries.push(await readFilter(
        `receivedDateTime ge ${after.toISOString()} and conversationId eq '${thread.replace(/'/g, "''")}'`));
      responseSearch.complete = queries.every(query => query.complete) && aliases.size === 0;
      if (aliases.size) responseSearch.reason = "ALTERNATE_SENDER_IDENTITY_UNVERIFIED";
    }
  }
  const presentationEvidence = [];
  const systemPresentationEvidence = [];
  let presentationComplete = null;
  if (body.includePresentation === true) {
    const outbound = queries[1].rows.filter(message =>
      ["publishing@email.jmerrill.one", "publishing@jmerrill.one"].includes(message.from?.emailAddress?.address?.toLowerCase()) &&
      (message.toRecipients?.some(recipient => recipient.emailAddress?.address?.toLowerCase() === contact.emailaddress1.toLowerCase()) ||
        (body.includeInternalProof === true && message.subject === `Publishing Internal Presentation Check - ${title.jm1pub_titlename}` &&
          message.toRecipients?.length > 0 && [...message.toRecipients, ...(message.ccRecipients || [])].every(recipient =>
            recipient.emailAddress?.address?.toLowerCase() === "publishing@jmerrill.one"))));
    presentationComplete = queries[1].complete && outbound.length <= 50;
    for (const message of outbound.slice(0, 50)) {
      const path = `/users/publishing@jmerrill.one/messages/${encodeURIComponent(message.id)}`;
      const native = await deps.graphClient.request("GET", `${path}?$select=id,subject,body,sentDateTime,internetMessageId`, null,
        { Prefer: 'outlook.body-content-type="html"' });
      const attachments = message.hasAttachments ? await deps.graphClient.request("GET",
        `${path}/attachments?$select=id,name,contentType,size,isInline`) : { value: [] };
      presentationEvidence.push({ ...native, attachments: attachments.value });
    }
  }
  if (body.includeSystemCensus === true && body.includePresentation === true) {
    for (const message of queries[2].rows.slice(0, 50)) {
      const path = `/users/publishing@jmerrill.one/messages/${encodeURIComponent(message.id)}`;
      const native = await deps.graphClient.request("GET", `${path}?$select=id,subject,body,sentDateTime,internetMessageId`, null,
        { Prefer: 'outlook.body-content-type="html"' });
      systemPresentationEvidence.push({ ...native, from: message.from, toRecipients: message.toRecipients,
        ccRecipients: message.ccRecipients, text: message.body?.content || "" });
    }
  }
  const rendering = renderPublishingServiceCorrespondence({ subject: "Publishing Service Rendering Proof",
    authorName: "Test Operator", body: "Good day, Test,\n\nThis is an effect-free rendering fixture.\n\nJ Merrill Publishing",
    templateName: "PUBLISHING_SERVICE_RENDER_PROOF", templateVersion: "1.0" });
  return { status: 200, jsonBody: { mode: "READ_ONLY", authorId, titleId, authorEmail: contact.emailaddress1.toLowerCase(), authorTitleBinding: "PASS", queries, responseSearch, presentationEvidence,
    presentationComplete, systemPresentationEvidence,
    systemPresentationComplete: body.includeSystemCensus === true && body.includePresentation === true
      ? queries[2].complete && queries[2].rows.length <= 50 : null,
    rendering, effects: 0, communicationsSent: 0, noSend: true } };
}

async function lifecycleReadbackHandler(request, deps = {}) {
    const key = (deps.env || process.env).JM1_DIAGNOSTIC_RUNNER_KEY;
    if (!key || request.headers.get("x-jm1-diagnostic-runner-key") !== key) return { status: 401, jsonBody: { error: "UNAUTHORIZED" } };
    let body;
    try { body = await request.json(); } catch { return { status: 400, jsonBody: { error: "INVALID_JSON" } }; }
    if (["COMMISSIONING_INTAKE_READ_ONLY", "COMMISSIONING_REVIEW_READ_ONLY", "COMMISSIONING_IDENTITY_READ_ONLY"].includes(body?.mode)) {
      try { return await (deps.commissioningReadback || require("../lifecycle/titleCommissioningReadback").titleCommissioningReadback)(body); }
      catch (error) { return { status: 502, jsonBody: {
        error: /^(?:REVIEW|COMMISSIONING)_[A-Z_]{1,100}$/.test(error?.safeCode || "")
          ? error.safeCode : "COMMISSIONING_NATIVE_READBACK_FAILED", effects: 0 } }; }
    }
    try { return await lifecycleReadback(body, {
      client: createDataverseClient({ apiBase: process.env.DATAVERSE_WEB_API_BASE_URL, resourceUrl: process.env.DATAVERSE_RESOURCE_URL }),
      graphClient: new PublishingMailboxGraphClient(),
    }); } catch (error) { return { status: 502, jsonBody: { error: error.safeCode || "AUTHORITATIVE_READ_FAILED", effects: 0 } }; }
}
app.http("publishing-lifecycle-readback", {
  methods: ["POST"], authLevel: "anonymous", route: "publishing/lifecycle/readback",
  handler: request => lifecycleReadbackHandler(request),
});
module.exports = { lifecycleReadback, lifecycleReadbackHandler };
