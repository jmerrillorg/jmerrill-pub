import { getServerSession, type NextAuthOptions } from 'next-auth'
import AzureADProvider from 'next-auth/providers/azure-ad'

import { getDataverseServerConfig, dataverseFirst } from './dataverse-server'

function getRequiredEnv(name: string) {
  const value = process.env[name]?.trim()
  return value || ''
}

export async function isAuthorizedAuthorEmail(email?: string | null) {
  const normalizedEmail = email?.trim().toLowerCase()
  if (!normalizedEmail) return false

  const config = getDataverseServerConfig()
  if (!config) return false

  const contact = await dataverseFirst(config, 'contacts', {
    $select: 'contactid,emailaddress1',
    $filter: `emailaddress1 eq '${normalizedEmail.replace(/'/g, "''")}'`,
  })

  return Boolean(contact)
}

function getProfileValue(profile: Record<string, unknown> | undefined, key: string) {
  const value = profile?.[key]
  return typeof value === 'string' ? value.trim() : ''
}

function decodeGuestUpn(value: string) {
  const marker = '#EXT#@'
  const markerIndex = value.indexOf(marker)
  if (markerIndex <= 0) return ''

  const invited = value.slice(0, markerIndex)
  const lastUnderscore = invited.lastIndexOf('_')
  if (lastUnderscore <= 0 || lastUnderscore === invited.length - 1) return ''

  const local = invited.slice(0, lastUnderscore)
  const domain = invited.slice(lastUnderscore + 1)
  if (!local || !domain.includes('.')) return ''

  return `${local}@${domain}`.toLowerCase()
}

function collectIdentityEmailCandidates({
  profile,
  user,
  token,
}: {
  profile?: Record<string, unknown>
  user?: { email?: string | null } | null
  token?: { email?: unknown } | null
}) {
  const candidates = new Set<string>()

  const rawValues = [
    getProfileValue(profile, 'email'),
    getProfileValue(profile, 'preferred_username'),
    getProfileValue(profile, 'upn'),
    getProfileValue(profile, 'unique_name'),
    typeof user?.email === 'string' ? user.email.trim() : '',
    typeof token?.email === 'string' ? token.email.trim() : '',
  ].filter(Boolean)

  for (const rawValue of rawValues) {
    candidates.add(rawValue.toLowerCase())

    if (rawValue.includes('#EXT#@')) {
      const decoded = decodeGuestUpn(rawValue)
      if (decoded) candidates.add(decoded)
    }
  }

  return [...candidates]
}

async function resolveAuthorizedAuthorEmail({
  profile,
  user,
  token,
}: {
  profile?: Record<string, unknown>
  user?: { email?: string | null } | null
  token?: { email?: unknown } | null
}) {
  const candidates = collectIdentityEmailCandidates({ profile, user, token })

  for (const candidate of candidates) {
    if (await isAuthorizedAuthorEmail(candidate)) {
      return candidate
    }
  }

  return ''
}

export const authorAuthOptions: NextAuthOptions = {
  secret: getRequiredEnv('AUTH_SECRET'),
  session: {
    strategy: 'jwt',
  },
  providers: [
    AzureADProvider({
      clientId: getRequiredEnv('AUTHOR_OPERATING_CENTER_CLIENT_ID'),
      clientSecret: getRequiredEnv('AUTHOR_OPERATING_CENTER_CLIENT_SECRET'),
      tenantId: getRequiredEnv('AUTHOR_OPERATING_CENTER_TENANT_ID'),
    }),
  ],
  callbacks: {
    async signIn({ profile, user }) {
      return Boolean(
        await resolveAuthorizedAuthorEmail({
          profile: profile as Record<string, unknown> | undefined,
          user,
        }),
      )
    },
    async jwt({ token, profile, user }) {
      const existingEmail = typeof token.email === 'string' ? token.email.trim().toLowerCase() : ''
      if (existingEmail) {
        token.email = existingEmail
        return token
      }

      const email = await resolveAuthorizedAuthorEmail({
        profile: profile as Record<string, unknown> | undefined,
        user,
        token,
      })

      if (email) token.email = email
      return token
    },
    async session({ session, token }) {
      if (session.user && typeof token.email === 'string') {
        session.user.email = token.email
      }
      return session
    },
  },
}

export async function getDurableAuthorSession() {
  return getServerSession(authorAuthOptions)
}
