"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const mammoth = require("mammoth");

const {
  EXECUTOR_POLICIES,
  authorGateBlocksRuntime,
  buildStageModelPrompt,
  buildExactBlocker,
  classifyGraphFailure,
  extractSourceText,
  findSourceArtifact,
  findUpstreamApprovalEvidence,
  graphRequest,
  graphShareToken,
  invokeStageModelProvider,
  isLivePortfolioStage,
  buildLineEditingQa,
  normalizeStageCode,
  resolveSourceGraphItem,
  shouldPreserveExistingExactBlocker,
  evaluateTargetedEditorialExecution,
  runEditorialExecutionRuntime
} = require("../src/editorial/editorialExecutionRuntime");

test("editorial execution runtime defines reusable executors for all required editorial stages", () => {
  assert.deepEqual(Object.keys(EXECUTOR_POLICIES).sort(), [
    "COPYEDITING",
    "DEVELOPMENTAL_EDITING",
    "EDITORIAL_INTERNAL_QA",
    "EDITORIAL_REVIEW",
    "LINE_EDITING",
    "PROOFREADING"
  ]);
  assert.equal(EXECUTOR_POLICIES.DEVELOPMENTAL_EDITING.outputRoles.includes("developmentalMemo"), true);
  assert.equal(EXECUTOR_POLICIES.PROOFREADING.outputRoles.includes("proofreadManuscript"), true);
});

test("stage names normalize to canonical executor codes", () => {
  assert.equal(normalizeStageCode({ jm1pub_name: "Developmental Editing - Before You Were Born" }), "DEVELOPMENTAL_EDITING");
  assert.equal(normalizeStageCode({ jm1pub_name: "Editorial Review - The Long Watch" }), "EDITORIAL_REVIEW");
  assert.equal(normalizeStageCode({ jm1pub_name: "Proofreading - The Intentional Leader" }), "PROOFREADING");
});

test("Graph share token encodes SharePoint web URLs for driveItem resolution", () => {
  const token = graphShareToken("https://jmerrillfoundation.sharepoint.com/sites/publishing/Shared%20Documents/source.docx");
  assert.match(token, /^u!/);
  assert.equal(token.includes("="), false);
  assert.equal(token.includes("+"), false);
  assert.equal(token.includes("/"), false);
  assert.equal(graphShareToken("/repo/path/source.docx"), "");
});

test("source Graph resolver preserves canonical drive/item identity when present", async () => {
  const paths = [];
  graphRequest.override = async (path) => {
    paths.push(path);
    assert.equal(path, "drives/drive-1/items/item-1?$select=id,name,parentReference,size,webUrl");
    return { id: "item-1", parentReference: { driveId: "drive-1", id: "parent-1" } };
  };

  try {
    const result = await resolveSourceGraphItem(
      {
        jm1pub_repositorydriveid: "drive-1",
        jm1pub_repositoryitemid: "item-1",
        jm1pub_repositorypath: "https://example.invalid/ignored.docx"
      },
      "LINE_EDITING"
    );
    assert.equal(result.driveId, "drive-1");
    assert.equal(result.item.id, "item-1");
    assert.equal(result.contentPath, "drives/drive-1/items/item-1/content");
    assert.deepEqual(paths, ["drives/drive-1/items/item-1?$select=id,name,parentReference,size,webUrl"]);
  } finally {
    graphRequest.override = null;
  }
});

test("source Graph resolver uses SharePoint web URL when drive/item identity is absent", async () => {
  const webUrl = "https://jmerrillfoundation.sharepoint.com/sites/publishing/Shared%20Documents/source.docx";
  const shareToken = graphShareToken(webUrl);
  const paths = [];
  graphRequest.override = async (path) => {
    paths.push(path);
    assert.equal(path, `shares/${shareToken}/driveItem?$select=id,name,parentReference,size,webUrl`);
    return { id: "item-from-share", parentReference: { driveId: "drive-from-share", id: "parent-from-share" } };
  };

  try {
    const result = await resolveSourceGraphItem({ jm1pub_repositorypath: webUrl }, "LINE_EDITING");
    assert.equal(result.driveId, "drive-from-share");
    assert.equal(result.item.id, "item-from-share");
    assert.equal(result.contentPath, `shares/${shareToken}/driveItem/content`);
    assert.deepEqual(paths, [`shares/${shareToken}/driveItem?$select=id,name,parentReference,size,webUrl`]);
  } finally {
    graphRequest.override = null;
  }
});

test("source Graph identity blockers are retriable while substantive blockers remain preserved", () => {
  assert.equal(shouldPreserveExistingExactBlocker("LINE_EDITING_BLOCKED — SOURCE_GRAPH_IDENTITY_MISSING"), false);
  assert.equal(
    shouldPreserveExistingExactBlocker("LINE_EDITING_BLOCKED — LINE_RETENTION_OUTSIDE_95_TO_100_PERCENT_WINDOW"),
    false
  );
  assert.equal(
    shouldPreserveExistingExactBlocker("DEVELOPMENTAL_EDITING_BLOCKED — CANONICAL_COMPILATION_FILE_AMBIGUOUS"),
    true
  );
  assert.equal(shouldPreserveExistingExactBlocker(""), false);
});

test("live portfolio stage guard excludes synthetic and test records without excluding Testament titles", () => {
  assert.equal(isLivePortfolioStage({ jm1pub_name: "Developmental Editing - The General’s Will and Last Testament" }), true);
  assert.equal(isLivePortfolioStage({ jm1pub_name: "GATE-W1 App Service Staging DOCX Join 1785342161378" }), false);
  assert.equal(isLivePortfolioStage({ jm1pub_name: "JM1 Synthetic Intake Final Proof 20260727170349" }), false);
  assert.equal(isLivePortfolioStage({ jm1pub_name: "Developmental Editing - Test" }), false);
  assert.equal(isLivePortfolioStage({ jm1pub_name: "JM1 Duplicate Proof 20260727173641" }), false);
});

test("author gate guard blocks runtime unless the tied gate has final approval", () => {
  assert.equal(authorGateBlocksRuntime(null), false);
  assert.equal(
    authorGateBlocksRuntime({
      jm1pub_gatestatus: 196650003,
      jm1pub_authordecision: 196650000,
      jm1pub_authordecisionon: "2026-08-14T00:00:00Z",
      jm1pub_nextstageauthorized: true,
      _jm1pub_deliverableartifactid_value: "artifact-1"
    }),
    false
  );
  assert.equal(authorGateBlocksRuntime({ jm1pub_gatestatus: 196650001, jm1pub_authordecision: 196650000, jm1pub_authordecisionon: "2026-08-14T00:00:00Z" }), true);
  assert.equal(authorGateBlocksRuntime({ jm1pub_gatestatus: 196650003, jm1pub_authordecision: 196650001, jm1pub_authordecisionon: "2026-08-14T00:00:00Z" }), false);
  assert.equal(authorGateBlocksRuntime({ jm1pub_gatestatus: 196650003, jm1pub_authordecision: 196650000 }), true);
});

