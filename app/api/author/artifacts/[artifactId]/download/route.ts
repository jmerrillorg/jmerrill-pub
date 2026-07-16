import { type NextRequest, NextResponse } from 'next/server'

import { requireAuthorAccess, resolveAuthorPortalContext } from '@/lib/server/author-portal-context'
import {
  dataverseFirst,
  dataverseFormatted,
  dataverseLookupId,
  getDataverseServerConfig,
  stringValue,
} from '@/lib/server/dataverse-server'

const GRAPH_SCOPE = 'https://graph.microsoft.com/.default'

export async function GET(
  req: NextRequest,
  { params }: { params: { artifactId: string } },
) {
  const access = requireAuthorAccess(req)
  if ('unauthorized' in access) return access.unauthorized

  const artifactId = params.artifactId?.trim()
  if (!artifactId || !isGuid(artifactId)) {
    return NextResponse.json({ error: 'Artifact not found.' }, { status: 404 })
  }

  const config = getDataverseServerConfig()
  if (!config) {
    return NextResponse.json({ error: 'Author artifact access is not configured.' }, { status: 503 })
  }

  const context = await resolveAuthorPortalContext(access.session)
  if (!context) {
    return NextResponse.json({ error: 'Author workspace session not found.' }, { status: 401 })
  }

  const visibleArtifact = context.projects
    .flatMap((project) => project.artifacts || [])
    .find((artifact) => artifact.id === artifactId)

  const artifact = await dataverseFirst(config, 'jm1pub_editorialartifacts', {
    $select:
      'jm1pub_editorialartifactid,jm1pub_filename,jm1pub_artifactstatus,jm1pub_visibility,jm1pub_repositorydriveid,jm1pub_repositoryitemid,jm1pub_fileextension,jm1pub_iscurrentapproved,jm1pub_supersededon,_jm1pub_publishingassetid_value,_jm1pub_editorialstageid_value',
    $filter: `jm1pub_editorialartifactid eq ${artifactId}`,
  })

  if (!artifact) {
    return NextResponse.json({ error: 'Artifact not found.' }, { status: 404 })
  }

  const publishingAssetId = dataverseLookupId(artifact, '_jm1pub_publishingassetid_value')
  const authorized = context.projects.some((project) => project.publishingAssetId === publishingAssetId)
  const delivered = dataverseFormatted(artifact, 'jm1pub_artifactstatus', '') === 'Delivered'
  const authorFacing = dataverseFormatted(artifact, 'jm1pub_visibility', '') === 'Author Facing'
  const currentApproved = Boolean(artifact.jm1pub_iscurrentapproved)
  const notSuperseded = !stringValue(artifact.jm1pub_supersededon)

  if (!authorized || !visibleArtifact || !delivered || !authorFacing || !currentApproved || !notSuperseded) {
    return NextResponse.json({ error: 'Artifact not found.' }, { status: 404 })
  }

  const driveId = stringValue(artifact.jm1pub_repositorydriveid)
  const itemId = stringValue(artifact.jm1pub_repositoryitemid)
  const filename = sanitizeDownloadFilename(stringValue(artifact.jm1pub_filename) || 'editorial-artifact')

  if (!driveId || !itemId) {
    return NextResponse.json({ error: 'Artifact file is not available.' }, { status: 404 })
  }

  const token = await getGraphToken()
  const response = await fetch(
    `https://graph.microsoft.com/v1.0/drives/${encodeURIComponent(driveId)}/items/${encodeURIComponent(itemId)}/content`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      cache: 'no-store',
    },
  )

  if (!response.ok) {
    return NextResponse.json({ error: 'Artifact file could not be loaded.' }, { status: 502 })
  }

  const body = await response.arrayBuffer()
  const contentType = contentTypeForFilename(filename)
  const encodedFilename = encodeURIComponent(filename)

  return new NextResponse(body, {
    headers: {
      'Content-Type': contentType,
      'Content-Disposition': `attachment; filename="${filename}"; filename*=UTF-8''${encodedFilename}`,
      'Cache-Control': 'private, no-store',
      'Content-Length': String(body.byteLength),
      'X-Content-Type-Options': 'nosniff',
    },
  })
}

async function getGraphToken() {
  const tenantId = process.env.GRAPH_TENANT_ID || process.env.SHAREPOINT_TENANT_ID
  const clientId = process.env.GRAPH_CLIENT_ID || process.env.SHAREPOINT_CLIENT_ID
  const clientSecret = process.env.GRAPH_CLIENT_SECRET || process.env.SHAREPOINT_CLIENT_SECRET

  if (!tenantId || !clientId || !clientSecret) {
    throw new Error('graph_config_missing')
  }

  const response = await fetch(`https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: clientSecret,
      scope: GRAPH_SCOPE,
    }),
  })

  const json = (await response.json().catch(() => null)) as { access_token?: string } | null
  if (!response.ok || !json?.access_token) {
    throw new Error(`graph_token_failed:${response.status}`)
  }

  return json.access_token
}

function isGuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
}

function sanitizeDownloadFilename(value: string) {
  return value.replace(/[\r\n"\\/]/g, '-').slice(0, 180) || 'editorial-artifact'
}

function contentTypeForFilename(filename: string) {
  const lower = filename.toLowerCase()
  if (lower.endsWith('.docx')) return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  if (lower.endsWith('.pdf')) return 'application/pdf'
  if (lower.endsWith('.xlsx')) return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  if (lower.endsWith('.doc')) return 'application/msword'
  if (lower.endsWith('.txt')) return 'text/plain; charset=utf-8'
  return 'application/octet-stream'
}
