// Engine: Publisher Today Rendering Engine
// Reusable? Y
// Stage-specific exception? N

'use client'

import { useMemo, useState, type ReactNode } from 'react'
import { getProviders, signIn, signOut } from 'next-auth/react'

import { PUBLISHER_OPERATING_CENTER_PROVIDER_ID } from '@/lib/author-durable-auth-shared'
import type {
  HumanPipelineCard,
  HumanPipelineReconciliationCard,
  HumanPipelineStageId,
  HumanPipelineView,
} from '@/lib/publishing/lifecycle/human-pipeline-read-model'

type Props = {
  initialPipeline: HumanPipelineView | null
  signedIn: boolean
  operatorEmail?: string | null
}

type WaitFilter = 'ALL' | 'JACKIE' | 'AUTHOR' | 'SYSTEM' | 'BLOCKED' | 'EXCEPTION'

export function PublisherPipelineClient({ initialPipeline, signedIn, operatorEmail }: Props) {
  const [pipeline, setPipeline] = useState(initialPipeline)
  const [selectedKey, setSelectedKey] = useState<string | null>(initialPipeline?.cards[0]?.key || null)
  const [stageMode, setStageMode] = useState<'ALL' | 'ACTIVE'>('ALL')
  const [waitFilter, setWaitFilter] = useState<WaitFilter>('ALL')
  const [refreshing, setRefreshing] = useState(false)

  const filteredCards = useMemo(() => {
    const cards = pipeline?.cards || []
    if (waitFilter === 'JACKIE') return cards.filter((card) => card.waitingOn === 'Jackie')
    if (waitFilter === 'AUTHOR') return cards.filter((card) => card.waitingOn === 'Author')
    if (waitFilter === 'SYSTEM') return cards.filter((card) => card.waitingOn === 'System')
    if (waitFilter === 'BLOCKED') return cards.filter((card) => card.attention === 'Blocked')
    if (waitFilter === 'EXCEPTION') return cards.filter((card) => card.attention === 'Exception')
    return cards
  }, [pipeline, waitFilter])

  const cardsByStage = useMemo(() => {
    const byStage = new Map<HumanPipelineStageId, HumanPipelineCard[]>()
    for (const stage of pipeline?.stages || []) byStage.set(stage.id, [])
    for (const card of filteredCards) byStage.set(card.stageId, [...(byStage.get(card.stageId) || []), card])
    return byStage
  }, [filteredCards, pipeline])

  const visibleStages = useMemo(() => {
    const stages = pipeline?.stages || []
    if (stageMode === 'ALL') return stages
    return stages.filter((stage) => (cardsByStage.get(stage.id) || []).length > 0)
  }, [cardsByStage, pipeline, stageMode])

  const selected =
    filteredCards.find((card) => card.key === selectedKey) ||
    pipeline?.reconciliationRequired.find((card) => card.key === selectedKey) ||
    filteredCards[0] ||
    pipeline?.reconciliationRequired[0] ||
    null

  async function refresh() {
    setRefreshing(true)
    try {
      const response = await fetch('/api/publisher/pipeline', { cache: 'no-store' })
      if (!response.ok) return
      const next = (await response.json()) as HumanPipelineView
      setPipeline(next)
      setSelectedKey((current) => current || next.cards[0]?.key || next.reconciliationRequired[0]?.key || null)
    } finally {
      setRefreshing(false)
    }
  }

  async function signInPublisher() {
    const providers = await getProviders()
    const providerId = providers?.[PUBLISHER_OPERATING_CENTER_PROVIDER_ID]
      ? PUBLISHER_OPERATING_CENTER_PROVIDER_ID
      : undefined

    await signIn(providerId, { callbackUrl: '/publisher/pipeline' })
  }

  if (!signedIn) {
    return (
      <main className="min-h-screen bg-[#080b12] text-white">
        <section className="mx-auto flex min-h-screen max-w-5xl flex-col justify-center px-6 py-16">
          <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-blue-300">Publishing Pipeline</p>
          <h1 className="mt-5 max-w-3xl font-display text-5xl leading-tight md:text-7xl">Title lifecycle board.</h1>
          <p className="mt-6 max-w-2xl text-[16px] leading-8 text-white/62">
            Sign in with an approved JM1 workforce identity to see the current 16-stage publishing pipeline.
          </p>
          <div className="mt-9">
            <button
              type="button"
              onClick={() => void signInPublisher()}
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
        <div className="mx-auto flex w-full max-w-none flex-col gap-5 px-5 py-6 sm:px-8 2xl:px-10 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-blue-300">J Merrill Publishing</p>
            <h1 className="mt-2 font-display text-4xl leading-tight md:text-6xl">Publishing Pipeline</h1>
            <p className="mt-3 max-w-3xl text-[14px] leading-7 text-white/60">
              The 16-stage daily view for where each title is, who it is waiting on, and what needs attention.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-full border border-white/10 px-4 py-2 text-[12px] text-white/60">{operatorEmail}</span>
            <button
              type="button"
              onClick={() => void refresh()}
              className="min-h-[40px] rounded-full border border-blue-400/30 px-4 text-[12px] font-semibold uppercase tracking-[0.08em] text-blue-200"
            >
              {refreshing ? 'Refreshing' : 'Refresh'}
            </button>
            <a
              href="/publisher/operating-center"
              className="inline-flex min-h-[40px] items-center rounded-full border border-white/10 px-4 text-[12px] font-semibold uppercase tracking-[0.08em] text-white/60"
            >
              Operating Center
            </a>
            <button
              type="button"
              onClick={() => void signOut({ callbackUrl: '/publisher/pipeline' })}
              className="min-h-[40px] rounded-full border border-white/10 px-4 text-[12px] font-semibold uppercase tracking-[0.08em] text-white/60"
            >
              Sign out
            </button>
          </div>
        </div>
      </section>

      <section className="px-5 py-5 sm:px-8 2xl:px-10">
        {!pipeline && (
          <div className="border border-amber-300/30 bg-amber-950/20 p-5 text-[13px] leading-6 text-amber-50">
            Pipeline data is unavailable.
          </div>
        )}

        {pipeline && (
          <>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5 2xl:grid-cols-9">
              <Summary label="Active titles" value={pipeline.summary.totalTitles} />
              <Summary label="Placed" value={pipeline.summary.placedTitles} />
              <Summary label="Needs Jackie" value={pipeline.summary.needsJackie} tone="amber" />
              <Summary label="Waiting author" value={pipeline.summary.waitingOnAuthor} tone="blue" />
              <Summary label="Waiting system" value={pipeline.summary.waitingOnSystem} />
              <Summary label="Blocked" value={pipeline.summary.blocked} tone="amber" />
              <Summary label="Exceptions" value={pipeline.summary.exceptions} tone="rose" />
              <Summary label="Reconcile" value={pipeline.summary.reconciliationRequired} tone="rose" />
              <Summary label="Historical refs" value={pipeline.summary.suppressedHistoricalReferences} />
            </div>

            <div className="mt-5 flex flex-col gap-3 border border-white/10 bg-white/[0.035] p-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-wrap gap-2">
                {[
                  ['ALL', 'Show All Stages'],
                  ['ACTIVE', 'Active Stages Only'],
                ].map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setStageMode(id as 'ALL' | 'ACTIVE')}
                    className={`min-h-[36px] border px-3 text-[11px] font-semibold uppercase tracking-[0.08em] ${
                      stageMode === id
                        ? 'border-blue-300 bg-blue-400/15 text-blue-100'
                        : 'border-white/10 bg-black/20 text-white/55'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <label className="flex min-w-[260px] items-center gap-3 text-[12px] text-white/55">
                <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-white/35">Jump</span>
                <select
                  className="min-h-[38px] w-full border border-white/10 bg-[#071323] px-3 text-white"
                  defaultValue=""
                  onChange={(event) => {
                    if (event.target.value) document.getElementById(event.target.value)?.scrollIntoView({ behavior: 'smooth', inline: 'start' })
                  }}
                >
                  <option value="">Select stage</option>
                  {pipeline.stages.map((stage) => (
                    <option key={stage.id} value={stage.id}>{stage.label}</option>
                  ))}
                </select>
              </label>
              <div className="flex flex-wrap gap-2">
                {[
                  ['ALL', 'All'],
                  ['JACKIE', 'Jackie'],
                  ['AUTHOR', 'Author'],
                  ['SYSTEM', 'System'],
                  ['BLOCKED', 'Blocked'],
                  ['EXCEPTION', 'Exception'],
                ].map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setWaitFilter(id as WaitFilter)}
                    className={`min-h-[36px] border px-3 text-[11px] font-semibold uppercase tracking-[0.08em] ${
                      waitFilter === id
                        ? 'border-blue-300 bg-blue-400/15 text-blue-100'
                        : 'border-white/10 bg-black/20 text-white/55'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_390px] 2xl:grid-cols-[minmax(0,1fr)_440px]">
              <div className="overflow-x-auto pb-4">
                <div className="grid auto-cols-[280px] grid-flow-col gap-3">
                  {visibleStages.map((stage) => {
                    const stageCards = cardsByStage.get(stage.id) || []
                    return (
                      <section
                        key={stage.id}
                        id={stage.id}
                        className="min-h-[560px] border border-white/10 bg-black/20"
                      >
                        <div className="sticky top-0 z-10 border-b border-white/10 bg-[#0a1220] p-3">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-blue-300">
                                Stage {stage.number}
                              </p>
                              <h2 className="mt-1 text-[15px] font-semibold text-white">{stage.shortLabel}</h2>
                            </div>
                            <Badge label={String(stageCards.length)} tone={stageCards.length ? 'blue' : 'neutral'} />
                          </div>
                          <p className="mt-2 text-[11px] leading-5 text-white/40">{stage.description}</p>
                        </div>
                        <div className="grid gap-3 p-3">
                          {stageCards.map((card) => (
                            <PipelineCard
                              key={card.key}
                              card={card}
                              selected={selected?.key === card.key}
                              onSelect={() => setSelectedKey(card.key)}
                            />
                          ))}
                          {stageCards.length === 0 && (
                            <div className="border border-dashed border-white/10 p-3 text-[12px] leading-5 text-white/35">
                              No active title.
                            </div>
                          )}
                        </div>
                      </section>
                    )
                  })}
                </div>

                {pipeline.reconciliationRequired.length > 0 && (
                  <section className="mt-4 border border-rose-300/25 bg-rose-950/15 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-rose-200">Reconciliation</p>
                        <h2 className="mt-1 text-xl font-semibold">Titles not silently placed</h2>
                      </div>
                      <Badge label={String(pipeline.reconciliationRequired.length)} tone="rose" />
                    </div>
                    <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                      {pipeline.reconciliationRequired.map((card) => (
                        <ReconciliationCard
                          key={card.key}
                          card={card}
                          selected={selected?.key === card.key}
                          onSelect={() => setSelectedKey(card.key)}
                        />
                      ))}
                    </div>
                  </section>
                )}
                {pipeline.suppressedHistoricalReferences.length > 0 && (
                  <section className="mt-4 border border-white/10 bg-white/[0.03] p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-white/40">Historical</p>
                        <h2 className="mt-1 text-xl font-semibold">Archived duplicate references</h2>
                      </div>
                      <Badge label={String(pipeline.suppressedHistoricalReferences.length)} tone="neutral" />
                    </div>
                    <div className="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                      {pipeline.suppressedHistoricalReferences.map((item) => (
                        <div key={item.WorkId} className="border border-white/10 bg-black/20 p-3">
                          <h3 className="text-[13px] font-semibold leading-5 text-white">{item.Title}</h3>
                          <p className="mt-1 text-[12px] text-white/50">{item.Author}</p>
                          <p className="mt-3 text-[11px] leading-5 text-white/45">{item.ReferenceId} preserved as historical evidence.</p>
                        </div>
                      ))}
                    </div>
                  </section>
                )}
              </div>

              <DetailPanel card={selected} />
            </div>

            <p className="mt-3 text-[11px] leading-5 text-white/35">
              Source: {pipeline.authoritySource} Generated {formatDateTime(pipeline.generatedAt)}.
            </p>
          </>
        )}
      </section>
    </main>
  )
}

