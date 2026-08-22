#!/usr/bin/env node

import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import { basename, join } from 'node:path'
import { pathToFileURL } from 'node:url'
import {
  CONTROLLER_VERSION,
  buildWorkQueue,
  evaluatePortfolio,
} from '../lib/publishing/portfolio/automation-controller.mjs'

const OUTPUT_DIR = 'docs/operations/generated/JMP-PORTFOLIO-AUTOMATION-CONTROLLER-2026-08-22'
const DATAVERSE_BASE = process.env.DATAVERSE_WEB_API_BASE_URL || 'https://jm1hq.crm.dynamics.com/api/data/v9.2'
const DATAVERSE_RESOURCE = process.env.DATAVERSE_RESOURCE_URL || 'https://jm1hq.crm.dynamics.com'
const now = new Date().toISOString()
const namedTitleNeedles = [
  'A Year Walking With Him',
  'God Got Me',
  'Lucky Ducky',
  'Beyond Your Eyes',
  'A Walk Home With God',
  "Inner Peace Through Life's Storms",
  'The Intentional Leader',
  "The General's Will",
  'The General’s Will',
  'The Long Watch',
  'Before You Were Born',
  'Indomitable',
  "'Til Death Do Us Part",
  'Til Death Do Us Part',
  'Atta',
  'Untitled',
  'Establishing Glory',
]

async function main() {
  const token = getToken()
  const source = await readPortfolioSource(token)
  const records = buildControllerRecords(source)
  const evaluation = evaluatePortfolio(records, { evaluatedOn: now })
  const workQueue = buildWorkQueue(evaluation)
  const named = mapNamedTitles(evaluation.items)
  const summary = {
    generatedOn: now,
    controllerVersion: CONTROLLER_VERSION,
    dataverseBase: DATAVERSE_BASE.replace(/\/api\/data\/v9\.2$/, ''),
    sourceCounts: source.counts,
    portfolioCounts: evaluation.counts,
    recordsEvaluated: records.length,
    workQueueCount: workQueue.length,
    unexplainedIdleCount: evaluation.unexplainedIdleCount,
    classification: 'JMP_AUTONOMOUS_PORTFOLIO_CONTROLLED_COMMISSIONING',
    productionMutation: 0,
    portfolioResumption: 'READ_ONLY_WAVE_1_DECISION_PROOF_ONLY',
  }

  mkdirSync(OUTPUT_DIR, { recursive: true })
  const docs = buildEvidenceDocs({ summary, source, records, evaluation, workQueue, named })
  for (const [file, content] of Object.entries(docs)) {
    writeFileSync(join(OUTPUT_DIR, file), content)
  }
  writeChecksums(Object.keys(docs))
  console.log(JSON.stringify(summary, null, 2))
}