test("upstream approval evidence requires full author approval bound to a checksum artifact", async () => {
  const client = {
    async list(entitySet) {
      if (entitySet === "jm1pub_editorialstages") {
        return [{ jm1pub_editorialstageid: "stage-editorial", jm1pub_stagetype: 100000000 }];
      }
      if (entitySet === "jm1pub_editorialartifacts") {
        return [
          {
            jm1pub_editorialartifactid: "artifact-editorial",
            jm1pub_sha256: "sha-editorial",
            jm1pub_iscurrentapproved: true
          }
        ];
      }
      if (entitySet === "jm1pub_editorialapprovalgates") {
        return [
          {
            jm1pub_editorialapprovalgateid: "gate-editorial",
            jm1pub_gatestatus: 196650003,
            jm1pub_authordecision: 196650000,
            jm1pub_authordecisionon: "2026-08-14T00:00:00Z",
            jm1pub_nextstageauthorized: true,
            _jm1pub_deliverableartifactid_value: "artifact-editorial"
          }
        ];
      }
      return [];
    }
  };
  const result = await findUpstreamApprovalEvidence(
    client,
    { _jm1pub_titleid_value: "title-1", jm1pub_editorialstageid: "stage-dev" },
    "DEVELOPMENTAL_EDITING"
  );
  assert.equal(result.ok, true);
  assert.equal(result.approvedArtifactId, "artifact-editorial");
});

test("upstream approval evidence blocks when the approval is not bound to the artifact", async () => {
  const client = {
    async list(entitySet) {
      if (entitySet === "jm1pub_editorialstages") return [{ jm1pub_editorialstageid: "stage-editorial" }];
      if (entitySet === "jm1pub_editorialartifacts") {
        return [{ jm1pub_editorialartifactid: "artifact-editorial", jm1pub_sha256: "sha-editorial", jm1pub_iscurrentapproved: true }];
      }
      if (entitySet === "jm1pub_editorialapprovalgates") {
        return [{ jm1pub_editorialapprovalgateid: "gate-editorial", jm1pub_gatestatus: 196650003, jm1pub_authordecision: 196650000, jm1pub_authordecisionon: "2026-08-14T00:00:00Z", jm1pub_nextstageauthorized: true }];
      }
      return [];
    }
  };
  const result = await findUpstreamApprovalEvidence(
    client,
    { _jm1pub_titleid_value: "title-1", jm1pub_editorialstageid: "stage-dev" },
    "DEVELOPMENTAL_EDITING"
  );
  assert.equal(result.ok, false);
  assert.match(result.reason, /AUTHOR_APPROVAL_NOT_BOUND_TO_CURRENT_ARTIFACT/);
});

function targetedExecutionClient(overrides = {}) {
  const rows = {
    jm1pub_titles: [
      {
        jm1pub_titleid: "title-1",
        jm1pub_titlename: "The General's Will and Last Testament",
        jm1pub_authorname: "Iyorwuese Hagher"
      }
    ],
    targetStages: [
      {
        jm1pub_editorialstageid: "stage-line",
        jm1pub_name: "Line Editing - The General's Will and Last Testament",
        jm1pub_stagetype: 100000002,
        jm1pub_stagestatus: 100000001,
        _jm1pub_titleid_value: "title-1"
      }
    ],
    upstreamStages: [
      {
        jm1pub_editorialstageid: "stage-dev",
        jm1pub_name: "Developmental Editing - The General's Will and Last Testament",
        jm1pub_stagetype: 100000001,
        jm1pub_stagestatus: 100000008,
        _jm1pub_titleid_value: "title-1"
      }
    ],
    sourceArtifacts: [
      {
        jm1pub_editorialartifactid: "artifact-dev",
        jm1pub_editorialartifactname: "Final Developmental Manuscript",
        jm1pub_filename: "developmental-approved.docx",
        jm1pub_sha256: "sha-dev",
        jm1pub_repositoryitemid: "source-item",
        jm1pub_iscurrentapproved: true,
        _jm1pub_titleid_value: "title-1",
        _jm1pub_editorialstageid_value: "stage-dev"
      }
    ],
    upstreamArtifacts: [
      {
        jm1pub_editorialartifactid: "artifact-dev",
        jm1pub_editorialartifactname: "Final Developmental Manuscript",
        jm1pub_filename: "developmental-approved.docx",
        jm1pub_sha256: "sha-dev",
        jm1pub_iscurrentapproved: true,
        _jm1pub_titleid_value: "title-1",
        _jm1pub_editorialstageid_value: "stage-dev"
      }
    ],
    upstreamGates: [
      {
        jm1pub_editorialapprovalgateid: "gate-dev",
        jm1pub_gatestatus: 196650003,
        jm1pub_authordecision: 196650000,
        jm1pub_authordecisionon: "2026-08-19T00:00:00Z",
        jm1pub_nextstageauthorized: true,
        _jm1pub_titleid_value: "title-1",
        _jm1pub_editorialstageid_value: "stage-dev",
        _jm1pub_deliverableartifactid_value: "artifact-dev"
      }
    ],
    existingLogs: [],
    ...overrides
  };
  return {
    creates: [],
    patches: [],
    async list(entitySet, query = {}) {
      if (entitySet === "jm1pub_titles") return rows.jm1pub_titles;
      if (entitySet === "jm1pub_editorialstages" && /jm1pub_stagetype eq 100000002/.test(query.$filter || "")) {
        return rows.targetStages;
      }
      if (entitySet === "jm1pub_editorialstages" && /jm1pub_stagetype eq 100000001/.test(query.$filter || "")) {
        return rows.upstreamStages;
      }
      if (entitySet === "jm1pub_editorialartifacts" && /jm1pub_editorialartifactid eq artifact-dev/.test(query.$filter || "")) {
        return rows.sourceArtifacts;
      }
      if (entitySet === "jm1pub_editorialartifacts") return rows.upstreamArtifacts;
      if (entitySet === "jm1pub_editorialapprovalgates") return rows.upstreamGates;
      if (entitySet === "jm1_executionlogs") return rows.existingLogs;
      throw new Error(`Unexpected list ${entitySet} ${JSON.stringify(query)}`);
    },
    async first(entitySet, query = {}) {
      return (await this.list(entitySet, query))[0] || null;
    },
    async create(entitySet, payload) {
      this.creates.push({ entitySet, payload });
      return "created-id";
    },
    async patch(entitySet, id, payload) {
      this.patches.push({ entitySet, id, payload });
    }
  };
}

test("targeted editorial execution dry-run resolves exactly one Line stage/source without mutations", async () => {
  const client = targetedExecutionClient();
  const result = await evaluateTargetedEditorialExecution(
    {
      titleId: "title-1",
      stageCode: "LINE_EDITING",
      sourceArtifactId: "artifact-dev",
      sourceChecksum: "sha-dev",
      expectedCurrentStage: "DEVELOPMENTAL_COMPLETE",
      authorApprovalRequired: true,
      executionMode: "DRY_RUN"
    },
    { client }
  );

  assert.equal(result.ok, true);
  assert.equal(result.status, "DRY_RUN_READY");
  assert.equal(result.canonicalTitle.title, "The General's Will and Last Testament");
  assert.equal(result.currentStage.stageId, "stage-line");
  assert.equal(result.exactSourceArtifact.artifactId, "artifact-dev");
  assert.equal(result.authorApprovalEvidence.approvedArtifactId, "artifact-dev");
  assert.deepEqual(result.expectedMutations, [
    "claim target editorial stage",
    "read exact source artifact",
    "invoke governed provider route",
    "persist output artifacts",
    "write QA evidence",
    "create package manifest",
    "create mandatory author-review gate"
  ]);
  assert.equal(client.creates.length, 0);
  assert.equal(client.patches.length, 0);
});

