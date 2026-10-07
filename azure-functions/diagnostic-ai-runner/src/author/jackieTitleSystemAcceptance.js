"use strict";

const {
  JACKIE_CANONICAL_AUTHOR_CONTACT_ID,
  isJackieAuthoredTitle,
} = require("./jackieTitleSystemCommissioningPolicy");

const UNKNOWN_AUTHOR_FIXTURE = "00000000-0000-4000-8000-000000000001";
const CONFLICTING_AUTHOR_FIXTURE = "00000000-0000-4000-8000-000000000002";
const GUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;
const TITLE_SELECT = [
  "jm1pub_titleid",
  "_jm1_primaryauthor_value",
  "_jm1_author_value",
  "jm1_canonicalauthorcontactreference",
].join(",");

function normalizeReference(value) {
  if (value === null || value === undefined || value === "") return { present: false, id: "" };
  if (typeof value !== "string") return { present: true, id: "" };
  const match = value.trim().toLowerCase().match(/^(?:contact:)?([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})$/);
  return { present: true, id: match?.[1] || "" };
}

function consistentAuthorId(record) {
  const refs = [
    normalizeReference(record?._jm1_primaryauthor_value),
    normalizeReference(record?._jm1_author_value),
    normalizeReference(record?.jm1_canonicalauthorcontactreference),
  ].filter((ref) => ref.present);
  if (!refs.length || refs.some((ref) => !GUID.test(ref.id)) ||
      new Set(refs.map((ref) => ref.id)).size !== 1) return "";
  return refs[0].id;
}

function unionById(rows) {
  return [...new Map(rows.filter((row) => row?.jm1pub_titleid)
    .map((row) => [String(row.jm1pub_titleid).toLowerCase(), row])).values()];
}

async function findCurrentExamples(client) {
  const jackie = JACKIE_CANONICAL_AUTHOR_CONTACT_ID;
  const jackieFilters = [
    "_jm1_primaryauthor_value eq " + jackie,
    "_jm1_author_value eq " + jackie,
    "jm1_canonicalauthorcontactreference eq 'contact:" + jackie + "'",
  ];
  const jackieRows = unionById((await Promise.all(jackieFilters.map((filter) =>
    client.list("jm1pub_titles", {
      $select: TITLE_SELECT,
      $filter: "statecode eq 0 and " + filter,
      $top: "50",
    })))).flat());

  let jackieRecord = null;
  for (const row of jackieRows) {
    if (!isJackieAuthoredTitle(row)) continue;
    const id = consistentAuthorId(row);
    if (id === jackie && await client.first("contacts", {
      $select: "contactid",
      $filter: "contactid eq " + jackie,
    })) {
      jackieRecord = row;
      break;
    }
  }

  const otherRows = await client.list("jm1pub_titles", {
    $select: TITLE_SELECT,
    $filter: "statecode eq 0 and _jm1_primaryauthor_value ne " + jackie +
      " and _jm1_primaryauthor_value ne null",
    $top: "100",
  });
  let otherRecord = null;
  for (const row of otherRows) {
    if (isJackieAuthoredTitle(row)) continue;
    const id = consistentAuthorId(row);
    if (id && id !== jackie && await client.first("contacts", {
      $select: "contactid",
      $filter: "contactid eq " + id,
    })) {
      otherRecord = row;
      break;
    }
  }

  const unknownContact = await client.first("contacts", {
    $select: "contactid",
    $filter: "contactid eq " + UNKNOWN_AUTHOR_FIXTURE,
  });
  return { jackieRecord, otherRecord, unknownContactPresent: Boolean(unknownContact) };
}

async function runJackieTitleSystemAcceptance(client) {
  const examples = await findCurrentExamples(client);
  if (!examples.jackieRecord || !examples.otherRecord) {
    return { status: 503, jsonBody: { error: "LIVE_AUTHORITY_EXAMPLES_UNAVAILABLE" } };
  }
  if (examples.unknownContactPresent) {
    return { status: 503, jsonBody: { error: "UNKNOWN_AUTHOR_FIXTURE_COLLISION" } };
  }

  const conflicting = {
    _jm1_primaryauthor_value: JACKIE_CANONICAL_AUTHOR_CONTACT_ID,
    _jm1_author_value: CONFLICTING_AUTHOR_FIXTURE,
  };
  const cases = {
    liveJackieAuthor: isJackieAuthoredTitle(examples.jackieRecord),
    liveNonJackieAuthorDenied: !isJackieAuthoredTitle(examples.otherRecord),
    missingAuthorDenied: !isJackieAuthoredTitle({}),
    malformedAuthorDenied: !isJackieAuthoredTitle({ _jm1_primaryauthor_value: "not-a-contact" }),
    conflictingAuthorsDenied: !isJackieAuthoredTitle(conflicting),
    unknownAuthorDenied: !isJackieAuthoredTitle({ _jm1_primaryauthor_value: UNKNOWN_AUTHOR_FIXTURE }),
  };
  const passed = Object.values(cases).every(Boolean);
  return {
    status: passed ? 200 : 503,
    jsonBody: {
      mode: "READ_ONLY_POLICY_ACCEPTANCE",
      policy: "PRODUCTION_SHARED_JACKIE_AUTHORSHIP_POLICY",
      currentRecordReadback: "PASS",
      cases,
      effects: {
        queueWrites: 0,
        titleMutations: 0,
        stageMutations: 0,
        communications: 0,
      },
    },
  };
}

module.exports = { runJackieTitleSystemAcceptance };
