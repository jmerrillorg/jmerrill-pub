import { NextResponse } from 'next/server'

export function missingFields(body: Record<string, unknown>, required: string[]) {
  return required.filter((field) => !String(body[field] || '').trim())
}

export function requiredFieldsResponse(fields: string[]) {
  return NextResponse.json(
    { error: `Missing required fields: ${fields.join(', ')}` },
    { status: 400 },
  )
}

export function cleanString(value: unknown) {
  return String(value || '').trim()
}
