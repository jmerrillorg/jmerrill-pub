"use strict";
const { createHash } = require("node:crypto");
const internalMail = require("./publisherFundedInternalMail");
const sha = value => createHash("sha256").update(value).digest("hex");
const AUTHOR = "jackie@jmerrill.one", MAILBOX = "publishing@jmerrill.one", FROM = "publishing@email.jmerrill.one";
function deny(code) { throw Object.assign(new Error(code), { safeCode: code }); }
function headers(message, name) {
  return (message.internetMessageHeaders || []).filter(h => h.name.toLowerCase() === name).map(h => h.value).join("\n");
}
function authentication(message) {
  const internal = internalMail.authenticate(message);
  if (internal) return internal;
  const values = headers(message, "authentication-results");
  return { dmarc: values.match(/\bdmarc=(pass|fail|none|bestguesspass|temperror|permerror)\b/i)?.[1]?.toLowerCase() || "UNVERIFIED",
    spf: values.match(/\bspf=(pass|fail|softfail|neutral|none|temperror|permerror)\b/i)?.[1]?.toLowerCase() || "UNVERIFIED",
    dkim: values.match(/\bdkim=(pass|fail|none|neutral|temperror|permerror)\b/i)?.[1]?.toLowerCase() || "UNVERIFIED",
    headerSha256: sha(values) };
}
function render(title, offer) {
  const reference = `JMP-OFFER-${offer.offerSha256.slice(0, 16).toUpperCase()}`;
  const special = offer.titleId === "f1908dc9-5775-f111-ab0f-6045bdd69435"
    ? "Start with focused developmental review. Unified versus separate presentation remains unresolved; no split is authorized."
    : offer.titleId === "e797232b-da7a-f111-ab0f-00224820105b"
      ? "Keep the two manuscript components separate throughout editorial work. This offer does not authorize their assembly."
      : offer.titleId === "0e127af9-fcb3-5671-a0fa-e4af63c307d1"
        ? "Preserve the no-invention boundaries: no invented scenes, memories, quotations, dates, motives or outcomes."
        : "Preserve all source, disclosure, rights and presentation conditions stated in the accepted assessment.";
  const lines = [`# ${title}`, "", `Publisher-funded editorial recommendation and offer ${offer.version}`, `Reference: ${reference}`, "",
    "## Recommendation", "", "Proceed with the accepted developmental editorial scope described in the following assessment package(s).", special, "",
    ...offer.components.flatMap((c, i) => [`### Component ${i + 1}`, `Assessment: ${c.assessment.webUrl}`,
      `Source SHA-256: ${c.sourceSha256}`, `Assessment SHA-256: ${c.assessmentSha256}`, ""]),
    "## Funding and agreement terms", "", offer.fundedTerms.clause, "",
    `The attached JMP Publishing Agreement ${offer.baseAgreement.version} supplies the existing rights, royalty and warranty terms.`,
    "For this Work, the funded clause above supersedes only conflicting author-fee and automatic production-cost reimbursement requirements, including the relevant portions of sections 2.4, 4.2 and 10.2. Other agreement terms remain unchanged.",
    "Accepting this offer records your author election. It does not execute the agreement. Actual signatures by the required parties and an approved budget for the next work remain required before that work proceeds.",
    "No retail package fee, author invoice, payment request, new expense, provider commitment or publication is authorized by this offer.", "",
    "## Your decision as author", "", "Reply to the offer email with one of these words on the first line: ACCEPT, DECLINE, or HOLD. You may include a question or requested change instead; that will remain for review without an inferred acceptance.",
    "Publisher approval is separate from your author election. Please respond to this exact offer email so your decision stays attached to the correct manuscript and version.", "",
    `Offer SHA-256: ${offer.offerSha256}`, `Policy SHA-256: ${offer.policySha256}`, `Selection SHA-256: ${offer.selectionSha256}`, ""];
  return { reference, subject: `Your author decision: ${title} [${reference}]`, review: lines.join("\n"), special };
}
function legacyPayload(bundle, packageOutput, baseBytes, approvedOn) {
  const { title, offer, intakeReference } = bundle, copy = render(title, offer);
  const attachment = (name, bytes, contentType, role) => ({ name, contentType, contentInBase64: bytes.toString("base64"),
    sha256: sha(bytes), role, version: offer.version, artifactId: `${offer.offerSha256}:${role}` });
  return { messageType: "APPROVED_AUTHOR_RESPONSE", diagnosticId: offer.titleId, intakeReferenceCode: intakeReference,
    authorEmail: AUTHOR, authorName: "Jackie Smith, Jr.", projectTitle: title, subject: copy.subject,
    body: `Good day, Jackie,\n\nYour publisher-funded offer for ${title} is ready for your decision as author.\n\nRecommended scope: developmental editorial review. ${copy.special}\n\nAuthor publishing fees: $0.\n\n${offer.fundedTerms.clause}\n\nReview the exact offer and assessment links: ${packageOutput.webUrl}\n\nThe offer and existing base agreement are also attached. The funded clause supersedes conflicting author-fee and automatic production-cost reimbursement provisions for this Work. Existing rights, royalties, warranties and disclosure obligations are preserved.\n\nPlease reply to this email with ACCEPT, DECLINE, or HOLD on the first line. Questions or requested changes will remain for review. Your earlier Publisher approval does not count as this author decision. Acceptance leads to agreement preparation; it is not an executed agreement or approval of new spending.\n\nOffer version ${offer.version}; reference ${copy.reference}.\n\nJ Merrill Publishing`,
    templateName: "PUBLISHER_FUNDED_STAGE04_OFFER_V1", templateVersion: "1.0.0",
    approvedBy: `publisher-selection:${offer.selectionSha256}`, approvedOn,
    futureSendRequiresInternalCopy: true, futureSendRequiresDataverseLog: true,
    internalVisibilityMailbox: MAILBOX, cc: [MAILBOX], bcc: [], replyTo: MAILBOX,
    attachments: [attachment(`${copy.reference}.md`, Buffer.from(copy.review), "text/markdown", "EXACT_VERSION_FUNDED_OFFER"),
      attachment("JMP-Publishing-Agreement-v1.3.1.docx", baseBytes, "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "BASE_AGREEMENT_FOR_REVIEW")]
  };
}
async function payload(bundle, packageOutput, baseBytes, approvedOn, presentationVersion = 2) {
  const value = legacyPayload(bundle, packageOutput, baseBytes, approvedOn);
  if (presentationVersion === 1) return value;
  if (presentationVersion !== 2) deny("STAGE04_PRESENTATION_VERSION_INVALID");
  const copy = render(bundle.title, bundle.offer);
  const documents = require("./publisherFundedStage04Attachments");
  // Custody URLs remain in the internal review, not in author-facing instructions.
  const pdf = await documents.offerPdf(copy.review.replace(/^Assessment: .*$/gm, "Assessment retained with the exact-version Publishing record."));
  const agreement = await documents.agreementCopy(baseBytes, bundle, copy.reference);
  value.body = value.body.replace(`Review the exact offer and assessment links: ${packageOutput.webUrl}`,
    "Please review the attached offer and publishing agreement, then reply to this email with your decision.")
    .replace("The offer and existing base agreement are also attached.", "The attachments identify your title and exact offer version.");
  value.templateVersion = "1.1.0";
  value.attachments = value.attachments.map((attachment, index) => ({ ...attachment,
    name: index === 0 ? `${copy.reference}.pdf` : `${copy.reference}-Publishing-Agreement.docx`,
    contentType: index === 0 ? "application/pdf" : attachment.contentType,
    contentInBase64: (index === 0 ? pdf : agreement).toString("base64"),
    sha256: sha(index === 0 ? pdf : agreement) }));
  return value;
}
async function nativeGraph(path, deps) {
  const allowed = [AUTHOR, MAILBOX].some(mailbox => path.startsWith(`users/${encodeURIComponent(mailbox)}/messages`));
  if (!allowed || /[\r\n]/.test(path)) deny("STAGE04_MAILBOX_SCOPE_DENIED");
  const credential = deps.credential || new (require("@azure/identity").ManagedIdentityCredential)();
  const token = await credential.getToken("https://graph.microsoft.com/.default");
  const response = await (deps.fetchImpl || fetch)(`https://graph.microsoft.com/v1.0/${path}`, {
    headers: { Authorization: `Bearer ${token.token}`, Prefer: 'IdType="ImmutableId", outlook.body-content-type="text"' },
    redirect: "error", signal: AbortSignal.timeout(30000) });
  if (!response.ok) {
    const detail = await response.json().catch(() => ({}));
    throw Object.assign(new Error("STAGE04_MAIL_READ_FAILED"), { safeCode: "STAGE04_MAIL_READ_FAILED", statusCode: response.status,
      providerCode: /^[A-Za-z0-9_]+$/.test(detail.error?.code || "") ? detail.error.code : null,
      mailReadScope: path.startsWith(`users/${encodeURIComponent(AUTHOR)}/`) ? "AUTHOR" : "PUBLISHING" });
  }
  return response.json();
}
async function pages(mailbox, query, deps) {
  let path = `users/${encodeURIComponent(mailbox)}/messages?${new URLSearchParams(query)}`;
  const seen = new Set(), rows = [];
  while (path) {
    if (seen.has(path) || seen.size >= 100) deny("STAGE04_MAIL_READ_INCOMPLETE");
    seen.add(path);
    const data = await (deps.mailGraph || (p => nativeGraph(p, deps)))(path);
    if (!Array.isArray(data.value)) deny("STAGE04_MAIL_READ_INVALID");
    rows.push(...data.value.map(message => internalMail.bindCustody(message, mailbox)));
    const next = data["@odata.nextLink"];
    if (next && !next.startsWith(`https://graph.microsoft.com/v1.0/users/${encodeURIComponent(mailbox)}/messages?`)) deny("STAGE04_MAIL_PAGINATION_DENIED");
    path = next ? next.slice("https://graph.microsoft.com/v1.0/".length) : null;
  }
  return rows;
}
const SELECT = "id,internetMessageId,conversationId,receivedDateTime,subject,from,sender,toRecipients,ccRecipients,internetMessageHeaders";
async function delivery(sent, bundle, deps) {
  if (!sent.providerMessageId) return null;
  const graph = deps.mailGraph || (p => nativeGraph(p, deps));
  const providerId = require("../generated/communications/publishing-communication-acceptance").providerIdFromInternetMessageId;
  let cc;
  if (sent.mailboxMessageId) {
    cc = await graph(`users/${encodeURIComponent(MAILBOX)}/messages/${encodeURIComponent(sent.mailboxMessageId)}?$select=${SELECT}`);
  } else {
    if (!Number.isFinite(Date.parse(sent.sentAt))) deny("STAGE04_OUTBOUND_IDENTITY_CONFLICT");
    const copies = await pages(MAILBOX, { $filter: `receivedDateTime ge ${sent.sentAt} and from/emailAddress/address eq '${FROM}'`,
      $select: SELECT, $top: "100" }, deps);
    const matches = copies.filter(m => providerId(m.internetMessageId || "") === sent.providerMessageId.replaceAll("-", "").toLowerCase());
    if (matches.length > 1) deny("STAGE04_OUTBOUND_IDENTITY_CONFLICT");
    if (!matches.length) return null;
    cc = matches[0];
  }
  if (!cc.internetMessageId || providerId(cc.internetMessageId) !== sent.providerMessageId.replaceAll("-", "").toLowerCase() ||
      cc.subject !== render(bundle.title, bundle.offer).subject || cc.from?.emailAddress?.address?.toLowerCase() !== FROM ||
      !cc.toRecipients?.some(r => r.emailAddress?.address?.toLowerCase() === AUTHOR) ||
      !cc.ccRecipients?.some(r => r.emailAddress?.address?.toLowerCase() === MAILBOX)) deny("STAGE04_OUTBOUND_IDENTITY_CONFLICT");
  let found;
  try {
    found = await pages(AUTHOR, { $filter: `internetMessageId eq '${cc.internetMessageId.replace(/'/g, "''")}'`, $select: SELECT, $top: "10" }, deps);
  } catch (error) {
    if (error.safeCode !== "STAGE04_MAIL_READ_FAILED" || error.statusCode !== 403 ||
        error.providerCode !== "ErrorAccessDenied" || error.mailReadScope !== "AUTHOR") throw error;
    // An authenticated exact-thread reply proves receipt, not the outbound authentication result.
    if (!Number.isFinite(Date.parse(sent.sentAt))) throw error;
    const anchor = { internetMessageId: cc.internetMessageId, deliveredAt: sent.sentAt };
    const candidates = await replies(anchor, deps);
    const valid = candidates.filter(message => {
      const result = classify(message, bundle.offer, anchor);
      return result.decision || result.reason === "AUTHOR_TEXT_REQUIRES_REVIEW";
    }).sort((a, c) => Date.parse(a.receivedDateTime) - Date.parse(c.receivedDateTime) || a.id.localeCompare(c.id));
    if (!valid.length) throw error;
    const reply = valid[0];
    return { generated: true, sent: true, delivered: true, recipient: AUTHOR, cc: [MAILBOX],
      providerMessageId: sent.providerMessageId, communicationRecordId: sent.communicationRecordId,
      internetMessageId: cc.internetMessageId, publishingMessageId: cc.id,
      deliveredAt: sent.sentAt, deliveredAtMeaning: "LOWER_BOUND_SEND_TIME_NOT_EXACT_RECIPIENT_RECEIPT",
      receiptProvenBy: reply.receivedDateTime, replyMessageId: reply.id, replyInternetMessageId: reply.internetMessageId,
      authentication: { dmarc: "UNVERIFIED", spf: "UNVERIFIED", dkim: "UNVERIFIED" },
      replyAuthentication: authentication(reply), proof: "AUTHENTICATED_EXACT_AUTHOR_REPLY_IN_PUBLISHING_MAILBOX" };
  }
  if (found.length > 1) deny("STAGE04_RECIPIENT_MESSAGE_CONFLICT");
  if (!found.length) return null;
  const m = found[0];
  if (!m.id || m.internetMessageId !== cc.internetMessageId || m.subject !== cc.subject ||
      m.from?.emailAddress?.address?.toLowerCase() !== FROM || !m.toRecipients?.some(r => r.emailAddress?.address?.toLowerCase() === AUTHOR) ||
      !Number.isFinite(Date.parse(m.receivedDateTime))) deny("STAGE04_RECIPIENT_MESSAGE_CONFLICT");
  return { generated: true, sent: true, delivered: true, recipient: AUTHOR, cc: [MAILBOX],
    providerMessageId: sent.providerMessageId, communicationRecordId: sent.communicationRecordId,
    internetMessageId: m.internetMessageId, conversationId: m.conversationId,
    recipientMessageId: m.id, publishingMessageId: cc.id, deliveredAt: m.receivedDateTime,
    authentication: authentication(m), proof: "EXACT_PROVIDER_MESSAGE_IN_AUTHOR_MAILBOX" };
}
function classify(message, offer, delivered) {
  const sender = message.from?.emailAddress?.address?.toLowerCase();
  const replyIds = headers(message, "in-reply-to").match(/<[^>]+>/g) || [];
  if (sender !== AUTHOR || !message.toRecipients?.some(r => r.emailAddress?.address?.toLowerCase() === MAILBOX) ||
      !message.id || !message.internetMessageId || message.internetMessageId === delivered.internetMessageId ||
      replyIds.length !== 1 || replyIds[0] !== delivered.internetMessageId || /^(?:fw|fwd):/i.test(message.subject || "") ||
      (message.internetMessageHeaders || []).some(h => /^resent-/i.test(h.name)) || !Number.isFinite(Date.parse(message.receivedDateTime)) ||
      Date.parse(message.receivedDateTime) < Date.parse(delivered.deliveredAt)) return { decision: null, reason: "IDENTITY_OR_EXACT_OFFER_THREAD_MISMATCH" };
  const text = (message.uniqueBody?.content || "").trim();
  const authenticationProof = authentication(message);
  // The decision must be authored text, not the instructions quoted in the outgoing offer.
  const lines = text.split(/\r?\n/).map(x => x.trim()).filter(Boolean);
  const decision = /^(ACCEPT|DECLINE|HOLD)[.!]?$/i.exec(lines[0] || "")?.[1]?.toUpperCase();
  const extra = lines.slice(1).join(" ");
  if (authenticationProof.dmarc !== "pass" && authenticationProof.method !== "TENANT_VERIFIED_INTERNAL_MAILBOX")
    return { decision: null, reason: "AUTHOR_MESSAGE_AUTHENTICATION_REVIEW_REQUIRED" };
  const signature = extra.replace(/https:\/\/jmerrill\.one\/?/g, "").replace(/[<>\[\]]/g, "").replace(/\s+/g, " ").trim();
  const knownSignature = sha(signature) === "9ae3e7ac995e04b6fc0475856b80fc664c3c5ddad6da7032331c0ca99d9ad45d";
  if (!decision || (extra && !knownSignature && !/^(?:Jackie(?: Smith,? Jr\.?)?|Sent from my (?:iPhone|iPad))\.?$/i.test(extra)))
    return { decision: null, reason: "AUTHOR_TEXT_REQUIRES_REVIEW" };
  return { decision, offerSha256: offer.offerSha256, offerVersion: offer.version, titleId: offer.titleId,
    authorContactId: offer.authorContactId, authorEmail: sender, sourceMailbox: MAILBOX,
    graphMessageId: message.id, internetMessageId: message.internetMessageId, inReplyTo: delivered.internetMessageId,
    receivedAt: message.receivedDateTime, bodySha256: sha(text), authentication: authenticationProof };
}
async function replies(delivered, deps) {
  return pages(MAILBOX, { $filter: `receivedDateTime ge ${delivered.deliveredAt} and from/emailAddress/address eq '${AUTHOR}'`,
    $select: `${SELECT},uniqueBody`, $top: "100" }, deps);
}
async function send(message, deps) {
  const env = deps.env || process.env;
  const base = (env.JM1_AUTHOR_RESPONSE_SEND_RELAY_URL || env.JM1_JOIN_INTERNAL_NOTIFICATION_RELAY_URL || "").replace(/\/$/, "");
  if (base !== "https://func-jm1-acs-email-relay.azurewebsites.net") deny("STAGE04_RELAY_AUTHORITY_DENIED");
  const key = env.JM1_AUTHOR_RESPONSE_SEND_RELAY_KEY || env.JM1_RELAY_API_KEY || env.JM1_JOIN_INTERNAL_NOTIFICATION_RELAY_KEY;
  if (!key) deny("STAGE04_RELAY_KEY_MISSING");
  const response = await (deps.fetchImpl || fetch)(`${base}/api/send-approved-author-response`, { method: "POST",
    headers: { "Content-Type": "application/json", "x-jm1-relay-key": key }, body: JSON.stringify(message),
    redirect: "error", signal: AbortSignal.timeout(60000) }).catch(() => {
      throw Object.assign(new Error("STAGE04_RELAY_TRANSPORT_UNCERTAIN"), { safeCode: "STAGE04_RELAY_TRANSPORT_UNCERTAIN", statusCode: 503 });
    });
  const data = await response.json();
  if (!response.ok || !data.accepted || !data.providerMessageId) throw Object.assign(new Error("STAGE04_RELAY_FAILED"), {
    safeCode: data.code === "AMBIGUOUS_SEND_STATE" ? "STAGE04_AMBIGUOUS_SEND_HELD" : "STAGE04_RELAY_FAILED", statusCode: response.status });
  return { providerMessageId: data.providerMessageId, communicationRecordId: data.communicationRecordId,
    mailboxMessageId: data.mailboxMessageId || null, communicationComplete: data.communicationComplete === true,
    sentAt: data.sentAt, semanticIdempotencyKey: data.semanticIdempotencyKey, replay: data.deliveryStatus === "ALREADY_DELIVERED" };
}
module.exports = { AUTHOR, MAILBOX, FROM, render, payload, delivery, replies, classify, authentication, send, pages, nativeGraph };