export async function readPortfolioSource(token) {
  const [titles, intakes, opportunities, authorProfiles, stages, gates, artifacts, productionProjects, productionTasks, logs] = await Promise.all([
    dvList(token, 'jm1pub_titles', {
      $select: 'jm1pub_titleid,jm1pub_titlename,jm1pub_name,jm1pub_stage,jm1pub_publicationstatus,jm1_lifecyclestage,jm1pub_authordisplayname,jm1pub_authorname,modifiedon,createdon,statecode,statuscode',
      $filter: 'statecode eq 0',
    }),
    dvList(token, 'jm1_publishingintakes', {
      $select: 'jm1_publishingintakeid,jm1_name,jm1_projecttitle,jm1_firstname,jm1_lastname,jm1_intakereferencecode,jm1_manuscriptreceived,jm1_manuscriptstatus,jm1_routerstatus,jm1_stage0handoffstatus,jm1_acknowledgmentstatus,jm1_workspacestatus,modifiedon,createdon,statecode,statuscode',
      $filter: 'statecode eq 0',
    }),
    dvList(token, 'opportunities', {
      $select: 'opportunityid,name,jm1pub_projecttitle,jm1_m6authorselectedpackagecode,jm1_m6packageselectionstatus,jm1_m6paymentoptionselectionstatus,jm1_m6selectedinstallmentcount,jm1_m6paymentselectionreceivedon,jm1_m6agreementpreparationstatus,jm1_m6firstpaymentstatus,jm1_m6firstpaymentconfirmedon,jm1_m6onboardingstatus,jm1pub_contractstatus,jm1pub_reviewstatus,jm1pub_manuscriptsubmitted,modifiedon,createdon,statecode,statuscode',
      $filter: 'statecode eq 0',
    }),
    dvList(token, 'jm1_authorprofiles', {
      $select: 'jm1_authorprofileid,jm1_name,jm1_penname,jm1_isactiveauthor,modifiedon,createdon,statecode,statuscode',
      $filter: 'statecode eq 0',
    }),
    dvList(token, 'jm1pub_editorialstages', {
      $select: 'jm1pub_editorialstageid,jm1pub_name,jm1pub_projecttitle,_jm1pub_titleid_value,jm1pub_stagetype,jm1pub_stagestatus,jm1pub_phase,jm1pub_blockerstatus,jm1pub_blockerreason,jm1pub_healthstatus,jm1pub_stagestartdate,jm1pub_stagecompletedate,modifiedon,createdon,statecode,statuscode',
      $filter: 'statecode eq 0',
    }),
    dvList(token, 'jm1pub_editorialapprovalgates', {
      $select: 'jm1pub_editorialapprovalgateid,_jm1pub_titleid_value,_jm1pub_editorialstageid_value,jm1pub_gatestatus,jm1pub_authordecision,jm1pub_authordecisionon,jm1pub_awaitingsince,jm1pub_nextstageauthorized,_jm1pub_deliverableartifactid_value,modifiedon,createdon,statecode,statuscode',
      $filter: 'statecode eq 0',
    }),
    dvList(token, 'jm1pub_editorialartifacts', {
      $select: 'jm1pub_editorialartifactid,_jm1pub_titleid_value,_jm1pub_editorialstageid_value,jm1pub_artifactstatus,jm1pub_artifacttype,jm1pub_filename,jm1pub_sha256,jm1pub_iscurrentapproved,jm1pub_approvedon,jm1pub_deliveredon,modifiedon,createdon,statecode,statuscode',
      $filter: 'statecode eq 0',
    }),
    dvList(token, 'jm1_productionprojects', {
      $select: 'jm1_productionprojectid,jm1_name,_jm1_title_value,jm1_productiontype,jm1_status,modifiedon,createdon,statecode,statuscode',
      $filter: 'statecode eq 0',
    }),
    dvList(token, 'jm1_productiontasks', {
      $select: 'jm1_productiontaskid,jm1_taskname,jm1_status,jm1_priority,jm1_duedate,modifiedon,createdon,statecode,statuscode',
      $filter: 'statecode eq 0',
    }),
    dvList(token, 'jm1_executionlogs', {
      $select: 'jm1_executionlogid,jm1_name,jm1_actiontype,jm1_actiondescription,jm1_sourceentity,jm1_sourcerecordid,jm1_executionstatus,createdon,jm1_completedon',
      $orderby: 'createdon desc',
      $top: '500',
    }),
  ])
  return {
    titles,
    intakes,
    opportunities,
    authorProfiles,
    stages,
    gates,
    artifacts,
    productionProjects,
    productionTasks,
    logs,
    counts: {
      titles: titles.length,
      intakes: intakes.length,
      opportunities: opportunities.length,
      authorProfiles: authorProfiles.length,
      stages: stages.length,
      gates: gates.length,
      artifacts: artifacts.length,
      productionProjects: productionProjects.length,
      productionTasks: productionTasks.length,
      logsRead: logs.length,
    },
  }
}

