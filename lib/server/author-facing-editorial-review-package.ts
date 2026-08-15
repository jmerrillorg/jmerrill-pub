// Engine: Author-Facing Editorial Review Package
// Reusable? Y
// Stage-specific exception? N

import { createHash } from 'node:crypto'

import type { PackageArtifactInput } from './author-review-package-engine'
import {
  buildTitleSuggestionRequest,
  createTitleSelectionTask,
  displayTitle,
  isWorkingTitle,
  type TitleSelectionTask,
  type TitleSuggestionRequest,
} from './working-title-policy'

export type EditorialReviewPresentationInput = {
  titleId: string
  stageId: string
  gateId: string
  authorId: string
  authorName: string
  titleName: string
  intakeReference: string
  sourceArtifactId: string
  sourceChecksum: string
  stage0DiagnosticId: string
  packageVersion: string
  generatedAt: string
  reviewSummary: string
  manuscriptStrengths: string[]
  editorialOpportunities: string[]
  recommendedPath: string
  stageRecommendation: string
  importantObservations: string[]
  nextStageLabel: string
  primaryPackage?: string
  backupPackage?: string
  recommendedImprint?: string
  suggestedTitles?: string[]
}

export type EditorialReviewWorkspacePresentation = {
  stage: 'EDITORIAL_REVIEW'
  titleLabel: 'Working Title' | 'Title'
  displayTitle: string
  authorName: string
  sections: Array<{ heading: string; body: string[] }>
  decisionOptions: [
    'SELECT_RECOMMENDED_PACKAGE',
    'SELECT_BACKUP_PACKAGE',
    'QUESTIONS_OR_CLARIFICATION_REQUESTED',
  ]
  titleSelectionTask: TitleSelectionTask | null
  versionLabel: string
}

export type AuthorFacingEditorialReviewPackage = {
  packageType: 'EDITORIAL_REVIEW'
  packageVersion: string
  workspacePresentation: EditorialReviewWorkspacePresentation
  artifacts: PackageArtifactInput[]
  titleSuggestionRequest: TitleSuggestionRequest | null
  titleSelectionTask: TitleSelectionTask | null
  idempotencyKey: string
  packageChecksum: string
}

