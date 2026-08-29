#!/usr/bin/env node

import assert from 'node:assert/strict'
import test from 'node:test'
import createJiti from 'jiti'

const jiti = createJiti(import.meta.url)
const intake = jiti('../lib/server/author-response-inbound-correlation.ts')

test('Sean founder-corrected reply is approval plus access help', () => {
  const result = intake.classifyPublishingInboundAuthorIntent({
    subject: 'Re: Developmental Editing Materials - Before You Were Born',
    gateId: 'e996abe7-2f8e-f111-8077-000d3a14673b',
    inboundMessageId:
      'AAMkAGNiOTQzYmYyLTk0MDEtNGVlYS05NTgyLWFhMmUxM2Y0MzhiOQBGAAAAAACfs17WM6mYQJ_3z0t8_9doBwD_Xbi2Wq2JSYocf3NG5QZjAAAAAAEMAAD_Xbi2Wq2JSYocf3NG5QZjAADiW0HwAAA=',
    bodyText:
      'Thank you, I have received the files and please approve them. Also can May I have the Authors central access code?',
  })

  assert.equal(result.authorityClassification, 'DEVELOPMENTAL_EDITING_APPROVED_WITH_ACCESS_HELP')
  assert.equal(result.originalAuthorityClassification, 'ACCESS_SUPPORT_REQUEST')
  assert.equal(result.authoritativeLifecycleDecision, 'APPROVED')
  assert.deepEqual(result.supportActions, ['ACCESS_HELP'])
  assert.equal(result.lifecycleAction, 'RECORD_AUTHOR_APPROVAL')
  assert.equal(result.confidence, 'HIGH')
  assert.ok(result.intents.includes('ACCESS_CODE_REQUEST'))
  assert.ok(result.intents.includes('FILE_RECEIVED'))
  assert.ok(result.intents.includes('ACKNOWLEDGMENT_ONLY'))
  assert.ok(result.intents.includes('APPROVED'))
  assert.equal(result.founderAuthorityCorrection, true)
})

test('please approve them is never treated as author approval', () => {
  const result = intake.classifyPublishingInboundAuthorIntent({
    subject: 'Re: Review files',
    bodyText: 'I have received the files and please approve them.',
  })

  assert.equal(result.authorityClassification, 'ACKNOWLEDGMENT_REVIEW_START_NOT_APPROVAL')
  assert.equal(result.lifecycleAction, 'KEEP_GATE_OPEN_AND_ACKNOWLEDGE')
  assert.equal(result.intents.includes('APPROVED'), false)
})

test('Ashanti authentication-app issue is access help with direct-deposit context', () => {
  const result = intake.classifyPublishingInboundAuthorIntent({
    subject: 'Re: Set Up Direct Deposit with J Merrill Publishing',
    bodyText: "I can't log in. It's saying put in code that was sent to authentication app",
  })

  assert.equal(result.authorityClassification, 'ACCESS_SUPPORT_REQUEST')
  assert.equal(result.lifecycleAction, 'CREATE_ACCESS_RECOVERY_EVENT')
  assert.ok(result.intents.includes('ACCESS_HELP'))
  assert.ok(result.intents.includes('LOGIN_HELP'))
  assert.ok(result.intents.includes('AUTHENTICATION_FAILURE'))
  assert.ok(result.intents.includes('DIRECT_DEPOSIT_HELP'))
})

test('explicit first-person approval is the approval candidate path', () => {
  const result = intake.classifyPublishingInboundAuthorIntent({
    subject: 'Re: Review files',
    bodyText: 'Everything looks good and I approve this version.',
  })

  assert.equal(result.authorityClassification, 'AUTHOR_APPROVAL_CANDIDATE')
  assert.equal(result.lifecycleAction, 'RECORD_AUTHOR_APPROVAL')
  assert.ok(result.intents.includes('APPROVED'))
})

test('quoted approval text is ignored when the current reply is only thanks', () => {
  const result = intake.classifyPublishingInboundAuthorIntent({
    subject: 'Re: Review files',
    bodyText: 'Thank you.\n\nOn Friday, Publishing wrote:\n> Please reply with I approve this version.',
  })

  assert.equal(result.authorityClassification, 'ACKNOWLEDGMENT_REVIEW_START_NOT_APPROVAL')
  assert.equal(result.lifecycleAction, 'KEEP_GATE_OPEN_AND_ACKNOWLEDGE')
  assert.equal(result.intents.includes('APPROVED'), false)
})

test('message id creates deterministic mailbox-intake event id', () => {
  assert.equal(
    intake.buildAuthorMailIntakeEventId({
      inboundMessageId: 'Graph-Message-1',
      internetMessageId: '<ABC@example.com>',
    }),
    'author-mail-intake:<abc@example.com>',
  )
  assert.equal(
    intake.buildAuthorMailIntakeEventId({
      inboundMessageId: 'Graph-Message-1',
    }),
    'author-mail-intake:graph-message-1',
  )
})
