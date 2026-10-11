const requested = process.argv.slice(2)
if (!requested.length) {
  console.error('Provide /books/<slug> or /authors/<slug> campaign destinations.')
  process.exitCode = 2
} else {
  const origin = process.env.PUBLIC_CATALOG_ORIGIN || 'https://jmerrill.pub'
  const response = await fetch(`${origin}/api/public-catalog`)
  if (!response.ok) throw new Error(`Catalog read failed: ${response.status}`)
  const catalog = await response.json()
  if (!catalog.ok) throw new Error('Catalog projection is unavailable')
  for (const path of requested) {
    const match = /^\/(books|authors)\/([a-z0-9-]+)$/.exec(path)
    const record = match ? catalog[match[1] === 'books' ? 'titles' : 'authors'].find(item => item.slug === match[2]) : undefined
    const readiness = record?.campaignReadiness
    const page = match && record ? await fetch(`${origin}${path}`, { redirect: 'manual' }) : undefined
    const assetUrl = record?.coverUrl || record?.photoUrl
    const asset = assetUrl ? await fetch(new URL(assetUrl, origin), { method: 'HEAD', signal: AbortSignal.timeout(15000) }).catch(() => undefined) : undefined
    const imageReady = Boolean(asset?.ok && asset.headers.get('content-type')?.startsWith('image/'))
    const ready = readiness?.status === 'READY' && page?.status === 200 && imageReady
    console.log(JSON.stringify({ destination: path, status: ready ? 'READY' : 'HOLD', missing: [...(readiness?.missing || ['DESTINATION_UNVERIFIED']), ...(!imageReady ? ['IMAGE_UNREACHABLE'] : [])], httpStatus: page?.status || null, imageStatus: asset?.status || null }))
    if (!ready) process.exitCode = 1
  }
}
