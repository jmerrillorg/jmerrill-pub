import { createHash } from 'node:crypto'
import { createRequire } from 'node:module'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'

const require = createRequire(import.meta.url)
const createJiti = require('jiti')
const jiti = createJiti(import.meta.url)
const { renderAuthorCommunicationEmail } = jiti('../lib/server/author-communication-brand.ts')

const root = process.argv[2]
if (!root) {
  console.error('usage: program008_ecr_preview.mjs OUTPUT_ROOT')
  process.exit(2)
}

const titles = [
  ['the-intentional-leader', 'The Intentional Leader', 'Jackie Smith Jr.'],
  ['the-generals-will-and-last-testament', "The General's Will and Last Testament", 'Iyorwuese Hagher'],
  ['the-long-watch', 'The Long Watch', 'Jackie Smith Jr.'],
  ['establishing-glory-the-library', 'Establishing Glory: The Library', 'Jackie Smith Jr.'],
  ['before-you-were-born', 'Before You Were Born', 'Sean Arron Crowley'],
]

function sha(value) {
  return createHash('sha256').update(value, 'utf8').digest('hex')
}

const records = []
for (const [slug, title, recipient] of titles) {
  const rendered = renderAuthorCommunicationEmail({
    templateName: 'AUTHOR_REVIEW_PACKAGE_NOTIFICATION_V1',
    templateVersion: '1.0.0',
    subject: `Author Review Materials - ${title}`,
    authorName: recipient,
    titleName: title,
    preheader: `Your author review materials for ${title} are ready for review.`,
    why: `Your author review materials for ${title} are ready for review.`,
    completed: [
      'The internal editorial working manuscript was transformed into a clean author review manuscript.',
      'Author-facing notes and review instructions were prepared.',
      'Internal metadata and publisher-only material were removed.',
    ],
    meaning: 'Please review the attached manuscript and notes for editorial accuracy, author intent, factual details, and any corrections needed before this stage closes.',
    authorAction: 'Reply directly to publishing@jmerrill.one with Approved, Approved with corrections, or I have questions. You may include one consolidated correction list in your reply.',
    primaryActionLabel: 'View in Author Operating Center',
    primaryActionUrl: `https://jmerrill.pub/author/portal?action=review-package&title=${encodeURIComponent(slug)}`,
    packageInventory: [
      'Author Review Manuscript',
      'Editorial Review Guide',
    ],
    nextSteps: [
      'Jackie reviews the prepared package before any author delivery.',
      'After approval, the Publishing Team sends the package through the governed ECR and ACS workflow.',
      'The author response is processed by direct reply to publishing@jmerrill.one.',
    ],
    supportNote: 'Reply to this email if anything is unclear and the Publishing Team will help.',
    operationalNote: 'Portal access is optional. Direct email reply remains the author response path.',
  })
  const dir = join(root, 'evidence', slug, 'ecr-preview')
  mkdirSync(dir, { recursive: true })
  const htmlPath = join(dir, 'author-review-email-preview.html')
  const textPath = join(dir, 'author-review-email-preview.txt')
  writeFileSync(htmlPath, rendered.html)
  writeFileSync(textPath, rendered.text)
  records.push({
    slug,
    title,
    status: 'PASS',
    sender: 'publishing@email.jmerrill.one',
    replyTo: 'publishing@jmerrill.one',
    archive: 'publishing@jmerrill.one',
    html: htmlPath,
    htmlSha256: sha(rendered.html),
    text: textPath,
    textSha256: sha(rendered.text),
  })
}

console.log(JSON.stringify(records, null, 2))
