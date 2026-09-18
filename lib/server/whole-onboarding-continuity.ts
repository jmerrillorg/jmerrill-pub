export const WHOLE_ONBOARDING_CONTINUITY = Object.freeze({
  policyVersion: 'AUTHOR_ONBOARDING_CONTINUITY_V1',
  authorName: 'Jackuline Fly',
  authorFirstName: 'Jackuline',
  authorEmail: 'jackie2doreen@att.net',
  contactId: '106a78d0-fb9a-f111-b8dc-6045bdd69738',
  title: 'Whole',
  titleId: 'daf8180f-85a3-f111-b8de-000d3a14673b',
  packageCode: 'Starter',
  lifecycleStage: '06_ONBOARDING',
  engagementId: '0038ee51-27a9-f111-aaab-70a8a59b112b',
  lifecycleId: '0238ee51-27a9-f111-aaab-70a8a59b112b',
  onboardingRoute: 'https://jmerrill.pub/author/onboarding',
})

export function isWholeOnboardingContact(contactId?: string, email?: string) {
  return contactId?.trim().toLowerCase() === WHOLE_ONBOARDING_CONTINUITY.contactId ||
    email?.trim().toLowerCase() === WHOLE_ONBOARDING_CONTINUITY.authorEmail
}