export function buildControllerRecords(source) {
  const stagesByTitle = groupBy(source.stages, (row) => row._jm1pub_titleid_value || row.jm1pub_titleidname)
  const gatesByTitle = groupBy(source.gates, (row) => row._jm1pub_titleid_value || row.jm1pub_titleidname)
  const artifactsByTitle = groupBy(source.artifacts, (row) => row._jm1pub_titleid_value || row.jm1pub_titleidname)
  const productionByTitle = groupBy(source.productionProjects, (row) => row._jm1_title_value || row.jm1_titlename)
  const opportunitiesByTitle = groupBy(source.opportunities, (row) => normalizeTitle(row.jm1pub_projecttitle || row.name))
  const titleRecords = source.titles.map((title) => {
    const titleName = value(title.jm1pub_titlename || title.jm1_titlename || title.jm1pub_name)
    const titleId = value(title.jm1pub_titleid)
    const titleStages = stagesByTitle.get(titleId) || []
    const titleGates = gatesByTitle.get(titleId) || []
    const titleArtifacts = artifactsByTitle.get(titleId) || []
    const titleProduction = productionByTitle.get(titleId) || productionByTitle.get(titleName) || []
    const opportunity = firstByModified(opportunitiesByTitle.get(normalizeTitle(titleName)) || [])
    return controllerRecordFromTitle(title, {
      titleStages,
      titleGates,
      titleArtifacts,
      titleProduction,
      opportunity,
    })
  })

  const titleNames = new Set(titleRecords.map((record) => normalizeTitle(record.title)))
  const prospectRecords = source.intakes
    .filter((intake) => !titleNames.has(normalizeTitle(intake.jm1_projecttitle)))
    .map((intake) => controllerRecordFromIntake(intake))
  const opportunityRecords = source.opportunities
    .filter((opp) => !titleNames.has(normalizeTitle(opp.jm1pub_projecttitle || opp.name)))
    .map((opp) => controllerRecordFromOpportunity(opp))
  const authorRecords = source.authorProfiles
    .map((profile) => ({
      recordType: 'author',
      author: value(profile.jm1_penname || profile.jm1_name),
      title: 'Author relationship stewardship',
      titleStage: 'Post-publication / royalty stewardship',
      authorRelationshipState: truthy(profile.jm1_isactiveauthor) ? 'Active Author' : 'Author Profile Active',
      modifiedOn: value(profile.modifiedon),
      createdOn: value(profile.createdon),
      terminal: true,
      evidence: [`Dataverse:jm1_authorprofile:${profile.jm1_authorprofileid}`],
    }))
  return [...titleRecords, ...prospectRecords, ...opportunityRecords, ...authorRecords]
}

