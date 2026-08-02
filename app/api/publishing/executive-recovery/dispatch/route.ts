import { NextResponse } from 'next/server'

import { dispatchFiveTitleExecutiveRecovery } from '@/lib/server/five-title-executive-recovery-dispatch'
import { verifyGitHubActionsOidcToken } from '@/lib/server/github-actions-oidc'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  const auth = req.headers.get('authorization') || ''
  const token = auth.startsWith('Bearer ') ? auth.slice('Bearer '.length).trim() : ''
  if (!token) {
    return NextResponse.json({ error: 'GitHub Actions OIDC bearer token required.' }, { status: 401 })
  }

  try {
    const identity = await verifyGitHubActionsOidcToken(token)
    const body = (await req.json().catch(() => null)) as {
      mode?: 'dry-run' | 'confirm'
      executiveRecovery?: boolean
      confirmation?: string
      titles?: string[]
    } | null
    if (!body || (body.mode !== 'dry-run' && body.mode !== 'confirm')) {
      return NextResponse.json({ error: 'Mode must be dry-run or confirm.' }, { status: 400 })
    }

    const result = await dispatchFiveTitleExecutiveRecovery({
      mode: body.mode,
      executiveRecovery: body.executiveRecovery === true,
      confirmation: body.confirmation,
      titles: body.titles,
    })

    return NextResponse.json(
      {
        identity,
        result,
      },
      { headers: { 'Cache-Control': 'no-store' } },
    )
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Executive recovery dispatch failed.' },
      { status: 400, headers: { 'Cache-Control': 'no-store' } },
    )
  }
}