function Summary({ label, value, tone = 'neutral' }: { label: string; value: number; tone?: 'neutral' | 'blue' | 'amber' | 'rose' }) {
  const color = tone === 'rose' ? 'text-rose-100' : tone === 'amber' ? 'text-amber-100' : tone === 'blue' ? 'text-blue-100' : 'text-white'
  return (
    <div className="border border-white/10 bg-white/[0.035] p-4">
      <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-white/35">{label}</p>
      <p className={`mt-2 text-3xl font-semibold ${color}`}>{value}</p>
    </div>
  )
}

function PipelineCard({ card, selected, onSelect }: { card: HumanPipelineCard; selected: boolean; onSelect: () => void }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full border p-3 text-left transition ${
        selected ? 'border-blue-300 bg-blue-400/10' : 'border-white/10 bg-white/[0.04] hover:border-blue-300/40'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-[13px] font-semibold leading-5 text-white">{card.title}</h3>
          <p className="mt-1 text-[12px] text-white/50">{card.author}</p>
        </div>
        <AttentionDot attention={card.attention} />
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <Badge label={card.waitingOn} tone={badgeTone(card.waitingOn, card.attention)} />
        <Badge label={card.attention} tone={card.attention === 'Blocked' || card.attention === 'Exception' ? 'rose' : 'neutral'} />
      </div>
      <p className="mt-3 text-[12px] leading-5 text-white/72">{card.conciseStatus}</p>
      <div className="mt-3 grid gap-1.5 text-[11px] leading-5 text-white/45">
        <p>{card.imprint}</p>
        <p>{card.package}</p>
      </div>
    </button>
  )
}

