#!/usr/bin/env node

import { existsSync, readdirSync, rmSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const solutionRoot = 'powerplatform/solutions/JM1PublishingSales/src'

function read(path) {
  return readFileSync(path, 'utf8')
}

function write(path, body) {
  writeFileSync(path, body, 'utf8')
}

function removeDir(path) {
  if (existsSync(path)) rmSync(path, { recursive: true, force: true })
}

function removeAttributeBlocks(entityName, predicate) {
  const path = join(solutionRoot, 'Entities', entityName, 'Entity.xml')
  if (!existsSync(path)) return []
  const body = read(path)
  const removed = []
  const next = body.replace(
    /\n\s*<attribute PhysicalName="([^"]+)"[\s\S]*?\n\s*<\/attribute>/g,
    (block, physicalName) => {
      const logicalName = block.match(/<LogicalName>([^<]+)<\/LogicalName>/)?.[1] ?? ''
      const optionSet = block.match(/<OptionSetName>([^<]+)<\/OptionSetName>/)?.[1] ?? ''
      if (!predicate({ physicalName, logicalName, optionSet, block })) return block
      removed.push({ entityName, physicalName, logicalName, optionSet })
      return ''
    },
  )
  write(path, next)
  return removed
}

function removeControls(entityName, logicalNames) {
  const entityDir = join(solutionRoot, 'Entities', entityName)
  if (!existsSync(entityDir)) return []
  const removed = []
  const files = []
  const walk = (dir) => {
    for (const name of readdirSync(dir)) {
      const path = join(dir, name)
      if (statSync(path).isDirectory()) walk(path)
      else if (path.endsWith('.xml')) files.push(path)
    }
  }
  walk(entityDir)
  for (const file of files) {
    const body = read(file)
    let next = body
    for (const logicalName of logicalNames) {
      const pattern = new RegExp(`\\n\\s*<control[^>]+datafieldname="${logicalName}"[^>]*/>`, 'g')
      const matches = next.match(pattern) ?? []
      if (matches.length) removed.push({ file, logicalName, count: matches.length })
      next = next.replace(pattern, '')
    }
    if (next !== body) write(file, next)
  }
  return removed
}

function removeRootComponents(solutionXml) {
  let next = solutionXml
  for (const schemaName of ['account', 'contact']) {
    next = next.replace(
      new RegExp(`\\n\\s*<RootComponent type="1" schemaName="${schemaName}" behavior="0" />`, 'g'),
      '',
    )
  }
  next = next.replace(/\n\s*<RootComponent type="60" id="\{[^"]+\}" \/>/g, '')
  return next
}

function removeMissingDependencies(solutionXml) {
  return solutionXml.replace(
    /\n\s*<MissingDependencies>[\s\S]*?\n\s*<\/MissingDependencies>/,
    '\n    <MissingDependencies />',
  )
}

function removeRelationshipIndexEntries() {
  const path = join(solutionRoot, 'Other', 'Relationships.xml')
  if (!existsSync(path)) return []
  const removed = []
  const names = [
    'jm1_opportunity_LinkedProject_jm1_project',
    'account_master_account',
    'contact_master_contact',
  ]
  let body = read(path)
  for (const name of names) {
    const pattern = new RegExp(`\\n\\s*<EntityRelationship Name="${name}" />`, 'g')
    if (pattern.test(body)) removed.push(name)
    body = body.replace(pattern, '')
  }
  write(path, body)
  return removed
}

const removed = {
  directories: [],
  attributes: [],
  controls: [],
  relationships: [],
}

for (const dir of [
  join(solutionRoot, 'Entities', 'Account'),
  join(solutionRoot, 'Entities', 'Contact'),
  join(solutionRoot, 'InteractionCentricDashboards'),
]) {
  if (existsSync(dir)) removed.directories.push(dir)
  removeDir(dir)
}

removed.attributes.push(
  ...removeAttributeBlocks('Lead', ({ logicalName }) => logicalName.startsWith('jm1_')),
)

const removedOpportunityNames = new Set()
removed.attributes.push(
  ...removeAttributeBlocks('Opportunity', ({ logicalName, optionSet }) => {
    const remove =
      logicalName.startsWith('jm1_') ||
      ['jm1_genrechoice', 'jm1_manuscripttype', 'jm1_primarylanguage', 'jm1_trimsizechoice'].includes(
        optionSet,
      )
    if (remove) removedOpportunityNames.add(logicalName)
    return remove
  }),
)
removed.controls.push(...removeControls('jm1pub_publishingopportunityprocess', removedOpportunityNames))

removeDir(join(solutionRoot, 'Other', 'Relationships', 'jm1_Project.xml'))
removed.relationships.push(...removeRelationshipIndexEntries())

const solutionXmlPath = join(solutionRoot, 'Other', 'Solution.xml')
let solutionXml = read(solutionXmlPath)
solutionXml = removeRootComponents(solutionXml)
solutionXml = removeMissingDependencies(solutionXml)
write(solutionXmlPath, solutionXml)

console.log(JSON.stringify({ removed }, null, 2))
