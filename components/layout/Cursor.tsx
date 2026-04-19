'use client'

import { useEffect, useRef } from 'react'

export function Cursor() {
  const dotRef  = useRef<HTMLDivElement>(null)
  const ringRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let mx = 0, my = 0, rx = 0, ry = 0
    let raf: number

    const onMove = (e: MouseEvent) => { mx = e.clientX; my = e.clientY }
    document.addEventListener('mousemove', onMove, { passive: true })

    const loop = () => {
      if (dotRef.current) {
        dotRef.current.style.left = mx + 'px'
        dotRef.current.style.top  = my + 'px'
      }
      rx += (mx - rx) * 0.12
      ry += (my - ry) * 0.12
      if (ringRef.current) {
        ringRef.current.style.left = rx + 'px'
        ringRef.current.style.top  = ry + 'px'
      }
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)

    return () => {
      document.removeEventListener('mousemove', onMove)
      cancelAnimationFrame(raf)
    }
  }, [])

  return (
    <>
      <div
        ref={dotRef}
        className="cursor-dot"
        style={{ position: 'fixed', pointerEvents: 'none', zIndex: 9999,
          width: 12, height: 12, borderRadius: '50%',
          background: '#1E90FF', transform: 'translate(-50%,-50%)',
          mixBlendMode: 'multiply', transition: 'width 0.2s, height 0.2s' }}
      />
      <div
        ref={ringRef}
        style={{ position: 'fixed', pointerEvents: 'none', zIndex: 9998,
          width: 40, height: 40, borderRadius: '50%',
          border: '1.5px solid #1E90FF',
          transform: 'translate(-50%,-50%)', opacity: 0.4,
          transition: 'width 0.35s cubic-bezier(0.23,1,0.32,1), height 0.35s cubic-bezier(0.23,1,0.32,1)' }}
      />
    </>
  )
}
