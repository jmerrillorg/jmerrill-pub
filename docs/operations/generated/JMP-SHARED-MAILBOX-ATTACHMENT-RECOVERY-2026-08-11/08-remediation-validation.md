# Remediation Validation

Last verified: 2026-08-11T12:00:30Z

Dependency installation:

- Command: `npm ci`
- Result: PASS
- Caveat: Node v26.0.0 is outside package engine `>=22 <25`
- Audit result: 5 vulnerabilities reported by npm audit, not remediated under this bounded work item

Focused tests:

- Command: `node --test test/publishingMailboxReader.test.js`
- Result: PASS
- Tests: 26 / 26 PASS

Syntax checks:

- Command: `npm run lint`
- Result: PASS
- Command: `node --check src/mail/publishingMailboxReader.js && node --check test/publishingMailboxReader.test.js`
- Result: PASS

Validation scope:

- Shared mailbox URL uses `publishing@jmerrill.one`
- All attachment requests use GET
- Default reply reader does not call `/attachments`
- Attachment metadata list does not return bytes
- File attachment fetch returns bytes and checksum in test fixture
- Graph 403 returns a governed blocked result
- Gate closed prevents network calls