export function buildAuthorFacingEditorialReviewPackage(
  input: EditorialReviewPresentationInput,
): AuthorFacingEditorialReviewPackage {
  const title = displayTitle(input.titleName)
  const workingTitle = isWorkingTitle(input.titleName)
  const idempotencyKey = [
    'author-facing-editorial-review-package',
    input.titleId,
    input.stageId,
    input.gateId,
    input.sourceArtifactId,
    input.sourceChecksum,
    input.packageVersion,
  ].join(':')
  const titleSuggestionRequest = workingTitle
    ? buildTitleSuggestionRequest({
        sourceArtifactId: input.sourceArtifactId,
        sourceChecksum: input.sourceChecksum,
        context: {
          stage0DiagnosticSummary: input.reviewSummary,
          centralSubject: firstNonempty(input.importantObservations),
          manuscriptTheme: firstNonempty(input.manuscriptStrengths),
          intendedAudience: '',
          tone: '',
          genre: '',
          authorVoice: '',
          recurringConcepts: input.editorialOpportunities.slice(0, 5),
        },
      })
    : null
  const titleSelectionTask = workingTitle
    ? createTitleSelectionTask({
        titleId: input.titleId,
        gateId: input.gateId,
        sourceArtifactId: input.sourceArtifactId,
        sourceChecksum: input.sourceChecksum,
        suggestedTitles: input.suggestedTitles || [],
      })
    : null
  const workspacePresentation: EditorialReviewWorkspacePresentation = {
    stage: 'EDITORIAL_REVIEW',
    titleLabel: workingTitle ? 'Working Title' : 'Title',
    displayTitle: title,
    authorName: normalize(input.authorName) || 'Author',
    sections: [
      section('What we found', input.reviewSummary),
      section('Manuscript strengths', ...input.manuscriptStrengths),
      section('Editorial opportunities', ...input.editorialOpportunities),
      section('Primary publishing recommendation', input.primaryPackage || input.recommendedPath),
      section('Backup publishing recommendation', input.backupPackage || 'None'),
      section('Recommended imprint', input.recommendedImprint || 'To be confirmed by the publishing team'),
      section('Important observations', ...input.importantObservations),
      section(
        'What happens next',
        'Choose the publishing package and path you want to pursue.',
        'Agreement, payment, and onboarding steps happen after package selection.',
        'Editorial production work begins only after the commercial onboarding boundary is complete.',
      ),
    ],
    decisionOptions: [
      'SELECT_RECOMMENDED_PACKAGE',
      'SELECT_BACKUP_PACKAGE',
      'QUESTIONS_OR_CLARIFICATION_REQUESTED',
    ],
    titleSelectionTask,
    versionLabel: `Editorial Review package ${input.packageVersion} - ${dateLabel(input.generatedAt)}`,
  }
  const artifacts = buildArtifacts(input, workspacePresentation)
  const packageChecksum = sha256(JSON.stringify({
    idempotencyKey,
    packageVersion: input.packageVersion,
    sourceArtifactId: input.sourceArtifactId,
    sourceChecksum: input.sourceChecksum,
    artifacts: artifacts.map((artifact) => ({
      role: artifact.role,
      filename: artifact.filename,
      checksum: artifact.checksum,
      sourceVersion: artifact.sourceVersion,
    })),
    titleSelectionTask: titleSelectionTask?.idempotencyKey || '',
  }))

  return {
    packageType: 'EDITORIAL_REVIEW',
    packageVersion: input.packageVersion,
    workspacePresentation,
    artifacts,
    titleSuggestionRequest,
    titleSelectionTask,
    idempotencyKey,
    packageChecksum,
  }
}

function buildArtifacts(
  input: EditorialReviewPresentationInput,
  presentation: EditorialReviewWorkspacePresentation,
): PackageArtifactInput[] {
  const title = presentation.displayTitle
  const base = {
    createdAt: input.generatedAt,
    stageId: input.stageId,
    titleId: input.titleId,
    authorVisible: true,
    canMaterializeForEmail: true,
    canRender: true,
  }
  const assessmentPdf = pdfBytes([
    'Editorial Review',
    `Title: ${title}`,
    `Author: ${presentation.authorName}`,
    `Version: ${presentation.versionLabel}`,
    '',
    ...presentation.sections.flatMap((section) => [
      section.heading,
      ...section.body.map((line) => `- ${line}`),
      '',
    ]),
  ].join('\n'))
  const pathPdf = pdfBytes([
    'Publishing Path Recommendation',
    `Title: ${title}`,
    `Primary recommendation: ${input.primaryPackage || input.recommendedPath}`,
    `Backup recommendation: ${input.backupPackage || 'None'}`,
    `Recommended imprint: ${input.recommendedImprint || 'To be confirmed by the publishing team'}`,
    '',
    'This recommendation helps the author choose a publishing path. It does not finalize the title, publish the book, create a contract, or approve an active-author editorial stage.',
  ].join('\n'))
  const instructions = [
    'Editorial Review Recommendation Instructions',
    `Title: ${title}`,
    `Author: ${presentation.authorName}`,
    '',
    'Please review the Editorial Review summary and publishing recommendation.',
    'Choose the publishing package and path you want to pursue, or ask questions if you would like help deciding.',
    'If the manuscript is using the working title Untitled, you may provide a title, select one suggested title, or keep Untitled for now.',
    'Agreement, payment, and onboarding steps happen after package selection.',
    'Editorial production work begins only after the commercial onboarding boundary is complete.',
  ].join('\n')

  return [
    artifact({
      ...base,
      artifactId: `${input.gateId}:editorial-review-assessment:${input.packageVersion}`,
      role: 'assessment',
      filename: authorFacingFileName(title, 'Editorial Review Assessment', 'pdf'),
      mimeType: 'application/pdf',
      bytes: assessmentPdf,
      sourceVersion: `${input.sourceArtifactId}:${input.sourceChecksum}:assessment:${input.packageVersion}`,
      emailAttachment: true,
      workspaceDownload: true,
    }),
    artifact({
      ...base,
      artifactId: `${input.gateId}:recommended-editorial-path:${input.packageVersion}`,
      role: 'recommendedEditorialPath',
      filename: authorFacingFileName(title, 'Recommended Editorial Path', 'pdf'),
      mimeType: 'application/pdf',
      bytes: pathPdf,
      sourceVersion: `${input.sourceArtifactId}:${input.sourceChecksum}:recommended-path:${input.packageVersion}`,
      emailAttachment: false,
      workspaceDownload: true,
    }),
    artifact({
      ...base,
      artifactId: `${input.gateId}:editorial-review-instructions:${input.packageVersion}`,
      role: 'reviewInstructions',
      filename: authorFacingFileName(title, 'Editorial Review Instructions', 'txt'),
      mimeType: 'text/plain',
      bytes: Buffer.from(instructions, 'utf8'),
      sourceVersion: `${input.sourceArtifactId}:${input.sourceChecksum}:instructions:${input.packageVersion}`,
      emailAttachment: true,
      workspaceDownload: true,
    }),
  ]
}

