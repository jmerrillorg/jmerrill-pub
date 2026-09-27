import { dataverseFirst, getDataverseServerConfig, stringValue } from './dataverse-server'

type OnboardingIdentity = { contactId: string; titleId: string; email: string }
type ReadRecord = typeof dataverseFirst

export async function resolveOnboardingAuthority(identity: OnboardingIdentity, read: ReadRecord = dataverseFirst) {
  const config = getDataverseServerConfig()
  const contactId = identity.contactId.trim().toLowerCase()
  const titleId = identity.titleId.trim().toLowerCase()
  const guid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
  if (!config || !guid.test(contactId) || !guid.test(titleId)) return null

  // Relationship authority must not depend on supplemental portal/submission reads.
  const contact = await read(config, 'contacts', {
    $select: 'contactid,emailaddress1', $filter: `contactid eq ${contactId}`,
  })
  const title = await read(config, 'jm1pub_titles', {
    $select: 'jm1pub_titleid,_jm1_primaryauthor_value', $filter: `jm1pub_titleid eq ${titleId}`,
  })
  if (stringValue(contact?.contactid).toLowerCase() !== contactId ||
      stringValue(title?.jm1pub_titleid).toLowerCase() !== titleId ||
      stringValue(title?._jm1_primaryauthor_value).toLowerCase() !== contactId ||
      stringValue(contact?.emailaddress1).trim().toLowerCase() !== identity.email.trim().toLowerCase()) return null

  const profile = await read(config, 'jm1_authorprofiles', {
    $select: 'jm1_authorprofileid,_jm1_contact_value',
    $filter: `_jm1_contact_value eq ${contactId} and statecode eq 0`,
  })
  return { contactId, titleId, authorProfileId: stringValue(profile?.jm1_authorprofileid) || undefined }
}