function ReconciliationCard({
  card,
  selected,
  onSelect,
}: {
  card: HumanPipelineReconciliationCard
  selected: boolean
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`border p-3 text-left transition ${
        selected ? 'border-rose-200 bg-rose-400/10' : 'border-rose-300/20 bg-black/20 hover:border-rose-200/50'
      }`}
    >
      <h3 className="text-[13px] font-semibold leading-5 text-white">{card.title}</h3>
      <p className="mt-1 text-[12px] text-white/50">{card.author}</p>
      <p className="mt-3 text-[12px] leading-5 text-rose-100">{card.reason || card.nextAction}</p>
      <p className="mt-2 text-[11px] leading-5 text-white/55">{card.ambiguityReason}</p>
      <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.12em] text-white/35">
        Attempted: {card.attemptedStage || 'unresolved'}
      </p>
    </button>
  )
}

function DetailPanel({ card }: { card: HumanPipelineCard | HumanPipelineReconciliationCard | null }) {
  if (!card) {
    return (
      <aside className="border border-white/10 bg-black/20 p-5 text-[13px] leading-6 text-white/45">
        Select a title to see what it is waiting on and where to open the detailed Operating Center view.
      </aside>
    )
  }

  const isReconciliation = card.confidence === 'RECONCILIATION_REQUIRED'
  return (
    <aside className="border border-white/10 bg-black/25 p-5 xl:sticky xl:top-4 xl:max-h-[calc(100vh-2rem)] xl:overflow-y-auto">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-blue-300">
            {isReconciliation ? 'Reconciliation Required' : 'Title Detail'}
          </p>
          <h2 className="mt-2 text-2xl font-semibold leading-tight">{card.title}</h2>
          <p className="mt-1 text-[13px] text-white/55">{card.author}</p>
        </div>
        <AttentionDot attention={card.attention} />
      </div>

      <div className="mt-5 grid gap-3">
        <DetailBlock title="Current State">
          <MiniFact label="Stage" value={isReconciliation ? 'Not placed' : (card as HumanPipelineCard).stageLabel} />
          <MiniFact label="Substage" value={card.substage} />
          <MiniFact label="Status" value={card.conciseStatus} />
          <MiniFact label="Waiting On" value={card.waitingOn} />
          <MiniFact label="Attention" value={card.attention} />
          <MiniFact label="Confidence" value={card.confidence} />
        </DetailBlock>

        <DetailBlock title="Next Action">
          <MiniFact label="Reason" value={card.reason || 'No reason surfaced'} />
          <MiniFact label="Next" value={card.nextAction || 'Review in Operating Center'} />
          <MiniFact label="Blocker" value={card.blocker || 'None recorded'} />
          <MiniFact label="Target" value={card.targetDate || 'No target date surfaced'} />
        </DetailBlock>

        {isReconciliation && (
          <DetailBlock title="Reconciliation">
            <MiniFact label="Why Here" value={(card as HumanPipelineReconciliationCard).ambiguityReason} />
            <MiniFact label="Evidence" value={(card as HumanPipelineReconciliationCard).evidenceAuthority} />
            <MiniFact label="Resolution" value={(card as HumanPipelineReconciliationCard).resolutionClass} />
            <MiniFact label="Missing" value={(card as HumanPipelineReconciliationCard).missingEvidence} />
            <MiniFact label="Repair" value={(card as HumanPipelineReconciliationCard).proposedRepair} />
            <MiniFact label="Automation" value={(card as HumanPipelineReconciliationCard).safeToAutomate} />
          </DetailBlock>
        )}

        <DetailBlock title="Title Facts">
          <MiniFact label="Imprint" value={card.imprint} />
          <MiniFact label="Package" value={card.package} />
          <MiniFact label="Recent Movement" value={card.recentMovement || 'No recent movement surfaced'} />
        </DetailBlock>

        <a
          href={card.operatingCenterUrl}
          className="inline-flex min-h-[42px] items-center justify-center border border-blue-300/30 bg-blue-500/10 px-4 text-[12px] font-semibold uppercase tracking-[0.08em] text-blue-100"
        >
          Open in Operating Center
        </a>
      </div>
    </aside>
  )
}

