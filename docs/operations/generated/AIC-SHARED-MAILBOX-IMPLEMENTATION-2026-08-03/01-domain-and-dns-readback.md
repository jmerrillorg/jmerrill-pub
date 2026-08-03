# Domain And DNS Readback

Date: 2026-08-03

## Azure Context

- Azure CLI account tenant: `352d075e-8e17-4169-9f8e-22e6946ce66d`
- Azure CLI user: `jm1-admin@jmerrill.one`
- Azure subscription: `9ee13245-2303-4010-8b6d-35f7cbcfdc0e`

## Azure DNS

- Zone: `agapeic.org`
- Resource group: `agape-international-cathedral-rg`
- Record set count: 18
- Nameservers:
  - `ns1-07.azure-dns.com.`
  - `ns2-07.azure-dns.net.`
  - `ns3-07.azure-dns.org.`
  - `ns4-07.azure-dns.info.`

The zone export is preserved at `raw/azure-dns-zone-agapeic.org.json`.

## Website DNS

- `https://agapeic.org`: HTTP 200
- Root A: `20.119.8.5`
- `www.agapeic.org`: CNAME `aic-app-service-prod.azurewebsites.net`

Website records are preserved in the implementation plan.

## Current Mail DNS

- MX: `0 mail.agapeic.org.`
- Root SPF TXT includes `v=spf1 a mx include:_spf.hostpma.pro ~all`
- DMARC: `_dmarc.agapeic.org TXT "v=DMARC1; p=reject;"`
- Autodiscover CNAME: not configured

The current DMARC `p=reject` conflicts with the staged implementation instruction to avoid enforcement beyond `p=none` during this migration unless separately authorized.

## Microsoft 365 Domain Readback

Microsoft Graph direct readback for `agapeic.org` returned 404 ResourceNotFound. The domain list readback does not include `agapeic.org`.

Graph readback is preserved at `raw/graph-domains-readback.txt`.

## Exchange Readiness

ExchangeOnlineManagement module version 3.10.0 is present locally. No Exchange connection, accepted-domain mutation, shared-mailbox creation, or permission mutation was performed because the domain is not present or verified in Microsoft 365.

