'use client'

import { useMemo, useState } from 'react'

import type {
  CoverReadiness,
  ProductionPipelineStage,
  ProductionReadiness,
  PublisherActionContract,
  PublisherOperatingCenterModel,
  PublisherQueueItem,
  PublisherSectionKey,
} from '@/lib/server/publisher-operating-center'

type ActionState = {
  status: 'idle' | 'saving' | 'success' | 'error'
  message: string
}

const ACTION_OPTIONS = [
  { key: 'place-asset-in-pipeline', label: 'Place Asset in Pipeline' },
  { key: 'advance-stage', label: 'Advance to Next Stage' },
  { key: 'begin-interior-layout', label: 'Begin Interior Layout' },
  { key: 'begin-cover-design', label: 'Begin Cover Design' },
  { key: 'review-royalty-statement', label: 'Review Royalty Statement' },
]

export function PublisherOperatingCenter({ model }: { model: PublisherOperatingCenterModel }) {
  const [activeSection, setActiveSection] = useState<PublisherSectionKey>('today')
  const [actionState, setActionState] = useState<ActionState>({ status: 'idle', message: '' })
  const [actionForm, setActionForm] = useState({
    action: 'place-asset-in-pipeline',
    title: '',
    author: '',
    requestedState: '',
    reason: '',
  })

  const visibleQueues = useMemo(
    () => Object.entries(model.today).filter(([, items]) => items.length > 0),
    [model.today],
  )

  async function submitAction(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setActionState({ status: 'saving', message: '' })

    try {
      const response = await fetch('/api/publisher/actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(actionForm),
      })
      const data = (await response.json().catch(() => null)) as
        | { error?: string; result?: { eventType?: string; correlationId?: string; executionLogId?: string } }
        | null

      if (!response.ok) {
        throw new Error(data?.error || 'The publisher action could not be recorded.')
      }

      setActionState({
        status: 'success',
        message: `Recorded ${data?.result?.eventType || 'publisher action'} with correlation ${data?.result?.correlationId || 'pending'}.`,
      })
    } catch (error) {
      setActionState({
        status: 'error',
        message: error instanceof Error ? error.message : 'The publisher action could not be recorded.',
      })
    }
  }

  return (
    <main className="min-h-screen bg-[#0f1418] text-white">
      <header className="border-b border-white/10 bg-[#111922] px-5 py-5">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-sky-300">Publisher Operating Center</p>
            <h1 className="mt-2 text-3xl font-semibold">Publisher Today</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-white/60">
              One operating surface for daily publishing movement, production readiness, royalty review, author portfolios,
              invitations, and exceptions.
            </p>
          </div>
          <div className="border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white/70">
            <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-white/40">Signed in</div>
            <div>{model.operator.email}</div>
            <div className="text-white/45">{model.operator.role} · {model.operator.authMode}</div>
          </div>
        </div>
      </header>

      <nav className="border-b border-white/10 bg-[#0f1418] px-5">
        <div className="mx-auto flex max-w-7xl gap-2 overflow-x-auto py-3">
          {model.navigation.map((item) => (
            <button
              className={`whitespace-nowrap border px-3 py-2 text-sm ${
                activeSection === item.key ? 'border-sky-300 bg-sky-300 text-slate-950' : 'border-white/10 text-white/65'
              }`}
              key={item.key}
              onClick={() => setActiveSection(item.key)}
              type="button"
            >
              {item.label}
            </button>
          ))}
        </div>
      </nav>

      <div className="mx-auto grid max-w-7xl gap-6 px-5 py-6 xl:grid-cols-[1fr_360px]">
        <section className="space-y-6">
          {activeSection === 'today' ? (
            <PublisherToday queues={visibleQueues} />
          ) : null}
          {activeSection === 'pipeline' ? (
            <QueueSection items={model.pipelineItems} title="Active Pipeline" />
          ) : null}
          {activeSection === 'production' ? (
            <ProductionSection
              cover={model.production.cover}
              interior={model.production.interior}
              pipelineV2={model.production.pipelineV2}
              sharePointDesign={model.production.sharePointDesign}
            />
          ) : null}
          {activeSection === 'royalties' ? (
            <RoyaltySection model={model} />
          ) : null}
          {activeSection === 'exceptions' ? (
            <ExceptionsSection model={model} />
          ) : null}
          {['catalog', 'authors', 'invitations'].includes(activeSection) ? (
            <OperationalSection section={activeSection} />
          ) : null}
        </section>

        <aside className="space-y-5">
          <ActionPanel
            actionForm={actionForm}
            actionState={actionState}
            contracts={model.actionContracts}
            setActionForm={setActionForm}
            submitAction={submitAction}
          />
          <section className="border border-white/10 bg-white/[0.04] p-5">
            <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-white/40">Production model</p>
            <p className="mt-3 text-sm leading-6 text-white/65">
              Interior Layout and Cover Design can run concurrently. The title folder remains canonical under the governed
              Production parent; workstream folders and metadata carry the parallel state.
            </p>
          </section>
        </aside>
      </div>
    </main>
  )
}

