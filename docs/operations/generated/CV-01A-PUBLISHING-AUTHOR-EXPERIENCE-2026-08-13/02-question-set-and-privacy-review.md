# Question Set And Privacy Review

Last Verified: 2026-08-13T03:49:51Z

## Required Publishing Topics

| Required topic | Covered by |
| --- | --- |
| Onboarding | `onboarding` |
| Communication | `communication` |
| Clarity | `clarity` |
| Editorial experience | `editorial` |
| Production experience | `production` |
| Feeling heard | `heard` |
| Overall experience | `overall` |
| Likelihood to recommend | `recommend` |
| Open feedback | `open_feedback` |

## Privacy-Minimized Boundary

The survey does not request:

- author legal name;
- email address;
- phone number;
- payment details;
- bank details;
- SSN or tax identifiers;
- manuscript upload;
- private manuscript content;
- medical information;
- other sensitive personal information.

The public page and open-feedback prompt tell respondents not to include payment details, private manuscript content, SSNs, bank information, medical details, or other sensitive personal information.

## Evidence Sources

| Evidence | Result |
| --- | --- |
| `scripts/cv01a_author_experience.test.mjs` | PASS |
| `lib/publishing/author-experience-survey.ts` | Contains canonical survey definition |
| `app/experience/page.tsx` | Contains privacy-minimized public page copy |
| `app/experience/AuthorExperienceSurveyClient.tsx` | Contains no sensitive fields |
