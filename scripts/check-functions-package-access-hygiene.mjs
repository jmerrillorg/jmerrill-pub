import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const root = process.cwd()
const trackedFiles = execFileSync('git', ['ls-files'], { encoding: 'utf8' })
  .split('\n')
  .map((file) => file.trim())
  .filter(Boolean)

const scannedPrefixes = [
  '.github/',
  'azure-functions/',
  'docs/',
  'infra/',
  'scripts/',
]

const packageSettingPattern = /WEBSITE_RUN_FROM_PACKAGE\s*[:=]\s*["']?https?:\/\/[^\s"']+/gi
const packageUrlPattern = /https:\/\/[a-z0-9]{3,24}\.(?:blob|dfs)\.core\.windows\.net\/[^\s"']+\.zip\?[^\s"']+/gi
const sasQueryPattern = /[?&](?:sig|se|sp|sv|skoid|sktid|skt|ske|sks|skv)=/i

const findings = []

for (const file of trackedFiles) {
  if (!scannedPrefixes.some((prefix) => file.startsWith(prefix))) continue

  let contents
  try {
    contents = readFileSync(join(root, file), 'utf8')
  } catch {
    continue
  }

  for (const match of contents.matchAll(packageSettingPattern)) {
    if (sasQueryPattern.test(match[0])) {
      findings.push({
        file,
        type: 'WEBSITE_RUN_FROM_PACKAGE_SAS_URL',
      })
    }
  }

  for (const match of contents.matchAll(packageUrlPattern)) {
    if (sasQueryPattern.test(match[0])) {
      findings.push({
        file,
        type: 'PACKAGE_ZIP_SAS_URL',
      })
    }
  }
}

if (findings.length) {
  console.error('SAS-bearing Function package references are not allowed in committed files.')
  for (const finding of findings) {
    console.error(`${finding.file}: ${finding.type}`)
  }
  process.exit(1)
}

console.log('Function package-access hygiene guard passed: no SAS-bearing package URLs found.')
