import { existsSync, mkdirSync, rmSync, cpSync, writeFileSync } from 'node:fs'
import { basename, dirname, resolve } from 'node:path'
import { execFileSync } from 'node:child_process'

const releaseSha = process.env.JM1_RELEASE_SHA || process.env.GITHUB_SHA
const packageName = process.argv[2]

if (!releaseSha) {
  console.error('JM1_RELEASE_SHA or GITHUB_SHA is required.')
  process.exit(1)
}

if (!packageName) {
  console.error('Usage: node scripts/package-app-service-artifact.mjs <artifact.zip>')
  process.exit(1)
}

const standaloneDir = resolve('.next/standalone')
const staticDir = resolve('.next/static')
const publicDir = resolve('public')
const packagePath = resolve(packageName)
const packageDir = resolve('.appservice-package')
const requiredRuntimeFiles = [
  'docs/architecture/generated/JMP-CATALOG-RECONCILIATION-FINAL-2026-08-05/09-slice2-seed-manifest.json',
  'docs/operations/generated/PUBLISHING-OPERATING-CENTER-WAVE3-GOVERNED-STAGE-TRUTH-2026-09-01/11_postimplementation_408_stage_projection.csv',
  'docs/operations/generated/PUBLISHING-OPERATING-CENTER-WAVE4-WAITING-TIMER-TRUTH-2026-09-01/10_postimplementation_408_waiting_timer.csv',
  'docs/operations/generated/PUBLISHING-OPERATING-CENTER-WAVE5-ARTIFACT-AUTHORITY-2026-09-01/12_postimplementation_408_artifact_projection.csv',
]

if (!existsSync(resolve(standaloneDir, 'server.js'))) {
  console.error('Missing .next/standalone/server.js. Run npm run build first.')
  process.exit(1)
}

if (!existsSync(staticDir)) {
  console.error('Missing .next/static. Run npm run build first.')
  process.exit(1)
}

rmSync(packageDir, { recursive: true, force: true })
rmSync(packagePath, { force: true })
rmSync(`${packagePath}.sha256`, { force: true })
mkdirSync(dirname(packagePath), { recursive: true })

cpSync(standaloneDir, packageDir, { recursive: true })
rmSync(resolve(packageDir, 'package.json'), { force: true })
mkdirSync(resolve(packageDir, '.next'), { recursive: true })
cpSync(staticDir, resolve(packageDir, '.next/static'), { recursive: true })

if (existsSync(publicDir)) {
  mkdirSync(resolve(packageDir, 'public'), { recursive: true })
  cpSync(publicDir, resolve(packageDir, 'public'), { recursive: true })
}

for (const runtimeFile of requiredRuntimeFiles) {
  const source = resolve(runtimeFile)
  if (!existsSync(source)) {
    console.error(`Missing required App Service runtime file: ${runtimeFile}`)
    process.exit(1)
  }
  const target = resolve(packageDir, runtimeFile)
  mkdirSync(dirname(target), { recursive: true })
  cpSync(source, target)
}

writeFileSync(resolve(packageDir, 'JM1_RELEASE_SHA'), `${releaseSha}\n`)

execFileSync('zip', ['-qr', packagePath, '.'], { cwd: packageDir, stdio: 'inherit' })
const checksum = execFileSync('shasum', ['-a', '256', packagePath], { encoding: 'utf8' })
writeFileSync(`${packagePath}.sha256`, checksum.replace(packagePath, basename(packagePath)))
