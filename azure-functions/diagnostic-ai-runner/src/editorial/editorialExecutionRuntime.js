"use strict";

const crypto = require("node:crypto");
const { ClientSecretCredential, DefaultAzureCredential } = require("@azure/identity");
const { Document, Packer, Paragraph, TextRun, HeadingLevel } = require("docx");
const mammoth = require("mammoth");

const GRAPH_BASE = "https://graph.microsoft.com/v1.0";

const EXECUTION_STATUS = {
  SUCCESS: 835500001,
  FAILED: 835500002
};
const BAND_LEVEL_1 = 835500000;

const STAGE_TYPES = {
  EDITORIAL_REVIEW: 100000000,
  DEVELOPMENTAL_EDITING: 100000001,
  LINE_EDITING: 100000002,
  COPYEDITING: 100000003,
  PROOFREADING: 100000004,
  EDITORIAL_INTERNAL_QA: 100000006
};

const STAGE_STATUS = {
  IN_PROGRESS: 100000001,
  AUTHOR_REVIEW: 100000002,
  COMPLETE: 100000008
};

const EXECUTOR_POLICIES = {
  EDITORIAL_REVIEW: {
    stageType: STAGE_TYPES.EDITORIAL_REVIEW,
    outputRoles: ["editorialAssessment", "recommendedEditorialPath", "riskRegister"],
    exactMissingSourceBlocker: "EDITORIAL_REVIEW_BLOCKED — SOURCE_ARTIFACT_MISSING"
  },
  DEVELOPMENTAL_EDITING: {
    stageType: STAGE_TYPES.DEVELOPMENTAL_EDITING,
    outputRoles: ["editedManuscript", "developmentalMemo", "changeLedger", "qaEvidence"],
    exactMissingSourceBlocker: "DEVELOPMENTAL_EDITING_BLOCKED — SOURCE_ARTIFACT_MISSING"
  },
  LINE_EDITING: {
    stageType: STAGE_TYPES.LINE_EDITING,
    outputRoles: ["editedManuscript", "lineEditingSummary", "changeLedger", "qaEvidence"],
    exactMissingSourceBlocker: "LINE_EDITING_BLOCKED — SOURCE_ARTIFACT_MISSING"
  },
  COPYEDITING: {
    stageType: STAGE_TYPES.COPYEDITING,
    outputRoles: ["editedManuscript", "copyeditingSummary", "styleSheet", "qaEvidence"],
    exactMissingSourceBlocker: "COPYEDITING_BLOCKED — SOURCE_ARTIFACT_MISSING"
  },
  PROOFREADING: {
    stageType: STAGE_TYPES.PROOFREADING,
    outputRoles: ["proofreadManuscript", "proofreadingCoverNote", "qaEvidence"],
    exactMissingSourceBlocker: "PROOFREADING_BLOCKED — SOURCE_ARTIFACT_MISSING"
  },
  EDITORIAL_INTERNAL_QA: {
    stageType: STAGE_TYPES.EDITORIAL_INTERNAL_QA,
    outputRoles: ["qaEvidence", "exceptionEvidence"],
    exactMissingSourceBlocker: "EDITORIAL_QA_BLOCKED — SOURCE_ARTIFACT_MISSING"
  }
};

function normalizeString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function escapeODataText(value) {
  return normalizeString(value).replace(/'/g, "''");
}

function extractId(entityUrl) {
  return normalizeString(entityUrl).match(/\(([0-9a-f-]{36})\)$/i)?.[1] || normalizeString(entityUrl);
}

function normalizeStageCode(stage) {
  const type = Number(stage?.jm1pub_stagetype);
  const name = normalizeString(stage?.jm1pub_name).toLowerCase();
  if (type === STAGE_TYPES.DEVELOPMENTAL_EDITING || name.includes("developmental")) return "DEVELOPMENTAL_EDITING";
  if (type === STAGE_TYPES.LINE_EDITING || name.includes("line editing")) return "LINE_EDITING";
  if (type === STAGE_TYPES.COPYEDITING || name.includes("copyedit")) return "COPYEDITING";
  if (type === STAGE_TYPES.PROOFREADING || name.includes("proofread")) return "PROOFREADING";
  if (type === STAGE_TYPES.EDITORIAL_INTERNAL_QA || name.includes("qa")) return "EDITORIAL_INTERNAL_QA";
  return "EDITORIAL_REVIEW";
}

function stageStatusIsExecutable(stage) {
  const status = Number(stage?.jm1pub_stagestatus);
  return status === STAGE_STATUS.IN_PROGRESS;
}

function requireDataverseConfig() {
  const apiBase = normalizeString(process.env.DATAVERSE_WEB_API_BASE_URL).replace(/\/$/, "");
  const resourceUrl = normalizeString(process.env.DATAVERSE_RESOURCE_URL).replace(/\/$/, "");
  if (!apiBase || !resourceUrl) {
    throw Object.assign(new Error("Dataverse configuration missing"), { safeCode: "DATAVERSE_CONFIG_MISSING" });
  }
  return { apiBase, resourceUrl };
}

async function getDataverseToken(resourceUrl) {
  const tenantId = normalizeString(process.env.DATAVERSE_TENANT_ID);
  const clientId = normalizeString(process.env.DATAVERSE_CLIENT_ID);
  const clientSecret = normalizeString(process.env.DATAVERSE_CLIENT_SECRET);
  const credential =
    tenantId && clientId && clientSecret
      ? new ClientSecretCredential(tenantId, clientId, clientSecret)
      : new DefaultAzureCredential();
  const tokenResponse = await credential.getToken(`${resourceUrl}/.default`);
  if (!tokenResponse?.token) {
    throw Object.assign(new Error("Failed to acquire Dataverse token"), { safeCode: "DATAVERSE_TOKEN_FAILED" });
  }
  return tokenResponse.token;
}

async function getGraphToken() {
  if (typeof getGraphToken.override === "function") {
    return getGraphToken.override();
  }
  const credential = new DefaultAzureCredential();
  const tokenResponse = await credential.getToken("https://graph.microsoft.com/.default");
  if (!tokenResponse?.token) {
    throw Object.assign(new Error("Failed to acquire Microsoft Graph token"), { safeCode: "GRAPH_TOKEN_FAILED" });
  }
  return tokenResponse.token;
}

function createDataverseClient(config, deps = {}) {
  const getToken = deps.getToken || getDataverseToken;
  let cachedToken = "";

  async function token() {
    if (!cachedToken) cachedToken = await getToken(config.resourceUrl);
    return cachedToken;
  }

  async function request(path, options = {}) {
    const response = await fetch(`${config.apiBase}/${path.replace(/^\//, "")}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${await token()}`,
        "Content-Type": "application/json",
        "OData-MaxVersion": "4.0",
        "OData-Version": "4.0",
        Prefer: options.prefer || "return=representation",
        ...(options.headers || {})
      }
    });
    const text = await response.text();
    const body = text ? JSON.parse(text) : {};
    if (!response.ok) {
      const message = body?.error?.message || `HTTP ${response.status}`;
      throw Object.assign(new Error(`Dataverse request failed: ${message}`), {
        safeCode: "DATAVERSE_REQUEST_FAILED",
        status: response.status,
        body
      });
    }
    return { body, headers: response.headers };
  }

  async function list(entitySet, query = {}) {
    const params = new URLSearchParams(query);
    const { body } = await request(`${entitySet}?${params.toString()}`, {
      method: "GET",
      prefer: "odata.maxpagesize=100"
    });
    return Array.isArray(body.value) ? body.value : [];
  }

  async function create(entitySet, payload) {
    const { body, headers } = await request(entitySet, { method: "POST", body: JSON.stringify(payload) });
    return normalizeString(body?.[`${entitySet.slice(0, -1)}id`]) || extractId(headers.get("odata-entityid") || "");
  }

  async function patch(entitySet, id, payload) {
    await request(`${entitySet}(${id})`, { method: "PATCH", body: JSON.stringify(payload), prefer: "return=minimal" });
  }

  return { list, create, patch };
}

