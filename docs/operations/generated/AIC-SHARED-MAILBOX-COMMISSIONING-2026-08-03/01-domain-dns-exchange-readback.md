# Domain, DNS, And Exchange Readback

## Microsoft 365 Domain

- Domain: `agapeic.org`
- Present in Microsoft Graph: YES
- Verified: YES
- Supported services: Email
- Authentication type: Managed
- Separate tenant: NOT PLANNED

## Azure DNS

- Zone: `agapeic.org`
- Resource group: `agape-international-cathedral-rg`
- Nameservers:
  - `ns1-07.azure-dns.com.`
  - `ns2-07.azure-dns.net.`
  - `ns3-07.azure-dns.org.`
  - `ns4-07.azure-dns.info.`
- Nameservers changed: NO
- Website DNS preserved: YES

## Mail DNS

- MX: `0 agapeic-org.mail.protection.outlook.com.`
- SPF: `v=spf1 include:spf.protection.outlook.com -all`
- Autodiscover: `autodiscover.outlook.com.`
- DKIM selector 1: `selector1-agapeic-org._domainkey.jmerrillfoundation.y-v1.dkim.mail.microsoft.`
- DKIM selector 2: `selector2-agapeic-org._domainkey.jmerrillfoundation.y-v1.dkim.mail.microsoft.`
- DMARC: `v=DMARC1; p=none;`

Authoritative DNS readback is preserved in `raw/authoritative-dns-readback.txt`.

## Exchange

- Accepted domain: PASS
- Accepted domain type: Authoritative
- Exchange Online: READY for accepted-domain authority
- DKIM config: CREATED
- DKIM enabled: NO
- DKIM status: `CnameMissing`
- Mailbox provisioning: HELD UNTIL DKIM SYNC PASSES
- Hybrid: NO EVIDENCE OF HYBRID CONFIGURATION IN THIS RUN