test("targeted editorial execution rejects missing target stage instead of creating one implicitly", async () => {
  const result = await evaluateTargetedEditorialExecution(
    {
      titleId: "title-1",
      stageCode: "LINE_EDITING",
      sourceArtifactId: "artifact-dev",
      sourceChecksum: "sha-dev",
      expectedCurrentStage: "DEVELOPMENTAL_COMPLETE",
      authorApprovalRequired: true,
      executionMode: "DRY_RUN"
    },
    { client: targetedExecutionClient({ targetStages: [] }) }
  );

  assert.equal(result.ok, false);
  assert.equal(result.code, "TARGET_STAGE_NOT_FOUND");
});

test("targeted editorial execution rejects bulk selectors", async () => {
  const result = await evaluateTargetedEditorialExecution(
    {
      titleId: "title-1",
      stageCode: "LINE_EDITING",
      sourceArtifactId: "artifact-dev",
      sourceChecksum: "sha-dev",
      expectedCurrentStage: "DEVELOPMENTAL_COMPLETE",
      authorApprovalRequired: true,
      executionMode: "DRY_RUN",
      portfolioSelector: "all-line-ready"
    },
    { client: targetedExecutionClient() }
  );

  assert.equal(result.ok, false);
  assert.equal(result.code, "BULK_SELECTOR_NOT_ALLOWED");
});

test("targeted editorial execution rejects stages already completed for the same source", async () => {
  const result = await evaluateTargetedEditorialExecution(
    {
      titleId: "title-1",
      stageCode: "LINE_EDITING",
      sourceArtifactId: "artifact-dev",
      sourceChecksum: "sha-dev",
      expectedCurrentStage: "DEVELOPMENTAL_COMPLETE",
      authorApprovalRequired: true,
      executionMode: "EXECUTE"
    },
    {
      client: targetedExecutionClient({
        existingLogs: [{ jm1_executionlogid: "existing-output-log" }]
      })
    }
  );

  assert.equal(result.ok, false);
  assert.equal(result.code, "TARGET_STAGE_ALREADY_COMPLETED_FOR_SOURCE");
  assert.equal(result.existingOutputLogId, "existing-output-log");
});

test("line editing prompt inherits author-approved developmental context", () => {
  const prompt = JSON.parse(buildStageModelPrompt({
    stage: {
      jm1pub_editorialstageid: "stage-line",
      jm1pub_name: "Line Editing - Test",
      jm1pub_internaloperationalsummary: "Line pass is ready after Developmental author approval.",
      jm1pub_authorsafesummary: "The manuscript is moving to line editing.",
      _jm1pub_titleid_value: "title-1"
    },
    stageCode: "LINE_EDITING",
    sourceArtifact: {
      jm1pub_editorialartifactid: "source-artifact",
      jm1pub_editorialartifactname: "Approved Developmental Manuscript",
      jm1pub_filename: "developmental-approved.docx",
      jm1pub_sha256: "sha-source",
      jm1pub_iscurrentapproved: true
    },
    extractedText: "This sentence reads clearly today.",
    upstreamContext: {
      approvedArtifactId: "artifact-dev",
      stages: [
        {
          jm1pub_editorialstageid: "stage-dev",
          jm1pub_name: "Developmental Editing - Test",
          jm1pub_stagetype: 100000001,
          jm1pub_stagestatus: 100000008,
          modifiedon: "2026-08-19T01:28:44Z"
        }
      ],
      artifacts: [
        {
          jm1pub_editorialartifactid: "artifact-dev",
          jm1pub_editorialartifactname: "Developmentally Edited Manuscript",
          jm1pub_filename: "developmental-approved.docx",
          jm1pub_sha256: "sha-dev",
          jm1pub_iscurrentapproved: true,
          modifiedon: "2026-08-19T01:28:44Z"
        }
      ],
      gates: [
        {
          jm1pub_editorialapprovalgateid: "gate-dev",
          jm1pub_gatestatus: 196650003,
          jm1pub_authordecision: 196650000,
          jm1pub_authordecisionon: "2026-08-19T01:28:44Z",
          jm1pub_nextstageauthorized: true,
          _jm1pub_deliverableartifactid_value: "artifact-dev"
        }
      ]
    }
  }));
  assert.equal(prompt.upstreamContext.priorAuthorDecision.gateId, "gate-dev");
  assert.equal(prompt.upstreamContext.priorAuthorDecision.deliverableArtifactId, "artifact-dev");
  assert.equal(prompt.upstreamContext.approvedUpstreamArtifacts[0].sha256, "sha-dev");
  assert.match(prompt.upstreamContext.inheritanceRequirements.join(" "), /at least 95% net source wording/);
});

test("line editing QA allows safe expansion above the old output/source upper bound", () => {
  const sourceText = [
    "Chapter One",
    "",
    "This paragraph keeps the author's voice, structure, and meaning intact while giving the runtime enough source language to measure.",
    "",
    "The second paragraph preserves sequence and cadence so a small clarifying addition can be evaluated without changing the work."
  ].join("\n");
  const editedText = [
    "Chapter One",
    "",
    "This paragraph keeps the author's voice, structure, and meaning intact while giving the runtime enough source language to measure safely.",
    "",
    "The second paragraph preserves sequence and cadence so a small clarifying addition can be evaluated without changing the work."
  ].join("\n");
  const qa = buildLineEditingQa({
    sourceText,
    editedText,
    modelInvocation: {
      provider: "microsoft-foundry-claude",
      routeAlias: "jm1-editorial-devline-primary",
      promptVersion: "CC010-LINE_EDITING-V1",
      fellBack: false,
      output: {
        editedManuscript: editedText,
        changeLedger: ["Added one clarifying word."]
      }
    },
    correlationId: "safe-expansion-test"
  });
  assert.equal(qa.measuredRetentionPercent > 100, true);
  assert.equal(qa.retentionPercent, 100);
  assert.equal(qa.ok, true);
  assert.equal(qa.violations.includes("LINE_RETENTION_OUTSIDE_95_TO_100_PERCENT_WINDOW"), false);
});

test("missing source artifact becomes an exact stage-specific blocker", () => {
  assert.equal(buildExactBlocker("EDITORIAL_REVIEW", null), "EDITORIAL_REVIEW_BLOCKED — SOURCE_ARTIFACT_MISSING");
  assert.equal(buildExactBlocker("DEVELOPMENTAL_EDITING", null), "DEVELOPMENTAL_EDITING_BLOCKED — SOURCE_ARTIFACT_MISSING");
});

