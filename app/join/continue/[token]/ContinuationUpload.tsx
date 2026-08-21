'use client'

import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react'

type Status = 'loading' | 'ready' | 'submitting' | 'complete' | 'error'

export default function ContinuationUpload({ token }: { token: string }) {
  const [status, setStatus] = useState<Status>('loading')
  const [message, setMessage] = useState('')
  const [reference, setReference] = useState('')
  const [projectTitle, setProjectTitle] = useState('')
  const [file, setFile] = useState<File | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      const response = await fetch(`/api/publishing/intake/continue/${encodeURIComponent(token)}`, { cache: 'no-store' })
      const data = await response.json().catch(() => null)
      if (cancelled) return
      if (!response.ok) {
        setStatus('error')
        setMessage(data?.error || 'This continuation link is not available.')
        return
      }
      setReference(data?.intake?.reference || '')
      setProjectTitle(data?.intake?.projectTitle || '')
      setStatus(data?.intake?.manuscriptReceived ? 'complete' : 'ready')
      setMessage(data?.intake?.manuscriptReceived ? 'A manuscript is already connected to this inquiry.' : '')
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [token])

  const setManuscript = (event: ChangeEvent<HTMLInputElement>) => {
    setFile(event.target.files?.[0] || null)
    setMessage('')
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!file) {
      setMessage('Choose a manuscript file first.')
      return
    }
    setStatus('submitting')
    const formData = new FormData()
    formData.append('manuscriptFile', file)
    const response = await fetch(`/api/publishing/intake/continue/${encodeURIComponent(token)}`, {
      method: 'POST',
      body: formData,
    })
    const data = await response.json().catch(() => null)
    if (!response.ok) {
      setStatus('ready')
      setMessage(data?.error || 'We could not receive the manuscript.')
      return
    }
    setStatus('complete')
    setMessage(data?.result?.reviewFlag === 'normalization_required'
      ? 'Your manuscript is connected. JMP is preparing the file for Editorial Review.'
      : 'Your manuscript is connected to your inquiry.')
  }

  return (
    <div className="rounded-3xl border border-blue-200/20 bg-[#18283B] p-6 shadow-[0_20px_70px_rgba(0,0,0,0.24)] sm:p-8">
      <div className="mb-6">
        <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-blue-300">Continue Your Submission</p>
        <h1 className="mt-3 font-display text-3xl text-white">Add your manuscript</h1>
        {reference && (
          <p className="mt-3 text-[13px] leading-7 text-white/62">
            Reference {reference}{projectTitle ? ` · ${projectTitle}` : ''}
          </p>
        )}
      </div>

      {status === 'loading' && <p className="text-[14px] text-white/70">Loading your secure continuation link...</p>}

      {(status === 'ready' || status === 'submitting') && (
        <form onSubmit={submit} className="flex flex-col gap-5">
          <input
            type="file"
            accept=".docx,.doc,.pages,.rtf,.pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/msword,application/pdf,application/rtf,text/rtf"
            onChange={setManuscript}
            className="w-full rounded-xl border border-white/15 bg-white/[0.08] px-4 py-3 text-[14px] text-white file:mr-4 file:rounded-full file:border-0 file:bg-blue-500 file:px-4 file:py-2 file:text-[12px] file:font-semibold file:text-white"
          />
          <p className="text-[12px] leading-6 text-white/55">
            Accepted formats: .docx, .doc, .pages, .rtf, or .pdf up to 25 MB.
          </p>
          {message && <p className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-[13px] text-red-200">{message}</p>}
          <button
            type="submit"
            disabled={status === 'submitting'}
            className="rounded-full bg-blue-500 px-6 py-4 text-[13px] font-semibold uppercase tracking-[0.08em] text-white disabled:bg-blue-500/55"
          >
            {status === 'submitting' ? 'Uploading...' : 'Upload manuscript'}
          </button>
        </form>
      )}

      {status === 'complete' && (
        <p className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-5 py-4 text-[14px] leading-7 text-emerald-100">
          {message || 'Your manuscript is connected to this inquiry.'}
        </p>
      )}

      {status === 'error' && (
        <p className="rounded-2xl border border-red-400/20 bg-red-400/10 px-5 py-4 text-[14px] leading-7 text-red-100">
          {message}
        </p>
      )}
    </div>
  )
}
