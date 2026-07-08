import type { Metadata } from 'next'
import Link from 'next/link'

import { AuthorGate } from '../_components/AuthorGate'
import { AuthorPortalShell } from '../_components/AuthorPortalShell'
import {
  portalActivationSummary,
  portalBoundaryRows,
  portalFileControls,
  portalMilestones,
  portalReadinessCards,
  portalTasks,
  type PortalStatusTone,
} from '@/lib/publishing/author-portal-mvp'
import { buildWorkspaceEditorialModule } from '@/lib/program003/editorial-command'
import { getEditorialRecordForAsset, getProgram003PilotAssetId } from '@/lib/program003/dataverse'

export const metadata: Metadata = {
  title: 'Author Portal | J Merrill Publishing',
  description: 'Private author portal MVP for activated J Merrill Publishing projects.',
  robots: {
    index: false,
    follow: false,
  },
}

const toneClasses: Record<PortalStatusTone, string> = {
  complete: 'border-emerald-400/20 bg-emerald-400/10 text-emerald-200',
  active: 'border-blue-400/25 bg-blue-500/10 text-blue-200',
  pending: 'border-amber-300/20 bg-amber-300/10 text-amber-100',
  locked: 'border-white/10 bg-white/[0.04] text-white/35',
}

export default function AuthorPortalPage() {
  const editorialRecordPromise = getProgram003PilotAssetId()
    ? getEditorialRecordForAsset(getProgram003PilotAssetId())
    : Promise.resolve(null)

  return <AuthorPortalPageInner editorialRecordPromise={editorialRecordPromise} />
}

