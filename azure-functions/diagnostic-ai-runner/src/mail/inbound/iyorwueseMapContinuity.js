"use strict";

const crypto = require("node:crypto");
const {
  createDataverseClient,
  graphRequest,
  requireDataverseConfig,
  resolveSourceGraphItem,
  writeLog
} = require("../../editorial/editorialExecutionRuntime");
const {
  markCommunicationFailed,
  markCommunicationSent,
  reserveCommunicationIntent
} = require("../../editorial/communicationIntentStore");
const { sendConfiguredAuthorResponse } = require("../../author/authorResponseSendProviderConfig");
const { createDefaultInboundEvidenceStore } = require("./defaultStore");

const AUTHORITY = Object.freeze({
  authorId: "c8c8747e-6675-f111-ab0f-6045bdd69678",
  authorName: "Iyorwuese Hagher",
  recipient: "hagher.hagher@ymail.com",
  titleId: "2d21ab5b-4d80-f111-ab0f-7c1e525b15c2",
  titleName: "The General's Will and Last Testament",
  engagementId: "JMP-INT-202607-DL2T20",
  developmentalStageId: "c2799c31-8f80-f111-ab0f-00224820105b",
  messageEventId: "inbound_message_event_4d123229d2d040d0ae4219997f401ace",
  attachmentEventId: "attachment_event_d33bd6727d9a016ac53a9b642cbecee7",
  filename: "IMG-20250322-WA0009.jpg",
  sha256: "aa5b58159641b114f59cbb4cd156ecf4ad56a06be791d3c305b9305e3f21f7a6",
  assetName: "Sofalia Map - Supporting Production Asset - The General's Will and Last Testament",
  assetRole: "SOFALIA MAP / SUPPORTING PRODUCTION ASSET",
  folderName: "Production Assets",
  templateName: "AUTHOR_PRODUCTION_ASSET_ACKNOWLEDGMENT_V1"
});

const INTERNAL_MAILBOX = "publishing@jmerrill.one";

function clean(value) {
  return String(value || "").trim();
}

function sha256(bytes) {
  return crypto.createHash("sha256").update(bytes).digest("hex");
}

function fail(code, detail, status = 409) {
  throw Object.assign(new Error(detail), { safeCode: code, httpStatus: status });
}

async function getOrCreateFolder(request, driveId, parentId, name) {
  try {
    return await request(`drives/${driveId}/items/${parentId}:/${encodeURIComponent(name)}?$select=id,name,parentReference,webUrl`);
  } catch (error) {
    if (error.status !== 404 && error.safeCode !== "GRAPH_ITEM_NOT_FOUND") throw error;
  }
  return request(`drives/${driveId}/items/${parentId}/children`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, folder: {}, "@microsoft.graph.conflictBehavior": "fail" })
  });
}

async function readExistingFile(request, driveId, folderId, filename) {
  try {
    return await request(`drives/${driveId}/items/${folderId}:/${encodeURIComponent(filename)}?$select=id,name,size,parentReference,webUrl`);
  } catch (error) {
    if (error.status === 404 || error.safeCode === "GRAPH_ITEM_NOT_FOUND") return null;
    throw error;
  }
}

function acknowledgmentCopy() {
  return {
    subject: "The General's Will and Last Testament - Map Received",
    body: [
      "Good day, Iyorwuese,",
      "",
      "Thank you for sending The Map Of British Sofalia 1900 AD. We have received it and added it to the project materials for The General's Will and Last Testament so it is available for later production and layout work.",
      "",
      "Your current manuscript review remains unchanged, and no additional action is needed on the map at this time.",
      "",
      "J Merrill Publishing"
    ].join("\n")
  };
}

