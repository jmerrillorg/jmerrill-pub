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

module.exports = { readEditorialStageAuthority };
