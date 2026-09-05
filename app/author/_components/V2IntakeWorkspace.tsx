'use client'

import { useEffect, useState, type FormEvent } from 'react'

import type { V2IntakeAnswers, V2IntakeReadback } from '@/lib/server/v2-intake'

type LoadState = 'loading' | 'ready' | 'error'
type SaveState = 'idle' | 'saving' | 'saved' | 'error'

export function V2IntakeWorkspace() {
  const [loadState, setLoadState] = useState<LoadState>('loading')
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const [intake, setIntake] = useState<V2IntakeReadback | null>(null)
  const [answers, setAnswers] = useState<V2IntakeAnswers>({})
  const [message, setMessage] = useState('')
  const [reviewing, setReviewing] = useState(false)

  useEffect(() => {
    let mounted = true
    void loadIntake().then((result) => {
      if (!mounted) return
      if (!result.ok || !result.intake) {
        setMessage(result.error ? humanizeError(result.error) : 'We could not open this Intake right now.')
        setLoadState('error')
        return
      }
      setIntake(result.intake)
      setAnswers(Object.fromEntries(result.intake.questions.map((question) => [question.code, question.answer])))
      setLoadState('ready')
    })
    return () => {
      mounted = false
    }
  }, [])

  async function save(mode: 'SAVE' | 'SUBMIT') {
    setSaveState('saving')
    setMessage('')
    try {
      const response = await fetch('/api/author/v2-intake', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers, mode }),
      })
      const payload = (await response.json().catch(() => null)) as {
        error?: string
        readback?: V2IntakeReadback
      } | null
      if (!response.ok || !payload?.readback) throw new Error(payload?.error || 'Your Intake could not be saved.')
      setIntake(payload.readback)
      setAnswers(Object.fromEntries(payload.readback.questions.map((question) => [question.code, question.answer])))
      setSaveState('saved')
      setReviewing(mode === 'SAVE' ? reviewing : false)
      setMessage(mode === 'SUBMIT' ? 'Your completed Intake has been submitted.' : 'Progress saved. You can return anytime.')
    } catch (error) {
      setSaveState('error')
      setMessage(error instanceof Error ? humanizeError(error.message) : 'Your Intake could not be saved.')
    }
  }

  function submit(event: FormEvent) {
    event.preventDefault()
    void save('SAVE')
  }

  if (loadState === 'loading') {
    return <div className="border border-white/10 bg-white/[0.04] p-7 text-sm text-white/60">Opening your Intake...</div>
  }

  if (loadState === 'error' || !intake) {
    return <div className="border border-amber-300/25 bg-amber-300/10 p-7 text-sm text-amber-100">{message}</div>
  }

  if (intake.submitted) {
    return (
      <section className="border border-emerald-300/25 bg-emerald-300/[0.08] p-7 sm:p-9">
        <p className="text-xs font-semibold uppercase text-emerald-200">Intake submitted</p>
        <h2 className="mt-3 font-display text-3xl text-white">Thank you, Jackie.</h2>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-white/65">
          Your responses are with the Publishing Team for review. This title remains at Intake until the next governed decision.
        </p>
      </section>
    )
  }

  const completedCount = intake.questions.length - intake.outstandingCount

  return (
    <div className="space-y-6">
      <section className="border border-blue-400/25 bg-blue-400/[0.07] p-6 sm:p-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase text-blue-200">{intake.stage}</p>
            <h2 className="mt-2 font-display text-3xl leading-tight text-white">{intake.title}</h2>
            <p className="mt-2 text-sm text-white/60">Current action: Complete Intake</p>
          </div>
          <div className="border border-white/10 bg-black/20 px-4 py-3 text-sm text-white/70">
            <strong className="text-white">{intake.outstandingCount}</strong> outstanding
          </div>
        </div>
        <div className="mt-6 h-2 overflow-hidden bg-white/10" aria-label={`${completedCount} of 5 complete`}>
          <div className="h-full bg-blue-400" style={{ width: `${(completedCount / 5) * 100}%` }} />
        </div>
      </section>

      <form onSubmit={submit} className="space-y-5">
        {reviewing ? (
          <section className="border border-white/10 bg-white/[0.03] p-6 sm:p-8">
            <h3 className="font-display text-2xl text-white">Review your answers</h3>
            <div className="mt-6 space-y-6">
              {intake.questions.map((question, index) => (
                <div key={question.code} className="border-b border-white/10 pb-5 last:border-0 last:pb-0">
                  <p className="text-sm font-semibold text-white">{index + 1}. {question.prompt}</p>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-white/65">
                    {answers[question.code]?.trim() || 'Not answered'}
                  </p>
                </div>
              ))}
            </div>
          </section>
        ) : (
          intake.questions.map((question, index) => (
            <label key={question.code} className="block border border-white/10 bg-white/[0.03] p-6 sm:p-7">
              <span className="block text-sm font-semibold leading-6 text-white">{index + 1}. {question.prompt}</span>
              <textarea
                value={answers[question.code] || ''}
                onChange={(event) => {
                  setAnswers((current) => ({ ...current, [question.code]: event.target.value }))
                  setSaveState('idle')
                }}
                rows={4}
                maxLength={4000}
                className="mt-4 w-full resize-y border border-white/15 bg-[#0b111c] px-4 py-3 text-sm leading-6 text-white outline-none focus:border-blue-400"
              />
            </label>
          ))
        )}

        <div className="flex flex-wrap items-center gap-3 border-t border-white/10 pt-5">
          <button
            type="submit"
            disabled={saveState === 'saving'}
            className="min-h-11 border border-white/15 px-5 text-sm font-semibold text-white disabled:opacity-50"
          >
            Save progress
          </button>
          <button
            type="button"
            onClick={() => setReviewing((value) => !value)}
            className="min-h-11 border border-blue-400/35 px-5 text-sm font-semibold text-blue-100"
          >
            {reviewing ? 'Edit answers' : 'Review answers'}
          </button>
          <button
            type="button"
            onClick={() => void save('SUBMIT')}
            disabled={saveState === 'saving' || intake.questions.some((question) => !answers[question.code]?.trim())}
            className="min-h-11 bg-blue-500 px-5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            Submit completed Intake
          </button>
          {message ? <p className={saveState === 'error' ? 'text-sm text-amber-200' : 'text-sm text-emerald-200'}>{message}</p> : null}
        </div>
      </form>

      <p className="text-xs leading-6 text-white/40">
        Manuscript on file: {intake.manuscript.filename}. Your title remains at Intake while information is outstanding.
      </p>
    </div>
  )
}

async function loadIntake() {
  const response = await fetch('/api/author/v2-intake', { credentials: 'same-origin', cache: 'no-store' })
  const payload = (await response.json().catch(() => null)) as { intake?: V2IntakeReadback; error?: string } | null
  return { ok: response.ok, intake: payload?.intake, error: payload?.error }
}

function humanizeError(message: string) {
  if (message.includes('INCOMPLETE')) return 'Please answer all five questions before submitting.'
  if (message.includes('NOT_AUTHORIZED') || message.includes('ACCESS_REQUIRED')) return 'This Intake is not available for this author account.'
  return 'Your Intake could not be saved. Please try again.'
}
