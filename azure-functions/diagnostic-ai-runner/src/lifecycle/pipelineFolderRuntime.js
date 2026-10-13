"use strict";
const projection = require("./pipelineFolderProjection");
const b = require("./newSubmissionStage03Budget");
function deny(code) { throw Object.assign(new Error(code), { safeCode: code }); }
function enabled(env) { return env.JM1_PIPELINE_FOLDER_PROJECTION_ENABLED === "true"; }
async function readAuthority(titleId, deps) {
  const bundle = await require("./publisherFundedStage04").load(titleId, deps);
  const response = (await b.read(deps.containerClient, `${bundle.prefix}/response.json`)).value;
  const reference = `publisher-funded/stage05/${titleId}/${bundle.offer.offerSha256}/signature-request.json`;
  const request = (await b.read(deps.containerClient, reference)).value;
  if (response.titleId !== titleId || response.offerSha256 !== bundle.offer.offerSha256 || response.decision !== "ACCEPT" ||
      response.status !== "AUTHOR_ELECTION_CAPTURED" || request.titleId !== titleId ||
      request.offerSha256 !== bundle.offer.offerSha256 || request.authorElectionReference !== response.sourceReference ||
      request.authorPaymentDisposition !== "NOT_APPLICABLE_PUBLISHER_FUNDED" || request.authorDueCents !== 0 ||
      request.paymentCreated !== false) deny("PIPELINE_OWNER_AUTHORITY_CONFLICT");
  const replacementPrefix = `publisher-funded/stage05/${titleId}/${bundle.offer.offerSha256}/replacement-v2`;
  const placement = (await b.optional(deps.containerClient, `${projection.PREFIX}/${titleId}/state.json`))?.value;
  const execution = (await b.optional(deps.containerClient, `${replacementPrefix}/execution.json`))?.value;
  if (execution) {
    const prepared = (await b.read(deps.containerClient, `${replacementPrefix}/prepared.json`)).value;
    if (execution.titleId !== titleId || execution.offerSha256 !== bundle.offer.offerSha256 ||
        execution.agreementSha256 !== prepared.agreementSha256 || execution.authorElectionReference !== response.sourceReference ||
        execution.status !== "REPLACEMENT_EXECUTION_VERIFIED" || execution.stage05Complete !== true ||
        execution.authorDueCents !== 0 || execution.authorPaymentDisposition !== "NOT_APPLICABLE_PUBLISHER_FUNDED" ||
        execution.paymentCreated !== false || !execution.proof?.seal?.fullDocumentIntegrity ||
        execution.proof.requiredPartyEvents !== 2) deny("PIPELINE_OWNER_AUTHORITY_CONFLICT");
    // This bounded fresh-submission owner enters onboarding only. Later canonical
    // lifecycle progression remains owned by the established V2 runtime.
    if (Number((deps.projectionEvent?.stageCode || placement?.stageCode || "05").slice(0, 2)) <= 6) {
      return { current: true, titleId, stageCode: "06_ONBOARDING", reference: `${replacementPrefix}/execution.json` };
    }
  }
  // Canonical lifecycle authority, when present, owns later progression. A
  // signature request is only authority for waiting in Stage 05, never Stage 06.
  const later = Number((deps.projectionEvent?.stageCode || placement?.stageCode || "05").slice(0, 2)) > 5;
  const engagements = later ? await deps.authorityClient.list("jmpv2_publishingengagements", {
    $filter: `jmpv2_canonicaltitleid eq '${titleId}'`, $top: "2" }) : [];
  if (engagements.length > 1) deny("PIPELINE_ENGAGEMENT_CONFLICT");
  const engagement = engagements[0];
  if (engagement && Number(String(engagement.jmpv2_currentstage).slice(0, 2)) > 5) {
    if (engagement.jmpv2_correlationid !== bundle.sourceFingerprint) deny("PIPELINE_FRESH_ENGAGEMENT_BINDING_UNPROVEN");
    const life = await deps.authorityClient.first("jmpv2_lifecycleinstances", {
      $filter: `jmpv2_lifecycleinstanceid eq ${engagement.jmpv2_lifecycleinstanceid}` });
    const stages = life && await deps.authorityClient.list("jmpv2_stageinstances", {
      $filter: `jmpv2_stageinstancekey eq '${life.jmpv2_currentstageinstancekey}'`, $top: "2" });
    if (!stages || stages.length !== 1) deny("PIPELINE_CURRENT_STAGE_UNPROVEN");
    const event = { titleId, stageId: stages[0].jmpv2_stageinstanceid, stageCode: engagement.jmpv2_currentstage };
    const proof = await require("./stageRuntimeAuthority").readCanonicalStageAuthority(event, deps.authorityClient);
    if (!proof.current) deny("PIPELINE_CURRENT_STAGE_UNPROVEN");
    return { current: true, titleId, stageCode: proof.stageCode,
      reference: `dataverse:jmpv2_stageinstance:${proof.stageId}` };
  }
  if (later) deny("PIPELINE_CURRENT_STAGE_UNPROVEN");
  if (request.signatureStatus !== "AWAITING_REQUIRED_PARTIES" || request.executionVerified !== false ||
      request.stage05Complete !== false || request.stage06 !== "NOT_STARTED") deny("PIPELINE_CURRENT_STAGE_UNPROVEN");
  return { current: true, titleId, stageCode: "05_AGREEMENT_PAYMENT", reference };
}
function native(deps = {}) {
  const context = require("./freshTitleIntake").nativeDeps({ ...deps, authorityOnly: true });
  const credential = deps.credential || new (require("@azure/identity").ManagedIdentityCredential)();
  context.projectionGraph = deps.projectionGraph || (async (path, options = {}) => {
    const method = options.method || "GET";
    const prefix = projection.path("");
    if (!path.startsWith(prefix) || /[\r\n]/.test(path) || !["GET", "PATCH"].includes(method)) deny("PIPELINE_GRAPH_SCOPE_DENIED");
    if (method === "PATCH") {
      if (!Object.values(projection.FOLDERS).some(id => path === projection.path(id)) || !options.headers?.["If-Match"]) deny("PIPELINE_GRAPH_SCOPE_DENIED");
      const body = JSON.parse(options.body);
      if (Object.keys(body).join() !== "parentReference" || Object.keys(body.parentReference).join() !== "id") deny("PIPELINE_GRAPH_SCOPE_DENIED");
    }
    const token = await credential.getToken("https://graph.microsoft.com/.default");
    const result = await (deps.fetchImpl || fetch)(`https://graph.microsoft.com/v1.0/${path}`, {
      ...options, redirect: "error", signal: AbortSignal.timeout(30000),
      headers: { ...options.headers, Authorization: `Bearer ${token.token}` } });
    if (!result.ok) throw Object.assign(new Error("PIPELINE_DEPENDENCY_FAILED"), { statusCode: result.status });
    return result.json();
  });
  context.readPlacementAuthority = deps.readPlacementAuthority || (titleId => readAuthority(titleId, context));
  context.reconcileReferences = deps.reconcileReferences || ((titleId, receipt) => reconcileReferences(titleId, receipt, context));
  return context;
}
async function reconcileReferences(titleId, receipt, deps) {
  const client = deps.authorityClient, container = deps.containerClient;
  const rows = await client.list("jm1pub_editorialartifacts", {
    $select: "jm1pub_editorialartifactid,jm1pub_repositorydriveid,jm1pub_repositoryitemid,jm1pub_repositorypath,_jm1pub_titleid_value",
    $filter: `_jm1pub_titleid_value eq ${titleId}`, $top: "1000" });
  if (rows.length >= 1000) deny("PIPELINE_REFERENCE_CENSUS_INCOMPLETE");
  const items = new Map(receipt.items.map(x => [x.id, x]));
  const prefix = `${receipt.intentReference.slice(0, -"intent.json".length)}references`;
  for (const row of rows) {
    const item = items.get(row.jm1pub_repositoryitemid);
    if (!item || !row.jm1pub_repositorypath || /\/Doc\.aspx\?sourcedoc=/i.test(row.jm1pub_repositorypath)) continue;
    if (row._jm1pub_titleid_value !== titleId || row.jm1pub_repositorydriveid !== require("./freshTitleIntake").driveId || !item.webUrl) deny("PIPELINE_REFERENCE_BINDING_UNPROVEN");
    const ref = `${prefix}/${row.jm1pub_editorialartifactid}.json`;
    const prior = (await b.optional(container, ref))?.value;
    if (!prior && row.jm1pub_repositorypath === item.webUrl) continue;
    const intent = prior || { titleId, artifactId: row.jm1pub_editorialartifactid, itemId: item.id,
      before: row.jm1pub_repositorypath, after: item.webUrl, recordedAt: new Date().toISOString() };
    if (intent.after !== item.webUrl || intent.itemId !== item.id || ![intent.before, intent.after].includes(row.jm1pub_repositorypath)) deny("PIPELINE_REFERENCE_CONCURRENT_CHANGE");
    await b.immutable(container, ref, intent);
    if (row.jm1pub_repositorypath !== item.webUrl) {
      await client.patchIfMatch("jm1pub_editorialartifacts", row.jm1pub_editorialartifactid, { jm1pub_repositorypath: item.webUrl }, row["@odata.etag"]);
    }
    const after = await client.first("jm1pub_editorialartifacts", { $filter: `jm1pub_editorialartifactid eq ${row.jm1pub_editorialartifactid}` });
    if (after?.jm1pub_repositorypath !== item.webUrl || after.jm1pub_repositoryitemid !== item.id) deny("PIPELINE_REFERENCE_READBACK_FAILED");
  }
}
async function monitor(deps = {}) {
  if (!enabled(deps.env || process.env)) return [];
  const results = [];
  // Rotate one title per existing timer tick. Large historical workspaces are
  // inventoried incrementally, leaving author-response processing independent.
  const ids = Object.keys(projection.FOLDERS);
  const titleIds = [ids[Math.floor(Date.now() / 300000) % ids.length]];
  for (const titleId of titleIds) {
    try { results.push(await projection.reconcile(titleId, native(deps))); }
    catch (error) { results.push({ titleId, status: "FAILED", code: /^PIPELINE_[A-Z_]+$/.test(error.safeCode || "") ? error.safeCode : "PIPELINE_DEPENDENCY_FAILED" }); }
  }
  return results;
}
const MODES = ["PIPELINE_FOLDER_RECONCILE", "PIPELINE_FOLDER_READBACK"];
async function handler(body, deps = {}) {
  if (!MODES.includes(body.mode) || !Object.hasOwn(projection.FOLDERS, body.titleId || "") ||
      Object.keys(body).some(key => !["titleId", "mode"].includes(key))) return { status: 400, jsonBody: { code: "PIPELINE_SCOPE_DENIED" } };
  if (body.mode === "PIPELINE_FOLDER_RECONCILE" && !enabled(deps.env || process.env)) return { status: 403, jsonBody: { code: "PIPELINE_DISABLED" } };
  try {
    const context = native(deps);
    if (body.mode === "PIPELINE_FOLDER_RECONCILE") return { status: 200, jsonBody: await projection.reconcile(body.titleId, context) };
    const authority = await context.readPlacementAuthority(body.titleId);
    const folder = await context.projectionGraph(projection.path(projection.FOLDERS[body.titleId]));
    return { status: 200, jsonBody: { titleId: body.titleId, authority, folderId: folder.id, parentId: folder.parentReference.id,
      webUrl: folder.webUrl, state: (await b.optional(context.containerClient, `${projection.PREFIX}/${body.titleId}/state.json`))?.value || null } };
  } catch (error) { return { status: 409, jsonBody: { code: /^PIPELINE_[A-Z_]+$/.test(error.safeCode || "") ? error.safeCode : "PIPELINE_DEPENDENCY_FAILED" } }; }
}
async function beforeDispatch(event, deps = {}) {
  if (!Object.hasOwn(projection.FOLDERS, event.titleId) || !enabled(deps.env || process.env)) return;
  const context = native({ ...deps, projectionEvent: event });
  const authority = await context.readPlacementAuthority(event.titleId);
  if (authority.stageCode !== event.stageCode) deny("PIPELINE_EVENT_STAGE_CONFLICT");
  const result = await projection.reconcile(event.titleId, context);
  if (result.status !== "ALIGNED") deny("PIPELINE_PLACEMENT_PENDING");
}
module.exports = { enabled, readAuthority, native, monitor, handler, MODES, beforeDispatch, reconcileReferences };
