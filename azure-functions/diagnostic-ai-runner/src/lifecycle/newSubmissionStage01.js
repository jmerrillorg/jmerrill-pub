"use strict";
const { createHash } = require("node:crypto");
const fresh = require("./freshTitleIntake");
const { JACKIE_CANONICAL_AUTHOR_CONTACT_ID: contactId } = require("../author/jackieTitleSystemCommissioningPolicy");
const TABLE = "jm1_publishingintakes";
const MODES = ["SUBMISSION_01_PREFLIGHT", "SUBMISSION_01_EXECUTE", "SUBMISSION_01_READBACK"];
const COLUMNS = "jm1_publishingintakeid,jm1_idempotencykey,jm1_additionalnotes,jm1_manuscripturl,jm1_submissionurl,jm1_intakereferencecode,createdon";
const hash = value => createHash("sha256").update(value).digest("hex");
function deny(code) { throw Object.assign(new Error(code), { safeCode: code }); }
function plan(current) {
  const titleId = current.input.title.jm1pub_titleid;
  const components = current.components.map(p => p.custody).sort((a, b) => a.itemId.localeCompare(b.itemId));
  const binding = { titleId, contactId, components };
  const fingerprint = hash(JSON.stringify(binding));
  const key = `new-submission-01:${fingerprint}`;
  const h = hash(key), intakeId = `${h.slice(0,8)}-${h.slice(8,12)}-5${h.slice(13,16)}-a${h.slice(17,20)}-${h.slice(20,32)}`;
  return { ...binding, fingerprint, key, intakeId, reference: `JMP-INT-202610-${fingerprint.slice(0,16).toUpperCase()}`,
    output: `new-submission-stage01/${titleId}/${fingerprint}/receipt.json` };
}
function parseBinding(row) {
  try { return JSON.parse(row.jm1_additionalnotes || "").newSubmissionStage01; } catch { return null; }
}
function storedBinding(p) {
  const binding = { titleId: p.titleId, contactId, fingerprint: p.fingerprint, components: p.components };
  const serialize = value => JSON.stringify({ newSubmissionStage01: value });
  if (serialize(binding).length <= 1000) return binding;
  // The full source fingerprint and durable receipt retain paths; the intake index retains exact custody identifiers.
  const compact = { ...binding, components: p.components.map(({ path, ...custody }) => custody) };
  if (serialize(compact).length > 1000) deny("COMMISSIONING_SUBMISSION_BINDING_TOO_LARGE");
  return compact;
}
function findExact(rows, p) {
  const matches = [];
  for (const row of rows) {
    const binding = parseBinding(row);
    const structured = binding?.fingerprint === p.fingerprint;
    const key = row.jm1_idempotencykey === p.key || row.jm1_publishingintakeid === p.intakeId;
    const urls = [row.jm1_manuscripturl, row.jm1_submissionurl, row.jm1_additionalnotes].filter(Boolean).join("\n");
    const overlaps = p.components.some(c => urls.includes(c.itemId) || urls.includes(c.sha256));
    if (!structured && !key && !overlaps) continue;
    if (!binding || binding.titleId !== p.titleId || binding.contactId !== contactId ||
        binding.fingerprint !== p.fingerprint || ![p.components, storedBinding(p).components].some(components => JSON.stringify(binding.components) === JSON.stringify(components)) ||
        row.jm1_idempotencykey !== p.key) deny("COMMISSIONING_SUBMISSION_DUPLICATE_AUTHORITY_CONFLICT");
    matches.push(row);
  }
  if (matches.length > 1) deny("COMMISSIONING_SUBMISSION_DUPLICATE_RECORDS");
  return matches[0] || null;
}
async function native(deps) {
  if (deps.request) return deps;
  const env = deps.env || process.env;
  const credential = new (require("@azure/identity").ManagedIdentityCredential)();
  const base = env.DATAVERSE_WEB_API_BASE_URL.replace(/\/$/, "");
  const request = async (path, method = "GET", body) => {
    const url = path.startsWith("https://") ? path : `${base}/${path}`;
    if (!url.startsWith(`${base}/`)) deny("COMMISSIONING_SUBMISSION_PAGINATION_SCOPE_DENIED");
    const token = await credential.getToken(`${env.DATAVERSE_RESOURCE_URL.replace(/\/$/, "")}/.default`);
    const r = await fetch(url, { method, headers: { Authorization: `Bearer ${token.token}`, "Content-Type": "application/json",
      Prefer: "return=representation,odata.maxpagesize=100", "OData-Version": "4.0" },
      ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(30000) });
    const text = await r.text(), data = text ? JSON.parse(text) : {};
    if (!r.ok) throw Object.assign(new Error("COMMISSIONING_SUBMISSION_DATAVERSE_FAILED"), { safeCode: "COMMISSIONING_SUBMISSION_DATAVERSE_FAILED", statusCode: r.status });
    return data;
  };
  const context = fresh.nativeDeps({ ...deps, env, credential, authorityOnly: true });
  const recipientReadback = async (internetMessageId, email) => {
    if (email.toLowerCase() !== "jackie@jmerrill.one") return { value: [], proofUnavailable: "EXTERNAL_RECIPIENT_DELIVERY_TELEMETRY_REQUIRED" };
    const token = await credential.getToken("https://graph.microsoft.com/.default");
    const query = new URLSearchParams({ $filter: `internetMessageId eq '${internetMessageId.replace(/'/g, "''")}'`,
      $select: "id,internetMessageId,receivedDateTime,toRecipients,from,subject", $top: "2" });
    const r = await fetch(`https://graph.microsoft.com/v1.0/users/${encodeURIComponent(email)}/messages?${query}`, {
      headers: { Authorization: `Bearer ${token.token}`, Prefer: 'IdType="ImmutableId"' }, redirect: "error", signal: AbortSignal.timeout(30000) });
    if (!r.ok) throw Object.assign(new Error("COMMISSIONING_SUBMISSION_RECIPIENT_READBACK_FAILED"), { safeCode: "COMMISSIONING_SUBMISSION_RECIPIENT_READBACK_FAILED", statusCode: r.status });
    return r.json();
  };
  return { ...context, request, recipientReadback };
}
async function inventory(deps) {
  let path = `${TABLE}?$select=${COLUMNS}`;
  const rows = [], seen = new Set();
  while (path) {
    if (seen.has(path) || seen.size >= 1000) deny("COMMISSIONING_SUBMISSION_INVENTORY_INCOMPLETE");
    seen.add(path);
    const data = await deps.request(path);
    if (!Array.isArray(data.value)) deny("COMMISSIONING_SUBMISSION_INVENTORY_INVALID");
    rows.push(...data.value); path = data["@odata.nextLink"];
  }
  return { rows, pages: seen.size };
}
async function verifyAccess(deps) {
  const who = await deps.request("WhoAmI()");
  if (who.UserId !== fresh.RUNTIME_OWNER_ID || who.OrganizationId !== "9dafb403-b493-f011-a700-000d3a106f37") deny("COMMISSIONING_SUBMISSION_RUNTIME_IDENTITY_MISMATCH");
  const registry = await deps.request("privileges?$select=name,privilegeid&$filter=contains(name,'publishingintake')");
  if (registry["@odata.nextLink"]) deny("COMMISSIONING_SUBMISSION_PRIVILEGE_REGISTRY_INCOMPLETE");
  const rights = {};
  for (const verb of ["Read", "Create"]) {
    const matches = registry.value.filter(p => p.name.toLowerCase() === `prv${verb}jm1_publishingintake`.toLowerCase());
    if (matches.length !== 1) deny("COMMISSIONING_SUBMISSION_PRIVILEGE_UNRESOLVED");
    const result = await deps.request(`systemusers(${who.UserId})/Microsoft.Dynamics.CRM.RetrieveUserPrivilegeByPrivilegeId(PrivilegeId=${matches[0].privilegeid},ExcludeTeamBasic=false)`);
    const values = result.RolePrivileges;
    if (!Array.isArray(values) || !values.length || values.some(p => p.PrivilegeId !== matches[0].privilegeid)) deny("COMMISSIONING_SUBMISSION_PRIVILEGE_DENIED");
    rights[verb] = values.map(p => p.Depth);
  }
  return { userId: who.UserId, organizationId: who.OrganizationId, rights };
}
function rowFingerprint(row) {
  return hash(JSON.stringify(Object.fromEntries(COLUMNS.split(",").map(key => [key, row[key] ?? null]))));
}
async function verifyCensus(census, access, context) {
  if (access.rights.Read.includes("Global")) return { method: "EFFECTIVE_GLOBAL_READ" };
  const blob = context.containerClient.getBlockBlobClient("new-submission-stage01/census/authorized-current.json");
  const properties = await blob.getProperties();
  const proof = JSON.parse((await blob.downloadToBuffer(0, undefined, { conditions: { ifMatch: properties.etag } })).toString("utf8"));
  const now = Date.now(), at = Date.parse(proof.observedAt), expires = Date.parse(proof.expiresAt);
  if (proof.schemaVersion !== 1 || proof.organizationId !== "9dafb403-b493-f011-a700-000d3a106f37" ||
      proof.runtimeUserId !== access.userId || proof.complete !== true || !Array.isArray(proof.rows) ||
      !Number.isFinite(at) || !Number.isFinite(expires) || now < at || now >= expires || expires-at > 10*60*1000 ||
      new Set(proof.rows.map(r => r.id)).size !== proof.rows.length) deny("COMMISSIONING_SUBMISSION_CENSUS_AUTHORITY_INVALID");
  for (const expected of proof.rows) {
    const rows = census.rows.filter(r => r.jm1_publishingintakeid === expected.id);
    if(rows.length !== 1 || rowFingerprint(rows[0]) !== expected.fingerprint) deny("COMMISSIONING_SUBMISSION_CENSUS_CHANGED");
  }
  // Only exact records created by this five-original path may have appeared since attestation.
  for (const row of census.rows.filter(r => !proof.rows.some(p => p.id === r.jm1_publishingintakeid))) {
    const b = parseBinding(row);
    if (!b || !Object.hasOwn(fresh.POLICIES,b.titleId) || b.contactId !== contactId) deny("COMMISSIONING_SUBMISSION_CENSUS_CHANGED");
  }
  return { method: "EXACT_GLOBAL_CENSUS_ATTESTATION_AND_LOCAL_PARITY", observedAt: proof.observedAt, expiresAt: proof.expiresAt, rows: proof.rows.length };
}
async function readReceipt(p, deps, row) {
  const blob = deps.containerClient.getBlockBlobClient(p.output);
  try {
    const props = await blob.getProperties();
    const receipt = JSON.parse((await blob.downloadToBuffer(0, undefined, { conditions: { ifMatch: props.etag } })).toString("utf8"));
    if (!row || receipt.intakeId !== row.jm1_publishingintakeid || receipt.fingerprint !== p.fingerprint ||
        receipt.stageCode !== "01_INQUIRY" || receipt.status !== "COMPLETED" || receipt.stage02 !== "PENDING" ||
        receipt.email?.delivered !== true || JSON.stringify(receipt.components) !== JSON.stringify(p.components)) deny("COMMISSIONING_SUBMISSION_RECEIPT_CONFLICT");
    return receipt;
  } catch (e) { if (e.statusCode === 404) return null; throw e; }
}
async function acknowledgment(p, current, author, deps) {
  if (deps.acknowledgment) return deps.acknowledgment(p, current, author);
  const env = deps.env || process.env;
  const key = env.JM1_AUTHOR_RESPONSE_SEND_RELAY_KEY || env.JM1_RELAY_API_KEY || env.JM1_JOIN_INTERNAL_NOTIFICATION_RELAY_KEY;
  const base = (env.JM1_AUTHOR_RESPONSE_SEND_RELAY_URL || env.JM1_JOIN_INTERNAL_NOTIFICATION_RELAY_URL || "https://func-jm1-acs-email-relay.azurewebsites.net").replace(/\/$/, "");
  if (!key) deny("COMMISSIONING_SUBMISSION_RELAY_UNBOUND");
  const response = await fetch(`${base}/api/send-author-acknowledgment`, { method: "POST", headers: {
    "content-type": "application/json", "x-jm1-relay-key": key }, body: JSON.stringify({
    reference: p.reference, to: author.emailaddress1, cc: ["publishing@jmerrill.one"], replyTo: "publishing@jmerrill.one",
    firstName: author.firstname, projectTitle: current.input.title.jm1pub_titleid === "0e127af9-fcb3-5671-a0fa-e4af63c307d1" ? "CHAD-AND-ME-manuscript-v003" : current.titleName,
    intakeChannel: "INT-PUB-005 /join", manuscriptUrl: current.input.source.reference,
    manuscriptChoice: "now", manuscriptLifecycleState: "RECEIVED", waitingOn: "JMP",
    nextStep: "Your inquiry and manuscript have been received. JMP will review the project and keep you informed about the next step."
  }), signal: AbortSignal.timeout(60000) });
  const value = await response.json();
  if (!response.ok) deny("COMMISSIONING_SUBMISSION_ACKNOWLEDGMENT_FAILED");
  return { generated: true, sent: Boolean(value.providerMessageId || value.operationId),
    delivered: false, mailboxCopyVerified: value.mailboxEvidenceVerified === true,
    expectedSubject: `We Received Your Publishing Inquiry for ${p.titleId === "0e127af9-fcb3-5671-a0fa-e4af63c307d1" ? "CHAD-AND-ME-manuscript-v003" : current.titleName}`,
    internetMessageId: value.mailboxInternetMessageId || null,
    providerMessageId: value.providerMessageId || value.operationId || null,
    communicationRecordId: value.communicationRecordId || null, providerStatus: value.providerStatus || null,
    responseRequired: false, actedUpon: "NOT_REQUIRED_INFORMATIONAL_STAGE", replay: value.replay === true };
}
async function verifyRecipient(email, author, p, deps) {
  if (!email.sent || !email.internetMessageId || !deps.recipientReadback) return { ...email, delivered: false };
  const data = await deps.recipientReadback(email.internetMessageId, author.emailaddress1);
  if (!Array.isArray(data.value) || data["@odata.nextLink"] || data.value.length > 1) deny("COMMISSIONING_SUBMISSION_RECIPIENT_IDENTITY_CONFLICT");
  const message = data.value[0];
  if (!message) {
    if (data.proofUnavailable === "EXTERNAL_RECIPIENT_DELIVERY_TELEMETRY_REQUIRED") {
      const observed = await readRecipientObservation(email, author, p, deps);
      if (observed) return observed;
    }
    return { ...email, delivered: false, deliveryGap: data.proofUnavailable || "EXACT_RECIPIENT_MESSAGE_NOT_YET_FOUND" };
  }
  if (message.internetMessageId !== email.internetMessageId || !message.id || !Number.isFinite(Date.parse(message.receivedDateTime)) ||
      !message.toRecipients?.some(r => r.emailAddress?.address?.toLowerCase() === author.emailaddress1.toLowerCase()) ||
      message.from?.emailAddress?.address?.toLowerCase() !== "publishing@email.jmerrill.one" ||
      message.subject !== email.expectedSubject) deny("COMMISSIONING_SUBMISSION_RECIPIENT_IDENTITY_CONFLICT");
  return { ...email, delivered: true, recipientMessageId: message.id, deliveredAt: message.receivedDateTime,
    deliveryProof: "EXACT_IMMUTABLE_MESSAGE_IN_CANONICAL_AUTHOR_MAILBOX" };
}
async function readRecipientObservation(email, author, p, deps) {
  const reference = `new-submission-stage01/${p.titleId}/${p.fingerprint}/recipient-observations/${email.providerMessageId}.json`;
  try {
    const blob = deps.containerClient.getBlockBlobClient(reference), properties = await blob.getProperties();
    const observation = JSON.parse((await blob.downloadToBuffer(0, undefined, { conditions: { ifMatch: properties.etag } })).toString("utf8"));
    const at = Date.parse(observation.observedAt), received = Date.parse(observation.receivedAt);
    const url = new URL(observation.sourceUrl);
    if (observation.schemaVersion !== 1 || observation.proofClass !== "AUTHORIZED_RECIPIENT_MAILBOX_OBSERVATION" ||
        observation.titleId !== p.titleId || observation.sourceFingerprint !== p.fingerprint || observation.intakeId !== p.intakeId ||
        observation.providerMessageId !== email.providerMessageId || observation.communicationRecordId !== email.communicationRecordId ||
        observation.internetMessageId !== email.internetMessageId || observation.subject !== email.expectedSubject ||
        observation.to !== author.emailaddress1.toLowerCase() || observation.from !== "publishing@email.jmerrill.one" ||
        !Number.isFinite(at) || !Number.isFinite(received) || received > at || at > Date.now() ||
        url.origin !== "https://mail.google.com" || url.searchParams.get("view") !== "om" ||
        url.searchParams.get("permmsgid") !== observation.recipientMessageId || !/^msg-f:\d+$/.test(observation.recipientMessageId) ||
        !/^[a-f0-9]{64}$/.test(observation.headerSummarySha256 || "")) deny("COMMISSIONING_SUBMISSION_RECIPIENT_OBSERVATION_CONFLICT");
    return { ...email, delivered: true, deliveredAt: observation.receivedAt, recipientMessageId: observation.recipientMessageId,
      deliveryProof: observation.proofClass, deliveryEvidenceReference: reference, automatedRecipientMonitoring: false };
  } catch (e) { if (e.statusCode === 404) return null; throw e; }
}
async function handler(body, deps = {}) {
  const env = deps.env || process.env;
  if (!MODES.includes(body.mode) || !Object.hasOwn(fresh.POLICIES, body.titleId || "")) return { status: 400, jsonBody: { code: "COMMISSIONING_SUBMISSION_SCOPE_DENIED", effects: 0 } };
  const execute = body.mode === "SUBMISSION_01_EXECUTE";
  if (execute && (env.JM1_NEW_SUBMISSION_STAGE01_ENABLED !== "true" || !(env.JM1_NEW_SUBMISSION_STAGE01_TITLE_IDS || "").split(",").includes(body.titleId))) return { status: 403, jsonBody: { code: "COMMISSIONING_SUBMISSION_DISABLED", effects: 0 } };
  let attempted = false, phase = "ACCESS_READ";
  try {
    if (["JM1_TITLE_COMMISSIONING_REVIEW_ENABLED", "JM1_PUBLISHING_STAGE_RUNTIME_ENABLED", "JM1_PUBLISHING_WAIT_RUNTIME_ENABLED"].some(k => env[k] !== "false")) deny("COMMISSIONING_SUBMISSION_DOWNSTREAM_NOT_HELD");
    const context = await native(deps);
    const access = await (deps.verifyAccess || verifyAccess)(context);
    phase = "SOURCE_READ";
    const current = await (deps.readSource || fresh.readSource)(body.titleId, context), p = plan(current);
    if (current.identity.contactId !== contactId) deny("COMMISSIONING_SUBMISSION_AUTHOR_DENIED");
    phase = "DUPLICATE_READ";
    if (context.containerClient.getProperties && (await context.containerClient.getProperties()).blobPublicAccess) deny("COMMISSIONING_SUBMISSION_PUBLIC_STORAGE_DENIED");
    const census = await inventory(context);
    let row = findExact(census.rows, p);
    const existing = await readReceipt(p, context, row);
    const censusProof = existing ? { method: "EXACT_ACCEPTED_RECEIPT_REPLAY_NO_CREATE" } : await (deps.verifyCensus || verifyCensus)(census, access, context);
    if (!execute || existing) return { status: 200, jsonBody: { titleId: p.titleId, source: p.components, access,
      intakeId: row?.jm1_publishingintakeid || null, existingReceipt: existing, replay: Boolean(existing),
      inventory: { rows: census.rows.length, pages: census.pages, complete: true, censusProof }, stage02: "PENDING", effects: 0 } };
    const author = await context.authorityClient.first("contacts", { $filter: `contactid eq ${contactId}` });
    if (!author?.emailaddress1 || !author.firstname || !author.lastname) deny("COMMISSIONING_SUBMISSION_AUTHOR_CONTACT_INCOMPLETE");
    phase = "INTAKE_CREATE";
    if (!row) {
      const payload = { jm1_publishingintakeid: p.intakeId, jm1_name: `${p.reference} - ${current.titleName}`,
        jm1_firstname: author.firstname, jm1_lastname: author.lastname, jm1_email: author.emailaddress1,
        jm1_projecttitle: current.titleName, jm1_idempotencykey: p.key, jm1_intakereferencecode: p.reference,
        jm1_manuscriptreceived: true, jm1_manuscripturl: current.input.source.reference,
        jm1_additionalnotes: JSON.stringify({ newSubmissionStage01: storedBinding(p) }),
        jm1_acknowledgmentsent: false, jm1_acknowledgmentstatus: 835500002,
        jm1_acknowledgmenterror: "Acknowledgment owned by idempotent canonical Stage 01 sender.",
        jm1_stage0handoffstatus: 835500003, jm1_stage0handofferror: "Stage 02 pending; no title processing authorized." };
      attempted = true;
      try { await context.request(TABLE, "POST", payload); }
      catch (e) { if (![400,409,412].includes(e.statusCode)) throw e; }
      row = findExact((await inventory(context)).rows, p);
      if (!row) deny("COMMISSIONING_SUBMISSION_CREATE_READBACK_FAILED");
    }
    phase = "AUTHOR_ACKNOWLEDGMENT";
    const email = await verifyRecipient(await acknowledgment(p, current, author, context), author, p, context);
    if (!email.delivered) return { status: 202, jsonBody: { titleId: p.titleId, intakeId: row.jm1_publishingintakeid,
      stage01: "WAITING_DELIVERY_PROOF", stage02: "PENDING", email, recovery: "SAME_REFERENCE_CANONICAL_RELAY_READBACK" } };
    phase = "OUTPUT_PERSIST";
    const receipt = { schemaVersion: 1, titleId: p.titleId, titleName: current.titleName, contactId,
      intakeId: row.jm1_publishingintakeid, fingerprint: p.fingerprint, components: p.components,
      stageCode: "01_INQUIRY", status: "COMPLETED", stage02: "PENDING", completedAt: new Date().toISOString(),
      outputReference: p.output, runtimeIdentity: access, historicalCompletionImported: false,
      email: { ...email, replay: undefined }, modelCalls: 0, payments: 0, titleChanged: false, originalBytesChanged: false };
    await fresh.immutable(context.containerClient, p.output, receipt);
    const verified = await readReceipt(p, context, row);
    return { status: 200, jsonBody: { titleId: p.titleId, receipt: verified, replay: false, stage02: "PENDING", email, modelCalls: 0, payments: 0 } };
  } catch (e) { return { status: 409, jsonBody: { code: /^COMMISSIONING_[A-Z_]+$/.test(e.safeCode || "") ? e.safeCode : "COMMISSIONING_SUBMISSION_DEPENDENCY_FAILED", phase,
      ...(e.statusCode ? { providerStatus: e.statusCode } : {}), mutationAttempted: attempted, recovery: "EXACT_SOURCE_AND_RECEIPT_READBACK", communicationState: phase === "AUTHOR_ACKNOWLEDGMENT" || phase === "OUTPUT_PERSIST" ? "READ_CANONICAL_RELAY_RECEIPT" : "NOT_ATTEMPTED", modelCalls: 0, payments: 0 } }; }
}
module.exports = { MODES, COLUMNS, plan, storedBinding, findExact, inventory, verifyAccess, rowFingerprint, verifyCensus, verifyRecipient, readRecipientObservation, readReceipt, native, handler };
