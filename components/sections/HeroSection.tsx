'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'

export function HeroSection() {
  const [mousePos, setMousePos] = useState({ x: 0.5, y: 0.5 })

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      setMousePos({ x: e.clientX / window.innerWidth, y: e.clientY / window.innerHeight })
    }
    window.addEventListener('mousemove', onMove, { passive: true })
    return () => window.removeEventListener('mousemove', onMove)
  }, [])

  const glowX = `${mousePos.x * 100}%`
  const glowY = `${mousePos.y * 100}%`

  return (
    <section className="min-h-screen grid lg:grid-cols-[55%_45%] pt-[76px] relative overflow-hidden">

      {/* ── LEFT ── */}
      <div className="flex flex-col justify-center px-12 lg:px-16 py-20 relative">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: `radial-gradient(600px circle at ${glowX} ${glowY}, rgba(30,144,255,0.04) 0%, transparent 70%)`, transition: 'background 0.3s' }}
        />

        {/* Repositioned badge: Operating System, not services site */}
        <div className="flex items-center gap-3 mb-8 animate-[fadeUp_0.5s_ease_both]">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 border border-blue-100 rounded-full">
            <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" />
            <span className="text-[10px] font-medium tracking-[0.14em] uppercase text-blue-600" style={{ fontFamily: "'DM Mono', monospace" }}>
              Publishing Operating System · Division 01
            </span>
          </div>
        </div>

        {/* Canon headline from JM1 divisions/publishing page */}
        <h1
          className="mb-5 text-charcoal relative z-10"
          style={{ fontFamily: "'Libre Baskerville', Georgia, serif", fontSize: 'clamp(48px, 5.2vw, 84px)', fontWeight: 700, lineHeight: 1.0, letterSpacing: '-0.03em' }}
        >
          <span className="block overflow-hidden"><span className="block animate-[wordReveal_0.8s_0.1s_cubic-bezier(0.16,1,0.3,1)_both]">Your words.</span></span>
          <span className="block overflow-hidden"><span className="block animate-[wordReveal_0.8s_0.25s_cubic-bezier(0.16,1,0.3,1)_both] text-blue-500 italic">Your legacy.</span></span>
          <span className="block overflow-hidden"><span className="block animate-[wordReveal_0.8s_0.4s_cubic-bezier(0.16,1,0.3,1)_both]">Your rights.</span></span>
        </h1>

        <p className="text-[11px] font-medium tracking-[0.1em] uppercase text-gray-400 mb-5 animate-[fadeUp_0.6s_0.5s_both]" style={{ fontFamily: "'DM Mono', monospace" }}>
          What you write should not disappear.
        </p>

        <p className="text-[18px] font-light leading-[1.75] text-gray-500 max-w-[500px] mb-12 animate-[fadeUp_0.7s_0.55s_both]">
          J Merrill Publishing is a full-service publisher and publishing intelligence platform — built on enterprise infrastructure, powered by AI, governed by the JM1 operating system.
        </p>

        <div className="flex items-center gap-5 flex-wrap animate-[fadeUp_0.7s_0.7s_both]">
          <Link href="/join" className="group inline-flex items-center gap-2.5 bg-blue-500 text-white text-[14px] font-semibold tracking-[0.04em] uppercase px-9 py-4 rounded-full hover:bg-blue-600 transition-all duration-250 hover:-translate-y-0.5 shadow-[0_4px_20px_rgba(30,144,255,0.35)]">
            Join the Family
            <span className="transition-transform duration-200 group-hover:translate-x-1">→</span>
          </Link>
          <a href="#analyze" className="inline-flex items-center gap-2 text-[14px] font-medium text-blue-500 hover:text-blue-600 transition-colors">
            <span className="w-8 h-8 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center text-[13px]">✦</span>
            Find Your Publishing Path
          </a>
        </div>

        <div className="flex gap-10 mt-14 pt-8 border-t border-gray-100 animate-[fadeUp_0.7s_0.85s_both]">
          {[['125', '+', 'Titles Published'], ['95', '+', 'Services'], ['16', '', 'Categories']].map(([n, suf, l]) => (
            <div key={l}>
              <div className="leading-none mb-1 text-charcoal" style={{ fontFamily: "'Libre Baskerville', serif", fontSize: '34px', fontWeight: 700, letterSpacing: '-0.02em' }}>
                {n}<span className="text-blue-500">{suf}</span>
              </div>
              <div className="text-[12px] text-gray-400 tracking-[0.04em]">{l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── RIGHT ── */}
      <div className="relative overflow-hidden bg-[#0F1C2E] animate-[panelReveal_1s_0.15s_cubic-bezier(0.16,1,0.3,1)_both]" style={{ minHeight: 'calc(100vh - 76px)' }}>
        <div className="absolute inset-0 pointer-events-none" style={{ background: `radial-gradient(700px circle at ${glowX} ${glowY}, rgba(30,144,255,0.1) 0%, transparent 60%)`, transition: 'background 0.4s' }} />
        <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse 60% 50% at 30% 40%, rgba(30,144,255,0.1) 0%, transparent 65%)' }} />
        <div className="absolute inset-0" style={{ backgroundImage: `linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)`, backgroundSize: '64px 64px' }} />

        <div className="relative z-10 h-full flex flex-col items-center justify-center px-12 py-20">
          <div className="relative mb-10 animate-[float_8s_ease-in-out_infinite]">
            <Image src="https://www.jmerrill.pub/logo.jpg" alt="J Merrill Publishing" width={240} height={240} className="w-[220px] h-[220px] object-contain" style={{ filter: 'invert(1) brightness(0.85)' }} priority />
            <div className="absolute -top-3 -right-5 bg-blue-500 text-white text-[10px] font-semibold tracking-[0.1em] uppercase px-4 py-2 rounded-full whitespace-nowrap animate-[badgePulse_3s_ease-in-out_infinite]">
              Vision · Creativity · Innovation
            </div>
          </div>

          <p className="text-center text-[18px] leading-[1.5] text-white/55 mb-10 max-w-[300px]" style={{ fontFamily: "'Libre Baskerville', Georgia, serif", fontStyle: 'italic' }}>
            "Every book deserves<br />a system behind it."
          </p>

          {/* System layers visual */}
          <div className="w-full max-w-[300px] flex flex-col gap-2">
            {[
              { label: 'Editorial Intelligence', icon: '✏️' },
              { label: 'Design & Production',    icon: '🎨' },
              { label: 'Distribution Network',   icon: '🌐' },
              { label: 'Marketing Engine',       icon: '📣' },
              { label: 'AI Publishing Layer',    icon: '🤖' },
            ].map((layer) => (
              <div key={layer.label} className="flex items-center gap-3 px-4 py-2.5 rounded-xl border bg-blue-500/[0.07] border-blue-500/20 hover:bg-blue-500/12 hover:border-blue-500/35 transition-all duration-200">
                <span className="text-[14px]">{layer.icon}</span>
                <span className="text-[12px] text-white/50 flex-1">{layer.label}</span>
                <span className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
