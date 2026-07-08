import type { Metadata } from 'next'
import Link from 'next/link'

import { AuthorGate } from '../_components/AuthorGate'
import { AuthorPortalShell } from '../_components/AuthorPortalShell'
import { buildWorkspaceEditorialModule, type EditorialArtifactStatus, type EditorialGateStatus } from '@/lib/program003/editorial-command'
import { getEditorialRecordForAsset, getProgram003PilotAssetId } from '@/lib/program003/dataverse'

export const metadata: Metadata = {
  title: 'Author Workspace | J Merrill Publishing',
  description: 'Private author workspace for active J Merrill Publishing projects.',
  robots: {
    index: false,
    follow: false,
  },
}

type PortalStatusTone = 'complete' | 'active' | 'pending' | 'locked'

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
      eyebrow="Author Workspace"
      title="Your Author Workspace is ready."
      description="Complete these setup steps so we can prepare your publishing agreement and begin your publishing journey."
    >
      <AuthorGate scope="portal">
        <section className="space-y-6">
          <div className="rounded-[32px] border border-blue-500/20 bg-blue-500/[0.06] p-7 sm:p-9">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-blue-300">Pre-Contract Workspace</p>
                <h2 className="mt-3 text-[28px] font-semibold text-white">We just need these first setup steps.</h2>
                <p className="mt-3 max-w-[760px] text-[14px] font-light leading-[1.85] text-white/50">
                  Complete your author details and secure Stripe setup here. Once your agreement is signed and your
                  initial payment is confirmed, the rest of your publishing tools will unlock.
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {[
              {
                id: 'author-profile',
                href: '/author/onboarding',
                step: 'Step 1',
                title: 'Author Profile',
                summary: 'Confirm your author details, mailing address, and book information.',
                cta: 'Open Author Profile',
              },
              {
                id: 'payment-royalty-setup',
                href: '/author/financial-setup',
                step: 'Step 2',
                title: 'Payment & Royalty Setup',
                summary: 'Securely connect Stripe so payments and royalties can be handled safely.',
                cta: 'Open Stripe Setup',
              },
            ].map((module) => (
              <Link
                key={module.id}
                href={module.href}
                className="group rounded-[28px] border border-white/8 bg-white/[0.045] p-6 transition-colors hover:border-blue-300/40 hover:bg-blue-500/[0.08]"
              >
                <div className="flex items-start justify-between gap-4">
                  <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-blue-300">{module.step}</span>
                  <span className="rounded-full border border-blue-400/20 bg-blue-500/10 px-3 py-1 text-[10px] uppercase tracking-[0.1em] text-blue-200">
                    Ready
                  </span>
                </div>
                <h2 className="mt-4 text-[22px] font-semibold text-white">{module.title}</h2>
                <p className="mt-3 text-[14px] font-light leading-[1.75] text-white/52">{module.summary}</p>
                <span className="mt-6 inline-flex text-[13px] font-semibold text-blue-300 transition-colors group-hover:text-blue-100">
                  {module.cta} →
                </span>
              </Link>
            ))}
          </div>

          <div className="rounded-[28px] border border-white/8 bg-white/[0.035] p-6">
            <p className="text-[14px] font-light leading-[1.8] text-white/45">
              Additional publishing tools will unlock after your agreement is signed and your initial payment is
              confirmed.
            </p>
          </div>

          <section className="rounded-[32px] border border-white/8 bg-white/[0.035] p-7 sm:p-9">
            {editorialModule ? (
              <>
                <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                  <div>
                    <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-blue-300">Editorial Command</p>
                    <h2 className="mt-3 text-[26px] font-semibold text-white">{editorialModule.stageLabel}</h2>
                    <p className="mt-3 max-w-[760px] text-[14px] font-light leading-[1.8] text-white/45">
                      {editorialModule.stageSummary}
                    </p>
                  </div>
                  <div
                    className={`rounded-full border px-4 py-2 text-[11px] uppercase tracking-[0.1em] ${toneClasses[editorialHealthTone(editorialModule.healthStatus)]}`}
                  >
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
                      {editorialModule.pendingApprovals.length ? (
                        editorialModule.pendingApprovals.map((approval) => (
                          <div key={approval.gateCode} className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                            <div className="flex items-center justify-between gap-3">
                              <span className="text-[12px] font-medium text-white/80">{approval.label}</span>
                              <span
                                className={`rounded-full border px-3 py-1 text-[10px] uppercase tracking-[0.1em] ${toneClasses[approvalTone(approval.status)]}`}
                              >
                                {approval.status}
                              </span>
                            </div>
                            <p className="mt-2 text-[12px] leading-[1.7] text-white/38">{approval.domain} approval</p>
                          </div>
                        ))
                      ) : (
                        <p className="text-[13px] leading-[1.7] text-white/38">
                          No author approvals are waiting right now. This workspace is reading the live Core editorial
                          record.
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-7 grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                  <div className="rounded-2xl border border-white/8 bg-black/15 p-5">
                    <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-white/30">Current deliverables</p>
                    <div className="mt-4 space-y-3">
                      {editorialModule.deliverables.length ? (
                        editorialModule.deliverables.map((deliverable) => (
                          <div
                            key={deliverable.fileName}
                            className="flex items-start justify-between gap-4 border-b border-white/8 pb-3 last:border-b-0 last:pb-0"
                          >
                            <div>
                              <p className="text-[13px] font-medium text-white/78">{deliverable.artifactType}</p>
                              <p className="mt-1 text-[12px] text-white/34">{deliverable.fileName}</p>
                            </div>
                            <span
                              className={`rounded-full border px-3 py-1 text-[10px] uppercase tracking-[0.1em] ${toneClasses[artifactTone(deliverable.status)]}`}
                            >
                              {deliverable.status}
                            </span>
                          </div>
                        ))
                      ) : (
                        <p className="text-[13px] leading-[1.7] text-white/38">No governed deliverables have been published yet.</p>
                      )}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/8 bg-black/15 p-5">
                    <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-white/30">Editorial timeline</p>
                    <div className="mt-4 space-y-3">
                      {editorialModule.timeline.map((entry) => (
                        <div
                          key={entry.label}
                          className="flex items-center justify-between gap-4 border-b border-white/8 pb-3 last:border-b-0 last:pb-0"
                        >
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
                Editorial Command is Core-backed, but no live editorial record is available yet for the configured commissioning asset.
              </div>
            )}
          </section>
        </section>
      </AuthorGate>
    </AuthorPortalShell>
  )
}

function editorialHealthTone(status: 'Healthy' | 'Watch' | 'At Risk' | 'Blocked'): PortalStatusTone {
  switch (status) {
    case 'Healthy':
      return 'complete'
    case 'Watch':
    case 'At Risk':
      return 'pending'
    case 'Blocked':
      return 'locked'
  }
}

function approvalTone(status: EditorialGateStatus): PortalStatusTone {
  if (status === 'Approved') return 'complete'
  if (status === 'Ready for Author Review' || status === 'Awaiting Author Response') return 'active'
  if (status === 'Held' || status === 'Cancelled') return 'locked'
  return 'pending'
}

function artifactTone(status: EditorialArtifactStatus): PortalStatusTone {
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
