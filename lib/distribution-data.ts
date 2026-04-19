// lib/distribution-data.ts
// CANONICAL — sourced from live Ingram Content Group pages, April 2026
// CoreSource Direct Partners · Print Metadata Partners · Digital Sales Partners

// ── NETWORK STATS (Ingram verified) ─────────────────────────────────────────
export const NETWORK_STATS = [
  { n: '450+',    label: 'CoreSource\ndirect partners',      source: 'CoreSource Direct Partners page' },
  { n: '45,000+', label: 'Global retail\noutlets',           source: 'IngramSpark distribution page' },
  { n: '39,000+', label: 'Bookstores, libraries\n& schools', source: 'IngramSpark distribution page' },
  { n: '40+',     label: 'Countries\nreached',               source: 'Ingram network' },
  { n: '47',      label: 'Managed digital\nsales partners',  source: 'Digital Sales Partners table' },
  { n: '18',      label: 'Audio-capable\nplatforms',         source: 'Digital Sales Partners table' },
] as const

// ── DIGITAL SALES PARTNERS — complete structured table (47 entries) ──────────
export type DigitalPartner = {
  name:      string
  model:     string   // 'Retail' | 'Library' | 'Retail, Library'
  hq:        string
  territory: string
  format:    string   // 'Ebook' | 'Audio' | 'Ebook & Audio'
}