function artifact(input: Omit<PackageArtifactInput, 'fileSize' | 'checksum' | 'contentBytesBase64'> & { bytes: Buffer }): PackageArtifactInput {
  const { bytes, ...artifactInput } = input
  return {
    ...artifactInput,
    fileSize: bytes.byteLength,
    checksum: sha256(bytes),
    contentBytesBase64: bytes.toString('base64'),
  }
}

function pdfBytes(text: string) {
  const safeLines = wrapPdfText(text)
    .slice(0, 42)
    .map((line) => line.replace(/[()\\]/g, ' '))
  const textStream = [
    'BT /F1 11 Tf 72 720 Td',
    ...safeLines.flatMap((line, index) => [
      index === 0 ? '' : '0 -16 Td',
      `(${line}) Tj`,
    ]).filter(Boolean),
    'ET',
  ].join('\n')
  const body = [
    '%PDF-1.7',
    '1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj',
    '2 0 obj << /Type /Pages /Count 1 /Kids [3 0 R] >> endobj',
    '3 0 obj << /Type /Page /Parent 2 0 R /Resources << >> /MediaBox [0 0 612 792] /Contents 4 0 R >> endobj',
    `4 0 obj << /Length ${textStream.length} >> stream`,
    textStream,
    'endstream endobj',
    `% author-facing review package ${'content '.repeat(400)}`,
    '%%EOF',
  ].join('\n')
  return Buffer.from(body, 'utf8')
}

function wrapPdfText(text: string) {
  const words = text.replace(/\s+/g, ' ').trim().split(' ').filter(Boolean)
  const lines: string[] = []
  let current = ''
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word
    if (candidate.length > 78) {
      if (current) lines.push(current)
      current = word
    } else {
      current = candidate
    }
  }
  if (current) lines.push(current)
  return lines
}

function authorFacingFileName(title: string, label: string, extension: string) {
  const safeTitle = normalize(title).replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '') || 'Untitled'
  const safeLabel = label.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '')
  return `${safeTitle}-${safeLabel}.${extension}`
}

function section(heading: string, ...body: string[]) {
  return { heading, body: body.map(normalize).filter(Boolean) }
}

function firstNonempty(values: string[]) {
  return values.map(normalize).find(Boolean) || ''
}

function dateLabel(value: string) {
  return value.slice(0, 10) || value
}

function normalize(value: string) {
  return String(value || '').trim().replace(/\s+/g, ' ')
}

function sha256(value: string | Buffer) {
  return createHash('sha256').update(value).digest('hex')
}
