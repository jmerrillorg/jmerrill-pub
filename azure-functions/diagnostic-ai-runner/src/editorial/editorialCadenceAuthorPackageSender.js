"use strict";

const { createHash } = require("node:crypto");
const { DefaultAzureCredential } = require("@azure/identity");
const JSZip = require("jszip");
const { resolveArtifactAuthority } = require("../policy/canonPolicyLayer");

const APPROVED_MESSAGE_TYPE = "APPROVED_AUTHOR_RESPONSE";
const AUTHOR_REVIEW_PACKAGE_TEMPLATE = "AUTHOR_REVIEW_PACKAGE_NOTIFICATION_V1";
const CANONICAL_RENDERER = "JM1 Enterprise Communication Renderer";
const CANONICAL_RENDER_MODE = "CANONICAL_HTML";
const TRANSACTIONAL_FROM = "publishing@email.jmerrill.one";
const PUBLISHING_MAILBOX = "publishing@jmerrill.one";
const RELAY_FALLBACK_URL = "https://func-jm1-acs-email-relay.azurewebsites.net";
const GRAPH_SCOPE = "https://graph.microsoft.com/.default";
const SYSTEM_OPERATOR = "github-oidc:jmerrill-pub-production";
const INTAKE_REFERENCE_PATTERN = /^JMP-INT-\d{6}-[A-Z0-9-]+$/i;
const AUTHOR_FACING_VISIBILITY = 196650000;