export const DIGITAL_SALES_PARTNERS: DigitalPartner[] = [
  { name: "Amazon",                       model: "Retail",           hq: "USA",           territory: "Worldwide",                                    format: "Ebook" },
  { name: "Apple",                        model: "Retail",           hq: "USA",           territory: "Worldwide",                                    format: "Ebook & Audio" },
  { name: "Audible",                      model: "Retail",           hq: "USA",           territory: "Worldwide",                                    format: "Audio" },
  { name: "Spotify",                      model: "Retail, Library",  hq: "USA",           territory: "Worldwide",                                    format: "Audio" },
  { name: "Google Play Books",            model: "Retail",           hq: "USA",           territory: "Worldwide",                                    format: "Ebook & Audio" },
  { name: "Kobo (Rakuten)",               model: "Retail",           hq: "Canada",        territory: "Worldwide",                                    format: "Ebook & Audio" },
  { name: "Everland (Scribd)",            model: "Retail",           hq: "USA",           territory: "Worldwide",                                    format: "Ebook" },
  { name: "Barnes & Noble",               model: "Retail",           hq: "USA",           territory: "North America",                                format: "Ebook" },
  { name: "Bookshop.org",                 model: "Retail",           hq: "USA",           territory: "US, UK",                                       format: "Ebook" },
  { name: "Kobo Plus",                    model: "Retail",           hq: "Canada",        territory: "North America, Europe, Oceania",                format: "Ebook & Audio" },
  { name: "Libro.fm",                     model: "Retail",           hq: "USA",           territory: "North America, Europe",                        format: "Audio" },
  { name: "Fable",                        model: "Retail",           hq: "USA",           territory: "North America",                                format: "Ebook" },
  { name: "Speechify",                    model: "Retail",           hq: "USA",           territory: "US, Canada, UK, Europe, Australia",            format: "Ebook & Audio" },
  { name: "EBooks.com",                   model: "Retail",           hq: "Australia",     territory: "North America, Europe",                        format: "Ebook" },
  { name: "Gardners",                     model: "Retail, Library",  hq: "United Kingdom",territory: "Europe, Asia",                                 format: "Ebook & Audio" },
  { name: "Storytel",                     model: "Retail",           hq: "Sweden",        territory: "Europe",                                       format: "Ebook & Audio" },
  { name: "Libreka",                      model: "Retail",           hq: "Germany",       territory: "Europe",                                       format: "Ebook" },
  { name: "Libri",                        model: "Retail",           hq: "Germany",       territory: "Europe",                                       format: "Ebook" },
  { name: "Perlego",                      model: "Retail",           hq: "United Kingdom",territory: "North America, Europe",                        format: "Ebook" },
  { name: "Wook (Porta Editora)",         model: "Retail",           hq: "Portugal",      territory: "Europe, South America, North America",         format: "Ebook" },
  { name: "YouScribe",                    model: "Retail",           hq: "France",        territory: "Europe, Africa",                               format: "Ebook & Audio" },
  { name: "Bright",                       model: "Retail",           hq: "Sweden",        territory: "Sweden",                                       format: "Ebook" },
  { name: "Glose",                        model: "Retail",           hq: "USA",           territory: "North America, Europe, Africa, Oceania",       format: "Ebook & Audio" },
  { name: "Chegg",                        model: "Retail",           hq: "USA",           territory: "North America, Europe, Asia, Oceania",         format: "Ebook" },
  { name: "VitalSource",                  model: "Retail",           hq: "USA",           territory: "North America, South America, Europe, Oceania",format: "Ebook" },
  { name: "RedShelf (Virdocs)",           model: "Retail",           hq: "USA",           territory: "North America, Asia, Oceania",                 format: "Ebook" },
  { name: "Perusall",                     model: "Retail",           hq: "USA",           territory: "North America, Europe, Oceania",               format: "Ebook" },
  { name: "Kortext",                      model: "Retail, Library",  hq: "United Kingdom",territory: "Europe, Asia, Oceania, Africa",                format: "Ebook" },
  { name: "BibliU",                       model: "Retail, Library",  hq: "United Kingdom",territory: "Europe, North America, South America",         format: "Ebook" },
  { name: "Slingshot",                    model: "Retail",           hq: "USA",           territory: "USA",                                          format: "Ebook" },
  { name: "Sol",                          model: "Retail",           hq: "USA",           territory: "North America",                                format: "Ebook" },
  { name: "Ainosco",                      model: "Retail, Library",  hq: "China",         territory: "Asia",                                         format: "Ebook" },
  { name: "Takealot.com (via OverDrive)", model: "Retail",           hq: "South Africa",  territory: "Africa",                                       format: "Ebook" },
  { name: "Snapplify",                    model: "Retail, Library",  hq: "South Africa",  territory: "Africa",                                       format: "Ebook & Audio" },
  { name: "Optimum Classroom/ITSI",       model: "Retail",           hq: "United Kingdom",territory: "Africa",                                       format: "Ebook" },
  { name: "OverDrive",                    model: "Library",          hq: "USA",           territory: "North America, Europe",                        format: "Ebook & Audio" },
  { name: "Hoopla (Midwest Tapes)",       model: "Library",          hq: "USA",           territory: "North America",                                format: "Ebook & Audio" },
  { name: "EBSCO",                        model: "Library",          hq: "USA",           territory: "North America, Europe, Oceania",               format: "Ebook" },
  { name: "ProQuest",                     model: "Library",          hq: "USA",           territory: "North America, Oceania",                       format: "Ebook" },
  { name: "Follett",                      model: "Library",          hq: "USA",           territory: "North America",                                format: "Ebook & Audio" },
  { name: "Mackin",                       model: "Library",          hq: "USA",           territory: "North America",                                format: "Ebook" },
  { name: "Odilo",                        model: "Library",          hq: "USA",           territory: "North America, South America, Europe",         format: "Ebook" },
  { name: "Bibliotheca (Cloud Library)",  model: "Library",          hq: "USA",           territory: "North America, Europe",                        format: "Ebook" },
  { name: "De Marque (Palace Marketplace)",model:"Retail, Library",  hq: "Canada",        territory: "North America, Europe",                        format: "Ebook & Audio" },
  { name: "Bolinda (Borrowbox)",          model: "Library",          hq: "USA",           territory: "Europe, Oceania",                              format: "Ebook & Audio" },
  { name: "iGroup",                       model: "Library",          hq: "China",         territory: "Asia",                                         format: "Ebook" },
  { name: "Wheelers Books",               model: "Library",          hq: "Australia",     territory: "Oceania, Africa, Europe",                      format: "Ebook" },
]

// ── FAITH CHANNELS (from CoreSource Direct — not in digital sales table) ─────
export const FAITH_CHANNELS = [
  "Christian Book Distributors",
  "Cokesbury",
  "Logos",
  "LifeWay WORDsearch",
  "Biblesoft",
  "iDisciple App",
  "Creation Today",
  "Creation Worldview Ministries",
  "Covenant / Christiansupply.com",
  "Joyce Meyer Ministries (Audio)",
  "eChristian",
  "OliveTree",
  "Oak Tree Bible Software",
  "CatholicBrain",
  "Koorong (Australia)",
] as const

