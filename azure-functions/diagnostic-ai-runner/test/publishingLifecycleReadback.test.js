"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { lifecycleReadback } = require("../src/functions/runPublishingLifecycleReadback");
const authorId = "106a78d0-fb9a-f111-b8dc-6045bdd69738";
const titleId = "daf8180f-85a3-f111-b8de-000d3a14673b";
test("production startup explicitly registers the read-only route", () => {
  assert.match(fs.readFileSync(path.join(__dirname, "../src/index.js"), "utf8"),
    /require\("\.\/functions\/runPublishingLifecycleReadback"\)/);
});
function dependencies(wrongAuthor = false) {
  return { client: { first: async entity => entity === "contacts"
    ? { contactid: authorId, fullname: "Test Author", emailaddress1: "test@example.com" }
    : { jm1pub_titleid: titleId, _jm1_primaryauthor_value: wrongAuthor ? titleId : authorId, jm1pub_titlename: "Test Project" },
    list: async () => [] },
    graphClient: { request: async method => { assert.equal(method, "GET"); return { value: [] }; } } };
}
test("bounded production identity readback is effect-free and renders the canonical fixture", async () => {
  const result = await lifecycleReadback({ authorId, titleId, afterIso: new Date(Date.now() - 86400000).toISOString() }, dependencies());
  assert.equal(result.status, 200);
  assert.equal(result.jsonBody.effects, 0);
  assert.equal(result.jsonBody.noSend, true);
  assert.equal(result.jsonBody.queries.every(query => query.complete), true);
  assert.match(result.jsonBody.rendering.html, /The Publishing Team/);
});
test("wrong immutable author-title pair is denied before mailbox access", async () => {
  const deps = dependencies(true);
  deps.graphClient.request = async () => { throw new Error("MAIL_READ_SHOULD_NOT_OCCUR"); };
  assert.equal((await lifecycleReadback({ authorId, titleId }, deps)).status, 409);
});
test("unbounded reads and text-only identity are denied", async () => {
  assert.equal((await lifecycleReadback({ authorId: "Test Author", titleId }, dependencies())).status, 400);
  assert.equal((await lifecycleReadback({ authorId, titleId, afterIso: "2020-01-01" }, dependencies())).status, 400);
  assert.equal((await lifecycleReadback({ authorId, titleId, includeResponseSearch: true,
    afterIso: new Date(Date.now() - 86400000).toISOString() }, dependencies())).status, 400);
});
test("encoded mailbox pagination remains bounded to the canonical Graph mailbox", async () => {
  const deps = dependencies();
  let reads = 0;
  deps.graphClient.request = async (method, path) => {
    assert.equal(method, "GET");
    reads++;
    return reads === 1 ? { value: [], "@odata.nextLink": "https://graph.microsoft.com/v1.0/users/publishing%40jmerrill.one/messages?$skip=100" } : { value: [] };
  };
  const result = await lifecycleReadback({ authorId, titleId, afterIso: new Date(Date.now() - 86400000).toISOString() }, deps);
  assert.equal(result.status, 200);
  assert.equal(reads, 3);
});
test("pagination cannot follow another origin or mailbox", async () => {
  for (const nextLink of ["https://example.com/v1.0/users/publishing@jmerrill.one/messages", "https://graph.microsoft.com/v1.0/users/other@example.com/messages"]) {
    const deps = dependencies();
    deps.graphClient.request = async () => ({ value: [], "@odata.nextLink": nextLink });
    await assert.rejects(() => lifecycleReadback({ authorId, titleId, afterIso: new Date(Date.now() - 86400000).toISOString() }, deps), /MAILBOX_PAGINATION_SCOPE_DENIED/);
  }
});

test("internal presentation proof reads only the fixed internal subject and contained recipients", async () => {
  for (const recipient of ["publishing@jmerrill.one", "other@example.com"]) {
    const deps = dependencies();
    let reads = 0;
    deps.graphClient.request = async (method, path) => {
      assert.equal(method, "GET");
      reads++;
      if (reads === 1) return { value: [] };
      if (reads === 2) return { value: [{ id: "internal-proof", subject: "Publishing Internal Presentation Check - Test Project",
        from: { emailAddress: { address: "publishing@email.jmerrill.one" } },
        toRecipients: [{ emailAddress: { address: recipient } }], body: { content: "Internal check" } }] };
      assert.match(path, /messages\/internal-proof/);
      return { id: "internal-proof", body: { contentType: "html", content: "Proof" } };
    };
    const result = await lifecycleReadback({ authorId, titleId,
      afterIso: new Date(Date.now() - 86400000).toISOString(), includePresentation: true, includeInternalProof: true }, deps);
    assert.equal(result.jsonBody.presentationEvidence.length, recipient === "publishing@jmerrill.one" ? 1 : 0);
    assert.equal(result.jsonBody.effects, 0);
  }
});

