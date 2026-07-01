export type PublishingSelectOption = {
  key: string
  label: string
}

export const genreOptions: PublishingSelectOption[] = [
  { key: 'christian_faith', label: 'Christian / Faith' },
  { key: 'devotional', label: 'Devotional' },
  { key: 'inspirational', label: 'Inspirational' },
  { key: 'biography_memoir', label: 'Biography / Memoir' },
  { key: 'fiction', label: 'Fiction' },
  { key: 'business', label: 'Business' },
  { key: 'childrens', label: "Children's" },
  { key: 'poetry', label: 'Poetry' },
  { key: 'academic', label: 'Academic' },
  { key: 'trade', label: 'Trade' },
  { key: 'other', label: 'Other' },
]

export const manuscriptStatusOptions: PublishingSelectOption[] = [
  { key: 'idea_outline', label: 'Idea / outline' },
  { key: 'in_progress', label: 'In progress' },
  { key: 'draft_complete', label: 'Draft complete' },
  { key: 'edited_manuscript', label: 'Edited manuscript' },
  { key: 'previously_published', label: 'Previously published' },
]

export const preferredPrintFormatOptions: PublishingSelectOption[] = [
  { key: 'paperback_only', label: 'Paperback only' },
  { key: 'paperback_ebook', label: 'Paperback + eBook' },
  { key: 'paperback_hardcover', label: 'Paperback + hardcover' },
  { key: 'paperback_ebook_hardcover', label: 'Paperback + eBook + hardcover' },
  { key: 'ebook_only', label: 'eBook only' },
  { key: 'recommend_best_option', label: 'Not sure — recommend best option' },
]

export const preferredTrimSizeOptions: PublishingSelectOption[] = [
  { key: '5x8', label: '5 x 8' },
  { key: '5_5x8_5', label: '5.5 x 8.5' },
  { key: '6x9', label: '6 x 9' },
  { key: '8_5x8_5', label: '8.5 x 8.5' },
  { key: '8x10', label: '8 x 10' },
  { key: 'large_print', label: 'Large print format' },
  { key: 'recommend_best_option', label: 'Not sure — recommend best option' },
]

export const interiorColorOptions: PublishingSelectOption[] = [
  { key: 'black_and_white', label: 'Black and white' },
  { key: 'color_interior', label: 'Color interior' },
  { key: 'recommend_best_option', label: 'Not sure — recommend best option' },
]

export const paperTypePreferenceOptions: PublishingSelectOption[] = [
  { key: 'white_paper', label: 'White paper' },
  { key: 'cream_paper', label: 'Cream paper' },
  { key: 'color_book_paper', label: 'Color-book paper' },
  { key: 'recommend_best_option', label: 'Not sure — recommend best option' },
]

export const bindingTypeOptions: PublishingSelectOption[] = [
  { key: 'paperback', label: 'Paperback' },
  { key: 'hardcover', label: 'Hardcover' },
  { key: 'paperback_and_hardcover', label: 'Paperback and hardcover' },
  { key: 'recommend_best_option', label: 'Not sure — recommend best option' },
]

export const coverFinishPreferenceOptions: PublishingSelectOption[] = [
  { key: 'gloss', label: 'Gloss' },
  { key: 'matte', label: 'Matte' },
  { key: 'recommend_best_option', label: 'Not sure — recommend best option' },
]

export const authorPhotoOnBackCoverOptions: PublishingSelectOption[] = [
  { key: 'yes', label: 'Yes' },
  { key: 'no', label: 'No' },
  { key: 'recommend_best_option', label: 'Not sure — recommend best option' },
]

export const initialAuthorCopyNeedsOptions: PublishingSelectOption[] = [
  { key: 'included_complimentary_only', label: 'Included complimentary copies only' },
  { key: 'one_to_twenty_four', label: '1–24 additional copies' },
  { key: 'twenty_five_to_ninety_nine', label: '25–99 additional copies' },
  { key: 'one_hundred_plus', label: '100+ additional copies' },
  { key: 'not_sure_yet', label: 'Not sure yet' },
]

export const publishingGoalOptions: PublishingSelectOption[] = [
  { key: 'build_personal_brand', label: 'Build my personal brand' },
  { key: 'share_my_story', label: 'Share my story' },
  { key: 'professional_author', label: 'Become a professional author' },
  { key: 'publish_and_distribute', label: 'Publish and distribute my book' },
  { key: 'grow_my_audience', label: 'Grow my audience' },
  { key: 'establish_authority', label: 'Establish authority in my field' },
  { key: 'legacy_work', label: 'Create a legacy work' },
  { key: 'book_based_business', label: 'Launch a book-based business' },
  { key: 'ministry_faith_impact', label: 'Ministry / faith-based impact' },
  { key: 'other', label: 'Other' },
]

export const audiobookInterestOptions: PublishingSelectOption[] = [
  { key: 'not_sure_yet', label: 'Not sure yet' },
  { key: 'azure_ai_narration', label: 'Yes - Azure AI narration' },
  { key: 'human_narration', label: 'Yes - human narration' },
  { key: 'no_audiobook', label: 'No audiobook at this time' },
]

export const w9StatusOptions: PublishingSelectOption[] = [
  { key: 'not_yet_submitted', label: 'Not yet submitted' },
  { key: 'ready_to_submit', label: 'Ready to submit' },
  { key: 'already_submitted', label: 'Already submitted' },
  { key: 'not_applicable', label: 'Not applicable' },
]

export function getOptionLabel(options: PublishingSelectOption[], key: string) {
  return options.find((option) => option.key === key)?.label || ''
}

export function getOptionKey(options: PublishingSelectOption[], value: string) {
  return options.find((option) => option.key === value || option.label === value)?.key || value
}

export function resolveOption(options: PublishingSelectOption[], value: string) {
  const key = getOptionKey(options, value)
  return {
    key,
    label: getOptionLabel(options, key) || value,
  }
}