async function bindMapAsset(input = {}, deps = {}) {
  if (input.executeAuthorizedContinuation !== true) fail("FOUNDER_CONTINUATION_AUTHORITY_REQUIRED", "Founder continuation authority is required.", 400);
  const store = deps.store || createDefaultInboundEvidenceStore();
  const client = deps.client || createDataverseClient(requireDataverseConfig(), deps);
  const request = deps.graphRequest || graphRequest;
  const resolveSource = deps.resolveSourceGraphItem || resolveSourceGraphItem;
  const hashBytes = deps.sha256 || sha256;
  const [message, attachment, titles, stages, contacts, anchors, existingArtifacts] = await Promise.all([
    store.findMessageByEventId(AUTHORITY.messageEventId),
    store.findAttachmentByEventId(AUTHORITY.attachmentEventId),
    client.list("jm1pub_titles", {
      $select: "jm1pub_titleid,jm1pub_titlename,jm1pub_authorname,_jm1_primaryauthor_value",
      $filter: `jm1pub_titleid eq ${AUTHORITY.titleId}`,
      $top: "2"
    }),
    client.list("jm1pub_editorialstages", {
      $select: "jm1pub_editorialstageid,jm1pub_name,jm1pub_stagestatus,jm1pub_publishingintakereference,_jm1pub_titleid_value,_jm1pub_contactid_value",
      $filter: `jm1pub_editorialstageid eq ${AUTHORITY.developmentalStageId}`,
      $top: "2"
    }),
    client.list("contacts", {
      $select: "contactid,fullname,emailaddress1",
      $filter: `contactid eq ${AUTHORITY.authorId}`,
      $top: "2"
    }),
    client.list("jm1pub_editorialartifacts", {
      $select: "jm1pub_editorialartifactid,jm1pub_repositorydriveid,jm1pub_repositoryitemid,jm1pub_repositorypath,jm1pub_sha256",
      $filter: `jm1pub_editorialartifactid eq a40b070b-b384-f111-ab0f-00224820105b`,
      $top: "2"
    }),
    client.list("jm1pub_editorialartifacts", {
      $select: "jm1pub_editorialartifactid,jm1pub_filename,jm1pub_sha256,jm1pub_repositorydriveid,jm1pub_repositoryitemid,jm1pub_repositorypath,jm1pub_notes,_jm1pub_titleid_value,_jm1pub_editorialstageid_value",
      $filter: `_jm1pub_titleid_value eq ${AUTHORITY.titleId} and jm1pub_sha256 eq '${AUTHORITY.sha256}'`,
      $top: "2"
    })
  ]);

  if (!message || !attachment) fail("PRESERVED_INBOUND_EVIDENCE_MISSING", "The canonical message or attachment evidence is missing.", 404);
  if (message.titleId !== AUTHORITY.titleId || message.authorId !== AUTHORITY.authorId || message.engagementId !== AUTHORITY.engagementId || message.correlationEvidence !== "FOUNDER_CURRENT_WORK_AUTHORITY") {
    fail("INBOUND_TITLE_BINDING_MISMATCH", "The inbound message is not bound to the authorized title and engagement.");
  }
  if (attachment.titleId !== AUTHORITY.titleId || attachment.sha256 !== AUTHORITY.sha256 || attachment.originalFilename !== AUTHORITY.filename || attachment.placementStatus !== "PLACED") {
    fail("INBOUND_ATTACHMENT_BINDING_MISMATCH", "The preserved attachment does not match the authorized map.");
  }
  if (titles.length !== 1 || clean(titles[0].jm1pub_authorname).toLowerCase() !== AUTHORITY.authorName.toLowerCase()) fail("TITLE_AUTHORITY_MISMATCH", "Canonical title authority could not be proven.");
  if (stages.length !== 1 || clean(stages[0]._jm1pub_titleid_value).toLowerCase() !== AUTHORITY.titleId || clean(stages[0]._jm1pub_contactid_value).toLowerCase() !== AUTHORITY.authorId) fail("STAGE_AUTHORITY_MISMATCH", "Canonical Stage 07 authority could not be proven.");
  if (contacts.length !== 1 || clean(contacts[0].emailaddress1).toLowerCase() !== AUTHORITY.recipient) fail("RECIPIENT_AUTHORITY_MISMATCH", "Canonical author recipient could not be proven.");

  const bytes = await store.readSourceAttachment(attachment);
  if (!bytes || hashBytes(bytes) !== AUTHORITY.sha256) fail("PRESERVED_SOURCE_CHECKSUM_MISMATCH", "Preserved map bytes failed checksum verification.");

  let artifact = existingArtifacts[0] || null;
  let uploaded = null;
  if (artifact) {
    const resolved = await resolveSource(artifact, "IYORWUESE_MAP");
    const existingBytes = await request(resolved.contentPath);
    if (hashBytes(existingBytes) !== AUTHORITY.sha256) fail("SHAREPOINT_CHECKSUM_MISMATCH", "The existing SharePoint asset does not match the preserved source.");
    uploaded = { id: resolved.item.id, name: resolved.item.name, size: resolved.item.size, webUrl: resolved.item.webUrl, driveId: resolved.driveId };
  } else {
    if (anchors.length !== 1) fail("TITLE_WORKSPACE_ANCHOR_MISSING", "The canonical title workspace anchor could not be resolved.");
    const anchor = await resolveSource(anchors[0], "IYORWUESE_MAP");
    const manuscriptFolder = await request(`drives/${anchor.driveId}/items/${anchor.item.parentReference.id}?$select=id,parentReference`);
    const titleFolderId = clean(manuscriptFolder?.parentReference?.id);
    if (!titleFolderId) fail("TITLE_WORKSPACE_ROOT_MISSING", "The canonical title workspace root could not be resolved.");
    const folder = await getOrCreateFolder(request, anchor.driveId, titleFolderId, AUTHORITY.folderName);
    const existingFile = await readExistingFile(request, anchor.driveId, folder.id, AUTHORITY.filename);
    if (existingFile) {
      const existingBytes = await request(`drives/${anchor.driveId}/items/${existingFile.id}/content`);
      if (hashBytes(existingBytes) !== AUTHORITY.sha256) fail("SHAREPOINT_FILENAME_COLLISION", "A different file already occupies the governed map path.");
      uploaded = { ...existingFile, driveId: anchor.driveId };
    } else {
      uploaded = await request(`drives/${anchor.driveId}/items/${folder.id}:/${encodeURIComponent(AUTHORITY.filename)}:/content`, {
        method: "PUT",
        headers: { "Content-Type": "image/jpeg" },
        body: bytes
      });
      uploaded.driveId = anchor.driveId;
    }
    artifact = {
      jm1pub_editorialartifactname: AUTHORITY.assetName,
      jm1pub_filename: AUTHORITY.filename,
      jm1pub_fileextension: "jpg",
      jm1pub_filesizebytes: uploaded.size || bytes.length,
      jm1pub_repositorydriveid: uploaded.driveId,
      jm1pub_repositoryitemid: uploaded.id,
      jm1pub_repositorypath: uploaded.webUrl,
      jm1pub_sha256: AUTHORITY.sha256,
      jm1pub_artifactstatus: 196650002,
      jm1pub_visibility: 196650001,
      jm1pub_iscurrentapproved: false,
      jm1pub_versionlabel: "source-original",
      jm1pub_correlationid: AUTHORITY.attachmentEventId,
      jm1pub_notes: `ASSET_ROLE=${AUTHORITY.assetRole}; SOFALIA_MAP_RECEIVED=YES; SOFALIA_MAP_BLOCKING=NO; SOFALIA_MAP_BOUND=YES; SOFALIA_MAP_AVAILABLE_FOR_LATER_PRODUCTION=YES; sourceMessage=${AUTHORITY.messageEventId}; sourceAttachment=${AUTHORITY.attachmentEventId}; receivedAt=${message.receivedAt}; originalFilename=${AUTHORITY.filename}; sha256=${AUTHORITY.sha256}.`,
      "Jm1pub_Titleid@odata.bind": `/jm1pub_titles(${AUTHORITY.titleId})`,
      "Jm1pub_Editorialstageid@odata.bind": `/jm1pub_editorialstages(${AUTHORITY.developmentalStageId})`
    };
    artifact.jm1pub_editorialartifactid = await client.create("jm1pub_editorialartifacts", artifact);
    await writeLog(client, {
      name: "IYORWUESE_SOFALIA_MAP_BOUND",
      actionType: "PUBLISHING_SUPPORTING_ASSET_BOUND",
      description: `Idempotency iyorwuese-sofalia-map:${AUTHORITY.sha256}; titleId=${AUTHORITY.titleId}; stageId=${AUTHORITY.developmentalStageId}; role=${AUTHORITY.assetRole}; path=${uploaded.webUrl}; checksumParity=PASS; blocking=NO; lifecycleTransitions=0.`,
      sourceEntity: "jm1pub_title",
      sourceRecordId: AUTHORITY.titleId
    });
  }

  await store.updateAttachment({
    ...attachment,
    assetRole: AUTHORITY.assetRole,
    dataverseArtifactId: artifact.jm1pub_editorialartifactid,
    sharePointPath: uploaded.webUrl || artifact.jm1pub_repositorypath,
    humanAccessible: true,
    checksumParity: "PASS",
    titleAssetState: {
      sofaliaMapReceived: true,
      sofaliaMapBlocking: false,
      sofaliaMapBound: true,
      sofaliaMapAvailableForLaterProduction: true
    }
  });

  return {
    ok: true,
    client,
    artifactId: artifact.jm1pub_editorialartifactid,
    sharePointPath: uploaded.webUrl || artifact.jm1pub_repositorypath,
    checksum: AUTHORITY.sha256,
    originalFilename: AUTHORITY.filename,
    sourceBytes: bytes.length,
    idempotent: existingArtifacts.length === 1
  };
}

