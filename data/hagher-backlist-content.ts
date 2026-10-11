// Governed JM1-PUB Backlist presentation snapshot, verified 2026-10-11.
// No lifecycle, rights, or retailer authority is established by this projection.
export const hagherAuthor = {
  contactId: 'c8c8747e-6675-f111-ab0f-6045bdd69678',
  slug: 'iyorwuese-hagher',
  photoUrl: '/backlist/iyorwuese-hagher/author_headshot.jpg',
  biography: "Iyorwuese Hagher is a professor of Theatre for Development, a novelist, a poet, and a playwright. He was Nigeria's Ambassador to Mexico and High Commissioner to Canada. Hagher is one of the world's most politically exposed creative writers. He was a Senator, a cabinet minister, and a member of Nigeria's constitutional conference.\n\nHe lives in Dayton, Ohio, with his wife, Nancy.",
  source: '08_Backlist/Hagher, Iyorwuese/2025-Hagher-APortraitOfParadise/08 Distribution Records/9781961475656_PRINT.pdf: About the Author',
} as const

export const hagherBacklistContent = {
  'a-portrait-of-paradise': {
    titleId: 'c74b00d4-c27a-f111-ab0f-00224820105b',
    releaseDate: '2026-04-21', genre: 'Literary Fiction',
    coverUrl: '/backlist/iyorwuese-hagher/9781961475670_FC.jpg',
    isbns: { Paperback: '9781961475656', Hardcover: '9781961475663', eBook: '9781961475670' },
    shortDescription: 'In oil-rich Sofalia, power belongs to the elite while the forgotten survive beneath the bridge. As corruption spreads and inequality deepens, lives collide in a bold literary allegory about ambition, delusion, and the cost of paradise.',
    longDescription: 'In oil-rich Sofalia, wealth and despair live side by side.\n\nAbove the city, politicians rewrite laws and fortify their power. Below the bridge, Queen Aisha reigns over the forgotten, certain she sees what others refuse to confront. As corruption deepens and inequality hardens into cruelty, the lives of senators, royalty, widows, and the dispossessed begin to collide.\n\nA Portrait of Paradise is a sweeping work of literary political fiction that examines governance, ambition, class division, and the human cost of power in a fragile democracy.',
    metadataSource: '08_Backlist/Hagher, Iyorwuese/2025-Hagher-APortraitOfParadise/08 Distribution Records/JMerrill_20260226.xlsx',
  },
  'the-conquest-of-azenga': {
    titleId: 'c44b00d4-c27a-f111-ab0f-00224820105b',
    releaseDate: '2026-06-23', genre: 'Historical Fiction',
    coverUrl: '/backlist/iyorwuese-hagher/9781961475786_FC.jpg',
    isbns: { Paperback: '9781961475762', Hardcover: '9781961475779', eBook: '9781961475786' },
    shortDescription: 'A powerful historical novel exploring empire, violence, and resistance. The Conquest of Azenga confronts the brutal realities of colonial ambition and the cost of domination in a land that refuses to yield.',
    longDescription: 'Set against the sweeping backdrop of colonial expansion in Africa, The Conquest of Azenga is a bold and unflinching exploration of power, violence, and resistance. At its center is Lord Gilbert Payne, a British High Commissioner driven by ambition, ideology, and a relentless desire to impose order on a land he neither fully understands nor respects.\n\nTasked with consolidating imperial control, Payne wages brutal campaigns against indigenous communities, aligning with local power structures while seeking to eliminate those who resist. But the Azenga\u2014fierce, independent, and unwilling to submit\u2014become the ultimate challenge to his authority. Their defiance exposes the fragile foundations of empire and forces a confrontation with the moral cost of conquest.\n\nAs personal ambition collides with political reality, and as alliances shift under pressure, the narrative unfolds into a profound meditation on domination, identity, and the legacy of colonial rule. Through vivid storytelling and psychological depth, the novel reveals not only the machinery of empire but also the humanity caught within it\u2014both the conquerors and the conquered.\n\nThe Conquest of Azenga is a gripping work of historical fiction that interrogates the myths of empire and gives voice to the enduring struggle for sovereignty and dignity.',
    metadataSource: '08_Backlist/Hagher, Iyorwuese/2025-Hagher-TheConquestOfAzenga/08-Publishing Output (Print, eBook, Audiobook)/JMerrill_260503b.xlsx',
  },
} as const

export function getHagherBacklistContent(slug: string, id: string) {
  const entry = hagherBacklistContent[slug as keyof typeof hagherBacklistContent]
  return entry && (id === entry.titleId || id === slug) ? entry : undefined
}
