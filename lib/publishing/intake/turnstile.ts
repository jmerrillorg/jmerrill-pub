export type TurnstileResult = {
  ok: boolean
  reason?: string
}

type TurnstileResponse = {
  success?: boolean
  'error-codes'?: string[]
}

export async function verifyTurnstileToken(token: string, remoteIp?: string): Promise<TurnstileResult> {
  const secret = process.env.TURNSTILE_SECRET_KEY

  if (!secret) {
    if (process.env.NODE_ENV !== 'production' && token === 'development-turnstile-token') {
      return { ok: true }
    }

    return {
      ok: false,
      reason: 'turnstile_not_configured',
    }
  }

  const body = new URLSearchParams()
  body.set('secret', secret)
  body.set('response', token)
  if (remoteIp && remoteIp !== 'unknown') body.set('remoteip', remoteIp)

  const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })

  if (!response.ok) {
    return { ok: false, reason: 'turnstile_verify_failed' }
  }

  const data = (await response.json()) as TurnstileResponse
  if (!data.success) {
    return {
      ok: false,
      reason: data['error-codes']?.join(',') || 'turnstile_invalid',
    }
  }

  return { ok: true }
}
