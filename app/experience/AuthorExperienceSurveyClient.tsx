'use client'

import { FormEvent, useMemo, useState } from 'react'
import { PUBLISHING_AUTHOR_EXPERIENCE_SURVEY } from '@/lib/publishing/author-experience-survey'

type SubmissionState =
  | { status: 'idle' }
  | { status: 'submitting' }
  | { status: 'received'; reference: string }
  | { status: 'error'; message: string }

const ratingLabels = ['Needs work', 'Fair', 'Good', 'Strong', 'Excellent']

export function AuthorExperienceSurveyClient() {
  const initialAnswers = useMemo(() => {
    return Object.fromEntries(
      PUBLISHING_AUTHOR_EXPERIENCE_SURVEY.questions.map((question) => [question.id, '']),
    )
  }, [])

  const [answers, setAnswers] = useState<Record<string, string>>(initialAnswers)
  const [submission, setSubmission] = useState<SubmissionState>({ status: 'idle' })

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmission({ status: 'submitting' })

    const response = await fetch('/api/author-experience', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(answers),
    }).catch(() => null)

    if (!response) {
      setSubmission({ status: 'error', message: 'We could not receive your feedback right now.' })
      return
    }

    const body = await response.json().catch(() => null)
    if (!response.ok || body?.status !== 'received') {
      setSubmission({ status: 'error', message: 'We could not receive your feedback right now.' })
      return
    }

    setSubmission({ status: 'received', reference: String(body.reference || '') })
    setAnswers(initialAnswers)
  }

  return (
    <form onSubmit={onSubmit} className="space-y-8">
      {PUBLISHING_AUTHOR_EXPERIENCE_SURVEY.questions.map((question) => (
        <div key={question.id} className="border-b border-gray-200 pb-8 last:border-b-0">
          <div className="mb-3 font-mono text-[10px] uppercase tracking-[0.14em] text-blue-500">
            {question.label}
          </div>
          <label className="block text-[18px] font-light leading-[1.55] text-charcoal">
            {question.prompt}
          </label>

          {question.type === 'text' ? (
            <>
              <textarea
                value={answers[question.id] || ''}
                onChange={(event) => setAnswers((current) => ({ ...current, [question.id]: event.target.value }))}
                maxLength={question.maxLength}
                rows={5}
                className="mt-4 w-full rounded-[18px] border border-gray-200 bg-white px-5 py-4 text-[15px] leading-[1.7] text-charcoal outline-none transition-colors focus:border-blue-400"
              />
              <p className="mt-3 text-[12px] leading-[1.7] text-gray-400">
                {PUBLISHING_AUTHOR_EXPERIENCE_SURVEY.privacyNotice}
              </p>
            </>
          ) : (
            <div className="mt-5 grid gap-2 sm:grid-cols-5">
              {Array.from({ length: question.max - question.min + 1 }, (_, index) => question.min + index).map((value) => {
                const selected = answers[question.id] === String(value)
                return (
                  <label
                    key={value}
                    className={[
                      'flex cursor-pointer flex-col items-center justify-center rounded-[16px] border px-3 py-4 text-center transition-all',
                      selected
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-200 bg-white text-gray-500 hover:border-blue-300',
                    ].join(' ')}
                  >
                    <input
                      type="radio"
                      name={question.id}
                      value={value}
                      checked={selected}
                      required={question.required}
                      onChange={(event) => setAnswers((current) => ({ ...current, [question.id]: event.target.value }))}
                      className="sr-only"
                    />
                    <span className="text-[22px] font-semibold">{value}</span>
                    {question.type === 'rating' && value >= 1 && value <= 5 && (
                      <span className="mt-1 text-[11px]">{ratingLabels[value - 1]}</span>
                    )}
                  </label>
                )
              })}
            </div>
          )}
        </div>
      ))}

      {submission.status === 'received' && (
        <div className="rounded-[18px] border border-emerald-200 bg-emerald-50 px-5 py-4 text-[14px] leading-[1.7] text-emerald-800">
          Thank you. Your feedback was received. Reference: {submission.reference}
        </div>
      )}

      {submission.status === 'error' && (
        <div className="rounded-[18px] border border-red-200 bg-red-50 px-5 py-4 text-[14px] leading-[1.7] text-red-700">
          {submission.message}
        </div>
      )}

      <button
        type="submit"
        disabled={submission.status === 'submitting'}
        className="rounded-full bg-blue-500 px-8 py-3.5 text-[14px] font-semibold text-white transition-colors hover:bg-blue-600 disabled:cursor-not-allowed disabled:bg-gray-300"
      >
        {submission.status === 'submitting' ? 'Submitting Feedback' : 'Submit Feedback'}
      </button>
    </form>
  )
}