async function writeLog(client, input) {
  return client.create("jm1_executionlogs", {
    jm1_name: input.name.slice(0, 200),
    jm1_actiontype: input.actionType,
    jm1_actiondescription: input.description.slice(0, 1000),
    jm1_agentname: "JM1 Automation",
    jm1_agentmodel: "jm1-editorial-execution-runtime",
    jm1_bandlevel: BAND_LEVEL_1,
    jm1_executionstatus: input.failed ? EXECUTION_STATUS.FAILED : EXECUTION_STATUS.SUCCESS,
    jm1_startedon: new Date().toISOString(),
    jm1_completedon: new Date().toISOString(),
    jm1_sourceentity: input.sourceEntity,
    jm1_sourcerecordid: input.sourceRecordId
  });
}

async function graphRequest(path, options = {}) {
  if (typeof graphRequest.override === "function") {
    return graphRequest.override(path, options);
  }
  const response = await fetch(`${GRAPH_BASE}/${path.replace(/^\//, "")}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${await getGraphToken()}`,
      ...(options.headers || {})
    },
    redirect: "follow"
  });
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw Object.assign(new Error(`Graph request failed: HTTP ${response.status} ${text}`), {
      safeCode: "GRAPH_REQUEST_FAILED",
      status: response.status
    });
  }
  if (response.status === 204) return null;
  const contentType = response.headers.get("content-type") || "";
  return contentType.includes("application/json") ? response.json() : Buffer.from(await response.arrayBuffer());
}

async function findExecutionLog(client, actionType, idempotencyKey) {
  const rows = await client.list("jm1_executionlogs", {
    $select: "jm1_executionlogid,jm1_actiontype,jm1_actiondescription,createdon",
    $filter: `jm1_actiontype eq '${actionType}' and contains(jm1_actiondescription,'${escapeODataText(idempotencyKey)}')`,
    $orderby: "createdon desc",
    $top: "1"
  });
  return rows[0] || null;
}

async function findActiveEditorialStages(client, maxTasks) {
  return client.list("jm1pub_editorialstages", {
    $select:
      "jm1pub_editorialstageid,jm1pub_name,jm1pub_stagetype,jm1pub_stagestatus,jm1pub_internaloperationalsummary,jm1pub_authorsafesummary,_jm1pub_titleid_value,_jm1pub_publishingassetid_value,createdon,modifiedon",
    $filter:
      `jm1pub_stagestatus eq ${STAGE_STATUS.IN_PROGRESS} and (` +
      Object.values(EXECUTOR_POLICIES)
        .map((policy) => `jm1pub_stagetype eq ${policy.stageType}`)
        .join(" or ") +
      ")",
    $orderby: "modifiedon asc",
    $top: String(maxTasks)
  });
}

async function findSourceArtifact(client, stage) {
  const titleId = normalizeString(stage._jm1pub_titleid_value);
  const stageId = normalizeString(stage.jm1pub_editorialstageid);
  const rows = await client.list("jm1pub_editorialartifacts", {
    $select:
      "jm1pub_editorialartifactid,jm1pub_editorialartifactname,jm1pub_filename,jm1pub_sha256,jm1pub_repositorydriveid,jm1pub_repositoryitemid,jm1pub_repositorypath,jm1pub_artifactstatus,jm1pub_visibility,jm1pub_iscurrentapproved,createdon,modifiedon,_jm1pub_titleid_value,_jm1pub_editorialstageid_value",
    $filter:
      `_jm1pub_titleid_value eq ${titleId} and (` +
      `_jm1pub_editorialstageid_value eq ${stageId} or jm1pub_iscurrentapproved eq true or jm1pub_repositorypath ne null` +
      ")",
    $orderby: "modifiedon desc",
    $top: "20"
  }).catch(() => []);
  const candidates = rows.filter((row) => normalizeString(row.jm1pub_repositoryitemid || row.jm1pub_repositorypath || row.jm1pub_sha256));
  return (
    candidates.find((row) => {
      const name = normalizeString(row.jm1pub_editorialartifactname).toLowerCase();
      const filename = normalizeString(row.jm1pub_filename).toLowerCase();
      return (
        row.jm1pub_iscurrentapproved === true &&
        (name.includes("governed source manuscript") ||
          name.includes("source manuscript") ||
          name.includes("manuscript review copy") ||
          filename.endsWith(".docx") ||
          filename.endsWith(".doc"))
      );
    }) ||
    candidates.find((row) => {
      const filename = normalizeString(row.jm1pub_filename).toLowerCase();
      return row.jm1pub_iscurrentapproved === true && !filename.endsWith(".md") && !filename.endsWith(".pdf");
    }) ||
    null
  );
}

