"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { createHash } = require("node:crypto");
const { ManagedIdentityCredential } = require("@azure/identity");
const canon = require("../../config/commissioning-editorial-review-canon.json");
const { graphBytes, readExistingGlobalStyleGuide } = require("./productionTitleAuthorityReader");
function fail(code) { throw Object.assign(new Error(code), { safeCode: code }); }

function createCommissioningEditorialReviewReaders(deps) {
  return {
    async downloadSource(source) {
      const id = /^dataverse:jm1pub_editorialartifact:([a-f0-9-]{36})$/.exec(source.reference || "")?.[1];
      if (!id) fail("REVIEW_SOURCE_ID_INVALID");
      const row = await deps.client.first("jm1pub_editorialartifacts", { $filter: `jm1pub_editorialartifactid eq ${id}` });
      if (row?.jm1pub_editorialartifactid !== id || row.jm1pub_sha256 !== source.sha256 ||
          String(row.versionnumber) !== source.version) fail("REVIEW_SOURCE_IDENTITY_CHANGED");
      return graphBytes(row, { ...deps, credential: deps.credential || new ManagedIdentityCredential() });
    },
    async readReviewAuthority(titleId, sourceSha256) {
      const title = await deps.client.first("jm1pub_titles", { $filter: `jm1pub_titleid eq ${titleId}` });
      if (title?.jm1pub_titleid !== titleId || !title.jm1pub_titlename) fail("REVIEW_TITLE_CONTEXT_UNBOUND");
      const readCanon = deps.readReviewCanon || (() => fs.readFileSync(path.join(__dirname,
        "../../config/jm1-publishing-editorial", canon.file)));
      const bytes = await readCanon();
      if (!Buffer.isBuffer(bytes) || createHash("sha256").update(bytes).digest("hex") !== canon.sha256) fail("REVIEW_PACKAGED_CANON_UNVERIFIED");
      const knowledge = await (deps.verifyKnowledgeBlob || require("../blob/knowledgeReader").verifyKnowledgeBlob)();
      if (!knowledge?.reachable) fail("COMMISSIONING_DEPENDENCY_UNAVAILABLE");
      const global = await readExistingGlobalStyleGuide({ verifyKnowledgeBlob: async () => knowledge });
      const sources = [
        { role: "EDITORIAL_REVIEW_CANON", id: `${canon.sourceRoot}/${canon.file}`, version: canon.version,
          sha256: canon.sha256, content: bytes.toString("utf8"), current: true, approved: true,
          scope: "GLOBAL", verifiedAt: new Date().toISOString() },
        { role: "GLOBAL_EDITORIAL_KNOWLEDGE", id: global.id, version: global.version, sha256: global.sha256,
          content: global.content, current: true, approved: true, scope: "GLOBAL", verifiedAt: global.lastVerified }
      ];
      const rows = await deps.client.list("jm1pub_editorialartifacts", {
        $filter: `_jm1pub_titleid_value eq ${titleId}`, $top: "500"
      });
      if (!Array.isArray(rows)) fail("REVIEW_TITLE_AUTHORITY_LIST_INVALID");
      const types = { TITLE_STYLE_SHEET: 196650007, VOICE_PROFILE: 196650018, TITLE_RULINGS: 196650013 };
      const missingContext = [];
      for (const [role, type] of Object.entries(types)) {
        const candidates = rows.filter(row => row.jm1pub_artifacttype === type && row.statecode === 0 &&
          row.jm1pub_iscurrentapproved === true && !row.jm1pub_supersededon);
        if (candidates.length > 1) fail("REVIEW_TITLE_AUTHORITY_CONFLICT");
        if (!candidates.length) { missingContext.push(role); continue; }
        const row = candidates[0];
        if (row._jm1pub_titleid_value !== titleId || !/^[a-f0-9]{64}$/.test(row.jm1pub_sha256 || "") ||
            !row.versionnumber) fail("REVIEW_TITLE_AUTHORITY_IDENTITY_INVALID");
        const raw = await graphBytes(row, { ...deps, credential: deps.credential || new ManagedIdentityCredential() });
        if (!Buffer.isBuffer(raw) || createHash("sha256").update(raw).digest("hex") !== row.jm1pub_sha256) fail("REVIEW_TITLE_AUTHORITY_CHECKSUM_MISMATCH");
        const content = /\.docx$/i.test(row.jm1pub_repositorypath || "")
          ? (await require("mammoth").extractRawText({ buffer: raw })).value : raw.toString("utf8");
        sources.push({ role, id: row.jm1pub_editorialartifactid, version: String(row.versionnumber), content,
          sha256: createHash("sha256").update(content).digest("hex"), originalByteSha256: row.jm1pub_sha256,
          current: true, approved: true, scope: "TITLE", titleId, verifiedAt: new Date().toISOString() });
      }
      return { titleId, titleName: title.jm1pub_titlename, sourceSha256, sources, missingContext,
        assessmentBoundary: "INITIAL_REVIEW_ONLY_NOT_EDITING_AUTHORITY" };
    }
  };
}

module.exports = { createCommissioningEditorialReviewReaders };
