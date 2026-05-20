# Publishing Form Payloads

These samples document the canonical JSON payloads the website is expected to send to Power Automate.

## `/join`

```json
{
  "formType": "join-family-inquiry",
  "source": "website-join-form",
  "division": "publishing",
  "divisionNumber": "01",
  "route": "/join",
  "recipient": "publishing@jmerrill.one",
  "firstName": "Test",
  "lastName": "Author",
  "email": "jackie+jointest@jmerrill.pub",
  "phone": "6140000000",
  "timezone": "EST (Eastern)",
  "bookTitle": "TEST — Join Intake Verification",
  "projectTitle": "TEST — Join Intake Verification",
  "genre": "Nonfiction",
  "workType": "Full-length Book",
  "manuscriptStatus": "First Draft Complete",
  "estimatedWords": "50000",
  "estimatedWordCount": 50000,
  "publishDate": "Within 1 Year",
  "desiredPublishingTimeline": "Within 1 Year",
  "imprint": "JM Works",
  "goal": "Share my story",
  "goals": "Share my story",
  "message": "Test submission only.",
  "purpose": "Test submission only.",
  "city": "Columbus",
  "stateProvince": "Ohio",
  "country": "United States",
  "authorBio": "Short author bio for testing.",
  "existingPlatform": "https://example.com",
  "manuscriptUrl": "https://example.com/sample.pdf",
  "returningAuthor": false,
  "priorTitles": null,
  "consentToContact": true,
  "consentToTerms": true,
  "wereYouReferred": false,
  "referrerType": null,
  "referrerFirstName": null,
  "referrerLastName": null,
  "referrerEmail": null,
  "referrerPhone": null,
  "referralNotes": null
}
```

## `/author/onboarding`

```json
{
  "formType": "author-onboarding",
  "source": "website-author-onboarding",
  "division": "publishing",
  "divisionNumber": "01",
  "route": "/author/onboarding",
  "recipient": "publishing@jmerrill.one",
  "author": {
    "firstName": "Test",
    "lastName": "Author",
    "email": "jackie+onboardingtest@jmerrill.pub",
    "phone": "6140000000",
    "timezone": ""
  },
  "book": {
    "title": "TEST — Author Onboarding Verification",
    "subtitle": "",
    "genre": "Nonfiction",
    "estimatedWords": "50000",
    "manuscriptStatus": "Complete manuscript",
    "targetPublishDate": "2026-06-30",
    "imprint": "JM Works"
  },
  "publishing": {
    "packageConfirmation": "Professional Publishing Package",
    "audiobookInterest": "Not sure yet",
    "acxAudiblePreference": "Needs recommendation",
    "w9Status": "Not yet submitted",
    "rightsHolderConfirmed": true,
    "multiTitleIntent": "No — one book only"
  },
  "message": "Test submission only.",
  "rawFormData": {
    "authorName": "Test Author",
    "legalName": "Test Author",
    "email": "jackie+onboardingtest@jmerrill.pub",
    "phone": "6140000000",
    "bookTitle": "TEST — Author Onboarding Verification",
    "genre": "Nonfiction",
    "manuscriptStatus": "Complete manuscript",
    "packageConfirmation": "Professional Publishing Package",
    "rightsHolderConfirmed": "true"
  }
}
```

## `/author/onboarding` — Custom bundle / multi-title intent

```json
{
  "formType": "author-onboarding",
  "source": "website-author-onboarding",
  "division": "publishing",
  "divisionNumber": "01",
  "route": "/author/onboarding",
  "recipient": "publishing@jmerrill.one",
  "author": {
    "firstName": "Test",
    "lastName": "Author",
    "email": "jackie+onboardingtest@jmerrill.pub",
    "phone": "6140000000",
    "timezone": "Eastern"
  },
  "book": {
    "title": "TEST — Author Onboarding Verification",
    "subtitle": "",
    "genre": "Nonfiction",
    "estimatedWords": "50000",
    "manuscriptStatus": "Complete manuscript",
    "targetPublishDate": "2026-06-30",
    "imprint": "JM Works"
  },
  "publishing": {
    "packageConfirmation": "Custom Bundle / Special Agreement",
    "audiobookInterest": "Not sure yet",
    "acxAudiblePreference": "Needs recommendation",
    "w9Status": "Not yet submitted",
    "rightsHolderConfirmed": true,
    "multiTitleIntent": "Yes — multiple books"
  },
  "message": "Test submission only."
}
```
