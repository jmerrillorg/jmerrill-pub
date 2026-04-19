import { NextResponse } from 'next/server'

export const runtime = 'edge'
// Cache for 5 minutes — swap for Dataverse fetch in Phase 2
export const revalidate = 300

export async function GET() {
  // ── Phase 1: Static mock (v1) ───────────────────────────────
  // ── Phase 2: Replace with Dataverse query via Power Automate ─
  //
  // const res = await fetch(process.env.DATAVERSE_STATS_ENDPOINT!, {
  //   headers: { Authorization: `Bearer ${process.env.DATAVERSE_TOKEN}` },
  //   next: { revalidate: 300 }
  // })
  // const data = await res.json()

  const stats = {
    inDevelopment:   3,   // manuscripts currently in editorial
    inDesign:        2,   // covers / layouts in progress
    releasedThisWeek: 1,  // titles released in last 7 days
    totalTitles:     125,
    activeAuthors:   40,
    lastUpdated:     new Date().toISOString(),
  }

  return NextResponse.json(stats, {
    headers: {
      'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=60',
    },
  })
}
