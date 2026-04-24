import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { ImprintDetailTemplate } from '@/components/imprints/ImprintDetailTemplate'
import { getBooksByImprint } from '@/lib/content'
import { getImprintStrategyBySlug, imprintStrategies } from '@/data/imprints'

type Props = {
  params: {
    slug: string
  }
}

export async function generateStaticParams() {
  return imprintStrategies.map((imprint) => ({ slug: imprint.slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const imprint = getImprintStrategyBySlug(params.slug)

  if (!imprint) {
    return { title: 'Imprint Not Found' }
  }

  return {
    title: imprint.label,
    description: imprint.positioningStatement,
  }
}

export default function ImprintPage({ params }: Props) {
  const imprint = getImprintStrategyBySlug(params.slug)
  if (!imprint) notFound()

  const featuredBooks = getBooksByImprint(imprint.label).slice(0, 4)

  return <ImprintDetailTemplate imprint={imprint} featuredBooks={featuredBooks} />
}
