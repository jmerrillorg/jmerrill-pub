"use strict";
const b = require("./newSubmissionStage03Budget");
const internal = require("./jackieInternalTitlePolicy");
const documents = require("../agreement/publisherFundedReplacement");
const dates = require("../agreement/agreementEffectiveDate");
const MODES = ["SUBMISSION_05_PREPARE_REPLACEMENT", "SUBMISSION_05_REPLACEMENT_READBACK", "SUBMISSION_05_SEND_ADMIN", "SUBMISSION_05_ADMIN_DELIVERY"];
function deny(code) { throw Object.assign(new Error(code), { safeCode: code }); }

async function readPrepared(prefix, deps) {
  const saved = await b.optional(deps.containerClient, `${prefix}/prepared.json`);
  if (!saved) return null;
  const blob = deps.containerClient.getBlockBlobClient(saved.value.documentReference);
  const props = await blob.getProperties();
  const bytes = await blob.downloadToBuffer(0, undefined, { conditions: { ifMatch: props.etag } });
  if (b.sha(bytes) !== saved.value.agreementSha256) deny("STAGE05_DOCUMENT_CUSTODY_MISMATCH");
  return saved.value;
}

async function prepare(titleId, deps) {
  const bundle = await require("./publisherFundedStage04").load(titleId, deps);
  const root = `publisher-funded/stage05/${titleId}/${bundle.offer.offerSha256}`;
  const prefix = `${root}/replacement-v2`;
  const priorPrepared = await readPrepared(prefix, deps);
  if (priorPrepared) return { ...priorPrepared, replay: true };
  const election = (await b.read(deps.containerClient, `${bundle.prefix}/response.json`)).value;
  if (election.titleId !== titleId || election.status !== "AUTHOR_ELECTION_CAPTURED") deny("STAGE05_AUTHOR_ELECTION_REQUIRED");
  const previous = (await b.read(deps.containerClient, `${root}/signature-request.json`)).value;
  const contact = await deps.request(`contacts(${internal.CONTACT})?$select=contactid,fullname,address1_line1,address1_line2,address1_city,address1_stateorprovince,address1_postalcode`);
  documents.authorDetails(contact);
  let intent = (await b.optional(deps.containerClient, `${prefix}/preparation-intent.json`))?.value;
  if (!intent) {
    intent = { titleId, offerSha256: bundle.offer.offerSha256, contactEtag: contact["@odata.etag"],
      replacementAuthority: documents.AUTHORITY, effectiveDateAuthority: dates.effectiveDateAtPreparation(),
      supersededAgreementSha256: previous.agreementSha256 };
    await b.immutable(deps.containerClient, `${prefix}/preparation-intent.json`, intent);
  }
  if (intent.titleId !== titleId || intent.offerSha256 !== bundle.offer.offerSha256 ||
      intent.contactEtag !== contact["@odata.etag"] || intent.supersededAgreementSha256 !== previous.agreementSha256 ||
      intent.replacementAuthority !== documents.AUTHORITY) deny("STAGE05_PREPARATION_AUTHORITY_CHANGED");
  const result = await documents.prepare(bundle, contact, intent.effectiveDateAuthority, previous, election);
  const documentReference = `${prefix}/${result.manifest.offerId}-Agreement-v2.docx`;
  const blob = deps.containerClient.getBlockBlobClient(documentReference);
  try {
    await blob.uploadData(result.bytes, { conditions: { ifNoneMatch: "*" }, blobHTTPHeaders: {
      blobContentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" } });
  } catch (error) {
    if (![409, 412].includes(error.statusCode) || !result.bytes.equals(await blob.downloadToBuffer())) throw error;
  }
  await b.immutable(deps.containerClient, `${prefix}/prepared.json`, { ...result.manifest, documentReference,
    status: "PREPARED_PENDING_PAGE_REVIEW", sent: false, executionVerified: false, stage06: "NOT_STARTED" });
  return readPrepared(prefix, deps);
}

async function agreementFolder(titleId, deps) {
  const projection = require("./pipelineFolderProjection");
  const root = await deps.graph(projection.path(projection.FOLDERS[titleId]));
  if (!root.folder || root.parentReference?.id !== "01DF3SEQMQCCD5YVOASNAYAD6UXRPUJRCT") deny("STAGE05_FOLDER_NOT_AT_AGREEMENT_STAGE");
  const name = "_AGREEMENTS", target = `${projection.path(root.id)}:/${name}`;
  let folder;
  try { folder = await deps.graph(target); } catch (e) { if (e.statusCode !== 404) throw e; }
  if (!folder) {
    try { await deps.graph(`${projection.path(root.id)}/children`, { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, folder: {}, "@microsoft.graph.conflictBehavior": "fail" }) }); }
    catch (e) { if (![409, 412].includes(e.statusCode)) throw e; }
    folder = await deps.graph(target);
  }
  if (!folder.folder || folder.parentReference?.id !== root.id || folder.name !== name || !folder.webUrl) deny("STAGE05_AGREEMENT_FOLDER_CONFLICT");
  return { id: folder.id, webUrl: folder.webUrl, path: `${decodeURIComponent(root.parentReference.path).split("root:")[1]}/${root.name}/${name}` };
}

async function sendAdmin(body, deps) {
  const bundle = await require("./publisherFundedStage04").load(body.titleId, deps);
  const prefix = `publisher-funded/stage05/${body.titleId}/${bundle.offer.offerSha256}/replacement-v2`;
  const prepared = await readPrepared(prefix, deps);
  if (!prepared || body.agreementSha256 !== prepared.agreementSha256 || !/^[a-f0-9]{64}$/.test(body.pageReviewSha256 || "")) deny("STAGE05_EXACT_PAGE_REVIEW_REQUIRED");
  const review = { titleId: body.titleId, agreementSha256: body.agreementSha256, pageReviewSha256: body.pageReviewSha256 };
  await b.immutable(deps.containerClient, `${prefix}/page-review.json`, review);
  const step = require("./titleCommissioningIntakeWorker").processTitleCommissioningStep;
  const execution = await step({ titleId: body.titleId, bindingHash: prepared.agreementSha256 }, {
    ...deps, readScope: async titleId => ({ titleId, enabled: Boolean(internal.TITLES[titleId]), revoked: false, mode: "JACKIE_TITLE_INTERNAL_COMMISSIONING" }),
  }, {
    namespace: "publisher-funded/stage05/admin-send-executions", executionSuffix: "",
    plan: input => ({ ...input, executionId: `stage05-admin:${input.bindingHash}` }),
    execute: async () => {
      const existing = (await b.optional(deps.containerClient, `${prefix}/admin-send.json`))?.value;
      if (existing) return existing;
      const folder = await agreementFolder(body.titleId, deps);
      const bytes = await deps.containerClient.getBlockBlobClient(prepared.documentReference).downloadToBuffer();
      if (b.sha(bytes) !== prepared.agreementSha256) deny("STAGE05_DOCUMENT_CUSTODY_MISMATCH");
      const Zip = require("jszip"), zip = new Zip();
      zip.file(`${prepared.offerId}-Agreement-v2.docx`, bytes, { date: new Date("2000-01-01T00:00:00Z") });
      const custodyBytes = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
      const custody = await require("./newSubmissionStage02").persistFile(folder, `${prepared.offerId}-Agreement-v2-custody.zip`, custodyBytes, "application/zip", deps);
      const subject = `Acrobat Sign administration: ${prepared.title} [${prepared.offerId} v2]`;
      const message = { messageType: "APPROVED_AUTHOR_RESPONSE", diagnosticId: body.titleId,
        intakeReferenceCode: bundle.intakeReference, authorEmail: "publishing@jmerrill.one", authorName: "Publishing administration",
        projectTitle: prepared.title, subject,
        body: `Publishing signing administration\n\nPlease review the attached complete replacement agreement for ${prepared.title}. It is agreement version 2.0.0, bound to accepted offer ${prepared.offerId} version ${prepared.offerVersion}, effective ${prepared.effectiveDateAuthority.value}.\n\nSend this exact attachment through Acrobat Sign. Assign every required Author and Publisher signature field, including the funded terms page and the base agreement signature page. Do not edit this issued version; substantive revisions require a new version before signing.\n\nThis replacement expressly supersedes the earlier agreement upon execution. The earlier defective document must not satisfy Stage 05. Rights, royalties, approved scope and the settled publisher-funded cost treatment are preserved; author fees are $0 and no new spending is approved.\n\nPlace the complete executed agreement and Acrobat Sign completion audit report in this title's agreement folder:\n${folder.webUrl}\n\nDo not send only a signature page. No printing, scanning, Publishing portal login or paid signature API is required. The system must verify execution before Stage 05 completes; an email ACCEPT is not execution.\n\nAgreement SHA-256: ${prepared.agreementSha256}\nOffer SHA-256: ${prepared.offerSha256}\n\nJ Merrill Publishing`,
        templateName: "PUBLISHING_MANUAL_ACROBAT_ADMINISTRATION_V2", templateVersion: "2.0.0",
        approvedBy: documents.AUTHORITY, approvedOn: prepared.effectiveDateAuthority.value,
        communicationType: "AGREEMENT_READY_FOR_MANUAL_SIGNATURE_SEND",
        futureSendRequiresInternalCopy: true, futureSendRequiresDataverseLog: true,
        internalVisibilityMailbox: "publishing@jmerrill.one", cc: [], bcc: [], replyTo: "publishing@jmerrill.one",
        attachments: [{ name: `${prepared.offerId}-Agreement-v2.docx`, contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          contentInBase64: bytes.toString("base64"), sha256: prepared.agreementSha256, role: "EXACT_VERSION_AGREEMENT_FOR_MANUAL_ADMINISTRATION",
          version: "2.0.0", artifactId: `${prepared.offerSha256}:stage05-agreement-v2` }] };
      await b.immutable(deps.containerClient, `${prefix}/admin-intent.json`, { ...review, messageSha256: b.sha(JSON.stringify(message)), recipient: "publishing@jmerrill.one" });
      const sent = await (deps.sendAdmin || require("./publisherFundedStage04Mail").send)(message, deps);
      if (!sent.providerMessageId || !sent.communicationRecordId || !Number.isFinite(Date.parse(sent.sentAt))) deny("STAGE05_SEND_RECEIPT_INCOMPLETE");
      return (await b.immutable(deps.containerClient, `${prefix}/admin-send.json`, { titleId: body.titleId,
        agreementSha256: prepared.agreementSha256, agreementVersion: "2.0.0", sent, subject, custody, folder,
        recipient: "publishing@jmerrill.one", delivered: false, stage05Complete: false, stage06: "NOT_STARTED" })).value;
    },
    validate: result => Boolean(result.sent?.providerMessageId), reference: () => `${prefix}/admin-send.json`,
    completionEffects: () => ({ stage05Complete: false, authorCommunication: false, stage06: "NOT_STARTED" }),
  });
  return { execution, send: (await b.optional(deps.containerClient, `${prefix}/admin-send.json`))?.value || null };
}

async function delivery(titleId, deps) {
  const bundle = await require("./publisherFundedStage04").load(titleId, deps);
  const prefix = `publisher-funded/stage05/${titleId}/${bundle.offer.offerSha256}/replacement-v2`;
  const sent = (await b.read(deps.containerClient, `${prefix}/admin-send.json`)).value;
  const existing = await b.optional(deps.containerClient, `${prefix}/admin-delivery.json`);
  if (existing) return existing.value;
  const mail = require("./publisherFundedStage04Mail");
  const messages = await mail.pages(mail.MAILBOX, { $filter: `receivedDateTime ge ${sent.sent.sentAt} and from/emailAddress/address eq '${mail.FROM}'`,
    $select: "id,internetMessageId,receivedDateTime,subject,from,toRecipients,ccRecipients,hasAttachments", $top: "100" }, deps);
  const providerId = require("../generated/communications/publishing-communication-acceptance").providerIdFromInternetMessageId;
  const matches = messages.filter(m => providerId(m.internetMessageId || "") === sent.sent.providerMessageId.replaceAll("-", "").toLowerCase());
  if (!matches.length) return { delivered: false, status: "WAITING_RECIPIENT_READBACK" };
  const m = matches[0];
  if (matches.length !== 1 || !m.id || m.subject !== sent.subject || m.from?.emailAddress?.address?.toLowerCase() !== mail.FROM ||
      m.toRecipients?.length !== 1 || m.toRecipients[0].emailAddress?.address?.toLowerCase() !== mail.MAILBOX ||
      !m.hasAttachments || !Number.isFinite(Date.parse(m.receivedDateTime))) deny("STAGE05_ADMIN_DELIVERY_CONFLICT");
  const graph = deps.mailGraph || (path => mail.nativeGraph(path, deps));
  const attachments = await graph(`users/${encodeURIComponent(mail.MAILBOX)}/messages/${encodeURIComponent(m.id)}/attachments`);
  if (!Array.isArray(attachments.value) || attachments["@odata.nextLink"] || attachments.value.length !== 1) deny("STAGE05_ADMIN_ATTACHMENT_CONFLICT");
  const attachment = attachments.value[0];
  if (attachment["@odata.type"] !== "#microsoft.graph.fileAttachment" || !attachment.id ||
      typeof attachment.contentBytes !== "string" ||
      b.sha(Buffer.from(attachment.contentBytes, "base64")) !== sent.agreementSha256) deny("STAGE05_ADMIN_ATTACHMENT_CONFLICT");
  return (await b.immutable(deps.containerClient, `${prefix}/admin-delivery.json`, { titleId, agreementSha256: sent.agreementSha256,
    recipient: mail.MAILBOX, delivered: true, graphMessageId: m.id, internetMessageId: m.internetMessageId,
    providerMessageId: sent.sent.providerMessageId, deliveredAt: m.receivedDateTime,
    attachmentId: attachment.id, attachmentSha256: sent.agreementSha256,
    proof: "EXACT_PROVIDER_MESSAGE_AND_ATTACHMENT_BYTES_IN_PUBLISHING_MAILBOX", stage05Complete: false })).value;
}

async function handler(body, supplied = {}) {
  if (!internal.TITLES[body?.titleId] || !MODES.includes(body.mode) ||
      Object.keys(body).some(k => !(body.mode === "SUBMISSION_05_SEND_ADMIN" ? ["titleId", "mode", "agreementSha256", "pageReviewSha256"] : ["titleId", "mode"]).includes(k))) return { status: 400, jsonBody: { code: "STAGE05_SCOPE_DENIED", effects: 0 } };
  try {
    const deps = await require("./newSubmissionStage01").native(supplied);
    if ((await deps.containerClient.getProperties()).blobPublicAccess) deny("STAGE05_PRIVATE_STORAGE_REQUIRED");
    if (body.mode === "SUBMISSION_05_SEND_ADMIN") return { status: 200, jsonBody: await sendAdmin(body, deps) };
    if (body.mode === "SUBMISSION_05_ADMIN_DELIVERY") return { status: 200, jsonBody: await delivery(body.titleId, deps) };
    if (body.mode === "SUBMISSION_05_REPLACEMENT_READBACK") {
      const bundle = await require("./publisherFundedStage04").load(body.titleId, deps);
      return { status: 200, jsonBody: { replacement: await readPrepared(`publisher-funded/stage05/${body.titleId}/${bundle.offer.offerSha256}/replacement-v2`, deps), effects: 0 } };
    }
    return { status: 200, jsonBody: { replacement: await prepare(body.titleId, deps), communications: 0,
      payments: 0, stage05Complete: false, stage06: "NOT_STARTED" } };
  } catch (error) {
    return { status: 409, jsonBody: { code: /^(?:STAGE05|AGREEMENT|STAGE04)_[A-Z0-9_]+$/.test(error.safeCode || "") ? error.safeCode : "STAGE05_PREPARATION_DEPENDENCY_FAILED",
      communications: body.mode === "SUBMISSION_05_SEND_ADMIN" ? "READBACK_REQUIRED" : 0,
      payments: 0, stage05Complete: false, stage06: "NOT_STARTED" } };
  }
}
module.exports = { MODES, handler, prepare, readPrepared, sendAdmin, delivery, agreementFolder };
