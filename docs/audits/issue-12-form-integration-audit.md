# Issue 12 Form Integration Audit

Scope: public-facing forms, private author setup forms, and their API routes.

## Executive Summary

Most intake routes already avoid false success by requiring confirmed notification or route-specific Power Automate delivery before the UI shows success. The main exception is the newsletter route: it can return `{ success: true }` when no automation endpoint exists or when the configured automation returns a non-2xx response. That is a silent failure risk because the UI shows the subscriber as captured even when no system accepted the signup.

Two minimal code fixes are safe in this workstream:

- make `/api/newsletter` return visible errors for missing production configuration and failed automation responses
- align the JM Prestige client-side required-field check with the server-side `referredBy` requirement

Broader operational changes, Dataverse changes, or Power Automate flow changes should stay out of this PR.

## Integration Inventory

| Surface | Client component | API route | External dependencies | Environment variables | Success state | Failure state |
| --- | --- | --- | --- | --- | --- | --- |
| Join the Family | `app/join/JoinForm.tsx` | `app/api/join/route.ts` | Power Automate route flow, shared notification flow, Microsoft Graph, Resend | `POWER_AUTOMATE_JOIN_URL`, `POWER_AUTOMATE_NOTIFICATION_URL`, `FORM_NOTIFICATION_TO`, `MICROSOFT_TENANT_ID`, `MICROSOFT_CLIENT_ID`, `MICROSOFT_CLIENT_SECRET`, `MICROSOFT_GRAPH_FROM_USER`, `RESEND_API_KEY`, `RESEND_FROM_EMAIL` | Success panel after `res.ok` | API error text is displayed in-form |
| Newsletter | `components/content/NewsletterSignup.tsx` | `app/api/newsletter/route.ts` | Power Automate newsletter flow | `POWER_AUTOMATE_NEWSLETTER_URL` | Success panel after `res.ok` | Before fix, missing/failed automation could still return success |
| Reader Updates | `components/readers/ReaderSignupForm.tsx` | `app/api/readers/route.ts` | Dedicated reader Power Automate flow or newsletter fallback | `POWER_AUTOMATE_READER_SIGNUP_URL`, `POWER_AUTOMATE_NEWSLETTER_URL` | Success panel after `res.ok` | Missing production config returns `503`; failed automation returns `502` |
| JM Prestige Application | `components/publishing-partner/PartnerApplyForm.tsx` | `app/api/partner-apply/route.ts` | Power Automate partner flow, shared notification flow, Microsoft Graph, Resend | `POWER_AUTOMATE_PARTNER_APPLY_URL`, `POWER_AUTOMATE_PARTNER_URL`, shared notification vars | Success panel after `res.ok` | API error text is displayed in-form |
| Author Gate | `app/author/_components/AuthorGate.tsx` | `app/api/author/gate/route.ts` | Access-code env var | `AUTHOR_ONBOARDING_ACCESS_CODE` | Unlocks private author forms in session storage | Invalid code or API error displayed |
| Author Onboarding | `app/author/_components/AuthorSetupForm.tsx` | `app/api/author/onboarding/route.ts` | Required route-specific Power Automate flow | `POWER_AUTOMATE_AUTHOR_ONBOARDING_URL`, `AUTHOR_ONBOARDING_ACCESS_CODE` | Success panel after confirmed delivery | API error displayed; missing route flow returns error |
| Author Financial Setup | `app/author/_components/AuthorSetupForm.tsx` | `app/api/author/financial-setup/route.ts` | Power Automate route flow or shared notification fallback | `POWER_AUTOMATE_AUTHOR_FINANCIAL_URL`, shared notification vars, `AUTHOR_ONBOARDING_ACCESS_CODE` | Success panel after confirmed delivery | API error displayed |
| Author Royalty Setup | `app/author/_components/AuthorSetupForm.tsx` | `app/api/author/royalty-setup/route.ts` | Power Automate route flow or shared notification fallback | `POWER_AUTOMATE_AUTHOR_ROYALTY_URL`, shared notification vars, `AUTHOR_ONBOARDING_ACCESS_CODE` | Success panel after confirmed delivery | API error displayed |
| Publishing Pathfinder | `components/sections/UpgradedSections.tsx` | `app/api/analyze/route.ts` | Anthropic messages API | none currently referenced | Displays generated or fallback analysis | API route catches failures and returns fallback analysis |

## Validation Rules

`/api/join` requires:

- `firstName`
- `lastName`
- `email`
- `bookTitle`
- `genre`
- `goal`
- `workType`
- `manuscriptStatus`
- `consentToContact`
- `consentToTerms`
- `priorTitles` when `returningAuthor=true`
- referrer type, first name, last name, and email when `wereYouReferred=true`

`/api/partner-apply` requires:

- `firstName`
- `lastName`
- `email`
- `phone`
- `bookTitle`
- `genre`
- `manuscriptStatus`
- `goals`
- `whyPartner`
- `whatYouBring`
- `partnerTier`
- `referredBy`
- `budgetConfirmed`
- `consentToContact`
- `consentToTerms`
- `priorTitles` when returning author
- `priorPublications` when previously published elsewhere
- `seriesDetails` when a series is planned

`/api/readers` requires:

- `firstName`
- `email`
- valid `imprintInterest`

Private author setup routes require the `x-author-access-code` header and route-specific required fields.

## Findings

### P0: Newsletter can silently lose submissions

Before this PR, `/api/newsletter` logs automation failures but still returns `{ success: true }`. If `POWER_AUTOMATE_NEWSLETTER_URL` is missing in production, it logs a development-style payload and still returns success. Because `NewsletterSignup` trusts `res.ok`, users see “You’re in” even if no downstream system captured the subscription.

Fix in this PR: return `503` for missing production config and `502` for non-2xx automation responses. The existing client already displays returned errors.

### P1: JM Prestige client validation omits `referredBy`

The server requires `referredBy`, but the client preflight check did not include it. The failure is visible because the API returns `400`, but the user has to submit once to discover the missing field.

Fix in this PR: include `referredBy` in the client preflight validation.

### P2: Email validation is uneven

Reader signup and private author setup validate email shape client-side. Join, partner, and newsletter rely mostly on `<input type="email">` and required checks. Server-side format validation would be a reasonable follow-up, but not necessary for this minimal integration-safety PR.

### P2: Operator visibility exists but is console-only

Power Automate, Microsoft Graph, Resend, and route-level catch blocks log failures with `console.error` or `console.warn`. That is enough for platform logs, but there is no structured event ID, request ID, or durable failure table. This should remain a follow-up unless production observability requirements are defined.

### P2: User fallback guidance is inconsistent

Join and shared integration failures include `publishing@jmerrill.one` in the user-facing error. Newsletter and reader errors are shorter. This PR adds email fallback guidance to newsletter. A future UX pass should standardize fallback language across forms.

### P3: Publishing Pathfinder is not an intake form

`/api/analyze` calls an external AI endpoint and catches failures by returning fallback analysis. It does not capture a lead. The current request does not include an API key env var, so the external call is expected to fail unless handled upstream. Because the user receives a fallback result and no submission is claimed, this is not a silent intake failure.

## Recommended Follow-Ups

- Add server-side email format validation to Join, Partner, Newsletter, and shared validation helpers.
- Add request IDs to integration logs and include safe failure references in API responses.
- Standardize user-facing fallback guidance across all intake forms.
- Decide whether Publishing Pathfinder should use a configured AI provider key, remain a deterministic fallback, or be removed from production.
- Confirm Azure Static Web Apps production settings for every env var listed in this report.
