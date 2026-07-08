import { readFileSync } from 'node:fs'
import { relative, resolve } from 'node:path'
import { execFileSync } from 'node:child_process'

const repoRoot = resolve(new URL('..', import.meta.url).pathname)
const runtimeRoots = ['app', 'components', 'lib']
const patterns = [
  /from\s+['"]@\/data\/books\.json['"]/,
  /from\s+['"]\.\.?\/.*data\/books\.json['"]/,
  /require\(['"].*data\/books\.json['"]\)/,
]

const files = execFileSync('git', ['ls-files', ...runtimeRoots], {
  cwd: repoRoot,
  encoding: 'utf8',
})
  .split('\n')
  .filter((file) => /\.(ts|tsx|js|jsx|mjs|cjs)$/.test(file))

const violations = []

for (const file of files) {
  const absolute = resolve(repoRoot, file)
  const source = readFileSync(absolute, 'utf8')
  if (!patterns.some((pattern) => pattern.test(source))) continue

  violations.push(relative(repoRoot, absolute))
}

if (violations.length > 0) {
  console.error('Runtime catalog source guard failed.')
  console.error('Do not add runtime imports of data/books.json. Dataverse is the catalog source of truth.')
  for (const violation of violations) {
    console.error(`- ${violation}`)
  }
  process.exit(1)
}

console.log('Catalog runtime source guard passed.')
