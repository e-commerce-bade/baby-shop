// Labels are display-only; the `value` (category slug) is what gets sent to the
// backend, so these can be shown in proper Turkish without affecting filtering.
export const filterCategories = [
  { label: 'Yenidoğan', value: 'yenidogan' },
  { label: 'Kız Bebek', value: 'kiz-bebek' },
  { label: 'Erkek Bebek', value: 'erkek-bebek' },
  { label: 'Kız Çocuk', value: 'kiz-cocuk' },
  { label: 'Erkek Çocuk', value: 'erkek-cocuk' },
]

export const filterProductTypes = [
  'Pijama',
  'Elbise',
  'Gomlek',
  'Tulum',
  'Takim',
  'Hirka',
  'Pantolon',
  'Body',
  'Sweatshirt',
  'Salopet',
  'Aksesuar',
]

export const filterSizes = [
  '0-3A', '3-6A', '6-12A', '12-18A',
  '18-24A', '2-3Y', '3-4Y', '4-5Y',
]

export const filterColors = [
  { name: 'Yulaf', hex: '#DDCBB3' },
  { name: 'Pudra', hex: '#E6BFBA' },
  { name: 'Gok Mavisi', hex: '#BFD3E0' },
  { name: 'Adacayi', hex: '#C2D2AE' },
  { name: 'Vizon', hex: '#D2BCA2' },
  { name: 'Acik Pembe', hex: '#E3B9B4' },
  { name: 'Kahve', hex: '#5B4839' },
  { name: 'Beyaz', hex: '#ffffff' },
]

export const filterPriceRanges = [
  { label: '0 - 500 TL', value: 'under-500' },
  { label: '500 - 700 TL', value: '500-700' },
  { label: '700 TL ve üzeri', value: 'over-700' },
]
