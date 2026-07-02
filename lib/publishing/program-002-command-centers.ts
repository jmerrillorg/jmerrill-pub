export type CommandCenterTone = 'complete' | 'active' | 'pending' | 'blocked'

export type CommandCenterItem = {
  id: string
  label: string
  owner: string
  status: string
  tone: CommandCenterTone
  description: string
}

export type CommandCenterMilestone = {
  label: string
  status: string
  tone: CommandCenterTone
  description: string
}

export type PublishingCommandCenter = {
  opId: string
  eyebrow: string
  title: string
  description: string
  summary: Record<string, string>
  workflowTitle: string
  workflowNote: string
  workflow: CommandCenterMilestone[]
  checklist: CommandCenterItem[]
  statusTitle: string
  statusRows: readonly (readonly [string, string])[]
  evidenceRows: readonly (readonly [string, string])[]
  marketingRows: readonly (readonly [string, string])[]
  boundaries: readonly string[]
}

export const waveCommandCenters = {
  cover: {
    opId: 'OP-006',
    eyebrow: 'OP-006 Cover Design',
    title: 'Cover readiness with market fit and approval gates.',
    description:
      'Coordinate cover brief, market/category fit, concept review, final cover readiness, and publisher approval without sending design orders or submitting files to distribution.',
    summary: {
      commandCenter: 'OP-006 Cover Design',
      workflowState: 'Readiness tracking',
      systemOfRecord: 'Dataverse',
      fileLayer: 'SharePoint',
      liveDesignOrders: 'Not triggered by website',
      nextGate: 'Interior Layout Command Center',
    },
    workflowTitle: 'Cover design path.',
    workflowNote: 'Cover work stays gated until editorial and publisher approvals allow the design handoff.',
    workflow: [
      {
        label: 'Cover brief',
        status: 'Required',
        tone: 'active',
        description: 'Capture format, genre, audience, imprint, author notes, comparable covers, and positioning signal.',
      },
      {
        label: 'Market fit check',
        status: 'Tracked',
        tone: 'pending',
        description: 'Confirm category expectation, tone, prestige posture, accessibility, and retail thumbnail usability.',
      },
      {
        label: 'Concept review',
        status: 'Tracked',
        tone: 'pending',
        description: 'Track internal/publisher concept review and author-facing safe summary without exposing internal notes.',
      },
      {
        label: 'Final cover packet',
        status: 'Locked',
        tone: 'blocked',
        description: 'Spine, barcode, print specs, ebook cover, and production files stay locked until all dependencies pass.',
      },
      {
        label: 'Publisher approval',
        status: 'Required',
        tone: 'blocked',
        description: 'Publisher approval is required before OP-007/OP-008 can treat cover files as production-ready.',
      },
      {
        label: 'Interior handoff',
        status: 'Pending',
        tone: 'pending',
        description: 'Approved cover posture informs interior layout design system and launch asset readiness.',
      },
    ],
    checklist: [
      {
        id: 'cover-brief',
        label: 'Confirm cover brief',
        owner: 'Publishing Operations',
        status: 'Required',
        tone: 'active',
        description: 'Confirm imprint, format scope, audience, genre, visual expectations, author-provided assets, and SharePoint evidence location.',
      },
      {
        id: 'cover-validation',
        label: 'Apply BP-09 cover validation',
        owner: 'Publisher',
        status: 'Required',
        tone: 'blocked',
        description: 'Cover validation must pass before production readiness, distribution readiness, or launch readiness can advance.',
      },
      {
        id: 'cover-files',
        label: 'Track cover files',
        owner: 'Production',
        status: 'Tracked',
        tone: 'pending',
        description: 'Track front cover, full wrap, ebook cover, source files, proof image, barcode/spine dependencies, and final export readiness.',
      },
      {
        id: 'author-review',
        label: 'Track author cover review',
        owner: 'Author Relations',
        status: 'Tracked',
        tone: 'pending',
        description: 'Author-facing status may show review request or approval needed, but internal design notes and risk details remain hidden.',
      },
    ],
    statusTitle: 'Cover readiness is visible; production action remains gated.',
    statusRows: [
      ['BP-09 dependency', 'Cover validation must pass before release lock or distribution readiness'],
      ['Author Workspace', 'Shows safe cover stage/progress only after author-specific access is proven'],
      ['JM Signature', 'Publisher-only design governance overlay remains active'],
      ['Execution log', 'Cover stage transitions write safe evidence to jm1_executionlog where practical'],
    ],
    evidenceRows: [
      ['Dataverse', 'Cover status, approvals, blockers, and title relationship'],
      ['SharePoint', 'Cover brief, concept assets, proof exports, approval evidence'],
      ['Website', 'Read-only command-center surface; not source of truth'],
      ['External providers', 'No design order, vendor message, or distribution submission triggered'],
    ],
    marketingRows: [
      ['Marketing signal', 'Genre expectation, category fit, author platform posture, visual promise, and campaign usability'],
      ['Author-facing assets', 'Approved cover preview and safe review language only after access is authorized'],
      ['Internal assets', 'Launch thumbnails, media-kit cover image, retailer preview, and social crop readiness'],
      ['Success criteria', 'Cover supports audience promise and passes BP-09 without triggering live release activity'],
    ],
    boundaries: [
      'Does not place design orders or send vendor communications.',
      'Does not submit cover files to retailers, printers, or distributors.',
      'Does not expose source files or private design notes in the Author Workspace.',
      'Does not bypass BP-09 cover validation or publisher approval.',
      'Does not start layout, distribution, launch, royalties, payments, or Business Central postings.',
    ],
  },
  layout: {
    opId: 'OP-007',
    eyebrow: 'OP-007 Interior Layout',
    title: 'Interior layout readiness before production file handoff.',
    description:
      'Coordinate manuscript proofread completion, trim/interior specifications, layout proofs, correction tracking, and Stage 7b production proofread re-entry.',
    summary: {
      commandCenter: 'OP-007 Interior Layout',
      workflowState: 'Readiness tracking',
      systemOfRecord: 'Dataverse',
      fileLayer: 'SharePoint',
      liveProductionOrders: 'Not triggered by website',
      nextGate: 'Production Readiness / Distribution Gate',
    },
    workflowTitle: 'Interior layout path.',
    workflowNote: 'Stage 7a must complete before layout; Stage 7b re-enters editorial after production proof files exist.',
    workflow: [
      {
        label: 'Stage 7a proofread',
        status: 'Required',
        tone: 'active',
        description: 'Confirm manuscript proofread is complete before interior layout begins.',
      },
      {
        label: 'Interior specs',
        status: 'Tracked',
        tone: 'pending',
        description: 'Track trim size, format, paper/color posture, front/back matter, image/table needs, and accessibility notes.',
      },
      {
        label: 'Layout proof',
        status: 'Tracked',
        tone: 'pending',
        description: 'Track proof file generation, correction cycles, author review request, and safe status language.',
      },
      {
        label: 'Correction log',
        status: 'Tracked',
        tone: 'pending',
        description: 'Track requested corrections without exposing internal production notes broadly.',
      },
      {
        label: 'Stage 7b re-entry',
        status: 'Required',
        tone: 'blocked',
        description: 'Production proofread must re-enter editorial before final files move to OP-008.',
      },
      {
        label: 'Production handoff',
        status: 'Locked',
        tone: 'blocked',
        description: 'Final interior file handoff stays locked until proofread, approvals, and publisher gate pass.',
      },
    ],
    checklist: [
      {
        id: 'layout-specs',
        label: 'Confirm layout specifications',
        owner: 'Production',
        status: 'Required',
        tone: 'active',
        description: 'Confirm trim, format, interior color, image/table needs, accessibility considerations, and print/ebook requirements.',
      },
      {
        id: 'proof-cycle',
        label: 'Track proof cycle',
        owner: 'Author Relations',
        status: 'Tracked',
        tone: 'pending',
        description: 'Track proof sent, author response, requested changes, accepted corrections, and next required action.',
      },
      {
        id: 'production-proofread',
        label: 'Route Stage 7b production proofread',
        owner: 'Editorial',
        status: 'Required',
        tone: 'blocked',
        description: 'Stage 7b production proofread is mandatory after layout before production readiness can pass.',
      },
      {
        id: 'final-files',
        label: 'Prepare final interior files',
        owner: 'Production',
        status: 'Locked',
        tone: 'blocked',
        description: 'Final print PDF, ebook source, accessibility notes, and export evidence remain gated until approvals pass.',
      },
    ],
    statusTitle: 'Layout progress is visible; file movement remains gated.',
    statusRows: [
      ['Editorial dependency', 'Stage 7a precedes layout and Stage 7b follows layout proof'],
      ['Author Workspace', 'Shows current layout/proof action only after access is authorized'],
      ['Production readiness', 'Requires final files, correction closure, and publisher approval'],
      ['Execution log', 'Proof and approval transitions write safe evidence where practical'],
    ],
    evidenceRows: [
      ['Dataverse', 'Layout status, proof cycle, approvals, blockers, title relationship'],
      ['SharePoint', 'Layout proofs, correction logs, final file candidates, approval evidence'],
      ['Website', 'Read-only command-center surface; not source of truth'],
      ['External providers', 'No printer order, distribution upload, or public file submission triggered'],
    ],
    marketingRows: [
      ['Marketing signal', 'Interior quality posture, sample-page suitability, reader experience, and premium cues'],
      ['Author-facing assets', 'Approved proof review language and safe progress only'],
      ['Internal assets', 'Sample spread readiness and media-kit excerpt suitability'],
      ['Success criteria', 'Interior file candidate supports production readiness without bypassing proof gates'],
    ],
    boundaries: [
      'Does not submit print or ebook files to production providers.',
      'Does not expose private files without author-specific authorization.',
      'Does not bypass Stage 7b production proofread.',
      'Does not start distribution, launch, royalties, payments, or Business Central postings.',
      'Does not send author communications from the website surface.',
    ],
  },
  production: {
    opId: 'OP-008',
    eyebrow: 'OP-008 Production Readiness',
    title: 'Production readiness and distribution gate before files move outward.',
    description:
      'Confirm final metadata, files, disclosures, cover validation, release lock, and publisher approval before any distribution or public release action can proceed.',
    summary: {
      commandCenter: 'OP-008 Production Readiness / Distribution Gate',
      workflowState: 'Gate orchestration',
      systemOfRecord: 'Dataverse',
      evidenceLayer: 'SharePoint',
      liveDistribution: 'Not triggered by website',
      nextGate: 'Distribution Command Center',
    },
    workflowTitle: 'Production gate path.',
    workflowNote: 'OP-008 is a hard gate: it can certify readiness, but it cannot submit or publish a title.',
    workflow: [
      {
        label: 'Final metadata',
        status: 'Required',
        tone: 'active',
        description: 'Confirm title metadata, categories, imprint, contributors, description posture, keywords, and format alignment.',
      },
      {
        label: 'Final files',
        status: 'Required',
        tone: 'active',
        description: 'Confirm final cover, interior, ebook, proof evidence, and approved file locations.',
      },
      {
        label: 'BP-06 AI disclosure',
        status: 'Required if applicable',
        tone: 'pending',
        description: 'AI disclosure must pass or be marked not applicable before readiness can pass.',
      },
      {
        label: 'BP-09 cover validation',
        status: 'Required',
        tone: 'blocked',
        description: 'Cover validation must pass before release lock or distribution readiness advances.',
      },
      {
        label: 'BP-10 release lock',
        status: 'Required',
        tone: 'blocked',
        description: 'Release lock must pass and cannot be bypassed by OP-008.',
      },
      {
        label: 'Publisher approval',
        status: 'Required',
        tone: 'blocked',
        description: 'Final publisher approval is mandatory before OP-009 distribution work proceeds.',
      },
    ],
    checklist: [
      {
        id: 'metadata-final',
        label: 'Confirm final metadata packet',
        owner: 'Publishing Operations',
        status: 'Required',
        tone: 'active',
        description: 'Confirm metadata is final enough for distribution preparation without announcing or submitting a public release.',
      },
      {
        id: 'file-final',
        label: 'Confirm final file readiness',
        owner: 'Production',
        status: 'Required',
        tone: 'active',
        description: 'Confirm final file candidates, proof evidence, naming, storage, and format readiness.',
      },
      {
        id: 'gate-stack',
        label: 'Validate BP-06 / BP-09 / BP-10 gates',
        owner: 'Publisher',
        status: 'Required',
        tone: 'blocked',
        description: 'AI disclosure, cover validation, and release lock readiness must be documented before distribution readiness can pass.',
      },
      {
        id: 'distribution-release',
        label: 'Release distribution handoff',
        owner: 'Publisher',
        status: 'Locked',
        tone: 'blocked',
        description: 'Distribution handoff remains locked until all readiness evidence and publisher approval are complete.',
      },
    ],
    statusTitle: 'Readiness can pass only when every gate is satisfied.',
    statusRows: [
      ['Release lock', 'BP-10 must pass before OP-009 can proceed'],
      ['Distribution readiness', 'Prepares handoff only; no retailer or printer submission'],
      ['Author Workspace', 'Shows safe production status only after access is authorized'],
      ['Execution log', 'Gate outcomes write safe evidence where practical'],
    ],
    evidenceRows: [
      ['Dataverse', 'Production readiness status, gate results, approvals, blockers'],
      ['SharePoint', 'Final metadata packet, proof evidence, file evidence, approval artifacts'],
      ['Website', 'Read-only command-center surface; not source of truth'],
      ['External channels', 'No upload, submission, release date, or public action triggered'],
    ],
    marketingRows: [
      ['Marketing signal', 'Metadata confidence, positioning consistency, launch asset readiness, and release-risk posture'],
      ['Author-facing assets', 'Safe readiness status only, not release announcement language'],
      ['Internal assets', 'Final metadata and file confidence signals for launch planning'],
      ['Success criteria', 'Distribution can be prepared without accidentally publishing or announcing release'],
    ],
    boundaries: [
      'Does not submit files to retailers, printers, aggregators, or distributors.',
      'Does not set or announce a public release date.',
      'Does not bypass BP-06, BP-09, BP-10, or publisher approval.',
      'Does not start launch, royalties, payments, author payments, or Business Central postings.',
      'Does not expose final private files without author-specific authorization.',
    ],
  },
  distribution: {
    opId: 'OP-009',
    eyebrow: 'OP-009 Distribution',
    title: 'Distribution readiness before any retailer submission.',
    description:
      'Track channel readiness, metadata, ISBN/category posture, format files, bookstore/library readiness, and publisher approval without performing live submissions.',
    summary: {
      commandCenter: 'OP-009 Distribution',
      workflowState: 'Readiness tracking',
      systemOfRecord: 'Dataverse',
      evidenceLayer: 'SharePoint',
      liveSubmissions: 'Not triggered by website',
      nextGate: 'Marketing Command Center',
    },
    workflowTitle: 'Distribution preparation path.',
    workflowNote: 'Distribution can become ready only after OP-008 passes; this route does not publish or submit.',
    workflow: [
      {
        label: 'Channel scope',
        status: 'Required',
        tone: 'active',
        description: 'Confirm intended channels, formats, territorial posture, and distribution constraints.',
      },
      {
        label: 'Metadata readiness',
        status: 'Required',
        tone: 'active',
        description: 'Confirm description, keywords, BISAC/categories, contributors, pricing posture, and title metadata.',
      },
      {
        label: 'File readiness',
        status: 'Required',
        tone: 'pending',
        description: 'Confirm cover/interior/ebook files and distributor-specific readiness evidence.',
      },
      {
        label: 'Retail/library posture',
        status: 'Tracked',
        tone: 'pending',
        description: 'Track bookstore, library, wholesale, and discoverability readiness.',
      },
      {
        label: 'Submission approval',
        status: 'Locked',
        tone: 'blocked',
        description: 'Publisher approval is required before any live retailer or distribution submission.',
      },
      {
        label: 'Launch handoff',
        status: 'Pending',
        tone: 'pending',
        description: 'Distribution readiness feeds launch/marketing planning without public activation.',
      },
    ],
    checklist: [
      {
        id: 'channel-readiness',
        label: 'Confirm distribution channel readiness',
        owner: 'Publishing Operations',
        status: 'Required',
        tone: 'active',
        description: 'Track channel list, format scope, ISBN association, metadata state, and channel-specific blockers.',
      },
      {
        id: 'retail-metadata',
        label: 'Confirm retail metadata packet',
        owner: 'Publishing Operations',
        status: 'Required',
        tone: 'active',
        description: 'Confirm title description, keywords, categories, contributor data, format details, and release posture.',
      },
      {
        id: 'distribution-files',
        label: 'Track distribution file candidates',
        owner: 'Production',
        status: 'Tracked',
        tone: 'pending',
        description: 'Track approved cover/interior/ebook files and required evidence without initiating upload.',
      },
      {
        id: 'publisher-submit',
        label: 'Authorize live distribution submission',
        owner: 'Publisher',
        status: 'Locked',
        tone: 'blocked',
        description: 'Live submission remains separate from readiness and requires explicit publisher authorization.',
      },
    ],
    statusTitle: 'Channel readiness is visible; submission remains locked.',
    statusRows: [
      ['Retailer submission', 'Not triggered by OP-009 website surface'],
      ['Release date', 'No public release date is set or announced'],
      ['Library/bookstore', 'Tracked as readiness posture only'],
      ['Execution log', 'Readiness and approval transitions write safe evidence where practical'],
    ],
    evidenceRows: [
      ['Dataverse', 'Distribution readiness, channel status, blockers, approvals'],
      ['SharePoint', 'Metadata packet, channel checklist, file evidence, approval artifacts'],
      ['Website', 'Read-only command-center surface; not source of truth'],
      ['External channels', 'No retailer, distributor, printer, or public catalog action triggered'],
    ],
    marketingRows: [
      ['Marketing signal', 'Metadata posture, category/keyword strength, retailer readiness, library/bookstore posture'],
      ['Author-facing assets', 'Safe distribution progress only, not public retailer links unless approved/live'],
      ['Internal assets', 'Retail metadata, pitch posture, category opportunities, and launch blockers'],
      ['Success criteria', 'Channels are ready for controlled submission without public release leakage'],
    ],
    boundaries: [
      'Does not upload files to retailers, distributors, printers, or aggregators.',
      'Does not publish, submit, price, or announce a title.',
      'Does not create royalty setup or author payment activity.',
      'Does not use QBO or create Business Central postings.',
      'Does not expose private distribution files without author-specific authorization.',
    ],
  },
  marketing: {
    opId: 'OP-010',
    eyebrow: 'OP-010 Marketing',
    title: 'Marketing readiness without public campaign activation.',
    description:
      'Coordinate positioning, launch kit, audience, review/award/media readiness, campaign calendar, author platform, and performance-readiness evidence while public execution remains gated.',
    summary: {
      commandCenter: 'OP-010 Marketing',
      workflowState: 'Readiness tracking',
      systemOfRecord: 'Dataverse',
      assetLayer: 'SharePoint',
      publicCampaigns: 'Not triggered by website',
      nextGate: 'Royalty / Relationship / Author Success',
    },
    workflowTitle: 'Marketing readiness path.',
    workflowNote: 'Marketing is a Publishing-owned capability with Enterprise Marketing support; no autonomous public activation occurs.',
    workflow: [
      {
        label: 'Positioning',
        status: 'Required',
        tone: 'active',
        description: 'Confirm reader promise, audience, comparable titles, category posture, and author platform signal.',
      },
      {
        label: 'Launch kit',
        status: 'Tracked',
        tone: 'pending',
        description: 'Track approved cover image, description, author bio, media kit, talking points, and visual assets.',
      },
      {
        label: 'Review strategy',
        status: 'Tracked',
        tone: 'pending',
        description: 'Track ARC/review posture, awards, endorsements, media opportunities, and outreach candidates.',
      },
      {
        label: 'Campaign calendar',
        status: 'Tracked',
        tone: 'pending',
        description: 'Track launch schedule, milestones, internal assignments, and approval gates without sending campaigns.',
      },
      {
        label: 'Public activation',
        status: 'Locked',
        tone: 'blocked',
        description: 'Public posts, ads, emails, reader communications, and campaign automations require explicit approval.',
      },
      {
        label: 'Author success handoff',
        status: 'Pending',
        tone: 'pending',
        description: 'Marketing performance and relationship opportunities hand off to OP-011 after launch readiness.',
      },
    ],
    checklist: [
      {
        id: 'positioning',
        label: 'Confirm book positioning',
        owner: 'Publishing Marketing',
        status: 'Required',
        tone: 'active',
        description: 'Confirm audience, reader promise, comparable titles, category posture, and campaign theme.',
      },
      {
        id: 'asset-kit',
        label: 'Prepare launch asset kit',
        owner: 'Publishing Marketing',
        status: 'Tracked',
        tone: 'pending',
        description: 'Track media kit, cover image, author bio, book description, social assets, press notes, and approved copy.',
      },
      {
        id: 'reviews-awards',
        label: 'Track reviews, awards, and outreach',
        owner: 'Publishing Marketing',
        status: 'Tracked',
        tone: 'pending',
        description: 'Track ARC/review plan, awards calendar, bookseller/library/media outreach, and relationship notes.',
      },
      {
        id: 'campaign-activation',
        label: 'Authorize campaign activation',
        owner: 'Publisher',
        status: 'Locked',
        tone: 'blocked',
        description: 'No public campaign, ad, email, social post, or marketing agent action runs without explicit approval.',
      },
    ],
    statusTitle: 'Marketing readiness is active; public execution is gated.',
    statusRows: [
      ['Mission ownership', 'Publishing owns book launch strategy; Enterprise Marketing enables shared standards/tools'],
      ['Public activity', 'No posts, emails, ads, or reader-facing campaigns triggered'],
      ['Author Workspace', 'Shows approved marketing milestones only after access is authorized'],
      ['Execution log', 'Readiness and approval transitions write safe evidence where practical'],
    ],
    evidenceRows: [
      ['Dataverse', 'Marketing readiness, campaign status, approvals, blockers'],
      ['SharePoint', 'Marketing kit, campaign calendar, media assets, approval evidence'],
      ['Website', 'Read-only command-center surface; not source of truth'],
      ['External channels', 'No social, email, ads, ARC, or public campaign action triggered'],
    ],
    marketingRows: [
      ['Marketing signal', 'This is the canonical Publishing Marketing readiness surface for the title'],
      ['Author-facing assets', 'Only approved campaign milestones/assets after author-specific authorization'],
      ['Internal assets', 'Launch kit, review plan, award tracker, outreach map, campaign calendar'],
      ['Success criteria', 'Campaign can be activated later by approval without accidental public execution now'],
    ],
    boundaries: [
      'Does not send launch emails, public marketing emails, social posts, ads, or press pitches.',
      'Does not activate autonomous marketing agents publicly.',
      'Does not expose private campaign notes or author data without authorization.',
      'Does not start royalties, author payments, Business Central postings, or live Stripe processing.',
      'Does not treat Enterprise Marketing as owner of Publishing campaign strategy.',
    ],
  },
  authorSuccess: {
    opId: 'OP-011',
    eyebrow: 'OP-011 Author Success',
    title: 'Royalty, relationship, and author success readiness.',
    description:
      'Provide post-release relationship visibility, royalty-readiness status, support cadence, annual review posture, and future-title opportunity tracking without generating statements or payments.',
    summary: {
      commandCenter: 'OP-011 Royalty / Relationship / Author Success',
      workflowState: 'Readiness tracking',
      systemOfRecord: 'Dataverse',
      evidenceLayer: 'SharePoint',
      paymentMovement: 'Not triggered by website',
      nextGate: 'Post-release operations when separately authorized',
    },
    workflowTitle: 'Author success path.',
    workflowNote: 'OP-011 is visibility and relationship readiness; live royalty/payment execution remains separately gated.',
    workflow: [
      {
        label: 'Relationship status',
        status: 'Tracked',
        tone: 'active',
        description: 'Track active author relationship, support cadence, title family, and relationship risks.',
      },
      {
        label: 'Royalty readiness',
        status: 'Tracked only',
        tone: 'pending',
        description: 'Track royalty setup status and statement-readiness posture without calculating or sending live statements.',
      },
      {
        label: 'Support cadence',
        status: 'Tracked',
        tone: 'pending',
        description: 'Track author success touchpoints, issue handling, and management-by-exception needs.',
      },
      {
        label: 'Annual review',
        status: 'Future gate',
        tone: 'pending',
        description: 'Track annual review readiness without starting BP-14/BP-15/J8 post-release automation.',
      },
      {
        label: 'Future title opportunity',
        status: 'Tracked',
        tone: 'pending',
        description: 'Track backlist optimization and future-title opportunity as relationship intelligence only.',
      },
      {
        label: 'Royalty/payment execution',
        status: 'Locked',
        tone: 'blocked',
        description: 'Statements, payouts, author payments, tax/accounting, and postings remain locked until separately authorized.',
      },
    ],
    checklist: [
      {
        id: 'relationship-health',
        label: 'Track relationship health',
        owner: 'Author Success',
        status: 'Tracked',
        tone: 'active',
        description: 'Track support posture, author risk, follow-up needs, active titles, and relationship state.',
      },
      {
        id: 'royalty-readiness',
        label: 'Track royalty readiness',
        owner: 'Publishing Operations',
        status: 'Tracked only',
        tone: 'pending',
        description: 'Track setup completeness, statement readiness, and required evidence without generating live royalty outputs.',
      },
      {
        id: 'catalog-health',
        label: 'Track catalog health',
        owner: 'Publishing Marketing',
        status: 'Tracked',
        tone: 'pending',
        description: 'Track review status, catalog updates, performance notes, backlist opportunities, and future campaign ideas.',
      },
      {
        id: 'payment-authorization',
        label: 'Keep payments locked',
        owner: 'Publisher',
        status: 'Locked',
        tone: 'blocked',
        description: 'Royalty payments, author payments, Business Central postings, and Stripe payouts are not authorized here.',
      },
    ],
    statusTitle: 'Relationship visibility is active; money movement is locked.',
    statusRows: [
      ['Royalty statements', 'No live statement generation or author-facing royalty output'],
      ['Payments', 'No author payment, Stripe payout, or Business Central posting'],
      ['Author Workspace', 'Shows only approved relationship/status information after access authorization'],
      ['Execution log', 'Relationship and readiness transitions write safe evidence where practical'],
    ],
    evidenceRows: [
      ['Dataverse', 'Author relationship status, title links, readiness flags, blockers, approvals'],
      ['SharePoint', 'Support evidence, catalog health notes, review artifacts, approved summaries'],
      ['Website', 'Read-only command-center surface; not source of truth'],
      ['Financial systems', 'No QBO, Stripe payout, Business Central posting, or live royalty action triggered'],
    ],
    marketingRows: [
      ['Marketing signal', 'Review tracking, long-tail optimization, author relationship opportunities, and future-title signals'],
      ['Author-facing assets', 'Approved relationship/status summaries only after access authorization'],
      ['Internal assets', 'Catalog health, annual review notes, support posture, future-title opportunities'],
      ['Success criteria', 'Author success team has visibility without causing financial or post-release automation'],
    ],
    boundaries: [
      'Does not calculate, generate, send, or pay royalties.',
      'Does not create author payments, Stripe payouts, invoices, tax records, or Business Central postings.',
      'Does not start BP-14/BP-15/J8 annual review or loyalty progression automation.',
      'Does not expose private financial, royalty, or support data without authorization.',
      'Does not use QBO for any new billing, tax, package, payment, or royalty logic.',
    ],
  },
} as const satisfies Record<string, PublishingCommandCenter>