test("graph failures are classified without the generic Graph blocker", () => {
  assert.equal(classifyGraphFailure({ status: 403, graphCode: "accessDenied", path: "drives/drive/items/item/content" }), "GRAPH_SITE_ACCESS_DENIED");
  assert.equal(classifyGraphFailure({ status: 404, graphCode: "itemNotFound", path: "drives/drive/items/item/content" }), "GRAPH_ITEM_NOT_FOUND");
  assert.equal(classifyGraphFailure({ status: 429, graphCode: "tooManyRequests", path: "drives/drive/items/item/content" }), "GRAPH_THROTTLED");
  assert.equal(classifyGraphFailure({ status: 401, graphCode: "InvalidAuthenticationToken", path: "drives/drive/items/item" }), "GRAPH_TOKEN_SCOPE_INSUFFICIENT");
});

test("runtime claims active tasks and records exact blockers instead of generic runtime holds", async () => {
  const logs = [];
  const patches = [];
  const client = {
    async list(entitySet, query) {
      if (entitySet === "jm1_executionlogs") return [];
      if (entitySet === "jm1pub_editorialartifacts") return [];
      throw new Error(`Unexpected list ${entitySet} ${JSON.stringify(query)}`);
    },
    async create(entitySet, payload) {
      assert.equal(entitySet, "jm1_executionlogs");
      logs.push(payload);
      return `log-${logs.length}`;
    },
    async patch(entitySet, id, payload) {
      patches.push({ entitySet, id, payload });
    }
  };
  const result = await runEditorialExecutionRuntime(
    { correlationId: "test-correlation", maxTasks: 1 },
    {
      client,
      stages: [
        {
          jm1pub_editorialstageid: "stage-1",
          jm1pub_name: "Editorial Review - Test",
          jm1pub_stagetype: 100000000,
          jm1pub_stagestatus: 100000001,
          _jm1pub_titleid_value: "title-1"
        }
      ]
    }
  );

  assert.equal(result.ok, true);
  assert.equal(result.results[0].status, "EXCEPTION");
  assert.equal(result.results[0].exactBlocker, "EDITORIAL_REVIEW_BLOCKED — SOURCE_ARTIFACT_MISSING");
  assert.equal(logs.some((log) => log.jm1_actiontype === "ACTIVE_EDITORIAL_TASK_CLAIMED"), true);
  assert.equal(logs.some((log) => log.jm1_actiontype === "ACTIVE_EDITORIAL_OUTPUT_BLOCKED"), true);
  assert.equal(patches[0].payload.jm1pub_internaloperationalsummary.includes("SOURCE_ARTIFACT_MISSING"), true);
});

test("source selection ignores generated runtime output artifacts", async () => {
  const client = {
    async list(entitySet) {
      assert.equal(entitySet, "jm1pub_editorialartifacts");
      return [
        {
          jm1pub_editorialartifactid: "qa-output",
          jm1pub_editorialartifactname: "Editorial Review QA Evidence - The Long Watch",
          jm1pub_filename: "2026-07-20-The-Long-Watch-Editorial-Review-QA-Evidence.md",
          jm1pub_repositoryitemid: "output-item",
          jm1pub_iscurrentapproved: false
        },
        {
          jm1pub_editorialartifactid: "source-manuscript",
          jm1pub_editorialartifactname: "Governed Source Manuscript - The Long Watch",
          jm1pub_filename: "The Long Watch.docx",
          jm1pub_repositoryitemid: "source-item",
          jm1pub_iscurrentapproved: true
        }
      ];
    }
  };
  const selected = await findSourceArtifact(client, {
    jm1pub_editorialstageid: "stage-1",
    _jm1pub_titleid_value: "title-1"
  });
  assert.equal(selected.jm1pub_editorialartifactid, "source-manuscript");
});

test("runtime materializes outputs by updating existing artifact records", async () => {
  const created = [];
  const patched = [];
  const logs = [];
  const sourceBuffer = Buffer.from("Chapter One\n\nThis paragraph has enough manuscript text to be extracted and analyzed for editorial runtime output.");
  const sourceSha = require("node:crypto").createHash("sha256").update(sourceBuffer).digest("hex");
  graphRequest.override = async (path, options = {}) => {
    if (path.endsWith("/content") && !options.method) return sourceBuffer;
    if (path.includes("?$select=id,name,parentReference,size,webUrl") || path.includes("?$select=id,parentReference")) {
      return { id: "source-item", parentReference: { id: "parent-folder" }, webUrl: "https://sharepoint/source.docx" };
    }
    if (options.method === "PUT") {
      return { id: `uploaded-${created.length + patched.length + 1}`, name: decodeURIComponent(path.split(":/").at(-2) || "output.md"), size: 120, webUrl: "https://sharepoint/output.md" };
    }
    throw new Error(`Unexpected graph path ${path}`);
  };
  extractSourceText.override = async () => ({ value: sourceBuffer.toString("utf8") });
  invokeStageModelProvider.override = async () => ({
    ok: true,
    provider: "microsoft-foundry-claude",
    routeAlias: "prompt-route",
    promptVersion: "CC010-EDITORIAL_REVIEW-V1"
  });
  const client = {
    async list(entitySet, query) {
      if (entitySet === "jm1_executionlogs") return [];
      if (entitySet === "jm1pub_editorialartifacts" && query.$filter.includes("jm1pub_editorialartifactname eq")) {
        return [{ jm1pub_editorialartifactid: "existing-artifact" }];
      }
      if (entitySet === "jm1pub_editorialartifacts") {
        return [
          {
            jm1pub_editorialartifactid: "source-artifact",
            jm1pub_editorialartifactname: "Governed Source Manuscript - Test",
            jm1pub_filename: "source.docx",
            jm1pub_repositorydriveid: "drive",
            jm1pub_repositoryitemid: "item",
            jm1pub_sha256: sourceSha,
            jm1pub_iscurrentapproved: true
          }
        ];
      }
      return [];
    },
    async create(entitySet, payload) {
      if (entitySet === "jm1_executionlogs") {
        logs.push(payload);
        return `log-${logs.length}`;
      }
      created.push({ entitySet, payload });
      return `created-${created.length}`;
    },
    async patch(entitySet, id, payload) {
      patched.push({ entitySet, id, payload });
    }
  };
  try {
    const result = await runEditorialExecutionRuntime(
      { correlationId: "materialize-test", maxTasks: 1 },
      {
        client,
        stages: [
          {
            jm1pub_editorialstageid: "stage-1",
            jm1pub_name: "Editorial Review - Test",
            jm1pub_stagetype: 100000000,
            jm1pub_stagestatus: 100000001,
            _jm1pub_titleid_value: "title-1",
            _jm1pub_publishingassetid_value: "asset-1"
          }
        ]
      }
    );
    assert.equal(result.results[0].status, "VALIDATING");
    assert.equal(created.length, 1);
    assert.equal(created[0].entitySet, "jm1pub_editorialapprovalgates");
    assert.equal(patched.some((item) => item.entitySet === "jm1pub_editorialartifacts" && item.id === "existing-artifact"), true);
    assert.equal(logs.some((log) => log.jm1_actiontype === "ACTIVE_EDITORIAL_OUTPUT_CREATED"), true);
    assert.equal(logs.some((log) => log.jm1_actiontype === "PACKAGE_MANIFEST_CREATED"), true);
    assert.equal(logs.some((log) => log.jm1_actiontype === "PACKAGE_QA_COMPLETED"), true);
    assert.equal(logs.some((log) => log.jm1_actiontype === "PACKAGE_QA_FAILED"), false);
    assert.equal(
      logs.some((log) =>
        log.jm1_actiontype === "PACKAGE_CADENCE_SCHEDULED" &&
        log.jm1_actiondescription.includes("Editorial Review author release held")
      ),
      true
    );
  } finally {
    graphRequest.override = null;
    extractSourceText.override = null;
    invokeStageModelProvider.override = null;
  }
});

