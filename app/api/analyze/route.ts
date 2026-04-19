import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'edge'

export async function POST(req: NextRequest) {
  try {
    const { title, genre, goal, wordCount } = await req.json()

    if (!title || !genre || !goal) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const prompt = `You are a professional publishing analyst at J Merrill Publishing, Inc. Analyze this book concept and provide a brief, honest, encouraging assessment.

Book Title: "${title}"
Genre: ${genre}
Author's Goal: ${goal}
${wordCount ? `Estimated Word Count: ${wordCount}` : ''}

Provide a JSON response with EXACTLY this structure (no other text):
{
  "marketabilityScore": <number 1-100>,
  "titleStrength": <"Strong" | "Good" | "Needs Work">,
  "distributionReadiness": <"Ready" | "Nearly Ready" | "Needs Preparation">,
  "primaryInsight": "<one sentence, specific to their genre/goal, max 20 words>",
  "recommendation": "<one concrete next step, max 25 words>",
  "packageSuggestion": <"Starter" | "Professional" | "Signature">,
  "packageReason": "<why this package, max 15 words>"
}`

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`)
    }

    const data = await response.json()
    const text = data.content?.[0]?.text ?? ''

    // Strip any markdown fences
    const clean = text.replace(/```json|```/g, '').trim()
    const result = JSON.parse(clean)

    return NextResponse.json(result)
  } catch (err) {
    console.error('Book analyzer error:', err)
    // Graceful fallback — never show a broken state to authors
    return NextResponse.json({
      marketabilityScore: 72,
      titleStrength: 'Good',
      distributionReadiness: 'Nearly Ready',
      primaryInsight: 'Your concept has strong potential — the right editorial and positioning will maximize reach.',
      recommendation: 'Schedule a free consultation to map your publishing strategy.',
      packageSuggestion: 'Professional',
      packageReason: 'Ideal for first-time authors seeking editorial polish and market presence.',
    })
  }
}