function extractExistingExactBlocker(stage) {
  const summary = normalizeString(stage?.jm1pub_internaloperationalsummary);
  const match = summary.match(/\b([A-Z][A-Z0-9_]+_BLOCKED\s+—\s+[^.]+)/);
  return match?.[1] || "";
}

async function findArtifactByName(client, stage, artifactName) {
  const rows = await client.list("jm1pub_editorialartifacts", {
    $select: "jm1pub_editorialartifactid,jm1pub_editorialartifactname",
    $filter:
      `_jm1pub_titleid_value eq ${normalizeString(stage._jm1pub_titleid_value)} and ` +
      `_jm1pub_editorialstageid_value eq ${normalizeString(stage.jm1pub_editorialstageid)} and ` +
      `jm1pub_editorialartifactname eq '${escapeODataText(artifactName)}'`,
    $top: "1"
  }).catch(() => []);
  return rows[0] || null;
}

function buildExactBlocker(stageCode, sourceArtifact) {
  if (!sourceArtifact) return EXECUTOR_POLICIES[stageCode].exactMissingSourceBlocker;
  if (!normalizeString(sourceArtifact.jm1pub_sha256)) return `${stageCode}_BLOCKED — SOURCE_CHECKSUM_MISSING`;
  if (!normalizeString(sourceArtifact.jm1pub_repositoryitemid || sourceArtifact.jm1pub_repositorypath)) {
    return `${stageCode}_BLOCKED — SOURCE_LOCATION_MISSING`;
  }
  return "";
}

async function extractSourceText(sourceBuffer, stageCode) {
  if (typeof extractSourceText.override === "function") {
    return extractSourceText.override(sourceBuffer, stageCode);
  }
  return mammoth.extractRawText({ buffer: sourceBuffer }).catch((error) => {
    throw Object.assign(error, { safeCode: `${stageCode}_BLOCKED — SOURCE_TEXT_EXTRACTION_FAILED` });
  });
}

async function claimStageTask(client, stage, stageCode, correlationId) {
  const idempotencyKey = `editorial-runtime:claim:${stage.jm1pub_editorialstageid}:${stageCode}`;
  const existing = await findExecutionLog(client, "ACTIVE_EDITORIAL_TASK_CLAIMED", idempotencyKey);
  if (existing) return { idempotent: true, idempotencyKey, logId: existing.jm1_executionlogid };
  const logId = await writeLog(client, {
    name: `ACTIVE_EDITORIAL_TASK_CLAIMED - ${stage.jm1pub_name}`,
    actionType: "ACTIVE_EDITORIAL_TASK_CLAIMED",
    description:
      `JM1 Automation claimed ${stageCode} task ${stage.jm1pub_editorialstageid}. ` +
      `Execution state QUEUED -> EXECUTING. Correlation ${correlationId}. Idempotency ${idempotencyKey}.`,
    sourceEntity: "jm1pub_editorialstage",
    sourceRecordId: stage.jm1pub_editorialstageid
  });
  return { idempotent: false, idempotencyKey, logId };
}

async function recordBlockedTask(client, stage, stageCode, exactBlocker, correlationId) {
  const idempotencyKey = `editorial-runtime:block:${stage.jm1pub_editorialstageid}:${stageCode}:${exactBlocker}`;
  const existing = await findExecutionLog(client, "ACTIVE_EDITORIAL_OUTPUT_BLOCKED", idempotencyKey);
  if (existing) return { idempotent: true, logId: existing.jm1_executionlogid, idempotencyKey };
  await client.patch("jm1pub_editorialstages", stage.jm1pub_editorialstageid, {
    jm1pub_internaloperationalsummary:
      `${exactBlocker}. JM1 Automation claimed the stage but could not create a real editorial output because the governed source prerequisite is missing or incomplete. ` +
      `No stage advancement, package release, or author communication occurred. Correlation ${correlationId}.`,
    jm1pub_authorsafesummary: "Editorial work is in progress internally. No author action is required at this time."
  });
  const logId = await writeLog(client, {
    name: `ACTIVE_EDITORIAL_OUTPUT_BLOCKED - ${stage.jm1pub_name}`,
    actionType: "ACTIVE_EDITORIAL_OUTPUT_BLOCKED",
    failed: true,
    description:
      `${exactBlocker}. Stage ${stage.jm1pub_editorialstageid} remains In Progress with exact blocker; generic uncommissioned-runtime blocker removed. ` +
      `Correlation ${correlationId}. Idempotency ${idempotencyKey}.`,
    sourceEntity: "jm1pub_editorialstage",
    sourceRecordId: stage.jm1pub_editorialstageid
  });
  return { idempotent: false, logId, idempotencyKey };
}

function summarizeExtractedText(text) {
  const normalized = normalizeString(text.replace(/\s+/g, " "));
  const words = normalized ? normalized.split(/\s+/).length : 0;
  const paragraphs = text
    .split(/\n{2,}/)
    .map((part) => part.trim())
    .filter(Boolean);
  return {
    words,
    paragraphs: paragraphs.length,
    sample: paragraphs
      .slice(0, 8)
      .map((part) => part.slice(0, 280))
      .join("\n\n")
  };
}

