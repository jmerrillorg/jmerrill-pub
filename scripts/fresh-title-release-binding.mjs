const sha40 = /^[a-f0-9]{40}$/i
const sha64 = /^[a-f0-9]{64}$/i

export function verifyFreshTitleReleaseBinding(binding) {
  const problems = []
  const shaFields = [
    ['approvedSourceSha', binding.approvedSourceSha],
    ['runSha', binding.runSha],
    ['workflowSha', binding.workflowSha],
    ['checkoutSha', binding.checkoutSha],
  ]

  for (const [name, value] of shaFields) {
    if (typeof value !== 'string' || !sha40.test(value)) problems.push(`${name}:INVALID`)
  }
  if (typeof binding.packageSha256 !== 'string' || !sha64.test(binding.packageSha256)) {
    problems.push('packageSha256:INVALID')
  }
  if (typeof binding.expectedPackageSha256 !== 'string' || !sha64.test(binding.expectedPackageSha256)) {
    problems.push('expectedPackageSha256:INVALID')
  }
  if (binding.expectedRef !== 'refs/heads/main') problems.push('expectedRef:NOT_CANONICAL_MAIN')
  if (binding.runRef !== binding.expectedRef) problems.push('runRef:MISMATCH')

  if (shaFields.every(([, value]) => typeof value === 'string' && sha40.test(value))) {
    const approved = binding.approvedSourceSha.toLowerCase()
    if (binding.runSha.toLowerCase() !== approved) problems.push('runSha:NOT_APPROVED')
    if (binding.workflowSha.toLowerCase() !== approved) problems.push('workflowSha:NOT_APPROVED')
    if (binding.checkoutSha.toLowerCase() !== approved) problems.push('checkoutSha:NOT_APPROVED')
  }

  if (sha64.test(binding.packageSha256 ?? '') && sha64.test(binding.expectedPackageSha256 ?? '')
      && binding.packageSha256.toLowerCase() !== binding.expectedPackageSha256.toLowerCase()) {
    problems.push('packageSha256:MISMATCH')
  }

  return { allowed: problems.length === 0, problems }
}