function normalizeString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeLower(value) {
  return normalizeString(value).toLowerCase();
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function escapeHtml(value) {
  return normalizeString(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function sanitizeFilename(value) {
  return normalizeString(value).replace(/[\r\n"\\/]/g, "-").slice(0, 180) || "editorial-artifact";
}

function contentTypeFor(fileName) {
  const lower = normalizeLower(fileName);
  if (lower.endsWith(".docx")) return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  if (lower.endsWith(".pdf")) return "application/pdf";
  if (lower.endsWith(".json")) return "application/json";
  if (lower.endsWith(".md")) return "text/markdown; charset=utf-8";
  if (lower.endsWith(".txt")) return "text/plain; charset=utf-8";
  if (lower.endsWith(".doc")) return "application/msword";
  return "application/octet-stream";
}

function stageCodeForNotification(stageCode) {
  if (stageCode === "DEVELOPMENTAL_EDITING") return "DEVELOPMENTAL_EDITING_REVIEW";
  if (stageCode === "LINE_EDITING") return "LINE_EDITING_REVIEW";
  if (stageCode === "COPYEDITING") return "COPYEDITING_REVIEW";
  if (stageCode === "PROOFREADING") return "PROOFREADING_REVIEW";
  if (stageCode === "INTERIOR_LAYOUT") return "INTERIOR_LAYOUT_REVIEW";
  if (stageCode === "COVER_DESIGN") return "COVER_DESIGN_REVIEW";
  if (stageCode === "PRODUCTION_PROOF") return "PRODUCTION_PROOF_REVIEW";
  return "EDITORIAL_REVIEW";
}

function stageLabel(stageCode) {
  const reviewCode = stageCodeForNotification(stageCode);
  if (reviewCode === "DEVELOPMENTAL_EDITING_REVIEW") return "Developmental Editing";
  if (reviewCode === "LINE_EDITING_REVIEW") return "Line Editing";
  if (reviewCode === "COPYEDITING_REVIEW") return "Copyediting";
  if (reviewCode === "PROOFREADING_REVIEW") return "Proofreading";
  if (reviewCode === "INTERIOR_LAYOUT_REVIEW") return "Interior Layout";
  if (reviewCode === "COVER_DESIGN_REVIEW") return "Cover Design";
  if (reviewCode === "PRODUCTION_PROOF_REVIEW") return "Production Proof";
  return "Editorial Review";
}

function requiredRolesFor(stageCode) {
  const reviewCode = stageCodeForNotification(stageCode);
  if (reviewCode === "DEVELOPMENTAL_EDITING_REVIEW") return ["editedManuscript", "reviewInstructions"];
  if (reviewCode === "LINE_EDITING_REVIEW") return ["lineEditedManuscript", "reviewCoverNote"];
  if (reviewCode === "COPYEDITING_REVIEW") return ["copyeditedManuscript", "reviewCoverNote"];
  if (reviewCode === "PROOFREADING_REVIEW") return ["proofreadManuscript", "reviewInstructions"];
  if (reviewCode === "INTERIOR_LAYOUT_REVIEW") return ["interiorProof", "reviewInstructions"];
  if (reviewCode === "COVER_DESIGN_REVIEW") return ["coverProof", "reviewInstructions"];
  if (reviewCode === "PRODUCTION_PROOF_REVIEW") return ["productionProof", "reviewInstructions"];
  return ["editorialMemo", "reviewInstructions"];
}

function rolePatterns(role) {
  return {
    editedManuscript: [/developmentally.*edited|edited.*manuscript|developmental.*manuscript/i],
    editorialMemo: [/author-facing.*editorial.*review|editorial.*review.*assessment|editorial.*review.*package|memo|summary|assessment/i],
    reviewInstructions: [/instruction|guide|review/i],
    lineEditedManuscript: [/line.*edited.*manuscript|line.*manuscript|edited.*manuscript/i],
    copyeditedManuscript: [/copyedit.*manuscript|copyedited/i],
    proofreadManuscript: [/proofread.*manuscript|proofread/i],
    reviewCoverNote: [/review.*notes?|author.*review.*notes?|cover.*note/i],
    interiorProof: [/interior.*proof|layout.*proof|production.*pdf|\.pdf$/i],
    coverProof: [/cover.*proof/i],
    productionProof: [/production.*proof/i]
  }[role] || [/.^/];
}

function isAuthorVisibleArtifact(artifact) {
  if (artifact?.jm1pub_supersededon) return false;
  const status = `${artifact?.["jm1pub_artifactstatus@OData.Community.Display.V1.FormattedValue"] || ""} ${artifact?.jm1pub_artifactstatus || ""}`;
  const visibility = `${artifact?.["jm1pub_visibility@OData.Community.Display.V1.FormattedValue"] || ""} ${artifact?.jm1pub_visibility || ""}`;
  const authorFacing =
    Number(artifact?.jm1pub_visibility || 0) === AUTHOR_FACING_VISIBILITY ||
    /\bauthor facing\b/i.test(visibility);
  if (!authorFacing) return false;
  return artifact?.jm1pub_iscurrentapproved === true || /approved|current|author|release|delivered/i.test(`${status} ${visibility}`);
}

function artifactHaystack(artifact) {
  return [
    artifact?.jm1pub_editorialartifactname,
    artifact?.jm1pub_filename,
    artifact?.["jm1pub_artifacttype@OData.Community.Display.V1.FormattedValue"],
    artifact?.jm1pub_artifacttype,
    artifact?.jm1pub_repositorypath
  ].map(normalizeString).join(" ");
}

function selectArtifactForRole(artifacts, role) {
  const patterns = rolePatterns(role);
  return artifacts
    .filter(isAuthorVisibleArtifact)
    .filter((artifact) => {
      const haystack = artifactHaystack(artifact);
      if (role === "reviewInstructions" && /\b(manifest|ledger|response[-_ ]?mechanism|cover[-_ ]?message)\b/i.test(haystack)) return false;
      if (role === "interiorProof" && Number(artifact?.jm1pub_filesizebytes || 0) > 0 && Number(artifact?.jm1pub_filesizebytes || 0) < 100000) return false;
      return patterns.some((pattern) => pattern.test(haystack));
    })
    .sort((a, b) => artifactRoleScore(b, role) - artifactRoleScore(a, role))[0] || null;
}

function artifactRoleScore(artifact, role) {
  const haystack = artifactHaystack(artifact);
  let score = artifact?.jm1pub_iscurrentapproved === true ? 10 : 0;
  if (role === "editedManuscript" && /developmentally.*edited|edited.*manuscript/i.test(haystack)) score += 100;
  if (role === "lineEditedManuscript" && /line.*editing|line.*edited/i.test(haystack)) score += 100;
  if (role === "reviewInstructions" && /instruction|guide/i.test(haystack)) score += 100;
  if (role === "reviewCoverNote" && /review.*notes?|author.*review.*notes?|cover.*note/i.test(haystack)) score += 100;
  if (/manifest|qa evidence|change.*ledger|completion.*report|source checksum|correlation/i.test(haystack)) score -= 100;
  return score;
}

function authorFacingFilename(titleName, role, sourceFilename) {
  const extension = normalizeString(sourceFilename).match(/\.[a-z0-9]+$/i)?.[0]?.toLowerCase() || ".pdf";
  const title = sanitizeFilename(titleName).replace(/\.[a-z0-9]+$/i, "").replace(/\s+/g, " ").trim() || "Author Review";
  const labels = {
    editedManuscript: "Edited Manuscript",
    editorialMemo: "Editor's Notes",
    reviewInstructions: "Editorial Review Guide",
    lineEditedManuscript: "Line Edited Manuscript",
    copyeditedManuscript: "Copyedited Manuscript",
    proofreadManuscript: "Proofread Manuscript",
    reviewCoverNote: "Review Notes",
    interiorProof: "Interior Layout Proof",
    coverProof: "Cover Proof",
    productionProof: "Production Proof"
  };
  return `${title} - ${labels[role] || "Review Attachment"}${extension}`;
}

async function getGraphToken(deps = {}) {
  if (typeof deps.getToken === "function") return deps.getToken(GRAPH_SCOPE);
  const credential = new DefaultAzureCredential();
  const token = await credential.getToken(GRAPH_SCOPE);
  if (!token?.token) throw Object.assign(new Error("Graph token unavailable"), { safeCode: "GRAPH_TOKEN_UNAVAILABLE" });
  return token.token;
}

async function downloadDriveItem(artifact, deps = {}) {
  const driveId = normalizeString(artifact?.jm1pub_repositorydriveid);
  const itemId = normalizeString(artifact?.jm1pub_repositoryitemid);
  if (!driveId || !itemId) throw Object.assign(new Error("ATTACHMENT_LOCATION_MISSING"), { safeCode: "ATTACHMENT_LOCATION_MISSING" });
  if (typeof deps.downloadArtifact === "function") return deps.downloadArtifact(artifact);
  const token = await getGraphToken(deps);
  const response = await (deps.fetchImpl || fetch)(
    `https://graph.microsoft.com/v1.0/drives/${encodeURIComponent(driveId)}/items/${encodeURIComponent(itemId)}/content`,
    {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Accept": "application/octet-stream"
      }
    }
  );
  if (!response.ok) throw Object.assign(new Error(`ATTACHMENT_DOWNLOAD_FAILED:${response.status}`), { safeCode: "ATTACHMENT_DOWNLOAD_FAILED" });
  return Buffer.from(await response.arrayBuffer());
}

function validateAttachmentBytes(role, fileName, buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.byteLength === 0) return `ATTACHMENT_EMPTY:${role}`;
  const lower = normalizeLower(fileName);
  if (/manuscript/i.test(role) && /\.(txt|md|json|html?)$/i.test(lower)) return `ATTACHMENT_MANUSCRIPT_FORMAT_INVALID:${role}`;
  if (lower.endsWith(".docx") && (buffer[0] !== 0x50 || buffer[1] !== 0x4b || !buffer.toString("latin1").includes("word/document.xml"))) {
    return `ATTACHMENT_DOCX_INVALID:${role}`;
  }
  if (lower.endsWith(".pdf") && buffer.slice(0, 5).toString("latin1") !== "%PDF-") return `ATTACHMENT_PDF_INVALID:${role}`;
  if ((lower.endsWith(".txt") || lower.endsWith(".md")) && !/\S/.test(buffer.toString("utf8"))) return `ATTACHMENT_TEXT_EMPTY:${role}`;
  return "";
}

async function extractAttachmentScanText(fileName, buffer) {
  const lower = normalizeLower(fileName);
  if (lower.endsWith(".docx")) {
    try {
      const zip = await JSZip.loadAsync(buffer);
      const documentXml = await zip.file("word/document.xml")?.async("string");
      if (documentXml) return documentXml.replace(/<[^>]+>/g, " ");
    } catch {
      return buffer.toString("utf8", 0, Math.min(buffer.byteLength, 200000));
    }
  }
  if (/\.(txt|md|json|html?)$/i.test(lower)) return buffer.toString("utf8", 0, Math.min(buffer.byteLength, 200000));
  return "";
}

function artifactSafetyCode(policyDecision) {
  const evidence = (policyDecision?.EVIDENCE || []).join(" ");
  if (/Generated by|JM1 Automation|JMI Automation/i.test(evidence)) return "GENERATED_BY_JM1_AUTOMATION";
  if (/checksum|sha256/i.test(evidence)) return "INTERNAL_CHECKSUM_METADATA";
  if (/correlation/i.test(evidence)) return "INTERNAL_CORRELATION_METADATA";
  if (/Dataverse|execution log|workflow record|artifact/i.test(evidence)) return "INTERNAL_SYSTEM_METADATA";
  if (/LINE_EDITING|DEVELOPMENTAL_EDITING|COPYEDITING|PROOFREADING/i.test(evidence)) return "INTERNAL_STAGE_VOCABULARY";
  return "INTERNAL_METADATA";
}

async function validateAuthorFacingAttachmentSafety(role, fileName, artifact, buffer) {
  const scanText = await extractAttachmentScanText(fileName, buffer);
  const policyDecision = resolveArtifactAuthority({
    artifactId: normalizeString(artifact?.jm1pub_editorialartifactid),
    text: scanText
  });
  if (policyDecision.MUTATION_ALLOWED !== true) {
    return `ATTACHMENT_RECIPIENT_SURFACE_INVALID:${role}:${artifactSafetyCode(policyDecision)}`;
  }
  return "";
}

async function materializeAttachments(input, deps = {}) {
  const roles = requiredRolesFor(input.stageCode);
  const selected = [];
  for (const role of roles) {
    const artifact = selectArtifactForRole(input.artifacts || [], role);
    if (!artifact) throw Object.assign(new Error(`REQUIRED_ATTACHMENT_MISSING:${role}`), { safeCode: `REQUIRED_ATTACHMENT_MISSING:${role}` });
    selected.push({ role, artifact });
  }
  const artifactIds = selected.map(({ artifact }) => normalizeString(artifact.jm1pub_editorialartifactid)).filter(Boolean);
  if (new Set(artifactIds).size !== artifactIds.length) throw Object.assign(new Error("AUTHOR_ATTACHMENT_ROLE_COLLISION"), { safeCode: "AUTHOR_ATTACHMENT_ROLE_COLLISION" });

  const attachments = [];
  for (const { role, artifact } of selected) {
    const sourceName = normalizeString(artifact.jm1pub_filename || artifact.jm1pub_editorialartifactname) || `${role}.bin`;
    const fileName = authorFacingFilename(input.titleName, role, sourceName);
    const buffer = await downloadDriveItem(artifact, deps);
    const actualSha = sha256(buffer);
    const expectedSha = normalizeLower(artifact.jm1pub_sha256);
    if (expectedSha && expectedSha !== actualSha.toLowerCase()) {
      throw Object.assign(new Error(`ATTACHMENT_CHECKSUM_MISMATCH:${role}`), { safeCode: `ATTACHMENT_CHECKSUM_MISMATCH:${role}` });
    }
    const blocker = validateAttachmentBytes(role, fileName, buffer);
    if (blocker) throw Object.assign(new Error(blocker), { safeCode: blocker });
    const safetyBlocker = await validateAuthorFacingAttachmentSafety(role, fileName, artifact, buffer);
    if (safetyBlocker) throw Object.assign(new Error(safetyBlocker), { safeCode: safetyBlocker });
    attachments.push({
      name: fileName,
      contentType: contentTypeFor(fileName),
      contentInBase64: buffer.toString("base64"),
      role,
      artifactId: normalizeString(artifact.jm1pub_editorialartifactid),
      sha256: actualSha
    });
  }
  return attachments;
}

function buildAuthorResponseUrl(input) {
  const base = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || "https://jmerrill.pub";
  const url = new URL("/author/portal", base);
  url.searchParams.set("action", "review-package");
  url.searchParams.set("titleId", input.titleId);
  url.searchParams.set("stageId", input.stageId);
  url.searchParams.set("packageId", input.packageId);
  url.searchParams.set("gateId", input.gateId);
  if (url.protocol !== "https:" || !/jmerrill\.pub$/i.test(url.hostname)) {
    throw Object.assign(new Error("REVIEW_ACTION_LINK_NOT_AUTHOR_PORTAL"), { safeCode: "REVIEW_ACTION_LINK_NOT_AUTHOR_PORTAL" });
  }
  return url.toString();
}

function renderReviewCopy(input) {
  const label = stageLabel(input.stageCode);
  const title = normalizeString(input.titleName) || "your book";
  const author = normalizeString(input.authorName) || "Author";
  const actionUrl = buildAuthorResponseUrl(input);
  const packageInventory = input.attachments.map((attachment) => attachment.name);
  const subject = `${label} Materials - ${title}`;
  const text = [
    `Good day ${author},`,
    "",
    `Your ${label.toLowerCase()} materials for ${title} are ready for your review.`,
    "",
    "Why you are receiving this",
    `The publishing team has completed the current ${label.toLowerCase()} package for your book.`,
    "",
    "What has been completed",
    "The publishing team prepared the review materials for your book.",
    "The complete manuscript or proof for this review is attached to this email.",
    "Your Author Operating Center has also been updated if you would like to download another copy.",
    "",
    "What's attached",
    ...packageInventory.map((name) => `- ${name}`),
    "",
    "What we need from you",
    "Please review the attached materials for this step. You do not need to use the portal to complete this review.",
    "",
    "How to respond",
    "Reply directly to publishing@jmerrill.one with Approved, Approved with corrections, or I have questions. You may also include one consolidated correction list in your reply.",
    "",
    `Optional Author Operating Center access: ${actionUrl}`,
    "",
    "What happens next",
    "The publishing team will record your response.",
    "If you approve, the project can move to the next publishing stage.",
    "If you request corrections, the publishing team will review them before any stage movement.",
    "",
    "Support",
    "If you have questions, reply directly to this message.",
    "",
    "The Publishing Team",
    "J Merrill Publishing, Inc."
  ].join("\n");
  const htmlList = packageInventory.map((name) => `<li>${escapeHtml(name)}</li>`).join("");
  const html = `<!doctype html>
<html><body style="margin:0;padding:0;background:#f7f8fb;font-family:Arial,Helvetica,sans-serif;color:#111827;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f7f8fb;padding:24px 0;"><tr><td align="center">
<table role="presentation" width="680" cellpadding="0" cellspacing="0" style="width:680px;max-width:100%;background:#ffffff;border:1px solid #d9e0ea;">
<tr><td style="background:#111827;color:#ffffff;padding:24px 28px;"><strong>J MERRILL PUBLISHING</strong><br><span style="font-size:13px;">A Division of J Merrill One</span><br><span style="font-size:13px;">Helping Authors Help Themselves.</span></td></tr>
<tr><td style="padding:32px 28px;font-size:16px;line-height:1.55;">
<p style="margin:0 0 18px;">Good day ${escapeHtml(author)},</p>
<p style="margin:0 0 22px;">Your ${escapeHtml(label.toLowerCase())} materials for <strong>${escapeHtml(title)}</strong> are ready for your review.</p>
<h2 style="font-size:18px;line-height:1.3;margin:24px 0 10px;">Why you are receiving this</h2>
<p style="margin:0 0 18px;">The publishing team has completed the current ${escapeHtml(label.toLowerCase())} package for your book.</p>
<h2 style="font-size:18px;line-height:1.3;margin:24px 0 10px;">What has been completed</h2>
<p style="margin:0 0 18px;">The publishing team prepared the review materials for your book. The complete manuscript or proof for this review is attached to this email. Your Author Operating Center has also been updated if you would like to download another copy.</p>
<h2 style="font-size:18px;line-height:1.3;margin:24px 0 10px;">What&#39;s attached</h2>
<ul style="margin:0 0 18px 22px;padding:0;line-height:1.45;">${htmlList}</ul>
<h2 style="font-size:18px;line-height:1.3;margin:24px 0 10px;">What we need from you</h2>
<p style="margin:0 0 18px;">Please review the attached materials for this step. You do not need to use the portal to complete this review.</p>
<h2 style="font-size:18px;line-height:1.3;margin:24px 0 10px;">How to respond</h2>
<p style="margin:0 0 18px;">Reply directly to <a href="mailto:publishing@jmerrill.one">publishing@jmerrill.one</a> with Approved, Approved with corrections, or I have questions. You may also include one consolidated correction list in your reply.</p>
<p><a href="${escapeHtml(actionUrl)}" style="display:inline-block;background:#1f4ed8;color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:4px;font-weight:bold;">View in Author Operating Center</a></p>
<h2 style="font-size:18px;line-height:1.3;margin:24px 0 10px;">What happens next</h2>
<p style="margin:0 0 18px;">The publishing team will record your response. If you approve, the project can move to the next publishing stage. If you request corrections, the publishing team will review them before any stage movement.</p>
<h2 style="font-size:18px;line-height:1.3;margin:24px 0 10px;">Support</h2>
<p style="margin:0 0 18px;">If you have questions, reply directly to this message.</p>
<p style="margin:0;">The Publishing Team<br>J Merrill Publishing, Inc.</p>
</td></tr></table></td></tr></table>
</body></html>`;
  return {
    subject,
    body: text,
    htmlBody: html,
    templateName: AUTHOR_REVIEW_PACKAGE_TEMPLATE,
    templateVersion: "1.0.0",
    templateMetadata: {
      htmlSha256: sha256(html),
      textSha256: sha256(text),
      qualityGate: "PASS",
      brandSystem: "J Merrill Publishing",
      enterpriseStandard: "JM1 Enterprise Communication Standard v1.0",
      renderer: CANONICAL_RENDERER,
      rendererVersion: "1.0.0",
      renderMode: CANONICAL_RENDER_MODE,
      renderTemplateGuard: "PASS"
    }
  };
}

function canonicalIntakeReference(stage) {
  const stageReference = normalizeString(stage?.jm1pub_intakereference).toUpperCase();
  const publishingReference = normalizeString(stage?.jm1pub_publishingintakereference).toUpperCase();
  if (INTAKE_REFERENCE_PATTERN.test(stageReference) && (!publishingReference || publishingReference === stageReference)) return stageReference;
  if (INTAKE_REFERENCE_PATTERN.test(publishingReference) && !stageReference) return publishingReference;
  if (stageReference && publishingReference && stageReference !== publishingReference) return "";
  return "";
}

function validateDueSendInput(input) {
  const blockers = [];
  if (!normalizeString(input.packageInfo?.packageId)) blockers.push("PACKAGE_ID_MISSING");
  if (!normalizeString(input.titleName)) blockers.push("TITLE_MISSING");
  if (!normalizeString(input.stage?.jm1pub_editorialstageid)) blockers.push("STAGE_ID_MISSING");
  if (!normalizeString(input.gate?.jm1pub_editorialapprovalgateid)) blockers.push("GATE_ID_MISSING");
  if (!canonicalIntakeReference(input.stage)) blockers.push("CANONICAL_INTAKE_REFERENCE_MISSING");
  if (!normalizeString(input.contact?.contactid)) blockers.push("CONTACT_MISSING");
  if (!normalizeString(input.contact?.emailaddress1)) blockers.push("AUTHOR_EMAIL_MISSING");
  if (!/QA READY_INTERNAL|PACKAGE_QA_COMPLETED|QA[_ ]COMPLETE|QA PASSED/i.test(`${input.completionLog?.jm1_actiondescription || ""} ${input.stage?.jm1pub_internaloperationalsummary || ""}`)) {
    blockers.push("QA_VALIDATION_MISSING");
  }
  return blockers;
}

async function sendCadenceAuthorReviewPackage(input, deps = {}) {
  const validationBlockers = validateDueSendInput(input);
  if (validationBlockers.length > 0) return { status: "BLOCKED", blockers: validationBlockers };

  const attachments = await materializeAttachments({
    stageCode: input.schedule.stageCode,
    artifacts: input.artifacts,
    titleName: input.titleName
  }, deps);
  const copy = renderReviewCopy({
    stageCode: input.schedule.stageCode,
    titleName: input.titleName,
    titleId: input.titleId,
    authorName: input.authorName,
    stageId: input.stage.jm1pub_editorialstageid,
    packageId: input.packageInfo.packageId,
    gateId: input.gate.jm1pub_editorialapprovalgateid,
    attachments
  });
  const payload = {
    messageType: APPROVED_MESSAGE_TYPE,
    diagnosticId: input.gate.jm1pub_editorialapprovalgateid,
    intakeReferenceCode: canonicalIntakeReference(input.stage),
    authorEmail: normalizeLower(input.contact.emailaddress1),
    to: [normalizeLower(input.contact.emailaddress1)],
    authorName: input.authorName,
    projectTitle: input.titleName,
    subject: copy.subject,
    body: copy.body,
    htmlBody: copy.htmlBody,
    templateName: copy.templateName,
    templateVersion: copy.templateVersion,
    templateMetadata: copy.templateMetadata,
    attachments,
    approvedBy: SYSTEM_OPERATOR,
    approvedOn: new Date().toISOString(),
    internalVisibilityMailbox: PUBLISHING_MAILBOX,
    replyTo: PUBLISHING_MAILBOX,
    futureSendRequiresInternalCopy: true,
    futureSendRequiresDataverseLog: true,
    cc: [PUBLISHING_MAILBOX],
    bcc: []
  };

  if (typeof deps.sendRelay === "function") return deps.sendRelay(payload);

  const relayUrl = normalizeString(process.env.JM1_AUTHOR_RESPONSE_SEND_RELAY_URL || process.env.JM1_JOIN_INTERNAL_NOTIFICATION_RELAY_URL || RELAY_FALLBACK_URL).replace(/\/$/, "");
  const relayKey = process.env.JM1_AUTHOR_RESPONSE_SEND_RELAY_KEY || process.env.JM1_RELAY_API_KEY || process.env.JM1_JOIN_INTERNAL_NOTIFICATION_RELAY_KEY;
  if (!relayKey) return { status: "BLOCKED", blockers: ["RELAY_KEY_MISSING"] };

  const response = await (deps.fetchImpl || fetch)(`${relayUrl}/api/send-approved-author-response`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-jm1-relay-key": relayKey
    },
    body: JSON.stringify(payload)
  });
  const body = await response.json().catch(() => null);
  if (!response.ok || (!body?.accepted && !body?.providerMessageId)) {
    return { status: "FAILED", blockers: [`RELAY_SEND_FAILED:${body?.reason || body?.code || response.status}`], relayResponse: body };
  }
  return {
    status: "SENT",
    providerMessageId: body.providerMessageId || "accepted-without-provider-message-id",
    relayResponse: body,
    attachmentCount: attachments.length,
    attachmentChecksums: attachments.map((attachment) => `${attachment.role}:${attachment.sha256}`),
    subject: copy.subject,
    from: TRANSACTIONAL_FROM,
    replyTo: PUBLISHING_MAILBOX,
    cc: [PUBLISHING_MAILBOX]
  };
}

module.exports = {
  AUTHOR_REVIEW_PACKAGE_TEMPLATE,
  CANONICAL_RENDERER,
  CANONICAL_RENDER_MODE,
  PUBLISHING_MAILBOX,
  TRANSACTIONAL_FROM,
  canonicalIntakeReference,
  materializeAttachments,
  renderReviewCopy,
  requiredRolesFor,
  sendCadenceAuthorReviewPackage,
  stageCodeForNotification,
  validateDueSendInput
};
