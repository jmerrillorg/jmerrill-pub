'use client'

import { useMemo, useState } from 'react'
import { signIn, signOut } from 'next-auth/react'

import { PUBLISHER_OPERATING_CENTER_PROVIDER_ID } from '@/lib/author-durable-auth-shared'
import type { PublisherOperatingCenterSnapshot, PublisherQueueItem } from '@/lib/server/publisher-operating-center'

type Props = {
  initialSnapshot: PublisherOperatingCenterSnapshot | null
  signedIn: boolean
  operatorEmail?: string | null
}

type ActionState = {
  itemKey: string
  status: 'idle' | 'running' | 'complete' | 'error'
  message: string
}

export function PublisherOperatingCenterClient({ initialSnapshot, signedIn, operatorEmail }: Props) {
  const [snapshot, setSnapshot] = useState(initialSnapshot)
  const [actionState, setActionState] = useState<ActionState>({ itemKey: '', status: 'idle', message: '' })
  const [filter, setFilter] = useState('all')

  const queue = useMemo(() => {
    const items = snapshot?.queues.enterprise || []
    if (filter === 'proof') return snapshot?.queues.proofAssets || []
    if (filter === 'publisher') return items.filter((item) => item.actionOwner === 'publisher')
    if (filter === 'blocked') return items.filter((item) => item.holdReason)
    if (filter === 'editorial') return items.filter((item) => item.currentStage === 'Editorial')
    return items
  }, [filter, snapshot])

  async function refresh() {
    const response = await fetch('/api/publisher/operating-center', { cache: 'no-store' })
    if (!response.ok) return
    setSnapshot((await response.json()) as PublisherOperatingCenterSnapshot)
  }

  async function runAction(item: PublisherQueueItem, actionId: string) {
    setActionState({ itemKey: `${item.key}:${actionId}`, status: 'running', message: 'Running governed action...' })

    const response = await fetch('/api/publisher/operating-center/actions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: actionId,
        intakeId: item.intakeId,
      }),
    })

    const payload = (await response.json().catch(() => null)) as { error?: string } | null
    if (!response.ok) {
      setActionState({
        itemKey: `${item.key}:${actionId}`,
        status: 'error',
        message: payload?.error || 'The governed action did not complete.',
      })
      return
    }

    setActionState({ itemKey: `${item.key}:${actionId}`, status: 'complete', message: 'Governed action completed and logged.' })
    await refresh()
  }

  if (!signedIn) {
    return (
      <main className="min-h-screen bg-[#080b12] text-white">
        <section className="mx-auto flex min-h-screen max-w-5xl flex-col justify-center px-6 py-16">
          <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-blue-300">Publisher Operating Center</p>
          <h1 className="mt-5 max-w-3xl font-display text-5xl leading-tight md:text-7xl">
            Internal publishing operations.
          </h1>
          <p className="mt-6 max-w-2xl text-[16px] leading-8 text-white/62">
            Sign in with an approved JM1 workforce identity to review publishing assets, confirm evidence, and initiate
            governed pipeline movement.
          </p>
          <div className="mt-9">
            <button
              type="button"
              onClick={() => void signIn(PUBLISHER_OPERATING_CENTER_PROVIDER_ID, { callbackUrl: '/publisher/operating-center' })}
              className="inline-flex min-h-[48px] items-center rounded-full bg-blue-500 px-6 text-[13px] font-semibold uppercase tracking-[0.08em] text-white shadow-[0_0_28px_rgba(30,144,255,0.35)]"
            >
              Sign in
            </button>
          </div>
        </section>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[#080b12] text-white">
      <section className="border-b border-white/10 bg-[#071323]">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-5 py-8 sm:px-8 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-blue-300">Publisher Operating Center</p>
            <h1 className="mt-3 font-display text-4xl leading-tight md:text-6xl">Enterprise publishing queue</h1>
            <p className="mt-4 max-w-3xl text-[14px] leading-7 text-white/60">
              Internal surface for Core-backed asset visibility, bounded publisher actions, and execution evidence.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-full border border-white/10 px-4 py-2 text-[12px] text-white/60">{operatorEmail}</span>
            <button
              type="button"
              onClick={() => void refresh()}
              className="min-h-[40px] rounded-full border border-blue-400/30 px-4 text-[12px] font-semibold uppercase tracking-[0.08em] text-blue-200"
            >
              Refresh
            </button>
            <button
              type="button"
              onClick={() => void signOut({ callbackUrl: '/publisher/operating-center' })}
              className="min-h-[40px] rounded-full border border-white/10 px-4 text-[12px] font-semibold uppercase tracking-[0.08em] text-white/60"
            >
              Sign out
            </button>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-6 sm:px-8">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {snapshot &&
            Object.entries({
              'New submissions': snapshot.metrics.newSubmissionsAwaitingReview,
              'Unlinked assets': snapshot.metrics.unlinkedAssets,
              'Publisher actions': snapshot.metrics.publisherActionsPending,
              'Editorial queue': snapshot.metrics.editorialReviewQueue,
              'On hold': snapshot.metrics.assetsOnHold,
              'Avg queue age': snapshot.metrics.averageQueueAgeDays,
              'Due today': snapshot.metrics.publisherActionsDueToday,
              'Moved this week': snapshot.metrics.assetsMovedThisWeek,
            }).map(([label, value]) => (
              <div key={label} className="border border-white/10 bg-white/[0.035] p-4">
                <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-white/40">{label}</p>
                <p className="mt-3 text-3xl font-semibold">{value}</p>
              </div>
            ))}
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          {[
            ['all', 'All assets'],
            ['proof', 'Proof assets'],
            ['publisher', 'Publisher action'],
            ['blocked', 'Blocked'],
            ['editorial', 'Editorial'],
          ].map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setFilter(id)}
              className={`min-h-[38px] rounded-full border px-4 text-[12px] font-semibold uppercase tracking-[0.08em] ${
                filter === id
                  ? 'border-blue-400 bg-blue-500/20 text-blue-100'
                  : 'border-white/10 bg-white/[0.03] text-white/50'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="mt-6 space-y-4">
          {queue.map((item) => (
            <article key={item.key} className="border border-white/10 bg-white/[0.035] p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-blue-300">
                    {item.intakeReference || 'No reference'} · {item.currentStage}
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold">{item.title}</h2>
                  <p className="mt-1 text-[14px] text-white/60">{item.authorName || item.authorEmail}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge label={item.actionOwner === 'publisher' ? 'Publisher Action' : 'System Hold'} tone={item.actionOwner === 'publisher' ? 'blue' : 'amber'} />
                  <Badge label={item.contractStatus} />
                  <Badge label={item.paymentStatus} />
                </div>
              </div>

              <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <Info label="Contact" value={item.contactId || 'Missing'} />
                <Info label="Title ID" value={item.titleId || 'Not created'} />
                <Info label="Asset ID" value={item.assetId || 'Not created'} />
                <Info label="Age" value={`${item.ageDays} day${item.ageDays === 1 ? '' : 's'} · ${item.ageBucket}`} />
                <Info label="Queue state" value={item.overdueState} />
                <Info label="Editorial" value={item.editorialStage} />
                <Info label="Capability" value={item.capability} />
                <Info label="Current blocker" value={item.currentBlocker} />
                <Info label="Next valid action" value={item.recommendedNextAction} />
              </div>

              <div className="mt-5 border-t border-white/10 pt-4">
                <p className="text-[13px] leading-6 text-white/58">
                  Latest evidence: {item.latestExecutionEvidence || 'No recent execution evidence found.'}
                </p>
                {item.sharePointLink && (
                  <a
                    href={item.sharePointLink}
                    className="mt-2 inline-flex text-[13px] font-semibold text-blue-300"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Open source evidence
                  </a>
                )}
              </div>

              <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-[12px] leading-6 text-white/46">
                  Author-facing consequence: {item.authorizedActions.find((action) => action.id !== 'view_only')?.authorFacingConsequence || 'None.'}
                </p>
                <div className="flex flex-wrap gap-2">
                  {item.authorizedActions
                    .filter((action) => action.id !== 'view_only')
                    .map((action) => {
                      const stateKey = `${item.key}:${action.id}`
                      return (
                        <button
                          key={action.id}
                          type="button"
                          onClick={() => void runAction(item, action.id)}
                          disabled={actionState.itemKey === stateKey && actionState.status === 'running'}
                          className="min-h-[42px] rounded-full bg-blue-500 px-5 text-[12px] font-semibold uppercase tracking-[0.08em] text-white disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {actionState.itemKey === stateKey && actionState.status === 'running' ? 'Running...' : action.label}
                        </button>
                      )
                    })}
                </div>
              </div>

              {actionState.itemKey.startsWith(`${item.key}:`) && actionState.message && (
                <p
                  className={`mt-4 border px-4 py-3 text-[13px] ${
                    actionState.status === 'error'
                      ? 'border-red-300/20 bg-red-300/10 text-red-100'
                      : 'border-blue-300/20 bg-blue-300/10 text-blue-100'
                  }`}
                >
                  {actionState.message}
                </p>
              )}
            </article>
          ))}
        </div>
      </section>
    </main>
  )
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-white/10 bg-black/15 p-3">
      <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-white/35">{label}</p>
      <p className="mt-2 break-words text-[13px] leading-5 text-white/75">{value}</p>
    </div>
  )
}

function Badge({ label, tone = 'neutral' }: { label: string; tone?: 'neutral' | 'blue' | 'amber' }) {
  const color =
    tone === 'blue'
      ? 'border-blue-300/30 bg-blue-400/10 text-blue-100'
      : tone === 'amber'
        ? 'border-amber-300/30 bg-amber-400/10 text-amber-100'
        : 'border-white/10 bg-white/[0.04] text-white/55'
  return (
    <span className={`rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.06em] ${color}`}>
      {label}
    </span>
  )
}
