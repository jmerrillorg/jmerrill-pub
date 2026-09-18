"use strict";

const { createHash } = require("node:crypto");

function clean(value) {
  return String(value || "").trim().toLowerCase();
}

function canonicalArtifacts(attachments = []) {
  return attachments
    .map((attachment) => ({
      role: clean(attachment.role || "attachment"),
      sha256: clean(attachment.sha256)
    }))
    .sort((left, right) => `${left.role}:${left.sha256}`.localeCompare(`${right.role}:${right.sha256}`));
}

function buildCommunicationIdentity(input = {}) {
  const manifest = input.artifactManifest || {};
  const identity = {
    titleId: clean(manifest.titleId || input.businessObjectId || input.diagnosticId),
    authorId: clean(manifest.authorContactId || input.authorId || input.authorEmail),
    communicationType: clean(input.communicationType || input.templateName || input.messageType),
    workstream: clean(manifest.stageId || input.workstream || input.diagnosticId),
    recipient: clean(input.authorEmail || input.recipient),
    artifacts: canonicalArtifacts(input.attachments)
  };
  const digest = createHash("sha256").update(JSON.stringify(identity), "utf8").digest("hex");
  return { identity, key: `communication:v1:${digest}` };
}

module.exports = { buildCommunicationIdentity, canonicalArtifacts };