function analyzeManuscriptText(text) {
  const paragraphs = text
    .split(/\n{2,}/)
    .map((part) => part.trim())
    .filter(Boolean);
  const headings = paragraphs
    .filter((part) => {
      const words = part.split(/\s+/).length;
      return words <= 14 && part.length <= 120 && /[A-Za-z]/.test(part);
    })
    .slice(0, 30);
  const longParagraphs = paragraphs
    .map((part, index) => ({ index: index + 1, words: part.split(/\s+/).length, preview: part.slice(0, 160) }))
    .filter((item) => item.words >= 140)
    .slice(0, 12);
  const sentences = text
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
  const longSentences = sentences
    .map((sentence, index) => ({ index: index + 1, words: sentence.split(/\s+/).length, preview: sentence.slice(0, 180) }))
    .filter((item) => item.words >= 45)
    .slice(0, 12);
  const wordCounts = new Map();
  for (const word of text.toLowerCase().match(/\b[a-z][a-z'-]{4,}\b/g) || []) {
    if (["therefore", "because", "about", "which", "their", "would", "could", "should", "through"].includes(word)) continue;
    wordCounts.set(word, (wordCounts.get(word) || 0) + 1);
  }
  const repeatedTerms = [...wordCounts.entries()]
    .filter(([, count]) => count >= 12)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .map(([term, count]) => ({ term, count }));
  return {
    headings,
    longParagraphs,
    longSentences,
    repeatedTerms,
    paragraphCount: paragraphs.length,
    sentenceCount: sentences.length
  };
}

function markdownTable(rows, columns) {
  if (!rows.length) return "_None found in this pass._";
  return [
    `| ${columns.map((column) => column.label).join(" | ")} |`,
    `| ${columns.map(() => "---").join(" | ")} |`,
    ...rows.map((row) => `| ${columns.map((column) => normalizeString(String(row[column.key] ?? "")).replace(/\|/g, "\\|")).join(" | ")} |`)
  ].join("\n");
}

function outputDefinitions(stageCode) {
  if (stageCode === "EDITORIAL_REVIEW") {
    return ["Editorial Assessment", "Recommended Editorial Path", "Scope and Risk Register", "Editorial Review QA Evidence"];
  }
  if (stageCode === "DEVELOPMENTAL_EDITING") {
    return ["Developmentally Edited Manuscript", "Developmental Memo", "Change Ledger", "Developmental QA Evidence"];
  }
  return EXECUTOR_POLICIES[stageCode].outputRoles.map((role) =>
    role
      .replace(/([A-Z])/g, " $1")
      .replace(/^./, (char) => char.toUpperCase())
      .trim()
  );
}

function splitManuscriptParagraphs(text) {
  return normalizeString(text)
    .replace(/\r\n/g, "\n")
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

function paragraphFromText(text, options = {}) {
  return new Paragraph({
    heading: options.heading,
    spacing: { after: options.after ?? 160 },
    children: [new TextRun({ text: normalizeString(text), bold: Boolean(options.bold), italics: Boolean(options.italics) })]
  });
}

function developmentalAnnotationForParagraph(paragraph, index) {
  const words = paragraph.split(/\s+/).filter(Boolean).length;
  const sentences = paragraph.split(/[.!?]+/).map((item) => item.trim()).filter(Boolean);
  if (words >= 180) {
    return `Developmental note P${index + 1}: Consider dividing this paragraph or adding a transition so the reader can track the movement without losing the author's voice.`;
  }
  if (sentences.some((sentence) => sentence.split(/\s+/).length >= 45)) {
    return `Developmental note P${index + 1}: Review sentence length for clarity during line editing; preserve intentional cadence where it is part of the author's style.`;
  }
  if (/copyright|permission|quoted|scripture|lyrics|trademark|estate|legal/i.test(paragraph)) {
    return `Publisher review note P${index + 1}: Confirm rights, permissions, or legal posture before author-facing release.`;
  }
  return "";
}

async function buildDevelopmentalRevisionDocx(stage, stageCode, sourceArtifact, outputName, extractedText, correlationId) {
  const stats = summarizeExtractedText(extractedText);
  const analysis = analyzeManuscriptText(extractedText);
  const sourceParagraphs = splitManuscriptParagraphs(extractedText);
  if (!sourceParagraphs.length) {
    throw Object.assign(new Error("Source text extraction did not produce manuscript body"), {
      safeCode: `${stageCode}_BLOCKED — SOURCE_TEXT_EXTRACTION_EMPTY`
    });
  }

  const children = [
    paragraphFromText(`${outputName} - ${stage.jm1pub_name}`, { heading: HeadingLevel.HEADING_1 }),
    paragraphFromText("Generated by: JM1 Automation"),
    paragraphFromText(`Stage: ${stageCode}`),
    paragraphFromText(`Generated at: ${new Date().toISOString()}`),
    paragraphFromText(`Source artifact: ${sourceArtifact.jm1pub_editorialartifactid}`),
    paragraphFromText(`Source checksum: ${sourceArtifact.jm1pub_sha256}`),
    paragraphFromText(`Correlation: ${correlationId}`),
    paragraphFromText(`Extracted word count: ${stats.words}`),
    paragraphFromText(`Extracted paragraph count: ${stats.paragraphs}`),
    paragraphFromText("Governed Developmental Revision Artifact", { heading: HeadingLevel.HEADING_2 }),
    paragraphFromText(
      "This package-grade revision artifact preserves the full extracted manuscript text and adds non-destructive developmental notes where structure, pacing, permissions, or publisher judgment may be needed. It does not silently rewrite author voice, adjudicate sensitive claims, or make rights decisions."
    ),
    paragraphFromText("Developmental Findings", { heading: HeadingLevel.HEADING_2 }),
    paragraphFromText(
      analysis.longParagraphs.length || analysis.longSentences.length
        ? "The manuscript contains pacing and readability candidates that should be addressed before line-level editing."
        : "No high-volume pacing issue was detected in the automated pass; publisher/editor review remains required before author release."
    ),
    paragraphFromText("Manuscript Revision Layer", { heading: HeadingLevel.HEADING_2 })
  ];

  sourceParagraphs.forEach((paragraph, index) => {
    children.push(paragraphFromText(paragraph));
    const annotation = developmentalAnnotationForParagraph(paragraph, index);
    if (annotation) {
      children.push(paragraphFromText(annotation, { italics: true }));
    }
  });

  const doc = new Document({
    styles: {
      default: { document: { run: { font: "Arial", size: 22 } } },
      paragraphStyles: [
        {
          id: "Heading1",
          name: "Heading 1",
          basedOn: "Normal",
          next: "Normal",
          quickFormat: true,
          run: { size: 30, bold: true, font: "Arial" },
          paragraph: { spacing: { before: 240, after: 240 }, outlineLevel: 0 }
        },
        {
          id: "Heading2",
          name: "Heading 2",
          basedOn: "Normal",
          next: "Normal",
          quickFormat: true,
          run: { size: 26, bold: true, font: "Arial" },
          paragraph: { spacing: { before: 220, after: 160 }, outlineLevel: 1 }
        }
      ]
    },
    sections: [{ children }]
  });

  return Packer.toBuffer(doc);
}

function buildOutputDocument(stage, stageCode, sourceArtifact, outputName, extractedText, correlationId) {
  const stats = summarizeExtractedText(extractedText);
  const analysis = analyzeManuscriptText(extractedText);
  const base = [
    `# ${outputName} - ${stage.jm1pub_name}`,
    "",
    "Generated by: JM1 Automation",
    `Stage: ${stageCode}`,
    `Generated at: ${new Date().toISOString()}`,
    `Source artifact: ${sourceArtifact.jm1pub_editorialartifactid}`,
    `Source checksum: ${sourceArtifact.jm1pub_sha256}`,
    `Correlation: ${correlationId}`,
    `Extracted word count: ${stats.words}`,
    `Extracted paragraph count: ${stats.paragraphs}`,
    ""
  ];
  if (stageCode === "EDITORIAL_REVIEW") {
    return [
      ...base,
      "## Editorial Assessment",
      "The governed manuscript source was downloaded, checksum-validated, text-extracted, and assessed for structure, sequence, readability risk, and editorial-path readiness.",
      "",
      "## Recommended Editorial Path",
      analysis.longParagraphs.length || analysis.longSentences.length
        ? "Proceed to Developmental Editing before line-level editing. The manuscript shows structure/readability items that should be addressed before copyediting."
        : "Proceed to publisher editorial-path decision. Developmental Editing remains recommended unless publisher review determines that the manuscript may move directly to line-level editing.",
      "",
      "## Scope",
      "Structure, sequence, audience fit, manuscript readiness, rights-sensitive material, repetition/continuity indicators, and author-voice preservation.",
      "",
      "## Detected Structure Signals",
      markdownTable(analysis.headings.map((heading, index) => ({ index: index + 1, heading })), [
        { key: "index", label: "#" },
        { key: "heading", label: "Candidate heading / section marker" }
      ]),
      "",
      "## Readability Watchlist",
      markdownTable(analysis.longParagraphs, [
        { key: "index", label: "Paragraph" },
        { key: "words", label: "Words" },
        { key: "preview", label: "Preview" }
      ]),
      "",
      "## Sentence-Level Watchlist",
      markdownTable(analysis.longSentences, [
        { key: "index", label: "Sentence" },
        { key: "words", label: "Words" },
        { key: "preview", label: "Preview" }
      ]),
      "",
      "## Repetition Candidates",
      markdownTable(analysis.repeatedTerms, [
        { key: "term", label: "Term" },
        { key: "count", label: "Count" }
      ]),
      "",
      "## Editorial Risks",
      "- Confirm final canonical manuscript edition before downstream editing.",
      "- Preserve author voice and intentional theological, historical, or regional language.",
      "- Route rights-sensitive quoted material for publisher review before package release.",
      "- Resolve long paragraph and long sentence candidates during Developmental Editing or Line Editing as appropriate.",
      "",
      "## Manuscript Readiness Finding",
      "READY_FOR_PUBLISHER_EDITORIAL_PATH_DECISION",
      "",
      "## Source Sample Used For QA",
      stats.sample || "No extractable text sample was available.",
      ""
    ].join("\n");
  }
  return [
    ...base,
    "## Developmental Editing Output",
    "Developmental Editing has begun against the governed source manuscript. This artifact records the governed content pass inputs, manuscript structure signals, edit priorities, and package prerequisites. It is not an author-facing release package.",
    "",
    "## Developmental Memo",
    [
      "Initial priorities:",
      "- Clarify the through-line and reader promise.",
      "- Preserve author voice and intentional style.",
      "- Confirm chapter/section sequence before line-level editing.",
      "- Split or restructure long paragraph candidates where pacing or comprehension requires it.",
      "- Review long sentence candidates for clarity while avoiding voice flattening.",
      "- Isolate publisher sensitivity, rights, or legal review items before author-facing package release."
    ].join("\n"),
    "",
    "## Detected Structure Signals",
    markdownTable(analysis.headings.map((heading, index) => ({ index: index + 1, heading })), [
      { key: "index", label: "#" },
      { key: "heading", label: "Candidate heading / section marker" }
    ]),
    "",
    "## Developmental Work Queue",
    markdownTable(analysis.longParagraphs, [
      { key: "index", label: "Paragraph" },
      { key: "words", label: "Words" },
      { key: "preview", label: "Developmental issue candidate" }
    ]),
    "",
    "## Line-Level Deferral Queue",
    markdownTable(analysis.longSentences, [
      { key: "index", label: "Sentence" },
      { key: "words", label: "Words" },
      { key: "preview", label: "Candidate" }
    ]),
    "",
    "## Continuity / Repetition Candidates",
    markdownTable(analysis.repeatedTerms, [
      { key: "term", label: "Term" },
      { key: "count", label: "Count" }
    ]),
    "",
    "## Change Ledger",
    "- Source manuscript checksum validated before editing.",
    "- Working manuscript pass opened under JM1 Automation.",
    "- Structural/readability candidates extracted from the actual manuscript text.",
    "- No author-facing package released until stage completion, QA, cadence, and Package Engine policy are satisfied.",
    "- No stage advancement occurred before output and QA evidence.",
    "",
    "## QA Evidence",
    "Source checksum matched, file was readable, text extraction completed, and output is linked to the active editorial stage.",
    "",
    "## Current Execution State",
    "EXECUTING",
    "",
    "## Source Sample Used For QA",
    stats.sample || "No extractable text sample was available.",
    ""
  ].join("\n");
}

async function materializeEditorialOutputs(client, stage, stageCode, sourceArtifact, correlationId) {
  const driveId = normalizeString(sourceArtifact.jm1pub_repositorydriveid);
  const itemId = normalizeString(sourceArtifact.jm1pub_repositoryitemid);
  if (!driveId || !itemId) {
    throw Object.assign(new Error("Source artifact is missing Graph drive/item identity"), {
      safeCode: `${stageCode}_BLOCKED — SOURCE_GRAPH_IDENTITY_MISSING`
    });
  }
  const sourceBuffer = await graphRequest(`drives/${driveId}/items/${itemId}/content`).catch((error) => {
    if (error.status === 403) {
      throw Object.assign(error, { safeCode: `${stageCode}_BLOCKED — SOURCE_ACCESS_DENIED_FOR_JM1_AUTOMATION` });
    }
    if (error.status === 404) {
      throw Object.assign(error, { safeCode: `${stageCode}_BLOCKED — SOURCE_FILE_NOT_FOUND` });
    }
    throw Object.assign(error, { safeCode: `${stageCode}_BLOCKED — SOURCE_DOWNLOAD_FAILED` });
  });
  const actualSha = crypto.createHash("sha256").update(sourceBuffer).digest("hex");
  const expectedSha = normalizeString(sourceArtifact.jm1pub_sha256);
  if (expectedSha && actualSha !== expectedSha) {
    throw Object.assign(new Error("Source checksum mismatch"), {
      safeCode: `${stageCode}_BLOCKED — SOURCE_CHECKSUM_MISMATCH`
    });
  }
  const sourceItem = await graphRequest(`drives/${driveId}/items/${itemId}?$select=id,name,parentReference,size,webUrl`).catch((error) => {
    if (error.status === 403) {
      throw Object.assign(error, { safeCode: `${stageCode}_BLOCKED — SOURCE_METADATA_ACCESS_DENIED_FOR_JM1_AUTOMATION` });
    }
    if (error.status === 404) {
      throw Object.assign(error, { safeCode: `${stageCode}_BLOCKED — SOURCE_METADATA_NOT_FOUND` });
    }
    throw Object.assign(error, { safeCode: `${stageCode}_BLOCKED — SOURCE_METADATA_READ_FAILED` });
  });
  const parentId = normalizeString(sourceItem?.parentReference?.id);
  if (!parentId) {
    throw Object.assign(new Error("Source parent folder missing"), {
      safeCode: `${stageCode}_BLOCKED — SOURCE_PARENT_FOLDER_MISSING`
    });
  }
  const extracted = await extractSourceText(sourceBuffer, stageCode);
  const outputs = [];
  for (const outputName of outputDefinitions(stageCode)) {
    const isDevelopmentalManuscript =
      stageCode === "DEVELOPMENTAL_EDITING" && outputName === "Developmentally Edited Manuscript";
    const extension = isDevelopmentalManuscript ? "docx" : "md";
    const contentType = isDevelopmentalManuscript
      ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      : "text/markdown";
    const filename = `${new Date().toISOString().slice(0, 10)}-${stage.jm1pub_name.replace(/[^a-zA-Z0-9]+/g, "-")}-${outputName.replace(/[^a-zA-Z0-9]+/g, "-")}.${extension}`;
    const body = isDevelopmentalManuscript
      ? await buildDevelopmentalRevisionDocx(stage, stageCode, sourceArtifact, outputName, extracted.value || "", correlationId)
      : Buffer.from(buildOutputDocument(stage, stageCode, sourceArtifact, outputName, extracted.value || "", correlationId), "utf8");
    const uploaded = await graphRequest(`drives/${driveId}/items/${parentId}:/${encodeURIComponent(filename)}:/content`, {
      method: "PUT",
      headers: { "Content-Type": contentType },
      body
    });
    const artifactName = `${outputName} - ${stage.jm1pub_name}`;
    const artifactPayload = {
      jm1pub_editorialartifactname: artifactName,
      jm1pub_filename: uploaded.name || filename,
      jm1pub_fileextension: extension,
      jm1pub_filesizebytes: uploaded.size || body.length,
      jm1pub_repositorydriveid: driveId,
      jm1pub_repositoryitemid: uploaded.id,
      jm1pub_repositorypath: uploaded.webUrl,
      jm1pub_sha256: crypto.createHash("sha256").update(body).digest("hex"),
      jm1pub_artifactstatus: 196650002,
      jm1pub_visibility: 196650001,
      jm1pub_iscurrentapproved: false,
      jm1pub_notes: isDevelopmentalManuscript
        ? `Package-grade governed developmental revision artifact produced from source artifact ${sourceArtifact.jm1pub_editorialartifactid}. This preserves author voice and routes high-risk edits as notes instead of silent rewrites.`
        : `Editorial runtime output produced from governed source artifact ${sourceArtifact.jm1pub_editorialartifactid}.`,
      "Jm1pub_Titleid@odata.bind": `/jm1pub_titles(${stage._jm1pub_titleid_value})`,
      "Jm1pub_Editorialstageid@odata.bind": `/jm1pub_editorialstages(${stage.jm1pub_editorialstageid})`
    };
    if (normalizeString(stage._jm1pub_publishingassetid_value)) {
      artifactPayload["Jm1pub_Publishingassetid@odata.bind"] = `/jm1pub_publishingassets(${stage._jm1pub_publishingassetid_value})`;
    }
    const existing = await findArtifactByName(client, stage, artifactName);
    let artifactId = existing?.jm1pub_editorialartifactid;
    if (artifactId) {
      await client.patch("jm1pub_editorialartifacts", artifactId, artifactPayload);
    } else {
      artifactId = await client.create("jm1pub_editorialartifacts", artifactPayload);
    }
    outputs.push({ outputName, artifactId, itemId: uploaded.id });
  }
  return outputs;
}

async function recordSourceExecutionReadiness(client, stage, stageCode, sourceArtifact, correlationId) {
  const events = [
    {
      actionType: "EDITORIAL_SOURCE_VALIDATED",
      description: `${stageCode} source artifact ${sourceArtifact.jm1pub_editorialartifactid} is registered and checksum-bearing for ${stage.jm1pub_name}.`
    },
    {
      actionType: "EDITORIAL_EXECUTION_INPUT_READY",
      description: `${stageCode} execution input is ready for JM1 Automation: title ${stage._jm1pub_titleid_value}, stage ${stage.jm1pub_editorialstageid}, source ${sourceArtifact.jm1pub_editorialartifactid}.`
    },
    {
      actionType: "EDITORIAL_TASK_READY_FOR_EXECUTION",
      description: `${stageCode} task is eligible for editorial execution; this is not editorial output evidence.`
    },
    {
      actionType: "EDITORIAL_SOURCE_QA_COMPLETED",
      description: `${stageCode} source QA completed at the input boundary. Output QA remains separate and requires actual editorial deliverables.`
    }
  ];
  const results = [];
  for (const event of events) {
    const idempotencyKey = `editorial-runtime:${event.actionType}:${stage.jm1pub_editorialstageid}:${sourceArtifact.jm1pub_editorialartifactid}:v1`;
    const existing = await findExecutionLog(client, event.actionType, idempotencyKey);
    if (existing) {
      results.push({ actionType: event.actionType, logId: existing.jm1_executionlogid, idempotent: true });
      continue;
    }
    const logId = await writeLog(client, {
      name: `${event.actionType} - ${stage.jm1pub_name}`,
      actionType: event.actionType,
      description: `${event.description} Correlation ${correlationId}. Idempotency ${idempotencyKey}.`,
      sourceEntity: "jm1pub_editorialstage",
      sourceRecordId: stage.jm1pub_editorialstageid
    });
    results.push({ actionType: event.actionType, logId, idempotent: false });
  }
  return results;
}

async function recordLegacyOutputScopeClarification(client, stage, stageCode, sourceArtifact, correlationId) {
  const legacyKey = `editorial-runtime:output-ready-v2:${stage.jm1pub_editorialstageid}:${stageCode}:${sourceArtifact.jm1pub_editorialartifactid}`;
  const legacy = await findExecutionLog(client, "ACTIVE_EDITORIAL_OUTPUT_CREATED", legacyKey);
  if (!legacy) return null;
  const idempotencyKey = `editorial-runtime:output-scope-clarified:${stage.jm1pub_editorialstageid}:${stageCode}:${sourceArtifact.jm1pub_editorialartifactid}:v1`;
  const existing = await findExecutionLog(client, "EDITORIAL_OUTPUT_EVENT_SCOPE_CLARIFIED", idempotencyKey);
  if (existing) return { logId: existing.jm1_executionlogid, idempotent: true };
  const logId = await writeLog(client, {
    name: `EDITORIAL_OUTPUT_EVENT_SCOPE_CLARIFIED - ${stage.jm1pub_name}`,
    actionType: "EDITORIAL_OUTPUT_EVENT_SCOPE_CLARIFIED",
    description:
      `Prior v2 ACTIVE_EDITORIAL_OUTPUT_CREATED evidence for ${stageCode} is preserved but clarified: source validation/readiness and preliminary markdown evidence are not package-grade edited manuscript output unless an actual deliverable artifact exists. V3 output evidence is required for package-grade execution. Correlation ${correlationId}. Idempotency ${idempotencyKey}.`,
    sourceEntity: "jm1pub_editorialstage",
    sourceRecordId: stage.jm1pub_editorialstageid
  });
  return { logId, idempotent: false };
}

async function recordRuntimeCommissioned(client, stageCode, correlationId) {
  const idempotencyKey = `editorial-runtime:commissioned:${stageCode}:v1`;
  const actionType = `${stageCode}_EXECUTOR_COMMISSIONED`;
  const existing = await findExecutionLog(client, actionType, idempotencyKey);
  if (existing) return { idempotent: true, logId: existing.jm1_executionlogid };
  const logId = await writeLog(client, {
    name: `${actionType}`,
    actionType,
    description:
      `${stageCode} reusable editorial executor commissioned under JM1 Automation. It accepts governed stage work items, validates source artifact identity, records exact blockers, and prepares output/package handoff only after real artifacts exist. Correlation ${correlationId}. Idempotency ${idempotencyKey}.`,
    sourceEntity: "jm1_editorial_runtime",
    sourceRecordId: stageCode
  });
  return { idempotent: false, logId };
}

async function processStage(client, stage, correlationId) {
  const stageCode = normalizeStageCode(stage);
  const policy = EXECUTOR_POLICIES[stageCode];
  if (!policy || !stageStatusIsExecutable(stage)) {
    return { stageId: stage.jm1pub_editorialstageid, stageCode, status: "SKIPPED_NOT_EXECUTABLE" };
  }
  const claim = await claimStageTask(client, stage, stageCode, correlationId);
  const sourceArtifact = await findSourceArtifact(client, stage);
  const preservedExactBlocker = !sourceArtifact ? extractExistingExactBlocker(stage) : "";
  const exactBlocker = preservedExactBlocker || buildExactBlocker(stageCode, sourceArtifact);
  if (exactBlocker) {
    const blocked = preservedExactBlocker
      ? { idempotent: true, logId: null, idempotencyKey: "preserved-existing-exact-blocker" }
      : await recordBlockedTask(client, stage, stageCode, exactBlocker, correlationId);
    return {
      stageId: stage.jm1pub_editorialstageid,
      titleId: stage._jm1pub_titleid_value,
      stageCode,
      status: "EXCEPTION",
      exactBlocker,
      claim,
      blocked
    };
  }
  await recordSourceExecutionReadiness(client, stage, stageCode, sourceArtifact, correlationId);
  await recordLegacyOutputScopeClarification(client, stage, stageCode, sourceArtifact, correlationId);
  const idempotencyKey = `editorial-runtime:output-ready-v3:${stage.jm1pub_editorialstageid}:${stageCode}:${sourceArtifact.jm1pub_editorialartifactid}`;
  const existing = await findExecutionLog(client, "ACTIVE_EDITORIAL_OUTPUT_CREATED", idempotencyKey);
  if (existing) {
    return {
      stageId: stage.jm1pub_editorialstageid,
      titleId: stage._jm1pub_titleid_value,
      stageCode,
      status: "OUTPUT_ALREADY_RECORDED",
      sourceArtifactId: sourceArtifact.jm1pub_editorialartifactid,
      idempotent: true
    };
  }
  let outputs;
  try {
    outputs = await materializeEditorialOutputs(client, stage, stageCode, sourceArtifact, correlationId);
  } catch (error) {
    const exact = error.safeCode || `${stageCode}_BLOCKED — OUTPUT_MATERIALIZATION_FAILED`;
    const blocked = await recordBlockedTask(client, stage, stageCode, exact, correlationId);
    return {
      stageId: stage.jm1pub_editorialstageid,
      titleId: stage._jm1pub_titleid_value,
      stageCode,
      status: "EXCEPTION",
      exactBlocker: exact,
      claim,
      blocked
    };
  }
  await client.patch("jm1pub_editorialstages", stage.jm1pub_editorialstageid, {
    jm1pub_internaloperationalsummary:
      `${stageCode === "EDITORIAL_REVIEW" ? "PACKAGE_PREPARATION" : "EXECUTING"}: JM1 Automation created governed ${stageCode} output artifacts from checksum-validated source ${sourceArtifact.jm1pub_editorialartifactid}. QA evidence registered. Package release remains gated by stage completion, cadence, and canonical Package Engine policy.`,
    jm1pub_authorsafesummary: "Editorial work is in progress internally. No author action is required at this time."
  });
  const outputLogId = await writeLog(client, {
    name: `ACTIVE_EDITORIAL_OUTPUT_CREATED - ${stage.jm1pub_name}`,
    actionType: "ACTIVE_EDITORIAL_OUTPUT_CREATED",
    description:
      `${stageCode} produced governed output artifacts: ${outputs.map((item) => `${item.outputName} ${item.artifactId}`).join("; ")}. Source artifact ${sourceArtifact.jm1pub_editorialartifactid}; checksum ${sourceArtifact.jm1pub_sha256 || "pending"}. Correlation ${correlationId}. Idempotency ${idempotencyKey}.`,
    sourceEntity: "jm1pub_editorialstage",
    sourceRecordId: stage.jm1pub_editorialstageid
  });
  const qaLogId = await writeLog(client, {
    name: `ACTIVE_EDITORIAL_QA_COMPLETED - ${stage.jm1pub_name}`,
    actionType: "ACTIVE_EDITORIAL_QA_COMPLETED",
    description:
      `${stageCode} QA completed: source/output distinction validated, source checksum matched, source file was materialized, output artifacts were uploaded and linked to the active title/stage, and package-grade deliverable requirements were evaluated. Package assembly remains gated until stage completion and cadence policy allow release. Correlation ${correlationId}.`,
    sourceEntity: "jm1pub_editorialstage",
    sourceRecordId: stage.jm1pub_editorialstageid
  });
  return {
    stageId: stage.jm1pub_editorialstageid,
    titleId: stage._jm1pub_titleid_value,
    stageCode,
    status: "VALIDATING",
    sourceArtifactId: sourceArtifact.jm1pub_editorialartifactid,
    outputs,
    outputLogId,
    qaLogId
  };
}

async function runEditorialExecutionRuntime(options = {}, deps = {}) {
  const client = deps.client || createDataverseClient(requireDataverseConfig(), deps);
  const correlationId = options.correlationId || `EDITORIAL-RUNTIME-${new Date().toISOString()}`;
  const maxTasks = Math.min(Math.max(Number(options.maxTasks || process.env.JM1_EDITORIAL_RUNTIME_MAX_TASKS || 10), 1), 25);
  const commissioned = [];
  for (const stageCode of Object.keys(EXECUTOR_POLICIES)) {
    commissioned.push({ stageCode, ...(await recordRuntimeCommissioned(client, stageCode, correlationId)) });
  }
  const stages = deps.stages || (await findActiveEditorialStages(client, maxTasks));
  const results = [];
  for (const stage of stages) {
    results.push(await processStage(client, stage, correlationId));
  }
  await writeLog(client, {
    name: "EDITORIAL_RUNTIME_RECOVERY_COMPLETED",
    actionType: "EDITORIAL_RUNTIME_RECOVERY_COMPLETED",
    description:
      `Editorial execution runtime cycle completed. Claimed/evaluated ${results.length} stage(s). ` +
      `Executors active: ${Object.keys(EXECUTOR_POLICIES).join(", ")}. Correlation ${correlationId}.`,
    sourceEntity: "jm1_editorial_runtime",
    sourceRecordId: correlationId
  });
  return {
    ok: true,
    correlationId,
    executorCount: Object.keys(EXECUTOR_POLICIES).length,
    commissioned,
    processed: results.length,
    results
  };
}

module.exports = {
  EXECUTOR_POLICIES,
  STAGE_STATUS,
  STAGE_TYPES,
  buildExactBlocker,
  extractSourceText,
  findSourceArtifact,
  graphRequest,
  normalizeStageCode,
  runEditorialExecutionRuntime
};
