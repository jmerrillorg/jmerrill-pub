import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
const root = fileURLToPath(new URL('../', import.meta.url))
const require = createRequire(import.meta.url)
const ts = require('typescript')
const names = ['jm1-enterprise-design-tokens', 'jm1-enterprise-communication-renderer']
const hash = value => createHash('sha256').update(value).digest('hex')
for (const runtime of ['acs-email-relay', 'diagnostic-ai-runner']) {
  const directory = path.join(root, 'azure-functions', runtime, 'src', 'generated', 'communications')
  mkdirSync(directory, { recursive: true })
  const manifest = { sourceAuthority: 'lib/server/jm1-enterprise-communication-renderer.ts', files: {} }
  for (const name of names) {
    const source = readFileSync(path.join(root, 'lib/server', `${name}.ts`), 'utf8')
    const output = '// GENERATED from canonical TypeScript; run scripts/build_publishing_communication_runtime.mjs.\n' +
      ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
    writeFileSync(path.join(directory, `${name}.js`), output)
    manifest.files[name] = { sourceSha256: hash(source), runtimeSha256: hash(output) }
  }
  writeFileSync(path.join(directory, 'source-manifest.json'), JSON.stringify(manifest, null, 2) + '\n')
}