test("recent system census is explicitly requested and bounded independently of a title subject", async () => {
  const deps = dependencies();
  const paths = [];
  deps.graphClient.request = async (method, path) => {
    assert.equal(method, "GET");
    paths.push(decodeURIComponent(path));
    return { value: [] };
  };
  const result = await lifecycleReadback({ authorId, titleId,
    afterIso: new Date(Date.now() - 86400000).toISOString(), includePresentation: true, includeSystemCensus: true }, deps);
  assert.equal(result.jsonBody.queries.length, 3);
  assert.match(paths[2], /publishing@email\.jmerrill\.one/);
  assert.equal(result.jsonBody.systemPresentationComplete, true);
  assert.equal(result.jsonBody.effects, 0);
});

test("response search preserves alternate-address leads without verifying them", async () => {
  const deps = dependencies();
  const filters = [];
  deps.graphClient.request = async (method, path) => {
    assert.equal(method, "GET");
    const filter = new URL(path, "https://graph.microsoft.com").searchParams.get("$filter");
    filters.push(filter);
    if (filters.length === 1) return { value: [{ id: "author-request",
      from: { emailAddress: { address: "test@example.com" } },
      body: { content: "Please use new-author@example.net for email.\n\nOn Sep 21, 2026, Publishing wrote:\nSend email to quoted@example.net" } }] };
    if (filters.length === 2) return { value: [{ id: "delivery", conversationId: "exact-thread",
      from: { emailAddress: { address: "publishing@email.jmerrill.one" } },
      toRecipients: [{ emailAddress: { address: "test@example.com" } }], body: { content: "Review materials" } }] };
    return { value: [] };
  };
  const result = await lifecycleReadback({ authorId, titleId, includeResponseSearch: true,
    afterIso: new Date(Date.now() - 86400000).toISOString(), deliverySentAtIso: new Date().toISOString() }, deps);
  assert.deepEqual(result.jsonBody.responseSearch.aliases, []);
  assert.deepEqual(result.jsonBody.responseSearch.unverifiedAliasLeads, ["new-author@example.net"]);
  assert.equal(result.jsonBody.responseSearch.complete, false);
  assert.equal(result.jsonBody.responseSearch.reason, "ALTERNATE_SENDER_IDENTITY_UNVERIFIED");
  assert.equal(result.jsonBody.responseSearch.identityChanges, 0);
  assert.match(filters[2], /new-author@example.net/);
  assert.match(filters[3], /conversationId eq 'exact-thread'/);
  assert.match(filters[1], /from\/emailAddress\/address eq 'publishing@email\.jmerrill\.one'/);
  assert.doesNotMatch(filters[1], /Test Project/);
  assert.equal(filters.some(filter => filter.includes("quoted@example.net")), false);
  assert.equal(result.jsonBody.effects, 0);
});

test("registered alternate requires primary-address verification evidence before response search trusts it", async () => {
  for (const verified of [false, true]) {
    const deps = dependencies();
    const first = deps.client.first;
    deps.client.first = async entity => entity === "contacts"
      ? { contactid: authorId, fullname: "Test Author", emailaddress1: "test@example.com",
        emailaddress2: "author@example.net" } : first(entity);
    deps.client.list = async () => verified ? [{ jm1_sourceentity: "contact", jm1_sourcerecordid: authorId,
      jm1_actiondescription: `address=author@example.net; status=VERIFIED; verificationMethod=PRIMARY_EMAIL_EXPLICIT_STATEMENT; sourceMessageId=source-1; verifiedAt=${new Date().toISOString()};` }] : [];
    const filters = [];
    deps.graphClient.request = async (method, path) => {
      const filter = new URL(path, "https://graph.microsoft.com").searchParams.get("$filter");
      filters.push(filter);
      return { value: [] };
    };
    const result = await lifecycleReadback({ authorId, titleId, includeResponseSearch: true,
      afterIso: new Date(Date.now() - 86400000).toISOString(), deliverySentAtIso: new Date().toISOString() }, deps);
    assert.deepEqual(result.jsonBody.responseSearch.aliases, verified ? ["author@example.net"] : []);
    assert.equal(result.jsonBody.responseSearch.complete, verified);
    assert.ok(filters.some(filter => filter.includes("author@example.net")));
  }
});

test("truncated thread read cannot establish absence of author response", async () => {
  const deps = dependencies();
  let reads = 0;
  deps.graphClient.request = async () => {
    reads++;
    if (reads === 2) return { value: [{ id: "delivery", conversationId: "thread",
      from: { emailAddress: { address: "publishing@email.jmerrill.one" } },
      toRecipients: [{ emailAddress: { address: "test@example.com" } }] }] };
    if (reads > 2) return { value: [], "@odata.nextLink": "https://graph.microsoft.com/v1.0/users/publishing@jmerrill.one/messages?$skip=100" };
    return { value: [] };
  };
  const result = await lifecycleReadback({ authorId, titleId, includeResponseSearch: true,
    afterIso: new Date(Date.now() - 86400000).toISOString(), deliverySentAtIso: new Date().toISOString() }, deps);
  assert.equal(result.jsonBody.responseSearch.complete, false);
});