test("developmental editing materializes a package-grade manuscript docx artifact", async () => {
  const created = [];
  const patched = [];
  const logs = [];
  const sourceText = [
    "Chapter One",
    "",
    "This governed source paragraph is long enough to exercise developmental revision output while preserving the author's original wording for reviewable editorial work."
  ].join("\n");
  const sourceBuffer = Buffer.from(sourceText);
  const sourceSha = require("node:crypto").createHash("sha256").update(sourceBuffer).digest("hex");
  graphRequest.override = async (path, options = {}) => {
    if (path.endsWith("/content") && !options.method) return sourceBuffer;
    if (path.includes("?$select=id,name,parentReference,size,webUrl") || path.includes("?$select=id,parentReference")) {
      return { id: "source-item", parentReference: { id: "parent-folder" }, webUrl: "https://sharepoint/source.docx" };
    }
    if (options.method === "PUT") {
      return {
        id: `uploaded-${created.length + patched.length + 1}`,
        name: decodeURIComponent(path.split(":/").at(-2) || "output.docx"),
        size: Buffer.isBuffer(options.body) ? options.body.length : 120,
        webUrl: "https://sharepoint/output"
      };
    }
    throw new Error(`Unexpected graph path ${path}`);
  };
  extractSourceText.override = async () => ({ value: sourceText });
  invokeStageModelProvider.override = async () => ({
    ok: true,
    provider: "microsoft-foundry-claude",
    routeAlias: "prompt-route",
    promptVersion: "CC010-DEVELOPMENTAL_EDITING-V1"
  });
  const client = {
    async list(entitySet, query = {}) {
      if (entitySet === "jm1_executionlogs") return [];
      if (entitySet === "jm1pub_editorialstages") {
        return [{ jm1pub_editorialstageid: "stage-editorial", jm1pub_stagetype: 100000000 }];
      }
      if (
        entitySet === "jm1pub_editorialartifacts" &&
        query.$filter?.includes("_jm1pub_editorialstageid_value eq stage-editorial")
      ) {
        return [{ jm1pub_editorialartifactid: "artifact-editorial", jm1pub_sha256: "sha-editorial", jm1pub_iscurrentapproved: true }];
      }
      if (entitySet === "jm1pub_editorialapprovalgates" && query.$filter?.includes("_jm1pub_editorialstageid_value eq stage-editorial")) {
        return [
          {
            jm1pub_editorialapprovalgateid: "gate-editorial",
            jm1pub_gatestatus: 196650003,
            jm1pub_authordecision: 196650000,
            jm1pub_authordecisionon: "2026-08-14T00:00:00Z",
            jm1pub_nextstageauthorized: true,
            _jm1pub_deliverableartifactid_value: "artifact-editorial"
          }
        ];
      }
      if (entitySet === "jm1pub_editorialapprovalgates") return [];
      if (entitySet === "jm1pub_editorialartifacts" && query.$filter?.includes("jm1pub_editorialartifactname eq")) return [];
      if (entitySet === "jm1pub_editorialartifacts") {
        return [
          {
            jm1pub_editorialartifactid: "source-artifact",
            jm1pub_editorialartifactname: "Governed Source Manuscript - Test",
            jm1pub_filename: "source.docx",
            jm1pub_repositorydriveid: "drive",
            jm1pub_repositoryitemid: "item",
            jm1pub_sha256: sourceSha,
            jm1pub_iscurrentapproved: true
          }
        ];
      }
      return [];
    },
    async create(entitySet, payload) {
      if (entitySet === "jm1_executionlogs") {
        logs.push(payload);
        return `log-${logs.length}`;
      }
      created.push({ entitySet, payload });
      return `created-${created.length}`;
    },
    async patch(entitySet, id, payload) {
      patched.push({ entitySet, id, payload });
    }
  };
  try {
    const result = await runEditorialExecutionRuntime(
      { correlationId: "developmental-docx-test", maxTasks: 1 },
      {
        client,
        stages: [
          {
            jm1pub_editorialstageid: "stage-dev",
            jm1pub_name: "Developmental Editing - Test",
            jm1pub_stagetype: 100000001,
            jm1pub_stagestatus: 100000001,
            _jm1pub_titleid_value: "title-1",
            _jm1pub_publishingassetid_value: "asset-1"
          }
        ]
      }
    );
    assert.equal(result.results[0].status, "VALIDATING");
    const manuscript = created.find((item) =>
      item.entitySet === "jm1pub_editorialartifacts" &&
      item.payload.jm1pub_editorialartifactname.startsWith("Developmentally Edited Manuscript")
    );
    const memo = created.find((item) =>
      item.entitySet === "jm1pub_editorialartifacts" &&
      item.payload.jm1pub_editorialartifactname.startsWith("Developmental Memo")
    );
    const instructions = created.find((item) =>
      item.entitySet === "jm1pub_editorialartifacts" &&
      item.payload.jm1pub_editorialartifactname.startsWith("Developmental Review Instructions")
    );
    const manifest = created.find((item) =>
      item.entitySet === "jm1pub_editorialartifacts" &&
      item.payload.jm1pub_editorialartifactname.startsWith("Package Manifest")
    );
    assert.ok(manuscript);
    assert.equal(manuscript.payload.jm1pub_fileextension, "docx");
    assert.ok(memo);
    assert.equal(memo.payload.jm1pub_fileextension, "docx");
    assert.ok(instructions);
    assert.equal(instructions.payload.jm1pub_fileextension, "txt");
    assert.ok(manifest);
    assert.equal(manifest.payload.jm1pub_fileextension, "json");
    assert.ok(manuscript.payload.jm1pub_sha256);
    assert.equal(logs.some((log) => log.jm1_actiontype === "EDITORIAL_SOURCE_VALIDATED"), true);
    assert.equal(logs.some((log) => log.jm1_actiontype === "ACTIVE_EDITORIAL_OUTPUT_CREATED"), true);
    assert.equal(logs.some((log) => log.jm1_actiontype === "PACKAGE_MANIFEST_CREATED"), true);
    assert.equal(logs.some((log) => log.jm1_actiontype === "PACKAGE_QA_COMPLETED"), true);
    assert.equal(logs.some((log) => log.jm1_actiontype === "AUTHOR_REVIEW_GATE_CREATED"), true);
  } finally {
    graphRequest.override = null;
    extractSourceText.override = null;
    invokeStageModelProvider.override = null;
  }
});