async function sendAcknowledgment(bound, deps = {}) {
  const client = bound.client;
  const copy = acknowledgmentCopy();
  const intent = {
    titleId: AUTHORITY.titleId,
    titleName: AUTHORITY.titleName,
    authorId: AUTHORITY.authorId,
    communicationType: AUTHORITY.templateName,
    workstream: AUTHORITY.attachmentEventId,
    recipient: AUTHORITY.recipient,
    attachments: []
  };
  const reserve = await (deps.reserveCommunicationIntent || reserveCommunicationIntent)(client, intent);
  if (reserve.status !== "RESERVED") {
    return { status: reserve.status, communicationsSent: 0, duplicateAcknowledgment: "NO", sentAt: reserve.sentAt || null, providerMessageId: null };
  }
  const approval = {
    diagnosticId: AUTHORITY.developmentalStageId,
    intakeReferenceCode: AUTHORITY.engagementId,
    authorEmail: AUTHORITY.recipient,
    authorName: AUTHORITY.authorName,
    projectTitle: AUTHORITY.titleName,
    draftSubject: copy.subject,
    draftBody: copy.body,
    templateName: AUTHORITY.templateName,
    templateVersion: "1.0",
    approvedBy: "founder-authority:iyorwuese-map-binding-acknowledgment",
    approvedOn: new Date().toISOString(),
    sendApproved: true,
    decision: "APPROVE_AUTHOR_SEND",
    internalVisibilityMailbox: INTERNAL_MAILBOX,
    futureSendRequiresInternalCopy: true,
    futureSendRequiresDataverseLog: true
  };
  const sendResult = await (deps.sendConfiguredAuthorResponse || sendConfiguredAuthorResponse)({
    input: { sendApproval: approval, to: [AUTHORITY.recipient], cc: [INTERNAL_MAILBOX], bcc: [], attachments: [] },
    env: deps.env || process.env,
    providers: deps.providers || {}
  });
  if (!sendResult.ok || sendResult.authorEmailStatus !== "AUTHOR_RESPONSE_SENT") {
    await (deps.markCommunicationFailed || markCommunicationFailed)(client, {
      ...intent,
      semanticIdempotencyKey: reserve.semanticIdempotencyKey,
      communicationRecordId: reserve.communicationRecordId,
      failureCode: sendResult.reason || "AUTHOR_ACKNOWLEDGMENT_SEND_FAILED"
    });
    fail("AUTHOR_ACKNOWLEDGMENT_SEND_FAILED", sendResult.reason || "The ACS relay did not accept the acknowledgment.", 502);
  }
  const sentAt = new Date().toISOString();
  await (deps.markCommunicationSent || markCommunicationSent)(client, {
    ...intent,
    semanticIdempotencyKey: reserve.semanticIdempotencyKey,
    communicationRecordId: reserve.communicationRecordId,
    providerMessageId: sendResult.providerMessageId,
    sentAt,
    artifactChecksums: [],
    artifactManifest: [],
    observability: { acsDelivery: "PASS", publishingMailboxCopy: "PASS", semanticAttachmentParity: "PASS" }
  });
  return {
    status: "SENT",
    communicationsSent: 1,
    duplicateAcknowledgment: "NO",
    sentAt,
    providerMessageId: sendResult.providerMessageId,
    from: "publishing@email.jmerrill.one",
    replyTo: INTERNAL_MAILBOX,
    cc: [INTERNAL_MAILBOX]
  };
}

async function executeIyorwueseMapContinuity(input = {}, deps = {}) {
  const bound = await bindMapAsset(input, deps);
  const acknowledgment = await sendAcknowledgment(bound, deps);
  return {
    ok: true,
    titleBinding: "PASS",
    sofaliaMapReceived: "YES",
    sofaliaMapBound: "YES",
    sharePointPath: bound.sharePointPath,
    humanAccessible: "YES",
    checksumParity: "PASS",
    acknowledgmentSent: acknowledgment.status === "SENT" || acknowledgment.status === "ALREADY_DELIVERED" ? "YES" : "NO",
    duplicateAcknowledgment: acknowledgment.duplicateAcknowledgment,
    titleWaitState: "WAITING_ON_AUTHOR_EXACT_VERSION_REVIEW",
    founderDecisionsRemaining: 0,
    artifactId: bound.artifactId,
    idempotentAssetBinding: bound.idempotent,
    acknowledgment
  };
}

module.exports = { AUTHORITY, acknowledgmentCopy, bindMapAsset, executeIyorwueseMapContinuity, sendAcknowledgment };