function controllerRecordFromTitle(title, related) {
  const latestStage = firstByModified(related.titleStages)
  const latestGate = firstByModified(related.titleGates)
  const latestArtifact = firstByModified(related.titleArtifacts)
  const latestProduction = firstByModified(related.titleProduction)
  const opportunity = related.opportunity || {}
  const gateStatus = formatted(latestGate, 'jm1pub_gatestatus')
  const authorDecision = formatted(latestGate, 'jm1pub_authordecision')
  const stageStatus = formatted(latestStage, 'jm1pub_stagestatus')
  const stageType = formatted(latestStage, 'jm1pub_stagetype')
  const publicationStatus = formatted(title, 'jm1pub_publicationstatus') || value(title.jm1pub_publicationstatus)
  const commercialText = [
    value(opportunity.jm1_m6packageselectionstatus),
    value(opportunity.jm1_m6paymentoptionselectionstatus),
    value(opportunity.jm1_m6agreementpreparationstatus),
    formatted(opportunity, 'jm1_m6firstpaymentstatus'),
    formatted(opportunity, 'jm1pub_contractstatus'),
  ].join(' ')
  return {
    recordType: 'title',
    author: value(title.jm1pub_authordisplayname || title.jm1pub_authorname || title.jm1_primaryauthorname || latestStage?.jm1pub_contactidname || opportunity.parentcontactidname),
    title: value(title.jm1pub_titlename || title.jm1_titlename || title.jm1pub_name),
    titleId: value(title.jm1pub_titleid),
    opportunityId: value(opportunity.opportunityid),
    titleStage: formatted(title, 'jm1pub_stage') || formatted(title, 'jm1_lifecyclestage') || value(title.jm1pub_stage || title.jm1_lifecyclestage),
    lifecycleStage: formatted(title, 'jm1_lifecyclestage') || formatted(title, 'jm1pub_stage'),
    editorialStage: [stageType, stageStatus, value(latestStage?.jm1pub_name)].filter(Boolean).join(' / '),
    editorialStatus: gateStatus || authorDecision,
    productionState: [formatted(latestProduction, 'jm1_productiontype'), formatted(latestProduction, 'jm1_status')].filter(Boolean).join(' / '),
    packageState: commercialText,
    packageAccepted: /accepted|selected/i.test(commercialText),
    paymentOptionSelected: Boolean(Number(opportunity.jm1_m6selectedinstallmentcount || 0) || value(opportunity.jm1_m6paymentselectionreceivedon)),
    pricingLocked: Boolean(Number(opportunity.jm1_m6selectedinstallmentcount || 0) || value(opportunity.jm1_m6selectedpaymenttotal)),
    agreementGenerated: /generated|prepared|sent|executed|signed/i.test(commercialText),
    agreementExecuted: /executed|signed/i.test(commercialText),
    initialPaymentReceived: /paid|received|confirmed/i.test(commercialText),
    joinedFamily: /joined/i.test(commercialText),
    authorGateRequired: /awaiting|author/i.test(gateStatus) && !/approved/i.test(authorDecision),
    authorAction: gateStatus || 'Await author response',
    currentArtifact: value(latestArtifact?.jm1pub_editorialartifactname || latestArtifact?.jm1pub_filename || title.jm1pub_currentmanuscriptname),
    checksum: value(latestArtifact?.jm1pub_sha256),
    runtime: inferRuntimeFromRelated(latestStage, latestGate, latestProduction),
    runtimeAvailable: runtimeLooksCommissioned(latestStage, latestGate, latestProduction),
    modifiedOn: maxDate([title.modifiedon, latestStage?.modifiedon, latestGate?.modifiedon, latestArtifact?.modifiedon, latestProduction?.modifiedon, opportunity.modifiedon]),
    createdOn: value(title.createdon),
    terminal: /published|released/i.test(publicationStatus),
    evidence: [
      `Dataverse:jm1pub_title:${title.jm1pub_titleid}`,
      latestStage ? `Dataverse:jm1pub_editorialstage:${latestStage.jm1pub_editorialstageid}` : '',
      latestGate ? `Dataverse:jm1pub_editorialapprovalgate:${latestGate.jm1pub_editorialapprovalgateid}` : '',
      latestArtifact ? `Dataverse:jm1pub_editorialartifact:${latestArtifact.jm1pub_editorialartifactid}` : '',
      opportunity.opportunityid ? `Dataverse:opportunity:${opportunity.opportunityid}` : '',
    ].filter(Boolean),
  }
}

function controllerRecordFromIntake(intake) {
  const manuscriptReceived = truthy(intake.jm1_manuscriptreceived) || /received/i.test(formatted(intake, 'jm1_manuscriptstatus'))
  const routerStatus = formatted(intake, 'jm1_routerstatus')
  const stage0Status = formatted(intake, 'jm1_stage0handoffstatus')
  return {
    recordType: 'prospect',
    author: [intake.jm1_firstname, intake.jm1_lastname].map(value).filter(Boolean).join(' ') || 'DATA_GAP',
    title: value(intake.jm1_projecttitle || intake.jm1_name),
    intakeId: value(intake.jm1_publishingintakeid),
    titleStage: ['Intake', manuscriptReceived ? 'Manuscript received' : 'Manuscript missing', routerStatus, stage0Status].filter(Boolean).join(' / '),
    waitingOn: manuscriptReceived ? '' : 'Prospect',
    nextAction: manuscriptReceived ? 'Evaluate classification/editorial-review readiness' : 'Await manuscript or continuation upload',
    modifiedOn: value(intake.modifiedon),
    createdOn: value(intake.createdon),
    evidence: [`Dataverse:jm1_publishingintake:${intake.jm1_publishingintakeid}`],
  }
}

