export type BookRetailerEnrichment = {
  retailerMatchStatus?: 'verified' | 'manual_review' | 'fallback_only'
  amazonLinkType?: 'search_fallback' | 'verified_pdp'
  asin?: string
  subtitle?: string
  retailerTitle?: string
  releaseDate?: string
  retailerDescription?: string
  retailerAuthorBio?: string
  retailerCoverUrl?: string
  retailerLastVerifiedAt?: string
}

export const bookRetailerEnrichmentOverrides: Record<string, BookRetailerEnrichment> = {
  '27-days-to-overcoming-depression': {
    retailerMatchStatus: 'verified',
    amazonLinkType: 'search_fallback',
    subtitle: 'Debunking All the Lies',
    retailerTitle: '27 Days to Overcoming Depression: Debunking All the Lies',
    releaseDate: '2025-02-01',
    retailerLastVerifiedAt: '2026-04-19',
  },
  '365-days-of-transparency': {
    retailerMatchStatus: 'verified',
    amazonLinkType: 'search_fallback',
    releaseDate: '2021-03-08',
    retailerCoverUrl: 'https://images-us.bookshop.org/ingram/9781950719921.jpg?v=enc-v1',
    retailerDescription:
      'A year-long devotional and reflection collection that encourages transparency, faith, personal accountability, and resilience through daily inspiration grounded in spiritual growth and honest self-examination.',
    retailerLastVerifiedAt: '2026-04-19',
  },
  '7-step-jumpstart-to-becoming-your-best-self': {
    retailerMatchStatus: 'verified',
    amazonLinkType: 'search_fallback',
    releaseDate: '2023-04-01',
    retailerCoverUrl: 'https://images-us.bookshop.org/ingram/9781954414747.jpg?v=enc-v1',
    retailerDescription:
      'Ericka Johnson Settles offers a concise personal-growth guide built around truth, transparency, intentionality, and practical next steps meant to help readers reset habits, examine themselves honestly, and move toward healthier change.',
    retailerLastVerifiedAt: '2026-04-19',
  },
  'a-principal-s-tale': {
    retailerMatchStatus: 'verified',
    amazonLinkType: 'search_fallback',
    subtitle: 'A Self-Determined Leader',
    retailerTitle: "A Principal's Tale: A Self-Determined Leader",
    releaseDate: '2021-02-14',
    retailerCoverUrl: 'https://covers3.booksamillion.com/covers/bam/1/95/071/966/1950719669_b.jpg',
    retailerDescription:
      'Shelley McIntosh shares an education memoir and leadership study rooted in urban school administration, using lived experience and self-determination theory to reflect on autonomy, competence, relatedness, and principal leadership in underserved communities.',
    retailerLastVerifiedAt: '2026-04-19',
  },
  'a-blended-family': {
    retailerMatchStatus: 'verified',
    retailerCoverUrl: 'https://images-us.bookshop.org/ingram/9781954414129.jpg?v=enc-v1',
    retailerLastVerifiedAt: '2026-04-19',
  },
  'according-to-mark': {
    retailerMatchStatus: 'verified',
    amazonLinkType: 'search_fallback',
    subtitle: 'The Gospel of Jesus Christ Begins',
    retailerTitle: 'According to Mark: The Gospel of Jesus Christ Begins',
    releaseDate: '2022-09-16',
    retailerCoverUrl: 'https://images-us.bookshop.org/ingram/9781954414549.jpg?v=enc-v1',
    retailerDescription:
      'Alice V. Pryor presents a compact testimony-driven reflection on the Gospel of Mark, inviting readers to return to the beginning of the good news through personal witness, repentance, and foundational Christian teaching.',
    retailerLastVerifiedAt: '2026-04-19',
  },
  'almost-happy': {
    retailerMatchStatus: 'verified',
    amazonLinkType: 'search_fallback',
    subtitle: 'The Chronicles of Tabby',
    retailerTitle: 'Almost Happy: The Chronicles of Tabby',
    releaseDate: '2023-05-15',
    retailerCoverUrl: 'https://images-us.bookshop.org/ingram/9781954414587.jpg?v=enc-v1',
    retailerDescription:
      'Jaylonna Stevette delivers an urban relationship novel that follows Tabby through romance, desire, conflict, and self-reckoning as she confronts the difference between chasing love and learning what real happiness requires.',
    retailerLastVerifiedAt: '2026-04-19',
  },
  'biblical-prescriptions-for-life-s-troubles': {
    retailerMatchStatus: 'verified',
    amazonLinkType: 'search_fallback',
    releaseDate: '2023-08-01',
    retailerDescription:
      'Terry Stephens frames Scripture as a guide for confronting internal conflict, people trouble, and spiritual resistance, offering a faith-centered path toward peace, discernment, forgiveness, and resilient Christian living.',
    retailerLastVerifiedAt: '2026-04-19',
  },
  bodacious: {
    retailerMatchStatus: 'verified',
    retailerCoverUrl: 'https://images-us.bookshop.org/ingram/9781954414044.jpg?v=enc-v1',
    retailerLastVerifiedAt: '2026-04-19',
  },
  'conquer-your-fears-and-win': {
    retailerMatchStatus: 'verified',
    retailerCoverUrl: 'https://images-us.bookshop.org/ingram/9781950719464.jpg?v=enc-v1',
    retailerLastVerifiedAt: '2026-04-19',
  },
  'delicious-ideas': {
    retailerMatchStatus: 'verified',
    amazonLinkType: 'search_fallback',
    subtitle: 'The Legacy Cookbook',
    retailerTitle: 'Delicious Ideas!: The Legacy Cookbook',
    releaseDate: '2025-02-01',
    retailerDescription:
      'A community-centered cookbook that gathers generations of Agape International Cathedral recipes, with updated guidance, substitutions, and practical cooking notes for everyday meals and gatherings.',
    retailerLastVerifiedAt: '2026-04-19',
  },
  'department-of-the-air-force-mission-driven-leadership': {
    retailerMatchStatus: 'verified',
    amazonLinkType: 'search_fallback',
    releaseDate: '2026-04-15',
    retailerCoverUrl: 'https://images-us.bookshop.org/ingram/9781961475687.jpg?v=enc-v1',
    retailerLastVerifiedAt: '2026-04-19',
  },
  'discipline-and-direction': {
    retailerMatchStatus: 'verified',
    amazonLinkType: 'search_fallback',
    subtitle: "God's Leadership Style",
    retailerTitle: "Discipline and Direction: God's Leadership Style",
    releaseDate: '2023-12-01',
    retailerCoverUrl: 'https://images-us.bookshop.org/ingram/9781954414914.jpg?v=enc-v1',
    retailerDescription:
      'Terry Stephens explores discipline, accountability, and Christian leadership with a practical framework for shaping healthier families, ministries, schools, and communities through spiritually grounded direction.',
    retailerLastVerifiedAt: '2026-04-19',
  },
  'divinely-inspired': {
    retailerMatchStatus: 'verified',
    amazonLinkType: 'search_fallback',
    subtitle: 'Trauma Triumphed',
    retailerTitle: 'Divinely Inspired: Trauma Triumphed',
    releaseDate: '2024-09-01',
    retailerCoverUrl: 'https://images-us.bookshop.org/ingram/9781961475175.jpg?v=enc-v1',
    retailerDescription:
      'An inspirational, faith-centered work that reflects on healing, spiritual resilience, and personal renewal after trauma through devotional and poetic writing.',
    retailerAuthorBio:
      'Regina Scales is a faith-driven writer, mother, and grandmother whose work draws on worship, family, and lived spiritual experience to encourage readers toward healing and hope.',
    retailerLastVerifiedAt: '2026-04-19',
  },
  'establishing-glory': {
    retailerMatchStatus: 'verified',
    amazonLinkType: 'search_fallback',
    subtitle: 'The Praise and Worship Handbook (2nd Edition)',
    retailerTitle: 'Establishing Glory: The Praise and Worship Handbook (2nd Edition)',
    releaseDate: '2019-04-03',
    retailerDescription:
      'Jackie Smith, Jr. explores how praise and worship leaders can move beyond routine church activity into a deeper, more consistent pursuit of God’s presence and transformative glory.',
    retailerLastVerifiedAt: '2026-04-19',
  },
  'establishing-glory-2': {
    retailerMatchStatus: 'verified',
    amazonLinkType: 'search_fallback',
    subtitle: 'The Relationship Handbook (2nd Edition)',
    retailerTitle: 'Establishing Glory 2: The Relationship Handbook (2nd Edition)',
    releaseDate: '2019-04-14',
    retailerDescription:
      'A Christian relationship guide that walks readers through singleness, dating, marriage, and relational self-awareness with direct reflections from a male perspective.',
    retailerLastVerifiedAt: '2026-04-19',
  },
  'establishing-glory-3': {
    retailerMatchStatus: 'verified',
    amazonLinkType: 'search_fallback',
    subtitle: 'The Marriage Handbook',
    retailerTitle: 'Establishing Glory 3: The Marriage Handbook',
    releaseDate: '2019-11-11',
    retailerDescription:
      'A practical marriage-focused follow-up in the Establishing Glory series that examines covenant, vows, and the real challenges of sustaining a healthy, God-centered union.',
    retailerLastVerifiedAt: '2026-04-19',
  },
  'god-s-nudge': {
    retailerMatchStatus: 'verified',
    amazonLinkType: 'search_fallback',
    retailerCoverUrl: 'https://images-us.bookshop.org/ingram/9781950719884.jpg?v=enc-v1',
    retailerDescription:
      'Tekisha Wimbush reflects on how believers can recognize and respond to God’s quiet guidance, offering encouragement shaped by pandemic-era uncertainty, scriptural reflection, and a call to remain led, comforted, and spiritually alert.',
    retailerLastVerifiedAt: '2026-04-19',
  },
  'getting-back-2-happy': {
    retailerMatchStatus: 'verified',
    amazonLinkType: 'search_fallback',
    subtitle: 'The Chronicles of Tabby',
    retailerTitle: 'Getting Back 2 Happy: The Chronicles of Tabby',
    releaseDate: '2020-08-15',
    retailerCoverUrl: 'https://images-us.bookshop.org/ingram/9781950719426.jpg?v=enc-v1',
    retailerDescription:
      'Jaylonna Stevette follows Tabby Taylor through unraveling relationships, identity shocks, and emotional reckoning as she fights her way back to self-worth, desire, and a more honest definition of happiness.',
    retailerAuthorBio:
      'Jaylonna Stevette is a writer, speaker, entrepreneur, and mentor whose work spans fiction, self-help, and testimony, often drawing on lived experience, emotional healing, and women’s empowerment.',
    retailerLastVerifiedAt: '2026-04-19',
  },
  'help-god-i-am-afraid': {
    retailerMatchStatus: 'verified',
    amazonLinkType: 'search_fallback',
    releaseDate: '2019-12-01',
    retailerCoverUrl: 'https://images-us.bookshop.org/ingram/9781950719167.jpg?v=enc-v1',
    retailerDescription:
      'Cheryl Travis opens the Help God series by confronting fear as a spiritual and emotional obstacle, encouraging readers to recognize how fear manipulates thought, blocks motivation, and can be overcome through faith-driven clarity and purpose.',
    retailerLastVerifiedAt: '2026-04-19',
  },
  'help-god-i-am-angry': {
    retailerMatchStatus: 'verified',
    amazonLinkType: 'search_fallback',
    releaseDate: '2020-02-23',
    retailerCoverUrl: 'https://images-us.bookshop.org/ingram/9781950719242.jpg?v=enc-v1',
    retailerDescription:
      'Cheryl Travis examines anger as a powerful emotion that can damage relationships and stunt growth, offering a short, practical guide to naming its roots, uncovering unhealthy patterns, and moving toward spiritual and emotional control.',
    retailerLastVerifiedAt: '2026-04-19',
  },
  'help-god-i-am-confused': {
    retailerMatchStatus: 'verified',
    amazonLinkType: 'search_fallback',
    releaseDate: '2021-05-01',
    retailerDescription:
      'Cheryl Travis addresses confusion as a disabling emotional state that clouds focus and direction, giving readers a concise guide to regaining peace, steadiness, and forward movement when life feels disordered.',
    retailerLastVerifiedAt: '2026-04-19',
  },
  'help-god-i-am-hurt': {
    retailerMatchStatus: 'verified',
    amazonLinkType: 'search_fallback',
    releaseDate: '2020-05-01',
    retailerCoverUrl: 'https://images-us.bookshop.org/ingram/9781950719303.jpg?v=enc-v1',
    retailerDescription:
      'Cheryl Travis explores the emotional and spiritual impact of hurt, helping readers identify hidden wounds, bitterness, and low self-worth so they can begin resolving pain and turning it into renewed strength.',
    retailerLastVerifiedAt: '2026-04-19',
  },
  'help-god-i-am-lonely': {
    retailerMatchStatus: 'verified',
    amazonLinkType: 'search_fallback',
    releaseDate: '2021-07-01',
    retailerCoverUrl: 'https://images-us.bookshop.org/ingram/9781950719822.jpg?v=enc-v1',
    retailerDescription:
      'Cheryl Travis writes about loneliness as more than isolation, tracing how rejection, sadness, and disconnection can stall a person’s life and inviting readers toward healthier relationships and restored personal worth.',
    retailerLastVerifiedAt: '2026-04-19',
  },
  'help-god-i-am-lost': {
    retailerMatchStatus: 'verified',
    amazonLinkType: 'search_fallback',
    releaseDate: '2021-01-01',
    retailerCoverUrl: 'https://dynamic.indigoimages.ca/v1/books/books/1950719707/1.jpg?maxHeight=810&quality=85&width=810',
    retailerDescription:
      'Cheryl Travis speaks to the overwhelming feeling of being lost, unpacking anxiety, fear, and confusion while guiding readers toward clarity, renewed direction, and a stronger sense of God-given purpose.',
    retailerLastVerifiedAt: '2026-04-19',
  },
  'help-god-i-am-sad': {
    retailerMatchStatus: 'verified',
    amazonLinkType: 'search_fallback',
    releaseDate: '2021-03-01',
    retailerCoverUrl: 'https://images-us.bookshop.org/ingram/9781950719761.jpg?v=enc-v1',
    retailerDescription:
      'Cheryl Travis treats sadness as an emotional signal that should be acknowledged rather than ignored, equipping readers with simple tools for recognizing its weight and moving toward emotional resilience and hope.',
    retailerLastVerifiedAt: '2026-04-19',
  },
  'help-god-i-am-the-collection': {
    retailerMatchStatus: 'verified',
    amazonLinkType: 'search_fallback',
    releaseDate: '2022-09-01',
    retailerCoverUrl: 'https://images-us.bookshop.org/ingram/9781954414358.jpg?v=enc-v1',
    retailerDescription:
      'Cheryl Travis gathers the seven-volume Help God series into one collection focused on emotional management, spiritual clarity, and healing through scripture, testimony, and practical encouragement for fear, anger, hurt, loss, confusion, sadness, and loneliness.',
    retailerLastVerifiedAt: '2026-04-19',
  },
  'hodge-podge-of-life': {
    retailerMatchStatus: 'verified',
    amazonLinkType: 'search_fallback',
    releaseDate: '2023-11-01',
    retailerCoverUrl: 'https://images-us.bookshop.org/ingram/9781954414938.jpg?v=enc-v1',
    retailerDescription:
      'Mildred Beard recounts a life shaped by faith, community, work, healing, and service, offering a memoir that moves from humble beginnings toward spiritual growth, resilience, and lasting impact.',
    retailerLastVerifiedAt: '2026-04-19',
  },
  'focus-trust-and-follow': {
    retailerMatchStatus: 'verified',
    retailerCoverUrl: 'https://images-us.bookshop.org/ingram/9781950719501.jpg?v=enc-v1',
    retailerLastVerifiedAt: '2026-04-19',
  },
  'grandmothers-educating-minds': {
    retailerMatchStatus: 'verified',
    retailerCoverUrl: 'https://images-us.bookshop.org/ingram/9781954414211.jpg?v=enc-v1',
    retailerLastVerifiedAt: '2026-04-19',
  },
  'hop-hop-hop': {
    retailerMatchStatus: 'verified',
    retailerCoverUrl: 'https://images-us.bookshop.org/ingram/9781954414105.jpg?v=enc-v1',
    retailerLastVerifiedAt: '2026-04-19',
  },
  'jalen-becomes-a-big-brother': {
    retailerMatchStatus: 'verified',
    amazonLinkType: 'search_fallback',
    releaseDate: '2025-07-15',
    retailerCoverUrl: 'https://images-us.bookshop.org/ingram/9781961475403.jpg?v=enc-v1',
    retailerDescription:
      'A reassuring picture book about a little boy learning how to welcome a new sibling, designed to help children process changing emotions, family routines, and the joys of becoming a big brother.',
    retailerLastVerifiedAt: '2026-04-19',
  },
  'kingdom-equipment-101': {
    retailerMatchStatus: 'verified',
    amazonLinkType: 'search_fallback',
    subtitle: 'Tools for Kingdom Purpose',
    retailerTitle: 'Kingdom Equipment 101: Tools for Kingdom Purpose',
    retailerCoverUrl: 'https://images-us.bookshop.org/ingram/9781954414778.jpg?v=enc-v1',
    retailerDescription:
      'Terry Stephens presents a practical kingdom leadership manual for ministry, marketplace, and mentoring contexts, combining biblical principles, activations, and applied strategy to help readers discover calling and lead with maturity.',
    retailerLastVerifiedAt: '2026-04-19',
  },
  'lady-daphanny-s-altar': {
    retailerMatchStatus: 'verified',
    amazonLinkType: 'search_fallback',
    subtitle: 'My prayer for you today is...',
    retailerTitle: "Lady Daphanny's Altar: My prayer for you today is...",
    releaseDate: '2024-03-08',
    retailerCoverUrl: 'https://images-us.bookshop.org/ingram/9781961475090.jpg?v=enc-v1',
    retailerLastVerifiedAt: '2026-04-19',
  },
  'let-me-tell-you-about-it': {
    retailerMatchStatus: 'verified',
    amazonLinkType: 'search_fallback',
    retailerCoverUrl: 'https://images-us.bookshop.org/ingram/9781954414983.jpg?v=enc-v1',
    retailerDescription:
      'Edited by Lisa Clark, this youth-centered collection brings together short stories, poems, and reflections from eighth-grade students in Chillicothe, Ohio, preserving teenage perspectives, memories, and creative voices in their own words.',
    retailerLastVerifiedAt: '2026-04-19',
  },
  'love-of-my-life': {
    retailerMatchStatus: 'verified',
    retailerCoverUrl: 'https://images-us.bookshop.org/ingram/9781954414273.jpg?v=enc-v1',
    retailerLastVerifiedAt: '2026-04-19',
  },
  'memoir-of-a-black-christian-nationalist': {
    retailerMatchStatus: 'verified',
    retailerCoverUrl: 'https://images-us.bookshop.org/ingram/9781954414198.jpg?v=enc-v1',
    retailerLastVerifiedAt: '2026-04-19',
  },
  'mirror-of-refining-insight': {
    retailerMatchStatus: 'verified',
    retailerCoverUrl: 'https://images-us.bookshop.org/ingram/9781954414372.jpg?v=enc-v1',
    retailerLastVerifiedAt: '2026-04-19',
  },
  'music-ministry-unplugged': {
    retailerMatchStatus: 'verified',
    amazonLinkType: 'search_fallback',
    subtitle: 'Real Lessons for Those who Lead and Serve in Music Ministry',
    retailerTitle: 'Music Ministry Unplugged: Real Lessons for Those who Lead and Serve in Music Ministry',
    releaseDate: '2026-05-19',
    retailerCoverUrl: 'https://images-us.bookshop.org/ingram/9781961475724.jpg?v=enc-v1',
    retailerLastVerifiedAt: '2026-04-19',
  },
  'peaches-can-do-it': {
    retailerMatchStatus: 'verified',
    amazonLinkType: 'search_fallback',
    releaseDate: '2025-08-19',
    retailerCoverUrl: 'https://images-us.bookshop.org/ingram/9781961475472.jpg?v=enc-v1',
    retailerDescription:
      'Daphanny C. Baker shares a memoir of grief, resilience, faith, and purpose, tracing how loss, motherhood, ministry, and perseverance shaped a life anchored by the belief that with God she can do it.',
    retailerLastVerifiedAt: '2026-04-19',
  },
  'ordinary-people-searching-for-greatness': {
    retailerMatchStatus: 'verified',
    retailerCoverUrl: 'https://images-us.bookshop.org/ingram/9781954414860.jpg?v=enc-v1',
    retailerLastVerifiedAt: '2026-04-19',
  },
  'pretty-wings': {
    retailerMatchStatus: 'verified',
    retailerCoverUrl: 'https://images-us.bookshop.org/ingram/9781954414082.jpg?v=enc-v1',
    retailerLastVerifiedAt: '2026-04-19',
  },
  'rhyming-it-up-with-church-stuff': {
    retailerMatchStatus: 'verified',
    retailerCoverUrl: 'https://images-us.bookshop.org/ingram/9781961475434.jpg?v=enc-v1',
    retailerLastVerifiedAt: '2026-04-19',
  },
  'the-i-am-in-me': {
    retailerMatchStatus: 'verified',
    amazonLinkType: 'search_fallback',
    subtitle: 'Part 1, Second Edition',
    retailerTitle: 'I Am In Me: Part 1, Second Edition',
    releaseDate: '2022-10-15',
    retailerCoverUrl: 'https://images-us.bookshop.org/ingram/9781954414501.jpg?v=enc-v1',
    retailerDescription:
      'Tekisha Wimbush offers a scripture-based self-discovery and reflection guide that encourages readers to understand identity in God, work through fragmented mindsets, and engage spiritual growth through journal prompts and practical application.',
    retailerLastVerifiedAt: '2026-04-19',
  },
  'the-healed-me': {
    retailerMatchStatus: 'verified',
    amazonLinkType: 'search_fallback',
    releaseDate: '2023-02-01',
    retailerCoverUrl: 'https://images-us.bookshop.org/ingram/9781954414624.jpg?v=enc-v1',
    retailerDescription:
      'Maurche Reed offers a faith-centered healing guide for readers navigating trauma, depression, unresolved pain, and emotional scars, emphasizing Scripture, affirmation, patience, and trust in God’s restorative timing.',
    retailerLastVerifiedAt: '2026-04-19',
  },
  'the-journey': {
    retailerMatchStatus: 'verified',
    amazonLinkType: 'search_fallback',
    subtitle: 'The Inspiration and Message Behind the Music',
    retailerTitle: 'The Journey: The Inspiration and Message Behind the Music',
    retailerCoverUrl: 'https://images-us.bookshop.org/ingram/9781954414297.jpg?v=enc-v1',
    retailerDescription:
      'Rosetta Perry reflects on the making of her first CD project, pairing personal testimony, songwriting backstory, and scriptural insight to explain the inspiration and spiritual message behind each song.',
    retailerLastVerifiedAt: '2026-04-19',
  },
  'the-master-s-piece': {
    retailerMatchStatus: 'verified',
    amazonLinkType: 'search_fallback',
    retailerCoverUrl: 'https://images-us.bookshop.org/ingram/9781954414488.jpg?v=enc-v1',
    retailerLastVerifiedAt: '2026-04-19',
  },
  'the-fight-for-the-promiseland': {
    retailerMatchStatus: 'verified',
    amazonLinkType: 'search_fallback',
    subtitle: 'Battle Strategies for Victorious People',
    retailerTitle: 'The Fight for the Promiseland: Battle Strategies for Victorious People',
    releaseDate: '2026-05-12',
    retailerCoverUrl: 'https://images-us.bookshop.org/ingram/9781961475632.jpg?v=enc-v1',
    retailerDescription:
      'Cheryl Cook presents a faith-centered guide to navigating the inner battles that stand between God’s promises and lived victory, using Scripture and practical encouragement to build courage, clarity, and trust.',
    retailerLastVerifiedAt: '2026-04-19',
  },
  'the-great-hair-restart': {
    retailerMatchStatus: 'verified',
    amazonLinkType: 'search_fallback',
    subtitle: 'The Ultimate Guide to Resetting Your Natural Hair Journey with Confidence',
    retailerTitle: 'The Great Hair Restart: The Ultimate Guide to Resetting Your Natural Hair Journey with Confidence',
    releaseDate: '2024-05-01',
    retailerCoverUrl: 'https://images-us.bookshop.org/ingram/9781961475137.jpg?v=enc-v1',
    retailerDescription:
      'Karen Hill offers a practical, confidence-building guide for readers learning to care for, restore, and style natural hair through healthier routines, informed choices, and long-term hair wellness.',
    retailerLastVerifiedAt: '2026-04-19',
  },
  'the-messenger': {
    retailerMatchStatus: 'verified',
    amazonLinkType: 'search_fallback',
    releaseDate: '2024-03-08',
    retailerCoverUrl: 'https://images-us.bookshop.org/ingram/9781961475151.jpg?v=enc-v1',
    retailerDescription:
      'A faith-centered, autobiographical work from Daphanny C. Baker that combines personal testimony, biblical encouragement, and spiritual reflection to help readers persevere with courage and purpose.',
    retailerLastVerifiedAt: '2026-04-19',
  },
  'the-sun-the-shadow-and-the-silence': {
    retailerMatchStatus: 'verified',
    amazonLinkType: 'search_fallback',
    releaseDate: '2025-12-03',
    retailerCoverUrl: 'https://images-us.bookshop.org/ingram/9781961475557.jpg?v=enc-v1',
    retailerDescription:
      'A contemporary poetry collection from R. Dorian Night that moves through longing, heartbreak, and emotional reckoning, inviting readers to sit with grief, memory, and healing with honesty.',
    retailerLastVerifiedAt: '2026-04-19',
  },
  'warrior-s-breed': {
    retailerMatchStatus: 'verified',
    amazonLinkType: 'search_fallback',
    releaseDate: '2023-10-01',
    retailerCoverUrl: 'https://images-us.bookshop.org/ingram/9781954414662.jpg?v=enc-v1',
    retailerDescription:
      'Dean Wilson tells an allegorical animal story about loss, captivity, justice, and survival as a chicken named Toppa is forced into conflict after violence tears apart his home and family.',
    retailerLastVerifiedAt: '2026-04-19',
  },
  'warriors-and-angels': {
    retailerMatchStatus: 'verified',
    retailerCoverUrl: 'https://images-us.bookshop.org/ingram/9781961475519.jpg?v=enc-v1',
    retailerLastVerifiedAt: '2026-04-19',
  },
  'when-a-thug-meets-jesus': {
    retailerMatchStatus: 'verified',
    amazonLinkType: 'search_fallback',
    releaseDate: '2023-12-01',
    retailerCoverUrl: 'https://images-us.bookshop.org/ingram/9781961475977.jpg?v=enc-v1',
    retailerLastVerifiedAt: '2026-04-19',
  },
  'words-of-a-troubled-soul': {
    retailerMatchStatus: 'verified',
    amazonLinkType: 'search_fallback',
    releaseDate: '2023-01-15',
    retailerCoverUrl: 'https://images-us.bookshop.org/ingram/9781954414563.jpg?v=enc-v1',
    retailerDescription:
      'David Williams Jr. opens a poetry-and-reflection series with writing that begins in darkness and gradually turns toward hope, faith, and emotional honesty while affirming that troubled souls deserve to be seen and heard.',
    retailerLastVerifiedAt: '2026-04-19',
  },
  'you-re-still-not-crazy': {
    retailerMatchStatus: 'verified',
    retailerCoverUrl: 'https://images-us.bookshop.org/ingram/9781954414235.jpg?v=enc-v1',
    retailerLastVerifiedAt: '2026-04-19',
  },
  'your-brain-has-too-much-what-mommy': {
    retailerMatchStatus: 'verified',
    retailerCoverUrl: 'https://images-us.bookshop.org/ingram/9781954414785.jpg?v=enc-v1',
    retailerLastVerifiedAt: '2026-04-19',
  },
  'your-peace-is-a-priority': {
    retailerMatchStatus: 'verified',
    amazonLinkType: 'search_fallback',
    subtitle: 'A Devotional Journal',
    retailerTitle: 'Your Peace is a Priority: A Devotional Journal',
    releaseDate: '2025-08-19',
    retailerCoverUrl: 'https://images-us.bookshop.org/ingram/9781961475458.jpg?v=enc-v1',
    retailerDescription:
      'A 30-day devotional journal by Dr. Kiena S. Hughley that guides readers through scripture, affirmations, prayer prompts, and reflection exercises aimed at emotional healing, spiritual renewal, and restoring peace.',
    retailerLastVerifiedAt: '2026-04-19',
  },
}
