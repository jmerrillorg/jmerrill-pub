import { randomInt } from 'crypto'

const ALPHANUMERIC = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'

export function generateIntakeReference(date = new Date()) {
  const year = date.getUTCFullYear()
  const month = String(date.getUTCMonth() + 1).padStart(2, '0')
  const suffix = Array.from({ length: 6 }, () => ALPHANUMERIC[randomIndex(ALPHANUMERIC.length)]).join('')

  return `JMP-INT-${year}${month}-${suffix}`
}

function randomIndex(max: number) {
  return randomInt(max)
}

export function isIntakeReference(value: string) {
  return /^JMP-INT-\d{6}-[A-Z0-9]{6}$/.test(value)
}