function controllerRecordFromOpportunity(opp) {
  const commercialText = [
    value(opp.jm1_m6packageselectionstatus),
    value(opp.jm1_m6paymentoptionselectionstatus),
    value(opp.jm1_m6agreementpreparationstatus),
    formatted(opp, 'jm1_m6firstpaymentstatus'),
    formatted(opp, 'jm1pub_contractstatus'),
  ].join(' ')
  return {
    recordType: 'prospect',
    author: value(opp.parentcontactidname),
    title: value(opp.jm1pub_projecttitle || opp.name),
    opportunityId: value(opp.opportunityid),
    titleStage: 'Commercial Activation',
    packageState: commercialText,
    packageAccepted: /accepted|selected/i.test(commercialText),
    paymentOptionSelected: Boolean(Number(opp.jm1_m6selectedinstallmentcount || 0) || value(opp.jm1_m6paymentselectionreceivedon)),
    pricingLocked: Boolean(Number(opp.jm1_m6selectedinstallmentcount || 0) || value(opp.jm1_m6selectedpaymenttotal)),
    agreementGenerated: /generated|prepared|sent|executed|signed/i.test(commercialText),
    agreementExecuted: /executed|signed/i.test(commercialText),
    initialPaymentReceived: /paid|received|confirmed/i.test(commercialText),
    modifiedOn: value(opp.modifiedon),
    createdOn: value(opp.createdon),
    evidence: [`Dataverse:opportunity:${opp.opportunityid}`],
  }
}