test("line editing materializes model-supplied edited manuscript and opens author gate", async () => {
  const created = [];
  const patched = [];
  const logs = [];
  const uploadedBodies = new Map();
  const sourceText = "This sentence reads clearly today.\n\nThis paragraph keeps rhythm intact.";
  const editedText = "This sentence reads more clearly.\n\nThis paragraph keeps rhythm intact.";
  const sourceBuffer = Buffer.from(sourceText);
  const sourceSha = require("node:crypto").createHash("sha256").update(sourceBuffer).digest("hex");
  let capturedUpstreamContext = null;
  graphRequest.override = async (path, options = {}) => {
    if (path.endsWith("/content") && !options.method) return sourceBuffer;
    if (path.includes("?$select=id,name,parentReference,size,webUrl") || path.includes("?$select=id,parentReference")) {
      return { id: "source-item", parentReference: { id: "parent-folder" }, webUrl: "https://sharepoint/source.docx" };
    }
    if (options.method === "PUT") {
      const name = decodeURIComponent(path.split(":/").at(-2) || "output");
      uploadedBodies.set(name, options.body);
      return {
        id: `uploaded-${uploadedBodies.size}`,
        name,
        size: Buffer.isBuffer(options.body) ? options.body.length : Buffer.byteLength(String(options.body || "")),
        webUrl: "https://sharepoint/output"
      };
    }
    throw new Error(`Unexpected graph path ${path}`);
  };
  extractSourceText.override = async () => ({ value: sourceText });
  invokeStageModelProvider.override = async (_stage, _stageCode, _sourceArtifact, _extractedText, _correlationId, upstreamContext) => {
    capturedUpstreamContext = upstreamContext;
    return {
      ok: true,
      provider: "microsoft-foundry-claude",
      routeAlias: "jm1-editorial-devline-primary",
      promptVersion: "CC010-LINE_EDITING-V1",
      fellBack: false,
      output: {
        editedManuscript: editedText,
        lineEditingSummary: "Improved sentence clarity while preserving voice.",
        changeLedger: ["Smoothed one sentence for clarity without changing meaning."],
        retentionNotes: "Full manuscript retained.",
        authorQueries: []
      }
    };
  };
  const client = {
    async list(entitySet, query = {}) {
      if (entitySet === "jm1_executionlogs") return [];
      if (entitySet === "jm1pub_editorialstages") {
        return [{ jm1pub_editorialstageid: "stage-dev", jm1pub_stagetype: 100000001 }];
      }
      if (
        entitySet === "jm1pub_editorialartifacts" &&
        query.$filter?.includes("_jm1pub_editorialstageid_value eq stage-dev")
      ) {
        return [{ jm1pub_editorialartifactid: "artifact-dev", jm1pub_sha256: "sha-dev", jm1pub_iscurrentapproved: true }];
      }
      if (entitySet === "jm1pub_editorialapprovalgates" && query.$filter?.includes("_jm1pub_editorialstageid_value eq stage-dev")) {
        return [
          {
            jm1pub_editorialapprovalgateid: "gate-dev",
            jm1pub_gatestatus: 196650003,
            jm1pub_authordecision: 196650000,
            jm1pub_authordecisionon: "2026-08-19T01:28:44Z",
            jm1pub_nextstageauthorized: true,
            _jm1pub_deliverableartifactid_value: "artifact-dev"
          }
        ];
      }
      if (entitySet === "jm1pub_editorialapprovalgates") return [];
      if (entitySet === "jm1pub_editorialartifacts" && query.$filter?.includes("jm1pub_editorialartifactname eq")) return [];
      if (entitySet === "jm1pub_editorialartifacts") {
        return [
          {
            jm1pub_editorialartifactid: "source-artifact",
            jm1pub_editorialartifactname: "Approved Developmental Artifact - Test",
            jm1pub_filename: "developmental-approved.docx",
            jm1pub_repositorydriveid: "drive",
            jm1pub_repositoryitemid: "item",
            jm1pub_sha256: sourceSha,
            jm1pub_iscurrentapproved: true
          }
        ];
      }
      return [];
    },
    async create(entitySet, payload) {
      if (entitySet === "jm1_executionlogs") {
        logs.push(payload);
        return `log-${logs.length}`;
      }
      created.push({ entitySet, payload });
      return `created-${created.length}`;
    },
    async patch(entitySet, id, payload) {
      patched.push({ entitySet, id, payload });
    }
  };
  try {
    const result = await runEditorialExecutionRuntime(
      { correlationId: "line-model-output-test", maxTasks: 1 },
      {
        client,
        stages: [
          {
            jm1pub_editorialstageid: "stage-line",
            jm1pub_name: "Line Editing - Test",
            jm1pub_stagetype: 100000002,
            jm1pub_stagestatus: 100000001,
            _jm1pub_titleid_value: "title-1",
            _jm1pub_publishingassetid_value: "asset-1"
          }
        ]
      }
    );
    assert.equal(result.results[0].status, "VALIDATING");
    const manuscript = created.find((item) =>
      item.entitySet === "jm1pub_editorialartifacts" &&
      item.payload.jm1pub_editorialartifactname.startsWith("Edited Manuscript")
    );
    const qaEvidence = created.find((item) =>
      item.entitySet === "jm1pub_editorialartifacts" &&
      item.payload.jm1pub_editorialartifactname.startsWith("QA Evidence")
    );
    assert.ok(manuscript);
    assert.equal(manuscript.payload.jm1pub_fileextension, "docx");
    assert.match(manuscript.payload.jm1pub_notes, /actual model output/);
    assert.ok(qaEvidence);
    const docText = await mammoth.extractRawText({ buffer: uploadedBodies.get(manuscript.payload.jm1pub_filename) });
    assert.match(docText.value, /This sentence reads more clearly/);
    assert.doesNotMatch(docText.value, /Developmental Editing Output/);
    const qaBody = uploadedBodies.get(qaEvidence.payload.jm1pub_filename).toString("utf8");
    assert.match(qaBody, /Retention \/ Drift QA/);
    assert.match(qaBody, /Model provider: microsoft-foundry-claude/);
    assert.match(qaBody, /Model fallback: NO/);
    assert.equal(capturedUpstreamContext.approvedArtifactId, "artifact-dev");
    assert.equal(capturedUpstreamContext.gates[0]._jm1pub_deliverableartifactid_value, "artifact-dev");
    assert.equal(logs.some((log) => log.jm1_actiontype === "AUTHOR_REVIEW_GATE_CREATED"), true);
    assert.equal(logs.some((log) => log.jm1_actiondescription?.includes("Copyediting is not authorized")), true);
  } finally {
    graphRequest.override = null;
    extractSourceText.override = null;
    invokeStageModelProvider.override = null;
  }
});

