'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'

import type { AuthorPortalContext } from '@/lib/server/author-portal-context'

type LoadState = 'loading' | 'ready' | 'error'

export function AuthorPortalWorkspace() {
  const searchParams = useSearchParams()
  const [state, setState] = useState<LoadState>('loading')
  const [context, setContext] = useState<AuthorPortalContext | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let mounted = true

    async function load() {
      try {
        const params = new URLSearchParams()
        const reference = searchParams.get('reference') || searchParams.get('ref')
        const opportunityId = searchParams.get('opportunityId')
        const titleId = searchParams.get('titleId')
        const publishingAssetId = searchParams.get('publishingAssetId')

        if (reference) params.set('reference', reference)
        if (opportunityId) params.set('opportunityId', opportunityId)
        if (titleId) params.set('titleId', titleId)
        if (publishingAssetId) params.set('publishingAssetId', publishingAssetId)

        const response = await fetch(`/api/author/context${params.toString() ? `?${params.toString()}` : ''}`, {
          cache: 'no-store',
        })
        const data = await safeReadJson(response)

        if (!response.ok) {
          throw new Error(data?.error || 'We could not load your workspace right now.')
        }
        if (!data?.context) {
          throw new Error('We could not load your workspace right now.')
        }

        if (!mounted) return
        setContext(data.context)
        setState('ready')
      } catch (err) {
        if (!mounted) return
        setError(err instanceof Error ? err.message : 'We could not load your workspace right now.')
        setState('error')
      }
    }

    void load()

    return () => {
      mounted = false
    }
  }, [searchParams])

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

  const multipleProjects = context.projects.length > 1

  return (
    <div className="space-y-8">
      <section className="rounded-[32px] border border-blue-500/20 bg-blue-500/[0.06] p-7 sm:p-9">
        <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-blue-300">Welcome back</p>
        <h2
          className="mt-3 text-white"
          style={{ fontFamily: "'Libre Baskerville', serif", fontSize: '32px', fontWeight: 700, lineHeight: 1.1 }}
        >
          {context.author.firstName ? `Welcome back, ${context.author.firstName}.` : 'Welcome back.'}
        </h2>
        <p className="mt-3 max-w-[760px] text-[14px] font-light leading-[1.8] text-white/55">
          We opened the workspace for your current project instead of starting a brand-new author setup.
        </p>
        <div className="mt-6 rounded-3xl border border-white/10 bg-black/15 p-5">
          <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-white/35">Current project</p>
          <h3 className="mt-2 text-[20px] font-semibold text-white">{context.currentProject.title}</h3>
          <p className="mt-2 text-[13px] leading-[1.7] text-white/45">{context.currentProject.statusLabel}</p>
          {context.currentProject.nextActionLabel ? (
            <p className="mt-2 text-[13px] leading-[1.7] text-blue-200/85">{context.currentProject.nextActionLabel}</p>
          ) : null}
          {context.currentProject.pendingApprovalLabel ? (
            <p className="mt-2 text-[12px] uppercase tracking-[0.08em] text-amber-200/85">
              Pending approval: {context.currentProject.pendingApprovalLabel}
            </p>
          ) : null}
        </div>
      </section>

      {steps.length > 0 ? (
        <section className="space-y-4">
          <h3 className="text-[22px] font-semibold text-white">Complete these next steps.</h3>
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
            Additional publishing tools will unlock after your agreement is signed and your initial payment is confirmed.
          </p>
        </section>
      ) : null}

      <section className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="rounded-[28px] border border-white/8 bg-white/[0.04] p-6">
          <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-white/35">Project status</p>
          {context.editorial ? (
            <>
              <h3 className="mt-3 text-[20px] font-semibold text-white">{context.editorial.stageLabel}</h3>
              <p className="mt-2 text-[13px] leading-[1.7] text-white/50">{context.editorial.summary}</p>
              <p className="mt-3 text-[12px] uppercase tracking-[0.08em] text-blue-200/85">
                {context.editorial.stageStatus}
              </p>
            </>
          ) : (
            <>
              <h3 className="mt-3 text-[20px] font-semibold text-white">{context.currentProject.statusLabel}</h3>
              <p className="mt-2 text-[13px] leading-[1.7] text-white/50">
                This workspace stays focused on what your project needs next.
              </p>
            </>
          )}
        </div>

        <div className="rounded-[28px] border border-white/8 bg-white/[0.04] p-6">
          <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-white/35">
            {multipleProjects ? 'Your assets and projects' : 'Your project'}
          </p>
          <div className="mt-4 space-y-3">
            {context.projects.map((project) => (
              <Link
                key={project.key}
                href={buildProjectHref(project)}
                className={`block rounded-2xl border p-4 transition-colors ${
                  project.key === context.selectedProjectKey
                    ? 'border-blue-400/35 bg-blue-500/[0.10]'
                    : 'border-white/8 bg-black/15 hover:border-blue-300/30 hover:bg-blue-500/[0.06]'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="text-[14px] font-medium text-white/85">{project.title}</div>
                  <span className="rounded-full border border-white/10 px-2.5 py-1 text-[10px] uppercase tracking-[0.08em] text-white/55">
                    {project.workspaceState === 'active_editorial' ? 'Active' : 'Setup'}
                  </span>
                </div>
                <div className="mt-2 text-[12px] text-white/40">{project.statusLabel}</div>
                {project.nextActionLabel ? (
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
      </section>
    </div>
  )
}

function buildProjectHref(project: AuthorPortalContext['projects'][number]) {
  const params = new URLSearchParams()
  if (project.intakeReference) params.set('reference', project.intakeReference)
  if (project.opportunityId) params.set('opportunityId', project.opportunityId)
  if (project.titleId) params.set('titleId', project.titleId)
  if (project.publishingAssetId) params.set('publishingAssetId', project.publishingAssetId)
  return `/author/portal${params.toString() ? `?${params.toString()}` : ''}`
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
