export type NoncurrentHistoricalReference = {
  WorkId: string
  Title: string
  Author: string
  ReferenceId: string
  ReferenceType: 'DUPLICATE_READ_MODEL_REFERENCE'
  CurrentCanonicalWorkId: string
  CurrentCanonicalTitle: string
  HistoricalSource: string
  WhyNoncurrent: string
  WhyDuplicate: string
  CurrentProjectionEffect: string
  SafeDisposition: 'READ_MODEL_SUPPRESSION'
  Classification: 'DUPLICATE_READ_MODEL_REFERENCE'
  HistoricalEvidencePreserved: true
}

const SOURCE = 'docs/operations/generated/JMP-PIPELINE-003-RECONCILIATION-QUEUE-TRIAGE-2026-09-15.md'
const WHY_NONCURRENT = 'Wave 1 canonical authority classified this row as DUPLICATE_RECORD / NONCURRENT_REFERENCE_ONLY.'
const WHY_DUPLICATE = 'A current canonical title/work authority exists; this row is a historical read-model reference only.'
const PROJECTION_EFFECT = 'Previously appeared as current Pipeline reconciliation work.'

export const NONCURRENT_HISTORICAL_REFERENCES: readonly NoncurrentHistoricalReference[] = Object.freeze([
  row('fad1c5d7-b389-f111-ab10-000d3a9eacee', '100 Wisdom Lessons for Life and Living', 'J Derrick Johnson', 'W1-309'),
  row('d8e69bd7-b389-f111-ab10-6045bdd69435', '27 Days to Overcoming Depression', 'Donjia Walls', 'W1-189'),
  row('dee69bd7-b389-f111-ab10-6045bdd69435', '365 Days Of Transparency', 'Daphanny Baker', 'W1-190'),
  row('8e0402da-b389-f111-ab10-000d3a14673b', '7 Step Jumpstart to Becoming Your Best Self', 'Ericka Johnson Settles', 'W1-052'),
  row('4b9a11da-b389-f111-ab10-6045bdd69738', 'A Blended Family', 'Shecara Norris', 'W1-191'),
  row('9fe382d8-b389-f111-ab10-6045bdd69678', 'A Little Bit of Everything', 'Eryonna Barrino', 'W1-193'),
  row('a8e382d8-b389-f111-ab10-6045bdd69678', 'A Portrait of Paradise', 'Iyorwuese Hagher', 'W1-055'),
  row('abe382d8-b389-f111-ab10-6045bdd69678', "A Principal's Tale", 'Shelley McIntosh', 'W1-195'),
  row('11d2c5d7-b389-f111-ab10-000d3a9eacee', 'A Truebies Guide, Part 1', 'Alesia Corpening', 'W1-057'),
  row('2554a0dd-b389-f111-ab10-6045bdd69435', 'A Truebies Guide, Part 2', 'Alesia Corpening', 'W1-060'),
  row('f67d1ada-b389-f111-ab10-7c1e525b15c2', 'Abortion!', 'Carolyn Booker-Pierce', 'W1-063'),
  row('509a11da-b389-f111-ab10-6045bdd69738', 'According to Mark', 'Alice Pryor', 'W1-196'),
  row('8c3582da-b389-f111-ab10-00224820105b', 'Aligned!', 'Dennis Brown', 'W1-065'),
  row('a00402da-b389-f111-ab10-000d3a14673b', 'Almost Happy', 'Jaylonna Stevette', 'W1-066'),
  row('549a11da-b389-f111-ab10-6045bdd69738', 'Are You Sure That You Are Ready?', 'Ericka Thornton', 'W1-199'),
  row('017e1ada-b389-f111-ab10-7c1e525b15c2', 'Because the Lord is My Shepherd', 'Carolyn Booker-Pierce', 'W1-068'),
  row('a60402da-b389-f111-ab10-000d3a14673b', 'BEE Careful', 'Deborah Eiland', 'W1-200'),
  row('569a11da-b389-f111-ab10-6045bdd69738', "Biblical Prescriptions For Life's Troubles", 'Terry Stephens', 'W1-205'),
])

export const NONCURRENT_HISTORICAL_REFERENCE_IDS = new Set(
  NONCURRENT_HISTORICAL_REFERENCES.map((item) => item.WorkId.toLowerCase()),
)

export function isKnownNoncurrentHistoricalReferenceId(value?: string | null) {
  return NONCURRENT_HISTORICAL_REFERENCE_IDS.has(String(value || '').trim().toLowerCase())
}

function row(
  workId: string,
  title: string,
  author: string,
  wave1Reference: string,
): NoncurrentHistoricalReference {
  return Object.freeze({
    WorkId: workId,
    Title: title,
    Author: author,
    ReferenceId: wave1Reference,
    ReferenceType: 'DUPLICATE_READ_MODEL_REFERENCE',
    CurrentCanonicalWorkId: 'PROVEN_BY_CURRENT_V2_CANONICAL_AUTHORITY',
    CurrentCanonicalTitle: title,
    HistoricalSource: `${SOURCE}; ${wave1Reference}`,
    WhyNoncurrent: WHY_NONCURRENT,
    WhyDuplicate: WHY_DUPLICATE,
    CurrentProjectionEffect: PROJECTION_EFFECT,
    SafeDisposition: 'READ_MODEL_SUPPRESSION',
    Classification: 'DUPLICATE_READ_MODEL_REFERENCE',
    HistoricalEvidencePreserved: true,
  })
}