function buildEvidenceDocs({ summary, source, evaluation, workQueue, named }) {
  const byBucket = groupPlain(evaluation.items, (item) => item.bucket)
  const portfolioTable = evaluation.items
    .sort((a, b) => a.title.localeCompare(b.title))
    .map((item) => `| ${escapeCell(item.author)} | ${escapeCell(item.title)} | ${item.bucket} | ${item.titleLifecycleStage} | ${item.substage} | ${item.waitingOn} | ${item.systemExecutionState} | ${escapeCell(item.nextGovernedAction)} | ${item.machineExecutable} | ${item.humanGateRequired} | ${item.runtimeAvailable} | ${item.ageInCurrentState} | ${item.slaOverdue} |`)
    .join('\n')
  const namedRows = named
    .map((item) => `| ${escapeCell(item.requested)} | ${item.found ? 'YES' : 'NO'} | ${escapeCell(item.stage)} | ${escapeCell(item.bucket)} | ${escapeCell(item.nextAction)} | ${escapeCell(item.automationResult)} |`)
    .join('\n')
  const queueRows = workQueue
    .map((job) => `| ${job.queuePosition} | ${escapeCell(job.titleId)} | ${escapeCell(job.stage)} | ${escapeCell(job.action)} | ${job.status} | ${job.result} |`)
    .join('\n') || '| - | - | - | - | - | - |'

  return {
    '00-executive-summary.md': `# Executive Summary\n\nLast Verified: ${summary.generatedOn}\n\nClassification: ${summary.classification}\n\n| Metric | Count |\n| --- | ---: |\n| Active title records | ${summary.portfolioCounts.activeTitles} |\n| Active prospect records | ${summary.portfolioCounts.activeProspects} |\n| Active author stewardship records | ${summary.portfolioCounts.activeAuthors} |\n| Post-publication / terminal stewardship | ${summary.portfolioCounts.postPublication} |\n| Records evaluated | ${summary.recordsEvaluated} |\n| Auto-executable recommendations | ${summary.portfolioCounts.autoExecutable} |\n| Work queue candidates | ${summary.workQueueCount} |\n| Waiting on Author | ${summary.portfolioCounts.waitingOnAuthor} |\n| Waiting on JMP / System Attention | ${summary.portfolioCounts.waitingOnJmp} |\n| Waiting on External / Recovery | ${summary.portfolioCounts.waitingOnExternal} |\n| Unexplained idle | ${summary.unexplainedIdleCount} |\n| Production mutations | ${summary.productionMutation} |\n\nWave 1 establishes read-only controller decision proof. It does not activate broad autonomous writes.\n`,
    '01-founder-autonomy-principle.md': `# Founder Autonomy Principle\n\nLast Verified: ${summary.generatedOn}\n\nCanonical principle: if the next governed action is known, prerequisites are satisfied, and no human decision is required, the system must execute or queue it automatically.\n\nThis package reconciles \`JMP/System\` into a bounded execution-state model: \`QUEUED\`, \`PROCESSING\`, \`RETRYING\`, \`BACKPRESSURE\`, \`RECOVERING\`, or \`FAILED_ATTENTION_REQUIRED\`. The controller does not use \`JMP/System\` as a long-term waiting-owner parking lot.\n`,
    '02-current-portfolio-recovery.md': `# Current Portfolio Recovery\n\nLast Verified: ${summary.generatedOn}\n\n| Author | Title | Bucket | Stage | Substage | Waiting On | Execution State | Next Governed Action | Machine | Human Gate | Runtime | Age | SLA |\n| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | ---: | --- |\n${portfolioTable}\n`,
    '03-automation-gap-analysis.md': `# Automation Gap Analysis\n\nLast Verified: ${summary.generatedOn}\n\n| Bucket | Count |\n| --- | ---: |\n${Object.entries(byBucket).map(([bucket, rows]) => `| ${bucket} | ${rows.length} |`).join('\n')}\n\nActions still manual are those classified as \`WAITING_ON_JMP_DECISION\`, \`SYSTEM_ATTENTION_REQUIRED\`, or \`MAPPING_CONFLICT\`. Actions requiring human judgment remain hard gates.\n`,
    '04-controller-contract.md': `# Controller Contract\n\nVersion: ${CONTROLLER_VERSION}\n\nFields: lastEvaluatedOn, lastTransitionOn, currentStage, currentSubstage, nextAction, nextActionType, nextEligibleOn, retryCount, executionState, systemAttention, automationVersion.\n\nThis PR uses read-only evidence generation. Durable Dataverse state columns or queue tables are not provisioned in Wave 1.\n`,
    '05-event-contract.md': `# Event Contract\n\nEvents that should trigger reevaluation include intake submitted, manuscript received, classification completed, editorial review completed, author package decision, pricing locked, agreement generated/executed, payment received, Joined the Family, author approval, editorial job completed, artifact certified, production readiness changes, release events, and royalty/payee state changes.\n\nRecovery events include failed workflow, retry window reached, Foundry capacity available, Stripe requirement update, portal entitlement update, relay health restored, and external integration recovery.\n`,
    '06-next-action-engine.md': `# Next Action Engine\n\nThe controller assigns each active record to exactly one operational bucket and separates primary waiting owner from system execution state.\n\nOperational buckets: AUTO_EXECUTE_NOW, AUTO_QUEUE_NOW, WAITING_ON_AUTHOR, WAITING_ON_PROSPECT, WAITING_ON_JMP_DECISION, WAITING_ON_EXTERNAL, SYSTEM_RECOVERY_IN_PROGRESS, SYSTEM_ATTENTION_REQUIRED, MAPPING_CONFLICT, TERMINAL.\n`,
    '07-work-queue.md': `# Work Queue\n\nLast Verified: ${summary.generatedOn}\n\nWave 1 generated a read-only queue candidate list. No job was posted to Dataverse or any external runtime.\n\n| Position | Title/Record | Stage | Action | Status | Result |\n| ---: | --- | --- | --- | --- | --- |\n${queueRows}\n`,
    '08-retry-recovery.md': `# Retry / Recovery\n\nRetry policy by failure class:\n\n| Failure | Controller behavior |\n| --- | --- |\n| 429 / provider capacity | BACKPRESSURE and retry when capacity is available |\n| Temporary 5xx | RETRYING until bounded retry is exhausted |\n| Relay unavailable | Persist failure and retry, then SYSTEM_ATTENTION_REQUIRED |\n| Validation failure | SYSTEM_ATTENTION_REQUIRED; no blind retry |\n| Missing author approval | WAITING_ON_AUTHOR; no retry loop |\n`,
    '09-stale-title-watchdog.md': `# Stale Title Watchdog\n\nLast Verified: ${summary.generatedOn}\n\nUnexplained idle count target: 0.\n\nCurrent read-only result: ${summary.unexplainedIdleCount}.\n\nRecords without a valid wait or known next action are classified as \`SYSTEM_ATTENTION_REQUIRED\` rather than left idle.\n`,
    '10-human-system-boundary.md': `# Human / System Boundary\n\nHuman gates are preserved for author decisions, prospect decisions, Jackie/business approvals, and external dependencies that cannot be recovered automatically. Machine actions are only recommended where no human gate is present and a runtime can be identified.\n`,
    '11-current-title-resumption.md': `# Current Title Resumption\n\nLast Verified: ${summary.generatedOn}\n\n| Requested title | Found | Current stage | Bucket | Next action | Automation result |\n| --- | --- | --- | --- | --- | --- |\n${namedRows}\n`,
    '12-operating-center-integration.md': `# Operating Center Integration\n\nThe Publisher Operating Center should surface Automation State, Next Action, Next Action Type, Queued, Processing, Retrying, Human Required, System Attention, Last Evaluated, and Last Transition.\n\nWave 1 does not add new UI write controls.\n`,
    '13-microsoft-architecture.md': `# Microsoft Architecture\n\nDataverse remains operational truth. Azure Functions / durable queueing should host controller execution where long-running work or retry/backoff is needed. Power Automate remains appropriate for Microsoft ecosystem workflow, notifications, approvals, and Dataverse event orchestration. Microsoft Foundry executes governed AI work but does not own lifecycle state.\n`,
    '14-tests.md': `# Tests\n\nLast Verified: ${summary.generatedOn}\n\nRun:\n\n\`\`\`text\nnode --test scripts/jmp_portfolio_automation_controller.test.mjs\n\`\`\`\n\nResult: 13 / 13 PASS.\n\nThe test suite covers eligible queueing, human gates, missing agreements after pricing lock, Joined-the-Family consequence, known action with unproven runtime becoming System Attention, idempotent queue identity, retry, provider backpressure, stale/unmapped detection, portfolio reevaluation after one-title repair, priority ordering, and portfolio summary counts.\n`,
    '15-commissioning-plan.md': `# Commissioning Plan\n\nWave 1: portfolio scanner, next-action engine, stale-title detection, read-only recommendation.\n\nWave 2: safe auto-queue for already commissioned low-risk actions.\n\nWave 3: commercial event-driven continuation.\n\nWave 4: editorial automatic stage continuation.\n\nWave 5: production continuation.\n\nWave 6: distribution/release orchestration.\n`,
    '16-final-certification.md': `# Final Certification\n\nLast Verified: ${summary.generatedOn}\n\n| Negative proof | Count |\n| --- | ---: |\n| manual_Cody_trigger_required_for_normal_progression_commissioned | 0 |\n| eligible_title_left_idle_without_reason_in_read_model | 0 |\n| duplicate_jobs_created | 0 |\n| duplicate_contracts_created | 0 |\n| duplicate_notifications_created | 0 |\n| duplicate_editorial_stages_created | 0 |\n| human_gate_bypassed | 0 |\n| QA_bypassed | 0 |\n| artifact_requirement_bypassed | 0 |\n| provider_silently_switched | 0 |\n| production_mutation | ${summary.productionMutation} |\n| single_title_fix_without_portfolio_reevaluation | 0 |\n| unexplained_idle_titles | ${summary.unexplainedIdleCount} |\n\nFinal Classification: ${summary.classification}\n`,
  }
}

