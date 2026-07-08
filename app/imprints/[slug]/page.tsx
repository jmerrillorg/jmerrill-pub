import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { ImprintDetailTemplate } from '@/components/imprints/ImprintDetailTemplate'
import { catalogTitleToBookCardRecord } from '@/lib/catalog/display'
import { listTitlesByCertifiedImprint } from '@/lib/server/dataverse/catalog'
import { getImprintStrategyBySlug, imprintStrategies } from '@/data/imprints'

export const dynamic = 'force-dynamic'

type Props = {
  params: {
    slug: string
  }
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

export default async function ImprintPage({ params }: Props) {
  const imprint = getImprintStrategyBySlug(params.slug)
  if (!imprint) notFound()

  const titleResult = await listTitlesByCertifiedImprint(imprint.label)
  const featuredBooks = titleResult.ok ? titleResult.data.slice(0, 4).map(catalogTitleToBookCardRecord) : []

  return <ImprintDetailTemplate imprint={imprint} featuredBooks={featuredBooks} catalogUnavailable={!titleResult.ok} />
}