function DetailBlock({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="border border-white/10 bg-white/[0.03] p-3">
      <h3 className="text-[12px] font-semibold uppercase tracking-[0.08em] text-white/50">{title}</h3>
      <div className="mt-3 grid gap-2">{children}</div>
    </section>
  )
}

function MiniFact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-white/35">{label}</p>
      <p className="mt-1 break-words text-[12px] leading-5 text-white/75">{value || 'None'}</p>
    </div>
  )
}

function Badge({ label, tone = 'neutral' }: { label: string; tone?: 'neutral' | 'blue' | 'amber' | 'rose' }) {
  const classes =
    tone === 'blue'
      ? 'border-blue-300/25 bg-blue-400/10 text-blue-100'
      : tone === 'amber'
        ? 'border-amber-300/25 bg-amber-400/10 text-amber-100'
        : tone === 'rose'
          ? 'border-rose-300/25 bg-rose-400/10 text-rose-100'
          : 'border-white/10 bg-white/[0.04] text-white/55'
  return (
    <span className={`inline-flex min-h-[24px] items-center border px-2.5 text-[10px] font-semibold uppercase tracking-[0.08em] ${classes}`}>
      {label}
    </span>
  )
}

function AttentionDot({ attention }: { attention: HumanPipelineCard['attention'] }) {
  const color =
    attention === 'Exception'
      ? 'bg-rose-300'
      : attention === 'Blocked'
        ? 'bg-amber-300'
        : attention === 'Attention'
          ? 'bg-blue-300'
          : 'bg-emerald-300'
  return <span aria-label={attention} className={`mt-1 block size-3 ${color}`} />
}

function badgeTone(waitingOn: HumanPipelineCard['waitingOn'], attention: HumanPipelineCard['attention']) {
  if (attention === 'Exception' || attention === 'Blocked') return 'rose'
  if (waitingOn === 'Jackie') return 'amber'
  if (waitingOn === 'Author' || waitingOn === 'System') return 'blue'
  return 'neutral'
}

function formatDateTime(value: string) {
  if (!value) return 'Not available'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date)
}