// ── PRINT REGIONS ─────────────────────────────────────────────────────────────
export const PRINT_REGIONS = [
  {
    region:    "United States & Canada",
    flag:      "🇺🇸",
    stat:      "3 Ingram print facilities (TN ×2, PA) · Primary global market",
    summary:   "Automatically available to tens of thousands of retailers, libraries, schools, and e-commerce companies across North America.",
    channels:  ["Amazon", "Barnes & Noble", "Walmart.com", "Books-a-Million", "Powells", "Bookshop.org", "Independent bookstores", "Chapters / Indigo (Canada)", "Baker & Taylor", "Libraries", "Schools"],
  },
  {
    region:    "United Kingdom & Europe",
    flag:      "🇬🇧",
    stat:      "Ingram UK office + print facility · 5,000 booksellers · UK market £3.3B+",
    summary:   "Ingram's own print facility in the UK. Strong penetration across Germany ($11B), Spain ($3.4B), Italy ($3.7B), Poland ($636M), France, Netherlands, Sweden, Norway.",
    channels:  ["Amazon.co.uk", "Waterstones", "Foyles", "Blackwell", "Gardners", "Adlibris", "Agapea", "Aphrohead", "Books Express", "Designarta Books", "Eden Interactive", "Mallory International", "Paperback Shop Ltd", "Superbookdeals", "The Book Community Ltd", "Wrap Distribution"],
  },
  {
    region:    "Australia & New Zealand",
    flag:      "🇦🇺",
    stat:      "Ingram print facility on-site · Expanded 2020",
    summary:   "Ingram's own office and print facility. Over 26 million readers. Expanded in 2020 to meet growing regional demand.",
    channels:  ["Amazon AU", "Booktopia", "Fishpond", "The Nile", "James Bennett", "ALS", "Peter Pal", "Dymocks", "ReadCloud", "Woodslane"],
  },
  {
    region:    "Asia Pacific",
    flag:      "🌏",
    stat:      "India $7B · Japan $11.2B · South Korea $5.4B · Singapore $150M",
    summary:   "Hundreds of thousands of titles sold annually. 98% of titles sold in China are in English. India imports $60M+ in books annually.",
    channels:  ["Kinokuniya (Japan)", "Kinnopy (Japan)", "iGroup (China)", "APD Singapore", "Hanbit (South Korea)", "Yes24 (Korea)", "Crossword Bookstores (India)", "Flipkart (India)"],
  },
  {
    region:    "Middle East",
    flag:      "🇦🇪",
    stat:      "Lightning Source Sharjah — joint venture with Sharjah Book Authority",
    summary:   "Physical printing and distribution in the Middle East via Lightning Source Sharjah.",
    channels:  ["Books Kinokuniya", "Ciel", "Jarir Bookstore", "Magrudy", "Pan World General Trading (UAE)", "Rushd Bookstore", "White Lion", "Zendy (UAE)"],
  },
  {
    region:    "Americas (International)",
    flag:      "🌎",
    stat:      "Brazil: largest book market in Latin America — $710M USD",
    summary:   "Brazil leads Latin American distribution. Spanish-language markets across Mexico, Spain, Costa Rica, Chile, and Argentina.",
    channels:  ["Amazon Brazil", "Saraiva (Brazil)", "Xeriph (Brazil)", "Casa Del Libro (Spain)", "Diaz de Santos (Spain)", "Laleo (Mexico)", "Vi-Da Global / Leamos.com (Costa Rica)"],
  },
  {
    region:    "Africa",
    flag:      "🌍",
    stat:      "South Africa $169M · Growing eBook & audio market via Snapplify",
    summary:   "Dedicated distribution through Snapplify and Takealot, plus accessibility-focused partners BlindSA and RNIB equivalents.",
    channels:  ["Snapplify", "Takealot.com", "Baobab Lounge", "Bookt Pty Ltd", "BlindSA", "Educess", "eKitabu", "On The Dot", "SAPNet"],
  },
] as const

// ── CONTACT (CANONICAL — April 2026) ─────────────────────────────────────────
export const JMP_CONTACT = {
  phone:       "614.965.6057",
  phoneHref:   "tel:6149656057",
  email:       "publishing@jmerrill.one",
  emailHref:   "mailto:publishing@jmerrill.one",
  booking:     "https://outlook.office.com/book/JMerrillPublishing@jmerrill.one/?ismsaljsauthenabled",
  address: {
    display:   "Headquartered in Columbus, Ohio",
  },
  hours: [
    { days: "Monday & Friday",    time: "10:00 AM – 4:00 PM EST" },
    { days: "Tuesday – Thursday", time: "10:00 AM – 7:00 PM EST" },
    { days: "Saturday",           time: "By Appointment" },
    { days: "Sunday",             time: "Closed" },
  ],
} as const