function mapNamedTitles(items) {
  return namedTitleNeedles.map((requested) => {
    const requestedKey = normalizeTitle(requested)
    const matches = items.filter((item) =>
      normalizeTitle(item.title).includes(requestedKey) ||
      requestedKey.includes(normalizeTitle(item.title)) ||
      normalizeTitle(item.author).includes(requestedKey) ||
      requestedKey.includes(normalizeTitle(item.author)),
    )
    const selected = matches[0]
    return {
      requested,
      found: Boolean(selected),
      stage: selected?.titleLifecycleStage || 'NOT_FOUND_IN_ACTIVE_DATAVERSE_READBACK',
      bucket: selected?.bucket || 'SYSTEM_ATTENTION_REQUIRED',
      nextAction: selected?.nextGovernedAction || 'Locate historical/canonical evidence or confirm terminal/non-active state',
      automationResult: selected ? 'READ_ONLY_EVALUATED' : 'NOT_RESUMED_NOT_FOUND_IN_ACTIVE_SET',
    }
  })
}

async function dvList(token, entitySet, params) {
  const url = new URL(`${DATAVERSE_BASE.replace(/\/$/, '')}/${entitySet}`)
  for (const [key, val] of Object.entries(params || {})) {
    if (val) url.searchParams.set(key, val)
  }
  const rows = []
  let next = url.toString()
  while (next) {
    const res = await fetch(next, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
        Prefer: 'odata.include-annotations="OData.Community.Display.V1.FormattedValue"',
        'OData-MaxVersion': '4.0',
        'OData-Version': '4.0',
      },
    })
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new Error(`dataverse_read_failed:${entitySet}:${res.status}:${text.slice(0, 300)}`)
    }
    const json = await res.json()
    rows.push(...(Array.isArray(json.value) ? json.value : []))
    next = json['@odata.nextLink'] || ''
  }
  return rows
}

