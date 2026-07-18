'use client'

import { useMemo, useState, type ReactNode } from 'react'
import { signIn, signOut } from 'next-auth/react'

import { PUBLISHER_OPERATING_CENTER_PROVIDER_ID } from '@/lib/author-durable-auth-shared'
import type {
  PublisherOperatingCenterSnapshot,
  PublisherPortfolioItem,
  PublisherQueueItem,
  PublisherTodayItem,
  PublisherWorkloadItem,
} from '@/lib/server/publisher-operating-center'

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
  const [portfolioView, setPortfolioView] = useState('active')

  const queue = useMemo(() => {
    const items = snapshot?.queues.enterprise || []
    if (filter === 'proof') return snapshot?.queues.proofAssets || []
    if (filter === 'publisher') return items.filter((item) => item.actionOwner === 'publisher')
    if (filter === 'blocked') return items.filter((item) => item.holdReason)
    if (filter === 'editorial') return items.filter((item) => item.currentStage === 'Editorial')
    return items
  }, [filter, snapshot])

  const workload = snapshot?.queues.workload || []
  const portfolio = useMemo(() => {
    if (!snapshot) return []
    if (portfolioView === 'published') return snapshot.queues.publishedCatalog
    if (portfolioView === 'external') return snapshot.queues.externalHolds
    if (portfolioView === 'archive') return snapshot.queues.archiveHistorical
    if (portfolioView === 'all') return snapshot.queues.portfolio
    if (portfolioView === 'reconcile') return snapshot.queues.reconciliationRequired
    return snapshot.queues.activePipeline
  }, [portfolioView, snapshot])

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
            <h1 className="mt-3 font-display text-4xl leading-tight md:text-6xl">Publisher Today</h1>
            <p className="mt-4 max-w-3xl text-[14px] leading-7 text-white/60">
              Daily Core-backed operating surface for what needs Jackie, what needs authors, what is moving, what is blocked,
              and what changed.
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
            <a
              href="/author/portal?view=author"
              className="inline-flex min-h-[40px] items-center rounded-full border border-white/10 px-4 text-[12px] font-semibold uppercase tracking-[0.08em] text-white/60"
            >
              Switch to Author View
            </a>
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
        {snapshot && (
          <section className="border border-blue-300/20 bg-blue-950/15 p-5">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-blue-300">Daily Summary</p>
                <h2 className="mt-2 text-2xl font-semibold">What needs attention today?</h2>
                <p className="mt-2 text-[12px] text-white/45">Generated {formatDateTime(snapshot.today.generatedAt)}</p>
              </div>
              <Badge label={snapshot.status === 'core-live' ? 'JM1-Core live' : 'Core unavailable'} tone={snapshot.status === 'core-live' ? 'blue' : 'amber'} />
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {[
                ['Jackie actions', snapshot.today.summary.jackieActionsDueToday, 'waiting-jackie'],
                ['Author responses', snapshot.today.summary.authorResponsesPending, 'waiting-authors'],
                ['Active editorial', snapshot.today.summary.activeEditorialTitles, 'active-editorial'],
                ['Production runway', snapshot.today.summary.productionReadyTitles, 'production-queue'],
                ['Failed transitions', snapshot.today.summary.failedTransitions, 'alerts'],
                ['Overdue items', snapshot.today.summary.overdueItems, 'alerts'],
                ['Moved today', snapshot.today.summary.assetsMovedToday, 'recent-movements'],
                ['Catalog exceptions', snapshot.today.summary.catalogExceptions, 'catalog-queue'],
              ].map(([label, value, href]) => (
                <a key={label} href={`#${href}`} className="border border-white/10 bg-black/20 p-4 transition hover:border-blue-300/40">
                  <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-white/40">{label}</p>
                  <p className="mt-3 text-3xl font-semibold">{value}</p>
                </a>
              ))}
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              {[
                ['#waiting-jackie', 'Publisher Today'],
                ['#active-pipeline', 'Active Pipeline'],
                ['#production-command', 'Production'],
                ['#catalog-queue', 'Published Catalog'],
                ['#author-portfolio', 'Authors'],
                ['#royalties', 'Royalties'],
                ['#invitations', 'Invitations'],
                ['#alerts', 'Exceptions'],
              ].map(([href, label]) => (
                <a
                  key={href}
                  href={href}
                  className="rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-[12px] font-semibold uppercase tracking-[0.08em] text-white/55 transition hover:border-blue-300/40 hover:text-blue-100"
                >
                  {label}
                </a>
              ))}
            </div>
          </section>
        )}

        {snapshot && (
          <section className="mt-6 grid gap-5">
            <TodaySection
              id="waiting-jackie"
              title="Waiting for Jackie"
              eyebrow="Publisher authority"
              empty="No publisher-only decisions are waiting right now."
              items={snapshot.today.waitingForJackie}
            />
            <TodaySection
              id="waiting-authors"
              title="Waiting for Authors"
              eyebrow="Author action"
              empty="No author-owned action is waiting right now."
              items={snapshot.today.waitingForAuthors}
            />
            <TodaySection
              id="active-editorial"
              title="Active Editorial"
              eyebrow="Manuscripts moving"
              empty="No active editorial items were returned from Core."
              items={snapshot.today.activeEditorial}
            />
            <TodaySection
              id="production-queue"
              title="Production Queue"
              eyebrow="Downstream runway"
              empty="No title is authorized for production movement right now."
              items={snapshot.today.productionQueue}
            />
            <TodaySection
              id="catalog-queue"
              title="Distribution and Catalog Queue"
              eyebrow="Exceptions only"
              empty="No actionable catalog or distribution exceptions are waiting right now."
              items={snapshot.today.distributionCatalogQueue}
            />
            <TodaySection
              id="alerts"
              title="Alerts and Failed Transitions"
              eyebrow="Exception first"
              empty="No unresolved failed transitions were found in the current read window."
              items={snapshot.today.alerts}
            />
            <TodaySection
              id="recent-movements"
              title="Recently Moved Assets"
              eyebrow="Today and this week"
              empty="No recent movement was found in the current execution-log read window."
              items={snapshot.today.recentMovements}
            />
          </section>
        )}

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
              'Awaiting dev': snapshot.metrics.titlesAwaitingDevelopmentalEditing,
              'In line edit': snapshot.metrics.titlesInLineEditing,
              'Dependency holds': snapshot.metrics.packagesHeldByReadinessGuard,
              'Workload advisories': snapshot.metrics.workloadAdvisories,
              'Author reviews': snapshot.metrics.authorReviewBacklog,
              'Active pipeline': snapshot.metrics.portfolioActivePipeline,
              'Published catalog': snapshot.metrics.portfolioPublishedCatalog,
              'External holds': snapshot.metrics.portfolioExternalHold,
              'Archive': snapshot.metrics.portfolioArchiveHistorical,
              'Reconcile': snapshot.metrics.portfolioReconciliationRequired,
            }).map(([label, value]) => (
              <div key={label} className="border border-white/10 bg-white/[0.035] p-4">
                <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-white/40">{label}</p>
                <p className="mt-3 text-3xl font-semibold">{value}</p>
              </div>
            ))}
        </div>

        <section id="active-pipeline" className="mt-8 border border-white/10 bg-white/[0.035] p-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-blue-300">
                Catalog Portfolio
              </p>
              <h2 className="mt-2 text-2xl font-semibold">Lifecycle portfolio views</h2>
              <p className="mt-2 max-w-3xl text-[13px] leading-6 text-white/55">
                Published catalog titles are separated from active editorial workload so workload advisories apply only to current governed work.
              </p>
            </div>
            <Badge
              label={`${snapshot?.metrics.portfolioPublishedCatalog || 0} published`}
              tone="blue"
            />
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            {[
              ['active', 'Active Pipeline'],
              ['published', 'Published Catalog'],
              ['external', 'External Holds'],
              ['archive', 'Archive / Historical'],
              ['reconcile', 'Reconciliation Required'],
              ['all', 'All Titles'],
            ].map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setPortfolioView(id)}
                className={`min-h-[38px] rounded-full border px-4 text-[12px] font-semibold uppercase tracking-[0.08em] ${
                  portfolioView === id
                    ? 'border-blue-400 bg-blue-500/20 text-blue-100'
                    : 'border-white/10 bg-white/[0.03] text-white/50'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="mt-5 overflow-x-auto">
            <table className="min-w-[1180px] w-full border-collapse text-left text-[12px]">
              <thead className="border-b border-white/10 text-white/42">
                <tr>
                  <Th>Title</Th>
                  <Th>Portfolio</Th>
                  <Th>Stage / Catalog</Th>
                  <Th>Formats / ISBN</Th>
                  <Th>Evidence</Th>
                  <Th>Next action</Th>
                </tr>
              </thead>
              <tbody>
                {portfolio.map((item) => (
                  <PortfolioRow key={item.key} item={item} />
                ))}
                {portfolio.length === 0 && (
                  <tr>
                    <td className="px-3 py-5 text-white/45" colSpan={6}>
                      No titles are currently classified in this portfolio view.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {snapshot && (
          <section id="production-command" className="mt-8 border border-blue-300/20 bg-blue-950/15 p-5">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-blue-300">
                  Production Command
                </p>
                <h2 className="mt-2 text-2xl font-semibold">Interior Layout and Cover Design</h2>
                <p className="mt-2 max-w-3xl text-[13px] leading-6 text-white/55">
                  Interior Layout and Cover Design are concurrent governed waves. Cover concept work may begin with stable
                  metadata and rights evidence; full wrap waits for page count and printer template.
                </p>
              </div>
              <Badge label={`${snapshot.productionCommand.interiorQueue.length} production candidates`} tone="blue" />
            </div>

            <div className="mt-5 overflow-x-auto">
              <table className="min-w-[1180px] w-full border-collapse text-left text-[12px]">
                <thead className="border-b border-white/10 text-white/42">
                  <tr>
                    <Th>Title</Th>
                    <Th>Editorial State</Th>
                    <Th>Interior</Th>
                    <Th>Cover</Th>
                    <Th>Next Production Action</Th>
                    <Th>SharePoint Parent</Th>
                  </tr>
                </thead>
                <tbody>
                  {snapshot.productionCommand.interiorQueue.map((item) => (
                    <tr key={item.key} className="border-b border-white/10 align-top">
                      <Td>
                        <span className="block font-semibold text-white">{item.title}</span>
                        <span className="mt-1 block text-white/40">{item.author}</span>
                      </Td>
                      <Td>{item.editorialState}</Td>
                      <Td>
                        <span className="block text-white/75">{item.interiorState}</span>
                        <span className="mt-1 block text-amber-100">{item.interiorReadiness}</span>
                      </Td>
                      <Td>
                        <span className="block text-white/75">{item.coverState}</span>
                        <span className="mt-1 block text-blue-100">{item.coverReadiness}</span>
                      </Td>
                      <Td>
                        <span className="block">{item.nextInteriorAction}</span>
                        <span className="mt-2 block text-white/38">{item.nextCoverAction}</span>
                      </Td>
                      <Td>{item.sharePointParent}</Td>
                    </tr>
                  ))}
                  {snapshot.productionCommand.interiorQueue.length === 0 && (
                    <tr>
                      <td className="px-3 py-5 text-white/45" colSpan={6}>
                        No active production candidates were returned from Core.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="mt-5 grid gap-2 md:grid-cols-2">
              {snapshot.productionCommand.sharePointDesign.map((path) => (
                <code key={path} className="border border-white/10 bg-black/20 px-3 py-2 text-[12px] text-white/60">
                  {path}
                </code>
              ))}
            </div>
          </section>
        )}

        {snapshot && (
          <section id="royalties" className="mt-8 border border-white/10 bg-white/[0.035] p-5">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-blue-300">Royalties</p>
                <h2 className="mt-2 text-2xl font-semibold">2026 statement review queue</h2>
                <p className="mt-2 max-w-3xl text-[13px] leading-6 text-white/55">
                  The consolidated royalty decision package is available as a publisher review queue. Statements remain draft
                  internal review until identity, title, and payment decisions close.
                </p>
              </div>
              <Badge label={`${snapshot.royalties.draftStatements} draft statements`} tone="amber" />
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Info label="Manifest rows" value={String(snapshot.royalties.manifestRows)} />
              <Info label="Loaded rows" value={String(snapshot.royalties.loadedRows)} />
              <Info label="Identity holds" value={String(snapshot.royalties.identityHolds)} />
              <Info label="Title holds" value={String(snapshot.royalties.titleHolds)} />
              <Info label="Payment rows" value={String(snapshot.royalties.paymentRows)} />
              <Info label="Allocation unknown" value={String(snapshot.royalties.paymentAllocationUnknown)} />
              <Info label="Unresolved payments" value={String(snapshot.royalties.unresolvedPayments)} />
              <Info label="Decision package" value={snapshot.royalties.decisionPackagePath} />
            </div>
          </section>
        )}

        <section id="author-portfolio" className="mt-8 border border-white/10 bg-white/[0.035] p-5">
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-blue-300">Authors and Invitations</p>
          <h2 className="mt-2 text-2xl font-semibold">Portfolio preview and invitation readiness</h2>
          <p className="mt-2 max-w-3xl text-[13px] leading-6 text-white/55">
            Publisher actions cover portfolio preview, active/backlist placement, contact resolution, email update approval,
            new-contact approval, pilot invitation readiness, and mass invitation lockout pending separate approval.
          </p>
        </section>

        <section id="invitations" className="mt-6 border border-white/10 bg-white/[0.035] p-5">
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-blue-300">Invitations</p>
          <h2 className="mt-2 text-2xl font-semibold">Pilot invitation controls</h2>
          <p className="mt-2 max-w-3xl text-[13px] leading-6 text-white/55">
            Pilot invitations may be prepared and sent when author identity and portfolio preview are approved. Mass invitation
            remains locked and is not authorized by this release.
          </p>
        </section>

        <section className="mt-8 border border-blue-300/20 bg-blue-950/15 p-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-blue-300">
                Master Workload
              </p>
              <h2 className="mt-2 text-2xl font-semibold">Editorial workload and asset readiness</h2>
              <p className="mt-2 max-w-3xl text-[13px] leading-6 text-white/55">
                Core-backed workload states, next actions, owners, package readiness, workload level, and true dependency holds.
                Workload volume informs priority and dates; it does not block valid stage movement.
              </p>
            </div>
            <Badge
              label={
                snapshot && snapshot.metrics.packagesHeldByReadinessGuard > 0
                  ? `${snapshot.metrics.packagesHeldByReadinessGuard} dependency hold`
                  : 'No dependency holds'
              }
              tone={snapshot && snapshot.metrics.packagesHeldByReadinessGuard > 0 ? 'amber' : 'blue'}
            />
          </div>

          <div className="mt-5 overflow-x-auto">
            <table className="min-w-[1100px] w-full border-collapse text-left text-[12px]">
              <thead className="border-b border-white/10 text-white/42">
                <tr>
                  <Th>Title</Th>
                  <Th>State</Th>
                  <Th>Capability</Th>
                  <Th>Owner</Th>
                  <Th>Workload</Th>
                  <Th>Next action</Th>
                  <Th>Package</Th>
                  <Th>Dependency</Th>
                  <Th>Target</Th>
                  <Th>Age</Th>
                </tr>
              </thead>
              <tbody>
                {workload.map((item) => (
                  <WorkloadRow key={item.key} item={item} />
                ))}
                {workload.length === 0 && (
                  <tr>
                    <td className="px-3 py-5 text-white/45" colSpan={10}>
                      No active workload records were returned from Core.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <div className="mt-6 flex flex-wrap gap-2">
          {[
            ['all', 'All assets'],
            ['proof', 'Proof assets'],
            ['publisher', 'Publisher action'],
            ['blocked', 'Dependency Holds'],
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

function TodaySection({
  id,
  eyebrow,
  title,
  empty,
  items,
}: {
  id: string
  eyebrow: string
  title: string
  empty: string
  items: PublisherTodayItem[]
}) {
  return (
    <section id={id} className="scroll-mt-6 border border-white/10 bg-white/[0.035] p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-blue-300">{eyebrow}</p>
          <h2 className="mt-2 text-2xl font-semibold">{title}</h2>
        </div>
        <Badge label={`${items.length} item${items.length === 1 ? '' : 's'}`} tone={items.some((item) => item.severity === 'urgent') ? 'amber' : 'blue'} />
      </div>

      <div className="mt-5 grid gap-3 lg:grid-cols-2">
        {items.map((item) => (
          <TodayCard key={item.key} item={item} />
        ))}
        {items.length === 0 && (
          <div className="border border-white/10 bg-black/15 p-4 text-[13px] leading-6 text-white/48">{empty}</div>
        )}
      </div>
    </section>
  )
}

function TodayCard({ item }: { item: PublisherTodayItem }) {
  return (
    <article className="border border-white/10 bg-black/15 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-white/35">{item.pipelineStage}</p>
          <h3 className="mt-2 text-lg font-semibold leading-6 text-white">{item.title}</h3>
          <p className="mt-1 text-[12px] text-white/45">{item.author}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge label={item.owner} tone={item.owner === 'Jackie' ? 'amber' : item.owner === 'Author' ? 'blue' : 'neutral'} />
          <Badge label={item.severity} tone={item.severity === 'urgent' ? 'amber' : item.severity === 'watch' ? 'neutral' : 'blue'} />
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <Info label="Stage" value={`${item.editorialStage}${item.substage ? ` · ${item.substage}` : ''}`} />
        <Info label="Next action" value={item.nextAction || 'No action returned'} />
        <Info label="Package" value={item.packageState || 'Not applicable'} />
        <Info label="Dependency" value={item.dependency || 'None'} />
        <Info label="QA" value={item.qaState || 'Not set'} />
        <Info label="Age / Target" value={`${item.ageDays}d${item.targetDate ? ` · ${item.targetDate}` : ''}`} />
      </div>

      <p className="mt-4 border-t border-white/10 pt-3 text-[12px] leading-5 text-white/42">
        Last movement: {item.lastMovement || 'No recent execution evidence found.'}
      </p>

      {(item.allowedActions.length > 0 || item.evidenceLinks.length > 0) && (
        <div className="mt-4 flex flex-wrap gap-2">
          {item.allowedActions.map((action) => (
            <span key={action.id} className="rounded-full border border-blue-300/25 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-blue-100">
              {action.label}
            </span>
          ))}
          {item.evidenceLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              target="_blank"
              rel="noreferrer"
              className="rounded-full border border-white/10 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-white/55"
            >
              {link.label}
            </a>
          ))}
        </div>
      )}
    </article>
  )
}

function PortfolioRow({ item }: { item: PublisherPortfolioItem }) {
  const tone =
    item.portfolioState === 'active_pipeline'
      ? 'blue'
      : item.portfolioState === 'published_catalog'
        ? 'neutral'
        : item.portfolioState === 'reconciliation_required'
          ? 'amber'
          : 'neutral'

  return (
    <tr className="border-b border-white/10 align-top">
      <Td>
        <span className="block font-semibold text-white">{item.title}</span>
        <span className="mt-1 block text-white/40">{item.author}</span>
      </Td>
      <Td>
        <Badge label={item.portfolioLabel} tone={tone} />
        <span className="mt-2 block text-white/38">{item.confidence} confidence</span>
      </Td>
      <Td>
        <span className="block text-white/75">{item.pipelineStage}</span>
        <span className="mt-1 block text-white/38">{item.catalogStatus}</span>
        {item.distributionStatus ? <span className="mt-1 block text-white/38">{item.distributionStatus}</span> : null}
      </Td>
      <Td>
        <span className="block">{item.activeFormats.join(', ') || 'Format pending'}</span>
        <span className="mt-1 block text-white/38">{item.isbn13s.join(', ') || 'ISBN pending'}</span>
      </Td>
      <Td>
        <span className="block max-w-[300px] leading-5">{item.evidence.slice(0, 3).join('; ') || item.exceptionReason}</span>
      </Td>
      <Td>
        <span className="block max-w-[260px] leading-5">{item.nextAction}</span>
      </Td>
    </tr>
  )
}

function WorkloadRow({ item }: { item: PublisherWorkloadItem }) {
  return (
    <tr className="border-b border-white/10 align-top">
      <Td>
        <span className="block font-semibold text-white">{item.title}</span>
        <span className="mt-1 block text-white/40">{item.author}</span>
      </Td>
      <Td>
        <span className="block text-white/80">{item.workloadState}</span>
        <span className="mt-1 block text-white/38">{item.editorialStage}</span>
      </Td>
      <Td>{item.activeCapability}</Td>
      <Td>{item.currentOwner}</Td>
      <Td>
        <Badge label={workloadLabel(item.workloadLevel)} tone={workloadTone(item.workloadLevel)} />
        <span className="mt-2 block text-white/38">Queue #{item.queuePosition}</span>
        <span className="mt-1 block text-white/38">{item.downstreamQueueSize} peer item{item.downstreamQueueSize === 1 ? '' : 's'}</span>
      </Td>
      <Td>
        <span className="block max-w-[240px] leading-5">{item.nextAction}</span>
      </Td>
      <Td>{item.packageReadiness}</Td>
      <Td>
        <Badge label={item.readinessGuard.status} tone={item.readinessGuard.status === 'pass' ? 'blue' : 'amber'} />
        <span className="mt-2 block max-w-[220px] leading-5 text-white/45">{item.readinessGuard.message}</span>
      </Td>
      <Td>{item.targetDate}</Td>
      <Td>{item.ageDays}d</Td>
    </tr>
  )
}

function workloadLabel(level: PublisherWorkloadItem['workloadLevel']) {
  switch (level) {
    case 'available':
      return 'Available'
    case 'normal':
      return 'Normal Load'
    case 'elevated':
      return 'Elevated Load'
    case 'high':
      return 'High Load'
    case 'overdue-risk':
      return 'Overdue Risk'
    case 'resource-attention':
      return 'Resource Attention'
  }
}

function workloadTone(level: PublisherWorkloadItem['workloadLevel']): 'neutral' | 'blue' | 'amber' {
  if (level === 'available' || level === 'normal') return 'blue'
  if (level === 'resource-attention' || level === 'overdue-risk') return 'amber'
  return 'neutral'
}

function Th({ children }: { children: ReactNode }) {
  return <th className="px-3 py-3 font-mono text-[10px] font-normal uppercase tracking-[0.14em]">{children}</th>
}

function Td({ children }: { children: ReactNode }) {
  return <td className="px-3 py-4 leading-5 text-white/64">{children}</td>
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

function formatDateTime(value: string) {
  if (!value) return 'not generated'
  try {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }).format(new Date(value))
  } catch {
    return value
  }
}
