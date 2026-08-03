const productionUrl = process.env.GATE_W3_PRODUCTION_HEALTH_URL
const stagingUrl = process.env.GATE_W3_STAGING_HEALTH_URL
const expectedRelease = process.env.GATE_W3_EXPECTED_RELEASE

const failures = []

function requireInput(name, value, code) {
  if (!value || !value.trim()) {
    failures.push({ code, message: `${name} is required` })
  }
}

requireInput('GATE_W3_PRODUCTION_HEALTH_URL', productionUrl, 'SLOT_IDENTITY_MISSING')
requireInput('GATE_W3_STAGING_HEALTH_URL', stagingUrl, 'SLOT_IDENTITY_MISSING')

async function readHealth(label, url) {
  const started = Date.now()
  const response = await fetch(url, {
    headers: {
      'cache-control': 'no-cache',
      pragma: 'no-cache',
      'user-agent': 'JM1-GATE-W3-slot-identity-guard',
    },
  })
  const body = await response.text()
  let parsed = null
  try {
    parsed = JSON.parse(body)
  } catch {
    failures.push({ code: 'SLOT_IDENTITY_MISSING', message: `${label} response is not JSON` })
  }
  return {
    label,
    url,
    statusCode: response.status,
    responseMs: Date.now() - started,
    body: parsed,
  }
}

if (failures.length === 0) {
  const [production, staging] = await Promise.all([
    readHealth('production', productionUrl),
    readHealth('staging', stagingUrl),
  ])

  if (production.statusCode !== 200 || production.body?.status !== 'ready') {
    failures.push({
      code: 'DEPLOYED_PACKAGE_SLOT_DRIFT',
      message: 'Production health did not return 200 / ready',
      observed: { statusCode: production.statusCode, status: production.body?.status },
    })
  }

  if (staging.statusCode !== 200 || staging.body?.status !== 'ready') {
    failures.push({
      code: 'DEPLOYED_PACKAGE_SLOT_DRIFT',
      message: 'Staging health did not return 200 / ready',
      observed: { statusCode: staging.statusCode, status: staging.body?.status },
    })
  }

  if (!production.body?.environment) {
    failures.push({ code: 'SLOT_IDENTITY_MISSING', message: 'Production environment identity is missing' })
  } else if (production.body.environment !== 'production') {
    failures.push({
      code: 'PRODUCTION_SLOT_IDENTITY_MISMATCH',
      message: 'Production endpoint did not report production identity',
      observed: production.body.environment,
    })
  }

  if (!staging.body?.environment) {
    failures.push({ code: 'SLOT_IDENTITY_MISSING', message: 'Staging environment identity is missing' })
  } else if (staging.body.environment !== 'staging') {
    failures.push({
      code: 'STAGING_SLOT_IDENTITY_MISMATCH',
      message: 'Staging endpoint did not report staging identity',
      observed: staging.body.environment,
    })
  }

  if (production.body?.environment && production.body?.environment === staging.body?.environment) {
    failures.push({
      code: 'DEPLOYED_PACKAGE_SLOT_DRIFT',
      message: 'Production and staging reported the same slot identity',
      observed: production.body.environment,
    })
  }

  if (!production.body?.release || !staging.body?.release) {
    failures.push({ code: 'DEPLOYED_PACKAGE_SLOT_DRIFT', message: 'Release identity is missing from one or both slots' })
  }

  if (expectedRelease) {
    if (production.body?.release !== expectedRelease) {
      failures.push({
        code: 'DEPLOYED_PACKAGE_SLOT_DRIFT',
        message: 'Production release identity does not match expected release',
        observed: production.body?.release,
        expected: expectedRelease,
      })
    }
    if (staging.body?.release !== expectedRelease) {
      failures.push({
        code: 'DEPLOYED_PACKAGE_SLOT_DRIFT',
        message: 'Staging release identity does not match expected release',
        observed: staging.body?.release,
        expected: expectedRelease,
      })
    }
  }

  const result = {
    status: failures.length === 0 ? 'PASS' : 'FAIL',
    checkedAt: new Date().toISOString(),
    expectedRelease: expectedRelease || null,
    production,
    staging,
    failures,
  }

  console.log(JSON.stringify(result, null, 2))
} else {
  console.log(JSON.stringify({ status: 'FAIL', checkedAt: new Date().toISOString(), failures }, null, 2))
}

if (failures.length > 0) {
  process.exitCode = 1
}
