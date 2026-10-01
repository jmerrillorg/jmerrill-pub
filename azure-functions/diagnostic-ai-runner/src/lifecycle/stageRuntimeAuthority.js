"use strict";

const STAGE_TYPES = Object.freeze({
  "03_EDITORIAL_REVIEW": 100000000,
  "07_DEVELOPMENTAL_EDITING": 100000001,
  "08_LINE_EDITING": 100000002,
  "09_COPYEDITING": 100000003,
  "10_PROOFREADING": 100000004
});
const ACTIVE_STAGE_STATUSES = new Set([
  100000000, 100000001, 100000002, 100000003,
  100000004, 100000005, 100000006, 100000007
]);
const EDITORIAL_TITLE_STAGE = 100000006;
const REVIEW_TITLE_STAGES = new Set([100000001, 100000002]);

async function readEditorialStageAuthority(event, client) {
  const expectedType = STAGE_TYPES[event.stageCode];
  if (expectedType === undefined) {
    throw Object.assign(new Error("PUBLISHING_STAGE_AUTHORITY_ADAPTER_NOT_COMMISSIONED"), {
      safeCode: "PUBLISHING_STAGE_AUTHORITY_ADAPTER_NOT_COMMISSIONED"
    });
  }
  const [stage, title] = await Promise.all([
    client.first("jm1pub_editorialstages", {
      $select: "jm1pub_editorialstageid,jm1pub_stagetype,jm1pub_stagestatus,_jm1pub_titleid_value",
      $filter: `jm1pub_editorialstageid eq ${event.stageId}`
    }),
    client.first("jm1pub_titles", {
      $select: "jm1pub_titleid,_jm1_primaryauthor_value,jm1pub_stage",
      $filter: `jm1pub_titleid eq ${event.titleId}`
    })
  ]);
  return {
    titleId: String(title?.jm1pub_titleid || "").toLowerCase(),
    stageId: String(stage?.jm1pub_editorialstageid || "").toLowerCase(),
    stageCode: Number(stage?.jm1pub_stagetype) === expectedType ? event.stageCode : "",
    current: Boolean(title?.jm1pub_titleid &&
      String(stage?._jm1pub_titleid_value || "").toLowerCase() === event.titleId.toLowerCase() &&
      ACTIVE_STAGE_STATUSES.has(Number(stage?.jm1pub_stagestatus)) &&
      (event.stageCode === "03_EDITORIAL_REVIEW"
        ? REVIEW_TITLE_STAGES.has(Number(title?.jm1pub_stage))
        : Number(title?.jm1pub_stage) === EDITORIAL_TITLE_STAGE)),
    authorId: String(title?._jm1_primaryauthor_value || "").toLowerCase()
  };
}

async function readCanonicalStageAuthority(event, client) {
  const [stage, definition, title] = await Promise.all([
    client.first("jmpv2_stageinstances", {
      $select: "jmpv2_stageinstanceid,jmpv2_stageinstancekey,jmpv2_lifecyclekey,jmpv2_stagecode,jmpv2_status",
      $filter: `jmpv2_stageinstanceid eq ${event.stageId}`
    }),
    client.list("jmpv2_stagedefinitions", {
      $select: "jmpv2_stagecode,jmpv2_isactive",
      $filter: `jmpv2_stagecode eq '${event.stageCode}'`, $top: "2"
    }),
    client.first("jm1pub_titles", {
      $select: "jm1pub_titleid,_jm1_primaryauthor_value",
      $filter: `jm1pub_titleid eq ${event.titleId}`
    })
  ]);
  if (!stage || definition.length !== 1 || definition[0].jmpv2_isactive !== true || !title) {
    return { titleId: "", stageId: "", stageCode: "", current: false };
  }
  const lifecycleKey = String(stage.jmpv2_lifecyclekey || "");
  if (!lifecycleKey || !/^[0-9a-f-]{36}$/i.test(lifecycleKey)) {
    return { titleId: "", stageId: "", stageCode: "", current: false };
  }
  const lifecycles = await client.list("jmpv2_lifecycleinstances", {
    $select: "jmpv2_lifecycleinstanceid,jmpv2_lifecyclekey,jmpv2_currentstagecode,jmpv2_currentstageinstancekey",
    $filter: `jmpv2_lifecyclekey eq '${lifecycleKey}'`, $top: "2"
  });
  const lifecycle = lifecycles.length === 1 ? lifecycles[0] : null;
  if (!lifecycle || !/^[0-9a-f-]{36}$/i.test(String(lifecycle.jmpv2_lifecycleinstanceid || ""))) {
    return { titleId: "", stageId: "", stageCode: "", current: false };
  }
  const engagements = await client.list("jmpv2_publishingengagements", {
    $select: "jmpv2_canonicaltitleid,jmpv2_canonicalauthorid,jmpv2_lifecycleinstanceid,jmpv2_currentstage",
    $filter: `jmpv2_lifecycleinstanceid eq '${lifecycle.jmpv2_lifecycleinstanceid}'`, $top: "2"
  });
  const engagement = engagements.length === 1 ? engagements[0] : null;
  const authorId = String(title._jm1_primaryauthor_value || "").toLowerCase();
  return {
    titleId: String(title.jm1pub_titleid || "").toLowerCase(),
    stageId: String(stage.jmpv2_stageinstanceid || "").toLowerCase(),
    stageCode: stage.jmpv2_stagecode,
    authorId,
    current: Boolean(engagement && authorId &&
      stage.jmpv2_status === "OPEN" &&
      stage.jmpv2_stagecode === event.stageCode &&
      lifecycle.jmpv2_lifecyclekey === lifecycleKey &&
      lifecycle.jmpv2_currentstagecode === event.stageCode &&
      lifecycle.jmpv2_currentstageinstancekey === stage.jmpv2_stageinstancekey &&
      String(engagement.jmpv2_lifecycleinstanceid || "").toLowerCase() ===
        lifecycle.jmpv2_lifecycleinstanceid.toLowerCase() &&
      String(engagement.jmpv2_canonicaltitleid || "").toLowerCase() === event.titleId.toLowerCase() &&
      String(engagement.jmpv2_canonicalauthorid || "").toLowerCase() === authorId &&
      engagement.jmpv2_currentstage === event.stageCode)
  };
}

function readStageAuthority(event, client) {
  return Object.hasOwn(STAGE_TYPES, event.stageCode)
    ? readEditorialStageAuthority(event, client)
    : readCanonicalStageAuthority(event, client);
}

module.exports = { readEditorialStageAuthority, readCanonicalStageAuthority, readStageAuthority };
