# PUB-CANON: Author Identity and Public Attribution

Version: 1.0
Status: ACTIVE
Approval authority: Jackie Smith, Jr.
Effective date: 2026-08-13

## Purpose

This canon defines how J Merrill Publishing distinguishes legal/internal author identity from public-facing author attribution.

Legal identity and public identity are not interchangeable. Legal identity is preserved for contracting, tax, royalties, rights, accounting, internal relationship management, legal notices, and governed operational evidence. Public identity is the only identity that may be used on JMP-controlled public surfaces.

## Public Attribution Precedence

Public author identity must be resolved in this order:

1. Title-relationship pen name or title-specific public name.
2. Author-level governed pen name.
3. Anonymous publication, using the governed anonymous attribution.
4. Governed public author name.

If a pen name exists, the pen name is the author's public identity. The legal/internal name must not override it on public surfaces merely because it exists in Contact, agreement, royalty, Stripe, tax, accounting, rights, or internal evidence records.

## Attribution Modes

PUBLIC means the governed public author name may appear publicly.

PEN_NAME means a governed public identity exists, but it is not the legal/internal name. Public directory, profile, title attribution, metadata, marketing, and public APIs must use the pen name and only governed public biography/headshot data.

ANONYMOUS means personal author identity must not be publicly disclosed. The title may remain public using the governed anonymous attribution. Legal-name author directory entries, legal-name profiles, public biography, public headshot, and legal-name metadata must be suppressed.

HIDDEN means no public author profile/listing should be created for the governed relationship. HIDDEN is separate from PEN_NAME and ANONYMOUS.

## Title-Specific Authority

Title-specific attribution is allowed and takes precedence over author-level attribution. The same internal author may publish one title under a governed public name, another under a pen name, and another anonymously if each relationship has approved authority.

## Public Surfaces

The resolved public author identity governs JMP-controlled public surfaces, including author directory, author profile, title pages, catalog/search, homepage and marketing pages, title and author landing pages, public APIs/read models, SEO metadata, Open Graph, JSON-LD, sitemap entries, launch materials, press/media copy, and distributor metadata controlled by JMP.

Public readers must receive the resolved public author name or no public author profile, as governed. Public callers must not receive unnecessary internal legal-name fields.

## Internal Preservation

This canon does not delete, overwrite, or weaken internal legal identity. Legal/internal identity remains available where legitimately required for agreements, addenda, tax, Stripe Connect, royalties, accounting, rights, internal author relationships, internal communications, legal notices, governed evidence, and private distributor/account workflows.

## Runtime Enforcement

The canonical runtime resolver is:

`lib/catalog/public-author-identity.ts`

Public catalog and author surfaces must consume the resolved public identity from the public read-model boundary. Page components must not directly render Contact `fullname`, title legal-name fields, or internal legal identity in public output for pen-name, anonymous, or hidden relationships.

## Felix Catheline

Felix Catheline's legal/personal identity is preserved internally and must not appear as the public author identity. If a governed pen name is later approved for the title relationship, the pen name controls public attribution. Until then, The Paper Champ uses governed anonymous attribution.

## Revision History

| Version | Date | Notes |
|---|---|---|
| 1.0 | 2026-08-13 | Established canonical public attribution precedence and runtime enforcement after Felix public author privacy remediation. |
