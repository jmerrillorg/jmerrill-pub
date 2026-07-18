'use client'

import Link from 'next/link'
import { type FormEvent, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { signOut } from 'next-auth/react'

import type { AuthorPortalContext } from '@/lib/server/author-portal-context'

type LoadState = 'loading' | 'ready' | 'error'
type MarketingSaveState = 'idle' | 'saving' | 'saved' | 'error'
type MarketingProfileResponse = {
  ok?: boolean
  status?: string
  idempotent?: boolean
  message?: string
  error?: string
  correlationId?: string
}
type MarketingProfileRequestResult = {
  ok: boolean
  status: number
  data: MarketingProfileResponse | null
}
const PORTAL_BOOTSTRAP_CONTEXT_KEY = 'jm1_author_portal_bootstrap_context'
const PORTAL_BOOTSTRAP_MAX_AGE_MS = 5 * 60 * 1000
const PORTAL_UNLOCKED_KEY = 'jmp-author-onboarding-unlocked'
const WORKSPACE_CONTEXT_ATTEMPTS = 4
const WORKSPACE_CONTEXT_RETRY_DELAY_MS = 1200

function clearAuthorSessionState() {
  sessionStorage.removeItem(PORTAL_UNLOCKED_KEY)
  sessionStorage.removeItem(PORTAL_BOOTSTRAP_CONTEXT_KEY)
}

export function AuthorPortalWorkspace() {
  const searchParams = useSearchParams()
  const selectedParams = useMemo(() => buildProjectParams(searchParams), [searchParams])
  const [state, setState] = useState<LoadState>('loading')
  const [context, setContext] = useState<AuthorPortalContext | null>(null)
  const [error, setError] = useState('')
  const [signingOut, setSigningOut] = useState(false)
  const [marketingSaveState, setMarketingSaveState] = useState<MarketingSaveState>('idle')
  const [marketingMessage, setMarketingMessage] = useState('')
  const [marketingForm, setMarketingForm] = useState({
    authorBio: '',
    website: '',
    facebook: '',
    instagram: '',
    xTwitter: '',
  })

  useEffect(() => {
    let mounted = true

    async function load() {
      const bootstrap = consumeBootstrapContext(selectedParams)
      if (bootstrap && mounted) {
        setContext(bootstrap)
        setState('ready')
      }

      try {
        const params = selectedParams
        let selectedProjectLoad

        try {
          selectedProjectLoad = await loadWorkspaceContext(params)
        } catch (loadError) {
          if (!params.hasScopedSelection) {
            throw loadError
          }

          selectedProjectLoad = {
            ok: false,
            status: 0,
            error: loadError instanceof Error ? loadError.message : 'Scoped workspace load failed.',
            context: null,
          }
        }

        let resolved = selectedProjectLoad

        // If a project-specific selection fails, recover gracefully by falling back
        // to the base relationship workspace instead of trapping the author in an error state.
        if (!selectedProjectLoad.ok && params.hasScopedSelection) {
          const fallbackLoad = await loadWorkspaceContext({
            reference: undefined,
            opportunityId: undefined,
            titleId: undefined,
            publishingAssetId: undefined,
            hasScopedSelection: false,
          })

          if (fallbackLoad.ok && fallbackLoad.context) {
            resolved = fallbackLoad
            const matchedProject = findProjectForSelection(fallbackLoad.context, params)
            if (!matchedProject) {
              window.history.replaceState({}, '', '/author/portal')
            }
          }
        }

        if (resolved.ok && resolved.context && params.hasScopedSelection) {
          const matchedProject = findProjectForSelection(resolved.context, params)
          if (!matchedProject) {
            const fallbackLoad = await loadWorkspaceContext({
              reference: undefined,
              opportunityId: undefined,
              titleId: undefined,
              publishingAssetId: undefined,
              hasScopedSelection: false,
            })

            if (fallbackLoad.ok && fallbackLoad.context) {
              resolved = fallbackLoad
              const fallbackMatch = findProjectForSelection(fallbackLoad.context, params)
              if (!fallbackMatch) {
                window.history.replaceState({}, '', '/author/portal')
              }
            }
          }
        }

        if (!resolved.ok || !resolved.context) {
          if (bootstrap && mounted) {
            return
          }
          throw new Error(resolved.error || 'We could not load your workspace right now.')
        }

        if (!mounted) return
        setContext(resolved.context)
        setState('ready')
      } catch (err) {
        if (!mounted) return
        if (bootstrap) {
          setContext(bootstrap)
          setState('ready')
          return
        }

        const message = err instanceof Error ? err.message : ''
        setError(
          message && message !== 'Failed to fetch'
            ? message
            : 'We could not load your workspace right now. Please try again or contact publishing@jmerrill.one.',
        )
        setState('error')
      }
    }

    void load()

    return () => {
      mounted = false
    }
  }, [searchParams, selectedParams])

  useEffect(() => {
    if (!context?.author.marketingProfile) return
    setMarketingForm({
      authorBio: context.author.marketingProfile.authorBio || '',
      website: context.author.marketingProfile.website || '',
      facebook: context.author.marketingProfile.facebook || '',
      instagram: context.author.marketingProfile.instagram || '',
      xTwitter: context.author.marketingProfile.xTwitter || '',
    })
  }, [context?.author.contactId, context?.author.marketingProfile])

  async function submitMarketingProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (marketingSaveState === 'saving') return

    setMarketingSaveState('saving')
    setMarketingMessage('')

    try {
      const response = await submitMarketingProfileRequest(marketingForm)
      const data = response.data

      if (!response.ok) {
        setMarketingSaveState('error')
        setMarketingMessage(marketingErrorMessage(response.status, data))
        return
      }

      setMarketingSaveState('saved')
      setMarketingMessage(marketingSuccessMessage(data))
    } catch (err) {
      setMarketingSaveState('error')
      setMarketingMessage(marketingNetworkErrorMessage(err))
    }
  }

  if (state === 'loading') {
    return (
      <div className="rounded-[28px] border border-white/8 bg-white/[0.04] p-8 text-[14px] leading-[1.8] text-white/55">
        Loading your workspace...
      </div>
    )
  }

  if (state === 'error' || !context) {
    return (
      <div className="rounded-[28px] border border-amber-300/20 bg-amber-300/10 p-8 text-[14px] leading-[1.8] text-amber-100">
        {error || 'We could not load your workspace right now.'}
      </div>
    )
  }

  const steps = [
    {
      label: 'Author Profile',
      description: context.tasks.authorProfileRequired
        ? 'Confirm your author details, mailing address, and book information.'
        : 'Your author details are already on file.',
      href: '/author/onboarding',
      visible: context.tasks.authorProfileRequired,
    },
    {
      label: 'Payment & Royalty Setup',
      description: context.tasks.paymentRoyaltyRequired
        ? 'Securely connect Stripe so payments and royalties can be handled safely.'
        : 'Your payment and royalty setup is already in place for this project.',
      href: '/author/financial-setup',
      visible: context.tasks.paymentRoyaltyRequired,
    },
  ].filter((step) => step.visible)

  const selectedProject = findProjectForSelection(context, selectedParams) || context.currentProject
  const selectedEditorial =
    isEditorialWorkspaceState(selectedProject.workspaceState) &&
    selectedProject.key === context.currentProject.key &&
    context.editorial
      ? context.editorial
      : null
  const showPublisherProgress =
    isEditorialWorkspaceState(selectedProject.workspaceState) &&
    !selectedProject.pendingApprovalLabel &&
    Boolean(selectedProject.summary || selectedProject.nextActionLabel)

  async function handleSignOut() {
    setSigningOut(true)
    clearAuthorSessionState()

    try {
      await fetch('/api/author/logout', {
        method: 'POST',
        cache: 'no-store',
      })
    } catch {
      // Continue through durable sign-out even if the legacy session clear fails.
    }

    await signOut({ callbackUrl: '/author/portal' })
  }

  return (
    <div className="space-y-8">
      <section className="rounded-[32px] border border-blue-500/20 bg-blue-500/[0.06] p-7 sm:p-9">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-blue-300">Welcome back</p>
          <button
            type="button"
            onClick={() => void handleSignOut()}
            disabled={signingOut}
            className="inline-flex min-h-[42px] items-center justify-center rounded-full border border-white/10 px-4 text-[11px] font-semibold uppercase tracking-[0.08em] text-white/70 transition-colors hover:border-white/20 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {signingOut ? 'Signing out...' : 'Sign out'}
          </button>
        </div>
        <h2
          className="mt-3 text-white"
          style={{ fontFamily: "'Libre Baskerville', serif", fontSize: '32px', fontWeight: 700, lineHeight: 1.1 }}
        >
          {context.author.firstName ? `Welcome back, ${context.author.firstName}.` : 'Welcome back.'}
        </h2>
        <p className="mt-3 max-w-[760px] text-[14px] font-light leading-[1.8] text-white/55">
          We opened your author relationship and linked projects so you can see truthful status without restarting your publishing path.
        </p>
        <div className="mt-4 flex flex-wrap gap-2 text-[11px] uppercase tracking-[0.08em] text-white/45">
          <span className="rounded-full border border-white/10 px-3 py-1">{context.relationship.classificationStatus}</span>
          <span className="rounded-full border border-white/10 px-3 py-1">
            Relationship {relationshipActivationLabel(context.relationship.activationStatus)}
          </span>
          <span className="rounded-full border border-white/10 px-3 py-1">
            Health {relationshipHealthLabel(context.relationship.operationalHealthStatus)}
          </span>
          <span className="rounded-full border border-white/10 px-3 py-1">
            Author profile {context.relationship.authorProfileStatus}
          </span>
          <span className="rounded-full border border-white/10 px-3 py-1">
            Stripe {context.relationship.stripeConnectStatus}
          </span>
          <span className="rounded-full border border-white/10 px-3 py-1">
            Tax profile {context.relationship.taxStatus}
          </span>
        </div>
        <div className="mt-6 rounded-3xl border border-white/10 bg-black/15 p-5">
          <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-white/35">Current project</p>
          <h3 className="mt-2 text-[20px] font-semibold text-white">{selectedProject.title}</h3>
          <p className="mt-2 text-[13px] leading-[1.7] text-white/45">{selectedProject.statusLabel}</p>
          {selectedProject.authorActionRequired === false ? (
            <p className="mt-2 text-[12px] uppercase tracking-[0.08em] text-white/40">
              No action is required from you at this time.
            </p>
          ) : null}
          {showPublisherProgress ? (
            <div className="mt-4 space-y-3">
              {selectedProject.currentActivity || selectedProject.summary ? (
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-white/35">
                    Current Activity
                  </p>
                  <p className="mt-1 text-[13px] leading-[1.7] text-white/60">
                    {selectedProject.currentActivity || selectedProject.summary}
                  </p>
                </div>
              ) : null}
              {selectedProject.nextStep || selectedProject.nextActionLabel ? (
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-white/35">Next Step</p>
                  <p className="mt-1 text-[13px] leading-[1.7] text-blue-200/85">
                    {selectedProject.nextStep || selectedProject.nextActionLabel}
                  </p>
                </div>
              ) : null}
            </div>
          ) : selectedProject.nextActionLabel ? (
            <p className="mt-2 text-[13px] leading-[1.7] text-blue-200/85">{selectedProject.nextActionLabel}</p>
          ) : null}
          {selectedProject.pendingApprovalLabel ? (
            <p className="mt-2 text-[12px] uppercase tracking-[0.08em] text-amber-200/85">
              Pending approval: {selectedProject.pendingApprovalLabel}
            </p>
          ) : null}
          {selectedProject.artifacts?.length ? (
            <div className="mt-5 border-t border-white/10 pt-4">
              <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-white/35">Package components</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {selectedProject.artifacts.map((artifact) => (
                  <a
                    key={artifact.id}
                    href={artifact.href}
                    className="rounded-full border border-blue-400/25 px-3 py-2 text-[12px] font-semibold text-blue-200 transition-colors hover:border-blue-300 hover:text-white"
                  >
                    Download {artifact.label}
                  </a>
                ))}
              </div>
            </div>
          ) : null}
          {selectedProject.completedPackages?.length ? (
            <div className="mt-5 border-t border-white/10 pt-4">
              <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-white/35">Completed packages</p>
              <div className="mt-3 space-y-2">
                {selectedProject.completedPackages.map((pack) => (
                  <div
                    key={`${pack.label}-${pack.status}`}
                    className="rounded-2xl border border-white/8 bg-black/15 px-4 py-3 text-[12px] leading-[1.6] text-white/55"
                  >
                    {pack.label} — {pack.status}
                  </div>
                ))}
              </div>
            </div>
          ) : null}
          {!selectedEditorial && selectedProject.contractStatusInternal ? (
            <p className="mt-2 text-[12px] leading-[1.7] text-white/35">
              Historical title / legacy project
            </p>
          ) : null}
        </div>
      </section>

      {steps.length > 0 ? (
        <section className="space-y-4">
          <h3 className="text-[22px] font-semibold text-white">Relationship items to review.</h3>
          <div className="grid gap-4 md:grid-cols-2">
            {steps.map((step) => (
              <div key={step.label} className="rounded-[28px] border border-white/8 bg-white/[0.04] p-6">
                <h4 className="text-[18px] font-semibold text-white">{step.label}</h4>
                <p className="mt-3 text-[13px] font-light leading-[1.75] text-white/50">{step.description}</p>
                <Link
                  href={step.href}
                  className="mt-5 inline-flex items-center rounded-full border border-blue-400/25 px-4 py-2 text-[12px] font-semibold uppercase tracking-[0.08em] text-blue-200 transition-colors hover:border-blue-300 hover:text-white"
                >
                  Open step
                </Link>
              </div>
            ))}
          </div>
          <p className="text-[13px] font-light leading-[1.7] text-white/35">
            Official approvals and time-sensitive publishing decisions continue through email while this center matures as a reliable operating dashboard.
          </p>
        </section>
      ) : null}

      <section className="rounded-[28px] border border-white/8 bg-white/[0.04] p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-white/35">Author marketing profile</p>
            <h3 className="mt-2 text-[20px] font-semibold text-white">Public author details</h3>
            <p className="mt-2 max-w-[760px] text-[13px] font-light leading-[1.75] text-white/50">
              Share the author bio and public links you want the publishing team to review for future marketing and launch materials.
            </p>
          </div>
          <span className="rounded-full border border-blue-400/25 px-3 py-1.5 text-[10px] uppercase tracking-[0.08em] text-blue-200">
            Relationship-level
          </span>
        </div>
        <form className="mt-5 space-y-4" onSubmit={submitMarketingProfile}>
          <label className="block">
            <span className="text-[12px] font-semibold text-white/70">Author bio</span>
            <textarea
              value={marketingForm.authorBio}
              onChange={(event) =>
                setMarketingForm((current) => ({ ...current, authorBio: event.target.value }))
              }
              rows={5}
              maxLength={2000}
              className="mt-2 w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-[14px] leading-[1.7] text-white outline-none transition-colors placeholder:text-white/25 focus:border-blue-300/60"
              placeholder="Add or update the public author bio."
            />
          </label>
          <div className="grid gap-4 md:grid-cols-2">
            <MarketingInput
              label="Website"
              value={marketingForm.website}
              onChange={(value) => setMarketingForm((current) => ({ ...current, website: value }))}
            />
            <MarketingInput
              label="Facebook"
              value={marketingForm.facebook}
              onChange={(value) => setMarketingForm((current) => ({ ...current, facebook: value }))}
            />
            <MarketingInput
              label="Instagram"
              value={marketingForm.instagram}
              onChange={(value) => setMarketingForm((current) => ({ ...current, instagram: value }))}
            />
            <MarketingInput
              label="X / Twitter"
              value={marketingForm.xTwitter}
              onChange={(value) => setMarketingForm((current) => ({ ...current, xTwitter: value }))}
            />
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <button
              type="submit"
              disabled={marketingSaveState === 'saving'}
              className="inline-flex w-fit items-center rounded-full bg-blue-500 px-5 py-2.5 text-[12px] font-semibold uppercase tracking-[0.08em] text-white transition-colors hover:bg-blue-400 disabled:cursor-not-allowed disabled:bg-blue-500/45"
            >
              {marketingSaveState === 'saving' ? 'Saving...' : 'Save for review'}
            </button>
            {marketingMessage ? (
              <p
                className={`text-[13px] leading-[1.6] ${
                  marketingSaveState === 'error' ? 'text-amber-100' : 'text-blue-100'
                }`}
              >
                {marketingMessage}
              </p>
            ) : null}
          </div>
        </form>
      </section>

      <section className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="rounded-[28px] border border-white/8 bg-white/[0.04] p-6">
          <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-white/35">Project status</p>
          {selectedEditorial ? (
            <>
              <h3 className="mt-3 text-[20px] font-semibold text-white">{selectedEditorial.stageLabel}</h3>
              <p className="mt-2 text-[13px] leading-[1.7] text-white/50">{selectedEditorial.summary}</p>
              <p className="mt-3 text-[12px] uppercase tracking-[0.08em] text-blue-200/85">
                {selectedEditorial.stageStatus}
              </p>
            </>
          ) : (
            <>
              <h3 className="mt-3 text-[20px] font-semibold text-white">{selectedProject.statusLabel}</h3>
              <p className="mt-2 text-[13px] leading-[1.7] text-white/50">
                {selectedProject.nextActionLabel ||
                  'This project is linked to your author relationship and is waiting for the next governed publishing action.'}
              </p>
            </>
          )}
        </div>

        <div className="rounded-[28px] border border-white/8 bg-white/[0.04] p-6">
          <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-white/35">My Library</p>
          <div className="mt-4 space-y-5">
            <LibraryGroup
              title="Projects In Progress"
              projects={context.library.projectsInProgress}
              selectedProjectKey={selectedProject.key}
            />
            <LibraryGroup
              title="Published Books"
              projects={context.library.publishedBooks}
              selectedProjectKey={selectedProject.key}
            />
            {context.library.archivedTitles.length ? (
              <LibraryGroup
                title="Archived Titles"
                projects={context.library.archivedTitles}
                selectedProjectKey={selectedProject.key}
              />
            ) : null}
            {!context.library.projectsInProgress.length && !context.library.publishedBooks.length ? (
              <p className="text-[13px] leading-6 text-white/45">
                No linked J Merrill Publishing titles were returned for this relationship.
              </p>
            ) : null}
          </div>
        </div>
      </section>
    </div>
  )
}