async function AuthorPortalPageInner({
  editorialRecordPromise,
}: {
  editorialRecordPromise: Promise<Awaited<ReturnType<typeof getEditorialRecordForAsset>>>
}) {
  const editorialRecord = await editorialRecordPromise
  const editorialModule = editorialRecord ? buildWorkspaceEditorialModule(editorialRecord) : null

  return (
    <AuthorPortalShell
      eyebrow="Author portal MVP"
      title="Your activated project dashboard."
      description="This private dashboard shows approved project status, next actions, file controls, metadata readiness, and support pathways after agreement and first-payment confirmation."
    >
      <AuthorGate>
        <div className="space-y-8">
          <section className="rounded-[32px] border border-blue-500/20 bg-blue-500/[0.06] p-7 sm:p-9">
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
              <div>
                <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-blue-300">Activation status</p>
                <h2
                  className="mt-3 text-white"
                  style={{ fontFamily: "'Libre Baskerville', serif", fontSize: '34px', fontWeight: 700, lineHeight: 1.12 }}
                >
                  Portal active after OP-002.
                </h2>
                <p className="mt-3 max-w-[700px] text-[14px] font-light leading-[1.8] text-white/50">
                  Agreement and first-payment confirmation activate portal eligibility. The portal is a display and action
                  layer only; Dataverse remains the operational source of truth.
                </p>
              </div>
              <Link
                href="mailto:publishing@jmerrill.one"
                className="inline-flex h-12 items-center justify-center self-end rounded-full border border-blue-400/25 px-5 text-[12px] font-semibold uppercase tracking-[0.08em] text-blue-200 transition-colors hover:border-blue-300 hover:text-white"
              >
                Contact publishing
              </Link>
            </div>
          </section>

          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {Object.entries(portalActivationSummary).map(([label, value]) => (
              <div key={label} className="rounded-2xl border border-white/8 bg-white/[0.035] p-5">
                <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-white/30">{formatLabel(label)}</p>
                <p className="mt-2 text-[14px] font-medium leading-[1.55] text-white/75">{value}</p>
              </div>
            ))}
          </section>

          <section className="rounded-[32px] border border-white/8 bg-white/[0.035] p-7 sm:p-9">
            <div className="mb-7 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-blue-300">Milestone tracker</p>
                <h2 className="mt-3 text-[26px] font-semibold text-white">Relationship parent, title child.</h2>
              </div>
              <p className="max-w-[360px] text-[12px] leading-[1.7] text-white/32">
                Registration and later production modules remain locked until their own OP gates are complete.
              </p>
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              {portalMilestones.map((milestone, index) => (
                <div key={milestone.label} className="rounded-2xl border border-white/8 bg-black/15 p-5">
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-mono text-[11px] text-white/28">0{index + 1}</span>
                    <span className={`rounded-full border px-3 py-1 text-[10px] uppercase tracking-[0.1em] ${toneClasses[milestone.tone]}`}>
                      {milestone.status}
                    </span>
                  </div>
                  <h3 className="mt-4 text-[16px] font-semibold text-white">{milestone.label}</h3>
                </div>
              ))}
            </div>
          </section>

          <section className="grid gap-5 lg:grid-cols-2">
            {portalTasks.map((task) => (
              <div key={task.id} className="rounded-[28px] border border-white/8 bg-white/[0.04] p-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <span className="font-mono text-[11px] uppercase tracking-[0.1em] text-white/35">{task.owner}</span>
                  <span className={`rounded-full border px-3 py-1 text-[10px] uppercase tracking-[0.1em] ${toneClasses[task.tone]}`}>
                    {task.status}
                  </span>
                </div>
                <h3 className="mt-4 text-[20px] font-semibold text-white">{task.label}</h3>
                <p className="mt-3 text-[13px] font-light leading-[1.75] text-white/42">{task.description}</p>
                {task.href ? (
                  <Link href={task.href} className="mt-5 inline-flex text-[13px] text-blue-300 transition-colors hover:text-blue-200">
                    Open step →
                  </Link>
                ) : null}
              </div>
            ))}
          </section>

          <section className="rounded-[32px] border border-white/8 bg-white/[0.035] p-7 sm:p-9">
            {editorialModule ? (
              <>
                <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                  <div>
                    <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-blue-300">Editorial</p>
                    <h2 className="mt-3 text-[26px] font-semibold text-white">{editorialModule.stageLabel}</h2>
                    <p className="mt-3 max-w-[760px] text-[14px] font-light leading-[1.8] text-white/45">
                      {editorialModule.stageSummary}
                    </p>
                  </div>
                  <div className={`rounded-full border px-4 py-2 text-[11px] uppercase tracking-[0.1em] ${toneClasses[editorialHealthTone(editorialModule.healthStatus)]}`}>
                    {editorialModule.healthStatus}
                  </div>
                </div>

                <div className="mt-7 grid gap-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
                  <div className="rounded-2xl border border-white/8 bg-black/15 p-5">
                    <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-white/30">Next step</p>
                    <h3 className="mt-3 text-[18px] font-semibold text-white">{editorialModule.nextActionLabel}</h3>
                    <p className="mt-2 text-[13px] leading-[1.7] text-white/38">
                      {editorialModule.nextActionDueOn
                        ? `Target response by ${formatDate(editorialModule.nextActionDueOn)}.`
                        : 'We will let you know as soon as the next review package is ready.'}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-white/8 bg-black/15 p-5">
                    <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-white/30">Approval gates</p>
                    <div className="mt-4 space-y-3">
                      {editorialModule.pendingApprovals.map((approval) => (
                        <div key={approval.gateCode} className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-[12px] font-medium text-white/80">{approval.label}</span>
                            <span className={`rounded-full border px-3 py-1 text-[10px] uppercase tracking-[0.1em] ${toneClasses[approvalTone(approval.status)]}`}>
                              {approval.status}
                            </span>
                          </div>
                          <p className="mt-2 text-[12px] leading-[1.7] text-white/38">{approval.domain} approval</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="mt-7 grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                  <div className="rounded-2xl border border-white/8 bg-black/15 p-5">
                    <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-white/30">Current deliverables</p>
                    <div className="mt-4 space-y-3">
                      {editorialModule.deliverables.map((deliverable) => (
                        <div key={deliverable.fileName} className="flex items-start justify-between gap-4 border-b border-white/8 pb-3 last:border-b-0 last:pb-0">
                          <div>
                            <p className="text-[13px] font-medium text-white/78">{deliverable.artifactType}</p>
                            <p className="mt-1 text-[12px] text-white/34">{deliverable.fileName}</p>
                          </div>
                          <span className={`rounded-full border px-3 py-1 text-[10px] uppercase tracking-[0.1em] ${toneClasses[artifactTone(deliverable.status)]}`}>
                            {deliverable.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/8 bg-black/15 p-5">
                    <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-white/30">Editorial timeline</p>
                    <div className="mt-4 space-y-3">
                      {editorialModule.timeline.map((entry) => (
                        <div key={entry.label} className="flex items-center justify-between gap-4 border-b border-white/8 pb-3 last:border-b-0 last:pb-0">
                          <div>
                            <p className="text-[13px] font-medium text-white/78">{entry.label}</p>
                            <p className="mt-1 text-[12px] text-white/34">{entry.status}</p>
                          </div>
                          <span className="text-[12px] text-white/34">{entry.date ? formatDate(entry.date) : 'Pending'}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="rounded-2xl border border-amber-300/20 bg-amber-300/10 p-5 text-[13px] leading-[1.7] text-amber-100">
                Editorial Command is now reading from JM1-Core. No live editorial record is available yet for the configured pilot asset.
              </div>
            )}
          </section>

          <section className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div className="rounded-[32px] border border-white/8 bg-white/[0.035] p-7 sm:p-9">
              <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-blue-300">Files and metadata</p>
              <h2 className="mt-3 text-[26px] font-semibold text-white">Approved files, protected versions.</h2>
              <div className="mt-6 grid gap-4 md:grid-cols-2">
                {portalFileControls.map(([heading, body]) => (
                  <div key={heading} className="rounded-2xl border border-white/8 bg-black/15 p-5">
                    <h3 className="text-[15px] font-semibold text-white">{heading}</h3>
                    <p className="mt-2 text-[13px] font-light leading-[1.7] text-white/38">{body}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-[32px] border border-white/8 bg-white/[0.035] p-6">
              <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-blue-300">Boundaries</p>
              <div className="mt-4 space-y-3">
                {portalBoundaryRows.map(([label, value]) => (
                  <div key={label} className="flex items-center justify-between gap-4 border-b border-white/8 pb-3 last:border-b-0 last:pb-0">
                    <span className="text-[12px] text-white/35">{label}</span>
                    <span className="text-right text-[12px] font-medium text-white/70">{value}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="rounded-[32px] border border-white/8 bg-white/[0.035] p-7 sm:p-9">
            <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-blue-300">Readiness signals</p>
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {portalReadinessCards.map(([heading, body]) => (
                <div key={heading} className="rounded-2xl border border-white/8 bg-black/15 p-5">
                  <h3 className="text-[15px] font-semibold text-white">{heading}</h3>
                  <p className="mt-2 text-[13px] font-light leading-[1.7] text-white/38">{body}</p>
                </div>
              ))}
            </div>
          </section>
        </div>
      </AuthorGate>
    </AuthorPortalShell>
  )
}

function formatLabel(value: string) {
  return value.replace(/([A-Z])/g, ' $1').trim()
}

function editorialHealthTone(status: 'Healthy' | 'Watch' | 'At Risk' | 'Blocked'): PortalStatusTone {
  switch (status) {
    case 'Healthy':
      return 'complete'
    case 'Watch':
      return 'pending'
    case 'At Risk':
      return 'pending'
    case 'Blocked':
      return 'locked'
  }
}

function approvalTone(status: string): PortalStatusTone {
  if (status === 'Approved') return 'complete'
  if (status === 'Ready for Author Review' || status === 'Awaiting Author Response') return 'active'
  if (status === 'Held' || status === 'Cancelled') return 'locked'
  return 'pending'
}

function artifactTone(status: string): PortalStatusTone {
  if (status === 'Approved') return 'complete'
  if (status === 'Delivered') return 'active'
  if (status === 'Superseded' || status === 'Archived') return 'locked'
  return 'pending'
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(value))
}