test("line editing fails closed when governed model output lacks edited manuscript text", async () => {
  const logs = [];
  const patches = [];
  const sourceText = "This sentence reads clearly today.\n\nThis paragraph keeps rhythm intact.";
  const sourceBuffer = Buffer.from(sourceText);
  const sourceSha = require("node:crypto").createHash("sha256").update(sourceBuffer).digest("hex");
  graphRequest.override = async (path, options = {}) => {
    assert.notEqual(options.method, "PUT");
    if (path.endsWith("/content") && !options.method) return sourceBuffer;
    if (path.includes("?$select=id,name,parentReference,size,webUrl") || path.includes("?$select=id,parentReference")) {
      return { id: "source-item", parentReference: { id: "parent-folder" }, webUrl: "https://sharepoint/source.docx" };
    }
    throw new Error(`Unexpected graph path ${path}`);
  };
  extractSourceText.override = async () => ({ value: sourceText });
  invokeStageModelProvider.override = async () => ({
    ok: true,
    provider: "microsoft-foundry-claude",
    routeAlias: "jm1-editorial-devline-primary",
    promptVersion: "CC010-LINE_EDITING-V1",
    fellBack: false,
    output: {
      lineEditingSummary: "Summary without manuscript must fail."
    }
  });
  const client = {
    async list(entitySet, query = {}) {
      if (entitySet === "jm1_executionlogs") return [];
      if (entitySet === "jm1pub_editorialstages") {
        return [{ jm1pub_editorialstageid: "stage-dev", jm1pub_stagetype: 100000001 }];
      }
      if (
        entitySet === "jm1pub_editorialartifacts" &&
        query.$filter?.includes("_jm1pub_editorialstageid_value eq stage-dev")
      ) {
        return [{ jm1pub_editorialartifactid: "artifact-dev", jm1pub_sha256: "sha-dev", jm1pub_iscurrentapproved: true }];
      }
      if (entitySet === "jm1pub_editorialapprovalgates" && query.$filter?.includes("_jm1pub_editorialstageid_value eq stage-dev")) {
        return [
          {
            jm1pub_editorialapprovalgateid: "gate-dev",
            jm1pub_gatestatus: 196650003,
            jm1pub_authordecision: 196650000,
            jm1pub_authordecisionon: "2026-08-19T01:28:44Z",
            jm1pub_nextstageauthorized: true,
            _jm1pub_deliverableartifactid_value: "artifact-dev"
          }
        ];
      }
      if (entitySet === "jm1pub_editorialartifacts") {
        return [
          {
            jm1pub_editorialartifactid: "source-artifact",
            jm1pub_editorialartifactname: "Approved Developmental Artifact - Test",
            jm1pub_filename: "developmental-approved.docx",
            jm1pub_repositorydriveid: "drive",
            jm1pub_repositoryitemid: "item",
            jm1pub_sha256: sourceSha,
            jm1pub_iscurrentapproved: true
          }
        ];
      }
      return [];
    },
    async create(entitySet, payload) {
      assert.equal(entitySet, "jm1_executionlogs");
      logs.push(payload);
      return `log-${logs.length}`;
    },
    async patch(entitySet, id, payload) {
      patches.push({ entitySet, id, payload });
    }
  };
  try {
    const result = await runEditorialExecutionRuntime(
      { correlationId: "line-missing-output-test", maxTasks: 1 },
      {
        client,
        stages: [
          {
            jm1pub_editorialstageid: "stage-line",
            jm1pub_name: "Line Editing - Test",
            jm1pub_stagetype: 100000002,
            jm1pub_stagestatus: 100000001,
            _jm1pub_titleid_value: "title-1",
            _jm1pub_publishingassetid_value: "asset-1"
          }
        ]
      }
    );
    assert.equal(result.results[0].status, "EXCEPTION");
    assert.match(result.results[0].exactBlocker, /LINE_EDITED_MANUSCRIPT_MISSING/);
    assert.equal(logs.some((log) => log.jm1_actiontype === "ACTIVE_EDITORIAL_OUTPUT_CREATED"), false);
    assert.equal(logs.some((log) => log.jm1_actiontype === "LINE_REJECTED_OUTPUT_QA_DIAGNOSTICS"), true);
    assert.equal(patches.some((patch) => /LINE_EDITED_MANUSCRIPT_MISSING/.test(patch.payload.jm1pub_internaloperationalsummary)), true);
  } finally {
    graphRequest.override = null;
    extractSourceText.override = null;
    invokeStageModelProvider.override = null;
  }
});

test("line editing rejected drift logs diagnostics without artifacts or author gate", async () => {
  const created = [];
  const logs = [];
  const patches = [];
  const sourceText = [
    "Chapter One",
    "",
    "This paragraph keeps rhythm, author voice, story sequence, and the actual source language intact for line editing.",
    "",
    "This second paragraph provides enough manuscript language for the validator to reject substantive invention."
  ].join("\n");
  const sourceBuffer = Buffer.from(sourceText);
  const sourceSha = require("node:crypto").createHash("sha256").update(sourceBuffer).digest("hex");
  graphRequest.override = async (path, options = {}) => {
    assert.notEqual(options.method, "PUT");
    if (path.endsWith("/content") && !options.method) return sourceBuffer;
    if (path.includes("?$select=id,name,parentReference,size,webUrl") || path.includes("?$select=id,parentReference")) {
      return { id: "source-item", parentReference: { id: "parent-folder" }, webUrl: "https://sharepoint/source.docx" };
    }
    throw new Error(`Unexpected graph path ${path}`);
  };
  extractSourceText.override = async () => ({ value: sourceText });
  invokeStageModelProvider.override = async () => ({
    ok: true,
    provider: "microsoft-foundry-claude",
    routeAlias: "jm1-editorial-devline-primary",
    promptVersion: "CC010-LINE_EDITING-V1",
    fellBack: false,
    output: {
      editedManuscript: `${sourceText}\n\nThis new chapter invents an additional argument outside the source manuscript.`,
      lineEditingSummary: "Added material outside line-editing scope.",
      changeLedger: ["Invented new material."],
      authorQueries: []
    }
  });
  const client = {
    async list(entitySet, query = {}) {
      if (entitySet === "jm1_executionlogs") return [];
      if (entitySet === "jm1pub_editorialstages") {
        return [{ jm1pub_editorialstageid: "stage-dev", jm1pub_stagetype: 100000001 }];
      }
      if (
        entitySet === "jm1pub_editorialartifacts" &&
        query.$filter?.includes("_jm1pub_editorialstageid_value eq stage-dev")
      ) {
        return [{ jm1pub_editorialartifactid: "artifact-dev", jm1pub_sha256: "sha-dev", jm1pub_iscurrentapproved: true }];
      }
      if (entitySet === "jm1pub_editorialapprovalgates" && query.$filter?.includes("_jm1pub_editorialstageid_value eq stage-dev")) {
        return [
          {
            jm1pub_editorialapprovalgateid: "gate-dev",
            jm1pub_gatestatus: 196650003,
            jm1pub_authordecision: 196650000,
            jm1pub_authordecisionon: "2026-08-19T01:28:44Z",
            jm1pub_nextstageauthorized: true,
            _jm1pub_deliverableartifactid_value: "artifact-dev"
          }
        ];
      }
      if (entitySet === "jm1pub_editorialartifacts") {
        return [
          {
            jm1pub_editorialartifactid: "source-artifact",
            jm1pub_editorialartifactname: "Approved Developmental Artifact - Test",
            jm1pub_filename: "developmental-approved.docx",
            jm1pub_repositorydriveid: "drive",
            jm1pub_repositoryitemid: "item",
            jm1pub_sha256: sourceSha,
            jm1pub_iscurrentapproved: true
          }
        ];
      }
      if (entitySet === "jm1pub_editorialapprovalgates") return [];
      return [];
    },
    async create(entitySet, payload) {
      if (entitySet === "jm1_executionlogs") {
        logs.push(payload);
        return `log-${logs.length}`;
      }
      created.push({ entitySet, payload });
      return `created-${created.length}`;
    },
    async patch(entitySet, id, payload) {
      patches.push({ entitySet, id, payload });
    }
  };
  try {
    const result = await runEditorialExecutionRuntime(
      { correlationId: "line-rejected-drift-test", maxTasks: 1 },
      {
        client,
        stages: [
          {
            jm1pub_editorialstageid: "stage-line",
            jm1pub_name: "Line Editing - Test",
            jm1pub_stagetype: 100000002,
            jm1pub_stagestatus: 100000001,
            _jm1pub_titleid_value: "title-1",
            _jm1pub_publishingassetid_value: "asset-1"
          }
        ]
      }
    );
    assert.equal(result.results[0].status, "EXCEPTION");
    assert.match(result.results[0].exactBlocker, /LINE_SUBSTANTIVE_INVENTION_RISK/);
    assert.equal(created.length, 0);
    assert.equal(logs.some((log) => log.jm1_actiontype === "LINE_REJECTED_OUTPUT_QA_DIAGNOSTICS"), true);
    assert.equal(logs.some((log) => log.jm1_actiontype === "AUTHOR_REVIEW_GATE_CREATED"), false);
    assert.equal(logs.some((log) => log.jm1_actiontype === "ACTIVE_EDITORIAL_OUTPUT_CREATED"), false);
    assert.equal(patches.some((patch) => /LINE_SUBSTANTIVE_INVENTION_RISK/.test(patch.payload.jm1pub_internaloperationalsummary)), true);
  } finally {
    graphRequest.override = null;
    extractSourceText.override = null;
    invokeStageModelProvider.override = null;
  }
});

