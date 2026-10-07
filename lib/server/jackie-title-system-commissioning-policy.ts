import {
  JACKIE_CANONICAL_AUTHOR_CONTACT_ID,
  isJackieAuthoredTitle,
} from '../../azure-functions/diagnostic-ai-runner/src/author/jackieTitleSystemCommissioningPolicy'

type TitleAuthorAuthority = Record<string, unknown> | null | undefined

export { JACKIE_CANONICAL_AUTHOR_CONTACT_ID, isJackieAuthoredTitle }

export function isJackieAuthorContact(contactId: unknown): boolean {
  return isJackieAuthoredTitle({ _jm1_primaryauthor_value: contactId })
}

export function jackieTitleCommissioningBlocker(authority: TitleAuthorAuthority): string | null {
  return isJackieAuthoredTitle(authority) ? null : 'JACKIE_AUTHOR_ONLY_SYSTEM_COMMISSIONING_DENIED'
}
