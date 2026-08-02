# Human Experience Acceptance Gates

These gates apply before any client-facing workflow is considered production-ready.

| Gate | Required proof | Pass condition |
|---|---|---|
| Why-first purpose review | Plain statement of the human need and business purpose | A nontechnical person can tell why they are receiving the message or page |
| Plain-language review | Copy review | No internal system terms are required to understand the action |
| Brand and tone review | Branded HTML/plain text or page review | Tone is warm, direct, and aligned to the entity |
| Actual file open test | Open each attached/downloaded file | Files open, are complete, and match the expected title/stage |
| Actual link test | Click every visible link | Links open the expected public or authenticated destination |
| Mobile test | Mobile viewport or device check | Primary action, fallback, and documents remain usable |
| Nontechnical-user test | Reviewer not involved in implementation | Reviewer can explain the action in their own words |
| Human fallback | Email/phone/support path shown | Person knows how to get help without solving a system issue |
| End-user completion | Completed action or safe proof | Person can complete the task through the stated path |

## Supporting Evidence Only

The following may support a pass, but cannot independently create one:

- HTTP 200 status
- ACS accepted event
- Dataverse write
- workflow run success
- execution-log event
- gate created
- portal projection
- provider message accepted without usable author receipt

## Publishing Stage Application

For author-review packages:

- email is the official delivery;
- reply is an accepted response;
- portal access is optional;
- package contents are limited to author-needed files;
- response clocks start only after usable delivery is certified.

