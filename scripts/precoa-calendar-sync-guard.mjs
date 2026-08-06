export const FAILURE = Object.freeze({
  FLOW_B_PARTIAL_LOOP_TERMINATION: "FLOW_B_PARTIAL_LOOP_TERMINATION",
  FLOW_B_STALE_OUTLOOK_EVENT_ID: "FLOW_B_STALE_OUTLOOK_EVENT_ID",
  DATAVERSE_PRESENT_OUTLOOK_MISSING: "DATAVERSE_PRESENT_OUTLOOK_MISSING",
  OUTLOOK_WRITE_FAILED_WITHOUT_RETRY: "OUTLOOK_WRITE_FAILED_WITHOUT_RETRY",
  TIMEZONE_CONVERSION_SHIFT: "TIMEZONE_CONVERSION_SHIFT",
  SOURCE_UID_COLLISION: "SOURCE_UID_COLLISION",
  PRECOA_FEED_PAGINATION_INCOMPLETE: "PRECOA_FEED_PAGINATION_INCOMPLETE"
});

export function validateWriterDefinition(definition) {
  const actions = definition?.actions ?? {};
  const activeLoop = actions.Apply_to_each;
  const cancelledList = actions["List:_Cancelled_With_Outlook_ID"];
  const activeFilter = actions.List_rows?.inputs?.parameters?.$filter ?? "";
  const cancelFilter = cancelledList?.inputs?.parameters?.$filter ?? "";

  return {
    activeLoopDecoupledFromCancellation:
      JSON.stringify(activeLoop?.runAfter ?? {}) === JSON.stringify({ List_rows: ["Succeeded"] }),
    cancellationCleanupLimitedToSchedulingIds:
      cancelFilter.includes("startswith(jm1_outlookeventid,'AQMkAGE1Y2Rh')"),
    activeFilterUsesFutureWindow:
      activeFilter.includes("jm1_startutc ge '@{utcNow()}'"),
    excludesBlockedTime:
      activeFilter.includes("not startswith(jm1_externaluid,'blocked|')")
  };
}

export function reconcileAppointments({ source = [], dataverse = [], outlook = [] }) {
  const sourceByUid = indexBy(source, "uid");
  const dataverseByUid = indexBy(dataverse, "uid");
  const outlookByUid = indexBy(outlook, "uid");
  const duplicateSourceUids = duplicates(source, "uid");
  const duplicateDataverseUids = duplicates(dataverse.filter((row) => row.active), "uid");
  const duplicateOutlookUids = duplicates(outlook, "uid");
  const failures = [];

  for (const row of source) {
    if (row.blockedTime || row.cancelled) continue;
    const dv = dataverseByUid.get(row.uid);
    const event = outlookByUid.get(row.uid);
    if (!dv) failures.push(classified(row, "SOURCE_ONLY", "No Dataverse record exists for active source appointment."));
    else if (!dv.active) failures.push(classified(row, "DATAVERSE_PRESENT_WRONG_STATE", "Dataverse record is not active."));
    else if (!dv.outlookEventId || !event) failures.push(classified(row, FAILURE.DATAVERSE_PRESENT_OUTLOOK_MISSING, "Active Dataverse row lacks a corresponding Outlook event."));
    else if (dv.mailbox && dv.mailbox !== "scheduling@jmerrill.one") failures.push(classified(row, "FLOW_B_WRONG_TARGET_CALENDAR", "Dataverse event ID is associated with a non-authoritative mailbox."));
    else {
      if (row.startUtc !== event.startUtc) failures.push(classified(row, FAILURE.TIMEZONE_CONVERSION_SHIFT, "Outlook start does not match source UTC start."));
      if ((row.location ?? "") !== (event.location ?? "")) failures.push(classified(row, "MISMATCHED_LOCATION", "Outlook location does not match source location."));
    }
  }

  for (const row of dataverse) {
    if (row.active && !sourceByUid.has(row.uid)) failures.push(classified(row, "DATAVERSE_ONLY_ACTIVE_RECORD", "Active Dataverse appointment has no active source record."));
  }

  for (const event of outlook) {
    if (!dataverseByUid.has(event.uid)) failures.push(classified(event, "OUTLOOK_ONLY_GOVERNED_APPOINTMENT", "Governed Outlook event has no Dataverse record."));
  }

  for (const uid of duplicateSourceUids) failures.push(classified({ uid }, FAILURE.SOURCE_UID_COLLISION, "Source UID appears more than once."));
  for (const uid of duplicateDataverseUids) failures.push(classified({ uid }, "DATAVERSE_DUPLICATE", "Active Dataverse UID appears more than once."));
  for (const uid of duplicateOutlookUids) failures.push(classified({ uid }, "OUTLOOK_DUPLICATE", "Outlook UID appears more than once."));

  return {
    sourceCount: source.length,
    dataverseCount: dataverse.length,
    outlookCount: outlook.length,
    exactMatches: source.filter((row) => !row.blockedTime && !row.cancelled && dataverseByUid.has(row.uid) && outlookByUid.has(row.uid)).length,
    failures
  };
}

export function shouldAlertForMissingOutlook({ source, dataverse, outlook, nowUtc, syncWindowMinutes }) {
  if (source.blockedTime || source.cancelled) return null;
  const elapsedMinutes = (Date.parse(nowUtc) - Date.parse(source.modifiedUtc ?? source.startUtc)) / 60000;
  if (elapsedMinutes < syncWindowMinutes) return null;
  if (!dataverse?.active || !outlook) {
    return {
      uid: source.uid,
      failureClass: FAILURE.DATAVERSE_PRESENT_OUTLOOK_MISSING,
      message: "Active Precoa appointment has no corresponding active Outlook event after the permitted synchronization window."
    };
  }
  return null;
}

function indexBy(rows, key) {
  const map = new Map();
  for (const row of rows) if (row[key]) map.set(row[key], row);
  return map;
}

function duplicates(rows, key) {
  const seen = new Set();
  const dupes = new Set();
  for (const row of rows) {
    if (!row[key]) continue;
    if (seen.has(row[key])) dupes.add(row[key]);
    seen.add(row[key]);
  }
  return [...dupes].sort();
}

function classified(row, failureClass, reason) {
  return { uid: row.uid, subject: row.subject, failureClass, reason };
}