test("idempotent replay opens missing author gate for already recorded output without regenerating artifacts", async () => {
  const created = [];
  const logs = [];
  const client = {
    async list(entitySet, query = {}) {
      if (entitySet === "jm1_executionlogs" && query.$filter?.includes("ACTIVE_EDITORIAL_OUTPUT_CREATED")) {
        return [{ jm1_executionlogid: "existing-output-log" }];
      }
      if (entitySet === "jm1_executionlogs") return [];
      if (entitySet === "jm1pub_editorialapprovalgates") return [];
      if (entitySet === "jm1pub_editorialartifacts" && query.$filter?.includes("_jm1pub_editorialstageid_value eq stage-editorial")) {
        return [
          {
            jm1pub_editorialartifactid: "source-artifact",
            jm1pub_editorialartifactname: "Governed Source Manuscript - Test",
            jm1pub_filename: "source.docx",
            jm1pub_repositorydriveid: "drive",
            jm1pub_repositoryitemid: "item",
            jm1pub_sha256: "sha-source",
            jm1pub_iscurrentapproved: true
          },
          {
            jm1pub_editorialartifactid: "assessment-artifact",
            jm1pub_editorialartifactname: "Editorial Assessment - Editorial Review - Test",
            jm1pub_filename: "assessment.md",
            jm1pub_fileextension: "md",
            jm1pub_repositoryitemid: "assessment-item",
            jm1pub_sha256: "sha-assessment",
            jm1pub_iscurrentapproved: true
          }
        ];
      }
      if (entitySet === "jm1pub_editorialartifacts") {
        return [
          {
            jm1pub_editorialartifactid: "source-artifact",
            jm1pub_editorialartifactname: "Governed Source Manuscript - Test",
            jm1pub_filename: "source.docx",
            jm1pub_repositorydriveid: "drive",
            jm1pub_repositoryitemid: "item",
            jm1pub_sha256: "sha-source",
            jm1pub_iscurrentapproved: true
          }
        ];
      }
      return [];
    },
    async create(entitySet, payload) {
      if (entitySet === "jm1_executionlogs") {
        logs.push(payload);
        return `log-${logs.length}`;
      }
      created.push({ entitySet, payload });
      return "gate-created";
    },
    async patch() {
      throw new Error("idempotent replay must not patch artifacts or stages");
    }
  };
  const result = await runEditorialExecutionRuntime(
    { correlationId: "idempotent-gate-test", maxTasks: 1 },
    {
      client,
      stages: [
        {
          jm1pub_editorialstageid: "stage-editorial",
          jm1pub_name: "Editorial Review - Test",
          jm1pub_stagetype: 100000000,
          jm1pub_stagestatus: 100000001,
          _jm1pub_titleid_value: "title-1",
          _jm1pub_publishingassetid_value: "asset-1"
        }
      ]
    }
  );
  assert.equal(result.results[0].status, "OUTPUT_ALREADY_RECORDED");
  assert.equal(result.results[0].authorGate.gateId, "gate-created");
  assert.equal(created.length, 1);
  assert.equal(created[0].entitySet, "jm1pub_editorialapprovalgates");
  assert.equal(created[0].payload.jm1pub_gatecode, 196650000);
  assert.equal(created[0].payload.jm1pub_gatestatus, 196650001);
  assert.equal(created[0].payload["Jm1pub_Deliverableartifactid@odata.bind"], "/jm1pub_editorialartifacts(assessment-artifact)");
  assert.equal(logs.some((log) => log.jm1_actiontype === "AUTHOR_REVIEW_GATE_CREATED"), true);
});

test("runtime preserves existing exact content blocker instead of replacing it with generic missing-source blocker", async () => {
  const logs = [];
  const patches = [];
  const client = {
    async list(entitySet) {
      if (entitySet === "jm1_executionlogs") return [];
      if (entitySet === "jm1pub_editorialartifacts") return [];
      throw new Error(`Unexpected list ${entitySet}`);
    },
    async create(entitySet, payload) {
      assert.equal(entitySet, "jm1_executionlogs");
      logs.push(payload);
      return `log-${logs.length}`;
    },
    async patch(entitySet, id, payload) {
      patches.push({ entitySet, id, payload });
    }
  };
  const result = await runEditorialExecutionRuntime(
    { correlationId: "preserve-blocker-test", maxTasks: 1 },
    {
      client,
      stages: [
        {
          jm1pub_editorialstageid: "stage-blocked",
          jm1pub_name: "Developmental Editing - Establishing Glory",
          jm1pub_stagetype: 100000001,
          jm1pub_stagestatus: 100000001,
          jm1pub_internaloperationalsummary:
            "DEVELOPMENTAL_EDITING_BLOCKED — CANONICAL_COMPILATION_FILE_AMBIGUOUS. Multiple source candidates require publisher confirmation.",
          _jm1pub_titleid_value: "title-1"
        }
      ]
    }
  );

  assert.equal(
    result.results[0].exactBlocker,
    "DEVELOPMENTAL_EDITING_BLOCKED — CANONICAL_COMPILATION_FILE_AMBIGUOUS"
  );
  assert.equal(patches.length, 0);
  assert.equal(logs.some((log) => log.jm1_actiontype === "ACTIVE_EDITORIAL_OUTPUT_BLOCKED"), false);
});