function LibraryGroup({
  title,
  projects,
  selectedProjectKey,
}: {
  title: string
  projects: AuthorPortalContext['projects']
  selectedProjectKey: string
}) {
  if (!projects.length) return null

  return (
    <div>
      <h4 className="text-[13px] font-semibold uppercase tracking-[0.08em] text-white/55">{title}</h4>
      <div className="mt-3 space-y-3">
        {projects.map((project) => (
          <Link
            key={project.key}
            href={buildProjectHref(project)}
            className={`block rounded-2xl border p-4 transition-colors ${
              project.key === selectedProjectKey
                ? 'border-blue-400/35 bg-blue-500/[0.10]'
                : 'border-white/8 bg-black/15 hover:border-blue-300/30 hover:bg-blue-500/[0.06]'
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="text-[14px] font-medium text-white/85">{project.title}</div>
              <span className="rounded-full border border-white/10 px-2.5 py-1 text-[10px] uppercase tracking-[0.08em] text-white/55">
                {project.portfolioLabel || projectStateBadge(project.workspaceState)}
              </span>
            </div>
            <div className="mt-2 text-[12px] text-white/40">{project.statusLabel}</div>
            {project.portfolioState === 'published_catalog' ? (
              <div className="mt-2 space-y-1 text-[12px] leading-[1.6] text-white/45">
                <div>Catalog status: {project.catalogStatus || 'Published catalog'}</div>
                <div>Formats: {project.activeFormats?.join(', ') || 'Format details pending'}</div>
              </div>
            ) : project.nextActionLabel ? (
              <div className="mt-2 text-[12px] leading-[1.6] text-blue-200/80">{project.nextActionLabel}</div>
            ) : null}
            {project.pendingApprovalLabel ? (
              <div className="mt-2 text-[11px] uppercase tracking-[0.08em] text-amber-200/80">
                Pending approval: {project.pendingApprovalLabel}
              </div>
            ) : null}
          </Link>
        ))}
      </div>
    </div>
  )
}

function MarketingInput({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (value: string) => void
}) {
  return (
    <label className="block">
      <span className="text-[12px] font-semibold text-white/70">{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        maxLength={2000}
        className="mt-2 w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-[14px] text-white outline-none transition-colors placeholder:text-white/25 focus:border-blue-300/60"
        placeholder={`Add ${label.toLowerCase()}`}
      />
    </label>
  )
}

function relationshipActivationLabel(
  status: AuthorPortalContext['relationship']['activationStatus'],
) {
  switch (status) {
    case 'activated':
      return 'Activated'
    case 'validated':
      return 'Validated'
    default:
      return 'Pending Validation'
  }
}

function relationshipHealthLabel(
  status: AuthorPortalContext['relationship']['operationalHealthStatus'],
) {
  switch (status) {
    case 'healthy':
      return 'Healthy'
    case 'verified':
      return 'Verified'
    default:
      return 'Activated'
  }
}

function findProjectForSelection(
  context: AuthorPortalContext,
  params: ReturnType<typeof buildProjectParams>,
) {
  return (
    context.projects.find((project) => params.publishingAssetId && project.publishingAssetId === params.publishingAssetId) ||
    context.projects.find((project) => params.opportunityId && project.opportunityId === params.opportunityId) ||
    context.projects.find((project) => params.titleId && project.titleId === params.titleId) ||
    context.projects.find((project) => params.reference && project.intakeReference === params.reference) ||
    null
  )
}

function consumeBootstrapContext(params: ReturnType<typeof buildProjectParams>) {
  if (typeof window === 'undefined') return null

  const raw = sessionStorage.getItem(PORTAL_BOOTSTRAP_CONTEXT_KEY)
  if (!raw) return null

  try {
    const parsed = JSON.parse(raw) as {
      savedAt?: number
      context?: AuthorPortalContext
    }

    const age = Date.now() - Number(parsed.savedAt || 0)
    if (!parsed.context || !Number.isFinite(age) || age < 0 || age > PORTAL_BOOTSTRAP_MAX_AGE_MS) {
      sessionStorage.removeItem(PORTAL_BOOTSTRAP_CONTEXT_KEY)
      return null
    }

    const context = parsed.context
    if (params.hasScopedSelection && !matchesScopedSelection(context, params)) {
      return null
    }

    return context
  } catch {
    sessionStorage.removeItem(PORTAL_BOOTSTRAP_CONTEXT_KEY)
    return null
  }
}

function buildProjectHref(project: AuthorPortalContext['projects'][number]) {
  const params = new URLSearchParams()
  if (project.intakeReference) params.set('reference', project.intakeReference)
  if (project.opportunityId) params.set('opportunityId', project.opportunityId)
  if (project.titleId) params.set('titleId', project.titleId)
  if (project.publishingAssetId) params.set('publishingAssetId', project.publishingAssetId)
  return `/author/portal${params.toString() ? `?${params.toString()}` : ''}`
}

function buildProjectParams(searchParams: ReturnType<typeof useSearchParams>) {
  const reference = searchParams.get('reference') || searchParams.get('ref') || undefined
  const opportunityId = searchParams.get('opportunityId') || undefined
  const titleId = searchParams.get('titleId') || undefined
  const publishingAssetId = searchParams.get('publishingAssetId') || undefined

  return {
    reference,
    opportunityId,
    titleId,
    publishingAssetId,
    hasScopedSelection: Boolean(reference || opportunityId || titleId || publishingAssetId),
  }
}

function matchesScopedSelection(
  context: AuthorPortalContext,
  params: ReturnType<typeof buildProjectParams>,
) {
  const project = context.currentProject

  return (
    (!params.reference || project.intakeReference === params.reference) &&
    (!params.opportunityId || project.opportunityId === params.opportunityId) &&
    (!params.titleId || project.titleId === params.titleId) &&
    (!params.publishingAssetId || project.publishingAssetId === params.publishingAssetId)
  )
}

async function loadWorkspaceContext(params: {
  reference?: string
  opportunityId?: string
  titleId?: string
  publishingAssetId?: string
  hasScopedSelection: boolean
}) {
  const query = new URLSearchParams()
  if (params.reference) query.set('reference', params.reference)
  if (params.opportunityId) query.set('opportunityId', params.opportunityId)
  if (params.titleId) query.set('titleId', params.titleId)
  if (params.publishingAssetId) query.set('publishingAssetId', params.publishingAssetId)

  let lastResult: {
    ok: boolean
    status: number
    error?: string
    context: AuthorPortalContext | null
  } | null = null

  for (let attempt = 0; attempt < WORKSPACE_CONTEXT_ATTEMPTS; attempt += 1) {
    try {
      const response = await fetch(`/api/author/context${query.toString() ? `?${query.toString()}` : ''}`, {
        cache: 'no-store',
        credentials: 'same-origin',
      })
      const data = await safeReadJson(response)

      lastResult = {
        ok: response.ok && Boolean(data?.context),
        status: response.status,
        error: data?.error,
        context: data?.context || null,
      }

      if (lastResult.ok) return lastResult
    } catch (error) {
      lastResult = {
        ok: false,
        status: 0,
        error: error instanceof Error ? error.message : 'Workspace context request failed.',
        context: null,
      }
    }

    await new Promise((resolve) => window.setTimeout(resolve, WORKSPACE_CONTEXT_RETRY_DELAY_MS))
  }

  return (
    lastResult || {
      ok: false,
      status: 0,
      error: 'Workspace context request failed.',
      context: null,
    }
  )
}

async function safeReadJson(response: Response) {
  const text = await response.text()
  if (!text) return null

  try {
    return JSON.parse(text) as { context?: AuthorPortalContext; error?: string }
  } catch {
    return null
  }
}

async function submitMarketingProfileRequest(payload: {
  authorBio: string
  website: string
  facebook: string
  instagram: string
  xTwitter: string
}): Promise<MarketingProfileRequestResult> {
  const body = JSON.stringify(payload)

  if (typeof window.fetch === 'function') {
    try {
      const response = await window.fetch('/api/author/marketing-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body,
      })

      return {
        ok: response.ok,
        status: response.status,
        data: (await safeReadJson(response)) as MarketingProfileResponse | null,
      }
    } catch {
      if (typeof window.XMLHttpRequest === 'function') {
        return submitMarketingProfileWithXhr(body).catch(() => submitMarketingProfileWithForm(payload))
      }

      return submitMarketingProfileWithForm(payload)
    }
  }

  if (typeof window.XMLHttpRequest === 'function') {
    return submitMarketingProfileWithXhr(body).catch(() => submitMarketingProfileWithForm(payload))
  }

  return submitMarketingProfileWithForm(payload)
}

function submitMarketingProfileWithXhr(body: string): Promise<MarketingProfileRequestResult> {
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest()
    request.open('POST', '/api/author/marketing-profile')
    request.setRequestHeader('Content-Type', 'application/json')
    request.withCredentials = true
    request.timeout = 30000

    request.onload = () => {
      resolve({
        ok: request.status >= 200 && request.status < 300,
        status: request.status,
        data: parseMarketingProfileResponse(request.responseText),
      })
    }

    request.onerror = () => reject(new Error('Marketing profile request failed.'))
    request.ontimeout = () => reject(new Error('Marketing profile request timed out.'))
    request.send(body)
  })
}

function parseMarketingProfileResponse(text: string) {
  if (!text) return null

  try {
    return JSON.parse(text) as MarketingProfileResponse
  } catch {
    return null
  }
}

function submitMarketingProfileWithForm(payload: {
  authorBio: string
  website: string
  facebook: string
  instagram: string
  xTwitter: string
}): Promise<MarketingProfileRequestResult> {
  return new Promise((resolve, reject) => {
    const frameName = `jm1-marketing-profile-${Date.now()}`
    const iframe = document.createElement('iframe')
    iframe.name = frameName
    iframe.style.display = 'none'

    const form = document.createElement('form')
    form.method = 'POST'
    form.action = '/api/author/marketing-profile'
    form.target = frameName
    form.style.display = 'none'

    for (const [name, value] of Object.entries(payload)) {
      const input = document.createElement('input')
      input.type = 'hidden'
      input.name = name
      input.value = value
      form.appendChild(input)
    }

    const cleanup = window.setTimeout(() => {
      iframe.remove()
      form.remove()
      reject(new Error('Marketing profile request timed out.'))
    }, 30000)

    iframe.onload = () => {
      window.clearTimeout(cleanup)
      const text = iframe.contentDocument?.body?.innerText || iframe.contentDocument?.body?.textContent || ''
      iframe.remove()
      form.remove()
      const data = parseMarketingProfileResponse(text)
      resolve({
        ok: Boolean(data?.ok),
        status: data?.ok ? 200 : 500,
        data,
      })
    }

    document.body.appendChild(iframe)
    document.body.appendChild(form)
    form.submit()
  })
}

function marketingSuccessMessage(data: MarketingProfileResponse | null) {
  if (data?.status === 'already-submitted') {
    return data.message || 'Your marketing profile submission was already received.'
  }

  if (data?.status === 'submitted-review-pending') {
    return data.message || 'Your marketing profile was saved. The publishing team still has one internal review step to complete.'
  }

  return data?.message || 'Marketing profile saved for publishing team review.'
}

function marketingErrorMessage(status: number, data: MarketingProfileResponse | null) {
  const suffix = data?.correlationId ? ` Reference: ${data.correlationId}.` : ''

  if (status === 401) {
    return `${data?.error || 'Your author session has expired. Please sign in again, then retry.'}${suffix}`
  }

  if (status === 403) {
    return `${data?.error || 'This author profile is not available to this signed-in account.'}${suffix}`
  }

  if (status === 400) {
    return `${data?.error || 'Please review the highlighted profile details and try again.'}${suffix}`
  }

  return `${data?.error || 'We could not finish saving your marketing profile. Your entries are still on this page; please retry in a moment or contact publishing@jmerrill.one.'}${suffix}`
}

function marketingNetworkErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : ''

  if (message === 'Failed to fetch' || !message) {
    return 'We could not reach the publishing system. Your entries are still on this page; please retry in a moment.'
  }

  return 'We could not finish saving your marketing profile. Your entries are still on this page; please retry in a moment.'
}

function isEditorialWorkspaceState(state: AuthorPortalContext['projects'][number]['workspaceState']) {
  return (
    state === 'editorial_review' ||
    state === 'developmental_editing' ||
    state === 'editorial_in_progress' ||
    state === 'production_in_progress' ||
    state === 'distribution_release_pending'
  )
}

function projectStateBadge(state: AuthorPortalContext['projects'][number]['workspaceState']) {
  switch (state) {
    case 'editorial_review':
    case 'developmental_editing':
    case 'editorial_in_progress':
    case 'production_in_progress':
    case 'distribution_release_pending':
      return 'Active'
    case 'published_legacy':
      return 'Legacy'
    case 'archived':
      return 'Archived'
    default:
      return 'Setup'
  }
}
