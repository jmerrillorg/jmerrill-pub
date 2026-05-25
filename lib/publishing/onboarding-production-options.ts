export type PublishingSelectOption = {
  key: string
  label: string
}

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

export function getOptionLabel(options: PublishingSelectOption[], key: string) {
  return options.find((option) => option.key === key)?.label || ''
}
