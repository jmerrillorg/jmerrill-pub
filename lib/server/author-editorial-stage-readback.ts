import { dataverseFirst, stringValue, type DataverseServerConfig, type DataverseRow } from './dataverse-server'

const GUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i
const SELECT = 'jm1pub_editorialstageid,jm1pub_authorsafesummary,jm1pub_stagestatus,jm1pub_stagetype,_jm1pub_titleid_value,_jm1pub_publishingassetid_value,createdon'

export function selectTitleBoundEditorialStage(rows: DataverseRow[], titleId: string) {
  if (!GUID.test(titleId)) return null
  return rows.filter(row => stringValue(row._jm1pub_titleid_value).toLowerCase() === titleId.toLowerCase() &&
    (row.statecode == null || Number(row.statecode) === 0))
    .sort((a, b) => (Date.parse(stringValue(b.createdon)) || 0) - (Date.parse(stringValue(a.createdon)) || 0))[0] || null
}

// Current stages can belong directly to a title without a format-specific asset.
// An older asset lookup must not hide the title's active editorial record.
export async function readAuthorEditorialStage(config: DataverseServerConfig, input: {
  titleId: string
  assetId?: string
  assetTitleId?: string
}, read: typeof dataverseFirst = dataverseFirst) {
  if (!GUID.test(input.titleId)) return null
  const stage = await read(config, 'jm1pub_editorialstages', {
    $select: SELECT, $filter: `_jm1pub_titleid_value eq ${input.titleId} and statecode eq 0`,
    $orderby: 'createdon desc',
  })
  if (stage) return stringValue(stage._jm1pub_titleid_value).toLowerCase() === input.titleId.toLowerCase() ? stage : null
  if (!input.assetId || !GUID.test(input.assetId) || input.assetTitleId?.toLowerCase() !== input.titleId.toLowerCase()) return null
  const legacy = await read(config, 'jm1pub_editorialstages', {
    $select: SELECT, $filter: `_jm1pub_publishingassetid_value eq ${input.assetId} and statecode eq 0`,
    $orderby: 'createdon desc',
  })
  if (!legacy || stringValue(legacy._jm1pub_publishingassetid_value).toLowerCase() !== input.assetId.toLowerCase()) return null
  const legacyTitleId = stringValue(legacy._jm1pub_titleid_value)
  return legacyTitleId && legacyTitleId.toLowerCase() !== input.titleId.toLowerCase() ? null : legacy
}
