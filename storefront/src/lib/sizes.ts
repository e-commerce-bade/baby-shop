import { foldForSearch } from '@/lib/utils'

// Magaza sahibinin sabitledigi yas araliklari. Beden once bu listelerden secilir; boylece ayni
// bedenin farkli yazimlari ("3-4", "3-4 Yas", "3-4Yaş") olusmaz. Listede olmayan bir beden
// gerekirse varyant eklerken elle yazilabilir.
export const KIDS_AGE_SIZES = [
  '1-2 Yaş',
  '2-3 Yaş',
  '3-4 Yaş',
  '4-5 Yaş',
  '5-6 Yaş',
  '6-7 Yaş',
  '7-8 Yaş',
  '8-9 Yaş',
  '9-10 Yaş',
  '10-11 Yaş',
  '11-12 Yaş',
  '12-13 Yaş',
  '13-14 Yaş',
]

export const BABY_MONTH_SIZES = ['0-3 Ay', '3-6 Ay', '6-9 Ay', '9-12 Ay', '12-18 Ay', '18-24 Ay', '24-36 Ay']

// Harf bedenler (her kategoride secilebilir).
export const LETTER_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'Battal', 'Oversize']

// Kategoriye gore secilebilir beden listesi: bebek kategorilerinde ay, digerlerinde yas.
export function sizeOptionsForCategory(categoryName?: string | null) {
  const normalized = foldForSearch(categoryName ?? '')
  if (['bebek', 'baby', 'newborn', 'yenidogan'].some((word) => normalized.includes(word))) {
    return { label: 'Bebek ay aralığı', sizes: BABY_MONTH_SIZES }
  }
  return { label: 'Çocuk yaş aralığı', sizes: KIDS_AGE_SIZES }
}

// Acilir listelerde (beden degistirme) sunulan sabit bedenler: kategorinin yas/ay listesi + harf bedenler.
export function fixedSizesForCategory(categoryName?: string | null) {
  return [...sizeOptionsForCategory(categoryName).sizes, ...LETTER_SIZES]
}

// Kategoriye bagli yas/ay listelerinden biri mi? (Kategori degisince yalnizca bunlar elenir.)
export function isCategoryAgeSize(size: string) {
  return KIDS_AGE_SIZES.includes(size) || BABY_MONTH_SIZES.includes(size)
}

// Elle yazilan bedeni temizler; bilinen bir yazimla ayniysa ("xl" = "XL", "battal" = "Battal")
// o yazimi kullanir. Bos girdi icin null.
export function normalizeTypedSize(typed: string, knownSizes: readonly string[]): string | null {
  const cleaned = typed.trim().replace(/\s+/g, ' ')
  if (!cleaned) return null
  const folded = foldForSearch(cleaned)
  const known = knownSizes.find((size) => foldForSearch(size) === folded)
  if (known) return known
  // Listede olmayan harf beden ("3xl", "xxxl") buyuk harfle yazilir.
  return LETTER_ORDER[letterKey(cleaned)] !== undefined ? cleaned.toLocaleUpperCase('tr-TR') : cleaned
}

// Harf bedenlerin kucukten buyuge sirasi; ayni bedenin farkli yazimlari ayni sirayi alir.
const LETTER_ORDER: Record<string, number> = {
  xxs: 0,
  xs: 1,
  s: 2,
  m: 3,
  l: 4,
  xl: 5,
  xxl: 6,
  '2xl': 6,
  xxxl: 7,
  '3xl': 7,
  xxxxl: 8,
  '4xl': 8,
  '5xl': 9,
  battal: 10,
  oversize: 11,
  oversized: 11,
}

function letterKey(label: string) {
  return label.trim().replace(/İ/g, 'I').toLowerCase().replace(/ı/g, 'i').replace(/[\s.-]+/g, '')
}

// Siralama anahtari: once ay bedenleri, sonra yaslar, sonra harf bedenler, en sonda digerleri;
// yas/ay kendi icinde ilk ve ikinci sayiya gore ("3-4" < "10-11", "5-6" < "6" < "6-7").
// Backend'deki SizeLabels ile ayni kural.
function sizeSortKey(label: string): [number, number, number] {
  // "3XL" sayi icerse de yas degil harf bedendir; bu yuzden once harf bedenlere bakilir.
  const letter = LETTER_ORDER[letterKey(label)]
  if (letter !== undefined) return [2, letter, 0]
  const numbers = label.match(/\d+/g)?.map(Number) ?? []
  if (numbers.length === 0) return [3, 0, 0]
  const isMonths = /\d\s*(ay|a|m|mo|months?)\s*$/i.test(label.trim())
  return [isMonths ? 0 : 1, numbers[0], numbers[1] ?? numbers[0]]
}

// Iki etiket ayni bedeni mi yaziyor ("3-4" ile "3-4 Yaş", "6" ile "6 Yaş", "xl" ile "XL")?
export function sameSizeRange(a: string, b: string) {
  const keyA = sizeSortKey(a)
  const keyB = sizeSortKey(b)
  return keyA[0] !== 3 && keyA.every((part, index) => part === keyB[index])
}

export function compareSizeLabels(a: string, b: string): number {
  const keyA = sizeSortKey(a)
  const keyB = sizeSortKey(b)
  for (let i = 0; i < keyA.length; i++) {
    if (keyA[i] !== keyB[i]) return keyA[i] - keyB[i]
  }
  return a.localeCompare(b, 'tr')
}