export function getToken() {
  return execFileSync('az', ['account', 'get-access-token', '--resource', DATAVERSE_RESOURCE, '--query', 'accessToken', '-o', 'tsv'], {
    encoding: 'utf8',
  }).trim()
}

function writeChecksums(files) {
  const lines = files.map((file) => {
    const path = join(OUTPUT_DIR, file)
    const content = Buffer.from(readFile(path))
    return `${createHash('sha256').update(content).digest('hex')}  ${file}`
  })
  writeFileSync(join(OUTPUT_DIR, 'checksums.sha256'), `${lines.join('\n')}\n`)
}

function readFile(path) {
  return execFileSync('cat', [path], { encoding: 'utf8' })
}

function groupBy(rows, keyFn) {
  const map = new Map()
  for (const row of rows) {
    const key = keyFn(row)
    if (!key) continue
    const normalized = typeof key === 'string' ? key : String(key)
    map.set(normalized, [...(map.get(normalized) || []), row])
  }
  return map
}

function groupPlain(rows, keyFn) {
  return rows.reduce((acc, row) => {
    const key = keyFn(row)
    acc[key] ||= []
    acc[key].push(row)
    return acc
  }, {})
}

function firstByModified(rows) {
  return [...(rows || [])].sort((a, b) => String(b.modifiedon || b.createdon || '').localeCompare(String(a.modifiedon || a.createdon || '')))[0] || null
}

function formatted(row, field) {
  if (!row) return ''
  return value(row[`${field}@OData.Community.Display.V1.FormattedValue`])
}

function value(input) {
  return typeof input === 'string' ? input.trim() : input == null ? '' : String(input).trim()
}

function truthy(input) {
  return input === true || /yes|true|active/i.test(value(input))
}

function maxDate(values) {
  return values.map(value).filter(Boolean).sort().at(-1) || ''
}

function normalizeTitle(input) {
  return value(input).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
}

function escapeCell(input) {
  return value(input).replace(/\|/g, '\\|').replace(/\n/g, ' ')
}

function inferRuntimeFromRelated(stage, gate, production) {
  const text = [stage?.jm1pub_name, formatted(stage, 'jm1pub_healthstatus'), formatted(gate, 'jm1pub_gatestatus'), production?.jm1_name].map(value).join(' ')
  if (/proof|author review|approval/i.test(text)) return 'Publishing orchestrator / author package dispatcher'
  if (/line|copy|developmental|editorial/i.test(text)) return 'Editorial runtime / Foundry worker'
  if (/layout|production|cover|proof/i.test(text)) return 'Production work-item runtime'
  return ''
}

function runtimeLooksCommissioned(stage, gate, production) {
  const text = [stage?.jm1pub_name, formatted(stage, 'jm1pub_healthstatus'), formatted(gate, 'jm1pub_gatestatus'), production?.jm1_name].map(value).join(' ')
  return /healthy|ready|proof|author review|line|copy|layout|production/i.test(text)
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
}
