type EvidenceRow = Record<string, unknown>

function id(value: unknown): string {
  return typeof value === 'string' ? value.toLowerCase().replace(/[{}]/g, '') : ''
}

export function sameProjectionTitle(left: unknown, right: unknown): boolean {
  const canonical = id(left)
  return /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/.test(canonical) && canonical === id(right)
}

export function boundPublisherReview(gate: EvidenceRow, logs: EvidenceRow[]): EvidenceRow | null {
  if (Number(gate.jm1pub_gatestatus) !== 196650002 || gate.jm1pub_authordecision != null ||
      gate.jm1pub_authordecisionon || gate.jm1pub_nextstageauthorized === true) return null
  const gateId = gate.jm1pub_editorialapprovalgateid
  const start = Date.parse(String(gate.jm1pub_awaitingsince || gate.createdon || ''))
  if (!Number.isFinite(start)) return null
  const key = (row: EvidenceRow) => String(row.jm1_actiondescription || '').match(/Idempotency: (author-review-response:[a-f0-9]+)\./)?.[1]
  const bound = logs.filter(log => log.jm1_sourceentity === 'jm1pub_editorialapprovalgate' &&
    sameProjectionTitle(log.jm1_sourcerecordid, gateId) && Number.isFinite(Date.parse(String(log.createdon))) &&
    Date.parse(String(log.createdon)) >= start)
  return bound.filter(log => log.jm1_actiontype === 'AUTHOR_RESPONSE_REQUIRES_PUBLISHER_REVIEW' && key(log) &&
    bound.some(captured => captured.jm1_actiontype === 'AUTHOR_RESPONSE_CAPTURED' && key(captured) === key(log) &&
      sameProjectionTitle(String(captured.jm1_actiondescription || '').match(/(?:^|[; ])title=([a-f0-9-]{36})(?:;| |$)/i)?.[1], gate._jm1pub_titleid_value)))
    .sort((a, b) => Date.parse(String(b.createdon)) - Date.parse(String(a.createdon)))[0] || null
}

export function selectCurrentEditorialStage(stages: EvidenceRow[]): EvidenceRow | null {
  if (!stages.length) return null
  return [...stages].sort((a, b) => {
    const left = Date.parse(String(a.createdon || ''))
    const right = Date.parse(String(b.createdon || ''))
    if (Number.isFinite(left) && Number.isFinite(right) && left !== right) return right - left
    if (Number.isFinite(left) !== Number.isFinite(right)) return Number.isFinite(right) ? 1 : -1
    return Number(b.jm1pub_stagesequence || 0) - Number(a.jm1pub_stagesequence || 0)
  })[0]
}

export function hasDeliveredPendingReview(stage: EvidenceRow, gates: EvidenceRow[], logs: EvidenceRow[]): boolean {
  const stageId = id(stage.jm1pub_editorialstageid)
  const titleId = id(stage._jm1pub_titleid_value)
  return gates.some((gate) => {
    const gateId = id(gate.jm1pub_editorialapprovalgateid)
    if (!gateId || !sameProjectionTitle(gate._jm1pub_titleid_value, titleId) ||
        id(gate._jm1pub_editorialstageid_value) !== stageId ||
        Number(gate.jm1pub_gatestatus) !== 196650002 || gate.jm1pub_authordecision || gate.jm1pub_authordecisionon) return false
    return logs.some((log) => {
      if (log.jm1_actiontype !== 'PACKAGE_CADENCE_RELEASE_AUTHOR_PACKAGE_SENT' ||
          id(log.jm1_sourcerecordid) !== stageId) return false
      const deliveredGate = String(log.jm1_actiondescription || '').match(/(?:^|[; ])gate=([a-f0-9-]{36})(?:;| |$)/i)?.[1]
      return id(deliveredGate) === gateId
    })
  })
}

export function isBoundEditorialTransition(
  log: EvidenceRow,
  binding: { titleId: string; stageId: string; gateId: string; decisionOn?: string },
): boolean {
  const action = String(log.jm1_actiontype || '')
  if (!/(STAGE_TRANSITION|PROOFREADING_STARTED)/.test(action) || /BLOCKED|FAILED|DENIED|REQUESTED|PREPARED/.test(action)) return false
  if (!sameProjectionTitle(binding.titleId, binding.titleId) || !sameProjectionTitle(binding.gateId, binding.gateId)) return false
  if (binding.decisionOn) {
    const decisionTime = Date.parse(binding.decisionOn)
    const transitionTime = Date.parse(String(log.createdon || ''))
    if (!Number.isFinite(decisionTime) || !Number.isFinite(transitionTime) || transitionTime < decisionTime) return false
  }
  const source = id(log.jm1_sourcerecordid)
  if (!source || (source !== id(binding.gateId) && source !== id(binding.stageId))) return false
  // Free-text mention and numerical stage order are not transition authority.
  let detail: EvidenceRow = {}
  try {
    const parsed: unknown = JSON.parse(String(log.jm1_actiondescription || '{}'))
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) detail = parsed as EvidenceRow
  } catch {
    // Older logs can still bind by their exact source record, never by title text.
  }
  for (const key of ['titleId', 'canonicalTitleId']) {
    if (detail[key] && !sameProjectionTitle(detail[key], binding.titleId)) return false
  }
  if (source === id(binding.stageId)) {
    const exactGate = detail.gateId || detail.approvalGateId ||
      String(log.jm1_actiondescription || '').match(/(?:^|[; ])gate=([a-f0-9-]{36})(?:;| |$)/i)?.[1]
    if (id(exactGate) !== id(binding.gateId)) return false
  }
  return true
}
