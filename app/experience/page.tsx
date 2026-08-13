import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { footerLinks } from '@/lib/tokens'

export const metadata: Metadata = {
  title: 'Share Your Experience',
  description:
    'Share privacy-minimized feedback about your author experience with J Merrill Publishing.',
}

export default function AuthorExperiencePage() {
  redirect(footerLinks.authorSupport.find((link) => link.label === 'Share Your Experience')?.href ?? '/contact')
}