function PublisherToday({ queues }: { queues: Array<[string, PublisherQueueItem[]]> }) {
  return (
    <div className="space-y-5">
      {queues.map(([label, items]) => (
        <section className="border border-white/10 bg-white/[0.035] p-5" key={label}>
          <h2 className="text-xl font-semibold">{label}</h2>
          <div className="mt-4 grid gap-3">
            {items.map((item) => (
              <QueueCard item={item} key={item.id} />
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}

function QueueSection({ items, title }: { items: PublisherQueueItem[]; title: string }) {
  return (
    <section className="border border-white/10 bg-white/[0.035] p-5">
      <h2 className="text-xl font-semibold">{title}</h2>
      <div className="mt-4 grid gap-3">
        {items.map((item) => (
          <QueueCard item={item} key={item.id} />
        ))}
      </div>
    </section>
  )
}

function QueueCard({ item }: { item: PublisherQueueItem }) {
  return (
    <article className="border border-white/10 bg-[#121b24] p-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-sky-300">{item.priority} · {item.owner}</p>
          <h3 className="mt-1 text-lg font-semibold">{item.title}</h3>
          <p className="text-sm text-white/50">{item.author}</p>
        </div>
        <div className="text-left text-sm text-white/60 md:text-right">
          <div>{item.state}</div>
          <div>{item.ageDays}d open</div>
        </div>
      </div>
      <p className="mt-3 text-sm leading-6 text-white/70">{item.nextAction}</p>
      {item.blocker ? <p className="mt-2 text-sm text-amber-200">Blocker: {item.blocker}</p> : null}
    </article>
  )
}

function ProductionSection({
  cover,
  interior,
  pipelineV2,
  sharePointDesign,
}: {
  cover: CoverReadiness[]
  interior: ProductionReadiness[]
  pipelineV2: ProductionPipelineStage[]
  sharePointDesign: string[]
}) {
  return (
    <div className="space-y-5" id="production">
      <ReadinessTable rows={interior} title="Interior Layout Readiness" />
      <CoverTable rows={cover} title="Cover Design Readiness" />
      <ProductionPipelineV2Table rows={pipelineV2} />
      <section className="border border-white/10 bg-white/[0.035] p-5">
        <h2 className="text-xl font-semibold">SharePoint Physical Pipeline</h2>
        <div className="mt-4 grid gap-2">
          {sharePointDesign.map((path) => (
            <code className="border border-white/10 bg-black/20 px-3 py-2 text-sm text-white/70" key={path}>{path}</code>
          ))}
        </div>
      </section>
    </div>
  )
}

function ProductionPipelineV2Table({ rows }: { rows: ProductionPipelineStage[] }) {
  return (
    <section className="border border-white/10 bg-white/[0.035] p-5">
      <h2 className="text-xl font-semibold">Production Pipeline v2.0</h2>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[1180px] text-left text-sm">
          <thead className="text-white/40">
            <tr><th>Stage</th><th>Lane</th><th>Work</th><th>QA</th><th>Release</th><th>Timing</th><th>Owner</th><th>Next action</th></tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr className="border-t border-white/10" key={row.stageCode}>
                <td className="py-3 pr-3">
                  <div className="text-white">{row.label}</div>
                  <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-white/35">{row.jStage} · {row.stageCode}</div>
                </td>
                <td className="py-3 pr-3 text-white/65">{row.lane}</td>
                <td className="py-3 pr-3 text-white/65">{row.workStatus}</td>
                <td className="py-3 pr-3 text-white/65">{row.qaStatus}</td>
                <td className="py-3 pr-3 text-white/65">{row.releaseStatus}</td>
                <td className="py-3 pr-3 text-white/65">{row.timingGovernance}</td>
                <td className="py-3 pr-3 text-white/65">{row.owner}</td>
                <td className="py-3 text-white/65">
                  <div>{row.currentSignal}</div>
                  <div className="mt-1 text-white/45">{row.nextAction}</div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

function ReadinessTable({ rows, title }: { rows: ProductionReadiness[]; title: string }) {
  return (
    <section className="border border-white/10 bg-white/[0.035] p-5">
      <h2 className="text-xl font-semibold">{title}</h2>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="text-white/40">
            <tr><th>Title</th><th>Editorial</th><th>Interior</th><th>Readiness</th><th>Next action</th></tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr className="border-t border-white/10" key={row.title}>
                <td className="py-3 pr-3 text-white">{row.title}</td>
                <td className="py-3 pr-3 text-white/65">{row.editorialState}</td>
                <td className="py-3 pr-3 text-white/65">{row.interiorState}</td>
                <td className="py-3 pr-3 text-amber-100">{row.readiness}</td>
                <td className="py-3 text-white/65">{row.nextAction}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

function CoverTable({ rows, title }: { rows: CoverReadiness[]; title: string }) {
  return (
    <section className="border border-white/10 bg-white/[0.035] p-5">
      <h2 className="text-xl font-semibold">{title}</h2>
      <div className="mt-4 grid gap-3">
        {rows.map((row) => (
          <article className="border border-white/10 bg-[#121b24] p-4" key={row.title}>
            <div className="flex flex-col gap-2 md:flex-row md:justify-between">
              <h3 className="font-semibold">{row.title}</h3>
              <span className="text-sm text-sky-200">{row.readiness}</span>
            </div>
            <p className="mt-2 text-sm text-white/65">{row.nextAction}</p>
            <p className="mt-2 text-xs uppercase tracking-[0.1em] text-white/35">Rights: {row.rightsEvidence}</p>
          </article>
        ))}
      </div>
    </section>
  )
}

function RoyaltySection({ model }: { model: PublisherOperatingCenterModel }) {
  const royalty = model.royalties
  return (
    <section className="border border-white/10 bg-white/[0.035] p-5" id="royalties">
      <h2 className="text-xl font-semibold">Royalty Statements Awaiting Review</h2>
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <Metric label="Manifest rows" value={royalty.manifestRows} />
        <Metric label="Loaded rows" value={royalty.loadedRows} />
        <Metric label="Draft statements" value={royalty.draftStatements} />
        <Metric label="Identity decisions" value={royalty.identityHolds} />
        <Metric label="Title decisions" value={royalty.titleHolds} />
        <Metric label="Payment rows" value={royalty.paymentRows} />
      </div>
      <p className="mt-4 text-sm text-white/65">
        Decision package: <code>{royalty.decisionPackagePath}</code>
      </p>
    </section>
  )
}

function ExceptionsSection({ model }: { model: PublisherOperatingCenterModel }) {
  return (
    <section className="border border-white/10 bg-white/[0.035] p-5">
      <h2 className="text-xl font-semibold">Exceptions</h2>
      <p className="mt-3 text-sm leading-6 text-white/65">
        Active exception queues include royalty identity/title/payment decisions, compilation source reconciliation,
        SharePoint synchronization drift, portal access exceptions, duplicate/test asset review, and failed transitions.
      </p>
      <div className="mt-4 grid gap-3">
        {model.today['Alerts and Failed Transitions'].map((item) => (
          <QueueCard item={item} key={item.id} />
        ))}
      </div>
    </section>
  )
}

function OperationalSection({ section }: { section: string }) {
  const copy: Record<string, string> = {
    catalog: 'Published backlist placement, format/edition grouping, and catalog exceptions are reviewed here before any author invitation expands portfolio visibility.',
    authors: 'Author portfolio preview, contact resolution, email updates, and new-contact approvals are controlled here.',
    invitations: 'Pilot invitations can be prepared here. Mass invitation remains locked pending separate approval.',
  }
  return (
    <section className="border border-white/10 bg-white/[0.035] p-5">
      <h2 className="text-xl font-semibold capitalize">{section}</h2>
      <p className="mt-3 text-sm leading-6 text-white/65">{copy[section]}</p>
    </section>
  )
}

function ActionPanel({
  actionForm,
  actionState,
  contracts,
  setActionForm,
  submitAction,
}: {
  actionForm: { action: string; title: string; author: string; requestedState: string; reason: string }
  actionState: ActionState
  contracts: PublisherActionContract[]
  setActionForm: (next: { action: string; title: string; author: string; requestedState: string; reason: string }) => void
  submitAction: (event: React.FormEvent<HTMLFormElement>) => void
}) {
  const selectedContract = contracts.find((contract) => contract.key === actionForm.action)
  return (
    <section className="border border-white/10 bg-white/[0.04] p-5">
      <h2 className="text-lg font-semibold">Publisher Action</h2>
      <form className="mt-4 space-y-3" onSubmit={submitAction}>
        <select
          className="w-full border border-white/10 bg-[#0f1418] px-3 py-2 text-sm"
          onChange={(event) => setActionForm({ ...actionForm, action: event.target.value })}
          value={actionForm.action}
        >
          {ACTION_OPTIONS.map((option) => (
            <option key={option.key} value={option.key}>{option.label}</option>
          ))}
        </select>
        <input className="w-full border border-white/10 bg-[#0f1418] px-3 py-2 text-sm" onChange={(event) => setActionForm({ ...actionForm, title: event.target.value })} placeholder="Title" value={actionForm.title} />
        <input className="w-full border border-white/10 bg-[#0f1418] px-3 py-2 text-sm" onChange={(event) => setActionForm({ ...actionForm, author: event.target.value })} placeholder="Author" value={actionForm.author} />
        <input className="w-full border border-white/10 bg-[#0f1418] px-3 py-2 text-sm" onChange={(event) => setActionForm({ ...actionForm, requestedState: event.target.value })} placeholder="Requested state" value={actionForm.requestedState} />
        <textarea className="min-h-24 w-full border border-white/10 bg-[#0f1418] px-3 py-2 text-sm" onChange={(event) => setActionForm({ ...actionForm, reason: event.target.value })} placeholder="Publisher reason" value={actionForm.reason} />
        <button className="w-full bg-sky-300 px-3 py-2 text-sm font-semibold text-slate-950" disabled={actionState.status === 'saving'} type="submit">
          {actionState.status === 'saving' ? 'Recording...' : 'Record Governed Action'}
        </button>
      </form>
      {actionState.message ? (
        <p className={`mt-3 text-sm ${actionState.status === 'error' ? 'text-amber-200' : 'text-emerald-200'}`}>
          {actionState.message}
        </p>
      ) : null}
      {selectedContract ? (
        <div className="mt-5 border-t border-white/10 pt-4 text-xs leading-5 text-white/55">
          <div className="font-mono uppercase tracking-[0.12em] text-white/35">{selectedContract.eventType}</div>
          <p className="mt-2">{selectedContract.authorFacingConsequence}</p>
          <p className="mt-2">Rollback: {selectedContract.rollback}</p>
        </div>
      ) : null}
    </section>
  )
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="border border-white/10 bg-[#121b24] p-4">
      <div className="text-2xl font-semibold">{value}</div>
      <div className="text-sm text-white/50">{label}</div>
    </div>
  )
}
